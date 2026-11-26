import { test, expect } from '@playwright/test';
import { freshDemo, fillSponsor } from './helpers';

const PIX = 'Se preferir, você também pode contribuir com qualquer valor via Pix.';
const KEY = 'Chave Pix: 07152890714 - Ana Claudia Cloves';

test('página inicial, indicadores reais e catálogo', async ({ page }) => {
  await freshDemo(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apadrinhamento de Natal 2026');
  await expect(page.getByText('Compartilhe amor e veja o Natal se multiplicar em sorrisos.').first()).toBeVisible();
  const cards = page.getByTestId('participant-card');
  await expect(cards).toHaveCount(20);
  await expect(page.getByTestId('stat-Participantes')).toHaveText('20');
  const sponsored = await page.locator('[data-testid=participant-card][data-sponsored=true]').count();
  await expect(page.getByTestId('stat-Apadrinhados')).toHaveText(String(sponsored));
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(Math.round((sponsored / 20) * 100)));
});

test('mensagem Pix integral em TODOS os cards (disponíveis e apadrinhados)', async ({ page }) => {
  await freshDemo(page);
  const cards = page.getByTestId('participant-card');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const box = cards.nth(i).getByTestId('pix-box');
    await expect(box.getByTestId('pix-intro')).toHaveText(PIX);
    await expect(box.getByTestId('pix-key')).toHaveText(KEY);
    await expect(box.getByRole('button', { name: 'Copiar chave Pix' })).toBeVisible();
  }
  expect(await page.locator('[data-testid=participant-card][data-sponsored=true] [data-testid=pix-box]').count()).toBeGreaterThan(0);
});

test('copiar chave Pix não altera disponibilidade', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await freshDemo(page);
  const before = await page.locator('[data-sponsored=true]').count();
  await page.getByTestId('participant-card').first().getByRole('button', { name: 'Copiar chave Pix' }).click();
  await expect(page.getByTestId('participant-card').first().getByText('Chave copiada!')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('07152890714');
  expect(await page.locator('[data-sponsored=true]').count()).toBe(before);
});

test('busca, filtros, contador e limpar filtros', async ({ page }) => {
  await freshDemo(page);
  await page.getByRole('searchbox').fill('lia');
  await expect(page.getByTestId('result-count')).toContainText('de 20');
  const n = await page.getByTestId('participant-card').count();
  expect(n).toBeGreaterThan(0);
  for (const t of await page.getByTestId('participant-card').locator('h3').allTextContents()) expect(t.toLowerCase()).toContain('lia');
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByTestId('participant-card')).toHaveCount(20);
  await page.locator('select').first().selectOption('available');
  await expect(page.locator('[data-sponsored=true]')).toHaveCount(0);
  await page.getByRole('searchbox').fill('zzzz-inexistente');
  await expect(page.getByText('Nenhum participante encontrado com esses filtros.')).toBeVisible();
});

test('validação do formulário', async ({ page }) => {
  await freshDemo(page);
  await page.locator('[data-sponsored=false]').first().getByRole('button', { name: /Quero apadrinhar/ }).click();
  await page.getByTestId('confirm-sponsor').click();
  await expect(page.getByText('Informe seu nome.')).toBeVisible();
  await expect(page.getByText(/WhatsApp válido/)).toBeVisible();
  await page.getByRole('textbox', { name: 'WhatsApp' }).fill('21987654321');
  await expect(page.getByRole('textbox', { name: 'WhatsApp' })).toHaveValue('(21) 98765-4321');
});

test('fluxo completo: confirmação, animação natalina, protocolo e atualização do card', async ({ page }) => {
  await freshDemo(page);
  const card = page.locator('[data-sponsored=false]').first();
  const name = await card.locator('h3').textContent();
  const before = Number(await page.getByTestId('stat-Apadrinhados').textContent());
  await card.getByRole('button', { name: /Quero apadrinhar/ }).click();
  await fillSponsor(page);
  await page.getByTestId('confirm-sponsor').click();
  const cel = page.getByTestId('celebration');
  await expect(cel).toHaveAttribute('data-mode', 'animated');
  await expect(page.getByRole('status').filter({ hasText: 'Apadrinhamento confirmado!' })).toBeVisible();
  await expect(page.getByTestId('protocol')).toHaveText(/^MK26-[A-Z2-9]{8}$/);
  await expect(cel).toHaveAttribute('data-stage', 'open', { timeout: 3000 });
  expect(await cel.locator('.cc-particle').count()).toBeGreaterThan(0);
  await expect(cel).toHaveAttribute('data-stage', 'done', { timeout: 8000 });
  expect(await cel.locator('.cc-particle').count()).toBe(0);
  await page.getByRole('button', { name: 'Voltar ao catálogo' }).click();
  const updated = page.getByTestId('participant-card').filter({ has: page.locator('h3', { hasText: name! }) });
  await expect(updated).toHaveAttribute('data-sponsored', 'true');
  await expect(updated.getByRole('button', { name: /já foi apadrinhado/ })).toBeDisabled();
  await expect(page.getByTestId('stat-Apadrinhados')).toHaveText(String(before + 1));
});

test('falha de rede: sem animação e nada registrado', async ({ page }) => {
  await freshDemo(page);
  await page.evaluate(() => localStorage.setItem('mk-demo-fail', 'network'));
  const before = await page.locator('[data-sponsored=true]').count();
  await page.locator('[data-sponsored=false]').first().getByRole('button', { name: /Quero apadrinhar/ }).click();
  await fillSponsor(page);
  await page.getByTestId('confirm-sponsor').click();
  await expect(page.getByRole('alert')).toContainText('instabilidade de conexão');
  await expect(page.getByTestId('celebration')).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem('mk-demo-fail'));
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect(await page.locator('[data-sponsored=true]').count()).toBe(before);
});

