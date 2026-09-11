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
  /**
   * O header e cena PROPRIA desde que a Aurora o tirou de dentro do <section>
   * do hero: naquele dia ele saiu de todas as cenas de uma vez e ninguem ficou
   * vermelho. Foi assim que a folga fantasma do <Picture> passou batida no logo
   * do cabecalho — quem acusou foi o rodape, por sorte.
   */
  { nome: "header", seletor: "header" },
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
   * ARMADILHA, para quem for julgar nitidez daqui: NUNCA use `naturalWidth`
   * para isso. Ele vem CORRIGIDO pela densidade do srcset — um arquivo de
   * 1100px escolhido como 2x reporta 560, e a conta da a impressao de que a
   * imagem esta sendo ampliada 50% quando esta perfeita. Eu e a Forja caimos
   * nessa no mesmo dia. Para julgar nitidez, compare a largura REAL do arquivo
   * (a do nome, ou a do manifesto) com os pixels de dispositivo da caixa.
   * E lembre que fonte QUADRADA em caixa 4:5 com object-cover cobre pela
   * ALTURA: a caixa de 448x560 consome 560px de imagem, nao 448.
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
   * Os screenshots de projeto sao a outra frente da compressao: sao 21 imagens
   * servidas a ~318px que chegam do pipeline em 640px.
   *
   * Miro em arquivos NOMEADOS, nao em `.nth(0..3)`. Ja tentei por posicao e deu
   * falso positivo: a timeline muda qual card e o primeiro conforme o estado de
   * rolagem, entao a cena comparava projetos DIFERENTES entre si e acusava
   * "perda de qualidade" que era so outro card. Com o nome no seletor, cada
   * cena compara sempre a mesma imagem — que e o unico jeito de isso servir
   * como prova de qualidade.
   */
  const CARDS = [
    "jogo-numero-secreto",
    "granello-mineracao",
    "dactai",
    "site-pitangui-pedras",
  ] as const;

  for (const card of CARDS) {
    test(`card de projeto em alta densidade — ${card}`, async ({ browser }, testInfo) => {
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

      // A cena de QUALIDADE tem que medir so a imagem. Sem isto ela mede
      // tambem o estado de apresentacao: a timeline esmaece card nao-ativo, e
      // quando a Aurora mudou essa regra as cenas acusaram "perda de qualidade"
      // que era so opacidade. Forco opacidade cheia na captura para sobrar
      // apenas a variavel que me interessa — textura, bloco, banda.
      await page.addStyleTag({
        content: "#projetos, #projetos * { opacity: 1 !important; filter: none !important; }",
      });

      const img = page.locator(`#projetos img[src*="${card}"]`).first();
      await img.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await expect(img).toHaveScreenshot(
        `card-${card}-2x-${testInfo.project.name}.png`,
        { maxDiffPixelRatio: 0.002, scale: "device", timeout: 30_000 },
      );

      await context.close();
    });
  }
});
