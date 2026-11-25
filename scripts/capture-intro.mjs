// Evidência visual da abertura natalina (ambiente demo). Uso: node scripts/capture-intro.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
for (const [w,h] of [[390,844],[1440,900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:4173/');
  const t0 = Date.now(); let i = 0;
  for (const at of [400, 1100, 1800, 2600, 3050, 3450, 3800, 4600]) {
    await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await p.screenshot({ path: `evidence/abertura/${w}-frame-${i++}.png` });
  }
  await p.close();
}
await b.close();
