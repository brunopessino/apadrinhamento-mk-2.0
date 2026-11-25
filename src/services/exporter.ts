import type { Campaign, Contribution, PrivateParticipant, Sponsorship, SponsorshipHistoryItem } from '@/types';
import { escapeHtml, sanitizeCell } from '@/lib/csvSafe';
import { formatStoredPhone } from '@/lib/phone';

export type ReportKey = 'all' | 'available' | 'sponsored' | 'sponsors' | 'byGroup' | 'byCategory' | 'giftsPending' | 'giftsReceived' | 'giftsDelivered' | 'history';

export interface ReportDef { key: ReportKey; label: string; personal: boolean }
export const REPORTS: ReportDef[] = [
  { key: 'all', label: 'Todos os participantes', personal: false },
  { key: 'available', label: 'Participantes disponíveis', personal: false },
  { key: 'sponsored', label: 'Participantes apadrinhados', personal: true },
  { key: 'sponsors', label: 'Relação de padrinhos', personal: true },
  { key: 'byGroup', label: 'Participantes por turma', personal: false },
  { key: 'byCategory', label: 'Participantes por categoria', personal: false },
  { key: 'giftsPending', label: 'Presentes pendentes', personal: true },
  { key: 'giftsReceived', label: 'Presentes recebidos', personal: true },
  { key: 'giftsDelivered', label: 'Presentes entregues', personal: true },
  { key: 'history', label: 'Histórico da campanha', personal: true },
];

export interface ReportData {
  campaign: Campaign;
  participants: PrivateParticipant[];
  sponsorships: Sponsorship[];
  history: SponsorshipHistoryItem[];
  contributions: Contribution[];
}
export interface ReportFilters { category?: string; group?: string; includeArchived?: boolean }
export interface Table { title: string; header: string[]; rows: (string | number)[][] }

const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '');
const STATUS: Record<string, string> = { confirmed: 'Confirmado', contacted: 'Contato realizado', received: 'Presente recebido', delivered: 'Entregue', cancelled: 'Cancelado' };

