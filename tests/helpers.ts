import type { Page, ConsoleMessage, Response } from "@playwright/test";

/** Erros de console e requests quebrados coletados durante um teste. */
export type PageProblems = {
  console: string[];
  failedRequests: string[];
};

/**
 * Liga a coleta ANTES do primeiro goto. Extensao e favicon nao contam:
 * ruido que nao vem do nosso codigo so gera teste instavel.
 */
export function watchForProblems(page: Page): PageProblems {
  const problems: PageProblems = { console: [], failedRequests: [] };

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (/favicon/i.test(text)) return;
    problems.console.push(`[${msg.type()}] ${text}`);
  });

  page.on("pageerror", (err) => {
    problems.console.push(`[pageerror] ${err.message}`);
  });

  page.on("response", (res: Response) => {
    if (res.status() >= 400 && !/favicon/i.test(res.url())) {
      problems.failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  page.on("requestfailed", (req) => {
    if (/favicon/i.test(req.url())) return;
    problems.failedRequests.push(`${req.failure()?.errorText ?? "failed"} ${req.url()}`);
  });

  return problems;
}

/**
 * Espera as imagens decodificarem — sem isso naturalWidth ainda e 0.
 *
 * So conta imagem que o navegador realmente vai buscar agora: as `loading=lazy`
 * fora da dobra ficam `complete=false` de proposito e travariam a espera.
 */
export async function waitForImages(page: Page, scope = "body") {
  await page.waitForFunction(
    (selector) => {
      const root = document.querySelector(selector);
      if (!root) return false;
      return [...root.querySelectorAll("img")]
        .filter((img) => img.loading !== "lazy")
        .every((img) => img.complete && img.naturalWidth > 0);
    },
    scope,
    { timeout: 15_000 },
  );
}

/**
 * Imagens da pagina com o estado de carregamento. `lazy` que ainda nao entrou
 * na dobra vem marcada como adiada — nao e imagem quebrada.
 */
export async function imageReport(page: Page, scope = "body") {
  return page.$$eval(`${scope} img`, (elements) =>
    (elements as HTMLImageElement[]).map((img) => ({
      src: img.getAttribute("src") ?? "",
      naturalWidth: img.naturalWidth,
      alt: img.alt,
      deferred: img.loading === "lazy" && !img.complete,
    })),
  );
}

/** So as imagens que deveriam estar carregadas e nao estao. */
export async function brokenImages(page: Page, scope = "body") {
  const images = await imageReport(page, scope);
  return images.filter((img) => !img.deferred && img.naturalWidth === 0);
}

/** Largura de rolagem vs largura visivel: se sobrar, tem overflow lateral. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.position === "fixed" || style.visibility === "hidden") return false;
        // O que ja esta recortado por um ancestral com overflow hidden nao
        // empurra a pagina: nao e overflow de verdade.
        if (el.closest("main > section:first-of-type") || el.closest(".marquee"))
          return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > de.clientWidth + 1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`);

    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      overflows: de.scrollWidth > de.clientWidth,
      offenders,
    };
  });
}

/** Estabiliza a pagina para screenshot: animacao parada e cursor fora. */
export async function freezeForScreenshot(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }
    /* Sobra do hero v1; inofensivo se a classe nao existir mais. */
    .hero-spotlight { display: none !important; }`,
  });
  await page.mouse.move(-50, -50);
  await waitForImages(page);

  // Esperar a fonte e obrigatorio, nao luxo: o hero em 375 media 786px com a
  // fonte carregada e 802px com o fallback do sistema, porque o texto quebra
  // diferente. Sem isto o baseline fica instavel e a gente acaba culpando a
  // compressao de imagem por um problema de tipografia.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

export const SECTIONS = ["projetos", "sobre", "contato"] as const;

/**
 * O hero e a primeira <section> filha direta do <main>.
 *
 * Duas tentativas anteriores morreram: pela classe (`.hero-stage`) o seletor
 * nao sobreviveu as reescritas do hero; e `section:first-of-type` sozinho
 * passou a casar DUAS secoes quando a Aurora criou a #stacks aninhada, porque
 * `:first-of-type` conta dentro de cada pai, nao no documento. O `main >`
 * resolve as duas coisas: e posicional (nao depende de classe) e so pega a
 * secao de primeiro nivel.
 */
export const HERO = "main > section:first-of-type";
