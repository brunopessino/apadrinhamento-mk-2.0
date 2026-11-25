import { DATA_MODE } from '@/config/campaign';
import type { DataService } from './types';

let instance: Promise<DataService> | null = null;

/** Carrega a implementação sob demanda (code splitting: o modo demo não baixa o SDK do Firebase). */
export function getDataService(): Promise<DataService> {
  if (!instance) {
    instance = DATA_MODE === 'demo'
      ? import('./demoService').then((m) => {
          const s = m.createDemoService();
          if (typeof window !== 'undefined') (window as unknown as { __mkDemo?: unknown }).__mkDemo = s;
          return s;
        })
      : import('./firebaseService').then((m) => m.createFirebaseService());
  }
  return instance;
}

/** Somente testes */
export function __setDataService(s: DataService | null) {
  instance = s ? Promise.resolve(s) : null;
}
