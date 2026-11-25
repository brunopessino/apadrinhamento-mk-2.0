import { chromium } from 'playwright';
const base = process.env.BASE ?? 'http://localhost:4173';
const out = process.argv[2] ?? 'evidence/screenshots';
const widths = (process.env.WIDTHS ?? '375,1440').split(',').map(Number);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 800 ? 812 : 900 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
  await page.goto(base + '/');
  await page.evaluate(() => localStorage.setItem('mk-demo-latency', '0'));
  await page.reload();
  await page.waitForSelector('[data-testid=participant-card]');
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(w, 'overflow', overflow);
  await page.screenshot({ path: `${out}/home-${w}.png`, fullPage: process.env.FULL === '1' });
  await page.close();
}
await browser.close();
