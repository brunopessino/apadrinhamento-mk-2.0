import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { zipSync } from 'fflate';
import { freshDemo, login } from './helpers';

test.beforeEach(async ({ page }) => { await freshDemo(page, 0); });

test('login inválido, conta sem permissão e bloqueio sem sessão', async ({ page }) => {
  await page.goto('/admin/participantes');
  await expect(page.getByRole('heading', { name: 'Área da equipe' })).toBeVisible();
  await login(page, 'admin@demo.mk', 'errada');
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
  await login(page, 'semacesso@demo.mk', 'demo-semacesso');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
});

test('admin: painel, publicação controlada por autorização, cancelamento e liberação', async ({ page }) => {
  await login(page, 'admin@demo.mk', 'demo-admin');
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByTestId('dash-Total de participantes')).toHaveText('24');
  // participante sem autorização não pode ser publicado
  await page.getByRole('link', { name: 'Participantes' }).click();
  await page.getByLabel('Situação').selectOption('draft');
  const row = page.getByTestId('admin-participant-row').first();
  await expect(row.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  // registrar autorização e publicar
  await row.getByRole('button', { name: /^Editar/ }).click();
  await page.getByRole('checkbox', { name: /Autorização de exposição/ }).check();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await row.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByText(/publicado\.$/)).toBeVisible();
  // cancelar apadrinhamento e liberar
  await page.getByRole('link', { name: 'Apadrinhamentos' }).click();
  await page.getByTestId('sponsorship-row').first().waitFor();
  const n = await page.getByTestId('sponsorship-row').count();
  await page.getByTestId('sponsorship-row').first().getByRole('button', { name: 'Cancelar' }).click();
  await page.getByLabel('Justificativa (obrigatória)').fill('Padrinho pediu cancelamento');
  await page.getByRole('button', { name: 'Cancelar e liberar' }).click();
  await expect(page.getByTestId('sponsorship-row')).toHaveCount(n - 1);
  await expect(page.getByText('Padrinho pediu cancelamento')).toBeVisible();
  await page.getByRole('link', { name: 'Histórico' }).click();
  await expect(page.getByText(/cancelado e participante liberado/)).toBeVisible();
  // catálogo público reflete: 1 card a mais publicado, sponsored a menos
  await page.goto('/');
  await expect(page.getByTestId('participant-card')).toHaveCount(21);
});

