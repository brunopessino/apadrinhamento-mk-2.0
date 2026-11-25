import { useMemo, useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, Camera, Eye, EyeOff, History, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { ParticipantInput, PrivateParticipant } from '@/types';
import { useAdmin, useAction, Feedback } from './AdminContext';
import { PageHead, TableWrap, Empty, fmtDate } from './ui';
import { Dialog } from '@/components/ui/Dialog';
import { can } from '@/lib/permissions';
import { dedupeKeyOf, displayNameFrom, norm, parseAge } from '@/lib/text';
import { distinct } from '@/lib/filters';
import { FALLBACK_CATEGORIES } from '@/config/campaign';
import { processPhoto, validatePhotoFile } from '@/services/photos';

const blank = (): ParticipantInput => ({
  fullName: '', displayName: '', category: 'Aluno', age: null, ageRaw: '', group: '', clothingSize: '', shoeSize: '', giftSuggestion: '',
  publicationAuthorized: false, published: false, archived: false, dedupeKey: '', notes: '',
});

function Editor({ initial, onClose }: { initial: ParticipantInput; onClose: () => void }) {
  const { service, actor, campaignId, participants } = useAdmin();
  const [p, setP] = useState<ParticipantInput>(initial);
  const [autoName, setAutoName] = useState(!initial.id);
  const { busy, msg, run } = useAction();
  const categories = distinct([...FALLBACK_CATEGORIES, ...participants.map((x) => x.category)]);
  const groups = distinct(participants.map((x) => x.group));
  const set = (patch: Partial<ParticipantInput>) => setP((v) => ({ ...v, ...patch }));
  const lockedPublished = !!initial.published && !can.editPublishedParticipants(actor.role);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    const age = parseAge(p.ageRaw);
    const input: ParticipantInput = { ...p, fullName: p.fullName.trim(), displayName: (p.displayName || displayNameFrom(p.fullName)).trim(), age, dedupeKey: dedupeKeyOf(p.fullName, age, p.group) };
    if (!input.fullName || !input.displayName) return;
    const dup = participants.find((x) => x.dedupeKey === input.dedupeKey && x.id !== input.id);
    if (dup && !confirm(`Possível duplicidade com "${dup.fullName}". Salvar mesmo assim?`)) return;
    const ok = await run(() => service.admin.saveParticipant(campaignId, input, actor));
    if (ok) onClose();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {lockedPublished && <p className="rounded-xl bg-yellow/20 px-3 py-2 text-sm">Participante publicado: apenas administradores podem editar.</p>}
      <fieldset disabled={busy || lockedPublished} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">Nome completo (privado)</span>
          <input required className="field" maxLength={120} value={p.fullName} onChange={(e) => set({ fullName: e.target.value, ...(autoName ? { displayName: displayNameFrom(e.target.value) } : {}) })} /></label>
        <label className="sm:col-span-2"><span className="label">Nome de exibição (público)</span>
          <input required className="field" maxLength={60} value={p.displayName} onChange={(e) => { setAutoName(false); set({ displayName: e.target.value }); }} />
          <span className="mt-1 block text-xs text-muted">Padrão: primeiro nome + inicial do sobrenome, para minimizar a exposição.</span></label>
        <label><span className="label">Categoria</span>
          <input list="cat-list" required className="field" value={p.category} onChange={(e) => set({ category: e.target.value })} />
          <datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label><span className="label">Idade</span><input className="field" inputMode="numeric" value={p.ageRaw} onChange={(e) => set({ ageRaw: e.target.value })} /></label>
        <label><span className="label">Turma</span>
          <input list="grp-list" className="field" value={p.group} onChange={(e) => set({ group: e.target.value })} />
          <datalist id="grp-list">{groups.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label><span className="label">Tamanho de roupa</span><input className="field" maxLength={40} value={p.clothingSize} onChange={(e) => set({ clothingSize: e.target.value })} /></label>
        <label><span className="label">Tamanho de calçado</span><input className="field" maxLength={40} value={p.shoeSize} onChange={(e) => set({ shoeSize: e.target.value })} /></label>
        <label><span className="label">Presente sugerido (opcional)</span><input className="field" maxLength={200} value={p.giftSuggestion} onChange={(e) => set({ giftSuggestion: e.target.value })} /></label>
        <label className="sm:col-span-2"><span className="label">Observações internas</span><textarea className="field min-h-20" maxLength={1000} value={p.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></label>
        <label className="flex items-start gap-3 sm:col-span-2">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-pine" checked={p.publicationAuthorized} onChange={(e) => set({ publicationAuthorized: e.target.checked, ...(e.target.checked ? {} : { published: false }) })} />
          <span className="text-sm">Autorização de exposição registrada (participante ou responsável legal autorizou a publicação de nome de exibição, dados e fotografia).</span>
        </label>
      </fieldset>
      <Feedback msg={msg} />
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy || lockedPublished}>Salvar</button></div>
    </form>
  );
}

function PhotoManager({ p, onClose }: { p: PrivateParticipant; onClose: () => void }) {
  const { service, actor, campaignId } = useAdmin();
  const { busy, msg, run, setMsg } = useAction();
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof processPhoto>> | null>(null);
  const current = p.photoUrl || p.photoData;
  async function pick(f: File | undefined) {
    if (!f) return;
    const err = validatePhotoFile(f);
    if (err) { setMsg({ type: 'error', text: err }); return; }
    await run(async () => { const r = await processPhoto(f); setPayload(r); setPreview(r.thumbDataUrl); });
  }
  return (
    <div className="space-y-4">
      {p.photoSource && <p className="break-all rounded-xl bg-cream-200 p-3 text-xs">Origem informada no formulário: {p.photoSource}<br /><span className="text-muted">Links do Google Drive não são tornados públicos. Baixe o arquivo com sua conta autorizada e envie aqui.</span></p>}
      <div className="flex gap-4">
        <div className="aspect-[4/5] w-32 overflow-hidden rounded-xl bg-cream-200">{(preview || current) ? <img src={preview || current} alt="Pré-visualização" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xs text-muted">Sem foto</span>}</div>
        <div className="flex-1 text-sm text-muted">
          <p>A imagem é redimensionada, comprimida e tem os metadados (EXIF/GPS) removidos no próprio navegador antes do envio.</p>
          {!p.publicationAuthorized && <p className="mt-2 font-medium text-red">Sem autorização de exposição: a foto ficará apenas na área privada.</p>}
        </div>
      </div>
      <label className="btn-ghost cursor-pointer"><Camera className="h-4 w-4" aria-hidden="true" />Escolher imagem
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>
      <Feedback msg={msg} />
      <div className="flex flex-wrap justify-end gap-2">
        {current && <button type="button" className="btn-danger" disabled={busy} onClick={async () => { if (await run(() => service.admin.setPhoto(campaignId!, p.id, null, actor))) onClose(); }}><Trash2 className="h-4 w-4" aria-hidden="true" />Remover foto</button>}
        <button type="button" className="btn-primary" disabled={busy || !payload} onClick={async () => { if (payload && await run(() => service.admin.setPhoto(campaignId!, p.id, payload, actor))) onClose(); }}>Salvar foto</button>
      </div>
    </div>
  );
}

function HistoryView({ p }: { p: PrivateParticipant }) {
  const { audit, actor } = useAdmin();
  if (!can.viewAudit(actor.role)) return <p className="text-sm text-muted">Histórico disponível para administradores.</p>;
  const items = audit.filter((a) => a.targetId === p.id);
  return (
    <ul className="divide-y divide-line text-sm">
      <li className="py-2 text-muted">Cadastrado em {fmtDate(p.createdAt)}{p.importJobId ? ' (importação)' : ''} · atualizado em {fmtDate(p.updatedAt)}</li>
      {items.map((a) => <li key={a.id} className="py-2"><span className="text-muted">{fmtDate(a.createdAt)} · {a.actorEmail}</span><br />{a.summary}</li>)}
      {items.length === 0 && <li className="py-2 text-muted">Nenhuma alteração registrada.</li>}
    </ul>
  );
}

export default function Participants() {
  const { participants, sponsorships, actor, service, campaignId } = useAdmin();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState<ParticipantInput | null>(null);
  const [photoFor, setPhotoFor] = useState<PrivateParticipant | null>(null);
  const [historyFor, setHistoryFor] = useState<PrivateParticipant | null>(null);
  const { msg, run, busy } = useAction();
  const sp = useMemo(() => new Set(sponsorships.map((s) => s.participantId)), [sponsorships]);
  const cats = distinct(participants.map((p) => p.category));
  const list = useMemo(() => participants
    .filter((p) => (status === 'archived' ? p.archived : !p.archived))
    .filter((p) => status !== 'draft' || !p.published).filter((p) => status !== 'published' || p.published)
    .filter((p) => !cat || p.category === cat)
    .filter((p) => !q || norm(`${p.fullName} ${p.displayName} ${p.group}`).includes(norm(q)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR')), [participants, status, cat, q]);
  const isAdmin = can.publishParticipants(actor.role);

  return (
    <>
      <PageHead title="Participantes" desc="Cadastros privados da campanha. Somente participantes com autorização de exposição podem ser publicados no catálogo."
        actions={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" aria-hidden="true" />Cadastrar</button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative"><span className="sr-only">Pesquisar</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input className="field pl-9" placeholder="Pesquisar por nome ou turma" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label><span className="sr-only">Situação</span><select className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Ativos</option><option value="published">Publicados</option><option value="draft">Não publicados</option><option value="archived">Arquivados</option></select></label>
        <label><span className="sr-only">Categoria</span><select className="field" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <Feedback msg={msg} />
      {list.length === 0 ? <Empty>Nenhum participante neste filtro.</Empty> : (
        <TableWrap label="Lista de participantes">
          <thead><tr><th>Participante</th><th>Categoria / turma</th><th>Medidas</th><th>Autorização</th><th>Situação</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} data-testid="admin-participant-row">
                <td><div className="flex items-center gap-3"><div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-cream-200">{(p.photoUrl || p.photoData) && <img src={p.photoUrl || p.photoData} alt="" className="h-full w-full object-cover" loading="lazy" />}</div><div><p className="font-semibold">{p.fullName}</p><p className="text-xs text-muted">Público: {p.displayName}{p.age != null ? ` · ${p.age} anos` : ''}</p></div></div></td>
                <td>{p.category}<br /><span className="text-xs text-muted">{p.group || '—'}</span></td>
                <td className="text-xs">Roupa {p.clothingSize || '—'}<br />Calçado {p.shoeSize || '—'}</td>
                <td>{p.publicationAuthorized ? <span className="chip border-pine/30 text-pine">Autorizada</span> : <span className="chip text-red">Pendente</span>}</td>
                <td>{p.archived ? 'Arquivado' : p.published ? <span className="font-semibold text-pine">Publicado</span> : 'Rascunho'}{sp.has(p.id) && <><br /><span className="text-xs font-semibold text-burgundy">Apadrinhado</span></>}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost btn-sm" aria-label={`Editar ${p.fullName}`} onClick={() => setEditing({ ...p, notes: p.notes ?? '' })}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-ghost btn-sm" aria-label={`Foto de ${p.fullName}`} onClick={() => setPhotoFor(p)} disabled={p.published && !isAdmin}><Camera className="h-4 w-4" /></button>
                    <button className="btn-ghost btn-sm" aria-label={`Histórico de ${p.fullName}`} onClick={() => setHistoryFor(p)}><History className="h-4 w-4" /></button>
                    {isAdmin && !p.archived && (p.published
                      ? <button className="btn-ghost btn-sm" disabled={busy} onClick={() => run(() => service.admin.setPublished(campaignId!, p.id, false, actor), `${p.displayName} despublicado.`)}><EyeOff className="h-4 w-4" aria-hidden="true" />Despublicar</button>
                      : <button className="btn-pine btn-sm" disabled={busy || !p.publicationAuthorized} title={p.publicationAuthorized ? undefined : 'Registre a autorização antes'} onClick={() => run(() => service.admin.setPublished(campaignId!, p.id, true, actor), `${p.displayName} publicado.`)}><Eye className="h-4 w-4" aria-hidden="true" />Publicar</button>)}
                    {isAdmin && <button className="btn-ghost btn-sm" aria-label={p.archived ? `Restaurar ${p.fullName}` : `Arquivar ${p.fullName}`} disabled={busy}
                      onClick={() => { if (p.archived || confirm(`Arquivar ${p.fullName}? O registro será preservado e removido do catálogo.`)) run(() => service.admin.setArchived(campaignId!, p.id, !p.archived, actor)); }}>
                      {p.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar participante' : 'Cadastrar participante'} wide>{editing && <Editor initial={editing} onClose={() => setEditing(null)} />}</Dialog>
      <Dialog open={!!photoFor} onClose={() => setPhotoFor(null)} title={`Fotografia — ${photoFor?.displayName ?? ''}`}>{photoFor && <PhotoManager p={photoFor} onClose={() => setPhotoFor(null)} />}</Dialog>
      <Dialog open={!!historyFor} onClose={() => setHistoryFor(null)} title={`Histórico — ${historyFor?.displayName ?? ''}`}>{historyFor && <HistoryView p={historyFor} />}</Dialog>
    </>
  );
}
