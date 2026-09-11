/**
 * Etapa de SEO que roda DEPOIS do `vite build`.
 *
 *   bun run scripts/seo-build.ts
 *
 * Faz quatro coisas em cima de dist/:
 *  1. PRE-RENDER — sobe o dist num servidor local, abre no Chrome headless e
 *     grava o DOM ja renderizado dentro do index.html. Sem isso o HTML cru e
 *     so <div id="root"></div>: WhatsApp, LinkedIn e Slack nao rodam JS e o
 *     preview do link do Pedro chega vazio.
 *  2. JSON-LD — gera Person + WebSite + ProfilePage + ItemList dos projetos a
 *     partir de src/data/*.ts e injeta no <head>. Gerado, nunca escrito a mao:
 *     assim nao desatualiza quando alguem adiciona um projeto.
 *  3. sitemap.xml — uma URL (pagina unica) com image sitemap dos screenshots.
 *  4. 404.html — o GitHub Pages so serve 404 de verdade se este arquivo existe.
 *
 * Dono: Farol (SEO). O wiring no package.json e da Forja.
 */
import { existsSync } from "node:fs";
import os from "node:os";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CONTATO, PROFILE } from "../src/data/profile";
import { PROJECTS, type Project } from "../src/data/projects";

/** ------------------------------------------------------------------ *
 * SITE_URL — unico lugar que sabe o endereco publico. Sem barra no fim.
 * GitHub Pages como site de USUARIO (repo "pedrohbf1.github.io"): servido na
 * RAIZ do dominio, entao os caminhos absolutos de imagem que ja existem
 * (/projects, /logos, /pedro.jpg, /favicon.png) funcionam como estao e o
 * vite.config.ts NAO precisa de `base`.
 * Mudou o nome do repo? Troque esta linha e a mesma URL no index.html e no
 * public/robots.txt (grep -rn "pedrohbf1.github.io").
 * ------------------------------------------------------------------- */
const SITE_URL = "https://pedrohbf1.github.io";

/** "/" hoje. Sai do SITE_URL para o pre-render aguentar uma subpasta sem
 *  outra edicao, caso o repo mude de nome um dia. */
const BASE_PATH = new URL(`${SITE_URL}/`).pathname;

const DIST = path.resolve(import.meta.dirname, "../dist");
const CHROME =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const abs = (p: string) => `${SITE_URL}${p.startsWith("/") ? p : `/${p}`}`;
const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Projetos em ordem cronologica, igual a linha do tempo da tela. */
const TIMELINE = [...PROJECTS].sort((a, b) => a.date.localeCompare(b.date));

/**
 * Stacks que o Pedro declara na secao "Stacks" do site mas que NAO aparecem
 * no campo `stack` de nenhum projeto — aquele campo lista a stack de cada
 * projeto, nao a base sobre a qual ela roda. Express e Elysia rodam em Node;
 * o projeto inteiro e TypeScript.
 *
 * Nao sao invencao minha: estao escritas na tela, na secao Stacks. Nao da
 * para derivar porque essa lista mora dentro de um componente da Aurora
 * (about.tsx), nao num arquivo de dados. Enquanto nao virar dado, a garantia
 * e a conferencia em conferirStacksExtras(): se qualquer uma sumir da pagina,
 * o build para.
 */
const STACKS_EXTRAS = ["Node.js", "TypeScript"];

