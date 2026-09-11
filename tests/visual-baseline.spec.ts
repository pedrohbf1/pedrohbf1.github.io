import { expect, test } from "@playwright/test";

import { freezeForScreenshot, HERO, waitForImages } from "./helpers";

/**
 * Baseline visual — a referencia de ANTES da otimizacao de imagens.
 *
 * Existe por um motivo so: provar depois que a compressao da Forja nao borrou
 * pedra e textura nem criou artefato. Gerar/atualizar com
 * `bun run test:e2e:update`. As referencias ficam em tests/baseline/ e SAO
 * versionadas — sem elas o antes/depois nao existe.
 *
 * Cobertura: todas as secoes (hero, projetos, sobre, contato, rodape) mais a
 * pagina inteira, em tema CLARO e ESCURO, nos tres breakpoints (375/768/1440)
 * e tambem em Chromium.
 */

/** Cada cena e um pedaco da pagina que vale comparar sozinho. */
const CENAS = [
  { nome: "hero", seletor: HERO },
  { nome: "projetos", seletor: "#projetos" },
  { nome: "sobre", seletor: "#sobre" },
  { nome: "contato", seletor: "#contato" },
  { nome: "rodape", seletor: "footer" },
] as const;

const TEMAS = ["claro", "escuro"] as const;
const colorScheme = (tema: (typeof TEMAS)[number]) =>
  tema === "escuro" ? ("dark" as const) : ("light" as const);

test.describe("Baseline visual", () => {
  test.describe.configure({ mode: "serial" });
  // Pagina longa + captura de tela cheia passam folgado dos 30s padrao.
  test.setTimeout(180_000);

  for (const tema of TEMAS) {
    for (const cena of CENAS) {
      test(`${cena.nome} — tema ${tema}`, async ({ page }, testInfo) => {
        await page.emulateMedia({ colorScheme: colorScheme(tema) });
        await page.goto("/");
        await freezeForScreenshot(page);

        const alvo = page.locator(cena.seletor);
        await alvo.scrollIntoViewIfNeeded();
        // Depois de rolar, as imagens `lazy` da secao entram na fila.
        await waitForImages(page, cena.seletor);
        await page.waitForTimeout(250);

        await expect(alvo).toHaveScreenshot(
          `${cena.nome}-${tema}-${testInfo.project.name}.png`,
          { maxDiffPixelRatio: 0.01, animations: "disabled", timeout: 30_000 },
        );
      });
    }

    test(`pagina inteira — tema ${tema}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: colorScheme(tema) });
      await page.goto("/");
      await freezeForScreenshot(page);

      // Rola ate o fim para acordar tudo que esta preso em lazy/observer.
      await page.evaluate(async () => {
        const passo = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += passo) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await waitForImages(page);
      await page.waitForTimeout(400);

      await expect(page).toHaveScreenshot(
        `pagina-${tema}-${testInfo.project.name}.png`,
        {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
          animations: "disabled",
          timeout: 90_000,
        },
      );
    });
  }

  /**
   * A foto do Pedro em densidade 2x, recortada sozinha.
   *
   * E o LCP do hero (render ~448px em 1440) e o lugar onde perda de textura
   * aparece primeiro — pele, cabelo e o degrade do fundo preto sao justamente
   * onde JPEG agressivo cria bloco e banda. Em 2x cada pixel CSS vira quatro,
   * entao artefato que passaria batido no recorte normal fica visivel.
   * Tolerancia apertada de proposito.
   */
  test("foto do Pedro em alta densidade", async ({ browser }, testInfo) => {
    test.skip(
      !testInfo.project.name.endsWith("1440"),
      "um recorte em 2x por motor basta",
    );

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto("/");
    await freezeForScreenshot(page);

    await expect(page.locator('img[src*="pedro"]').first()).toHaveScreenshot(
      `foto-pedro-2x-${testInfo.project.name}.png`,
      // scale "device" e o que importa aqui: o padrao ("css") joga a captura
      // de volta para pixel CSS e jogaria fora justamente a densidade que a
      // gente subiu para enxergar artefato.
      { maxDiffPixelRatio: 0.002, scale: "device", timeout: 30_000 },
    );

    await context.close();
  });

  /**
   * Os screenshots de projeto sao o outro lugar onde a compressao morde: sao
   * 21 imagens servidas a ~318px que hoje chegam em 1600px. Recorto os quatro
   * primeiros cards em 2x para ter prova de qualidade deles tambem.
   */
  test("cards de projeto em alta densidade", async ({ browser }, testInfo) => {
    test.skip(
      !testInfo.project.name.endsWith("1440"),
      "um recorte em 2x por motor basta",
    );

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto("/#projetos");
    await freezeForScreenshot(page);
    await page.locator("#projetos").scrollIntoViewIfNeeded();
    await waitForImages(page, "#projetos");
    await page.waitForTimeout(400);

    const cards = page.locator('#projetos img[src*="/projects/"]');
    const total = Math.min(await cards.count(), 4);
    expect(total, "nao achei card de projeto").toBeGreaterThan(0);

    for (let i = 0; i < total; i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await expect(card).toHaveScreenshot(
        `card-projeto-${i}-2x-${testInfo.project.name}.png`,
        { maxDiffPixelRatio: 0.002, scale: "device", timeout: 30_000 },
      );
    }

    await context.close();
  });
});
