#!/usr/bin/env node
/**
 * Backup SOMENTE LEITURA do Firestore para JSON local (pasta backups/, ignorada pelo git).
 * Uso: FIREBASE_PROJECT_ID=natal-mk GOOGLE_APPLICATION_CREDENTIALS=~/chaves/natal-mk.json npm run backup:legacy
 * Opcional: --collections=afilhados,campaigns  (padrão: todas as coleções raiz, recursivo)
 * Recomenda-se TAMBÉM o export gerenciado: gcloud firestore export gs://BUCKET/backup-AAAAMMDD (exige Blaze).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect } from './_admin.mjs';

const db = connect();
const only = process.argv.find((a) => a.startsWith('--collections='))?.split('=')[1]?.split(',');
const ser = (v) => {
  if (v && typeof v.toDate === 'function') return { __ts: v.toDate().toISOString() };
  if (Array.isArray(v)) return v.map(ser);
  if (v && typeof v === 'object' && v.constructor?.name === 'DocumentReference') return { __ref: v.path };
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ser(x)]));
  return v;
};
async function dumpCollection(col) {
  const out = {};
  const snap = await col.get();
  for (const d of snap.docs) {
    const subs = await d.ref.listCollections();
    out[d.id] = { data: ser(d.data()), ...(subs.length ? { sub: Object.fromEntries(await Promise.all(subs.map(async (s) => [s.id, await dumpCollection(s)]))) } : {}) };
  }
  return out;
}
const roots = (await db.listCollections()).filter((c) => !only || only.includes(c.id));
const dump = {};
for (const c of roots) { dump[c.id] = await dumpCollection(c); console.log(`  ${c.id}: ${Object.keys(dump[c.id]).length} documentos`); }
mkdirSync('backups', { recursive: true });
const file = `backups/${process.env.FIREBASE_PROJECT_ID}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), project: process.env.FIREBASE_PROJECT_ID, collections: dump }, null, 1));
console.log(`Backup salvo em ${file}. Guarde-o em local seguro (contém dados pessoais).`);
