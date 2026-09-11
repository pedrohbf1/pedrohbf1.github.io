import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";

import { Picture } from "@/components/picture";
import { ProjectThumb } from "@/components/project-thumb";
import {
  formatProjectDate,
  PRELUDE,
  projectYear,
  PROJECTS,
  type Project,
} from "@/data/projects";
import { cn } from "@/lib/utils";

// A linha do tempo corre do mais antigo para o mais recente.
const TIMELINE = [...PROJECTS].sort((a, b) => a.date.localeCompare(b.date));
const YEARS = [...new Set(TIMELINE.map((p) => projectYear(p.date)))];

/** Folga à direita para o último card não encostar na borda ao fim do trajeto. */
const END_PADDING = 120;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Logo da empresa; sem arquivo, cai num monograma na cor do projeto. */
function CompanyBadge({ project }: { project: Project }) {
  const { company, hue } = project;

  if (!company) {
    return (
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
        Projeto pessoal
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      {company.logo ? (
        <Picture
          src={company.logo}
          alt=""
          loading="lazy"
          decoding="async"
          width={40}
          height={40}
          sizes="20px"
          className="size-5 shrink-0 rounded object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-5 shrink-0 place-items-center rounded font-mono text-[0.5625rem] font-bold text-white"
          style={{ background: `oklch(0.5 0.15 ${hue})` }}
        >
          {company.name.charAt(0)}
        </span>
      )}
      <span className="truncate font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
        {company.name}
      </span>
    </span>
  );
}

/**
 * Quem NÃO recebe o efeito de rolagem presa: quem pediu menos movimento, quem
 * aponta com o dedo, e telas estreitas. Lista separada por vírgula = OU.
 */
const QUERY_FAIXA_NATIVA =
  "(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 767px)";

export function ProjectTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const yearRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const activeRef = useRef(-1);

  // No celular a faixa rola NATIVA. O scroll-jack (ler o scroll vertical na
  // thread principal e escrever translate horizontal) disputa com a rolagem
  // por toque, que o navegador roda no compositor: os dois saem de sincronia
  // e a seção engasga. Fora do desktop com mouse, portanto, nada de sequestro
  // de rolagem — o dedo arrasta a faixa direto, que é liso porque nunca passa
  // pelo JS. Vale também para quem pediu menos movimento.
  //
  // A vírgula em matchMedia é OU: qualquer uma das três liga a faixa nativa.
  const [faixaNativa, setFaixaNativa] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(QUERY_FAIXA_NATIVA).matches,
  );

  // Rotacionar o aparelho ou redimensionar a janela troca de modo na hora.
  useEffect(() => {
    const mq = window.matchMedia(QUERY_FAIXA_NATIVA);
    const aoMudar = () => setFaixaNativa(mq.matches);
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  // Quanto a trilha precisa andar na horizontal — vira também a altura extra
  // da seção, para o mapeamento rolagem→deslocamento ficar 1:1.
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    if (faixaNativa) return;

    const measure = () => {
      const track = trackRef.current;
      const last = cardRefs.current[TIMELINE.length - 1];
      if (!track || !last) return;

      // Precisamos da borda direita do ÚLTIMO card em coordenadas de layout, e
      // as medidas óbvias todas mentem aqui: `scrollWidth` soma os 24px que a
      // linha do eixo projeta além da última coluna (ela é `absolute
      // -inset-x-6`); `offsetWidth` devolve a largura do container, porque a
      // grade é bloco e as colunas transbordam; e `offsetLeft` perde o padding
      // que alinha a trilha ao cabeçalho, já que o `will-change: transform`
      // faz o navegador eleger a própria trilha como offsetParent.
      //
      // Então zeramos o transform e lemos o rect. É síncrono — nenhum quadro é
      // pintado entre zerar e restaurar, então não pisca.
      const previous = track.style.transform;
      track.style.transform = "none";
      const contentRight = last.getBoundingClientRect().right;
      track.style.transform = previous;

      // A folga do fim não pode passar do espaço livre à direita do card, ou o
      // trajeto empurra o último card para fora pela esquerda em telas estreitas.
      const endGap = Math.min(END_PADDING, window.innerWidth * 0.25);

      setDistance(Math.max(0, contentRight - window.innerWidth + endGap));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [faixaNativa]);

  useEffect(() => {
    if (faixaNativa) return;

    let frame = 0;

    // Escrevemos direto no DOM em vez de usar estado: um setState por quadro de
    // rolagem re-renderiza a lista inteira e engasga.
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      const scrollable = section.offsetHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? clamp(-section.getBoundingClientRect().top / scrollable, 0, 1)
          : 0;

      track.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${Math.max(progress, 0.015)})`;
      }

      // O destaque só é reescrito quando o card ativo muda, não a cada quadro.
      const active = Math.round(progress * (TIMELINE.length - 1));
      if (active !== activeRef.current) {
        cardRefs.current[activeRef.current]?.removeAttribute("data-active");
        nodeRefs.current[activeRef.current]?.removeAttribute("data-active");
        cardRefs.current[active]?.setAttribute("data-active", "true");
        nodeRefs.current[active]?.setAttribute("data-active", "true");

        // Marca-d'água: todos os anos ficam empilhados e só trocamos qual está
        // visível, o que dá um crossfade real em vez de um corte seco.
        const yearIndex = YEARS.indexOf(projectYear(TIMELINE[active].date));
        yearRefs.current.forEach((node, i) =>
          node?.style.setProperty("opacity", i === yearIndex ? "1" : "0"),
        );

        activeRef.current = active;
        if (counterRef.current) {
          counterRef.current.textContent = String(active + 1).padStart(2, "0");
        }
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [distance, faixaNativa]);

  // Trocar de modo (rotacionar o aparelho, por exemplo) deixaria para trás o
  // translate e o destaque que o modo preso escreveu direto no DOM — na faixa
  // nativa isso apareceria como uma trilha deslocada e um card aceso à toa.
  useEffect(() => {
    if (!faixaNativa) return;
    if (trackRef.current) trackRef.current.style.transform = "";
    cardRefs.current[activeRef.current]?.removeAttribute("data-active");
    nodeRefs.current[activeRef.current]?.removeAttribute("data-active");
    activeRef.current = -1;
  }, [faixaNativa]);

  /**
   * Grade de 3 faixas: card, eixo, data. A faixa do card é `1fr`, então todas
   * as colunas ficam com a mesma altura e o eixo cai na mesma linha em todas —
   * sem altura mágica que quebra quando uma descrição ocupa duas linhas.
   */
  const track = (
    <div
      ref={trackRef}
      className={cn(
        "grid grid-flow-col auto-cols-max grid-rows-[1fr_auto_1fr] will-change-transform",
        // O vão entre colunas encolhe no carrossel por uma razão de conta: com
        // o card centralizado, o vizinho só aparece se a metade que sobra de
        // cada lado for maior que o vão. Com os 48px do desktop, o próximo
        // card caía fora da tela e o carrossel parecia não ter continuação.
        faixaNativa ? "gap-x-4 sm:gap-x-12" : "gap-x-12",
      )}
    >
      {/* Prólogo na coluna 1: sem miniatura, sem empresa e com nó vazado — a
          diferença de peso é o que o marca como "antes", não como projeto. */}
      <div
        style={{ gridColumn: 1, gridRow: 3 }}
        className="w-56 self-start pt-6"
      >
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
          {PRELUDE.label}
        </p>
        <h3 className="mt-2 text-base font-semibold tracking-tight text-foreground/80">
          {PRELUDE.title}
        </h3>
        <p className="mt-1.5 text-pretty text-[0.8125rem] leading-snug text-muted-foreground">
          {PRELUDE.description}
        </p>
      </div>
      <div
        style={{ gridColumn: 1, gridRow: 2 }}
        className="relative flex h-9 items-center gap-2.5"
      >
        {/* Tracejado: antes deste ponto a linha do tempo não é precisa. */}
        <div
          aria-hidden
          className="absolute -inset-x-6 top-1/2 border-t border-dashed border-foreground/25"
        />
        <span className="relative size-2 shrink-0 rounded-full border-2 border-foreground/40 bg-background" />
        <span className="relative bg-background pr-2 font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground">
          {PRELUDE.period}
        </span>
      </div>

      {TIMELINE.map((project, i) => {
        const above = i % 2 === 0;
        // Prefere o site no ar; sem ele, o repositório, se for público.
        const link = project.liveUrl ?? project.repoUrl;
        // Divisor de ano: marca a transição, então só existe ENTRE colunas —
        // no primeiro item não há ano anterior para separar.
        const yearBoundary =
          i > 0 &&
          projectYear(TIMELINE[i - 1].date) !== projectYear(project.date);

        return (
          <Fragment key={project.slug}>
            <article
              ref={(node) => {
                cardRefs.current[i] = node;
              }}
              style={{ gridColumn: i + 2, gridRow: above ? 1 : 3 }}
              className={cn(
                "group",
                faixaNativa
                  ? // 86vw deixa um pedaço do próximo card à mostra — é esse
                    // corte que diz "tem mais para o lado" sem precisar de
                    // seta nem de barra. Acima de sm volta à largura normal,
                    // porque aí a faixa nativa é a de quem pediu menos
                    // movimento, num desktop, e 86vw seria um card gigante.
                    "carrossel-item w-[85vw] sm:w-80"
                  : "w-64 sm:w-80",
                // O esmaecimento só existe onde existe card ativo. Na faixa
                // nativa ninguém é o ativo, então todos ficariam apagados ao
                // mesmo tempo — apagado sem destaque nenhum é só apagado.
                //
                // No modo preso o piso é 75%, não os 40% de antes: a 40% o
                // texto de conteúdo compunha #464646 sobre #0a0a0a, contraste
                // 2,09, menos da METADE do mínimo AA. O efeito de foco não se
                // perdeu, desceu para a imagem, no ProjectThumb abaixo.
                !faixaNativa &&
                  "opacity-75 transition-opacity duration-500 data-active:opacity-100",
                above ? "self-end pb-6" : "self-start pt-6",
              )}
            >
              <ProjectThumb
                project={project}
                index={i}
                className={cn(
                  "aspect-video shadow-lg",
                  // 60% dentro de um card a 75% dá ~45% na tela: quase o mesmo
                  // peso visual que o card inteiro tinha a 40%, sem levar o
                  // texto junto. Na faixa nativa, tudo em cor cheia.
                  !faixaNativa &&
                    "opacity-60 transition-opacity duration-500 group-data-active:opacity-100",
                )}
              />

              <div className="mt-3 flex items-center gap-2.5">
                <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-3 w-px shrink-0 bg-foreground/15" />
                <CompanyBadge project={project} />
              </div>

              {/* flex-wrap: sem ele os selos espremem o título e o nome quebra
                  no meio da palavra em vez de o selo descer de linha. */}
              <h3 className="mt-2 flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-sm hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                  >
                    {project.name}
                    <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </a>
                ) : (
                  <>
                    {project.name}
                    {/* Repositório privado: um link aqui devolveria 404 a quem
                        visita, então o selo é mais honesto que uma seta morta. */}
                    <span
                      title="Repositório privado"
                      className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      <Lock className="size-2.5" />
                      Privado
                    </span>
                  </>
                )}
                {project.status === "wip" && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/40 px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-brand">
                    Em construção
                  </span>
                )}
              </h3>

              {/* line-clamp trava em 2 linhas: uma descrição longa demais
                  esticaria a faixa e desalinharia o eixo de todas as colunas. */}
              <p className="mt-1.5 line-clamp-2 text-pretty text-[0.8125rem] leading-snug text-muted-foreground">
                {project.description}
              </p>

              {/* Sem o /70: a transparencia do texto MULTIPLICA com a do card,
                  entao a stack dava 4,20 no card ativo e 2,83 no inativo. Sem
                  ela fica 7,6 e 4,7 — os dois passam em AA, e a hierarquia
                  continua pelo tamanho e pelo tom do muted-foreground. */}
              <p className="mt-2.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                {project.stack.join(" · ")}
              </p>
            </article>

            {/* Eixo: cada segmento avança metade da lacuna de cada lado, então
                os traços se encontram e formam uma linha contínua. A data fica
                sobre a linha, com fundo opaco para o traço não atravessá-la. */}
            <div
              style={{ gridColumn: i + 2, gridRow: 2 }}
              className="relative flex h-9 items-center gap-2.5"
            >
              <div
                aria-hidden
                className="absolute -inset-x-6 top-1/2 h-px bg-foreground/15"
              />
              {yearBoundary && (
                <div
                  aria-hidden
                  className="absolute -left-6 h-9 w-px bg-brand/45"
                />
              )}
              {/* O nó é irmão do card, não filho, então não alcança o `group`
                  dele — recebe o data-active por ref junto com o card. */}
              <span
                ref={(node) => {
                  nodeRefs.current[i] = node;
                }}
                className="relative size-2 shrink-0 rounded-full bg-brand ring-4 ring-background transition-transform duration-500 data-active:scale-150"
              />
              <time
                dateTime={project.date}
                className="relative bg-background pr-2 font-mono text-[0.6875rem] tracking-[0.12em] text-foreground/70"
              >
                {formatProjectDate(project.date)}
              </time>
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  // Cabeçalho em uma linha só: com os cards alternando acima e abaixo do eixo,
  // a faixa central precisa do dobro da altura, e ela sai daqui.
  const header = (
    <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between gap-6 px-6 md:px-10">
      <div className="flex items-baseline gap-4">
        <h2 className="font-bold tracking-[-0.03em] text-[clamp(1.375rem,2.6vw,2rem)]">
          {TIMELINE.length} projetos, em ordem.
        </h2>
        <p className="hidden items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.24em] text-muted-foreground md:flex">
          <span className="size-1.5 rounded-full bg-brand" />
          Linha do tempo
        </p>
      </div>

      <p className="hidden shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground sm:flex">
        Role para avançar
        <ArrowRight className="size-3.5" />
      </p>
    </div>
  );

  // Sem rolagem presa: vira uma faixa horizontal comum, arrastável com o dedo.
  if (faixaNativa) {
    return (
      <section id="projetos" className="border-t border-foreground/10 py-20">
        {header}
        {/* No celular isto é um carrossel: um projeto por vez, com encaixe.
            O encaixe é CSS puro — continua sendo o compositor que rola, que é
            justamente o que destravou a seção no toque. */}
        <div className="carrossel mt-12 overflow-x-auto px-6 pb-8 md:px-10">
          {track}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="projetos"
      className="relative border-t border-foreground/10"
      // A altura extra é exatamente o trajeto horizontal: enquanto o miolo fica
      // preso (sticky), a rolagem vertical vira deslocamento lateral.
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        {/* Ano gigante ao fundo, sangrando nas bordas. Os anos ficam todos
            empilhados e só a opacidade troca — daí o crossfade. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 grid place-items-center"
        >
          {YEARS.map((year, i) => (
            <span
              key={year}
              ref={(node) => {
                yearRefs.current[i] = node;
              }}
              // `will-change: opacity` põe cada ano na própria camada: o
              // crossfade vira composição, em vez de repintar uma área do
              // tamanho da tela a cada troca de ano.
              className="col-start-1 row-start-1 select-none font-black leading-none tracking-tighter text-foreground/5 transition-opacity duration-700 will-change-[opacity] text-[clamp(11rem,32vw,28rem)]"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {year}
            </span>
          ))}
        </div>

        {header}

        {/* A trilha sangra até a borda, mas começa no MESMO eixo do cabeçalho:
            o padding acompanha onde o container max-w-6xl abriria. */}
        <div className="mt-8 pl-6 pr-6 md:pl-[max(2.5rem,calc((100%-72rem)/2+2.5rem))] md:pr-10">
          {track}
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-6xl items-center gap-5 px-6 md:px-10">
          <p className="shrink-0 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground">
            <span ref={counterRef} className="font-bold text-foreground">
              01
            </span>
            {" / "}
            {String(TIMELINE.length).padStart(2, "0")}
          </p>
          <div className="h-px flex-1 overflow-hidden bg-foreground/15">
            <div
              ref={progressRef}
              className="h-full origin-left bg-brand"
              style={{ transform: "scaleX(0.015)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
