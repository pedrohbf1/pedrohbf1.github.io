/**
 * Pipeline de imagem. Roda ANTES do `vite build`.
 *
 *   bun run scripts/optimize-images.ts [--force]
 *
 * FONTE DA VERDADE: assets-src/. Os originais vivem la e NUNCA sao alterados
 * nem apagados. Este script so LE de assets-src/ e ESCREVE na pasta de saida
 * (public-otim/ por padrao — ver DESTINO abaixo). Apagou a saida por engano?
 * Roda de novo e volta.
 *
 * POR QUE ASSIM (decisao registrada na SPEC):
 * As imagens sao referenciadas por caminho string em src/data/*.ts
 * ("/projects/x.jpg"), entao NAO passam por import do Vite e o Vite nao tem
 * como versiona-las nem redimensiona-las. As duas saidas eram (a) mover tudo
 * para src/assets e importar — o que obrigaria a Aurora a trocar todos os
 * caminhos em src/data — ou (b) gerar as variantes com a MESMA arvore de
 * public/, mantendo o caminho de hoje funcionando. Escolhi (b): o caminho atual
 * continua valido, ninguem precisa mexer em src/data, e o sitemap do Farol
 * (que le esses mesmos caminhos) nao muda.
 *
 * O QUE GERA, para cada imagem:
 *   1. O FALLBACK, no MESMO caminho de hoje (/projects/x.jpg), so que
 *      redimensionado para a maior largura que a tela realmente usa. Isso
 *      sozinho ja resolve a maior parte do peso e NAO exige mudanca nenhuma
 *      no JSX — o <img src> de hoje continua identico.
 *   2. As variantes modernas, por largura:
 *        /projects/x-320.avif  /projects/x-320.webp
 *        /projects/x-640.avif  /projects/x-640.webp
 *      E isso que o <Picture> da Aurora consome. Convencao: <caminho sem
 *      extensao>-<largura>.<formato>.
 *
 * AS LARGURAS NAO SAO CHUTE. Medi o render real de cada <img> em 375/768/1440
 * com Playwright (resultado na SPEC):
 *   screenshots de projeto .. 254px em 375, 318px em 768 e 1440  -> 320 e 640
 *   foto do Pedro ........... 44px em todos                      -> 88 e 132
 *   logo do topo/rodape ..... 28px em todos                      -> 56 e 84
 *   logos de empresa ........ 20px em todos                      -> 40 e 60
 * A maior largura de cada perfil cobre tela 2x. Servir mais que isso e peso
 * que o usuario baixa e o navegador joga fora.
 *
 * NAO TOCA em: og.png (dona: seo-build.ts do Farol, que a regera e valida o
 * limite de 300 kB do WhatsApp) e em qualquer .svg (vetor nao rasteriza).
 *
 * Dono: Forja.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const RAIZ = path.resolve(import.meta.dirname, "..");
const FONTES = path.join(RAIZ, "assets-src");

/**
 * DESTINO PADRAO E public-otim/, NAO public/. De proposito.
 *
 * Enquanto nao existir git no projeto, escrever por cima de public/ e
 * irreversivel: os originais deixam de existir no mesmo instante e nao ha de
 * onde voltar. Entao o pipeline produz numa pasta separada, e a troca vira um
 * passo explicito, revisavel e reversivel — depois que o Cofre commitar os
 * originais. (Ordem definida pela Sentinela; o catch foi do Cofre.)
 *
 * Para escrever em public/ e preciso pedir na mao:
 *   bun run scripts/optimize-images.ts --out public
 * Nao troque este padrao para "public" so para encurtar um comando.
 */
const saidaPedida = (() => {
  const i = process.argv.indexOf("--out");
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "public-otim";
})();
const DESTINO = path.resolve(RAIZ, saidaPedida);
const MANIFESTO = path.join(FONTES, `.manifesto-${path.basename(DESTINO)}.json`);

