// Playwright-Konfiguration für E2E-Tests (Sprint 3 Schritt 2).
// Rennt gegen `vite preview` (Production-Build), damit Tests das echte
// Bundle inkl. PWA-Konfiguration sehen. Supabase-Calls werden pro Test
// via page.route gestubbt — keine echten Edge-Function-Aufrufe.

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Paralleles Ausfuehren innerhalb einer Datei – Specs sind unabhaengig.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // In CI 2 Worker (GitHub Actions hat 2 vCPUs), lokal alle Cores nutzen.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Deterministische Sprache — i18n hat fr/it/en aktiv, DE ist Referenz.
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    // PWA-Service-Worker in E2E blockieren — sonst cached Workbox aggressiv
    // und alte Bundle-Versionen werden bei Test-Reload ausgeliefert (war
    // reproduzierbar bei parallelen Workers: intermittierende Landing statt
    // Admin-Dashboard nach PIN-Submit).
    serviceWorkers: 'block',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    // Build vor dem Run ist CI-Aufgabe; lokal nimmt `npm run test:e2e`
    // das vorhandene dist/ her. Falls nichts gebaut ist, laesst sich das
    // Kommando anpassen auf `npm run build && npm run preview`.
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Die Preview braucht VITE_SUPABASE_URL/_ANON_KEY zur Build-Zeit;
    // die gibt's im CI als Dummy-Werte, damit das Bundle nicht an
    // `import.meta.env`-Checks stranded. Requests gehen trotzdem an
    // localhost:9999 und werden pro Test via page.route abgefangen.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:9999',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
