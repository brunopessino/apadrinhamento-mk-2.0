#!/usr/bin/env node
/**
 * Preparação inicial de um projeto (homologação ou produção 2026).
 * Cria (se não existirem): campaigns/2026 em RASCUNHO, config/app e o
 * primeiro administrador. Não sobrescreve nada. Exige --apply.
 * Uso: FIREBASE_PROJECT_ID=... GOOGLE_APPLICATION_CREDENTIALS=... ADMIN_UID=<uid do Firebase Auth> node scripts/bootstrap-2026.mjs --apply
 */
import { FieldValue } from 'firebase-admin/firestore';
import { connect, APPLY } from './_admin.mjs';

const db = connect();
const uid = process.env.ADMIN_UID;
const ops = [
  ['campaigns/2026', {
    year: 2026, name: 'Apadrinhamento de Natal 2026', status: 'draft', heroTitle: 'Apadrinhamento de Natal 2026',
    heroMessage: 'Compartilhe amor e veja o Natal se multiplicar em sorrisos.',
    institutionalMessage: 'O Natal é tempo de amor, de carinho e de gestos que aquecem o coração. Você pode apadrinhar um participante e presentear com o que puder. Não precisa ser exatamente o que foi pedido. O que vale é o cuidado, o afeto e o acolhimento.',
    guidelines: ['O presente sugerido é uma orientação, não uma obrigação.', 'Você pode presentear conforme as suas possibilidades; não há valor mínimo.', 'A organização poderá entrar em contato pelo WhatsApp informado para combinar a entrega.'],
    deliveryInfo: '', pix: { key: '07152890714', beneficiary: 'Ana Claudia Cloves' }, eligibleCategories: ['Aluno', 'Voluntário', 'Professor(a)'], createdAt: FieldValue.serverTimestamp(),
  }],
  ['config/app', { activeCampaignId: '2026' }],
  ...(uid ? [[`administrators/${uid}`, { role: 'admin', active: true, displayName: process.env.ADMIN_NAME ?? 'Administração', createdAt: FieldValue.serverTimestamp() }]] : []),
];
for (const [path, data] of ops) {
  const ref = db.doc(path);
  if ((await ref.get()).exists) { console.log(`= ${path} já existe — mantido.`); continue; }
  if (!APPLY) { console.log(`+ ${path} seria criado (simulação).`); continue; }
  await ref.create(data); console.log(`+ ${path} criado.`);
}
if (!uid) console.log('Dica: defina ADMIN_UID para criar o primeiro administrador.');
