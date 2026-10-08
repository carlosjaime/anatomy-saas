import { defineConfig, devices } from "@playwright/test";

/**
 * Suite E2E contra el build de producción de Next (`npm run build:next`).
 * `ATLAS_E2E=1` habilita pagos de demostración y el buzón de correo en
 * memoria; la base de datos es un archivo SQLite desechable.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "es-MX",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec/ },
  ],
  webServer: {
    command: `rm -f .data/e2e.db* && npx next start -p ${PORT} -H 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ATLAS_E2E: "1",
      DATABASE_URL: "file:.data/e2e.db",
      APP_URL: baseURL,
    },
  },
});
