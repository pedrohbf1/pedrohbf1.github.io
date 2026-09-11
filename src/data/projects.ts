export type Project = {
  slug: string;
  name: string;
  /** ISO "AAAA-MM". Ordena por comparação de string e vira "Jul, 2024" na tela. */
  date: string;
  /** Ausente = projeto pessoal. `logo` é um caminho em /public (ex.: "/logos/acme.svg"). */
  company?: { name: string; logo?: string };
  /** Uma linha, ~90 caracteres. Passa disso e o line-clamp corta na segunda linha. */
  description: string;
  stack: string[];
  /** Só repositórios públicos: linkar um privado devolve 404 para quem visita. */
  repoUrl?: string;
  liveUrl?: string;
  /** "wip" marca o que ainda está em construção, para o card não prometer demais. */
  status?: "wip";
  /** Caminho do screenshot. Sem isso, o card cai num mock gerado por CSS. */
  image?: string;
  /** Matiz OKLCH (0–360) do mock e do monograma, para dar identidade a cada projeto. */
  hue: number;
};

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/** "2024-07" → "Jul, 2024" */
export function formatProjectDate(date: string) {
  const [year, month] = date.split("-").map(Number);
  return `${MONTHS[month - 1]}, ${year}`;
}

export function projectYear(date: string) {
  return Number(date.slice(0, 4));
}

/**
 * Abre a linha do tempo antes do primeiro projeto profissional. Não é um
 * Project: entra como uma coluna própria, mais simples que os cards, só para
 * marcar de onde veio. Edite o texto à vontade.
 */
export const PRELUDE = {
  label: "Antes daqui",
  title: "Projetos de estudo",
  description:
    "Bootcamp e projetos próprios — HTML, CSS e JavaScript até os primeiros apps em React.",
  period: "até 2023",
};

const PITANGUI = { name: "Pitangui Pedras", logo: "/logos/pitangui-pedras.jpg" };