/**
 * MAPA DE VARIANTES que a Aurora importa para montar o <picture>.
 *
 * POR QUE ELE EXISTE, e por que NAO pode ser um JSON em public/:
 * <picture> escolhe a <source> pelo `type`, NAO pela existencia do arquivo.
 * Declarar um srcset .avif que nao existe faz o navegador moderno escolher
 * aquela source e a imagem QUEBRAR em 404 — ele NAO cai para a proxima.
 * (Eu tinha afirmado o contrario para a Aurora; ela corrigiu, e a correcao
 * dela e que esta certa.) Como o pipeline descarta AVIF quando ela ficaria
 * maior que a WebP, a cobertura e IRREGULAR, e so este arquivo sabe quais
 * larguras existem de verdade.
 * Em public/ o modulo exigiria fetch em runtime, atrasando justamente o LCP
 * que queremos melhorar; importado, entra no bundle (~2 kB) sem round-trip.
 *
 * E GERADO DA REALIDADE, nao da configuracao: listo o que esta no disco
 * depois de gerar. Por isso e reescrito em TODA rodada, inclusive quando tudo
 * veio do cache — manifesto fora de sincronia quebra imagem na cara do
 * usuario, que e pior do que nao ter manifesto.
 */
const MAPA_VARIANTES = path.join(RAIZ, "src", "data", "image-variants.json");

/** Qualidade pedida no briefing. Pedra e textura nao podem borrar. */
const Q = 80;

/**
 * AVIF NAO USA A MESMA ESCALA DE QUALIDADE que JPEG e WebP. Medi antes de
 * escolher (sweep em 3 imagens, 2026-09-11):
 *
 *   floricultura @640   webp q80 = 44,4 kB | avif q80 = 59,8 kB  (+35%)
 *   pitangui     @640   webp q80 = 22,6 kB | avif q80 = 39,2 kB  (+73%)
 *   pedro        @896   webp q80 = 23,4 kB | avif q80 = 46,5 kB  (+99%)
 *
 * Ou seja: gerar AVIF em q80 deixaria o site MAIS PESADO justamente nos
 * navegadores modernos de celular, que sao os que aceitam AVIF — o oposto do
 * objetivo. O "~80" do briefing e um alvo PERCEPTUAL, e em AVIF esse alvo cai
 * por volta de q50. Uso 55 para sobrar margem na pedra e na textura, que e o
 * que nao pode criar artefato:
 *
 *   floricultura @640   avif q55 = 28,7 kB  (-35% vs webp)
 *   pitangui     @640   avif q55 = 17,0 kB  (-25% vs webp)
 *   pedro        @896   avif q55 = 19,2 kB  (-18% vs webp)
 *
 * O teste de aceite nao e este numero: e o diff dos baselines da Sentinela
 * (projetos-*.png). Se a pedra borrar, sobe o valor aqui e regera.
 */
const Q_AVIF = 55;

type Perfil = {
  nome: string;
  casa: (rel: string) => boolean;
  /** Maior largura CSS medida em tela. Documenta de onde saiu a largura. */
  render: number;
  /** Larguras a gerar. A maior vira o fallback, salvo fallbackLargura. */
  larguras: number[];
  /**
   * Largura do fallback (o arquivo no caminho de hoje) quando ela NAO deve ser
   * a maior variante. Existe por causa da imagem de LCP: enquanto o <Picture>
   * da Aurora nao existir, TODO mundo recebe o fallback, entao ele tem que
   * aguentar a maior tela. Encolher o fallback da foto do hero deixaria o
   * rosto borrado no desktop.
   */
  fallbackLargura?: number;
  /** Gera avif/webp. false = so recomprime o fallback. */
  variantes: boolean;
  /**
   * Sobrescreve a qualidade. Rosto humano precisa de mais que captura de tela:
   * artefato em pele e cabelo salta aos olhos, artefato em UI quase nao.
   */
  qWebp?: number;
  qAvif?: number;
};

