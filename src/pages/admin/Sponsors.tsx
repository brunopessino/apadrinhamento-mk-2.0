import { useMemo, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { useAdmin } from './AdminContext';
import { PageHead, TableWrap, Empty, fmtDate, STATUS_LABEL } from './ui';
import { formatStoredPhone, whatsappLink } from '@/lib/phone';
import { norm } from '@/lib/text';

export default function Sponsors() {
  const { sponsorships } = useAdmin();
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const g = new Map<string, { name: string; phone: string; items: typeof sponsorships }>();
    for (const s of sponsorships) { const e = g.get(s.sponsorPhone) ?? { name: s.sponsorName, phone: s.sponsorPhone, items: [] }; e.items.push(s); g.set(s.sponsorPhone, e); }
    return [...g.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [sponsorships]);
  const list = groups.filter((g) => !q || norm(`${g.name} ${g.phone}`).includes(norm(q)));
  return (
    <>
      <PageHead title="Padrinhos" desc="Agrupados pelo WhatsApp informado. Uma mesma pessoa pode apadrinhar mais de um participante." />
      <label className="relative mb-4 block max-w-md"><span className="sr-only">Pesquisar</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input className="field pl-9" placeholder="Nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {list.length === 0 ? <Empty>Nenhum padrinho registrado.</Empty> : (
        <TableWrap label="Padrinhos">
          <thead><tr><th>Nome</th><th>WhatsApp</th><th>Apadrinhados</th><th>Contato</th></tr></thead>
          <tbody>{list.map((g) => (
            <tr key={g.phone}>
              <td className="font-semibold">{g.name}</td><td>{formatStoredPhone(g.phone)}</td>
              <td><ul className="space-y-1">{g.items.map((s) => <li key={s.id} className="text-xs"><strong>{s.participantDisplayName}</strong> · <span className="font-mono">{s.protocol}</span> · {STATUS_LABEL[s.status]} · {fmtDate(s.createdAt)}{s.adminNotes ? ` · “${s.adminNotes}”` : ''}</li>)}</ul></td>
              <td><a className="btn-ghost btn-sm" href={whatsappLink(g.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp</a></td>
            </tr>))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
