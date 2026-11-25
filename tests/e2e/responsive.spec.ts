import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { freshDemo } from './helpers';

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const expectedCols: Record<number, number> = { 320: 1, 375: 1, 390: 1, 430: 1, 768: 2, 1024: 3, 1440: 4, 1920: 4 };
mkdirSync('evidence/screenshots', { recursive: true });

for (const w of WIDTHS) {
  test(`responsivo ${w}px: sem rolagem horizontal, colunas e alvos de toque`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w < 768 ? 844 : 960 });
    await freshDemo(page, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const cols = await page.getByTestId('catalog-grid').evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(expectedCols[w]);
    const small = await page.locator('main button:visible, main a.btn-primary:visible').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 36).length);
    expect(small).toBe(0);
    await page.screenshot({ path: `evidence/screenshots/home-${w}.png` });
    await page.evaluate(() => document.getElementById('catalogo')!.scrollIntoView());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `evidence/screenshots/catalogo-${w}.png` });
    // modal adaptável
    await page.locator('[data-sponsored=false]').first().getByRole('button', { name: /Quero apadrinhar/ }).click();
    const box = await page.locator('dialog .dialog-panel').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(w);
    await page.screenshot({ path: `evidence/screenshots/formulario-${w}.png` });
  });
}
