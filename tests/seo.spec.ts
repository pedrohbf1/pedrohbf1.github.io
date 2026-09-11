import { expect, test } from "@playwright/test";

import { PROJECTS } from "../src/data/projects";
import { PROFILE } from "../src/data/profile";

/**
 * SEO do pacote do Farol. Roda TUDO no HTML CRU do build de producao — nunca
 * no DOM do navegador. O ponto do pre-render e justamente o que chega antes de
 * o JS rodar: se a gente medisse no DOM, passaria mesmo sem pre-render nenhum.
 *
 * Precisa do preview de producao na 4173:
 *   bun run build && bun run scripts/seo-build.ts && bunx vite preview --port 4173
 */
const PREVIEW = "http://localhost:4173";

// Roda num projeto so ("seo", definido no playwright.config.ts): o HTML cru
// nao depende de viewport nem de motor.
//
// NAO use mode:"serial" aqui. Ja usei e foi ruim: uma unica falha abortava o
// resto e escondia 23 resultados — o Pedro trocou o texto da description e eu
// deixei de enxergar JSON-LD, sitemap, og:image, variantes, tudo. Estes testes
// sao independentes entre si (so compartilham o HTML buscado no beforeAll),
// entao cada um deve reportar o proprio veredito.

let html = "";
let text = "";

test.beforeAll(async () => {
  const res = await fetch(`${PREVIEW}/`);
  expect(
    res.ok,
    `preview de producao precisa estar de pe em ${PREVIEW} (bun run build && bun run scripts/seo-build.ts && bunx vite preview --port 4173)`,
  ).toBe(true);
  html = await res.text();
  // Tira script/style antes de medir texto: JSON-LD e bundle nao sao conteudo.
  text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
});

