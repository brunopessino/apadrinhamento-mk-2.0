import { createDemoService, DEMO_USERS } from './data/demoService';
import { autoMap, buildRecords, matchPhotos, parseCsvText, yearMismatch } from './importer';
import { buildReport, toCsv } from './exporter';
import type { StaffUser } from '@/types';

const admin = DEMO_USERS['admin@demo.mk'].user as StaffUser;
const operator = DEMO_USERS['operador@demo.mk'].user as StaffUser;

function svc() {
  localStorage.clear();
  const s = createDemoService({ latencyMs: 0 });
  s.reset();
  return s;
}
const firstAvailable = async (s: ReturnType<typeof svc>, cid = '2026') =>
  new Promise<string>((res) => { const u = s.subscribePublicParticipants(cid, (l) => { const p = l.find((x) => !x.sponsored); if (p) { res(p.id); queueMicrotask(u); } }, () => undefined); });
const input = (pid: string, n = 1) => ({ campaignId: '2026', participantId: pid, sponsorName: `Pessoa ${n}`, sponsorPhone: '(21) 98765-43' + String(10 + n).slice(-2), consent: true });

describe('apadrinhamento — concorrência e idempotência (camada de dados)', () => {
  it('10 tentativas simultâneas: exatamente uma confirmada', async () => {
    const s = svc();
    const pid = await firstAvailable(s);
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => s.sponsor(input(pid, i))));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const fails = results.filter((r) => !r.ok);
    expect(fails).toHaveLength(9);
    for (const f of fails) if (!f.ok) { expect(f.code).toBe('already'); expect(f.message).toBe('Este participante acabou de ser apadrinhado. Você ainda pode fazer a diferença escolhendo outra pessoa.'); }
    const sps = await new Promise<unknown[]>((res) => s.admin.subscribeSponsorships('2026', (l) => res(l.filter((x) => (x as { participantId: string }).participantId === pid)), () => undefined));
    expect(sps).toHaveLength(1);
  });
  it('clique repetido após confirmação não cria registro duplicado', async () => {
    const s = svc();
    const pid = await firstAvailable(s);
    expect((await s.sponsor(input(pid))).ok).toBe(true);
    const again = await s.sponsor(input(pid));
    expect(again.ok).toBe(false);
  });
  it('valida dados no serviço (não confia no formulário)', async () => {
    const s = svc();
    const pid = await firstAvailable(s);
    expect(await s.sponsor({ ...input(pid), sponsorPhone: '123' })).toMatchObject({ ok: false, code: 'invalid' });
    expect(await s.sponsor({ ...input(pid), sponsorName: 'A' })).toMatchObject({ ok: false, code: 'invalid' });
    expect(await s.sponsor({ ...input(pid), consent: false })).toMatchObject({ ok: false, code: 'invalid' });
  });
  it('mesma pessoa pode apadrinhar mais de um participante', async () => {
    const s = svc();
    const ids = await new Promise<string[]>((res) => s.subscribePublicParticipants('2026', (l) => res(l.filter((x) => !x.sponsored).slice(0, 2).map((x) => x.id)), () => undefined));
    for (const id of ids) expect((await s.sponsor(input(id, 7))).ok).toBe(true);
  });
  it('campanha arquivada (2025) não aceita apadrinhamentos e fica isolada', async () => {
    const s = svc();
    const r = await s.sponsor({ ...input('demo-2025-031'), campaignId: '2025' });
    expect(r).toMatchObject({ ok: false, code: 'closed' });
    const p26 = await new Promise<string[]>((res) => s.admin.subscribeParticipants('2026', (l) => res(l.map((p) => p.campaignId)), () => undefined));
    expect(new Set(p26)).toEqual(new Set(['2026']));
  });
});

