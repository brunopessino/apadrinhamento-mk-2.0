/** Proteção contra injeção de fórmulas em CSV/Excel (OWASP CSV Injection). */
export function sanitizeCell(value: unknown): string | number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
}
export const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
