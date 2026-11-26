import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Image as ImageIcon, Upload } from 'lucide-react';
import { useAdmin, useAction, Feedback } from './AdminContext';
import { PageHead, TableWrap, fmtDate } from './ui';
import { FIELDS, autoMap, buildRecords, collectPhotoFiles, matchPhotos, parseFile, yearMismatch, type Mapping, type ParsedSheet } from '@/services/importer';
import { processPhoto } from '@/services/photos';

export default function ImportPage() {
  const { campaigns, participants, importJobs, service, actor, campaignId: ctxCid } = useAdmin();
  const [target, setTarget] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [map, setMap] = useState<Mapping>({});
  const [ack, setAck] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [onlyTarget, setOnlyTarget] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const { busy, msg, run, setMsg } = useAction();
  const targetCampaign = campaigns.find((c) => c.id === target);
  const existingKeys = useMemo(() => new Set(target === ctxCid ? participants.map((p) => p.dedupeKey) : []), [participants, target, ctxCid]);
  const allYears = useMemo(() => (sheet ? buildRecords(sheet, map, new Set()).yearsFound : []), [sheet, map]);
  const canFilter = !!targetCampaign && allYears.includes(targetCampaign.year) && allYears.some((y) => y !== targetCampaign.year);
  const filterYear = canFilter && onlyTarget ? targetCampaign!.year : undefined;
  const result = useMemo(() => (sheet ? buildRecords(sheet, map, existingKeys, { onlyYear: filterYear }) : null), [sheet, map, existingKeys, filterYear]);
  const photoMatch = useMemo(() => (result && photos.length ? matchPhotos(result.records, photos.map((f) => f.name)) : new Map<number, number>()), [result, photos]);
  const mismatch = file && result && targetCampaign ? (filterYear ? null : yearMismatch(file.name, result.yearsFound, targetCampaign.year)) : null;
  const missingRequired = FIELDS.filter((f) => f.required && !map[f.key]);

  async function onFile(f: File | undefined) {
    setSheet(null); setSummary(null); setAck(false); setFile(f ?? null);
    if (!f) return;
    await run(async () => { const s = await parseFile(f); if (!s.rows.length) throw new Error('Nenhuma linha encontrada no arquivo.'); setSheet(s); setMap(autoMap(s.headers)); });
  }
  async function onPhotos(list: FileList | null) {
    setPhotos([]);
    if (!list?.length) return;
    await run(async () => { const fs = await collectPhotoFiles([...list]); if (!fs.length) throw new Error('Nenhuma foto (JPG, PNG, WEBP) encontrada.'); setPhotos(fs); });
  }
  async function confirmImport() {
    if (!result || !file || !targetCampaign) return;
    if (target !== ctxCid) { setMsg({ type: 'error', text: 'Selecione a mesma campanha no seletor do topo para verificar duplicidades antes de importar.' }); return; }
    const photoErrors: string[] = [];
    const ok = await run(async () => {
      const records = [];
      for (let i = 0; i < result.records.length; i++) {
        const r = { ...result.records[i] };
        const fi = photoMatch.get(i);
        if (fi != null) {
          setProgress(`Preparando fotos… ${i + 1}/${result.records.length}`);
          try { r.photoData = (await processPhoto(photos[fi])).thumbDataUrl; }
          catch (e) { photoErrors.push(`${r.fullName}: ${(e as Error).message}`); }
        }
        if (authorized) r.publicationAuthorized = true;
        records.push(r);
      }
      setProgress('Gravando…');
      const res = await service.admin.importParticipants(target, records, { fileName: file.name, total: sheet!.rows.length, skippedDuplicates: result.duplicates.length, invalid: result.issues.filter((i) => i.message.includes('ignorada')).length }, actor);
      const withPhoto = records.filter((r) => r.photoData).length;
      setSummary(`${res.created} participante(s) importado(s) em ${targetCampaign.name}, ${withPhoto} com foto. Eles ainda NÃO aparecem no site: vá em Participantes e clique em "Publicar todos os autorizados".${photoErrors.length ? ` Fotos com problema: ${photoErrors.join('; ')}.` : ''}`);
    });
    setProgress(null);
    if (ok) { setSheet(null); setFile(null); setPhotos([]); }
  }

  return (
    <>
      <PageHead title="Importação de planilha" desc="Importe as respostas do Google Forms exportadas do Google Planilhas (Arquivo › Fazer download › .xlsx ou .csv). Os registros entram sempre como não publicados, aguardando revisão e autorização de exposição." />
      <div className="card-surface grid gap-4 p-5 md:grid-cols-2">
        <label><span className="label">1. Campanha de destino (seleção obrigatória)</span>
          <select className="field" value={target} onChange={(e) => { setTarget(e.target.value); setAck(false); }} data-testid="import-target">
            <option value="">Selecione…</option>{campaigns.filter((c) => c.status !== 'archived').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label><span className="label">2. Arquivo (.xlsx ou .csv)</span>
          <span className="btn-ghost w-full cursor-pointer"><Upload className="h-4 w-4" aria-hidden="true" />{file ? file.name : 'Selecionar arquivo'}
            <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="import-file" /></span></label>
      </div>
      <div className="mt-3"><Feedback msg={msg} /></div>
      {summary && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-pine/10 px-4 py-3 font-medium text-pine"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{summary}</p>}

      {sheet && result && (
        <>
          <section className="card-surface mt-5 p-5" aria-labelledby="map-title">
            <h2 id="map-title" className="font-sans text-base font-bold">3. Mapeamento de colunas <span className="font-normal text-muted">({sheet.headers.length} colunas, {sheet.rows.length} linhas)</span></h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <label key={f.key}><span className="label">{f.label}{f.required && ' *'}</span>
                  <select className="field" value={map[f.key] ?? ''} onChange={(e) => setMap({ ...map, [f.key]: e.target.value || undefined })}>
                    <option value="">— não importar —</option>{sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select></label>
              ))}
            </div>
          </section>
          <section className="card-surface mt-5 space-y-4 p-5" aria-label="Filtro e fotos">
            {canFilter && (
              <label className="flex items-start gap-2 font-medium"><input type="checkbox" className="mt-1 h-4 w-4 accent-pine" checked={onlyTarget} onChange={(e) => setOnlyTarget(e.target.checked)} data-testid="import-only-year" />
                <span>Importar somente as respostas de {targetCampaign!.year}{result.otherYear > 0 && <span className="font-normal text-muted"> — {result.otherYear} resposta(s) de outros anos serão ignoradas</span>}</span></label>
            )}
            <div>
              <span className="label">Fotos (opcional): o .zip baixado do Google Drive ou as fotos soltas</span>
              <label className="btn-ghost cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onPhotos(e.dataTransfer.files); }}>
                <ImageIcon className="h-4 w-4" aria-hidden="true" />{photos.length ? `${photos.length} foto(s) carregada(s)` : 'Selecionar fotos ou .zip'}
                <input type="file" multiple accept=".zip,application/zip,application/x-zip-compressed,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => onPhotos(e.target.files)} data-testid="import-photos" /></label>
              <p className="mt-1 text-xs text-muted">Cada foto é ligada à pessoa pelo nome no arquivo (ex.: "Maria Souza.jpg" ou "IMG_1234 - Maria Souza.jpg").</p>
              {photos.length > 0 && <p className="mt-1 text-sm font-medium" data-testid="photo-match-count">{photoMatch.size} de {result.records.length} pessoas com foto encontrada.</p>}
            </div>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-pine" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} data-testid="import-authorized" />
              <span>Estas pessoas autorizaram a exibição do nome e da foto no site (marca todas como <strong>autorizadas</strong>; a publicação continua sendo um passo separado).</span></label>
          </section>
          <section className="mt-5 grid gap-4 md:grid-cols-3" aria-label="Validação">
            <div className="card-surface p-4"><p className="font-display text-3xl text-pine">{result.records.length}</p><p className="text-sm text-muted">registros válidos para criar</p></div>
            <div className="card-surface p-4"><p className="font-display text-3xl text-gold-ink">{result.duplicates.length}</p><p className="text-sm text-muted">possíveis duplicidades (ignoradas)</p></div>
            <div className="card-surface p-4"><p className="font-display text-3xl text-red">{result.issues.length}</p><p className="text-sm text-muted">inconsistências</p></div>
          </section>
          {(result.issues.length > 0 || result.duplicates.length > 0) && (
            <details className="card-surface mt-4 p-4" open={result.issues.length < 15}>
              <summary className="cursor-pointer font-semibold">Relatório de inconsistências e duplicidades</summary>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
                {result.issues.map((i, k) => <li key={`i${k}`}>Linha {i.row}: {i.message}</li>)}
                {result.duplicates.map((d, k) => <li key={`d${k}`}>Linha {d.row}: “{d.name}” duplicado {d.reason === 'arquivo' ? 'no próprio arquivo' : 'na campanha de destino'}.</li>)}
              </ul>
            </details>
          )}
          <h2 className="mb-2 mt-5 font-sans text-base font-bold">4. Pré-visualização</h2>
          <TableWrap label="Pré-visualização da importação">
            <thead><tr><th>Linha</th><th>Nome completo</th><th>Exibição</th><th>Categoria</th><th>Idade</th><th>Turma</th><th>Roupa</th><th>Calçado</th><th>Foto</th></tr></thead>
            <tbody>{result.records.slice(0, 200).map((r, i) => <tr key={r.sourceRow}><td>{r.sourceRow}</td><td>{r.fullName}</td><td>{r.displayName}</td><td>{r.category}</td><td>{r.age ?? r.ageRaw}</td><td>{r.group}</td><td>{r.clothingSize}</td><td>{r.shoeSize}</td><td>{photos.length ? (photoMatch.has(i) ? <span className="chip border-pine/30 text-pine">foto ok</span> : <span className="chip text-red">sem foto</span>) : (r.photoSource ? 'link' : '—')}</td></tr>)}</tbody>
          </TableWrap>
          {result.records.length > 200 && <p className="mt-1 text-xs text-muted">Exibindo 200 de {result.records.length}.</p>}
          <section className="card-surface mt-5 space-y-3 p-5">
            {!targetCampaign && <p className="font-medium text-red">Selecione a campanha de destino.</p>}
            {missingRequired.length > 0 && <p className="font-medium text-red">Mapeie os campos obrigatórios: {missingRequired.map((f) => f.label).join(', ')}.</p>}
            {mismatch && (
              <div className="rounded-xl bg-yellow/20 p-3 text-sm" role="alert">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Atenção: possível campanha diferente</p>
                <p className="mt-1">{mismatch} Respostas de outra edição não devem ser presumidas como inscrições da campanha de destino.</p>
                <label className="mt-2 flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-pine" checked={ack} onChange={(e) => setAck(e.target.checked)} />Confirmo que estas respostas pertencem à campanha {targetCampaign?.year}.</label>
              </div>
            )}
            <button className="btn-primary" data-testid="import-confirm" disabled={busy || !targetCampaign || missingRequired.length > 0 || result.records.length === 0 || (!!mismatch && !ack)} onClick={confirmImport}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />5. Confirmar importação de {result.records.length} registro(s)
            </button>
            {progress && <p role="status" className="text-sm font-medium text-pine">{progress}</p>}
          </section>
        </>
      )}
      <h2 className="mb-2 mt-8 font-sans text-lg font-bold">Histórico de importações ({campaigns.find((c) => c.id === ctxCid)?.name})</h2>
      <TableWrap label="Histórico de importações">
        <thead><tr><th>Data</th><th>Arquivo</th><th>Linhas</th><th>Criados</th><th>Duplicados</th><th>Inválidos</th><th>Por</th></tr></thead>
        <tbody>{importJobs.map((j) => <tr key={j.id}><td className="text-xs">{fmtDate(j.createdAt)}</td><td>{j.fileName}</td><td>{j.total}</td><td>{j.created}</td><td>{j.skippedDuplicates}</td><td>{j.invalid}</td><td className="text-xs">{j.actorEmail}</td></tr>)}
          {importJobs.length === 0 && <tr><td colSpan={7} className="text-muted">Nenhuma importação.</td></tr>}</tbody>
      </TableWrap>
    </>
  );
}