describe('administração — permissões, cancelamento e liberação', () => {
  it('cancela, registra histórico e libera o participante', async () => {
    const s = svc();
    const pid = await firstAvailable(s);
    await s.sponsor(input(pid));
    await expect(s.admin.cancelSponsorship('2026', pid, 'x', admin)).rejects.toThrow(/justificativa/);
    await s.admin.cancelSponsorship('2026', pid, 'Padrinho desistiu', admin);
    const pub = await new Promise<boolean | undefined>((res) => s.subscribePublicParticipants('2026', (l) => res(l.find((p) => p.id === pid)?.sponsored), () => undefined));
    expect(pub).toBe(false);
    const hist = await new Promise<{ cancelReason?: string }[]>((res) => s.admin.subscribeSponsorshipHistory('2026', res, () => undefined));
    expect(hist[0].cancelReason).toBe('Padrinho desistiu');
    expect((await s.sponsor(input(pid, 2))).ok).toBe(true); // liberado de novo
  });
  it('operador não publica, não cancela e não importa', async () => {
    const s = svc();
    await expect(s.admin.setPublished('2026', 'demo-2026-021', true, operator)).rejects.toThrow(/Permissão/);
    await expect(s.admin.cancelSponsorship('2026', 'demo-2026-002', 'motivo', operator)).rejects.toThrow(/Permissão/);
    await expect(s.admin.importParticipants('2026', [], { fileName: 'a.csv', total: 0, skippedDuplicates: 0, invalid: 0 }, operator)).rejects.toThrow(/Permissão/);
  });
  it('não publica sem autorização de exposição', async () => {
    const s = svc();
    await expect(s.admin.setPublished('2026', 'demo-2026-021', true, admin)).rejects.toThrow(/autorização/);
  });
  it('contribuição Pix não altera disponibilidade', async () => {
    const s = svc();
    const before = await new Promise<number>((res) => s.subscribePublicParticipants('2026', (l) => res(l.filter((p) => p.sponsored).length), () => undefined));
    await s.admin.addContribution('2026', { amountCents: 5000, receivedOn: '2026-12-01' }, operator);
    const after = await new Promise<number>((res) => s.subscribePublicParticipants('2026', (l) => res(l.filter((p) => p.sponsored).length), () => undefined));
    expect(after).toBe(before);
  });
  it('dados públicos não contêm nome completo nem telefone', async () => {
    const s = svc();
    const pid = await firstAvailable(s);
    await s.sponsor(input(pid));
    const list = await new Promise<object[]>((res) => s.subscribePublicParticipants('2026', res, () => undefined));
    const json = JSON.stringify(list);
    expect(json).not.toMatch(/fullName|sponsorPhone|sponsorName|5521987/);
  });
});

describe('importação de planilha', () => {
  const csv = `Carimbo de data/hora,Nome e Sobrenome,Você é:,Idade,Qual turma?,Tamanho de roupa?,Tamanho de calçado?,Nos envia uma foto sua de preferencia com a blusa do MK
01/11/2026 10:00:00,Ícaro de Araújo,Aluno,9 anos,Violão,P adulto,38/39,https://drive.google.com/open?id=abc
02/11/2026 11:00:00,Maria-José Conceição,Voluntário,32,Percussão,M / 42,40,
02/11/2026 11:05:00,Ícaro de Araújo,Aluno,9,Violão,P adulto,38/39,
03/11/2026 12:00:00,,Aluno,10,Bateria,10,32,
03/11/2026 12:00:00,Sem Categoria,,10,Bateria,10,32,`;
  it('mapeia colunas do Forms, valida, preserva acentos/tamanhos e detecta duplicidades', async () => {
    const sheet = await parseCsvText(csv);
    const map = autoMap(sheet.headers);
    expect(map).toMatchObject({ timestamp: 'Carimbo de data/hora', fullName: 'Nome e Sobrenome', category: 'Você é:', age: 'Idade', group: 'Qual turma?', clothingSize: 'Tamanho de roupa?', shoeSize: 'Tamanho de calçado?' });
    expect(map.photo).toMatch(/foto/);
    const r = buildRecords(sheet, map, new Set());
    expect(r.records).toHaveLength(2);
    expect(r.records[0]).toMatchObject({ fullName: 'Ícaro de Araújo', displayName: 'Ícaro A.', age: 9, clothingSize: 'P adulto', shoeSize: '38/39', published: false, publicationAuthorized: false });
    expect(r.records[1].fullName).toBe('Maria-José Conceição');
    expect(r.duplicates).toHaveLength(1);
    expect(r.issues.map((i) => i.row)).toEqual([5, 6]);
    expect(r.yearsFound).toEqual([2026]);
  });
  it('alerta ao importar formulário de 2025 em 2026', () => {
    expect(yearMismatch('2025_apadrinhamento_natal.xlsx', [2025], 2026)).toMatch(/2025/);
    expect(yearMismatch('respostas.csv', [2025], 2026)).toMatch(/2025/);
    expect(yearMismatch('respostas.csv', [2026], 2026)).toBeNull();
  });
  it('importação cria registros NÃO publicados na campanha escolhida', async () => {
    const s = svc();
    const sheet = await parseCsvText(csv);
    const r = buildRecords(sheet, autoMap(sheet.headers), new Set());
    await s.admin.importParticipants('2026', r.records, { fileName: 'x.csv', total: 5, skippedDuplicates: 1, invalid: 2 }, admin);
    const ps = await new Promise<{ fullName: string; published: boolean }[]>((res) => s.admin.subscribeParticipants('2026', res, () => undefined));
    const imported = ps.filter((p) => p.fullName === 'Ícaro de Araújo');
    expect(imported).toHaveLength(1);
    expect(imported[0].published).toBe(false);
  });
});

