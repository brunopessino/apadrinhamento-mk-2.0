/** Máscara brasileira: (21) 99999-9999 ou (21) 2222-3333 */
export function maskPhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Retorna dígitos nacionais (DDD + número) ou null se inválido. */
export function nationalDigits(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (!/^[1-9][1-9]/.test(d)) return null;
  if (d.length === 11 && d[2] !== '9') return null;
  if (d.length === 10 && !/[2-5]/.test(d[2])) return null;
  return d;
}

export const isValidBrPhone = (input: string) => nationalDigits(input) !== null;

/** Formato armazenado: 55 + DDD + número. */
export function toStoredPhone(input: string): string | null {
  const n = nationalDigits(input);
  return n ? `55${n}` : null;
}

export function formatStoredPhone(stored: string): string {
  return maskPhone(stored.replace(/^55/, ''));
}

export const whatsappLink = (stored: string, text?: string) =>
  `https://wa.me/${stored}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
