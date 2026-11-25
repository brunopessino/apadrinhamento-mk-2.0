import { useState } from 'react';
import { FileSpreadsheet, FileText, Printer, Lock } from 'lucide-react';
import { useAdmin, useAction, Feedback } from './AdminContext';
import { PageHead } from './ui';
import { REPORTS, buildReport, downloadBlob, fileSlug, toCsv, toPrintHtml, toXlsx, type ReportKey } from '@/services/exporter';
import { can } from '@/lib/permissions';
import { distinct } from '@/lib/filters';

export default function Reports() {
  const { actor, campaign, participants, sponsorships, history, contributions } = useAdmin();
  const [key, setKey] = useState<ReportKey>('all');
  const [category, setCategory] = useState('');
  const [group, setGroup] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const { busy, msg, run } = useAction();
  const allowed = REPORTS.filter((r) => !r.personal || can.exportPersonalData(actor.role));
  const def = REPORTS.find((r) => r.key === key)!;
  if (!campaign) return null;
  const table = () => buildReport(key, { campaign, participants, sponsorships, history, contributions }, { category: category || undefined, group: group || undefined, includeArchived });
  const preview = table();
  return (
    <>
      <PageHead title="Relatórios" desc="Exportação com identificação da campanha e data de geração. Células são protegidas contra injeção de fórmulas." />
      {!can.exportPersonalData(actor.role) && <p className="mb-4 flex items-center gap-2 rounded-xl bg-cream-200 px-4 py-2 text-sm"><Lock className="h-4 w-4" aria-hidden="true" />Relatórios com dados pessoais de padrinhos são restritos a administradores.</p>}
      <div className="card-surface grid gap-3 p-5 md:grid-cols-4">
        <label className="md:col-span-2"><span className="label">Relatório</span><select className="field" value={key} onChange={(e) => setKey(e.target.value as ReportKey)} data-testid="report-key">{allowed.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></label>
        <label><span className="label">Categoria</span><select className="field" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas</option>{distinct(participants.map((p) => p.category)).map((c) => <option key={c}>{c}</option>)}</select></label>
        <label><span className="label">Turma</span><select className="field" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Todas</option>{distinct(participants.map((p) => p.group)).map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm md:col-span-4"><input type="checkbox" className="h-4 w-4 accent-pine" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />Incluir participantes arquivados</label>
        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button className="btn-pine" disabled={busy} data-testid="export-xlsx" onClick={() => run(async () => { const t = table(); downloadBlob(await toXlsx(campaign, t), `${fileSlug(campaign, t)}.xlsx`); }, 'Arquivo Excel gerado.')}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" />Excel</button>
          <button className="btn-ghost" disabled={busy} data-testid="export-csv" onClick={() => run(async () => { const t = table(); downloadBlob(new Blob([toCsv(campaign, t)], { type: 'text/csv;charset=utf-8' }), `${fileSlug(campaign, t)}.csv`); }, 'Arquivo CSV gerado.')}><FileText className="h-4 w-4" aria-hidden="true" />CSV</button>
          <button className="btn-ghost" disabled={busy} onClick={() => { const w = window.open('', '_blank', 'noopener=no'); if (!w) return; w.document.write(toPrintHtml(campaign, table())); w.document.close(); w.focus(); w.print(); }}><Printer className="h-4 w-4" aria-hidden="true" />Imprimir</button>
        </div>
        <div className="md:col-span-4"><Feedback msg={msg} /></div>
      </div>
      <h2 className="mb-2 mt-6 font-sans text-base font-bold">Pré-visualização — {def.label} ({preview.rows.length} linhas)</h2>
      <div className="card-surface overflow-x-auto" tabIndex={0} role="region" aria-label="Pré-visualização do relatório">
        <table className="w-full min-w-[720px] text-left text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:bg-cream-200 [&_th]:px-3 [&_th]:py-2"><thead><tr>{preview.header.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{preview.rows.slice(0, 30).map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
      </div>
    </>
  );
}
