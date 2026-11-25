import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Star } from 'lucide-react';
import type { Campaign } from '@/types';
import { useAdmin, useAction, Feedback } from './AdminContext';
import { PageHead, TableWrap, fmtDate } from './ui';
import { Dialog } from '@/components/ui/Dialog';
import { CAMPAIGN_TEXTS, DEFAULT_PIX, FALLBACK_CATEGORIES, PIX_INTRO, pixKeyLine } from '@/config/campaign';

const STATUS: Record<Campaign['status'], string> = { draft: 'Rascunho', active: 'Aberta', closed: 'Encerrada (somente leitura pública)', archived: 'Arquivada (histórico)' };

export function newCampaign(year: number): Campaign {
  return {
    id: String(year), year, name: `Apadrinhamento de Natal ${year}`, status: 'draft', heroTitle: `Apadrinhamento de Natal ${year}`,
    heroMessage: CAMPAIGN_TEXTS.mainMessage, institutionalMessage: CAMPAIGN_TEXTS.institutionalMessage, guidelines: [...CAMPAIGN_TEXTS.guidelines],
    deliveryInfo: '', pix: { ...DEFAULT_PIX }, eligibleCategories: [...FALLBACK_CATEGORIES],
  };
}

function Editor({ initial, isNew, onClose }: { initial: Campaign; isNew: boolean; onClose: () => void }) {
  const { service, actor, campaigns } = useAdmin();
  const [c, setC] = useState(initial);
  const [guides, setGuides] = useState(initial.guidelines.join('\n'));
  const { busy, msg, run, setMsg } = useAction();
  const set = (p: Partial<Campaign>) => setC((v) => ({ ...v, ...p }));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (isNew && campaigns.some((x) => x.id === c.id)) { setMsg({ type: 'error', text: 'Já existe uma campanha com esse ano/identificador.' }); return; }
    const data: Campaign = { ...c, id: isNew ? String(c.year) : c.id, guidelines: guides.split('\n').map((s) => s.trim()).filter(Boolean) };
    if (await run(() => service.admin.saveCampaign(data, actor))) onClose();
  }
  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label><span className="label">Ano</span><input type="number" min={2024} max={2100} required disabled={!isNew} className="field" value={c.year} onChange={(e) => set({ year: Number(e.target.value), name: `Apadrinhamento de Natal ${e.target.value}`, heroTitle: `Apadrinhamento de Natal ${e.target.value}` })} /></label>
      <label><span className="label">Status</span><select className="field" value={c.status} onChange={(e) => set({ status: e.target.value as Campaign['status'] })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="sm:col-span-2"><span className="label">Nome</span><input required className="field" value={c.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="sm:col-span-2"><span className="label">Título principal</span><input required className="field" value={c.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} /></label>
      <label className="sm:col-span-2"><span className="label">Mensagem principal</span><input required className="field" value={c.heroMessage} onChange={(e) => set({ heroMessage: e.target.value })} /></label>
      <label className="sm:col-span-2"><span className="label">Mensagem institucional</span><textarea className="field min-h-24" value={c.institutionalMessage} onChange={(e) => set({ institutionalMessage: e.target.value })} /></label>
      <label className="sm:col-span-2"><span className="label">Orientações (uma por linha)</span><textarea className="field min-h-24" value={guides} onChange={(e) => setGuides(e.target.value)} /></label>
      <label><span className="label">Início</span><input type="date" className="field" value={c.startsAt ?? ''} onChange={(e) => set({ startsAt: e.target.value || undefined })} /></label>
      <label><span className="label">Encerramento</span><input type="date" className="field" value={c.endsAt ?? ''} onChange={(e) => set({ endsAt: e.target.value || undefined })} /></label>
      <label className="sm:col-span-2"><span className="label">Informações de entrega dos presentes</span><textarea className="field min-h-20" placeholder="Ex.: data, horário e local definidos pela organização" value={c.deliveryInfo ?? ''} onChange={(e) => set({ deliveryInfo: e.target.value })} />
        <span className="mt-1 block text-xs text-muted">Vazio = o site informa que a organização divulgará os detalhes.</span></label>
      <label><span className="label">E-mail de contato (opcional)</span><input type="email" className="field" value={c.contactEmail ?? ''} onChange={(e) => set({ contactEmail: e.target.value || undefined })} /></label>
      <label><span className="label">Telefone de contato (opcional)</span><input className="field" value={c.contactPhone ?? ''} onChange={(e) => set({ contactPhone: e.target.value || undefined })} /></label>
      <fieldset className="rounded-2xl border border-gold/50 p-4 sm:col-span-2">
        <legend className="px-1 text-sm font-semibold">Pix (exibido em todos os cards)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Chave Pix</span><input required className="field font-mono" value={c.pix.key} onChange={(e) => set({ pix: { ...c.pix, key: e.target.value } })} /></label>
          <label><span className="label">Favorecida</span><input required className="field" value={c.pix.beneficiary} onChange={(e) => set({ pix: { ...c.pix, beneficiary: e.target.value } })} /></label>
        </div>
        <p className="mt-3 rounded-xl bg-cream p-3 text-sm">Pré-visualização: {PIX_INTRO}<br /><strong>{pixKeyLine(c.pix)}</strong></p>
        <p className="mt-2 text-xs text-muted">Confirme com a organização a autorização para divulgação pública da chave e do nome da favorecida antes de publicar.</p>
      </fieldset>
      <div className="sm:col-span-2"><Feedback msg={msg} /></div>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy}>Salvar campanha</button></div>
    </form>
  );
}

