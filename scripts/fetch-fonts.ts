/**
 * Baixa as fontes do Google e as VENDORIZA em public/fonts/.
 *
 *   bun run scripts/fetch-fonts.ts
 *
 * POR QUE ISTO EXISTE (medido, nao preferencia):
 * A chamada externa de fonte bloqueava a renderizacao por 849 ms para baixar
 * 1,3 kB — sozinha, maior que todo o resto do orcamento de performance somado.
 * Pior: ela sai de um @import na linha 1 do src/styles/index.css, e @import
 * dentro de CSS e pior que <link> no <head>, porque o navegador so descobre a
 * fonte DEPOIS de baixar e parsear o CSS — as duas requisicoes ficam em SERIE.
 * (Diagnostico do Farol; confirmei o @import no arquivo.)
 *
 * Com as fontes no repo: zero conexao com fonts.googleapis.com e
 * fonts.gstatic.com, zero DNS/TLS de terceiro no caminho critico.
 *
 * BONUS QUE NAO E SO PERFORMANCE: o scripts/og-image.html tambem puxava Google
 * Fonts em tempo de BUILD. Sem rede o Chrome nao falha — ele cai num fallback
 * do sistema e gera uma og.png que PARECE certa (1200x630, peso ok, passa nas
 * conferencias) mas com a tipografia errada, no unico arquivo que ninguem abre
 * para revisar. Apontando o og-image.html para estes arquivos locais, essa
 * classe de falha silenciosa deixa de existir e a geracao vira deterministica,
 * inclusive em CI sem rede.
 *
 * SO O SUBSET LATIN. Conferido que ele cobre o que o site precisa:
 *   - acentuacao portuguesa (ç ã é í ú) .. U+0000-00FF
 *   - travessao — (U+2014) ............... dentro de U+2000-206F
 * Os outros subsets do Google (cyrillic, greek, vietnamese, latin-ext) nao sao
 * usados por este site e ficam de fora de proposito.
 *
 * Dono: Forja. Os arquivos gerados sao servidos por public/fonts/.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DESTINO = path.join(RAIZ, "public", "fonts");

/**
 * AS DUAS FAMILIAS EM VERSAO VARIAVEL, um arquivo cada.
 *
 * O @import original pedia JetBrains Mono em 400;500;700, o que o Google
 * entrega como TRES arquivos estaticos. Medido: 94,3 kB nos tres contra 40,4 kB
 * no variavel unico (eixo 100..800) — 54 kB a menos cobrindo MAIS pesos.
 * O contrato de nomes e da Aurora (o Farol referencia estas URLs literalmente
 * no preload e no og-image.html, e divergencia de caminho faz baixar duas
 * vezes); levei a medicao a ela e a troca foi aprovada antes de alguem
 * escrever os nomes velhos.
 *
 * Efeito colateral bom para o Farol: como as duas sao variaveis, TODOS os pesos
 * que a og.png usa (Inter Tight 400..800, JBM 400;500) estao cobertos e ele nao
 * precisa ajustar o og-image.html para caber em pesos menores.
 */
const URL_GF =
  "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap";

/** UA de Chrome moderno: sem isso o Google devolve .ttf em vez de .woff2. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type Face = {
  familia: string;
  peso: string;
  estilo: string;
  intervalo: string;
  url: string;
  arquivo: string;
};

/** Quebra o CSS do Google em blocos @font-face e fica so com os latin puros. */
function extrairLatin(css: string): Face[] {
  const faces: Face[] = [];
  const blocos = css.split("@font-face").slice(1);
  let subsetAtual = "";

  for (const bruto of blocos) {
    // O Google marca o subset num comentario ANTES do bloco.
    const antes = css.slice(0, css.indexOf(bruto));
    const marcas = [...antes.matchAll(/\/\*\s*([a-z-]+)\s*\*\//g)];
    subsetAtual = marcas.length ? marcas[marcas.length - 1][1] : subsetAtual;
    if (subsetAtual !== "latin") continue;

    const familia = /font-family:\s*'([^']+)'/.exec(bruto)?.[1];
    const peso = /font-weight:\s*([^;]+);/.exec(bruto)?.[1]?.trim();
    const estilo = /font-style:\s*([^;]+);/.exec(bruto)?.[1]?.trim() ?? "normal";
    const intervalo = /unicode-range:\s*([^;]+);/.exec(bruto)?.[1]?.trim();
    const url = /src:\s*url\(([^)]+)\)/.exec(bruto)?.[1];
    if (!familia || !peso || !intervalo || !url) continue;

    const slug = familia.toLowerCase().replace(/\s+/g, "-");
    // Variavel (peso "100 900") nao leva sufixo de peso; estatico leva.
    const ehVariavel = peso.includes(" ");
    faces.push({
      familia,
      peso,
      estilo,
      intervalo,
      url,
      arquivo: ehVariavel
        ? `${slug}-latin.woff2`
        : `${slug}-latin-${peso}.woff2`,
    });
  }
  return faces;
}