test('duas pessoas ao mesmo tempo: uma confirma, a outra recebe aviso e nenhuma animação', async ({ browser }) => {
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  const b = await ctx.newPage();
  await freshDemo(a, 400);
  await b.goto('/'); await b.getByTestId('participant-card').first().waitFor();
  const id = await a.locator('[data-sponsored=false]').first().locator('h3').textContent();
  for (const p of [a, b]) {
    await p.getByTestId('participant-card').filter({ has: p.locator('h3', { hasText: id! }) }).getByRole('button', { name: /Quero apadrinhar/ }).click();
    await fillSponsor(p, p === a ? 'Pessoa A' : 'Pessoa B', p === a ? '21987654321' : '21987654322');
  }
  await Promise.all([a.getByTestId('confirm-sponsor').click(), b.getByTestId('confirm-sponsor').click()]);
  const outcomes = await Promise.all([a, b].map(async (p) => {
    await p.locator('[data-testid=sponsor-success], [data-testid=sponsor-conflict]').first().waitFor();
    return (await p.getByTestId('sponsor-success').count()) ? 'success' : 'conflict';
  }));
  expect(outcomes.sort()).toEqual(['conflict', 'success']);
  const loser = outcomes[0] === 'conflict' ? a : b;
  const loserPage = (await a.getByTestId('sponsor-conflict').count()) ? a : b;
  await expect(loserPage.getByTestId('sponsor-conflict')).toContainText('Este participante acabou de ser apadrinhado. Você ainda pode fazer a diferença escolhendo outra pessoa.');
  await expect(loserPage.getByTestId('celebration')).toHaveCount(0);
  void loser;
  await ctx.close();
});

test('atualização em tempo real entre abas', async ({ browser }) => {
  const ctx = await browser.newContext();
  const a = await ctx.newPage(); const b = await ctx.newPage();
  await freshDemo(a, 50);
  await b.goto('/'); await b.getByTestId('participant-card').first().waitFor();
  const name = (await a.locator('[data-sponsored=false]').first().locator('h3').textContent())!;
  await a.locator('[data-sponsored=false]').first().getByRole('button', { name: /Quero apadrinhar/ }).click();
  await fillSponsor(a);
  await a.getByTestId('confirm-sponsor').click();
  await expect(a.getByTestId('sponsor-success')).toBeVisible();
  await expect(b.getByTestId('participant-card').filter({ has: b.locator('h3', { hasText: name }) })).toHaveAttribute('data-sponsored', 'true');
  await ctx.close();
});

test.describe('movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('alternativa estática, sem partículas', async ({ page }) => {
    await freshDemo(page);
    await page.locator('[data-sponsored=false]').first().getByRole('button', { name: /Quero apadrinhar/ }).click();
    await fillSponsor(page);
    await page.getByTestId('confirm-sponsor').click();
    const cel = page.getByTestId('celebration');
    await expect(cel).toHaveAttribute('data-mode', 'static');
    await expect(cel).toHaveAttribute('data-stage', 'done');
    expect(await cel.locator('.cc-particle').count()).toBe(0);
    await expect(page.getByText('Apadrinhamento confirmado!').first()).toBeVisible();
  });
});

test('página administrativa não indexável e privacidade acessível', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
  await page.goto('/privacidade');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('privacidade');
});

test.describe('abertura natalina', () => {
  test('aparece ao abrir o site, termina sozinha e libera a página', async ({ page }) => {
    await page.goto('/');
    const intro = page.getByTestId('site-intro');
    await expect(intro).toBeVisible();
    await expect(intro).toHaveAttribute('data-stage', 'star', { timeout: 5000 });
    await expect(intro).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });
  test('pode ser pulada', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Pular abertura' }).click();
    await expect(page.getByTestId('site-intro')).toHaveCount(0, { timeout: 2000 });
  });
  test('não aparece na área administrativa', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Área da equipe' })).toBeVisible();
    await expect(page.getByTestId('site-intro')).toHaveCount(0);
  });
});

test.describe('abertura com movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('não é exibida', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('participant-card').first().waitFor();
    await expect(page.getByTestId('site-intro')).toHaveCount(0);
  });
});

test('apadrinhados saem de evidência: vão para a seção do fim', async ({ page }) => {
  await freshDemo(page);
  await expect(page.getByTestId('catalog-grid').locator('[data-sponsored=true]')).toHaveCount(0);
  const before = await page.getByTestId('sponsored-section').getByTestId('participant-card').count();
  expect(before).toBeGreaterThan(0);
  const card = page.getByTestId('catalog-grid').getByTestId('participant-card').first();
  const name = (await card.locator('h3').textContent())!;
  await card.getByRole('button', { name: /Quero apadrinhar/ }).click();
  await fillSponsor(page);
  await page.getByTestId('confirm-sponsor').click();
  await expect(page.getByTestId('sponsor-success')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao catálogo' }).click();
  await expect(page.getByTestId('catalog-grid').locator('h3', { hasText: name })).toHaveCount(0);
  await expect(page.getByTestId('sponsored-section').locator('h3', { hasText: name })).toHaveCount(1);
  await expect(page.getByTestId('sponsored-section').getByTestId('participant-card')).toHaveCount(before + 1);
});
