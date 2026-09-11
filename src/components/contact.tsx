import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";

import { Etiqueta, Reveal } from "@/components/reveal";
import { CONTATO, PROFILE } from "@/data/profile";

/* As marcas de GitHub e LinkedIn saíram do lucide na v1: vão inline, para não
   trazer um pacote de ícones inteiro por causa de dois desenhos. */
function IconeGitHub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.2 11.16.6.1.82-.25.82-.56v-2.17c-3.34.7-4.04-1.6-4.04-1.6-.55-1.36-1.34-1.72-1.34-1.72-1.09-.72.08-.71.08-.71 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.8 1.28 3.49.98.1-.76.42-1.28.76-1.58-2.67-.29-5.47-1.3-5.47-5.8 0-1.28.47-2.33 1.23-3.15-.12-.29-.53-1.48.12-3.09 0 0 1-.31 3.3 1.2a11.6 11.6 0 0 1 6 0c2.28-1.51 3.29-1.2 3.29-1.2.65 1.61.24 2.8.12 3.09.77.82 1.23 1.87 1.23 3.15 0 4.51-2.81 5.5-5.49 5.79.43.36.82 1.09.82 2.2v3.26c0 .31.22.67.83.56A12.02 12.02 0 0 0 24 12.29C24 5.78 18.63.5 12 .5Z" />
    </svg>
  );
}

function IconeLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const CANAIS = [
  {
    label: "WhatsApp",
    valor: CONTATO.whatsappLabel,
    href: CONTATO.whatsapp,
    Icone: MessageCircle,
  },
  {
    label: "LinkedIn",
    valor: CONTATO.linkedinLabel,
    href: CONTATO.linkedin,
    Icone: IconeLinkedIn,
  },
  {
    label: "GitHub",
    valor: PROFILE.githubLabel,
    href: PROFILE.githubUrl,
    Icone: IconeGitHub,
  },
];

export function Contact() {
  return (
    <section
      id="contato"
      className="relative isolate overflow-hidden border-t border-foreground/10 py-24 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 -z-10 size-160 rounded-full bg-brand/10 blur-[160px]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-3">
            <Reveal>
              <Etiqueta>Contato</Etiqueta>
            </Reveal>
          </div>

          <div className="lg:col-span-9">
            <Reveal>
              <h2 className="max-w-2xl text-balance font-bold leading-[1.05] tracking-[-0.035em] text-[clamp(1.875rem,4.6vw,3.25rem)]">
                Me conta o que está{" "}
                <span className="text-brand">travando</span>.
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Sistema novo, produto para tirar do papel ou operação que ainda
                vive na planilha. Me manda o problema que eu respondo com o
                caminho.
              </p>
            </Reveal>

            {/* O e-mail é o destino principal: entra em tamanho de título, não
                escondido num botão. */}
            <Reveal delay={140}>
              <a
                href={`mailto:${CONTATO.email}`}
                className="group mt-10 inline-flex max-w-full items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                <Mail className="size-6 shrink-0 text-brand md:size-7" />
                <span className="truncate font-bold tracking-[-0.03em] underline decoration-foreground/20 decoration-2 underline-offset-[0.3em] transition-colors group-hover:decoration-brand text-[clamp(1.25rem,3.4vw,2.25rem)]">
                  {CONTATO.email}
                </span>
                <ArrowUpRight className="size-5 shrink-0 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:size-6" />
              </a>
            </Reveal>

            <Reveal delay={200}>
              <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-3">
                {CANAIS.map(({ label, valor, href, Icone }) => (
                  <li key={label} className="bg-background">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-full items-center gap-4 p-5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <Icone className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                      <span className="min-w-0">
                        <span className="block font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                          {label}
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium">
                          {valor}
                        </span>
                      </span>
                      <ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={260}>
              <p className="mt-8 flex items-center gap-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
                </span>
                {CONTATO.local}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