export const PROJECTS: Project[] = [
  {
    slug: "jogo-numero-secreto",
    name: "Jogo do Número Secreto",
    date: "2023-02",
    description:
      "Jogo de adivinhação por voz: você fala o palpite e a página responde se é maior ou menor.",
    stack: ["HTML", "CSS", "JavaScript", "Web Speech API"],
    image: "/projects/jogo-numero-secreto.jpg",
    hue: 5,
  },
  {
    slug: "floricultura-boulevard",
    name: "Floricultura Boulevard",
    date: "2023-11",
    company: {
      name: "Floricultura Boulevard",
      logo: "/logos/floricultura-boulevard.jpg",
    },
    description:
      "Site de floricultura com catálogo de produtos, mapa da loja e dados no Firebase.",
    stack: ["React", "Firebase", "Styled Components"],
    repoUrl: "https://github.com/pedrohbf1/floriculturaBoulevard",
    image: "/projects/floricultura-boulevard.jpg",
    hue: 340,
  },
  {
    slug: "dactai",
    name: "Dactai RFM",
    date: "2024-04",
    company: { name: "Dactai", logo: "/logos/dactai.svg" },
    description:
      "Inteligência de clientes por RFM: segmenta a base, integra ERPs.",
    stack: ["Next.js", "Tailwind", "TanStack Query", "Zod"],
    liveUrl: "https://dactai.com.br",
    // Sem acesso ao produto: a imagem é uma recriação da tela, não um print real.
    image: "/projects/dactai.jpg",
    hue: 265,
  },
  {
    slug: "feedback-github-ia",
    name: "Feedback GitHub IA",
    date: "2025-01",
    description:
      "Analisa repositórios do GitHub com IA generativa e devolve o parecer em Markdown.",
    stack: ["React", "Express", "Gemini"],
    repoUrl: "https://github.com/pedrohbf1/feedback-github-ia-front",
    // Sem deploy no ar: tela montada a partir do App.tsx; só o texto é de exemplo.
    image: "/projects/feedback-github-ia.jpg",
    hue: 128,
  },
  {
    slug: "track-it",
    name: "Track It",
    date: "2023-07",
    description:
      "Rastreador de hábitos com metas por dia da semana e progresso diário em anel.",
    stack: ["React", "Styled Components", "Axios"],
    repoUrl: "https://github.com/pedrohbf1/Track-it",
    liveUrl: "https://track-it-seven.vercel.app",
    image: "/projects/track-it.jpg",
    hue: 200,
  },
  {
    slug: "sistema-de-entregas",
    name: "Sistema de Entregas",
    date: "2023-08",
    company: { name: "Paulo Lanches" },
    description:
      "Controle de entregas com baixa, fluxo por período e pagamento fechado por entregador.",
    stack: ["React", "Firebase", "Styled Components"],
    repoUrl: "https://github.com/pedrohbf1/Sistema-de-entregas",
    // Interface redesenhada sobre a lógica do sistema; não é a tela original.
    image: "/projects/sistema-de-entregas.jpg",
    hue: 40,
  },
  {
    slug: "diversao-offline",
    name: "Diversão Offline",
    date: "2025-04",
    company: { name: "Diversão Offline" },
    description:
      "App e painel da maior feira de board games do país: expositores, mapa, favoritos e push.",
    stack: ["React Native", "Expo", "Express", "PostgreSQL"],
    liveUrl: "https://play.google.com/store/apps/details?id=com.diversao.doff",
    image: "/projects/diversao-offline.jpg",
    hue: 285,
  },
  {
    slug: "dra-priscilla",
    name: "Dra. Priscilla Santos",
    date: "2024-01",
    company: { name: "Priscilla Santos", logo: "/logos/dra-priscilla.png" },
    description:
      "Site de profissional de saúde mental, com transtornos explicados, depoimentos e contato.",
    stack: ["React", "Vite", "Styled Components"],
    repoUrl: "https://github.com/pedrohbf1/draPriscila",
    image: "/projects/dra-priscilla.jpg",
    hue: 230,
  },
  {
    slug: "neobix",
    name: "Neobix",
    date: "2024-10",
    company: { name: "Neobix" },
    description:
      "Gestão de clínica: agenda, pacientes, caixa, planos e pagamentos via Mercado Pago.",
    stack: ["React", "Express", "PostgreSQL", "Mercado Pago"],
    image: "/projects/neobix.jpg",
    hue: 175,
  },
  {
    slug: "site-baia",
    name: "Site Baía",
    date: "2025-07",
    company: { name: "Baia Recepções e Eventos", logo: "/logos/baia.png" },
    description:
      "Site de espaço para casamentos e eventos, com álbum de fotos carregado sob demanda.",
    stack: ["React", "Vite", "Tailwind"],
    liveUrl: "https://baiarecepcoes.com.br",
    image: "/projects/site-baia.jpg",
    hue: 25,
  },
  {
    slug: "doff-us",
    name: "DOFF.Us",
    date: "2025-08",
    company: { name: "Diversão Offline" },
    description:
      "Rede de mesas de jogo: perfil com @, assinatura Stripe e endereço aprovado por moderação.",
    stack: ["React Native", "Expo", "Stripe", "Express"],
    liveUrl: "https://play.google.com/store/apps/details?id=com.diversao.doff",
    // Recriação das telas do app; dados e perfis são de exemplo.
    image: "/projects/doff-us.jpg",
    hue: 110,
  },
  {
    slug: "bandeirantes",
    name: "Bandeirantes",
    date: "2025-09",
    company: { name: "Bairro Bandeirantes", logo: "/logos/bandeirantes.png" },
    description:
      "Painel de acompanhamento de lotes, consumindo a API com TanStack Query.",
    stack: ["React", "TanStack Query", "shadcn/ui"],
    liveUrl: "https://bandeirantes.onrender.com",
    image: "/projects/bandeirantes.jpg",
    hue: 55,
  },
  {
    slug: "lead",
    name: "Lead",
    date: "2025-09",
    company: { name: "Bairro Bandeirantes", logo: "/logos/bandeirantes.png" },
    description:
      "CRM de leads com funil, agenda de contatos, mapa e geração de documentos em DOCX e PDF.",
    stack: ["React", "Express", "Prisma", "AWS S3"],
    // Recriação da tela do funil; leads e valores são de exemplo.
    image: "/projects/lead.jpg",
    hue: 250,
  },
  {
    slug: "contrato",
    name: "Contrato",
    date: "2025-10",
    company: { name: "Bairro Bandeirantes", logo: "/logos/bandeirantes.png" },
    description:
      "Gestão de vendas de lotes com notas fiscais, financeiro e exportação em PDF e Excel.",
    stack: ["React", "TanStack Query", "jsPDF", "ExcelJS"],
    // Sem acesso ao sistema: tela recriada, com contratos e valores de exemplo.
    image: "/projects/contrato.jpg",
    hue: 210,
  },
  {
    slug: "orcamentos",
    name: "Orçamentos",
    date: "2026-01",
    company: PITANGUI,
    description:
      "Central de orçamentos com caixa de entrada de atendimentos, importação e tarefas agendadas.",
    stack: ["React", "Elysia", "Prisma", "PostgreSQL"],
    // Clientes e valores são fictícios: o print real traz nomes e margens reais.
    image: "/projects/orcamentos.jpg",
    hue: 190,
  },
  {
    slug: "site-pitangui-pedras",
    name: "Site Pitangui Pedras",
    date: "2026-02",
    company: PITANGUI,
    description:
      "Catálogo de pedras com visualizador 3D dos produtos rodando direto no navegador.",
    stack: ["React", "Babylon.js", "Better Auth", "Tailwind"],
    liveUrl: "https://www.pitanguipedras.com.br",
    image: "/projects/site-pitangui-pedras.jpg",
    hue: 15,
  },
  {
    slug: "troca-de-cheque",
    name: "Troca de Cheque",
    date: "2026-03",
    company: PITANGUI,
    description:
      "Controle de cheques em aplicativo desktop, com baixa de títulos e atualização automática.",
    stack: ["React", "Tauri", "Elysia", "Prisma"],
    // Recriação da carteira de cheques; emitentes e valores são de exemplo.
    image: "/projects/troca-de-cheque.jpg",
    hue: 300,
  },
  {
    slug: "granello-mineracao",
    name: "Granello Mineração",
    date: "2026-04",
    company: { name: "Granello Mineração", logo: "/logos/granello.png" },
    description:
      "ERP de mineração: DRE, caixa projetado, estoque de blocos, faturamento e entregas.",
    stack: ["React", "Elysia", "Prisma", "Recharts"],
    // Clientes e valores fictícios: o print real traz nomes de clientes.
    image: "/projects/granello-mineracao.jpg",
    hue: 160,
  },
  {
    slug: "destrava",
    name: "Destrava",
    date: "2026-06",
    company: { name: "Destrava", logo: "/logos/destrava.png" },
    description:
      "Smart links com roteamento por loja, deep link no app e cobrança por clique via Stripe.",
    stack: ["React", "Elysia", "Prisma", "Stripe"],
    liveUrl: "https://usedestrava.com.br",
    image: "/projects/destrava.jpg",
    hue: 88,
  },
  {
    slug: "programacao-de-producao",
    name: "Programação de Produção",
    date: "2026-09",
    company: PITANGUI,
    description:
      "Quadro de programação de produção, com API em Elysia documentada via OpenAPI.",
    stack: ["React", "Elysia", "Prisma", "PostgreSQL"],
    // Nomes dos operadores trocados; o resto do quadro segue a tela real.
    image: "/projects/programacao-de-producao.jpg",
    hue: 60,
  },
  {
    slug: "disparo-de-ofertas",
    name: "Disparo de Ofertas",
    date: "2026-09",
    description:
      "API de disparo de ofertas em Bun e Elysia, com OpenAPI e Postgres via Prisma.",
    stack: ["Bun", "Elysia", "Prisma", "Zod"],
    status: "wip",
    hue: 320,
  },
];