/** Toda stack que aparece em algum projeto, da mais usada para a menos. */
function stacksPorUso() {
  const count = new Map<string, number>();
  for (const p of PROJECTS) {
    for (const tech of p.stack) count.set(tech, (count.get(tech) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/** Tudo que vai para o knowsAbout do Person. */
function stacksParaSchema() {
  const doProjeto = stacksPorUso();
  return [...doProjeto, ...STACKS_EXTRAS.filter((t) => !doProjeto.includes(t))];
}

/**
 * Trava contra o knowsAbout virar lista inventada. As STACKS_EXTRAS so podem
 * existir no schema porque estao escritas na pagina; se alguem tirar uma da
 * secao Stacks, o JSON-LD passaria a afirmar algo que o site nao sustenta.
 */
function conferirStacksExtras(html: string) {
  const sumiram = STACKS_EXTRAS.filter((t) => !html.includes(t));
  if (sumiram.length > 0) {
    for (const t of sumiram) {
      console.error(`SEO: "${t}" esta no knowsAbout mas nao aparece mais na pagina`);
    }
    console.error("SEO: tire de STACKS_EXTRAS ou devolva a stack a secao Stacks.");
    throw new Error(`knowsAbout afirma ${sumiram.length} stack(s) que a pagina nao mostra`);
  }
}

/* ------------------------------ 1. JSON-LD ------------------------------ */

function projetoLd(project: Project) {
  // SoftwareApplication quando esta no ar (da para usar); CreativeWork quando
  // e so um trabalho entregue, sem link publico.
  const url = project.liveUrl ?? project.repoUrl;
  const node: Record<string, unknown> = {
    "@type": url ? "SoftwareApplication" : "CreativeWork",
    name: project.name,
    description: project.description,
    // "AAAA-MM": data real do arquivo de projetos, sem chutar o dia.
    datePublished: project.date,
    keywords: project.stack.join(", "),
    author: { "@id": `${SITE_URL}/#pedro` },
    inLanguage: "pt-BR",
  };
  if (url) {
    node.url = url;
    node.applicationCategory = "WebApplication";
    // O Google pede offers/rating para o rich result de SoftwareApplication.
    // Sem preco nem nota reais nao inventamos nada: fica so dado estruturado.
  }
  if (project.image) node.image = abs(project.image);
  if (project.company) {
    node.creator = { "@type": "Organization", name: project.company.name };
  }
  // O repositorio entra como sameAs, nao como codeRepository: essa
  // propriedade so existe em SoftwareSourceCode, e o validador do schema.org
  // reclama dela em CreativeWork/SoftwareApplication.
  if (project.repoUrl && project.repoUrl !== url) node.sameAs = [project.repoUrl];
  return node;
}

function montarJsonLd() {
  const person = {
    "@type": "Person",
    "@id": `${SITE_URL}/#pedro`,
    name: PROFILE.fullName,
    givenName: "Pedro",
    familyName: "Henrique",
    jobTitle: PROFILE.role,
    url: `${SITE_URL}/`,
    image: abs(PROFILE.photo),
    email: `mailto:${CONTATO.email}`,
    address: {
      "@type": "PostalAddress",
      addressRegion: "MG",
      addressCountry: "BR",
    },
    knowsLanguage: "pt-BR",
    knowsAbout: stacksParaSchema(),
    sameAs: [PROFILE.githubUrl, CONTATO.linkedin],
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    url: `${SITE_URL}/`,
    name: `${PROFILE.fullName} — ${PROFILE.role}`,
    inLanguage: "pt-BR",
    publisher: { "@id": `${SITE_URL}/#pedro` },
  };

  const profilePage = {
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/#pagina`,
    url: `${SITE_URL}/`,
    name: `${PROFILE.fullName} — ${PROFILE.role}`,
    isPartOf: { "@id": `${SITE_URL}/#site` },
    about: { "@id": `${SITE_URL}/#pedro` },
    mainEntity: { "@id": `${SITE_URL}/#pedro` },
    inLanguage: "pt-BR",
    primaryImageOfPage: abs("/og.png"),
  };

  const itemList = {
    "@type": "ItemList",
    "@id": `${SITE_URL}/#projetos`,
    name: `Projetos de ${PROFILE.fullName}`,
    numberOfItems: TIMELINE.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: TIMELINE.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: projetoLd(p),
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [person, website, profilePage, itemList],
  };
}

/* ------------------------------ 2. sitemap ------------------------------ */

function montarSitemap() {
  // Pagina unica: UMA <url>. Os screenshots entram como image sitemap para o
  // Google Imagens achar os projetos.
  const imagens = [
    { loc: abs("/og.png"), title: `${PROFILE.fullName} — ${PROFILE.role}` },
    {
      loc: abs(PROFILE.photo),
      title: `${PROFILE.fullName}, ${PROFILE.role.toLowerCase()}`,
    },
    ...TIMELINE.filter((p) => p.image).map((p) => ({
      loc: abs(p.image as string),
      title: `Tela do projeto ${p.name}: ${p.description}`,
    })),
  ];

  // Toda imagem citada aqui vira uma URL publica no sitemap e uma "image"
  // absoluta no JSON-LD. Se o arquivo nao existe, o Google busca e leva 404 —
  // e some do Google Imagens sem avisar ninguem. E o jeito mais facil disso
  // acontecer e alguem renomear ou mover algo em public/ sem mexer no
  // projects.ts. Falha no build e barata; sitemap apontando pra 404, nao.
  const quebradas = imagens
    .map((img) => img.loc.slice(SITE_URL.length))
    .filter((rel) => !existsSync(path.join(DIST, rel)));
  if (quebradas.length > 0) {
    for (const q of quebradas) console.error(`SEO: imagem inexistente -> ${q}`);
    console.error("SEO: renomeou algo em public/? Ajuste src/data/projects.ts.");
    throw new Error(
      `sitemap/JSON-LD citam ${quebradas.length} imagem(ns) que nao existem em dist/`,
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
${imagens
  .map(
    (img) => `    <image:image>
      <image:loc>${xml(img.loc)}</image:loc>
      <image:title>${xml(img.title)}</image:title>
    </image:image>`,
  )
  .join("\n")}
  </url>
</urlset>
`;
}

/* ------------------------- 3. og.png (auto-regen) ----------------------- */

/**
 * Renderiza public/og.png a partir de scripts/og-image.html.
 *
 * So roda quando algo mudou de verdade (numero de projetos, foto ou o proprio
 * template) — a assinatura fica em public/og.stamp.json. Sem isso o PNG seria
 * reescrito a cada build e sujaria o diff do git com 250 kB de binario.
 *
 * Existe porque a imagem tinha o "21" cravado no HTML. Numero cravado
 * envelhece calado: entra o 22o projeto e a og:image segue dizendo 21 para
 * sempre, sem ninguem perceber — quem le essa imagem e o WhatsApp e o
 * LinkedIn, nao nos.
 */
async function gerarOgImage() {
  const template = path.resolve(import.meta.dirname, "og-image.html");
  const destino = path.resolve(import.meta.dirname, "../public/og.png");
  const stamp = path.resolve(import.meta.dirname, "../public/og.stamp.json");
  const html = await readFile(template, "utf8");

  // O cartao referencia arquivos de public/ tanto em src="" (imagens) quanto
  // em url() dentro do CSS (as fontes). Todos precisam ser resolvidos: o HTML
  // temporario mora fora do repositorio e caminho relativo nao alcancaria.
  const usadas = [
    ...html.matchAll(/(?:src=|url\()\s*["']?\.\.\/public\/([^"')]+)["']?/g),
  ].map((m) => m[1]);
  const arquivos = [...new Set(usadas)].map((rel) => ({
    rel,
    abs: path.resolve(import.meta.dirname, "../public", rel),
  }));
  for (const a of arquivos) {
    if (!existsSync(a.abs)) {
      throw new Error(`og-image.html aponta para public/${a.rel}, que nao existe`);
    }
  }

  // A assinatura cobre o template E cada imagem que ele usa: mexeu em
  // qualquer um, a imagem se refaz sozinha no proximo build.
  const assinatura = JSON.stringify({
    template: Bun.hash(html).toString(16),
    imagens: Object.fromEntries(
      await Promise.all(
        arquivos.map(async (a) => [
          a.rel,
          Bun.hash(await Bun.file(a.abs).bytes()).toString(16),
        ]),
      ),
    ),
  });

  const anterior = await readFile(stamp, "utf8").catch(() => "");
  if (anterior === assinatura && existsSync(destino)) {
    console.log("SEO: og.png em dia, nao re-renderizei");
    return;
  }

  // Antes aqui havia uma trava de REDE: o cartao puxava as fontes do Google e,
  // sem acesso, o Chrome caia num fallback do sistema e gerava um PNG com a
  // tipografia errada que passava em todas as conferencias. Agora as fontes
  // vem do repositorio, entao a checagem virou de ARQUIVO — e ja foi feita no
  // laco acima, que aborta se qualquer referencia de public/ nao existir.
  // Resultado: geracao deterministica, offline e em CI sem rede.
  const fontes = arquivos.filter((a) => a.rel.endsWith(".woff2"));
  if (fontes.length === 0) {
    throw new Error("og-image.html nao declara nenhuma fonte local — o cartao sairia em fonte de sistema");
  }

  // Cada imagem vai embutida em base64 para o arquivo temporario poder morar
  // fora do repositorio sem quebrar os caminhos relativos do template.
  let pronto = html;
  for (const a of arquivos) {
    const tipo = a.rel.endsWith(".png")
      ? "image/png"
      : a.rel.endsWith(".svg")
        ? "image/svg+xml"
        : a.rel.endsWith(".woff2")
          ? "font/woff2"
          : "image/jpeg";
    const b64 = Buffer.from(await Bun.file(a.abs).bytes()).toString("base64");
    const dataUri = `data:${tipo};base64,${b64}`;
    pronto = pronto
      .replaceAll(`src="../public/${a.rel}"`, `src="${dataUri}"`)
      .replaceAll(`url("../public/${a.rel}")`, `url("${dataUri}")`);
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "seo-og-"));
  const arquivo = path.join(dir, "og.html");
  await writeFile(arquivo, pronto, "utf8");
  try {
    const proc = Bun.spawn(
      [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1200,630",
        `--user-data-dir=${path.join(dir, "perfil")}`,
        "--virtual-time-budget=6000",
        `--screenshot=${destino}`,
        pathToFileURL(arquivo).href,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [erro, code] = await Promise.all([
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (code !== 0) throw new Error(`Chrome nao gerou a og.png (${code}): ${erro}`);

    // Conferencia: WhatsApp descarta preview de imagem muito pesada, entao um
    // PNG que passe de ~300 kB e falha silenciosa la na ponta.
    const bytes = await Bun.file(destino).bytes();
    const [w, h] = [
      Buffer.from(bytes).readUInt32BE(16),
      Buffer.from(bytes).readUInt32BE(20),
    ];
    if (w !== 1200 || h !== 630) throw new Error(`og.png saiu ${w}x${h}, esperado 1200x630`);
    if (bytes.length > 300_000) {
      throw new Error(`og.png com ${Math.round(bytes.length / 1024)} kB, acima dos 300 kB que o WhatsApp aceita`);
    }
    await writeFile(stamp, assinatura, "utf8");
    console.log(`SEO: og.png regerada (${w}x${h}, ${Math.round(bytes.length / 1024)} kB)`);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ----------------------------- 4. pre-render ---------------------------- */

async function prerender() {
  // Serve o dist numa porta efemera: o Chrome precisa de http:// real para os
  // modulos ES e os assets com caminho absoluto carregarem.
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      // O build sai com os assets sob BASE_PATH ("/devpedro/..."), mas o
      // dist/ em disco nao tem essa pasta: tira o prefixo antes de procurar.
      let p = new URL(req.url).pathname;
      if (p.startsWith(BASE_PATH)) p = `/${p.slice(BASE_PATH.length)}`;
      const file = Bun.file(path.join(DIST, p === "/" ? "index.html" : p));
      return (await file.exists())
        ? new Response(file)
        : new Response(Bun.file(path.join(DIST, "index.html")));
    },
  });

  // Perfil do Chrome no temp do sistema, NUNCA dentro de dist/: se sobrar
  // arquivo travado ali, o proximo `vite build` morre tentando limpar a pasta.
  const perfil = await mkdtemp(path.join(os.tmpdir(), "seo-prerender-"));
  try {
    // spawn ASSINCRONO de proposito: com spawnSync o event loop trava e o
    // Bun.serve aqui de cima nunca responde ao Chrome — os dois ficam se
    // esperando para sempre.
    const proc = Bun.spawn(
      [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        `--user-data-dir=${perfil}`,
        // Tempo virtual: deixa o React montar, o IntersectionObserver disparar
        // e o contador de projetos chegar no numero final antes do dump.
        "--virtual-time-budget=8000",
        "--dump-dom",
        `http://localhost:${server.port}${BASE_PATH}`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );

    const [dumped, erro, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (code !== 0) throw new Error(`Chrome saiu com ${code}: ${erro}`);
    let dom = dumped;

    // O tema e decidido no cliente. Se o dump congelar "dark" no <html>, quem
    // usa o sistema no claro abre o site escuro e ele pisca ao montar.
    dom = dom.replace(
      /<html([^>]*)>/i,
      (_m, attrs: string) =>
        `<html${attrs
          .replace(/\sclass="[^"]*"/i, "")
          .replace(/\sstyle="[^"]*"/i, "")}>`,
    );
    // Estado de rolagem da linha do tempo: so faz sentido depois do scroll.
    dom = dom.replace(/\sdata-active="true"/g, "");

    // Trava de seguranca: se o React nao montou, o dump volta praticamente
    // vazio e nos gravariamos um index.html pior que o original. O caixa-alta
    // do nome na tela e CSS (text-transform), entao aqui se compara o texto
    // como ele realmente esta no HTML.
    const faltando = [PROFILE.fullName, PROFILE.role, TIMELINE.at(-1)!.name]
      .filter((t) => !dom.includes(t));
    if (faltando.length > 0) {
      throw new Error(
        `pre-render saiu sem conteudo no HTML (${faltando.join(", ")}) — abortando`,
      );
    }
    return dom;
  } finally {
    server.stop(true);
    await rm(perfil, { recursive: true, force: true }).catch(() => {});
  }
}

/* -------------------------------- main --------------------------------- */

if (!existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/index.html nao existe. Rode `bun run build` antes.");
  process.exit(1);
}

// Antes da checagem do marcador de proposito: a og.png nao depende do JSON-LD,
// e ficava sendo pulada junto com ele quando o script rodava de novo em cima
// de um dist ja processado.
await gerarOgImage();

const entrada = await readFile(path.join(DIST, "index.html"), "utf8");
if (!entrada.includes("<!--seo:jsonld-->")) {
  // Caso comum: rodar este script duas vezes seguidas. O `bun run build` ja
  // chama ele, entao o marcador ja foi consumido e o dist ja esta pronto —
  // rodar de novo em cima do dist pre-renderizado duplicaria a pagina.
  const jaProcessado = entrada.includes('type="application/ld+json"');
  if (jaProcessado) {
    console.log("SEO: dist/ ja passou por esta etapa (o `bun run build` ja a");
    console.log("SEO: inclui). Nada a fazer. Para refazer do zero: bun run build");
    process.exit(0);
  }
  console.error(
    "Marcador <!--seo:jsonld--> nao esta no index.html. Reponha-o no <head>, antes de </head>.",
  );
  process.exit(1);
}

let html = await prerender();
conferirStacksExtras(html);

const jsonld = `<script type="application/ld+json">${JSON.stringify(
  montarJsonLd(),
).replace(/</g, "\\u003c")}</script>`;
html = html.replace("<!--seo:jsonld-->", jsonld);

await writeFile(path.join(DIST, "index.html"), html, "utf8");
await writeFile(path.join(DIST, "sitemap.xml"), montarSitemap(), "utf8");
// GitHub Pages so devolve 404 de verdade com este arquivo; sem ele, caminho
// inexistente cai numa pagina generica do GitHub.
await writeFile(path.join(DIST, "404.html"), html, "utf8");

const texto = html
  .replace(/<script[\s\S]*?<\/script>/g, "")
  // Comentarios primeiro: o regex de tag abaixo para no primeiro ">", entao
  // um comentario que contenha "<html>" vazaria como se fosse texto da pagina
  // e inflaria a contagem.
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();
console.log(`SEO: index.html com ${(html.length / 1024).toFixed(0)} kB`);
console.log(`SEO: ~${texto.length} chars de texto no HTML cru`);
console.log(`SEO: JSON-LD com ${TIMELINE.length} projetos`);
console.log("SEO: sitemap.xml e 404.html gerados");
