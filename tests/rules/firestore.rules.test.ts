/**
 * Testes das Security Rules no Firebase Emulator Suite.
 * Executar: npm run test:rules   (requer Java 11+ e firebase-tools; baixa o emulador na 1ª vez)
 * Nunca roda contra a base real (projeto "demo-*" é sempre local).
 */
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, runTransaction, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';

let env: RulesTestEnvironment;
const CID = '2026';

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-mk-test', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'config/app'), { activeCampaignId: CID });
    await setDoc(doc(db, `campaigns/${CID}`), { year: 2026, status: 'active', name: '2026' });
    await setDoc(doc(db, 'campaigns/2025'), { year: 2025, status: 'archived', name: '2025' });
    await setDoc(doc(db, 'administrators/admin1'), { role: 'admin', active: true });
    await setDoc(doc(db, 'administrators/op1'), { role: 'operator', active: true });
    await setDoc(doc(db, 'administrators/old'), { role: 'admin', active: false });
    for (const id of ['p1', 'p2']) {
      await setDoc(doc(db, `campaigns/${CID}/publicParticipants/${id}`), { displayName: `Nome ${id}`, published: true, sponsored: false, category: 'Aluno' });
      await setDoc(doc(db, `campaigns/${CID}/participants/${id}`), { fullName: `Nome Completo ${id}`, published: true });
    }
    await setDoc(doc(db, `campaigns/${CID}/publicParticipants/draft`), { displayName: 'Rascunho', published: false, sponsored: false });
    await setDoc(doc(db, 'afilhados/legado1'), { nomeCompleto: 'Pessoa 2025', padrinhoWhatsapp: '21999999999' });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const sponsorDoc = (pid: string, o: Record<string, unknown> = {}) => ({
  campaignId: CID, participantId: pid, participantDisplayName: `Nome ${pid}`, sponsorName: 'Maria', sponsorPhone: '5521987654321',
  protocol: 'MK26-ABCDEFGH', status: 'confirmed', consent: true, createdAt: serverTimestamp(), statusChangedAt: serverTimestamp(), ...o,
});
async function sponsor(db: ReturnType<typeof anon>, pid: string, o: Record<string, unknown> = {}) {
  return runTransaction(db, async (tx) => {
    await tx.get(doc(db, `campaigns/${CID}/publicParticipants/${pid}`));
    tx.set(doc(db, `campaigns/${CID}/sponsorships/${pid}`), sponsorDoc(pid, o));
    tx.update(doc(db, `campaigns/${CID}/publicParticipants/${pid}`), { sponsored: true, sponsoredAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

describe('leitura pública', () => {
  it('lê participantes publicados apenas com o filtro published == true', async () => {
    await assertSucceeds(getDocs(query(collection(anon(), `campaigns/${CID}/publicParticipants`), where('published', '==', true))));
    await assertFails(getDocs(collection(anon(), `campaigns/${CID}/publicParticipants`)));
    await assertFails(getDoc(doc(anon(), `campaigns/${CID}/publicParticipants/draft`)));
  });
  it('não lê dados privados, apadrinhamentos, logs nem o legado 2025', async () => {
    await assertFails(getDoc(doc(anon(), `campaigns/${CID}/participants/p1`)));
    await assertFails(getDocs(collection(anon(), `campaigns/${CID}/sponsorships`)));
    await assertFails(getDocs(collection(anon(), 'auditLogs')));
    await assertFails(getDoc(doc(anon(), 'afilhados/legado1')));
    await assertFails(getDoc(doc(anon(), 'campaigns/2025')));
    await assertSucceeds(getDoc(doc(anon(), `campaigns/${CID}`)));
  });
});

describe('apadrinhamento anônimo', () => {
  it('confirma de forma atômica', async () => {
    await assertSucceeds(sponsor(anon(), 'p1'));
  });
  it('segunda confirmação do mesmo participante é recusada pelo servidor', async () => {
    await assertSucceeds(sponsor(anon(), 'p1'));
    await assertFails(sponsor(anon(), 'p1', { sponsorName: 'Outra' }));
  });
  it('tentativas simultâneas: no máximo uma vence', async () => {
    const results = await Promise.allSettled([sponsor(anon(), 'p2'), sponsor(anon(), 'p2', { sponsorName: 'B' }), sponsor(anon(), 'p2', { sponsorName: 'C' })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('bloqueia manipulação: só marcar sponsored, ou só criar o registro', async () => {
    await assertFails(updateDoc(doc(anon(), `campaigns/${CID}/publicParticipants/p1`), { sponsored: true, sponsoredAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(anon(), `campaigns/${CID}/sponsorships/p1`), sponsorDoc('p1')));
  });
  it('bloqueia campos extras, telefone inválido, consentimento ausente e alteração de outros campos', async () => {
    await assertFails(sponsor(anon(), 'p1', { isAdmin: true }));
    await assertFails(sponsor(anon(), 'p1', { sponsorPhone: '123' }));
    await assertFails(sponsor(anon(), 'p1', { consent: false }));
    await assertFails(sponsor(anon(), 'p1', { participantDisplayName: 'Falso' }));
    const db = anon();
    await assertFails(runTransaction(db, async (tx) => {
      tx.set(doc(db, `campaigns/${CID}/sponsorships/p1`), sponsorDoc('p1'));
      tx.update(doc(db, `campaigns/${CID}/publicParticipants/p1`), { sponsored: true, sponsoredAt: serverTimestamp(), updatedAt: serverTimestamp(), displayName: 'hack' });
    }));
  });
  it('não aceita em rascunho nem em campanha fechada', async () => {
    const db = anon();
    // escrita direta (sem tx.get) para exercitar a regra de apadrinhamento, não a de leitura
    await assertFails(runTransaction(db, async (tx) => {
      tx.set(doc(db, `campaigns/${CID}/sponsorships/draft`), sponsorDoc('draft', { participantDisplayName: 'Rascunho' }));
      tx.update(doc(db, `campaigns/${CID}/publicParticipants/draft`), { sponsored: true, sponsoredAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }));
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), `campaigns/${CID}`), { status: 'closed' }); });
    await assertFails(sponsor(anon(), 'p1'));
  });
  it('anônimo não cancela/libera', async () => {
    await sponsor(anon(), 'p1');
    await assertFails(deleteDoc(doc(anon(), `campaigns/${CID}/sponsorships/p1`)));
    await assertFails(updateDoc(doc(anon(), `campaigns/${CID}/publicParticipants/p1`), { sponsored: false }));
  });
});

describe('consistência público/privado', () => {
  it('admin não pode marcar disponível enquanto existe apadrinhamento ativo', async () => {
    await sponsor(anon(), 'p1');
    await assertFails(updateDoc(doc(as('admin1'), `campaigns/${CID}/publicParticipants/p1`), { sponsored: false, displayName: 'Nome p1' }));
    await assertSucceeds(updateDoc(doc(as('admin1'), `campaigns/${CID}/publicParticipants/p1`), { displayName: 'Novo nome', sponsored: true }));
  });
  it('cancelamento real (sponsoredAt: null) libera para novo apadrinhamento', async () => {
    await sponsor(anon(), 'p1');
    const db = as('admin1');
    await assertSucceeds(runTransaction(db, async (tx) => {
      const s = await tx.get(doc(db, `campaigns/${CID}/sponsorships/p1`));
      tx.set(doc(db, `campaigns/${CID}/sponsorshipHistory/h1`), { ...s.data(), status: 'cancelled' });
      tx.delete(doc(db, `campaigns/${CID}/sponsorships/p1`));
      tx.update(doc(db, `campaigns/${CID}/publicParticipants/p1`), { sponsored: false, sponsoredAt: null, updatedAt: serverTimestamp() });
    }));
    await assertSucceeds(sponsor(anon(), 'p1', { sponsorName: 'Nova pessoa' }));
  });
  it('participantes de campanha arquivada não são públicos', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'campaigns/2025/publicParticipants/x'), { published: true, sponsored: true, displayName: 'X' }); });
    await assertFails(getDoc(doc(anon(), 'campaigns/2025/publicParticipants/x')));
  });
});

describe('equipe e permissões', () => {
  it('admin lê e cancela/libera; operador avança status mas não cancela', async () => {
    await sponsor(anon(), 'p1');
    await assertSucceeds(getDoc(doc(as('op1'), `campaigns/${CID}/sponsorships/p1`)));
    await assertSucceeds(updateDoc(doc(as('op1'), `campaigns/${CID}/sponsorships/p1`), { status: 'received', receivedAt: serverTimestamp(), statusChangedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('op1'), `campaigns/${CID}/sponsorships/p1`), { sponsorName: 'Trocado' }));
    await assertFails(deleteDoc(doc(as('op1'), `campaigns/${CID}/sponsorships/p1`)));
    const db = as('admin1');
    const b = writeBatch(db);
    b.set(doc(db, `campaigns/${CID}/sponsorshipHistory/h1`), { status: 'cancelled' });
    b.delete(doc(db, `campaigns/${CID}/sponsorships/p1`));
    b.update(doc(db, `campaigns/${CID}/publicParticipants/p1`), { sponsored: false });
    await assertSucceeds(b.commit());
  });
  it('operador não publica nem edita participante publicado', async () => {
    await assertFails(updateDoc(doc(as('op1'), `campaigns/${CID}/publicParticipants/p1`), { displayName: 'x' }));
    await assertFails(updateDoc(doc(as('op1'), `campaigns/${CID}/participants/p1`), { fullName: 'x' }));
    await assertSucceeds(setDoc(doc(as('op1'), `campaigns/${CID}/participants/novo`), { fullName: 'Novo', published: false }));
    await assertFails(setDoc(doc(as('op1'), `campaigns/${CID}/participants/novo2`), { fullName: 'Novo', published: true }));
  });
  it('conta inativa ou sem cadastro não tem acesso', async () => {
    await assertFails(getDoc(doc(as('old'), `campaigns/${CID}/participants/p1`)));
    await assertFails(getDoc(doc(as('qualquer'), `campaigns/${CID}/participants/p1`)));
  });
  it('logs são append-only e assinados pelo próprio usuário', async () => {
    await assertSucceeds(setDoc(doc(as('op1'), 'auditLogs/l1'), { campaignId: CID, actorUid: 'op1', role: 'operator', action: 'x', summary: 'y', createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('op1'), 'auditLogs/l3'), { campaignId: CID, actorUid: 'op1', role: 'admin', action: 'x', summary: 'y', createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('op1'), 'auditLogs/l2'), { campaignId: CID, actorUid: 'admin1', role: 'admin', action: 'x', summary: 'y', createdAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('admin1'), 'auditLogs/l1'), { summary: 'z' }));
    await assertFails(deleteDoc(doc(as('admin1'), 'auditLogs/l1')));
  });
  it('legado 2025 é somente leitura (preservação)', async () => {
    await assertSucceeds(getDoc(doc(as('admin1'), 'afilhados/legado1')));
    await assertFails(updateDoc(doc(as('admin1'), 'afilhados/legado1'), { apadrinhado: false }));
    await assertFails(deleteDoc(doc(as('admin1'), 'afilhados/legado1')));
    await assertFails(deleteDoc(doc(as('admin1'), 'campaigns/2025')));
  });
});
