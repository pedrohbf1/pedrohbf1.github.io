import { defineConfig, devices } from "@playwright/test";

/**
 * QA do portfolio. WebKit e o navegador principal porque e o motor do Safari —
 * e o Portal do canvas tambem e WebKit, entao o que passa aqui bate com o que
 * a gente ve no portal. Chromium roda junto so para pegar diferenca de motor.
 */
const PORT = 5173;
const DEV_URL = `http://localhost:${PORT}`;

/**
 * Por padrao testamos o dev server. Com E2E_BASE_URL da para apontar a mesma
 * suite para o build de producao (preview na 4173) e conferir que o
 * pre-render de SEO nao quebrou a interatividade.
 */
const BASE_URL = process.env.E2E_BASE_URL || DEV_URL;

/** Build de producao servido pelo vite preview — alvo dos testes de SEO. */
const PREVIEW_URL = "http://localhost:4173";

export default defineConfig({
  testDir: "./tests",
  // Nada de teste dependendo da ordem dos outros.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],

  snapshotPathTemplate: "{testDir}/baseline/{arg}{ext}",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    /**
     * O SEO roda UMA vez, num projeto so. Antes ele rodava nos quatro: o
     * beforeAll buscava o preview 4x em paralelo e dava "fetch failed" sob
     * carga, o que derrubava a suite inteira (dezenas de "did not run").
     * O HTML cru nao depende de viewport nem de motor, entao repetir nao
     * media nada — so criava disputa.
     */
    {
      name: "seo",
      testMatch: /seo\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "webkit-1440",
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "webkit-768",
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "webkit-375",
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 375, height: 667 } },
    },
    {
      name: "chromium-1440",
      testIgnore: /seo\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],

  /**
   * Reaproveita o dev server que ja estiver de pe na 5173 (a Aurora costuma
   * deixar um rodando). So sobe um novo se a porta estiver livre.
   */
  webServer: [
    {
      command: "bun run dev",
      url: DEV_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    /**
     * Preview de producao para os testes de SEO. O pre-render so existe depois
     * do build + seo-build, entao a suite mesma monta isso — assim ninguem
     * precisa lembrar a ordem dos tres comandos.
     *
     * Enquanto a Forja nao plugar o seo-build no `bun run build`, o passo fica
     * explicito aqui.
     */
    {
      // `bun run build` ja termina chamando o seo-build (a Forja plugou), entao
      // chamar de novo aqui so rodava o pre-render duas vezes.
      //
      // ATENCAO: este comando REESCREVE public/, src/data/image-variants.json e
      // dist/ — o build comeca com optimize-images. Foi assim que eu mesma
      // quebrei o freeze varias vezes: cada rodada da suite mexia no tree que a
      // rodada estava tentando congelar. `reuseExistingServer` evita isso quando
      // ja existe um preview de pe na 4173; se voce precisa de um tree parado de
      // verdade, suba o preview ANTES e rode a suite depois.
      command: "bun run build && bunx vite preview --port 4173",
      url: PREVIEW_URL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
