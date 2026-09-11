import { ArrowUp } from "lucide-react";

import { Picture } from "@/components/picture";
import { PROFILE } from "@/data/profile";

const LINKS = [
  { label: "Projetos", href: "#projetos" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export function Footer() {
  return (
    <footer className="border-t border-foreground/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:px-10">
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

        <nav className="md:ml-auto">
          <ul className="flex flex-wrap items-center gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-5 md:ml-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground">
            © {new Date().getFullYear()} {PROFILE.fullName}
          </p>
          <a
            href="#"
            aria-label="Voltar ao topo"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-foreground/15 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ArrowUp className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
