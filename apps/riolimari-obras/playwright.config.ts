import { defineConfig, devices } from "@playwright/test";

process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  // `next dev` compila cada ruta la primera vez que se pide.
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001/ingresar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
