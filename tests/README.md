# Testes — dono: Sentinela (QA)

E2E com Playwright. WebKit e o navegador principal: e o motor do Safari e o
mesmo do Portal do canvas, entao o que passa aqui bate com o que se ve no
portal. Chromium roda junto so para pegar diferenca de motor.

## Comandos

| Comando | O que faz |
| --- | --- |
| `bun run test:e2e` | Suite inteira (4 projetos) |
| `bun run test:e2e:safari` | So WebKit, nos tres breakpoints |
| `bun run test:e2e:ui` | Modo interativo, bom para depurar |
| `bun run test:e2e:update` | **Regrava os baselines visuais** |
| `bun run test:e2e:seo` | So o SEO, no build de producao |
| `bun run test:e2e:report` | Abre o relatorio HTML da ultima rodada |
| `bun run test:types` | Typecheck so dos testes |

O `webServer` reaproveita o dev server que ja estiver na 5173; se nao houver,
ele sobe um.

## Breakpoints

`webkit-375` (iPhone SE), `webkit-768` (iPad), `webkit-1440` (desktop) e
`chromium-1440`.

## Arquivos

- `hero.spec.ts` — QA funcional do hero: console limpo, sem 404, imagens
  decodificando, ancoras, tema claro/escuro, `prefers-reduced-motion`.
- `visual-baseline.spec.ts` — referencias visuais.
- `seo.spec.ts` — as 12 checagens de SEO do Farol + 3 minhas, sempre no HTML
  CRU do build de producao.
- `helpers.ts` — coleta de erro de console/rede, espera de imagem, medicao de
  overflow e congelamento de animacao para screenshot.

## Os dois servidores

O `webServer` do Playwright sobe (ou reaproveita) dois:

- **5173**, dev — alvo de `hero.spec.ts` e `visual-baseline.spec.ts`.
- **4173**, preview de producao — alvo de `seo.spec.ts`. O comando dele e
  `build && scripts/seo-build.ts && vite preview`, porque o pre-render de SEO
  so existe depois desses dois passos. Quando a Forja plugar o `seo-build` no
  `bun run build`, da para encurtar isso.

Para rodar a suite funcional contra o build de producao (confere que o
pre-render nao quebrou a interatividade):

```
E2E_BASE_URL=http://localhost:4173 bun run test:e2e
```

## Por que o SEO e testado no HTML cru

O pre-render existe para quem NAO roda JS: o robo do Google na primeira
passada, e o gerador de preview de link do WhatsApp, LinkedIn, Telegram,
Slack e Discord. Se a gente medisse no DOM do navegador, o teste passaria
igual mesmo sem pre-render nenhum — o JS teria montado tudo. Por isso
`seo.spec.ts` usa `fetch` e regex em cima do HTML que o servidor entrega.

**Armadilha do vite preview:** ele responde 200 com o `index.html` para
QUALQUER caminho. Testar so o status de `/robots.txt` da falso positivo. Por
isso o teste 10 confere content-type E corpo.

## Baseline visual — leia antes de regravar

`tests/__baseline__/` guarda as referencias de **antes** da otimizacao de
imagens. E com elas que se prova que a compressao da Forja nao comeu a pedra e
a textura das fotos. Elas sao versionadas de proposito.

**Nao rode `test:e2e:update` so para "fazer o teste passar".** Se um baseline
quebrou depois de mexer em imagem, a diferenca e o resultado do teste: abra o
relatorio (`bun run test:e2e:report`), olhe o diff e decida. So regrave quando
a mudanca visual for intencional e aprovada.

Cobertura do baseline: hero, foto do Pedro recortada (onde a perda de
qualidade aparece primeiro), cada secao (`#projetos`, `#sobre`, `#contato`),
pagina inteira, e hero + pagina no tema escuro.

## Notas de quem escreveu

- Imagem `loading="lazy"` fora da dobra fica `complete=false` de proposito —
  por isso `waitForImages`/`brokenImages` ignoram as adiadas. Sem isso a espera
  trava.
- O scroll e suave: depois de clicar numa ancora e preciso esperar assentar,
  senao a medida pega o meio do caminho.
- A ultima secao (`#contato`) nunca encosta no topo da tela — nao ha conteudo
  suficiente embaixo dela. O helper aceita "chegou no fim da pagina".
- O menu do topo e `hidden sm:flex`: abaixo de 640px os testes de ancora pulam
  e entra o teste especifico do layout estreito.
