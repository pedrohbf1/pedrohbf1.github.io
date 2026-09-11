import { Etiqueta, Reveal } from "@/components/reveal";
import { PROJECTS } from "@/data/projects";

/** Amostra, não inventário: dentro do grupo, o mais usado vem primeiro. */
const GRUPOS: { label: string; techs: string[] }[] = [
  {
    label: "Interface",
    techs: [
      "React",
      "Next.js",
      "TypeScript",
      "Tailwind",
      "TanStack Query",
      "Styled Components",
      "shadcn/ui",
      "Three.js",
      "Babylon.js",
      "Recharts",
      "Vite",
    ],
  },
  {
    label: "Servidor e dados",
    techs: [
      "Node.js",
      "Bun",
      "Python",
      "Elysia",
      "Express",
      "FastAPI",
      "Prisma",
      "Sequelize",
      "SQLAlchemy",
      "PostgreSQL",
      "Supabase",
      "Firebase",
      "Zod",
      "Pydantic",
      "REST e OpenAPI",
    ],
  },
  {
    label: "Autenticação e segurança",
    techs: [
      "Better Auth",
      "Firebase Auth",
      "JWT",
      "Refresh tokens",
      "Sessões e cookies",
      "OAuth 2.0",
      "Login social",
      "2FA",
      "RBAC e permissões",
      "Hash com bcrypt",
      "Rate limiting",
      "CORS e CSRF",
    ],
  },
  {
    label: "Ferramentas e deploy",
    techs: [
      "Git e GitHub",
      "GitHub Pages",
      "Vercel",
      "Netlify",
      "Render",
      "Railway",
      "Fly.io",
      "Heroku",
      "Cloudflare Pages",
      "DigitalOcean",
      "Google Play Console",
    ],
  },
  {
    label: "DevOps e infraestrutura",
    techs: [
      "Docker",
      "Docker Compose",
      "GitHub Actions",
      "CI/CD",
      "Nginx",
      "Linux e VPS",
      "PM2",
      "Cron jobs",
      "Redis",
    ],
  },
  {
    label: "Integrações",
    techs: [
      "Stripe",
      "Mercado Pago",
      "OpenAI",
      "Gemini",
      "AWS S3",
      "jsPDF",
      "ExcelJS",
      "Web Speech API",
    ],
  },
  {
    label: "Qualidade e processo",
    techs: [
      "Vitest",
      "Playwright",
      "ESLint e Prettier",
      "Code review",
      "Git Flow",
      "Scrum e Kanban",
    ],
  },
  {
    label: "Mobile e desktop",
    techs: ["React Native", "Expo", "EAS Build", "Tauri", "Electron"],
  },
];

const PRINCIPIOS = [
  {
    titulo: "Termina em produção",
    texto:
      "Entregar, para mim, acaba com o sistema no ar — e continua depois dele. Tem coisa aqui rodando há mais de um ano, corrigida com quem usa todo dia, não com quem escreveu o requisito.",
  },
  {
    titulo: "Do banco ao pixel",
    texto:
      "Modelo os dados, escrevo a API e desenho a tela. É isso que faz um relatório fiscal nascer certo lá no schema, em vez de virar remendo na interface três meses depois.",
  },
  {
    titulo: "A stack é consequência",
    texto:
      "Tauri porque o financeiro precisava do sistema no desktop, atualizando sozinho. Expo porque a feira acontece no celular. Elysia porque a API tinha uma semana para existir. Nenhuma escolha foi por moda.",
  },
];