async function main() {
  const resposta = await fetch(URL_GF, { headers: { "User-Agent": UA } });
  if (!resposta.ok) {
    console.error(`fetch-fonts: Google respondeu ${resposta.status}`);
    process.exit(1);
  }
  const css = await resposta.text();
  const faces = extrairLatin(css);
  if (!faces.length) {
    console.error("fetch-fonts: nenhum bloco latin encontrado — o formato do CSS mudou?");
    process.exit(1);
  }

  await mkdir(DESTINO, { recursive: true });
  let total = 0;
  for (const f of faces) {
    const r = await fetch(f.url, { headers: { "User-Agent": UA } });
    if (!r.ok) {
      console.error(`fetch-fonts: falhou ao baixar ${f.arquivo} (${r.status})`);
      process.exit(1);
    }
    const bytes = Buffer.from(await r.arrayBuffer());
    await writeFile(path.join(DESTINO, f.arquivo), bytes);
    total += bytes.length;
    console.log(
      `  ${f.arquivo.padEnd(34)} ${f.familia} ${f.peso}  ${(bytes.length / 1024).toFixed(1)} kB`,
    );
  }

  // O @font-face pronto, para a Aurora colar no lugar do @import.
  const blocos = faces
    .map((f) =>
      [
        "@font-face {",
        `  font-family: '${f.familia}';`,
        `  font-style: ${f.estilo};`,
        `  font-weight: ${f.peso};`,
        // swap: o texto aparece na fonte de sistema e troca quando a real
        // chega. Sem isto o texto fica INVISIVEL ate a fonte carregar, que e
        // justamente o que estamos tentando evitar no FCP.
        "  font-display: swap;",
        `  src: url('/fonts/${f.arquivo}') format('woff2');`,
        `  unicode-range: ${f.intervalo};`,
        "}",
      ].join("\n"),
    )
    .join("\n\n");

  const cabecalho = [
    "/* GERADO por scripts/fetch-fonts.ts — nao edite a mao.",
    " * Cole no lugar do @import do Google Fonts, no topo do src/styles/index.css.",
    " * Os .woff2 estao em public/fonts/ e sao servidos da propria origem.",
    " */",
  ].join("\n");

  await writeFile(
    path.join(DESTINO, "font-face.css"),
    `${cabecalho}\n\n${blocos}\n`,
  );

  // LIMPEZA. Mesma licao que o pipeline de imagem me ensinou: arquivo de uma
  // rodada ANTERIOR que sobra na pasta vai junto para o deploy e, pior, alguem
  // acaba referenciando. Aconteceu aqui: as tres JetBrains estaticas viraram
  // uma variavel e os 94 kB antigos continuaram no disco.
  const gerados = new Set(faces.map((f) => f.arquivo));
  for (const nome of await readdir(DESTINO)) {
    if (!nome.endsWith(".woff2") || gerados.has(nome)) continue;
    await rm(path.join(DESTINO, nome));
    console.log(`  removida (sobra de rodada anterior): ${nome}`);
  }

  console.log(
    `\nfontes: ${faces.length} arquivo(s), ${(total / 1024).toFixed(1)} kB em public/fonts/`,
  );
  console.log("@font-face pronto em public/fonts/font-face.css (para a Aurora)");
  console.log("\npreload para o <head> (Farol):");
  for (const f of faces) {
    console.log(
      `  <link rel="preload" href="/fonts/${f.arquivo}" as="font" type="font/woff2" crossorigin>`,
    );
  }
}

await main();
