#!/usr/bin/env node
/**
 * Migração NÃO DESTRUTIVA da campanha 2025 (coleção legada "afilhados")
 * para a estrutura multi-campanha, como HISTÓRICO ADMINISTRATIVO.
 *
 * - Lê "afilhados"; nunca altera nem apaga a coleção de origem.
 * - Escreve em campaigns/2025 (status "archived"), participants/ (privado,
 *   published=false) e sponsorships/ — nada fica público.
 * - IDs determinísticos (legacy-<id>) => reexecução é idempotente.
 * - Padrão: simulação (dry-run). Gravar exige --apply.
 *
 * Uso (simulação): FIREBASE_PROJECT_ID=natal-mk GOOGLE_APPLICATION_CREDENTIALS=... npm run migrate:2025
 * Uso (gravar):    ... npm run migrate:2025 -- --apply
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { connect, APPLY } from './_admin.mjs';

const db = connect();
const CID = '2025';
const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const digits = (s) => String(s ?? '').replace(/\D/g, '');
const phone = (s) => { let d = digits(s); if (d.startsWith('55') && d.length > 11) d = d.slice(2); return d.length >= 10 ? `55${d}` : d; };
const display = (n) => { const p = String(n).trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0]; };
const age = (v) => { const m = String(v ?? '').match(/\d{1,3}/); return m ? Number(m[0]) : null; };

const snap = await db.collection('afilhados').get();
console.log(`Origem: afilhados — ${snap.size} documentos (somente leitura).`);
const plan = { participants: 0, sponsorships: 0, skippedExisting: 0 };
const writes = [];
for (const d of snap.docs) {
  const a = d.data();
  const id = `legacy-${d.id}`;
  const pRef = db.doc(`campaigns/${CID}/participants/${id}`);
  if ((await pRef.get()).exists) { plan.skippedExisting++; continue; }
  const fullName = String(a.nomeCompleto ?? '').trim();
  writes.push([pRef, {
    campaignId: CID, fullName, displayName: display(fullName || 'Participante'), category: a.tipoPessoa ?? '', age: age(a.idade), ageRaw: String(a.idade ?? ''),
    group: a.turma ?? '', clothingSize: String(a.tamanhoRoupa ?? ''), shoeSize: String(a.tamanhoCalcado ?? ''), giftSuggestion: a.opcaoPresente ?? '',
    photoSource: a.fotoUrl ? `legacy:${a.fotoUrl}` : null, publicationAuthorized: false, published: false, archived: true,
    dedupeKey: `${strip(fullName)}|${age(a.idade) ?? ''}|${strip(a.turma ?? '')}`, legacyId: d.id, migratedAt: FieldValue.serverTimestamp(),
  }]);
  plan.participants++;
  if (a.apadrinhado) {
    writes.push([db.doc(`campaigns/${CID}/sponsorships/${id}`), {
      campaignId: CID, participantId: id, participantDisplayName: display(fullName || 'Participante'), sponsorName: a.padrinhoNome ?? '',
      sponsorPhone: phone(a.padrinhoWhatsapp), protocol: `MK25-LEGADO${String(plan.sponsorships + 1).padStart(3, '0')}`,
      status: 'delivered', consent: true, createdAt: a.dataApadrinhamento instanceof Timestamp ? a.dataApadrinhamento : null, legacyId: d.id,
    }]);
    plan.sponsorships++;
  }
}
console.log('Plano:', plan);
if (!APPLY) { console.log('SIMULAÇÃO concluída. Nada foi gravado. Reexecute com --apply após backup e autorização.'); process.exit(0); }
const campRef = db.doc(`campaigns/${CID}`);
if (!(await campRef.get()).exists) {
  writes.unshift([campRef, { year: 2025, name: 'Apadrinhamento de Natal 2025', status: 'archived', heroTitle: 'Apadrinhamento de Natal 2025', heroMessage: '', institutionalMessage: '', guidelines: [], pix: { key: '', beneficiary: '' }, eligibleCategories: [], createdAt: FieldValue.serverTimestamp() }]);
}
for (let i = 0; i < writes.length; i += 400) {
  const b = db.batch();
  for (const [ref, data] of writes.slice(i, i + 400)) b.create(ref, data); // create: falha se já existir (nunca sobrescreve)
  await b.commit();
}
console.log(`Gravados ${writes.length} documentos em campaigns/${CID}. Coleção "afilhados" intacta.`);
