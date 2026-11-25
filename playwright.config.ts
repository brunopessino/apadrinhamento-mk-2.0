import { defineConfig, devices } from '@playwright/test';

// E2E contra o build de DEMONSTRAÇÃO (dados sintéticos, sem rede/Firebase).
const executablePath = process.env.CHROME_PATH || undefined;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', launchOptions: { executablePath } },
  webServer: { command: 'npx vite preview --outDir dist-demo --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
});
