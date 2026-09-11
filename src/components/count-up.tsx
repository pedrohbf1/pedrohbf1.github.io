import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * Mostra `to` contando de 0 até o valor, em CSS.
 *
 * O número que fica no DOM é sempre o final: é esse texto que o pré-render de
 * SEO serializa, que o Google lê na primeira passada e que quem está sem JS
 * enxerga. A contagem roda num pseudo-elemento por cima, então nenhum valor do
 * meio da animação chega a ser escrito no HTML — antes o dist saía anunciando
 * "7 projetos entregues" e o build mudava a cada rodada.
 *
 * Sem JS por frame também não há re-render a 60fps nem timer para cancelar.
 */
export function CountUp({
  to,
  duration = 1400,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("count-up tabular-nums", className)}
      style={
        {
          "--count-to": to,
          "--count-duration": `${duration}ms`,
        } as CSSProperties
      }
    >
      {to}
    </span>
  );
}
