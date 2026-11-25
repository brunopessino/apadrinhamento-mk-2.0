import { useMemo, useState } from 'react';
import { MessageCircle, Search, Undo2, StickyNote } from 'lucide-react';
import type { Sponsorship, SponsorshipStatus } from '@/types';
import { useAdmin, useAction, Feedback } from './AdminContext';
import { PageHead, TableWrap, Empty, fmtDate, STATUS_CLASS, STATUS_LABEL } from './ui';
import { Dialog } from '@/components/ui/Dialog';
import { can } from '@/lib/permissions';
import { formatStoredPhone, whatsappLink } from '@/lib/phone';
import { norm } from '@/lib/text';

const NEXT: SponsorshipStatus[] = ['confirmed', 'contacted', 'received', 'delivered'];

function CancelForm({ s, onClose }: { s: Sponsorship; onClose: () => void }) {
  const { service, actor, campaignId } = useAdmin();
  const [reason, setReason] = useState('');
  const { busy, msg, run } = useAction();
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => service.admin.cancelSponsorship(campaignId!, s.participantId, reason, actor))) onClose(); }}>
      <p className="text-sm">O apadrinhamento <strong className="font-mono">{s.protocol}</strong> de <strong>{s.participantDisplayName}</strong> será cancelado, movido para o histórico e o participante voltará a ficar <strong>disponível</strong> no catálogo.</p>
      <label className="block"><span className="label">Justificativa (obrigatória)</span><textarea required minLength={3} maxLength={500} className="field min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <Feedback msg={msg} />
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Voltar</button><button className="btn-danger" disabled={busy || reason.trim().length < 3}><Undo2 className="h-4 w-4" aria-hidden="true" />Cancelar e liberar</button></div>
    </form>
  );
}

function NotesForm({ s, onClose }: { s: Sponsorship; onClose: () => void }) {
  const { service, actor, campaignId } = useAdmin();
  const [notes, setNotes] = useState(s.adminNotes ?? '');
  const { busy, msg, run } = useAction();
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => service.admin.updateSponsorship(campaignId!, s.participantId, { adminNotes: notes }, actor))) onClose(); }}>
      <label className="block"><span className="label">Observações administrativas</span><textarea className="field min-h-28" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <Feedback msg={msg} />
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy}>Salvar</button></div>
    </form>
  );
}

export default function Sponsorships() {
  const { sponsorships, history, participants, actor, service, campaignId, campaign } = useAdmin();
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [cancel, setCancel] = useState<Sponsorship | null>(null);
  const [notes, setNotes] = useState<Sponsorship | null>(null);
  const { msg, run, busy } = useAction();
  const pById = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const list = sponsorships.filter((s) => (!st || s.status === st) && (!q || norm(`${s.protocol} ${s.sponsorName} ${s.participantDisplayName} ${pById.get(s.participantId)?.fullName ?? ''}`).includes(norm(q))));
  return (
    <>
      <PageHead title="Apadrinhamentos" desc="Acompanhe cada apadrinhamento: contato, recebimento e entrega do presente. Mensagens pelo WhatsApp são iniciadas individualmente; não há disparo automático." />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative"><span className="sr-only">Pesquisar</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input className="field pl-9" placeholder="Protocolo, padrinho ou participante" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label><span className="sr-only">Status</span><select className="field" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Todos os status</option>{NEXT.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
      </div>
      <Feedback msg={msg} />
      {list.length === 0 ? <Empty>Nenhum apadrinhamento encontrado.</Empty> : (
        <TableWrap label="Apadrinhamentos">
          <thead><tr><th>Protocolo</th><th>Participante</th><th>Padrinho</th><th>Data</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} data-testid="sponsorship-row">
                <td className="font-mono text-xs font-semibold">{s.protocol}</td>
                <td><p className="font-semibold">{pById.get(s.participantId)?.fullName ?? s.participantDisplayName}</p><p className="text-xs text-muted">{pById.get(s.participantId)?.group}</p></td>
                <td>{s.sponsorName}<br /><span className="text-xs text-muted">{formatStoredPhone(s.sponsorPhone)}</span>{s.adminNotes && <p className="mt-1 text-xs italic text-muted">“{s.adminNotes}”</p>}</td>
                <td className="text-xs">{fmtDate(s.createdAt)}</td>
                <td>
                  <label className="sr-only" htmlFor={`st-${s.id}`}>Status de {s.protocol}</label>
                  <select id={`st-${s.id}`} className={`rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold ${STATUS_CLASS[s.status]}`} value={s.status} disabled={busy || !can.advanceSponsorship(actor.role)}
                    onChange={(e) => run(() => service.admin.updateSponsorship(campaignId!, s.participantId, { status: e.target.value as SponsorshipStatus }, actor), 'Status atualizado.')}>
                    {NEXT.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}
                  </select>
                </td>
                <td><div className="flex justify-end gap-1">
                  <a className="btn-ghost btn-sm" href={whatsappLink(s.sponsorPhone, `Olá, ${s.sponsorName.split(' ')[0]}! Aqui é da organização do ${campaign?.name ?? 'Apadrinhamento de Natal'} do Meu Kantinho. Obrigado por apadrinhar ${s.participantDisplayName} (protocolo ${s.protocol}).`)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir conversa no WhatsApp com ${s.sponsorName}`}><MessageCircle className="h-4 w-4" /></a>
                  <button className="btn-ghost btn-sm" aria-label="Observações" onClick={() => setNotes(s)}><StickyNote className="h-4 w-4" /></button>
                  {can.cancelSponsorship(actor.role) && <button className="btn-danger btn-sm" onClick={() => setCancel(s)}><Undo2 className="h-4 w-4" aria-hidden="true" />Cancelar</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <h2 className="mb-3 mt-8 font-sans text-lg font-bold">Cancelados / liberados</h2>
      {history.length === 0 ? <Empty>Nenhum cancelamento registrado.</Empty> : (
        <TableWrap label="Histórico de cancelamentos">
          <thead><tr><th>Protocolo</th><th>Participante</th><th>Padrinho</th><th>Cancelado em</th><th>Por</th><th>Justificativa</th></tr></thead>
          <tbody>{history.map((h) => <tr key={h.id}><td className="font-mono text-xs">{h.protocol}</td><td>{h.participantDisplayName}</td><td>{h.sponsorName}</td><td className="text-xs">{fmtDate(h.cancelledAt)}</td><td className="text-xs">{h.cancelledBy}</td><td className="text-xs">{h.cancelReason}</td></tr>)}</tbody>
        </TableWrap>
      )}
      <Dialog open={!!cancel} onClose={() => setCancel(null)} title="Cancelar apadrinhamento">{cancel && <CancelForm s={cancel} onClose={() => setCancel(null)} />}</Dialog>
      <Dialog open={!!notes} onClose={() => setNotes(null)} title="Observações">{notes && <NotesForm s={notes} onClose={() => setNotes(null)} />}</Dialog>
    </>
  );
}
