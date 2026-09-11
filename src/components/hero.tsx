import { ArrowDown, ArrowUpRight } from "lucide-react";

import { CountUp } from "@/components/count-up";
import { Picture } from "@/components/picture";
import { PROJECTS, projectYear } from "@/data/projects";
import { PROFILE } from "@/data/profile";

const YEARS = [
  Math.min(...PROJECTS.map((p) => projectYear(p.date))),
  Math.max(...PROJECTS.map((p) => projectYear(p.date))),
];

export function Hero() {
  return (
    <section
      id="banner"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background"
    >
      {/* Único elemento de fundo: um halo largo e discreto da cor da marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 z-0 size-200 rounded-full bg-brand/10 blur-[160px]"
      />

      {/* Cabeçalho e conteúdo dividem o MESMO container: sem isso a marca no
          topo e o título ficam em eixos diferentes e nada se alinha. */}
      {/* pt-21 = os 84px do <SiteHeader>, que agora mora fora do <main> e passa
          por cima daqui. Sem isso o conteúdo sobe meia altura de cabeçalho. */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pt-21 md:px-10">
        <div className="grid flex-1 items-center gap-14 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div>
            <p
              className="fade-up-in mb-6 flex items-start gap-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground"
              style={{ animationDelay: "80ms" }}
            >
              {/* O ponto alinha com a PRIMEIRA linha: com `items-center` ele
                ficava pendurado entre as duas quando o texto quebra. */}
              <span className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand" />
              {/* Em 375 o nome completo e o papel não cabem na mesma linha e a
                quebra automática partia "DESENVOLVEDOR FULL STACK" no meio.
                Aqui a quebra é escolhida: nome em cima, papel embaixo. */}
              <span>
                {PROFILE.fullName}
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{PROFILE.role}</span>
              </span>
            </p>

            {/* Quebras explícitas: text-balance decidia sozinho e deixava uma
              palavra órfã na linha do meio. */}
            {/* O h1 é o slot de maior peso da página: quem lê com leitor de
              tela e o Google recebem nome e papel. O texto grande continua
              igual na tela, como camada visual. */}
            <h1 className="font-bold leading-[1.02] tracking-[-0.04em] text-[clamp(2.75rem,6.4vw,5rem)]">
              <span className="sr-only">
                {PROFILE.fullName} — {PROFILE.role}
              </span>
              <span aria-hidden>
                <span className="block overflow-hidden pb-[0.08em]">
                  <span className="rise-in block">Do rascunho</span>
                </span>
                <span className="block overflow-hidden pb-[0.08em]">
                  <span
                    className="rise-in block"
                    style={{ animationDelay: "100ms" }}
                  >
                    ao <span className="text-brand">deploy</span>.
                  </span>
                </span>
              </span>
            </h1>

            <p
              className="fade-up-in mt-7 max-w-md text-pretty text-base leading-relaxed text-muted-foreground"
              style={{ animationDelay: "300ms" }}
            >
              Um arquivo dos produtos que eu desenhei, escrevi e coloquei no ar.
            </p>

            <div
              className="fade-up-in mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "380ms" }}
            >
              <a
                href="#projetos"
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-brand px-7 text-sm font-semibold text-brand-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Ver projetos
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
              <a
                href={PROFILE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-12 items-center gap-2 rounded-full border border-foreground/15 px-7 text-sm font-semibold transition-colors hover:border-foreground/40 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                GitHub
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            <p
              className="fade-up-in mt-10 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground"
              style={{ animationDelay: "460ms" }}
            >
              <span className="text-base font-bold tabular-nums text-foreground">
                <CountUp to={PROJECTS.length} />
              </span>{" "}
              projetos entregues · {YEARS[0]}—{YEARS[1]}
            </p>
          </div>

          <div
            // order-first no mobile: empilhada abaixo do texto, a foto era cortada
            // pela dobra. No topo e menor, ela cabe e o rosto vem primeiro.
            className="fade-up-in relative order-first mx-auto w-full max-w-54 sm:max-w-xs lg:order-0 lg:mx-0 lg:max-w-md lg:justify-self-end"
            style={{ animationDelay: "200ms" }}
          >
            {/* Moldura concêntrica deslocada: o acento sem precisar de bloco sólido */}
            <div
              aria-hidden
              className="absolute -inset-3 rounded-4xl border border-brand/40 sm:-inset-4 sm:rounded-[2.25rem]"
            />
            {/* O ring é o que separa a foto do fundo: a camisa preta se funde no
              tema escuro e, sem ele, o card perde a borda. */}
            <Picture
              src={PROFILE.photo}
              alt={`${PROFILE.fullName}, ${PROFILE.role.toLowerCase()}`}
              fetchPriority="high"
              width={1100}
              height={1100}
              // `sizes` aqui e a largura da FONTE, nao a da caixa. A foto e
              // quadrada e o quadro vira 4:5 a partir de sm: o object-cover
              // escala pela ALTURA e corta as laterais, entao uma caixa de
              // 448x560 consome 560px de largura de imagem, nao 448. Declarar
              // 448 fazia o navegador baixar 448 e ampliar 1,25x — era esse o
              // borrao, visivel ja em DPR 1.
              // Caixas medidas: 216x216 (quadrada, fator 1), 320x400 e 448x560
              // (fator 1,25). O corte e em 639px porque o `sm:` do Tailwind ja
              // vale em 640.
              sizes="(max-width: 639px) 216px, (max-width: 1023px) 400px, 560px"
              className="relative aspect-square w-full rounded-3xl sm:aspect-4/5 object-cover shadow-2xl shadow-black/30 ring-1 ring-foreground/15"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