export function About() {
  return (
    <section
      id="sobre"
      className="relative isolate overflow-hidden border-t border-foreground/10 py-24 md:py-32"
    >
      {/* Contraponto do halo do banner: mesmo recurso, canto oposto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-60 -left-40 -z-10 size-160 rounded-full bg-brand/10 blur-[160px]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        {/* ── Manifesto ─────────────────────────────────────────── */}
        <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-3">
            <Reveal>
              <div className="lg:sticky lg:top-24">
                <Etiqueta>Sobre</Etiqueta>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-9">
            <Reveal>
              <h2 className="max-w-3xl text-balance font-bold leading-[1.05] tracking-[-0.035em] text-[clamp(1.875rem,4.6vw,3.25rem)]">
                Entrego o sistema inteiro:{" "}
                <span className="text-brand">banco, API, tela e deploy</span>.
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <p className="mt-9 max-w-3xl text-pretty text-xl leading-[1.6] text-foreground/90 md:text-[1.375rem]">
                Em pouco mais de três anos, {PROJECTS.length} projetos
                entregues: um ERP de mineração, o CRM de um loteamento, um app
                na Play Store, um catálogo com 3D rodando no navegador e um
                aplicativo desktop que se atualiza sozinho.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-x-14 gap-y-6 text-pretty leading-relaxed text-muted-foreground md:grid-cols-2">
              <Reveal delay={160}>
                <p>
                  Na maioria deles eu era o time inteiro: modelei o banco,
                  escrevi a API, desenhei a tela e coloquei em produção. É um
                  escopo que não deixa escolher só a parte confortável da stack
                  — e foi assim que ela cresceu, de Styled Components a
                  Tailwind, de Express a Elysia, da web para o mobile e o
                  desktop.
                </p>
              </Reveal>
              <Reveal delay={220}>
                <p>
                  Nada aqui nasceu de exercício de curso. Dar baixa num cheque,
                  fechar o caixa com o entregador, saber qual lote já foi
                  vendido, programar a produção da semana: é software que
                  alguém abre às sete da manhã e depende dele até as seis.
                </p>
              </Reveal>
            </div>
          </div>
        </div>

        {/* ── Stack ─────────────────────────────────────────────── */}
        <section
          id="stacks"
          aria-labelledby="stacks-titulo"
          className="mt-24 grid gap-y-10 border-t border-foreground/10 pt-14 lg:grid-cols-12 lg:gap-x-16 md:mt-32"
        >
          <div className="lg:col-span-3">
            <Reveal>
              {/* O rótulo É o título desta seção: sai como h2, sem mudar de
                  aparência. Antes era um <p> decorativo e a seção que mais
                  importa para busca não tinha heading nenhum. */}
              <Etiqueta as="h2" id="stacks-titulo">
                Stack
              </Etiqueta>
              <p className="mt-4 max-w-56 text-sm leading-relaxed text-muted-foreground">
                O que aparece com mais frequência no que eu construo — não a
                lista inteira.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-9">
            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {GRUPOS.map((grupo, i) => (
                <Reveal key={grupo.label} delay={i * 70}>
                  <h3 className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {grupo.label}
                  </h3>
                  <ul className="mt-4 divide-y divide-foreground/10 border-t border-foreground/10">
                    {grupo.techs.map((tech) => (
                      <li
                        key={tech}
                        className="py-2.5 text-[0.9375rem] tracking-tight"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Princípios ────────────────────────────────────────── */}
        <div className="mt-24 grid gap-y-10 border-t border-foreground/10 pt-14 lg:grid-cols-12 lg:gap-x-16 md:mt-32">
          <div className="lg:col-span-3">
            <Reveal>
              <Etiqueta>Como eu trabalho</Etiqueta>
            </Reveal>
          </div>

          <div className="lg:col-span-9">
            <ol className="grid gap-x-12 gap-y-10 md:grid-cols-3">
              {PRINCIPIOS.map((principio, i) => (
                <Reveal key={principio.titulo} delay={i * 90}>
                  <li className="border-t border-foreground/10 pt-5">
                    <span className="font-mono text-[0.625rem] tabular-nums tracking-[0.18em] text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight">
                      {principio.titulo}
                    </h3>
                    <p className="mt-2.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {principio.texto}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
