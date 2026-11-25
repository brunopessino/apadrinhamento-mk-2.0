import { useMemo } from 'react';
import { useAdmin } from './AdminContext';
import { PageHead, fmtDate, STATUS_LABEL } from './ui';

function Bars({ title, data }: { title: string; data: [string, number, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <section className="card-surface p-5" aria-labelledby={`b-${title}`}>
      <h2 id={`b-${title}`} className="font-sans text-base font-bold">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {data.map(([k, total, sp]) => (
          <li key={k}>
            <div className="flex justify-between text-sm"><span>{k}</span><span className="text-muted">{sp}/{total} apadrinhados</span></div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cream-200" aria-hidden="true">
              <div className="h-full bg-gold/60" style={{ width: `${(total / max) * 100}%` }}><div className="h-full bg-pine" style={{ width: `${total ? (sp / total) * 100 : 0}%` }} /></div>
            </div>
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-muted">Sem dados.</li>}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const { participants, sponsorships, campaign, loading } = useAdmin();
  const m = useMemo(() => {
    const active = participants.filter((p) => !p.archived);
    const published = active.filter((p) => p.published);
    const spIds = new Set(sponsorships.map((s) => s.participantId));
    const group = (key: 'category' | 'group') => {
      const g = new Map<string, [number, number]>();
      for (const p of active) { const k = p[key] || '(sem informação)'; const e = g.get(k) ?? [0, 0]; e[0]++; if (spIds.has(p.id)) e[1]++; g.set(k, e); }
      return [...g.entries()].sort((a, b) => b[1][0] - a[1][0]).map(([k, [t, s]]) => [k, t, s] as [string, number, number]);
    };
    const sponsoredPublished = published.filter((p) => spIds.has(p.id)).length;
    return {
      total: active.length, published: published.length, available: published.length - sponsoredPublished, sponsored: sponsorships.length,
      percent: published.length ? Math.round((sponsoredPublished / published.length) * 100) : 0,
      received: sponsorships.filter((s) => s.status === 'received' || s.status === 'delivered').length,
      pending: sponsorships.filter((s) => s.status === 'confirmed' || s.status === 'contacted').length,
      drafts: active.filter((p) => !p.published).length, byCat: group('category'), byGroup: group('group'),
    };
  }, [participants, sponsorships]);
  const tiles = [
    ['Total de participantes', m.total], ['Publicados', m.published], ['Disponíveis', m.available], ['Apadrinhamentos', m.sponsored],
    ['Conclusão', `${m.percent}%`], ['Presentes recebidos', m.received], ['Presentes pendentes', m.pending], ['Rascunhos (não publicados)', m.drafts],
  ] as const;
  return (
    <>
      <PageHead title="Painel" desc={campaign ? `${campaign.name} · ${({ draft: 'rascunho', active: 'aberta', closed: 'encerrada', archived: 'arquivada' } as const)[campaign.status]}` : undefined} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy={loading}>
        {tiles.map(([l, v]) => (
          <div key={l} className="card-surface p-4"><p className="font-display text-3xl font-semibold text-burgundy" data-testid={`dash-${l}`}>{loading ? '—' : v}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{l}</p></div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Bars title="Distribuição por categoria" data={m.byCat} />
        <Bars title="Distribuição por turma" data={m.byGroup} />
      </div>
      <section className="card-surface mt-5 p-5" aria-labelledby="recent">
        <h2 id="recent" className="font-sans text-base font-bold">Registros recentes</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {sponsorships.slice(0, 8).map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2"><span><strong>{s.participantDisplayName}</strong> · {s.sponsorName}</span><span className="text-muted">{STATUS_LABEL[s.status]} · {fmtDate(s.createdAt)} · <span className="font-mono">{s.protocol}</span></span></li>
          ))}
          {sponsorships.length === 0 && <li className="py-2 text-muted">Nenhum apadrinhamento ainda.</li>}
        </ul>
      </section>
    </>
  );
}
