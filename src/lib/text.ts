export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const norm = (s: string) => stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim();

/** Nome público padrão: primeiro nome + inicial do último sobrenome (minimização de dados). */
export function displayNameFrom(fullName: string): string {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  if (small.has(last.toLowerCase())) return parts[0];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

/** "9 anos" -> 9 ; "abc" -> null ; fora de 0..120 -> null */
export function parseAge(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 && raw <= 120 ? Math.floor(raw) : null;
  const m = String(raw ?? '').match(/\d{1,3}/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return n >= 0 && n <= 120 ? n : null;
}

export function normalizeCategory(raw: string): string {
  const n = norm(raw);
  if (!n) return '';
  if (n.startsWith('alun')) return 'Aluno';
  if (n.startsWith('voluntari')) return 'Voluntário';
  if (n.startsWith('professor')) return 'Professor(a)';
  return raw.trim();
}

export const dedupeKeyOf = (fullName: string, age: number | null, group: string) =>
  `${norm(fullName)}|${age ?? ''}|${norm(group)}`;
