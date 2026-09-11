import { Picture } from "@/components/picture";
import { ThemeToggle } from "@/components/theme-toggle";
import { PROFILE } from "@/data/profile";

const NAV = [
  { label: "Projetos", href: "#projetos" },
  { label: "Sobre", href: "#sobre" },
  { label: "Stacks", href: "#stacks" },
  { label: "Contato", href: "#contato" },
];

/**
 * A navegação do site é moldura, não conteúdo: por isso ela vive fora do
 * <main>, e não mais dentro do <section> do banner.
 *
 * Fica absoluta sobre o banner para o layout não mudar — o banner devolve os
 * mesmos 84px em padding-top. Mesmo container e mesmos paddings do conteúdo,
 * senão a marca no topo e o título saem de eixo.
 */
export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <a
          href="#"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <Picture
            src={PROFILE.logo}
            alt=""
            width={28}
            height={28}
            decoding="async"
            sizes="28px"
            className="size-7 rounded-md"
          />
          {PROFILE.wordmark}
        </a>

        <nav className="flex items-center gap-1" aria-label="Principal">
          <ul className="mr-2 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