export function buildReport(key: ReportKey, d: ReportData, f: ReportFilters = {}): Table {
  const spBy = new Map(d.sponsorships.map((s) => [s.participantId, s]));
  let ps = d.participants.filter((p) => (f.includeArchived || !p.archived) && (!f.category || p.category === f.category) && (!f.group || p.group === f.group));
  ps = ps.sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
  const pRow = (p: PrivateParticipant) => [p.fullName, p.displayName, p.category, p.age ?? '', p.group, p.clothingSize, p.shoeSize, p.giftSuggestion, p.published ? 'Sim' : 'Não', spBy.has(p.id) ? 'Apadrinhado' : 'Disponível'];
  const pHead = ['Nome completo', 'Nome de exibição', 'Categoria', 'Idade', 'Turma', 'Roupa', 'Calçado', 'Presente sugerido', 'Publicado', 'Situação'];
  const spHead = ['Protocolo', 'Participante', 'Turma', 'Padrinho', 'WhatsApp', 'Status', 'Confirmado em', 'Observações'];
  const pById = new Map(d.participants.map((p) => [p.id, p]));
  const spRow = (s: Sponsorship) => [s.protocol, pById.get(s.participantId)?.fullName ?? s.participantDisplayName, pById.get(s.participantId)?.group ?? '', s.sponsorName, formatStoredPhone(s.sponsorPhone), STATUS[s.status] ?? s.status, dt(s.createdAt), s.adminNotes ?? ''];
  const sps = d.sponsorships.filter((s) => ps.some((p) => p.id === s.participantId));
  const label = REPORTS.find((r) => r.key === key)!.label;
  switch (key) {
    case 'all': return { title: label, header: pHead, rows: ps.map(pRow) };
    case 'available': return { title: label, header: pHead, rows: ps.filter((p) => p.published && !spBy.has(p.id)).map(pRow) };
    case 'sponsored': return { title: label, header: spHead, rows: sps.map(spRow) };
    case 'giftsPending': return { title: label, header: spHead, rows: sps.filter((s) => s.status === 'confirmed' || s.status === 'contacted').map(spRow) };
    case 'giftsReceived': return { title: label, header: spHead, rows: sps.filter((s) => s.status === 'received').map(spRow) };
    case 'giftsDelivered': return { title: label, header: spHead, rows: sps.filter((s) => s.status === 'delivered').map(spRow) };
    case 'sponsors': {
      const g = new Map<string, { name: string; phone: string; list: string[]; protocols: string[] }>();
      for (const s of sps) {
        const e = g.get(s.sponsorPhone) ?? { name: s.sponsorName, phone: s.sponsorPhone, list: [], protocols: [] };
        e.list.push(pById.get(s.participantId)?.fullName ?? s.participantDisplayName); e.protocols.push(s.protocol); g.set(s.sponsorPhone, e);
      }
      return { title: label, header: ['Padrinho', 'WhatsApp', 'Qtd.', 'Participantes', 'Protocolos'], rows: [...g.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((e) => [e.name, formatStoredPhone(e.phone), e.list.length, e.list.join('; '), e.protocols.join('; ')]) };
    }
    case 'byGroup':
    case 'byCategory': {
      const field = key === 'byGroup' ? 'group' : 'category';
      const g = new Map<string, { total: number; sponsored: number }>();
      for (const p of ps) { const k = p[field] || '(sem informação)'; const e = g.get(k) ?? { total: 0, sponsored: 0 }; e.total++; if (spBy.has(p.id)) e.sponsored++; g.set(k, e); }
      return { title: label, header: [key === 'byGroup' ? 'Turma' : 'Categoria', 'Total', 'Apadrinhados', 'Disponíveis'], rows: [...g.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([k, e]) => [k, e.total, e.sponsored, e.total - e.sponsored]) };
    }
    case 'history': {
      const rows: (string | number)[][] = [
        ...d.sponsorships.map((s) => [dt(s.createdAt), 'Apadrinhamento ativo', s.protocol, s.participantDisplayName, s.sponsorName, STATUS[s.status]]),
        ...d.history.map((h) => [dt(h.cancelledAt ?? h.createdAt), 'Cancelado / liberado', h.protocol, h.participantDisplayName, h.sponsorName, h.cancelReason ?? '']),
        ...d.contributions.map((c) => [c.receivedOn, 'Contribuição Pix (registro manual)', '', '', c.contributorName ?? '', (c.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]),
      ];
      return { title: label, header: ['Data', 'Evento', 'Protocolo', 'Participante', 'Pessoa', 'Detalhe'], rows };
    }
  }
}

export function reportMeta(c: Campaign, t: Table) {
  return [`${t.title}`, `Campanha: ${c.name} (${c.year})`, `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`];
}

export function toCsv(c: Campaign, t: Table): string {
  const esc = (v: unknown) => { const s = String(sanitizeCell(v)); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [...reportMeta(c, t).map((m) => esc(m)), '', t.header.map(esc).join(';'), ...t.rows.map((r) => r.map(esc).join(';'))];
  return '﻿' + lines.join('\r\n');
}

export async function toXlsx(c: Campaign, t: Table): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Apadrinhamento MK';
  const ws = wb.addWorksheet(t.title.slice(0, 31));
  for (const m of reportMeta(c, t)) ws.addRow([sanitizeCell(m)]);
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.addRow([]);
  const h = ws.addRow(t.header);
  h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70252B' } }; });
  for (const r of t.rows) ws.addRow(r.map((v) => sanitizeCell(v)));
  ws.columns.forEach((col) => { col.width = 22; });
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function toPrintHtml(c: Campaign, t: Table): string {
  const meta = reportMeta(c, t);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(meta[0])}</title><meta name="robots" content="noindex">
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#242424}h1{font-size:20px;color:#70252B;margin:0}p{margin:2px 0;color:#555;font-size:12px}table{border-collapse:collapse;width:100%;margin-top:16px;font-size:11px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#F2ECDF}</style></head>
<body><h1>${escapeHtml(meta[0])}</h1><p>${escapeHtml(meta[1])}</p><p>${escapeHtml(meta[2])}</p>
<table><thead><tr>${t.header.map((x) => `<th>${escapeHtml(x)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((x) => `<td>${escapeHtml(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileSlug = (c: Campaign, t: Table) => `mk-${c.year}-${t.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
