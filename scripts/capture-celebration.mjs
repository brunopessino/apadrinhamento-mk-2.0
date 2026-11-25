// Gera evidência visual da animação Christmas Celebration (ambiente demo).
// Uso: npm run build:demo && npx vite preview --outDir dist-demo --port 4173 & ; node scripts/capture-celebration.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4173/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('mk-demo-latency', '50'); }); await p.reload();
await p.locator('[data-sponsored=false]').first().getByRole('button', { name: /Quero apadrinhar/ }).click();
await p.getByRole('textbox', { name: 'Seu nome' }).fill('Pessoa Fictícia'); await p.getByRole('textbox', { name: 'WhatsApp' }).fill('21987654321');
await p.getByRole('checkbox').check(); await p.getByTestId('confirm-sponsor').click();
await p.getByTestId('celebration').waitFor();
const t0 = Date.now(); let i = 0;
for (const at of [100, 800, 1300, 1700, 2100, 2600, 3500]) {
  await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
  await p.screenshot({ path: `evidence/animacao/frame-${i++}.png`, clip: { x: 0, y: 0, width: 430, height: 420 } });
}
await p.screenshot({ path: 'evidence/animacao/confirmacao-final.png' });
await b.close();