const PERFIS: Perfil[] = [
  {
    nome: "screenshot de projeto",
    casa: (r) => r.startsWith("projects/"),
    render: 318,
    // 480 existe por causa da densidade real de celular. O card mede 254 CSS px
    // no mobile; num aparelho DPR 1,75 (o que o Lighthouse emula, e o mais
    // comum em Android) isso pede 445 px de verdade. So com 320 e 640, o
    // navegador era obrigado a pegar 640 — o Lighthouse marcou 24 kB
    // desperdicados so na floricultura e 12 kB na sistema-de-entregas.
    // Conferi antes de acrescentar: o avif continua vencendo em 480 nas 20
    // imagens, entao a largura nova NAO derruba o avif de ninguem pela regra
    // tudo-ou-nada.
    larguras: [320, 480, 640],
    variantes: true,
  },
  {
    // ATENCAO: este perfil ja mudou uma vez. No Hero v3 a foto era um avatar de
    // 44px; no v4 a Aurora devolveu ela para a dobra como imagem grande e ela
    // voltou a ser o LCP. Medido em 2026-09-11 (Playwright, DPR 1):
    // 216x216 em 375, 320x400 em 768, 448x560 em 1440.
    // O original e 1100x1100 — praticamente o que uma tela 2x de 448x560 pede
    // (896x1120), entao aqui NAO ha o que redimensionar no fallback: o ganho
    // vem de AVIF/WebP e de mandar variante pequena para o celular.
    // Se a Aurora mudar o tamanho da foto de novo, remede antes de mexer aqui.
    nome: "foto do Pedro (LCP)",
    casa: (r) => r === "pedro.jpg",
    render: 448,
    // 1100 (a largura da propria fonte) E OBRIGATORIA AQUI. A foto e QUADRADA
    // mas o hero a exibe num quadro 4:5 com object-cover: com fonte quadrada, o
    // navegador precisa cobrir a MAIOR dimensao da caixa, a altura. Em 1440 a
    // caixa e 448x560, entao o necessario e 560px (1x) e 1120px (2x) — nao 448
    // e 896. Parando em 896 o navegador AMPLIAVA 25% e o rosto saia borrado no
    // elemento de LCP. Foi o bug que o Pedro viu.
    // A fonte tem 1100px, entao 1100 e o teto fisico: cobre 98,2% dos 1120
    // ideais, diferenca invisivel. Melhor que isso so com foto de origem maior.
    larguras: [256, 448, 896, 1100],
    fallbackLargura: 1100,
    variantes: true,
    // Medi PSNR contra o original redimensionado, em vez de chutar:
    //   896px  webp q80 = 41,66 dB (23,4 kB) | q85 = 42,81 dB (30,6 kB)
    //          avif q55 = 42,13 dB (19,2 kB) | q65 = 43,65 dB (26,4 kB)
    // q80 ja estava OTIMO (>40 dB e praticamente sem artefato visivel) — ou
    // seja, os 24 kB NAO eram a causa do borrao. Subo mesmo assim porque esta e
    // a imagem de LCP, e um rosto, e a cena foto-pedro-2x da Sentinela tem
    // tolerancia de 0,2%: o custo sao poucos kB e a margem evita falso alarme.
    qWebp: 85,
    qAvif: 65,
  },
  {
    nome: "logo devPedro",
    casa: (r) => r === "logo.png",
    render: 28,
    larguras: [56, 84],
    variantes: true,
  },
  {
    nome: "logo de empresa",
    casa: (r) => r.startsWith("logos/"),
    render: 20,
    larguras: [40, 60],
    variantes: true,
  },
  {
    // Favicon e apple-touch-icon. Mantenho 256x256 (o apple-touch usa este
    // mesmo arquivo e encolher a dimensao piora o icone no iOS); so recomprimo.
    nome: "favicon",
    casa: (r) => r === "favicon.png",
    render: 256,
    larguras: [256],
    variantes: false,
  },
];

