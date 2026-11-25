/**
 * Implementação de DEMONSTRAÇÃO do DataService.
 * - Dados sintéticos persistidos no localStorage do navegador.
 * - Sincronização em tempo real entre abas (BroadcastChannel/storage).
 * - Exclusão mútua entre abas com Web Locks, reproduzindo a mesma
 *   invariante da transação do Firestore: um único apadrinhamento ativo
 *   por participante.
 * Nunca acessa a rede nem a base real.
 */
import type {
  AuditLog, AuthState, Campaign, Contribution, ImportJob, PrivateParticipant, PublicParticipant,
  Sponsorship, SponsorshipHistoryItem, StaffUser,
} from '@/types';
import { generateProtocol } from '@/lib/protocol';
import type { AdminApi, DataService, OnError, Unsub } from './types';
import { buildSeed, type DemoSeed } from './demoSeed';
import { failure, toPublicFields, validateSponsorInput } from './shared';

const KEY = 'mk-demo-state-v1';
const AUTH_KEY = 'mk-demo-auth-v1';
const LATENCY_KEY = 'mk-demo-latency';
const FAIL_KEY = 'mk-demo-fail';

interface DemoState extends DemoSeed {
  version: 1;
  activeCampaignId: string;
  contributions: Record<string, Contribution[]>;
  importJobs: Record<string, ImportJob[]>;
  audit: AuditLog[];
}

export const DEMO_USERS: Record<string, { password: string; user: StaffUser | null }> = {
  'admin@demo.mk': { password: 'demo-admin', user: { uid: 'demo-admin', email: 'admin@demo.mk', role: 'admin', displayName: 'Administração (demo)' } },
  'operador@demo.mk': { password: 'demo-operador', user: { uid: 'demo-operator', email: 'operador@demo.mk', role: 'operator', displayName: 'Operador (demo)' } },
  'semacesso@demo.mk': { password: 'demo-semacesso', user: null },
};

const nowIso = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function freshState(): DemoState {
  return { version: 1, activeCampaignId: '2026', ...buildSeed(), contributions: { '2025': [], '2026': [] }, importJobs: { '2025': [], '2026': [] }, audit: [] };
}

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* armazenamento indisponível: mantém em memória */ }
}