test('operador: sem publicação, cancelamento, importação ou dados pessoais em relatórios', async ({ page }) => {
  await login(page, 'operador@demo.mk', 'demo-operador');
  await expect(page.getByRole('link', { name: 'Importação' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Campanhas' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Participantes' }).click();
  await expect(page.getByRole('button', { name: 'Publicar' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Apadrinhamentos' }).click();
  await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0);
  await page.getByTestId('sponsorship-row').first().getByRole('combobox').selectOption('received');
  await expect(page.getByText('Status atualizado.')).toBeVisible();
  await page.getByRole('link', { name: 'Relatórios' }).click();
  const opts = await page.getByTestId('report-key').locator('option').allTextContents();
  expect(opts).not.toContain('Relação de padrinhos');
});

test('importação CSV com mapeamento, duplicidades, alerta de ano e registros não publicados', async ({ page }) => {
  await login(page, 'admin@demo.mk', 'demo-admin');
  await page.getByRole('link', { name: 'Importação' }).click();
  await page.getByTestId('import-target').selectOption('2026');
  const csv = 'Carimbo de data/hora,Nome e Sobrenome,Você é:,Idade,Qual turma?,Tamanho de roupa?,Tamanho de calçado?\n01/11/2025 10:00:00,Teste Sintético Um,Aluno,9,Violão,P,30\n01/11/2025 10:05:00,Teste Sintético Dois,Voluntário,30,Bateria,M,40\n01/11/2025 10:06:00,Teste Sintético Um,Aluno,9,Violão,P,30\n';
  await page.getByTestId('import-file').setInputFiles({ name: '2025_apadrinhamento_natal.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText('registros válidos para criar')).toBeVisible();
  await expect(page.getByText('Atenção: possível campanha diferente')).toBeVisible();
  await expect(page.getByTestId('import-confirm')).toBeDisabled();
  await page.getByRole('checkbox', { name: /pertencem à campanha 2026/ }).check();
  await page.getByTestId('import-confirm').click();
  await expect(page.getByText(/2 participante\(s\) importado\(s\) em .*NÃO aparecem no site/)).toBeVisible();
  await page.getByRole('link', { name: 'Participantes' }).click();
  await page.getByLabel('Situação').selectOption('draft');
  await expect(page.getByTestId('admin-participant-row').filter({ hasText: 'Teste Sintético Um' })).toHaveCount(1);
  await page.goto('/');
  await expect(page.getByText('Teste S.')).toHaveCount(0);
});

test('exportação CSV e Excel com campanha, data e proteção', async ({ page }) => {
  await login(page, 'admin@demo.mk', 'demo-admin');
  await page.getByRole('link', { name: 'Relatórios' }).click();
  await page.getByTestId('report-key').selectOption('sponsors');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
  const text = readFileSync((await csv.path())!, 'utf8');
  expect(text).toContain('Relação de padrinhos');
  expect(text).toContain('Campanha: Apadrinhamento de Natal 2026 (2026)');
  expect(text).toContain('Gerado em:');
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-xlsx').click()]);
  expect(xlsx.suggestedFilename()).toMatch(/^mk-2026-relacao-de-padrinhos-.*\.xlsx$/);
});

test('campanha 2025 permanece isolada como histórico', async ({ page }) => {
  await login(page, 'admin@demo.mk', 'demo-admin');
  await page.getByTestId('admin-campaign').selectOption('2025');
  await expect(page.getByText('Campanha arquivada: registros históricos preservados.')).toBeVisible();
  await expect(page.getByTestId('dash-Total de participantes')).toHaveText('6');
  await page.goto('/');
  await expect(page.getByTestId('participant-card')).toHaveCount(20);
});

test('importação com filtro de ano, fotos em .zip, autorização e publicação em lote', async ({ page }) => {
  await login(page, 'admin@demo.mk', 'demo-admin');
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 120, height: 150 } });
  const zip = zipSync({ 'Fotos (File responses)/IMG_1 - Foto Sintética Alfa.png': new Uint8Array(png), 'Fotos (File responses)/IMG_2 - Foto Sintética Beta.png': new Uint8Array(png) });
  await page.getByRole('link', { name: 'Importação' }).click();
  await page.getByTestId('import-target').selectOption('2026');
  const csv = 'Carimbo de data/hora,Nome e Sobrenome,Você é:,Idade\n03/11/2025 10:00:00,Resposta Antiga,Aluno,9\n20/11/2026 10:00:00,Foto Sintética Alfa,Aluno,10\n20/11/2026 11:00:00,Foto Sintética Beta,Voluntário,30\n21/11/2026 11:00:00,Sem Foto Gama,Aluno,12\n';
  await page.getByTestId('import-file').setInputFiles({ name: 'respostas.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText(/1 resposta\(s\) de outros anos serão ignoradas/)).toBeVisible();
  await expect(page.getByText('Atenção: possível campanha diferente')).toHaveCount(0);
  await page.getByTestId('import-photos').setInputFiles({ name: 'fotos.zip', mimeType: 'application/zip', buffer: Buffer.from(zip) });
  await expect(page.getByTestId('photo-match-count')).toHaveText('2 de 3 pessoas com foto encontrada.');
  await page.getByTestId('import-authorized').check();
  await page.getByTestId('import-confirm').click();
  await expect(page.getByText(/3 participante\(s\) importado\(s\) em .*, 2 com foto/)).toBeVisible();
  await page.getByRole('link', { name: 'Participantes' }).click();
  await page.getByTestId('publish-all').click();
  await expect(page.getByText(/participante\(s\) publicado\(s\)/)).toBeVisible();
  await page.goto('/');
  const card = page.locator('article', { hasText: 'Foto A.' });
  await expect(card.first()).toBeVisible();
  await expect(card.first().locator('img')).toHaveAttribute('src', /^data:image\//);
  await expect(page.getByText('Resposta A.')).toHaveCount(0);
});