export default function Campaigns() {
  const { campaigns, activeCampaignId, service, actor } = useAdmin();
  const [edit, setEdit] = useState<{ c: Campaign; isNew: boolean } | null>(null);
  const { busy, msg, run } = useAction();
  return (
    <>
      <PageHead title="Campanhas" desc="Cada edição é isolada: participantes, apadrinhamentos e relatórios pertencem a uma única campanha. Campanhas arquivadas permanecem como histórico administrativo e não aparecem no site."
        actions={<button className="btn-primary" onClick={() => setEdit({ c: newCampaign(new Date().getFullYear() + (campaigns.some((c) => c.year === new Date().getFullYear()) ? 1 : 0)), isNew: true })}><Plus className="h-4 w-4" aria-hidden="true" />Nova campanha</button>} />
      <Feedback msg={msg} />
      <TableWrap label="Campanhas">
        <thead><tr><th>Campanha</th><th>Status</th><th>Período</th><th>Atualizada</th><th className="text-right">Ações</th></tr></thead>
        <tbody>{campaigns.map((c) => (
          <tr key={c.id}>
            <td className="font-semibold">{c.name}{c.id === activeCampaignId && <span className="chip ml-2 border-pine/30 text-pine"><Star className="h-3 w-3" />Ativa no site</span>}</td>
            <td>{STATUS[c.status]}</td><td className="text-xs">{c.startsAt ?? '—'} a {c.endsAt ?? '—'}</td><td className="text-xs">{fmtDate(c.updatedAt ?? c.createdAt)}</td>
            <td><div className="flex justify-end gap-1">
              <button className="btn-ghost btn-sm" onClick={() => setEdit({ c, isNew: false })}><Pencil className="h-4 w-4" aria-hidden="true" />Editar</button>
              {c.id !== activeCampaignId && c.status !== 'archived' && <button className="btn-pine btn-sm" disabled={busy} onClick={() => confirm(`Definir ${c.name} como campanha exibida no site?`) && run(() => service.admin.setActiveCampaign(c.id, actor), 'Campanha ativa atualizada.')}>Definir como ativa</button>}
            </div></td>
          </tr>))}</tbody>
      </TableWrap>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? 'Nova campanha' : 'Editar campanha'} wide>{edit && <Editor initial={edit.c} isNew={edit.isNew} onClose={() => setEdit(null)} />}</Dialog>
    </>
  );
}
