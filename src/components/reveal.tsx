import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Revela no scroll em vez de no mount: estas seções ficam abaixo da linha do
 * tempo e uma animação disparada no carregamento aconteceria fora da tela.
 * `motion-reduce` devolve o conteúdo imediatamente, sem depender da animação.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visivel ? `${delay}ms` : undefined }}
      className={cn(
        "transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        visivel
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Rótulo miúdo em mono com o ponto da marca — mesmo padrão do banner.
 *
 * `as` existe porque em algumas seções esse rótulo é o título de verdade da
 * seção, não enfeite: ali ele precisa sair como heading para o leitor de tela
 * e para o buscador, sem mudar nada na tela.
 */
export function Etiqueta({
  children,
  as: Tag = "p",
  id,
}: {
  children: ReactNode;
  as?: "p" | "h2" | "h3";
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className="flex items-center gap-2.5 font-mono text-[0.6875rem] font-normal uppercase tracking-[0.24em] text-muted-foreground"
    >
      <span className="size-1.5 rounded-full bg-brand" />
      {children}
    </Tag>
  );
}
