// Utilitário comum aos scripts administrativos (Node + firebase-admin).
// Credenciais: GOOGLE_APPLICATION_CREDENTIALS=/caminho/fora-do-repo/conta-de-servico.json
// NUNCA versione a conta de serviço. Projeto: FIREBASE_PROJECT_ID.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function connect() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) { console.error('Defina FIREBASE_PROJECT_ID.'); process.exit(1); }
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Defina GOOGLE_APPLICATION_CREDENTIALS (conta de serviço fora do repositório) ou FIRESTORE_EMULATOR_HOST.');
    process.exit(1);
  }
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();
  console.log(`Projeto: ${projectId}${process.env.FIRESTORE_EMULATOR_HOST ? ' (EMULADOR)' : ' (REAL)'}`);
  return db;
}
export const APPLY = process.argv.includes('--apply');
