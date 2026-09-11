import { expect, test, type Page } from "@playwright/test";

import {
  brokenImages,
  HERO,
  horizontalOverflow,
  imageReport,
  SECTIONS,
  waitForImages,
  watchForProblems,
} from "./helpers";

test.describe("Hero", () => {
  test("carrega sem erro de console e sem request quebrado", async ({ page }) => {
    const problems = watchForProblems(page);

    await page.goto("/");
    await waitForImages(page);

    expect(problems.console, "erros no console").toEqual([]);
    expect(problems.failedRequests, "requests 404/falhos").toEqual([]);
  });

  test("toda imagem decodifica, incluindo a foto do Pedro", async ({ page }) => {
    await page.goto("/");
    await waitForImages(page);

    const images = await imageReport(page);
    expect(images.length).toBeGreaterThan(0);

    expect(await brokenImages(page), "imagens que nao carregaram").toEqual([]);

    // A foto e o LCP do hero original (render ~448px em 1440, 216px em 375,
    // com fetchPriority=high). Se sumir, o hero perde o rosto.
    const photo = images.find((img) => img.src.includes("pedro"));
    expect(photo, "foto do Pedro no hero").toBeDefined();
    expect(photo!.naturalWidth).toBeGreaterThan(0);
    expect(photo!.alt, "foto precisa de alt descritivo").not.toBe("");
  });

  test("a foto nao empurra o layout enquanto carrega", async ({ page }) => {
    // O que importa e o resultado — a pagina nao pular — nao o mecanismo.
    // O hero original nao poe width/height na foto, mas reserva a caixa por
    // aspect-ratio no CSS (aspect-square / sm:aspect-4/5), o que resolve igual.
    // Medi com a foto atrasada 1,2s: CLS 0,0005 nos dois breakpoints.
    // Por isso testo o deslocamento de verdade em vez de exigir o atributo.
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!shift.hadRecentInput) {
            (window as unknown as { __cls: number }).__cls += shift.value ?? 0;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    // Segura so a foto: e assim que a falta de caixa reservada apareceria.
    await page.route("**/pedro.jpg", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const foto = page.locator('img[src*="pedro"]').first();
    await expect(foto).toBeVisible();

    const cls = await page.evaluate(
      () => (window as unknown as { __cls: number }).__cls ?? 0,
    );
    // layout-shift so existe em Chromium; nos outros o valor fica em 0 e o
    // teste nao prova nada — por isso a asserção so vale la.
    test.skip(
      test.info().project.name.startsWith("webkit"),
      "layout-shift nao existe no WebKit",
    );
    expect(cls, `CLS de ${cls} com a foto atrasada`).toBeLessThan(0.1);
  });

  test("ha exatamente um h1, com texto de verdade", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    // O h1 do v3 e a frase de posicionamento, nao o nome. So exijo que ele
    // diga alguma coisa: h1 vazio ou so decorativo quebra leitor de tela e SEO.
    expect((await h1.innerText()).trim().length).toBeGreaterThan(15);
  });

  test("nome e papel aparecem no hero", async ({ page }) => {
    await page.goto("/");
    // No v1 nome e papel viviam no h1. No v3 sairam de la e ficaram na
    // assinatura ao lado do avatar. Onde estao importa menos do que ESTAREM:
    // e um portfolio pessoal, o nome nao pode sumir da primeira tela.
    const hero = page.locator("section").first();
    // O hero original assina "Pedro · Desenvolvedor Full Stack" — so o primeiro
    // nome. O sobrenome fica no <title>, no JSON-LD e no rodape. Exijo o que o
    // hero de fato promete: quem e e o que faz.
    // Sem : o innerText cola os blocos ("ContatoPedro · Desenvolvedor"),
    // entao nao ha fronteira de palavra antes do nome.
    await expect(hero).toContainText("Pedro");
    await expect(hero).toContainText(/desenvolvedor full stack/i);
  });

  test("nao tem overflow horizontal", async ({ page }) => {
    await page.goto("/");
    await waitForImages(page);

    const overflow = await horizontalOverflow(page);
    expect(
      overflow.overflows,
      `scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}; culpados: ${overflow.offenders.join(", ")}`,
    ).toBe(false);
  });

  test("o CTA fica inteiro e alcancavel", async ({ page }, testInfo) => {
    await page.goto("/");
    await waitForImages(page);

    const cta = page.getByRole("link", { name: "Ver projetos" });
    await expect(cta).toBeVisible();

    const box = (await cta.boundingBox())!;
    const viewport = page.viewportSize()!;
    const fim = Math.round(box.y + box.height);

    // O botao nunca pode estar CORTADO: o hero tem overflow-hidden, entao o que
    // passar da altura do hero some de vez — isso sim seria defeito.
    const alturaHero = await page.evaluate(
      (sel) => Math.round(document.querySelector(sel)!.getBoundingClientRect().height),
      HERO,
    );
    expect(fim, `CTA termina em ${fim}px e o hero tem ${alturaHero}px`).toBeLessThanOrEqual(
      alturaHero,
    );

    // E tem que dar para clicar nele.
    await cta.click();
    await expect(page).toHaveURL(/#projetos$/);

    // CARACTERISTICA CONHECIDA E ACEITA (nao e falha): em 375x667 o botao fecha
    // 22px ABAIXO da dobra — medido 689 numa tela de 667. O usuario pediu o hero
    // identico ao arquivo de referencia, entao isto fica como esta. A pagina
    // rola e o botao esta inteiro; so nao nasce visivel no iPhone SE.
    if (viewport.width === 375) {
      expect(
        fim,
        `em 375 o CTA fecha em ${fim}px — se passar de 720 algo piorou de verdade`,
      ).toBeLessThan(720);
    }
  });
});

test.describe("Navegacao por ancora", () => {
  /** O menu do hero e `hidden sm:flex`: abaixo de 640px ele nao existe. */
  const hasTopNav = (page: Page) => (page.viewportSize()?.width ?? 0) >= 640;

  /**
   * O scroll e suave (`scroll-behavior: smooth`), entao o hash troca muito
   * antes de a pagina chegar no lugar. Sem esperar assentar, o teste mede o
   * meio do caminho e falha a toa.
   *
   * A ultima secao nunca encosta no topo: nao ha conteudo suficiente embaixo
   * dela para rolar tanto. Nesse caso o certo e a pagina ter ido ate o fim.
   */
  async function expectSettledAt(page: Page, id: string) {
    await expect
      .poll(
        async () =>
          page.evaluate((sectionId) => {
            const el = document.getElementById(sectionId);
            if (!el) return { ok: false, reason: "secao inexistente" };

            const de = document.documentElement;
            const top = Math.round(el.getBoundingClientRect().top);
            const maxScroll = Math.round(de.scrollHeight - window.innerHeight);
            const atEnd = Math.round(window.scrollY) >= maxScroll - 2;

            return {
              ok: top < 140 || (atEnd && top >= 0),
              reason: `top=${top} scrollY=${Math.round(window.scrollY)} max=${maxScroll}`,
            };
          }, id),
        {
          message: `#${id} precisa parar no topo da tela (ou no fim da pagina)`,
          timeout: 10_000,
        },
      )
      .toMatchObject({ ok: true });
  }

  for (const id of SECTIONS) {
    test(`o link do topo leva para #${id}`, async ({ page }) => {
      await page.goto("/");
      await waitForImages(page);

      test.skip(!hasTopNav(page), "menu do topo so aparece de 640px para cima");

      await page.locator(`header a[href="#${id}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expectSettledAt(page, id);
    });
  }

  test("no mobile o menu some de proposito, mas o CTA ainda leva aos projetos", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForImages(page);

    test.skip(hasTopNav(page), "caso exclusivo do layout estreito");

    // Some, mas nao pode virar link fantasma clicavel fora da tela.
    await expect(page.locator('header a[href="#sobre"]')).toBeHidden();
    await expect(page.getByRole("link", { name: "Ver projetos" })).toBeVisible();

    await page.getByRole("link", { name: "Ver projetos" }).click();
    await expectSettledAt(page, "projetos");
  });

  test("o CTA principal desce para os projetos", async ({ page }) => {
    await page.goto("/");
    await waitForImages(page);

    await page.getByRole("link", { name: "Ver projetos" }).click();
    await expect(page).toHaveURL(/#projetos$/);
    await expectSettledAt(page, "projetos");
  });

  test("o link do GitHub abre em nova aba com rel seguro", async ({ page }) => {
    await page.goto("/");
    const github = page.locator('header ~ * a[href*="github.com"]').first();
    const link = (await github.count())
      ? github
      : page.locator('a[href*="github.com"]').first();

    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noreferrer|noopener/);
  });
});

test.describe("Tema", () => {
  test("alterna claro e escuro e mantem o hero legivel", async ({ page }) => {
    await page.goto("/");
    await waitForImages(page);

    const readState = () =>
      page.evaluate(() => ({
        dark: document.documentElement.classList.contains("dark"),
        bg: getComputedStyle(document.body).backgroundColor,
        brand: getComputedStyle(document.documentElement)
          .getPropertyValue("--brand")
          .trim(),
      }));

    const before = await readState();
    await page.locator("header button").last().click();
    await expect
      .poll(async () => (await readState()).dark)
      .not.toBe(before.dark);

    const after = await readState();
    expect(after.bg, "o fundo tem que mudar de verdade").not.toBe(before.bg);
    expect(after.brand, "a cor da marca se ajusta ao tema").not.toBe(before.brand);

    // Em qualquer tema o nome precisa continuar ocupando area na tela.
    const h1 = await page.locator("h1").boundingBox();
    expect(h1!.height).toBeGreaterThan(40);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`sem overflow nem imagem quebrada no tema ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const problems = watchForProblems(page);

      await page.goto("/");
      await waitForImages(page);

      expect((await horizontalOverflow(page)).overflows).toBe(false);
      expect(problems.console).toEqual([]);
      expect(await brokenImages(page)).toEqual([]);
    });
  }
});

test.describe("prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("desliga a animacao pesada sem sumir com o conteudo", async ({ page }) => {
    await page.goto("/");
    await waitForImages(page);

    const state = await page.evaluate(() => {
      const read = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          animationName: style.animationName,
          opacity: style.opacity,
          visible: style.opacity !== "0" && rect.width > 0 && rect.height > 0,
        };
      };

      const contador = document.querySelector(".count-up");

      return {
        rise: read(".rise-in"),
        countUp: contador ? read(".count-up") : null,
        // Sem a contagem o ::after ficaria por cima do numero real.
        pseudoContent: contador
          ? getComputedStyle(contador, "::after").content
          : null,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      };
    });

    // O v3 anima bem menos que o v1: sobrou .rise-in (a frase subindo da
    // mascara) e .count-up. Aurora, marquee, spotlight e dot-ping sairam.
    expect(state.rise, "nao achei .rise-in — o hero mudou de novo?").not.toBeNull();
    expect(state.rise!.animationName, "rise deveria estar sem animacao").toBe("none");

    if (state.countUp) {
      expect(state.countUp.animationName, "count-up sem animacao").toBe("none");
      expect(state.pseudoContent, "o ::after tem que sumir junto").toMatch(/none/);
    }

    // O que mais importa: o conteudo nao pode depender da animacao para existir.
    expect(state.rise!.visible, "a frase do h1 tem que ficar visivel").toBe(true);
    expect(state.scrollBehavior).toBe("auto");
  });
});
