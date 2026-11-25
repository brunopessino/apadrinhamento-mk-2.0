const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.replace(/[^A-Z2-9]/g, '');

export function generateProtocol(year: number, rnd: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))): string {
  const yy = String(year % 100).padStart(2, '0');
  const r = rnd(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[r[i] % ALPHABET.length];
  return `MK${yy}-${out}`;
}

export const PROTOCOL_RE = /^MK[0-9]{2}-[A-Z2-9]{8}$/;
