import type { Page } from '@playwright/test';

export async function freshDemo(page: Page, latency = 150) {
  await page.goto('/');
  await page.evaluate((l) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('mk-demo-latency', String(l)); localStorage.setItem('mk-skip-intro', '1'); }, latency);
  await page.reload();
  await page.getByTestId('participant-card').first().waitFor();
}

export async function fillSponsor(page: Page, name = 'Maria Teste', phone = '21987654321') {
  await page.getByRole('textbox', { name: 'Seu nome' }).fill(name);
  await page.getByRole('textbox', { name: 'WhatsApp' }).fill(phone);
  await page.getByRole('checkbox', { name: /Estou ciente/ }).check();
}

export async function login(page: Page, email: string, pass: string) {
  await page.goto('/admin');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(pass);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