/** Le o content= de uma meta, por name ou property. */
function meta(attr: "name" | "property", key: string) {
  const pattern = new RegExp(
    `<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']|` +
      `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`,
    "i",
  );
  const match = html.match(pattern);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

test("1. title existe e tem entre 30 e 60 chars", () => {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  expect(title, "title vazio").not.toBe("");
  expect(title.length, `title tem ${title.length} chars: "${title}"`).toBeGreaterThanOrEqual(30);
  expect(title.length, `title tem ${title.length} chars: "${title}"`).toBeLessThanOrEqual(60);
});

test("2. meta description existe, diz algo util e nao e truncada", () => {
  // Este teste ja teve piso de 120 e quase virou piso de 90. Os dois eram numero
  // arbitrario: o 120 era recomendacao do Farol, nao regra do Google, e caiu na
  // primeira decisao editorial do Pedro (texto aprovado com 99 chars). Trocar 120
  // por 90 so adiaria o problema — sobraria 9 de folga e qualquer lapidada
  // quebraria de novo.
  //
  // Entao o teste passou a guardar o RISCO em vez do numero (ideia do Farol):
  //   1. <= 160, que e o unico limite real — acima disso o Google trunca.
  //   2. tem que DIZER alguma coisa: citar o papel ou uma stack que venha do
  //      dado. Assim "Portfolio" ou uma string vazia caem, o texto do Pedro
  //      passa, e qualquer reescrita futura dele passa sem me obrigar a
  //      renegociar um numero.
  //   3. piso baixo (50) so como rede contra string truncada por acidente.
  const description = meta("name", "description");

  expect(description, "meta description nao existe").not.toBe("");
  expect(
    description.length,
    `description tem ${description.length} chars e seria truncada: "${description}"`,
  ).toBeLessThanOrEqual(160);
  expect(
    description.length,
    `description com ${description.length} chars parece um toco: "${description}"`,
  ).toBeGreaterThanOrEqual(50);

  // O vocabulario vem do dado, nao de string solta no teste.
  const stacks = [...new Set(PROJECTS.flatMap((p) => p.stack))];
  const termos = [PROFILE.role, ...stacks];
  const cita = termos.some((termo) =>
    description.toLowerCase().includes(termo.toLowerCase()),
  );

  expect(
    cita,
    `a description nao cita o papel nem nenhuma stack do projeto: "${description}"`,
  ).toBe(true);
});
test("3. existe exatamente 1 <h1> no HTML cru", () => {
  const count = (html.match(/<h1[\s>]/gi) ?? []).length;
  expect(count, `encontrei ${count} tags h1`).toBe(1);
});

test("4. canonical, og:url e og:image sao absolutos em https", () => {
  const canonical =
    html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] ?? "";

  const urls = {
    canonical,
    "og:url": meta("property", "og:url"),
    "og:image": meta("property", "og:image"),
  };

  for (const [name, value] of Object.entries(urls)) {
    expect(value, `${name} nao existe`).not.toBe("");
    expect(value, `${name} precisa ser absoluto: "${value}"`).toMatch(/^https:\/\//);
  }
});

test("5. og:title, og:description, og:type, og:locale e twitter:card presentes", () => {
  const tags = {
    "og:title": meta("property", "og:title"),
    "og:description": meta("property", "og:description"),
    "og:type": meta("property", "og:type"),
    "og:locale": meta("property", "og:locale"),
    "twitter:card": meta("name", "twitter:card") || meta("property", "twitter:card"),
  };

  for (const [name, value] of Object.entries(tags)) {
    expect(value, `${name} faltando`).not.toBe("");
  }
});

test("6. <html lang='pt-BR'>", () => {
  const lang = html.match(/<html[^>]*lang=["']([^"']*)["']/i)?.[1] ?? "";
  expect(lang.toLowerCase()).toBe("pt-br");
});

test("7. nenhuma <img> sem alt; as 21 de projeto tem alt descritivo", () => {
  const imgs = html.match(/<img[^>]*>/gi) ?? [];
  expect(imgs.length, "nenhuma img no HTML cru").toBeGreaterThan(0);

  const semAlt = imgs.filter((tag) => !/\salt=/i.test(tag));
  expect(semAlt, `img sem atributo alt: ${semAlt.slice(0, 3).join(" | ")}`).toEqual([]);

  // alt="" nos logos e no wordmark e o correto: sao decorativos.
  // Nem todo projeto tem screenshot ("Disparo de Ofertas" nao tem), entao o
  // numero esperado sai do proprio dado, nao de PROJECTS.length.
  const comScreenshot = PROJECTS.filter((project) => project.image).length;
  const telas = imgs.filter((tag) => /alt=["']Tela do projeto/i.test(tag));
  expect(telas.length, "screenshots com alt 'Tela do projeto...'").toBe(comScreenshot);
});

test("8. JSON-LD valido, com Person e ItemList batendo com os projetos", () => {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((match) => match[1]);

  expect(blocks.length, "nenhum bloco JSON-LD").toBeGreaterThan(0);

  const nodes: Record<string, unknown>[] = [];
  for (const block of blocks) {
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(block);
    }, `JSON-LD invalido: ${block.slice(0, 120)}`).not.toThrow();

    // Aceita no formato @graph ou como lista solta.
    const asRecord = parsed as Record<string, unknown>;
    const graph = asRecord?.["@graph"];
    if (Array.isArray(graph)) nodes.push(...(graph as Record<string, unknown>[]));
    else if (Array.isArray(parsed)) nodes.push(...(parsed as Record<string, unknown>[]));
    else nodes.push(asRecord);
  }

  const person = nodes.find((node) => node["@type"] === "Person");
  expect(person, "nao achei um no @type=Person").toBeDefined();
  expect(person!.name, "Person sem name").toBeTruthy();
  expect(
    Array.isArray(person!.sameAs) && (person!.sameAs as unknown[]).length > 0,
    "Person precisa de sameAs nao vazio",
  ).toBe(true);

  const itemList = nodes.find((node) => node["@type"] === "ItemList");
  expect(itemList, "nao achei um no @type=ItemList").toBeDefined();
  expect(
    itemList!.numberOfItems,
    `ItemList deveria listar ${PROJECTS.length} projetos`,
  ).toBe(PROJECTS.length);
});

test("9. sem JS: nomes de projeto e stacks aparecem no HTML cru", () => {
  // Se o pre-render cair, isto aqui e a primeira coisa que quebra.
  for (const termo of ["Granello", "Elysia", "PostgreSQL"]) {
    expect(text, `"${termo}" nao aparece no HTML cru`).toContain(termo);
  }

  expect(
    text.length,
    `HTML cru tem so ${text.length} chars de texto — o pre-render nao rodou?`,
  ).toBeGreaterThan(5000);
});

test("10. robots.txt e sitemap.xml servidos de verdade (nao o fallback de SPA)", async () => {
  // A armadilha: o vite preview responde 200 com index.html para qualquer
  // caminho. Testar so o status da falso positivo — por isso checo tipo e corpo.
  const robots = await fetch(`${PREVIEW}/robots.txt`);
  expect(robots.status).toBe(200);
  expect(robots.headers.get("content-type") ?? "", "robots.txt servido como HTML").toContain(
    "text/plain",
  );
  const robotsBody = await robots.text();
  expect(robotsBody, "robots.txt sem linha User-agent").toMatch(/^\s*User-agent:/im);
  expect(robotsBody, "robots.txt devolveu HTML").not.toContain("<html");
  expect(robotsBody.toLowerCase(), "robots.txt sem Sitemap:").toContain("sitemap:");

  const sitemap = await fetch(`${PREVIEW}/sitemap.xml`);
  expect(sitemap.status).toBe(200);
  expect(sitemap.headers.get("content-type") ?? "", "sitemap servido como HTML").toMatch(
    /xml/,
  );
  const sitemapBody = await sitemap.text();
  expect(sitemapBody, "sitemap sem <urlset").toContain("<urlset");
  expect(sitemapBody, "sitemap sem <loc>").toMatch(/<loc>\s*https:\/\/[^<]+<\/loc>/);
});

test("11. 404.html existe no dist e tem conteudo", async () => {
  // Ler o dist/ do DISCO tem uma janela de corrida: entre o `vite build`
  // escrever o index.html e o seo-build injetar o JSON-LD, o arquivo existe
  // pela metade. O Farol quase abriu um defeito por isso — leu o dist sem
  // JSON-LD no meio de um build meu. Nao e bug, e milissegundos.
  // Por isso tento de novo em vez de reprovar na primeira leitura magra.
  const { readFile } = await import("node:fs/promises");

  let body = "";
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    body = await readFile("dist/404.html", "utf8").catch(() => "");
    if (body.length > 200 && /<html/i.test(body)) break;
    await new Promise((r) => setTimeout(r, 400));
  }

  expect(body.length, "404.html vazio ou pela metade").toBeGreaterThan(200);
  expect(body).toMatch(/<html/i);
});
test("12. o pre-render nao congelou o tema no <html>", () => {
  const htmlTag = html.match(/<html[^>]*>/i)?.[0] ?? "";
  // Se o build gravar class="dark" ou color-scheme, o tema trava e pisca ao abrir.
  expect(htmlTag, `<html> saiu com tema fixo: ${htmlTag}`).not.toMatch(/class=["'][^"']*dark/i);
  expect(htmlTag, `<html> saiu com color-scheme fixo: ${htmlTag}`).not.toMatch(/color-scheme/i);
});

/* ── Checagens que a lista do Farol nao cobria ────────────────────────── */

test("13. og:image e servida de verdade, em 1200x630 e leve o bastante", async () => {
  const url = meta("property", "og:image");
  const path = new URL(url).pathname;

  // A tag aponta para producao (https://...), mas quem tem que responder
  // agora e o preview local — por isso testo o mesmo caminho na 4173.
  const res = await fetch(`${PREVIEW}${path}`);
  expect(res.status, `og:image nao existe em ${path}`).toBe(200);
  expect(res.headers.get("content-type") ?? "").toContain("image/");

  const bytes = Buffer.from(await res.arrayBuffer());
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);

  expect({ width, height }, "OG pede 1200x630").toEqual({ width: 1200, height: 630 });
  // Acima de ~300kB o WhatsApp costuma desistir de mostrar a previa.
  expect(
    bytes.length,
    `og.png tem ${(bytes.length / 1024).toFixed(0)}kB — acima de 300kB o WhatsApp ignora`,
  ).toBeLessThan(300 * 1024);
});

test("14. todo icone declarado no head responde de verdade", async () => {
  const icons = [...html.matchAll(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi)]
    .map((match) => match[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter((href): href is string => !!href && href.startsWith("/"));

  expect(icons.length, "nenhum icone declarado").toBeGreaterThan(0);

  for (const href of icons) {
    const res = await fetch(`${PREVIEW}${href}`);
    expect(res.status, `${href} nao responde`).toBe(200);
    // Fallback de SPA devolveria text/html e a aba ficaria sem icone.
    expect(res.headers.get("content-type") ?? "", `${href} caiu no fallback de SPA`).toMatch(
      /image\//,
    );
  }
});

test("15. sem JS a pagina ja nasce legivel (texto visivel, nao so no DOM)", async ({
  browser,
}) => {
  // O pre-render so vale se o conteudo aparecer ANTES de o bundle rodar.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/assets/*.js", (route) => route.abort());
  await page.goto(`${PREVIEW}/`, { waitUntil: "domcontentloaded" });

  const visivel = await page.evaluate(() => document.body.innerText.trim().length);
  expect(visivel, "sem JS a pagina nao mostra texto").toBeGreaterThan(3000);

  await context.close();
});

test.describe("16. anti-flash do tema (script inline no <head>)", () => {
  /**
   * O tema e por classe `.dark` no <html>, entao sem um script inline a pagina
   * nasce CLARA e quem usa escuro ve a pagina branca antes de o React montar.
   * Com o conteudo pre-renderizado isso ficaria escancarado — o que piscava era
   * tela vazia, passaria a piscar a pagina inteira.
   *
   * Aqui o bundle e BLOQUEADO de proposito: o que sobra e exatamente o que o
   * usuario ve no primeiro paint. O script inline nao e bloqueado.
   */
  const casos = [
    { nome: "preferencia escura, sem escolha salva", scheme: "dark", salvo: null, esperaEscuro: true },
    { nome: "preferencia clara, sem escolha salva", scheme: "light", salvo: null, esperaEscuro: false },
    { nome: "escolheu escuro na mao, sistema claro", scheme: "light", salvo: "dark", esperaEscuro: true },
    { nome: "escolheu claro na mao, sistema escuro", scheme: "dark", salvo: "light", esperaEscuro: false },
  ] as const;

  for (const caso of casos) {
    test(caso.nome, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: caso.scheme });
      if (caso.salvo) {
        // Mesma chave do storageKey em src/components/theme-provider.tsx.
        await context.addInitScript(
          `try { localStorage.setItem("devpedro-theme", "${caso.salvo}") } catch (e) {}`,
        );
      }

      const page = await context.newPage();
      await page.route("**/assets/*.js", (route) => route.abort());
      await page.goto(`${PREVIEW}/`, { waitUntil: "domcontentloaded" });

      // Sem esperar o CSS assentar o body vem transparente e a medida engana.
      //
      // Os 5s que estavam aqui davam flaky sob carga: com a suite inteira em
      // paralelo, o CSS as vezes demorava mais que isso e o teste falhava sem
      // ter nada errado no site (a Aurora pegou — 3 rodadas, 3 variantes
      // diferentes caindo, e as 4 passando isoladas). Espero a folha de estilo
      // carregar de fato, em vez de torcer pelo relogio.
      await page
        .waitForFunction(
          () =>
            [...document.styleSheets].some((folha) => {
              try {
                return (folha.cssRules?.length ?? 0) > 0;
              } catch {
                return true; // folha de outra origem ja conta como carregada
              }
            }),
          undefined,
          { timeout: 30_000 },
        )
        .catch(() => {});

      await expect
        .poll(
          () =>
            page.evaluate(() => getComputedStyle(document.body).backgroundColor),
          { message: "o CSS nunca assentou", timeout: 30_000 },
        )
        .not.toBe("rgba(0, 0, 0, 0)");

      const { bg, classe, luminancia } = await page.evaluate(() => {
        const bg = getComputedStyle(document.body).backgroundColor;
        // Nao da para casar o valor da cor no texto: ela ja mudou de
        // oklch(0.145 0 0) para rgb(20, 22, 26) quando a paleta foi ajustada.
        // Pinto a cor num canvas e leio o pixel — funciona com oklch, rgb,
        // color-mix ou o que vier depois.
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return {
          bg,
          classe: document.documentElement.className,
          luminancia: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
        };
      });

      const pintouEscuro = luminancia < 0.5;
      expect(
        pintouEscuro,
        `antes do JS a pagina pintou ${pintouEscuro ? "escuro" : "claro"} (bg=${bg}, luminancia=${luminancia.toFixed(2)}, html="${classe}")`,
      ).toBe(caso.esperaEscuro);

      expect(classe.includes("dark"), "classe no <html> antes do paint").toBe(
        caso.esperaEscuro,
      );

      await context.close();
    });
  }
});

