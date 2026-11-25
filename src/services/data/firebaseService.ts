/**
 * Implementação Firebase (Firestore + Auth + Storage opcional) do DataService.
 *
 * Garantias de concorrência: o apadrinhamento é feito em runTransaction e as
 * Security Rules (firestore.rules) validam no servidor que:
 *  - o documento sponsorships/{participantId} ainda NÃO existe (create);
 *  - o participante público está publicado e sponsored == false;
 *  - a mesma escrita marca sponsored == true (getAfter/existsAfter).
 * Como o ID do apadrinhamento é o ID do participante, duas confirmações
 * simultâneas nunca são aceitas: a segunda falha no servidor.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  collection, doc, getDoc, getFirestore, limit, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, Timestamp, where, writeBatch, type DocumentData, type Firestore,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
import type {
  AuditLog, AuthState, Campaign, Contribution, ImportJob, ParticipantInput, PrivateParticipant, PublicParticipant, Sponsorship,
  SponsorshipHistoryItem, StaffUser,
} from '@/types';
import { PHOTO_MODE } from '@/config/campaign';
import { generateProtocol } from '@/lib/protocol';
import type { AdminApi, DataService, OnError, PhotoPayload } from './types';
import { failure, toPublicFields, validateSponsorInput } from './shared';

const env = import.meta.env;

function firebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error('Configuração do Firebase ausente. Defina as variáveis VITE_FIREBASE_* (veja .env.example).');
  }
  const app = initializeApp(cfg);
  const siteKey = env.VITE_APPCHECK_SITE_KEY as string | undefined;
  if (siteKey) {
    // App Check é camada complementar; NÃO substitui autenticação/regras.
    import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
    }).catch(() => undefined);
  }
  return app;
}

/** Converte Timestamp do Firestore em ISO; mantém demais valores. */
function toIso(v: unknown): string | undefined {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === 'string') return v;
  return undefined;
}
function fromDoc<T>(id: string, data: DocumentData): T {
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(data)) out[k] = v instanceof Timestamp ? toIso(v) : v;
  return out as T;
}
/** Remove undefined (Firestore rejeita) */
function clean<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export function createFirebaseService(): DataService {
  const app = firebaseApp();
  const db: Firestore = getFirestore(app);
  const auth: Auth = getAuth(app);

  const C = {
    config: () => doc(db, 'config', 'app'),
    campaign: (cid: string) => doc(db, 'campaigns', cid),
  };
  const pubDoc = (cid: string, pid: string) => doc(db, 'campaigns', cid, 'publicParticipants', pid);
  const privDoc = (cid: string, pid: string) => doc(db, 'campaigns', cid, 'participants', pid);
  const spDoc = (cid: string, pid: string) => doc(db, 'campaigns', cid, 'sponsorships', pid);
  const sub = (cid: string, name: string) => collection(db, 'campaigns', cid, name);

  const auditEntry = (actor: StaffUser, cid: string, action: string, targetType: string, targetId: string, summary: string) => ({
    campaignId: cid, actorUid: actor.uid, actorEmail: actor.email, role: actor.role, action, targetType, targetId,
    summary: summary.slice(0, 500), createdAt: serverTimestamp(),
  });
  const auditRef = () => doc(collection(db, 'auditLogs'));

  async function uploadPublicPhoto(cid: string, pid: string, photo: PhotoPayload): Promise<string> {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage(app);
    const r = ref(storage, `campaigns/${cid}/public/${pid}/photo.webp`);
    await uploadBytes(r, photo.fullBlob ?? (await (await fetch(photo.thumbDataUrl)).blob()), { contentType: 'image/webp', cacheControl: 'public,max-age=86400' });
    return getDownloadURL(r);
  }

  /** Remove a foto pública do Storage (melhor esforço; ignora se não existir). */
  async function deletePublicPhoto(cid: string, pid: string) {
    if (PHOTO_MODE !== 'storage') return;
    try {
      const { getStorage, ref, deleteObject } = await import('firebase/storage');
      await deleteObject(ref(getStorage(app), `campaigns/${cid}/public/${pid}/photo.webp`));
    } catch { /* objeto inexistente */ }
  }

  /**
   * Recalcula o documento público a partir do privado (somente admin).
   * Executa em transação e deriva `sponsored` da existência do apadrinhamento,
   * evitando corrida com um visitante que apadrinhe no mesmo instante.
   */
  async function syncPublic(cid: string, p: PrivateParticipant) {
    const ref = pubDoc(cid, p.id);
    const authorized = p.publicationAuthorized;
    const { deleteField } = await import('firebase/firestore');
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const sp = await tx.get(spDoc(cid, p.id));
      const sponsored = sp.exists();
      if (p.published) {
        const fields = toPublicFields({ ...p, photoData: authorized && PHOTO_MODE === 'inline' ? p.photoData : undefined, photoUrl: authorized ? p.photoUrl : undefined });
        const base = { ...fields, published: true, sponsored, updatedAt: serverTimestamp() };
        if (!snap.exists()) {
          tx.set(ref, clean({ ...base, createdAt: serverTimestamp() }));
        } else {
          // merge preserva createdAt/sponsoredAt; campos de foto ausentes são removidos explicitamente
          tx.set(ref, clean({ ...base, photoData: fields.photoData ?? deleteField(), photoUrl: fields.photoUrl ?? deleteField() }), { merge: true });
        }
      } else if (snap.exists()) {
        tx.set(ref, { published: false, sponsored, updatedAt: serverTimestamp() }, { merge: true });
      }
    });
    if (!p.published || !authorized) await deletePublicPhoto(cid, p.id);
  }

  const admin: AdminApi = {
    subscribeCampaigns(cb, onError) {
      return onSnapshot(collection(db, 'campaigns'), (s) => cb(s.docs.map((d) => fromDoc<Campaign>(d.id, d.data())).sort((a, b) => b.year - a.year)), onError);
    },
    subscribeActiveCampaignId(cb, onError) {
      return onSnapshot(C.config(), (s) => cb((s.data()?.activeCampaignId as string | undefined) ?? null), onError);
    },
    async saveCampaign(c, actor) {
      if (actor.role !== 'admin') throw new Error('Permissão negada.');
      const ref = C.campaign(c.id);
      const exists = (await getDoc(ref)).exists();
      const { id: _id, createdAt: _c, updatedAt: _u, ...data } = c;
      const batch = writeBatch(db);
      batch.set(ref, clean({ ...data, updatedAt: serverTimestamp(), ...(exists ? {} : { createdAt: serverTimestamp() }) }), { merge: true });
      batch.set(auditRef(), auditEntry(actor, c.id, exists ? 'campaign.update' : 'campaign.create', 'campaign', c.id, `Campanha ${c.name} salva (status ${c.status})`));
      await batch.commit();
    },
    async setActiveCampaign(id, actor) {
      const batch = writeBatch(db);
      batch.set(C.config(), { activeCampaignId: id, updatedAt: serverTimestamp() }, { merge: true });
      batch.set(auditRef(), auditEntry(actor, id, 'campaign.activate', 'campaign', id, `Campanha ${id} definida como ativa`));
      await batch.commit();
    },

    subscribeParticipants(cid, cb, onError) {
      return onSnapshot(sub(cid, 'participants'), (s) => cb(s.docs.map((d) => fromDoc<PrivateParticipant>(d.id, d.data()))), onError);
    },
    async saveParticipant(cid, input, actor) {
      const ref = input.id ? privDoc(cid, input.id) : doc(sub(cid, 'participants'));
      const prev = await getDoc(ref);
      if (input.published && !input.publicationAuthorized) throw new Error('Não é possível publicar sem autorização de exposição.');
      // datas vêm do servidor: nunca regravar createdAt/updatedAt recebidos da interface
      const { id: _id, createdAt: _c, updatedAt: _u, ...data } = input as ParticipantInput & { createdAt?: string; updatedAt?: string };
      const batch = writeBatch(db);
      batch.set(ref, clean({ ...data, campaignId: cid, updatedAt: serverTimestamp(), ...(prev.exists() ? {} : { createdAt: serverTimestamp() }) }), { merge: true });
      batch.set(auditRef(), auditEntry(actor, cid, prev.exists() ? 'participant.update' : 'participant.create', 'participant', ref.id, `${prev.exists() ? 'Editado' : 'Cadastrado'}: ${input.displayName}`));
      await batch.commit();
      if (actor.role === 'admin' && (input.published || prev.data()?.published)) {
        await syncPublic(cid, { ...(input as PrivateParticipant), id: ref.id, campaignId: cid });
      }
      return ref.id;
    },
    async setPublished(cid, id, published, actor) {
      const snap = await getDoc(privDoc(cid, id));
      if (!snap.exists()) throw new Error('Participante não encontrado.');
      const p = fromDoc<PrivateParticipant>(id, snap.data());
      if (published && !p.publicationAuthorized) throw new Error('Registre a autorização de exposição antes de publicar.');
      if (published && p.archived) throw new Error('Participante arquivado não pode ser publicado.');
      const batch = writeBatch(db);
      batch.update(privDoc(cid, id), { published, updatedAt: serverTimestamp() });
      batch.set(auditRef(), auditEntry(actor, cid, published ? 'participant.publish' : 'participant.unpublish', 'participant', id, `${published ? 'Publicado' : 'Despublicado'}: ${p.displayName}`));
      await batch.commit();
      await syncPublic(cid, { ...p, published });
    },
    async setArchived(cid, id, archived, actor) {
      const snap = await getDoc(privDoc(cid, id));
      if (!snap.exists()) throw new Error('Participante não encontrado.');
      const p = fromDoc<PrivateParticipant>(id, snap.data());
      const batch = writeBatch(db);
      batch.update(privDoc(cid, id), { archived, ...(archived ? { published: false } : {}), updatedAt: serverTimestamp() });
      batch.set(auditRef(), auditEntry(actor, cid, archived ? 'participant.archive' : 'participant.unarchive', 'participant', id, `${archived ? 'Arquivado' : 'Restaurado'}: ${p.displayName}`));
      await batch.commit();
      if (archived) await syncPublic(cid, { ...p, archived, published: false });
    },
    async setPhoto(cid, id, photo, actor) {
      const snap = await getDoc(privDoc(cid, id));
      if (!snap.exists()) throw new Error('Participante não encontrado.');
      const p = fromDoc<PrivateParticipant>(id, snap.data());
      let photoUrl: string | undefined;
      if (photo && PHOTO_MODE === 'storage' && p.publicationAuthorized && actor.role === 'admin') photoUrl = await uploadPublicPhoto(cid, id, photo);
      const { deleteField } = await import('firebase/firestore');
      const batch = writeBatch(db);
      // operador não mexe na foto pública (photoUrl), apenas na miniatura privada
      const patch: Record<string, unknown> = { photoData: photo ? photo.thumbDataUrl : deleteField(), updatedAt: serverTimestamp() };
      if (actor.role === 'admin') patch.photoUrl = photoUrl ?? deleteField();
      batch.update(privDoc(cid, id), patch);
      batch.set(auditRef(), auditEntry(actor, cid, photo ? 'participant.photo' : 'participant.photoRemove', 'participant', id, `${photo ? 'Foto atualizada' : 'Foto removida'}: ${p.displayName}`));
      await batch.commit();
      if (actor.role === 'admin' && !photo) await deletePublicPhoto(cid, id);
      if (actor.role === 'admin' && p.published) await syncPublic(cid, { ...p, photoData: photo?.thumbDataUrl, photoUrl });
    },

    subscribeSponsorships(cid, cb, onError) {
      return onSnapshot(sub(cid, 'sponsorships'), (s) => cb(s.docs.map((d) => fromDoc<Sponsorship>(d.id, d.data())).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))), onError);
    },
    subscribeSponsorshipHistory(cid, cb, onError) {
      return onSnapshot(sub(cid, 'sponsorshipHistory'), (s) => cb(s.docs.map((d) => fromDoc<SponsorshipHistoryItem>(d.id, d.data()))), onError);
    },
    async updateSponsorship(cid, pid, patch, actor) {
      const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (patch.status) {
        data.status = patch.status; data.statusChangedAt = serverTimestamp();
        if (patch.status === 'contacted') data.contactedAt = serverTimestamp();
        if (patch.status === 'received') data.receivedAt = serverTimestamp();
        if (patch.status === 'delivered') data.deliveredAt = serverTimestamp();
      }
      if (patch.adminNotes !== undefined) data.adminNotes = patch.adminNotes.slice(0, 1000);
      const batch = writeBatch(db);
      batch.update(spDoc(cid, pid), data);
      batch.set(auditRef(), auditEntry(actor, cid, 'sponsorship.update', 'sponsorship', pid, `Status ${patch.status ?? '(inalterado)'}${patch.adminNotes !== undefined ? ' · observação atualizada' : ''}`));
      await batch.commit();
    },
    async cancelSponsorship(cid, pid, reason, actor) {
      if (reason.trim().length < 3) throw new Error('Informe a justificativa do cancelamento.');
      await runTransaction(db, async (tx) => {
        const s = await tx.get(spDoc(cid, pid));
        if (!s.exists()) throw new Error('Apadrinhamento não encontrado.');
        const histRef = doc(sub(cid, 'sponsorshipHistory'));
        tx.set(histRef, { ...s.data(), status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: actor.email, cancelReason: reason.trim().slice(0, 500) });
        tx.delete(spDoc(cid, pid));
        tx.update(pubDoc(cid, pid), { sponsored: false, sponsoredAt: null, updatedAt: serverTimestamp() });
        tx.set(auditRef(), auditEntry(actor, cid, 'sponsorship.cancel', 'participant', pid, `Apadrinhamento ${String(s.data().protocol)} cancelado e participante liberado. Motivo: ${reason.trim()}`));
      });
    },

    subscribeContributions(cid, cb, onError) {
      return onSnapshot(sub(cid, 'contributions'), (s) => cb(s.docs.map((d) => fromDoc<Contribution>(d.id, d.data())).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn))), onError);
    },
    async addContribution(cid, c, actor) {
      if (!(c.amountCents > 0)) throw new Error('Informe um valor positivo.');
      const ref = doc(sub(cid, 'contributions'));
      const batch = writeBatch(db);
      batch.set(ref, clean({ ...c, campaignId: cid, createdBy: actor.email, createdAt: serverTimestamp() }));
      batch.set(auditRef(), auditEntry(actor, cid, 'contribution.create', 'contribution', ref.id, 'Contribuição Pix registrada manualmente'));
      await batch.commit();
    },
    async removeContribution(cid, id, actor) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'campaigns', cid, 'contributions', id));
      batch.set(auditRef(), auditEntry(actor, cid, 'contribution.delete', 'contribution', id, 'Registro de contribuição removido'));
      await batch.commit();
    },

    async importParticipants(cid, records, meta, actor) {
      if (actor.role !== 'admin') throw new Error('Permissão negada: importação restrita à administração.');
      const camp = await getDoc(C.campaign(cid));
      if (!camp.exists()) throw new Error('Campanha de destino inexistente.');
      const jobRef = doc(sub(cid, 'importJobs'));
      const CHUNK = 200;
      for (let i = 0; i < records.length; i += CHUNK) {
        const batch = writeBatch(db);
        for (const r of records.slice(i, i + CHUNK)) {
          batch.set(doc(sub(cid, 'participants')), clean({ ...r, campaignId: cid, published: false, importJobId: jobRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Record<string, unknown>));
        }
        await batch.commit();
      }
      const batch = writeBatch(db);
      batch.set(jobRef, { campaignId: cid, fileName: meta.fileName.slice(0, 200), total: meta.total, created: records.length, skippedDuplicates: meta.skippedDuplicates, invalid: meta.invalid, actorEmail: actor.email, createdAt: serverTimestamp() });
      batch.set(auditRef(), auditEntry(actor, cid, 'import.run', 'importJob', jobRef.id, `Importação de ${meta.fileName}: ${records.length} criados, ${meta.skippedDuplicates} duplicados ignorados, ${meta.invalid} inválidos`));
      await batch.commit();
      return { jobId: jobRef.id, created: records.length };
    },
    subscribeImportJobs(cid, cb, onError) {
      return onSnapshot(query(sub(cid, 'importJobs'), orderBy('createdAt', 'desc'), limit(50)), (s) => cb(s.docs.map((d) => fromDoc<ImportJob>(d.id, d.data()))), onError);
    },
    subscribeAudit(cid, cb, onError) {
      return onSnapshot(query(collection(db, 'auditLogs'), where('campaignId', '==', cid), orderBy('createdAt', 'desc'), limit(300)), (s) => cb(s.docs.map((d) => fromDoc<AuditLog>(d.id, d.data()))), onError);
    },
  };

  return {
    mode: 'firebase',
    subscribeActiveCampaign(cb, onError) {
      let inner: (() => void) | null = null;
      const outer = onSnapshot(C.config(), (cfg) => {
        inner?.();
        const id = cfg.data()?.activeCampaignId as string | undefined;
        if (!id) { inner = null; cb(null); return; }
        inner = onSnapshot(C.campaign(id), (c) => cb(c.exists() ? fromDoc<Campaign>(c.id, c.data()) : null), onError);
      }, onError);
      return () => { inner?.(); outer(); };
    },
    subscribePublicParticipants(cid, cb, onError: OnError) {
      // A consulta precisa do filtro published == true para ser aceita pelas regras.
      return onSnapshot(query(sub(cid, 'publicParticipants'), where('published', '==', true)), (s) => cb(s.docs.map((d) => fromDoc<PublicParticipant>(d.id, d.data()))), onError);
    },
    async sponsor(input) {
      const v = validateSponsorInput(input);
      if ('ok' in v) return v;
      try {
        return await runTransaction(db, async (tx) => {
          const campSnap = await tx.get(C.campaign(input.campaignId));
          if (!campSnap.exists() || campSnap.data().status !== 'active') return failure.closed();
          const pubSnap = await tx.get(pubDoc(input.campaignId, input.participantId));
          if (!pubSnap.exists() || pubSnap.data().published !== true) return failure.invalid('Participante indisponível.');
          if (pubSnap.data().sponsored === true) return failure.already();
          const protocol = generateProtocol(Number(campSnap.data().year) || new Date().getFullYear());
          const displayName = String(pubSnap.data().displayName);
          tx.set(spDoc(input.campaignId, input.participantId), {
            campaignId: input.campaignId, participantId: input.participantId, participantDisplayName: displayName,
            sponsorName: v.sponsorName, sponsorPhone: v.sponsorPhone, protocol, status: 'confirmed', consent: true,
            createdAt: serverTimestamp(), statusChangedAt: serverTimestamp(),
          });
          tx.update(pubDoc(input.campaignId, input.participantId), { sponsored: true, sponsoredAt: serverTimestamp(), updatedAt: serverTimestamp() });
          return { ok: true as const, protocol, participantId: input.participantId, participantDisplayName: displayName };
        });
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (code === 'permission-denied' || code === 'already-exists' || code === 'failed-precondition' || code === 'aborted') {
          // O servidor recusou: verifica se outra pessoa apadrinhou no meio tempo.
          try {
            const fresh = await getDoc(pubDoc(input.campaignId, input.participantId));
            if (fresh.exists() && fresh.data().sponsored === true) return failure.already();
          } catch { /* ignora */ }
          return failure.closed();
        }
        if (code === 'unavailable' || code === 'deadline-exceeded' || (typeof navigator !== 'undefined' && !navigator.onLine)) return failure.network();
        return failure.unknown();
      }
    },
    auth: {
      subscribe(cb: (s: AuthState) => void) {
        cb({ status: 'loading' });
        return onAuthStateChanged(auth, async (u) => {
          if (!u) { cb({ status: 'signedOut' }); return; }
          try {
            const a = await getDoc(doc(db, 'administrators', u.uid));
            const d = a.data();
            if (a.exists() && d?.active === true && (d.role === 'admin' || d.role === 'operator')) {
              cb({ status: 'staff', user: { uid: u.uid, email: u.email ?? '', role: d.role, displayName: d.displayName } });
            } else cb({ status: 'denied', email: u.email ?? '' });
          } catch {
            cb({ status: 'denied', email: u.email ?? '' });
          }
        });
      },
      async signIn(email, password) {
        try { await signInWithEmailAndPassword(auth, email.trim(), password); } catch (e) {
          const code = (e as { code?: string }).code ?? '';
          if (code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde alguns minutos.');
          if (code === 'auth/network-request-failed') throw new Error('Sem conexão. Verifique a internet.');
          throw new Error('E-mail ou senha inválidos.');
        }
      },
      async signOut() { await signOut(auth); },
    },
    admin,
  };
}

