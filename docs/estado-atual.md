# Estado atual do Sabli

Este documento descreve o ponto atual para continuar o trabalho. Não substitui as outras referências: [design system](design-system.md), [arquitetura](frontend-architecture.md), [telas](screens.md), [API futura](future-api-integration.md) e [backend](backend.md).

## Em uma frase

O Sabli é a plataforma SaaS da Emilabs para restaurantes e pizzarias. O frontend tem dois modos: **DEMO** (fixtures e sessão volátil) e **API** (login real, sessão e contexto de estabelecimento). A API Java persiste o ciclo operacional até o caixa.

Slogan: **Seu negócio inteiro. Em um só lugar.**

## O que já é verdade

- Stack: React 19, Vite, TypeScript estrito, Tailwind 4, React Router 8, TanStack Query, Zustand, React Hook Form + Zod, Vitest e Playwright.
- Três superfícies: painel administrativo (`BusinessLayout`), cozinha (`/cozinha`) e atendimento do garçom (`/atendimento`).
- Modo definido por `VITE_SABLI_MODE` (`demo` ou `api`), validado na subida. Erro HTTP **não** volta ao DEMO.
- DEMO: leituras em `SabliDataSource`, escritas em `src/shared/demo/session.ts`. Sem API, sem PostgreSQL.
- API: cliente HTTP central (`src/shared/api/http-client.ts`), access token só em memória, refresh no cookie HttpOnly, rotas `/entrar` e `/selecionar-estabelecimento`. Catálogo, mesas, pedidos, KDS, comandas e caixa já consomem o PostgreSQL.
- Dinheiro entra e sai em centavos inteiros. A tela formata com `formatBRL`.
- Tema claro, escuro ou sistema em `localStorage` (`sabli-theme`).
- Preferências de interface (sidebar, estabelecimento DEMO, módulos visíveis) ficam no Zustand, chave `sabli-ui`. Tokens **não** entram aí.
- Identidade visual: coral `#FF5A3C`, roxo `#6C4CF5`, lime `#B9F34A`, grafite `#28212C`, creme `#FFF9F5`, Nunito Sans. Sem degradê. Logo não se redesenha.

## O que esta versão não é

Não há pagamento de adquirente, fiscal, delivery, reservas completas nem sincronização instantânea de KDS. No modo API, catálogo, mesas, PDV, pedidos, cozinha, comandas e caixa já consomem o backend. Relatórios e equipe ainda avisam que o módulo não está disponível. PIX e cartão são declaração manual. Esconder um módulo em Configurações só altera a navegação da demonstração.

## Onde o código vive

```text
src/                 SPA React (DEMO + autenticação API)
apps/api/            identidade, catálogo, mesas, pedidos, KDS, comandas e caixa
.github/workflows/   CI
```

Componentes visuais não importam fixtures e não chamam `fetch`. Dados reais passam pelo cliente HTTP e pela sessão em memória.

## Telas

| Rota | Situação | Observação |
| ---- | -------- | ---------- |
| `/entrar` | Nova | Login real no modo API. No DEMO redireciona ao início. |
| `/selecionar-estabelecimento` | Nova | Lista orgs/lojas de `/me` e valida `POST /me/context`. |
| `/inicio` | Fundação | DEMO: indicadores de exemplo. API: contexto autorizado, sem fixtures. |
| `/mesas` | Fundação | DEMO operacional. API: mapa, abertura, conta, quitação e encerramento reais. |
| `/pedidos` | Polida | DEMO operacional. API: lista persistida, detalhe e produção. |
| `/pdv` | Fundação | DEMO operacional. API: rascunho volátil e confirmação no servidor. |
| `/pdv/montar-pizza` | Fundação | DEMO operacional. API: cotação do servidor e inclusão no rascunho. |
| `/comandas` | Polida | DEMO operacional. API: contas, pagamentos e saldo reais. |
| `/produtos` | Polida | DEMO operacional. API: catálogo real, busca, filtros, CRUD e pizza. |
| `/cozinha` | Polida | DEMO operacional. API: fila persistida, avanço com versão. |
| `/caixa` | Fundação | DEMO operacional. API: sessão, movimentos e quitação reais. |
| `/relatorios` | Fundação | DEMO ilustrativo. API: não ligado. |
| `/equipe` | Fundação | DEMO local. API: não ligado. |
| `/configuracoes` | Fundação | DEMO: módulos visíveis. API: só aparência. |
| `/perfil` | Nova | DEMO: sessão volátil. API: dados de `/me`, sem troca de senha. |
| `/atendimento/*` | Fundação | DEMO operacional. API: não ligado. |
| `/design-system` | Dev | Inspeção do Sabli UI. Só existe em `npm run dev`. |

