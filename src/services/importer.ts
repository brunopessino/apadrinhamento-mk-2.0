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
  /** linhas ignoradas por pertencerem a outro ano (quando onlyYear é usado) */
  otherYear: number;
}
export interface BuildOptions { onlyYear?: number }

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

export function buildRecords(sheet: ParsedSheet, map: Mapping, existingKeys: Set<string>, opts: BuildOptions = {}): BuildResult {
  const out: BuildResult = { records: [], issues: [], duplicates: [], yearsFound: [], otherYear: 0 };
  const seen = new Set<string>();
  const years = new Set<number>();
  sheet.rows.forEach((row, i) => {
    const rowNo = i + 2; // linha 1 = cabeçalho
    const get = (k: FieldKey) => (map[k] ? String(row[map[k]!] ?? '').trim() : '');
    const fullName = get('fullName').replace(/\s+/g, ' ').trim();
    const ts = parseTimestamp(get('timestamp'));
    if (ts) years.add(new Date(ts).getUTCFullYear());
    if (opts.onlyYear && ts && yearInBrazil(ts) !== opts.onlyYear) { out.otherYear++; return; }
    if (!fullName) { out.issues.push({ row: rowNo, message: 'Nome ausente — linha ignorada.' }); return; }
    if (fullName.length > 120) { out.issues.push({ row: rowNo, message: 'Nome muito longo — linha ignorada.' }); return; }
    const category = normalizeCategory(get('category'));
    if (!category) { out.issues.push({ row: rowNo, message: `Categoria ausente para "${fullName}" — linha ignorada.` }); return; }
    const ageRaw = get('age');
    const age = parseAge(ageRaw);
    if (ageRaw && age === null) out.issues.push({ row: rowNo, message: `Idade "${ageRaw}" não reconhecida para "${fullName}" (importado sem idade).` });
    const group = get('group');
    if (opts.onlyYear && !ts) out.issues.push({ row: rowNo, message: `"${fullName}" não tem data de resposta (linha incluída à mão?) — importado; confira se é de ${opts.onlyYear}.` });
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

/** Ano da resposta no horário de Brasília (UTC-3). */
export function yearInBrazil(iso: string): number {
  return new Date(new Date(iso).getTime() - 3 * 3600_000).getUTCFullYear();
}

/* ------------------------------------------------------------------ */
/* Fotos em lote: casa cada arquivo com a pessoa pelo nome no arquivo   */
/* ------------------------------------------------------------------ */
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const tokens = (s: string) => norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((t) => t.length > 1 && !STOP.has(t));
const IMG_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
export const isImageName = (n: string) => IMG_EXT.test(n);

/**
 * Para cada registro, encontra o arquivo cujo nome contém o nome da pessoa.
 * Aceita "Nome Sobrenome.jpg" e o padrão do Google Forms "IMG_123 - Nome Sobrenome.jpg".
 * Só associa quando a correspondência é única (nunca chuta).
 */
export function matchPhotos<R extends { fullName: string }>(records: R[], fileNames: string[]): Map<number, number> {
  const files = fileNames.map((n) => {
    const base = (n.split('/').pop() ?? n).replace(IMG_EXT, '');
    const named = base.includes(' - ') ? base.slice(base.lastIndexOf(' - ') + 3) : base;
    return { all: new Set(tokens(base)), named: tokens(named) };
  });
  const score = (r: R, fi: number) => {
    const rt = tokens(r.fullName);
    if (rt.length === 0) return 0;
    const f = files[fi];
    if (rt.every((t) => f.all.has(t))) return 3; // nome completo presente
    if (f.named.length >= 2 && f.named.every((t) => rt.includes(t))) return 2; // arquivo tem parte do nome (ex.: nome + último sobrenome)
    return 0;
  };
  const out = new Map<number, number>();
  const usedBy = new Map<number, number[]>();
  records.forEach((r, ri) => {
    let best = 0; let hits: number[] = [];
    files.forEach((_, fi) => { const s = score(r, fi); if (s > best) { best = s; hits = [fi]; } else if (s === best && s > 0) hits.push(fi); });
    if (best > 0 && hits.length === 1) { out.set(ri, hits[0]); usedBy.set(hits[0], [...(usedBy.get(hits[0]) ?? []), ri]); }
  });
  // um arquivo associado a mais de uma pessoa é ambíguo: desfaz
  for (const [, ris] of usedBy) if (ris.length > 1) ris.forEach((ri) => out.delete(ri));
  return out;
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
export const mimeOf = (n: string) => MIME[n.split('.').pop()?.toLowerCase() ?? ''] ?? '';

/** Lê fotos soltas e/ou arquivos .zip (ex.: download da pasta do Google Drive). */
export async function collectPhotoFiles(list: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of list) {
    if (f.name.toLowerCase().endsWith('.zip')) {
      const { unzipSync } = await import('fflate');
      const entries = unzipSync(new Uint8Array(await f.arrayBuffer()), { filter: (e) => isImageName(e.name) && !e.name.startsWith('__MACOSX') });
      for (const [name, data] of Object.entries(entries)) out.push(new File([data as BlobPart], name.split('/').pop() ?? name, { type: mimeOf(name) }));
    } else if (isImageName(f.name)) out.push(f.type ? f : new File([f], f.name, { type: mimeOf(f.name) }));
  }
  return out;
}
