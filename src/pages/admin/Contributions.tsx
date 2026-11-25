import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAdmin, useAction, Feedback } from './AdminContext';
import { PageHead, TableWrap, Empty } from './ui';
import { can } from '@/lib/permissions';
import { pixKeyLine, DEFAULT_PIX } from '@/config/campaign';

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Contributions() {
  const { contributions, service, actor, campaignId, campaign } = useAdmin();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { busy, msg, run } = useAction();
  const total = contributions.reduce((s, c) => s + c.amountCents, 0);
  async function add(e: FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(amount.replace(/\./g, '').replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    if (await run(() => service.admin.addContribution(campaignId!, { amountCents: cents, contributorName: name.trim() || undefined, note: note.trim() || undefined, receivedOn: date }, actor), 'Contribuição registrada.')) { setAmount(''); setName(''); setNote(''); }
  }
  return (
    <>
      <PageHead title="Contribuições Pix" desc={`Registro MANUAL de contribuições efetivamente identificadas pela equipe no extrato. Não há integração bancária e as contribuições não são associadas a participantes. ${pixKeyLine(campaign?.pix ?? DEFAULT_PIX)}.`} />
      {can.registerContribution(actor.role) && (
        <form onSubmit={add} className="card-surface mb-5 grid gap-3 p-4 sm:grid-cols-[8rem_10rem_1fr_1fr_auto] sm:items-end">
          <label><span className="label">Valor (R$)</span><input required inputMode="decimal" className="field" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="50,00" /></label>
          <label><span className="label">Data</span><input required type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label><span className="label">Contribuinte (opcional)</span><input className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label><span className="label">Observação</span><input className="field" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className="btn-primary" disabled={busy}><Plus className="h-4 w-4" aria-hidden="true" />Registrar</button>
        </form>
      )}
      <Feedback msg={msg} />
      <p className="mb-3 text-sm">Total registrado: <strong>{brl(total)}</strong> em {contributions.length} registro(s).</p>
      {contributions.length === 0 ? <Empty>Nenhuma contribuição registrada.</Empty> : (
        <TableWrap label="Contribuições">
          <thead><tr><th>Data</th><th>Valor</th><th>Contribuinte</th><th>Observação</th><th>Registrado por</th><th /></tr></thead>
          <tbody>{contributions.map((c) => (
            <tr key={c.id}><td>{new Date(`${c.receivedOn}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="font-semibold">{brl(c.amountCents)}</td><td>{c.contributorName ?? '—'}</td><td>{c.note ?? ''}</td><td className="text-xs">{c.createdBy}</td>
              <td className="text-right">{can.deleteContribution(actor.role) && <button className="btn-ghost btn-sm" aria-label="Remover registro" disabled={busy} onClick={() => confirm('Remover este registro?') && run(() => service.admin.removeContribution(campaignId!, c.id, actor))}><Trash2 className="h-4 w-4" /></button>}</td></tr>))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
