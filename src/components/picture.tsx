import type { ImgHTMLAttributes } from "react";

import variantes from "@/data/image-variants.json";

/**
 * <img> que serve a variante do tamanho certo, sem mexer nos caminhos que já
 * estão em src/data.
 *
 * A convenção de nome é da Forja: `<caminho sem extensão>-<largura>.<formato>`.
 * O `src` continua sendo o arquivo original e é ele que fica no <img> como
 * último recurso — navegador antigo, formato que não colou, imagem fora do
 * mapa: a de hoje ainda aparece.
 *
 * As larguras saem SEMPRE do manifesto, nunca de quem chama. <picture> escolhe
 * a <source> pelo `type`, não pela existência do arquivo: um srcset apontando
 * para um AVIF que não foi gerado não cai para a próxima source — dá 404 e a
 * imagem some da tela. E a cobertura de AVIF é irregular de propósito (o
 * pipeline descarta a variante quando ela sairia maior que a WebP), então
 * deixar isso escrito à mão no call site seria questão de tempo até quebrar.
 * O manifesto é regerado do disco a cada build, no primeiro passo.
 */
const MAPA = variantes as Record<string, { avif?: number[]; webp?: number[] }>;

type PictureProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /** Caminho do arquivo original, igual ao que está em src/data. */
  src: string;
  /** Larguras de layout, para o navegador escolher a variante. */
  sizes?: string;
};

function srcset(src: string, widths: number[], ext: string) {
  const base = src.replace(/\.[^./]+$/, "");
  return widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
}

export function Picture({ src, sizes, alt, ...img }: PictureProps) {
  const { avif: avifMapa = [], webp = [] } = MAPA[src] ?? {};

  /**
   * AVIF só entra se cobrir as MESMAS larguras do WebP. Cobertura parcial é
   * pior que nenhuma: o navegador escolhe a source pelo formato e depois a
   * largura DENTRO dela, então um AVIF que só existe em 640 faz o celular
   * baixar 640 em vez do WebP de 320. Medido em jogo-numero-secreto: 3,7 kB
   * de AVIF no lugar de 1,3 kB de WebP, quase o triplo, numa tela de 254px.
   */
  const avif =
    avifMapa.length > 0 && webp.every((w) => avifMapa.includes(w))
      ? avifMapa
      : [];

  // Sem variante (SVG, imagem nova ainda não processada) o componente sai do
  // caminho e entrega o <img> de sempre.
  if (avif.length === 0 && webp.length === 0) {
    return <img src={src} alt={alt} {...img} />;
  }

  return (
    // `contents` tira o <picture> da árvore de layout: o <img> continua sendo,
    // para efeito de CSS, filho direto de quem o contém. Sem isso o wrapper
    // entra como caixa inline no meio de figures com aspect-ratio e de linhas
    // flex, e classes como `size-full` e `shrink-0` passam a medir contra ele.
    <picture className="contents">
      {avif.length > 0 && (
        <source
          type="image/avif"
          srcSet={srcset(src, avif, "avif")}
          sizes={sizes}
        />
      )}
      {webp.length > 0 && (
        <source
          type="image/webp"
          srcSet={srcset(src, webp, "webp")}
          sizes={sizes}
        />
      )}
      <img src={src} alt={alt} sizes={sizes} {...img} />
    </picture>
  );
}
