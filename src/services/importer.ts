/**
 * Importação de respostas do Google Forms / Planilhas (XLSX ou CSV).
 * Nunca inventa dados: cada registro corresponde a uma linha real do arquivo.
 */
import type { ImportRecord } from '@/types';
import { dedupeKeyOf, displayNameFrom, norm, normalizeCategory, parseAge } from '@/lib/text';

export type FieldKey = 'timestamp' | 'fullName' | 'category' | 'age' | 'group' | 'clothingSize' | 'shoeSize' | 'photo' | 'gift';

export const FIELDS: { key: FieldKey; label: string; required: boolean; aliases: string[] }[] = [
  { key: 'timestamp', label: 'Carimbo de data/hora', required: false, aliases: ['carimbo de data/hora', 'timestamp', 'data/hora', 'data'] },
  { key: 'fullName', label: 'Nome e sobrenome', required: true, aliases: ['nome e sobrenome', 'nome completo', 'nome'] },
  { key: 'category', label: 'Categoria (Você é)', required: true, aliases: ['voce e', 'você é:', 'categoria', 'tipo'] },
  { key: 'age', label: 'Idade', required: false, aliases: ['idade'] },
  { key: 'group', label: 'Turma', required: false, aliases: ['qual turma', 'turma', 'atividade'] },
  { key: 'clothingSize', label: 'Tamanho de roupa', required: false, aliases: ['tamanho de roupa', 'roupa'] },
  { key: 'shoeSize', label: 'Tamanho de calçado', required: false, aliases: ['tamanho de calcado', 'calcado', 'sapato'] },
  { key: 'photo', label: 'Fotografia (link)', required: false, aliases: ['foto', 'fotografia', 'nos envia uma foto'] },
  { key: 'gift', label: 'Presente sugerido (opcional)', required: false, aliases: ['presente', 'presente sugerido', 'opcao de presente', 'o que gostaria de ganhar'] },
];

export type Mapping = Partial<Record<FieldKey, string>>;
export interface ParsedSheet { headers: string[]; rows: Record<string, string>[] }

const clean = (h: string) => norm(h).replace(/[?:*]/g, '').trim();

export function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const used = new Set<string>();
  for (const f of FIELDS) {
    const hit = headers.find((h) => !used.has(h) && f.aliases.some((a) => clean(h) === clean(a)))
      ?? headers.find((h) => !used.has(h) && f.aliases.some((a) => clean(h).startsWith(clean(a))));
    if (hit) { m[f.key] = hit; used.add(hit); }
  }
  return m;
}

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join('');
    if (o.hyperlink && typeof o.text === 'string') return o.text || o.hyperlink;
    if (o.text != null) return String(o.text);
    if (o.result != null) return cellToString(o.result);
    return '';
  }
  return String(v);
}

export async function parseCsvText(text: string): Promise<ParsedSheet> {
  const Papa = (await import('papaparse')).default;
  const r = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
  return { headers: (r.meta.fields ?? []).filter(Boolean), rows: r.data };
}

export async function parseXlsxBuffer(buf: ArrayBuffer): Promise<ParsedSheet> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets.find((w) => w.rowCount > 0);
  if (!ws) return { headers: [], rows: [] };
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (c, col) => { headers[col - 1] = cellToString(c.value).trim(); });
  const rows: Record<string, string>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) o[h] = cellToString(row.getCell(i + 1).value).trim(); });
    if (Object.values(o).some(Boolean)) rows.push(o);
  });
  return { headers: headers.filter(Boolean), rows };
}

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export async function parseFile(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Arquivo muito grande (máximo 10 MB).');
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') return parseCsvText(await file.text());
  if (name.endsWith('.xlsx')) return parseXlsxBuffer(await file.arrayBuffer());
  throw new Error('Formato não suportado. Use .xlsx ou .csv (Google Planilhas: Arquivo › Fazer download).');
}

export interface RowIssue { row: number; message: string }
export interface Duplicate { row: number; name: string; reason: 'arquivo' | 'campanha' }
export interface BuildResult {
  records: (ImportRecord & { sourceRow: number })[];
  issues: RowIssue[];
  duplicates: Duplicate[];
  yearsFound: number[];
}

/** Interpreta "dd/mm/aaaa hh:mm:ss" (Forms pt-BR) ou ISO. Retorna ISO ou ''. */
export function parseTimestamp(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = br;
    const dt = new Date(Date.UTC(+y, +m - 1, +d, +hh + 3, +mm, +ss)); // America/Sao_Paulo (UTC-3)
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString();
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString();
}

export function buildRecords(sheet: ParsedSheet, map: Mapping, existingKeys: Set<string>): BuildResult {
  const out: BuildResult = { records: [], issues: [], duplicates: [], yearsFound: [] };
  const seen = new Set<string>();
  const years = new Set<number>();
  sheet.rows.forEach((row, i) => {
    const rowNo = i + 2; // linha 1 = cabeçalho
    const get = (k: FieldKey) => (map[k] ? String(row[map[k]!] ?? '').trim() : '');
    const fullName = get('fullName').replace(/\s+/g, ' ');
    if (!fullName) { out.issues.push({ row: rowNo, message: 'Nome ausente — linha ignorada.' }); return; }
    if (fullName.length > 120) { out.issues.push({ row: rowNo, message: 'Nome muito longo — linha ignorada.' }); return; }
    const category = normalizeCategory(get('category'));
    if (!category) { out.issues.push({ row: rowNo, message: `Categoria ausente para "${fullName}" — linha ignorada.` }); return; }
    const ageRaw = get('age');
    const age = parseAge(ageRaw);
    if (ageRaw && age === null) out.issues.push({ row: rowNo, message: `Idade "${ageRaw}" não reconhecida para "${fullName}" (importado sem idade).` });
    const group = get('group');
    const ts = parseTimestamp(get('timestamp'));
    if (ts) years.add(new Date(ts).getUTCFullYear());
    const key = dedupeKeyOf(fullName, age, group);
    if (seen.has(key)) { out.duplicates.push({ row: rowNo, name: fullName, reason: 'arquivo' }); return; }
    if (existingKeys.has(key)) { out.duplicates.push({ row: rowNo, name: fullName, reason: 'campanha' }); seen.add(key); return; }
    seen.add(key);
    out.records.push({
      fullName, displayName: displayNameFrom(fullName), category, age, ageRaw, group,
      clothingSize: get('clothingSize').slice(0, 40), shoeSize: get('shoeSize').slice(0, 40), giftSuggestion: get('gift').slice(0, 200),
      photoSource: get('photo').slice(0, 500) || undefined, publicationAuthorized: false, published: false, archived: false,
      sourceRow: rowNo, sourceTimestamp: ts || undefined, dedupeKey: key,
    });
  });
  out.yearsFound = [...years].sort();
  return out;
}

/** Alerta quando o arquivo aparenta ser de outra campanha (ex.: formulário 2025 importado em 2026). */
export function yearMismatch(fileName: string, yearsFound: number[], targetYear: number): string | null {
  const fileYear = fileName.match(/(20\d{2})/)?.[1];
  if (fileYear && Number(fileYear) !== targetYear) return `O nome do arquivo indica ${fileYear}, mas a campanha de destino é ${targetYear}.`;
  const other = yearsFound.filter((y) => y !== targetYear);
  if (other.length) return `As respostas têm data de ${yearsFound.join(', ')}, diferente da campanha de destino (${targetYear}).`;
  return null;
}
