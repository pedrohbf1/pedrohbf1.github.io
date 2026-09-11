import type { Project } from "@/data/projects";
import { Picture } from "@/components/picture";
import { cn } from "@/lib/utils";

/**
 * Mock de screenshot gerado por CSS: enquanto não há imagem real, o card ainda
 * lê como uma tela de produto em miniatura. Três layouts alternados pelo índice
 * evitam que a parede fique repetitiva.
 */
function MockShot({ hue, variant }: { hue: number; variant: number }) {
  const tint = (l: number, c: number, a = 1) =>
    `oklch(${l} ${c} ${hue} / ${a})`;

  const surface = tint(0.32, 0.035, 0.9);
  const line = tint(0.68, 0.025, 0.35);
  const accent = tint(0.7, 0.16);

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        background: `linear-gradient(155deg, ${tint(0.24, 0.045)}, ${tint(0.14, 0.025)})`,
      }}
    >
      <div className="flex shrink-0 items-center gap-1 px-2 py-1.5">
        {[0.5, 0.3, 0.2].map((o) => (
          <span
            key={o}
            className="size-1 rounded-full"
            style={{ background: tint(0.8, 0.1, o) }}
          />
        ))}
      </div>

      {/* Dashboard: sidebar, cartões de métrica e gráfico de barras */}
      {variant === 0 && (
        <div className="flex min-h-0 flex-1 gap-1 p-1.5 pt-0">
          <div
            className="flex w-1/5 flex-col gap-1 rounded-sm p-1"
            style={{ background: surface }}
          >
            <div
              className="h-1 w-full rounded-full"
              style={{ background: accent }}
            />
            {[0.9, 0.7, 0.55, 0.4].map((w, i) => (
              <div
                key={i}
                className="h-1 rounded-full"
                style={{ width: `${w * 100}%`, background: line }}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="grid grid-cols-3 gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex h-4 flex-col justify-center gap-0.5 rounded-sm px-1"
                  style={{ background: surface }}
                >
                  <div
                    className="h-0.5 w-1/2 rounded-full"
                    style={{ background: line }}
                  />
                  <div
                    className="h-1 w-3/4 rounded-full"
                    style={{
                      background: i === 0 ? accent : tint(0.85, 0.02, 0.5),
                    }}
                  />
                </div>
              ))}
            </div>
            <div
              className="flex flex-1 items-end gap-0.5 rounded-sm p-1"
              style={{ background: surface }}
            >
              {[0.4, 0.65, 0.45, 0.85, 0.6, 1, 0.75, 0.5].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[1px]"
                  style={{
                    height: `${h * 100}%`,
                    background: i === 5 ? accent : tint(0.55, 0.06, 0.6),
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Landing: hero, linhas de texto, botão e cartões de feature */}
      {variant === 1 && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5 pt-0">
          <div
            className="flex h-1/2 flex-col justify-center gap-1 rounded-sm px-2"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${tint(0.42, 0.11)})`,
            }}
          >
            <div
              className="h-1.5 w-3/4 rounded-full"
              style={{ background: tint(0.98, 0.01, 0.9) }}
            />
            <div
              className="h-1 w-1/2 rounded-full"
              style={{ background: tint(0.98, 0.01, 0.5) }}
            />
            <div
              className="mt-0.5 h-2 w-1/4 rounded-sm"
              style={{ background: tint(0.98, 0.01, 0.95) }}
            />
          </div>
          <div className="grid flex-1 grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col justify-end gap-0.5 rounded-sm p-1"
                style={{ background: surface }}
              >
                <div
                  className="size-1.5 rounded-full"
                  style={{ background: accent }}
                />
                <div
                  className="h-0.5 w-full rounded-full"
                  style={{ background: line }}
                />
                <div
                  className="h-0.5 w-2/3 rounded-full"
                  style={{ background: line }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listagem / tabela */}
      {variant === 2 && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5 pt-0">
          <div className="flex items-center gap-1">
            <div
              className="h-1.5 w-1/4 rounded-full"
              style={{ background: tint(0.88, 0.02, 0.8) }}
            />
            <div
              className="ml-auto h-2 w-1/6 rounded-sm"
              style={{ background: accent }}
            />
          </div>
          <div
            className="flex flex-1 flex-col gap-0.5 rounded-sm p-1"
            style={{ background: surface }}
          >
            {[0.85, 0.6, 0.75, 0.5, 0.68].map((w, i) => (
              <div key={i} className="flex flex-1 items-center gap-1">
                <div
                  className="size-1 shrink-0 rounded-full"
                  style={{ background: i === 1 ? accent : line }}
                />
                <div
                  className="h-0.5 rounded-full"
                  style={{ width: `${w * 100}%`, background: line }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectThumb({
  project,
  index,
  className,
}: {
  project: Project;
  index: number;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "group/thumb relative aspect-4/3 w-full overflow-hidden rounded-lg border border-foreground/10 shadow-xl shadow-black/40 transition-transform duration-500 hover:scale-[1.05]",
        className,
      )}
    >
      {project.image ? (
        <Picture
          src={project.image}
          // Screenshot e conteudo, nao decoracao: quem usa leitor de tela (e o
          // Google Imagens) precisa saber que tela e essa.
          alt={`Tela do projeto ${project.name}: ${project.description}`}
          loading="lazy"
          decoding="async"
          // O figure ja segura a proporcao por CSS; estas medidas sao o cinto
          // de seguranca para o caso de o CSS demorar.
          width={640}
          height={480}
          sizes="(max-width: 640px) 254px, 318px"
          className="size-full object-cover"
        />
      ) : (
        <MockShot hue={project.hue} variant={index % 3} />
      )}

      <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/90 to-transparent p-2 pt-6 transition-transform duration-300 group-hover/thumb:translate-y-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-white">
          {project.name}
        </p>
      </figcaption>
    </figure>
  );
}