Estabelecimento de exemplo no DEMO: Pizzaria do Centro. Operadora: Mariana Alves.

## Como o estado se divide

| O quê | Onde | Persiste? |
| ----- | ---- | --------- |
| Tema | `sabli-theme` | Sim, no navegador |
| Sidebar, estabelecimento DEMO, módulos | Zustand `sabli-ui` | Sim, no navegador |
| Access token | memória (`token-memory.ts`) | Não |
| Refresh | cookie HttpOnly `sabli_refresh` | Sim, só no cookie, Path `/api/v1/auth` |
| Contexto de estabelecimento | memória da sessão API + `users.last_*` no servidor | Hint no GET `/me`, sempre revalidado em `POST /me/context` |
| Mesas, pedido, cozinha, caixa (DEMO) | `demo/session.ts` | Não |
| Rascunho operacional (API) | memória (`order-draft.ts`) | Não |
| Catálogos DEMO | Query + fixtures | Não |

## Regras para o próximo trabalho

1. Não criar módulo, rota ou entidade que o produto ainda não tenha.
2. Não colocar mock dentro de componente visual.
3. Não persistir access/refresh em `localStorage`, `sessionStorage` ou Zustand.
4. Não usar Zustand para dado de negócio.
5. Não fazer fallback silencioso de API → DEMO.
6. Valores em centavos inteiros. `formatBRL` já prefixa `R$ `; não duplicar.
7. Botão preenchido no claro: `--primary-action` (`#C73D2A`) com texto branco. Lime nunca leva texto branco.
8. Git: nunca commitar em `main`. Branch kebab-case, Conventional Commits em português, push e PR.

## Git e entrega

Frontend integrado na `main` pelo merge da PR #6 (`20c74eb`). A fundação da API está na PR #7. Identidade na PR #8. Catálogo na PR #9. Mesas na PR #10. Pedidos na PR #11. Caixa na PR #12. Autenticação React na #13. Catálogo React na #14. Mesas React na #15. Pedidos/KDS React segue empilhada em `feat/orders-api` (PR #16). Billing/caixa React segue em `feat/billing-api` sobre a #16.

## Como rodar

```bash
npm install
npm run dev
```

App DEMO em `http://127.0.0.1:5173/`. Node 22+ e npm 11+.

Modo API:

```bash
VITE_SABLI_MODE=api VITE_SABLI_API_BASE_URL=http://127.0.0.1:8080 npm run dev
```

No PowerShell: `$env:VITE_SABLI_MODE='api'; npm run dev` com a API no ar.

| Comando | Uso |
| ------- | --- |
| `npm run dev` | Desenvolvimento (DEMO por padrão) |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright (DEMO em 4173, login API em 4174 com API mockada) |
| `npm run lint` / `npm run typecheck` / `npm run build` | Qualidade e build |

## Como continuar

O próximo passo comercial é o Checkpoint 2.1F. Não iniciar isso automaticamente.

## Referência visual

A montagem aprovada está em `Montagem UI SaaS para Pizzaria.png`, na raiz do repositório. Screenshots do login: `docs/screenshots/`.