test("17. o script do tema vem antes do CSS e do bundle no <head>", () => {
  // Sugestao do Farol, e e a melhor rede aqui: a logica do anti-flash pode
  // estar perfeita e ainda assim falhar se alguem mudar a ORDEM do <head>.
  // Se o script cair depois do stylesheet ou do bundle, a piscada volta.
  const script = html.search(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?devpedro-theme/i);
  expect(script, "nao achei o script inline do tema no <head>").toBeGreaterThan(-1);

  const stylesheet = html.search(/<link[^>]*rel=["']stylesheet["']/i);
  const bundle = html.search(/<script[^>]*type=["']module["'][^>]*src=/i);

  expect(stylesheet, "nao achei o <link rel=stylesheet>").toBeGreaterThan(-1);
  expect(bundle, "nao achei o bundle <script type=module>").toBeGreaterThan(-1);

  expect(script, "o script do tema precisa vir ANTES do stylesheet").toBeLessThan(stylesheet);
  expect(script, "o script do tema precisa vir ANTES do bundle").toBeLessThan(bundle);

  // E tem que ser inline: com src= ele vira request e perde a corrida do paint.
  const head = html.slice(0, stylesheet);
  expect(head, "o script do tema nao pode ser externo").toMatch(
    /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?devpedro-theme/i,
  );
});

test("18. o contador de projetos chega pre-renderizado no valor FINAL", () => {
  // Historico: o <CountUp> animava de 0 ate 21 e o pre-render serializava a
  // pagina no meio da animacao, congelando um numero qualquer no HTML cru
  // (peguei 7, 8 e 10 em builds seguidos). A Aurora resolveu na raiz: o numero
  // final fica no DOM e a contagem roda em CSS.
  //
  // Este teste casa TEXTO, nunca markup. Ja mordeu duas vezes: a Aurora
  // aninhou um <span> dentro do outro, e depois trocou a copy de
  // "N projetos entregues · 2023—2026" para "N projetos entregues desde 2023".
  // Qualquer regex presa a tag ou a palavra vizinha vence sozinha.
  //
  // A frase aparece mais de uma vez na pagina (hero e Sobre). Em vez de tentar
  // adivinhar qual e a do hero, exijo que TODAS digam o mesmo numero certo —
  // mais forte, e pega numero errado em qualquer secao.
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const ocorrencias = [...texto.matchAll(/(\d+)\s*projetos\s+entregues/gi)].map((m) =>
    Number(m[1]),
  );

  expect(
    ocorrencias.length,
    'nao achei nenhum "N projetos entregues" no HTML cru — a copy mudou?',
  ).toBeGreaterThan(0);

  for (const valor of ocorrencias) {
    expect(
      valor,
      `o HTML cru anuncia ${valor} projetos, mas sao ${PROJECTS.length} (valores achados: ${ocorrencias.join(", ")})`,
    ).toBe(PROJECTS.length);
  }
});

test("19. a og:image nao mente e nao envelhece", async () => {
  // HISTORICO: o Farol tinha "21 projetos entregues" CRAVADO no template. Numero
  // em imagem e o pior lugar para envelhecer — ninguem revisa uma imagem, e quem
  // le a og:image e o WhatsApp/LinkedIn. Ele trocou por {{PROJECT_COUNT}}.
  // Depois redesenhou o cartao e o numero saiu de cena: agora mostra nome, papel,
  // a frase do hero e a stack. Entao o teste mudou de alvo junto — nao cobro mais
  // um placeholder que deixou de existir, cobro que nada ali possa envelhecer
  // caladamente e que a imagem esteja em dia com o que a gerou.
  const { readFile } = await import("node:fs/promises");

  const template = await readFile("scripts/og-image.html", "utf8");
  const semComentario = template.replace(/<!--[\s\S]*?-->/g, " ");
  const texto = semComentario.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  // 1. Nenhuma contagem cravada: se alguem reintroduzir um numero de projetos
  //    ou de clientes na arte, ele vira mentira no dia seguinte.
  expect(
    texto,
    "voltou numero cravado na og:image — ele envelhece sem ninguem ver",
  ).not.toMatch(/\d+\s+(projetos|sistemas|clientes|empresas)/i);

  // 2. O que a arte afirma tem que bater com os dados do site.
  expect(texto, "a og:image nao traz o nome do dono").toContain(PROFILE.fullName);
  expect(texto.toLowerCase()).toContain(PROFILE.role.toLowerCase());

  // 3. A imagem tem que estar em dia com o template e com as fotos que a geram.
  //    O stamp e o que impede a og.png de ficar velha em silencio.
  const stamp = JSON.parse(await readFile("public/og.stamp.json", "utf8"));
  expect(stamp.template, "stamp sem hash do template").toBeTruthy();
  expect(
    Object.keys(stamp.imagens ?? {}).length,
    "stamp sem hash das imagens de origem",
  ).toBeGreaterThan(0);
});

test("20. toda variante declarada no manifesto existe em disco", async () => {
  // O <picture> escolhe a source pelo atributo `type`, NAO por o arquivo
  // existir: declarar um avif que nao esta la quebra a imagem com 404 na cara
  // do usuario. Como a trava da Forja descarta AVIF que ficaria maior que o
  // WebP, a cobertura e irregular de proposito — entao manifesto e disco
  // podem desencontrar sem ninguem ver.
  //
  // (A Forja tinha registrado que "faltando o avif o navegador cai para a
  // proxima source sozinho". A Aurora corrigiu: NAO cai. Por isso este teste.)
  const { readFile, access } = await import("node:fs/promises");
  const manifesto = JSON.parse(
    await readFile("src/data/image-variants.json", "utf8"),
  ) as Record<string, Record<string, number[]>>;

  const declaradas: string[] = [];
  for (const [base, formatos] of Object.entries(manifesto)) {
    for (const [formato, larguras] of Object.entries(formatos)) {
      for (const largura of larguras) {
        declaradas.push(
          "public" + base.replace(/\.[^.]+$/, `-${largura}.${formato}`),
        );
      }
    }
  }

  expect(declaradas.length, "manifesto vazio — o build gerou variante?").toBeGreaterThan(0);

  const faltando: string[] = [];
  for (const caminho of declaradas) {
    await access(caminho).catch(() => faltando.push(caminho));
  }

  expect(
    faltando,
    `${faltando.length} de ${declaradas.length} variantes declaradas nao existem em disco`,
  ).toEqual([]);
});

test("21. todo <source> de <picture> responde 200 no preview", async () => {
  // Enquanto o <picture> nao existir isto passa vazio de proposito — e a rede
  // que entra em acao no dia em que a Aurora ligar o <picture>, sem ninguem
  // precisar lembrar de escrever o teste naquele dia.
  const sources = [...html.matchAll(/<source[^>]*srcset=["']([^"']+)["'][^>]*>/gi)]
    .flatMap((m) => m[1].split(","))
    .map((parte) => parte.trim().split(/\s+/)[0])
    .filter((url) => url.startsWith("/"));

  const unicas = [...new Set(sources)];
  for (const url of unicas) {
    const res = await fetch(`${PREVIEW}${url}`);
    expect(res.status, `${url} declarado no <picture> mas nao responde`).toBe(200);
    expect(
      res.headers.get("content-type") ?? "",
      `${url} caiu no fallback de SPA em vez de servir imagem`,
    ).toMatch(/image\//);
  }
});

test("22. o navegador baixa as VARIANTES, nao o fallback", async ({ browser }) => {
  // Buraco que a Aurora me mostrou sem querer.
  //
  // Os testes 20 e 21 provam que as variantes existem e respondem. Nenhum dos
  // dois prova que o navegador USA elas. Se algo quebrar a escolha da source
  // — uma regra de CSS errada no <picture>, um `type` torto, um srcset vazio —
  // tudo cai no fallback EM SILENCIO: a imagem na tela e a mesma, so mais
  // pesada, e nem o baseline visual nem os testes 20/21 acusam. Some o ganho
  // inteiro da otimizacao sem uma linha vermelha.
  //
  // Aqui eu olho o que de fato passou na rede.
  //
  // PROVEI QUE ELE TEM DENTE antes de confiar: com tudo certo da 10 modernas
  // contra 2 legadas e passa; bloqueando avif/webp (o modo de falha real —
  // manifesto dessincronizado, pipeline que nao rodou, deploy incompleto) cai
  // para 0 modernas e FALHA.
  //
  // PONTO CEGO CONHECIDO, e fica escrito para ninguem confiar demais: isto mede
  // a rede DEPOIS da hidratacao. Se o <source> sumir so do HTML pre-renderizado,
  // o React recria os elementos no cliente e as variantes acabam sendo baixadas
  // do mesmo jeito — tentei sabotar exatamente assim e o teste continuou verde.
  // Quem cobre o HTML cru e o teste 21.
  const context = await browser.newContext();
  const page = await context.newPage();

  const baixadas: string[] = [];
  page.on("response", (res) => {
    const url = new URL(res.url()).pathname;
    if (/\.(avif|webp|jpe?g|png)$/i.test(url)) baixadas.push(url);
  });

  await page.goto(`${PREVIEW}/`, { waitUntil: "networkidle" });

  const modernas = baixadas.filter((u) => /\.(avif|webp)$/i.test(u));
  const legadas = baixadas.filter((u) => /\.(jpe?g|png)$/i.test(u));

  // Sem <picture> na pagina nao ha o que cobrar — o teste fica dormindo ate
  // o dia em que houver, igual ao 21.
  const temPicture = html.includes("<picture");
  test.skip(!temPicture, "ainda nao ha <picture> na pagina");

  expect(
    modernas.length,
    `nenhuma variante moderna foi baixada — tudo caiu no fallback. Baixadas: ${legadas.slice(0, 6).join(", ")}`,
  ).toBeGreaterThan(0);

  // O fallback continua valido para quem precisa dele; o que nao pode e ele
  // ser a REGRA. Se o legado passar do moderno, a escolha esta quebrada.
  expect(
    modernas.length,
    `${modernas.length} modernas contra ${legadas.length} legadas — a escolha de source parece quebrada`,
  ).toBeGreaterThanOrEqual(legadas.length);

  await context.close();
});