const IGNORAR = (rel: string) =>
  rel.startsWith("_orfaos/") ||
  rel.toLowerCase().endsWith(".svg") ||
  rel === "og.png" ||
  rel === "og.stamp.json" ||
  path.basename(rel).startsWith(".");

async function listar(dir: string, base = dir): Promise<string[]> {
  const saida: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...(await listar(fp, base)));
    else saida.push(path.relative(base, fp).split(path.sep).join("/"));
  }
  return saida;
}

const kb = (n: number) => `${(n / 1024).toFixed(0)} kB`;

/** Todos os arquivos que este perfil produz na saida, para checar o cache. */
function saidasDe(rel: string, perfil: Perfil): string[] {
  const ext = path.extname(rel);
  const semExt = rel.slice(0, -ext.length);
  const saidas = [rel];
  if (perfil.variantes) {
    for (const w of perfil.larguras) {
      saidas.push(`${semExt}-${w}.avif`, `${semExt}-${w}.webp`);
    }
  }
  return saidas;
}

async function main() {
  const force = process.argv.includes("--force");

  if (!existsSync(FONTES)) {
    console.error(
      `optimize-images: ${path.relative(RAIZ, FONTES)} nao existe. As imagens originais deveriam estar la.`,
    );
    process.exit(1);
  }

  /**
   * Cache: por fonte, o hash do conteudo+perfil E a lista de saidas REAIS.
   * Guardar a lista importa: a trava de AVIF pode DESCARTAR uma variante, e um
   * cache que derivasse as saidas da configuracao ficaria esperando um arquivo
   * que eu decidi nao escrever — resultado, aquele arquivo regenerava em toda
   * rodada, para sempre. Foi o que aconteceu com os 8 logos.
   */
  type Entrada = { h: string; out: string[] };
  const manifesto: Record<string, Entrada> = force
    ? {}
    : await readFile(MANIFESTO, "utf8")
        .then((t) => JSON.parse(t) as Record<string, Entrada>)
        .catch(() => ({}));

  const arquivos = (await listar(FONTES)).filter((r) => !IGNORAR(r));
  const novoManifesto: Record<string, Entrada> = {};

  let pulados = 0;
  let entradaTotal = 0;
  let saidaTotal = 0;
  const linhas: string[] = [];
  const descartadas: string[] = [];
  const limpas: string[] = [];

  for (const rel of arquivos) {
    const perfil = PERFIS.find((p) => p.casa(rel));
    const origem = path.join(FONTES, rel);
    const bruto = await readFile(origem);
    entradaTotal += bruto.length;

    if (!perfil) {
      // Nao adivinho largura de imagem que nao conheco: copio intacta e aviso.
      console.warn(`optimize-images: sem perfil para ${rel} — copiei sem tocar`);
      await mkdir(path.dirname(path.join(DESTINO, rel)), { recursive: true });
      await writeFile(path.join(DESTINO, rel), bruto);
      saidaTotal += bruto.length;
      continue;
    }

    // A chave inclui o perfil: mudou largura ou qualidade, regera sozinho.
    const chave = createHash("sha1")
      .update(bruto)
      .update(
        JSON.stringify({
          l: perfil.larguras,
          f: perfil.fallbackLargura ?? null,
          v: perfil.variantes,
          qw: perfil.qWebp ?? null,
          qa: perfil.qAvif ?? null,
          Q,
          Q_AVIF,
        }),
      )
      .digest("hex");
    const anterior = manifesto[rel];
    const tudoNoLugar =
      !!anterior &&
      anterior.out.every((a) => existsSync(path.join(DESTINO, a)));

    if (!force && anterior?.h === chave && tudoNoLugar) {
      pulados++;
      novoManifesto[rel] = anterior;
      for (const a of anterior.out) {
        saidaTotal += (await stat(path.join(DESTINO, a))).size;
      }
      continue;
    }

    // Saidas escritas nesta rodada, para o cache da proxima.
    const escritas: string[] = [rel];

    const meta = await sharp(bruto).metadata();
    const larguraOriginal = meta.width ?? 0;
    await mkdir(path.dirname(path.join(DESTINO, rel)), { recursive: true });

    const maior =
      perfil.fallbackLargura ?? perfil.larguras[perfil.larguras.length - 1];
    const ext = path.extname(rel).toLowerCase();

    // 1) Fallback, no caminho original. withoutEnlargement: nunca AMPLIA —
    //    original menor que o alvo fica com a largura que ja tem.
    const base = sharp(bruto).resize({
      width: maior,
      withoutEnlargement: true,
    });
    const fallback =
      ext === ".png"
        ? await base.png({ quality: Q, compressionLevel: 9, palette: true }).toBuffer()
        : await base
            .jpeg({ quality: Q, mozjpeg: true, progressive: true })
            .toBuffer();
    await writeFile(path.join(DESTINO, rel), fallback);

    let saidaDesteArquivo = fallback.length;
    const larguraFallback = Math.min(maior, larguraOriginal || maior);

    // 2) Variantes modernas por largura.
    if (perfil.variantes) {
      const semExt = rel.slice(0, -ext.length);
      const larguras = perfil.larguras.filter(
        (w) => !larguraOriginal || w <= larguraOriginal,
      );

      // Primeiro TODAS as webp, que sao a cobertura garantida.
      const webps = new Map<number, Buffer>();
      for (const w of larguras) {
        const webp = await sharp(bruto)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: perfil.qWebp ?? Q, effort: 6 })
          .toBuffer();
        await writeFile(path.join(DESTINO, `${semExt}-${w}.webp`), webp);
        escritas.push(`${semExt}-${w}.webp`);
        saidaDesteArquivo += webp.length;
        webps.set(w, webp);
      }

      // AVIF e TUDO OU NADA POR IMAGEM — nao por largura.
      // Achado da Aurora, e ela esta certa: o navegador escolhe a <source>
      // pelo FORMATO primeiro e so depois a largura DENTRO dela. Com avif so
      // em 640, um celular de 254px baixa o avif de 640 em vez do webp de 320
      // — ela mediu 3,7 kB no lugar de 1,3 kB, quase o triplo. Ou seja,
      // cobertura parcial de avif e PIOR que nenhuma. Entao: ou o avif vence
      // em TODAS as larguras da imagem, ou nao sai nenhum.
      const avifs = new Map<number, Buffer>();
      let avifVenceEmTodas = true;
      for (const w of larguras) {
        const avif = await sharp(bruto)
          .resize({ width: w, withoutEnlargement: true })
          .avif({ quality: perfil.qAvif ?? Q_AVIF, effort: 6 })
          .toBuffer();
        avifs.set(w, avif);
        if (avif.length >= (webps.get(w)?.length ?? 0)) {
          avifVenceEmTodas = false;
          descartadas.push(
            `${rel}: avif perde em ${w}px (${kb(avif.length)} >= webp ${kb(webps.get(w)?.length ?? 0)})`,
          );
        }
      }
      if (avifVenceEmTodas) {
        for (const [w, avif] of avifs) {
          await writeFile(path.join(DESTINO, `${semExt}-${w}.avif`), avif);
          escritas.push(`${semExt}-${w}.avif`);
          saidaDesteArquivo += avif.length;
        }
      } else {
        descartadas.push(`${rel}: AVIF desligado inteiro (regra tudo-ou-nada)`);
      }
    }

    novoManifesto[rel] = { h: chave, out: escritas };
    saidaTotal += saidaDesteArquivo;
    linhas.push(
      `  ${rel.padEnd(38)} ${String(larguraOriginal).padStart(4)}px ${kb(bruto.length).padStart(8)} -> ${kb(fallback.length).padStart(8)} (fallback ${larguraFallback}px)`,
    );
  }

  // LIMPEZA — compara com o que foi REALMENTE escrito, nunca com a config.
  //
  // Dois motivos, os dois ja aconteceram de verdade:
  // 1. Variante de perfil ANTIGO fica para tras (pedro-88/-132, de quando a
  //    foto era avatar de 44px no Hero v3) e pode ser consumida por engano.
  // 2. PIOR e mais sutil: um .avif DESCARTADO pela regra tudo-ou-nada continua
  //    no disco desde a rodada anterior. Como o mapa e montado lendo o DISCO,
  //    ele volta a declarar aquele avif — e a cobertura parcial ressurge
  //    sozinha, que e exatamente o que a regra existe para impedir. Comparar
  //    com saidasDe() nao pegava isso, porque a largura descartada continua
  //    sendo uma largura valida na configuracao.
  for (const rel of arquivos) {
    const perfil = PERFIS.find((p) => p.casa(rel));
    if (!perfil) continue;
    const dir = path.dirname(path.join(DESTINO, rel));
    if (!existsSync(dir)) continue;
    const nomeBase = path.basename(rel, path.extname(rel));
    const escritas = new Set(
      (novoManifesto[rel]?.out ?? []).map((x) => path.basename(x)),
    );
    for (const nome of await readdir(dir)) {
      const m = nome.match(/^(.+)-(\d+)\.(avif|webp)$/);
      if (!m || m[1] !== nomeBase || escritas.has(nome)) continue;
      await rm(path.join(dir, nome));
      limpas.push(nome);
    }
  }


  // MAPA DE VARIANTES — lido do DISCO, nunca da config. Ver MAPA_VARIANTES.
  const mapa: Record<string, { avif: number[]; webp: number[] }> = {};
  for (const rel of arquivos) {
    const perfil = PERFIS.find((p) => p.casa(rel));
    if (!perfil?.variantes) continue;
    const semExt = rel.slice(0, -path.extname(rel).length);
    const avif: number[] = [];
    const webp: number[] = [];
    for (const w of perfil.larguras) {
      if (existsSync(path.join(DESTINO, semExt + "-" + w + ".avif"))) {
        avif.push(w);
      }
      if (existsSync(path.join(DESTINO, semExt + "-" + w + ".webp"))) {
        webp.push(w);
      }
    }
    if (!avif.length && !webp.length) continue;
    // Chave = o caminho que ja esta em src/data (o fallback), com barra na
    // frente. E por ela que a Aurora procura.
    mapa["/" + rel] = { avif, webp };
  }
  const chavesMapa = Object.keys(mapa).sort();
  const mapaOrdenado: typeof mapa = {};
  for (const k of chavesMapa) mapaOrdenado[k] = mapa[k];
  await mkdir(path.dirname(MAPA_VARIANTES), { recursive: true });
  await writeFile(MAPA_VARIANTES, JSON.stringify(mapaOrdenado, null, 2) + "\n");

  await writeFile(MANIFESTO, `${JSON.stringify(novoManifesto, null, 2)}\n`);

  if (linhas.length) console.log(linhas.join("\n"));
  for (const d of descartadas) {
    console.log(`  descartada (nao compensava): ${d}`);
  }
  for (const l of limpas) {
    console.log(`  removida (sobra de perfil antigo): ${l}`);
  }
  console.log(
    "  mapa de variantes -> src/data/image-variants.json (" +
      chavesMapa.length +
      " imagens)",
  );
  const pct = entradaTotal ? (1 - saidaTotal / entradaTotal) * 100 : 0;
  console.log(
    `imagens -> ${path.relative(RAIZ, DESTINO)}/ : ${arquivos.length} fontes | ${pulados} em cache | ${kb(entradaTotal)} -> ${kb(saidaTotal)} (-${pct.toFixed(0)}%, ja contando avif+webp)`,
  );
}

await main();