export function createDemoService(opts: { latencyMs?: number } = {}): DataService & { reset(): void } {
  let memory: DemoState | null = null;
  const listeners = new Set<() => void>();
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mk-demo') : null;

  const load = (): DemoState => {
    const raw = safeGet(KEY);
    if (raw) {
      try { memory = JSON.parse(raw) as DemoState; return memory; } catch { /* corrompido: recria */ }
    }
    if (!memory) { memory = freshState(); safeSet(KEY, JSON.stringify(memory)); }
    return memory;
  };
  const notify = () => listeners.forEach((l) => l());
  channel?.addEventListener('message', () => { memory = null; notify(); });
  if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY) { memory = null; notify(); } });

  const latency = () => {
    const v = Number(safeGet(LATENCY_KEY));
    return Number.isFinite(v) && safeGet(LATENCY_KEY) !== null ? v : opts.latencyMs ?? 300;
  };

  /** Executa uma mutação de forma atômica (lock entre abas + leitura fresca). */
  async function mutate<T>(fn: (s: DemoState) => T): Promise<T> {
    const run = async () => {
      memory = null;
      const s = load();
      const result = fn(s); // lança erro => nada é gravado
      safeSet(KEY, JSON.stringify(s));
      memory = s;
      channel?.postMessage('changed');
      notify();
      return result;
    };
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    return locks ? (locks.request('mk-demo-lock', run) as Promise<T>) : run();
  }

  function watch<T>(select: (s: DemoState) => T, cb: (v: T) => void): Unsub {
    let active = true;
    const fire = () => { if (active) queueMicrotask(() => active && cb(clone(select(load())))); };
    listeners.add(fire);
    fire();
    return () => { active = false; listeners.delete(fire); };
  }

  const audit = (s: DemoState, actor: StaffUser, cid: string, action: string, targetType: string, targetId: string, summary: string) => {
    s.audit.unshift({ id: uid(), campaignId: cid, actorUid: actor.uid, actorEmail: actor.email, role: actor.role, action, targetType, targetId, summary, createdAt: nowIso() });
    s.audit = s.audit.slice(0, 1000);
  };
  const requireAdmin = (a: StaffUser) => { if (a.role !== 'admin') throw new Error('Permissão negada: ação restrita à administração.'); };
  const ensureBuckets = (s: DemoState, cid: string) => {
    s.participants[cid] ??= {}; s.publicParticipants[cid] ??= {}; s.sponsorships[cid] ??= {};
    s.history[cid] ??= []; s.contributions[cid] ??= []; s.importJobs[cid] ??= [];
  };

  // ---------------- Autenticação (demo) ----------------
  const authListeners = new Set<(s: AuthState) => void>();
  const readAuth = (): AuthState => {
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(AUTH_KEY); } catch { /* */ }
    if (!raw) return { status: 'signedOut' };
    const entry = DEMO_USERS[raw];
    if (!entry) return { status: 'signedOut' };
    return entry.user ? { status: 'staff', user: entry.user } : { status: 'denied', email: raw };
  };
  const emitAuth = () => { const s = readAuth(); authListeners.forEach((l) => l(s)); };

  const admin: AdminApi = {
    subscribeCampaigns: (cb) => watch((s) => Object.values(s.campaigns).sort((a, b) => b.year - a.year), cb),
    subscribeActiveCampaignId: (cb) => watch((s) => s.activeCampaignId || null, cb),
    async saveCampaign(c, actor) {
      requireAdmin(actor);
      await mutate((s) => {
        const prev = s.campaigns[c.id];
        s.campaigns[c.id] = { ...c, createdAt: prev?.createdAt ?? nowIso(), updatedAt: nowIso() };
        ensureBuckets(s, c.id);
        audit(s, actor, c.id, prev ? 'campaign.update' : 'campaign.create', 'campaign', c.id, `Campanha ${c.name} salva (status ${c.status})`);
      });
    },
    async setActiveCampaign(id, actor) {
      requireAdmin(actor);
      await mutate((s) => {
        if (!s.campaigns[id]) throw new Error('Campanha inexistente.');
        s.activeCampaignId = id;
        audit(s, actor, id, 'campaign.activate', 'campaign', id, `Campanha ${id} definida como ativa`);
      });
    },

    subscribeParticipants: (cid, cb) => watch((s) => Object.values(s.participants[cid] ?? {}), cb),
    async saveParticipant(cid, input, actor) {
      return mutate((s) => {
        ensureBuckets(s, cid);
        const id = input.id ?? `p-${uid()}`;
        const prev = s.participants[cid][id];
        if (actor.role !== 'admin' && (prev?.published || input.published)) throw new Error('Permissão negada: somente a administração edita participantes publicados.');
        const p: PrivateParticipant = { ...(prev ?? {}), ...input, id, campaignId: cid, createdAt: prev?.createdAt ?? nowIso(), updatedAt: nowIso() } as PrivateParticipant;
        if (p.published && !p.publicationAuthorized) throw new Error('Não é possível publicar sem autorização de exposição.');
        s.participants[cid][id] = p;
        const pub = s.publicParticipants[cid][id];
        if (p.published) s.publicParticipants[cid][id] = { id, ...toPublicFields(p), published: true, sponsored: pub?.sponsored ?? false, sponsoredAt: pub?.sponsoredAt };
        else if (pub) pub.published = false;
        audit(s, actor, cid, prev ? 'participant.update' : 'participant.create', 'participant', id, `${prev ? 'Editado' : 'Cadastrado'}: ${p.displayName}`);
        return id;
      });
    },
    async setPublished(cid, id, published, actor) {
      requireAdmin(actor);
      await mutate((s) => {
        const p = s.participants[cid]?.[id];
        if (!p) throw new Error('Participante não encontrado.');
        if (published && !p.publicationAuthorized) throw new Error('Registre a autorização de exposição antes de publicar.');
        if (published && p.archived) throw new Error('Participante arquivado não pode ser publicado.');
        p.published = published; p.updatedAt = nowIso();
        const pub = s.publicParticipants[cid][id];
        if (published) s.publicParticipants[cid][id] = { id, ...toPublicFields(p), published: true, sponsored: pub?.sponsored ?? false, sponsoredAt: pub?.sponsoredAt };
        else if (pub) pub.published = false;
        audit(s, actor, cid, published ? 'participant.publish' : 'participant.unpublish', 'participant', id, `${published ? 'Publicado' : 'Despublicado'}: ${p.displayName}`);
      });
    },
    async setArchived(cid, id, archived, actor) {
      requireAdmin(actor);
      await mutate((s) => {
        const p = s.participants[cid]?.[id];
        if (!p) throw new Error('Participante não encontrado.');
        p.archived = archived; p.updatedAt = nowIso();
        if (archived) { p.published = false; const pub = s.publicParticipants[cid][id]; if (pub) pub.published = false; }
        audit(s, actor, cid, archived ? 'participant.archive' : 'participant.unarchive', 'participant', id, `${archived ? 'Arquivado' : 'Restaurado'}: ${p.displayName}`);
      });
    },
    async setPhoto(cid, id, photo, actor) {
      await mutate((s) => {
        const p = s.participants[cid]?.[id];
        if (!p) throw new Error('Participante não encontrado.');
        if (p.published && actor.role !== 'admin') throw new Error('Permissão negada.');
        if (photo) p.photoData = photo.thumbDataUrl; else delete p.photoData;
        delete p.photoUrl;
        const pub = s.publicParticipants[cid][id];
        if (pub) { if (photo && p.publicationAuthorized) pub.photoData = photo.thumbDataUrl; else delete pub.photoData; }
        audit(s, actor, cid, photo ? 'participant.photo' : 'participant.photoRemove', 'participant', id, `${photo ? 'Foto atualizada' : 'Foto removida'}: ${p.displayName}`);
      });
    },

    subscribeSponsorships: (cid, cb) => watch((s) => Object.values(s.sponsorships[cid] ?? {}).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), cb),
    subscribeSponsorshipHistory: (cid, cb) => watch((s) => s.history[cid] ?? [], cb),
    async updateSponsorship(cid, pid, patch, actor) {
      await mutate((s) => {
        const sp = s.sponsorships[cid]?.[pid];
        if (!sp) throw new Error('Apadrinhamento não encontrado.');
        const t = nowIso();
        if (patch.status && patch.status !== sp.status) {
          sp.status = patch.status; sp.statusChangedAt = t;
          if (patch.status === 'contacted') sp.contactedAt = t;
          if (patch.status === 'received') sp.receivedAt = t;
          if (patch.status === 'delivered') sp.deliveredAt = t;
        }
        if (patch.adminNotes !== undefined) sp.adminNotes = patch.adminNotes.slice(0, 1000);
        audit(s, actor, cid, 'sponsorship.update', 'sponsorship', pid, `Status ${sp.status}${patch.adminNotes !== undefined ? ' · observação atualizada' : ''} (${sp.protocol})`);
      });
    },
    async cancelSponsorship(cid, pid, reason, actor) {
      requireAdmin(actor);
      if (reason.trim().length < 3) throw new Error('Informe a justificativa do cancelamento.');
      await mutate((s) => {
        const sp = s.sponsorships[cid]?.[pid];
        if (!sp) throw new Error('Apadrinhamento não encontrado.');
        s.history[cid].unshift({ ...sp, id: uid(), status: 'cancelled', cancelledAt: nowIso(), cancelledBy: actor.email, cancelReason: reason.trim() });
        delete s.sponsorships[cid][pid];
        const pub = s.publicParticipants[cid][pid];
        if (pub) { pub.sponsored = false; delete pub.sponsoredAt; }
        audit(s, actor, cid, 'sponsorship.cancel', 'participant', pid, `Apadrinhamento ${sp.protocol} cancelado e participante liberado. Motivo: ${reason.trim()}`);
      });
    },

    subscribeContributions: (cid, cb) => watch((s) => s.contributions[cid] ?? [], cb),
    async addContribution(cid, c, actor) {
      if (!(c.amountCents > 0)) throw new Error('Informe um valor positivo.');
      await mutate((s) => {
        ensureBuckets(s, cid);
        const id = uid();
        s.contributions[cid].unshift({ ...c, id, campaignId: cid, createdBy: actor.email, createdAt: nowIso() });
        audit(s, actor, cid, 'contribution.create', 'contribution', id, `Contribuição Pix registrada manualmente`);
      });
    },
    async removeContribution(cid, id, actor) {
      requireAdmin(actor);
      await mutate((s) => {
        s.contributions[cid] = (s.contributions[cid] ?? []).filter((c) => c.id !== id);
        audit(s, actor, cid, 'contribution.delete', 'contribution', id, 'Registro de contribuição removido');
      });
    },

    async importParticipants(cid, records, meta, actor) {
      requireAdmin(actor);
      return mutate((s) => {
        if (!s.campaigns[cid]) throw new Error('Campanha de destino inexistente.');
        ensureBuckets(s, cid);
        const jobId = uid();
        for (const r of records) {
          const id = `p-${uid()}`;
          s.participants[cid][id] = { ...r, id, campaignId: cid, published: false, importJobId: jobId, createdAt: nowIso(), updatedAt: nowIso() };
        }
        s.importJobs[cid].unshift({ id: jobId, campaignId: cid, fileName: meta.fileName, total: meta.total, created: records.length, skippedDuplicates: meta.skippedDuplicates, invalid: meta.invalid, actorEmail: actor.email, createdAt: nowIso() });
        audit(s, actor, cid, 'import.run', 'importJob', jobId, `Importação de ${meta.fileName}: ${records.length} criados, ${meta.skippedDuplicates} duplicados ignorados, ${meta.invalid} inválidos`);
        return { jobId, created: records.length };
      });
    },
    subscribeImportJobs: (cid, cb) => watch((s) => s.importJobs[cid] ?? [], cb),
    subscribeAudit: (cid, cb) => watch((s) => s.audit.filter((a) => a.campaignId === cid).slice(0, 300), cb),
  };

  const service: DataService & { reset(): void } = {
    mode: 'demo',
    reset() { memory = freshState(); safeSet(KEY, JSON.stringify(memory)); channel?.postMessage('changed'); notify(); },
    subscribeActiveCampaign: (cb: (c: Campaign | null) => void) => watch((s) => s.campaigns[s.activeCampaignId] ?? null, cb),
    subscribePublicParticipants: (cid: string, cb: (p: PublicParticipant[]) => void, _onError: OnError) =>
      watch((s) => Object.values(s.publicParticipants[cid] ?? {}).filter((p) => p.published), cb),

    async sponsor(input) {
      const v = validateSponsorInput(input);
      if ('ok' in v) return v;
      await sleep(latency());
      if (safeGet(FAIL_KEY) === 'network') return failure.network();
      try {
        return await mutate((s) => {
          const camp = s.campaigns[input.campaignId];
          if (!camp || camp.status !== 'active') return failure.closed();
          const pub = s.publicParticipants[input.campaignId]?.[input.participantId];
          if (!pub || !pub.published) return failure.invalid('Participante indisponível.');
          if (pub.sponsored || s.sponsorships[input.campaignId][input.participantId]) return failure.already();
          const protocol = generateProtocol(camp.year);
          const t = nowIso();
          const sp: Sponsorship = {
            id: input.participantId, campaignId: input.campaignId, participantId: input.participantId, participantDisplayName: pub.displayName,
            sponsorName: v.sponsorName, sponsorPhone: v.sponsorPhone, protocol, status: 'confirmed', consent: true, createdAt: t, statusChangedAt: t,
          };
          s.sponsorships[input.campaignId][input.participantId] = sp;
          pub.sponsored = true; pub.sponsoredAt = t;
          return { ok: true as const, protocol, participantId: pub.id, participantDisplayName: pub.displayName };
        });
      } catch {
        return failure.unknown();
      }
    },

    auth: {
      subscribe(cb) { authListeners.add(cb); queueMicrotask(() => cb(readAuth())); return () => authListeners.delete(cb); },
      async signIn(email, password) {
        await sleep(Math.min(latency(), 400));
        const e = email.trim().toLowerCase();
        const entry = DEMO_USERS[e];
        if (!entry || entry.password !== password) throw new Error('E-mail ou senha inválidos.');
        try { sessionStorage.setItem(AUTH_KEY, e); } catch { /* */ }
        emitAuth();
      },
      async signOut() { try { sessionStorage.removeItem(AUTH_KEY); } catch { /* */ } emitAuth(); },
    },
    admin,
  };
  return service;
}

export type { SponsorshipHistoryItem };