describe('relatórios', () => {
  it('inclui campanha e data, e protege contra fórmulas', () => {
    const campaign = { id: '2026', year: 2026, name: 'Apadrinhamento de Natal 2026' } as never;
    const t = buildReport('all', { campaign, participants: [{ id: '1', campaignId: '2026', fullName: '=cmd|calc', displayName: 'X', category: 'Aluno', age: 9, ageRaw: '9', group: 'Violão', clothingSize: 'P', shoeSize: '30', giftSuggestion: '', publicationAuthorized: true, published: true, archived: false, dedupeKey: 'k' }], sponsorships: [], history: [], contributions: [] });
    const csv = toCsv(campaign, t);
    expect(csv).toContain('Campanha: Apadrinhamento de Natal 2026 (2026)');
    expect(csv).toContain('Gerado em:');
    expect(csv).toContain(`'=cmd|calc`);
    expect(csv).not.toMatch(/;=cmd/);
  });
});

describe('importação — filtro por ano e fotos em lote', () => {
  it('importa somente as respostas do ano da campanha', async () => {
    const csv = 'Carimbo de data/hora,Nome e Sobrenome,Você é:\n03/11/2025 08:35:05,Pessoa Antiga,Aluno\n20/11/2026 10:00:00,Pessoa Nova,Aluno\n21/11/2026 10:00:00,Outra Pessoa,Voluntário\n';
    const sheet = await parseCsvText(csv);
    const r = buildRecords(sheet, autoMap(sheet.headers), new Set(), { onlyYear: 2026 });
    expect(r.records.map((x) => x.fullName)).toEqual(['Pessoa Nova', 'Outra Pessoa']);
    expect(r.otherYear).toBe(1);
    expect(r.yearsFound).toEqual([2025, 2026]);
  });

  it('associa fotos pelo nome (inclusive padrão do Google Forms) e não chuta em caso de dúvida', () => {
    const recs = [{ fullName: 'Maria Clara Souza' }, { fullName: 'João da Silva' }, { fullName: 'Ana Lima' }, { fullName: 'Ana Lima Costa' }, { fullName: 'Sem Foto' }];
    const files = ['IMG_1234 - Maria Clara Souza.jpg', 'joao silva.PNG', 'fotos/Ana Lima.webp', 'outra.jpg'];
    const m = matchPhotos(recs, files);
    expect(m.get(0)).toBe(0);
    expect(m.get(1)).toBe(1);
    // "Ana Lima.webp" serve tanto para "Ana Lima" quanto para "Ana Lima Costa": ambíguo, não associa nenhum dos dois
    expect(m.has(2)).toBe(false);
    expect(m.has(3)).toBe(false);
    expect(m.has(4)).toBe(false);
  });
});
