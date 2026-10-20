# Sabli — o projeto

Visão geral da plataforma. Detalhe de contrato, tokens e setup fica nos documentos especializados no final.

Atualizado em 20 de outubro de 2026. A `main` consolidada está em `6bbc89f` (merge da PR #20).

---

## Em uma frase

O **Sabli** é a plataforma da **Emilabs** para o dia a dia de restaurantes e pizzarias. Slogan: **Seu negócio inteiro. Em um só lugar.**

Este repositório é um **projeto de portfólio**. Roda na máquina do desenvolvedor. Não está hospedado, homologado nem em produção.

O frontend opera em dois modos independentes: **DEMO** (fixtures, sem API) e **API** (login real e PostgreSQL). Erro HTTP **não** cai no DEMO.

## O que o produto faz

Três superfícies:

| Superfície | Rota | Quem usa |
| --- | --- | --- |
| Painel | `/inicio` e irmãos, `BusinessLayout` | gestão, caixa, cardápio, mesas, pedidos |
| Cozinha (KDS) | `/cozinha` | produção; layout próprio |
| Atendimento do garçom | `/atendimento/*` | DEMO no celular. No modo API ainda não ligado |

No DEMO, o estabelecimento de exemplo é a **Pizzaria do Centro**. A operadora ilustrativa é **Mariana Alves**.

## O que esta versão é

- SPA React com Design System próprio (Sabli UI).
- API Spring Boot multi-tenant: identidade, catálogo, mesas, pedidos, KDS, comandas e caixa no PostgreSQL 17.
- Precificação no servidor; item de pedido congelado; pizza cotada em `POST .../catalog/pizza/quotes`.
- Encerramento de mesa quitada (`remainingCents == 0` e `totalCents > 0`) e encerramento sem consumo (`empty` + motivo).
- CI no GitHub Actions: typecheck, lint, Vitest, Maven, Playwright mockado e Playwright contra PostgreSQL.

## O que esta versão não é

Não há adquirente, TEF, fiscal, estorno, MFA, delivery, reservas completas, KDS em tempo real, hospedagem nem clientes reais.

PIX e cartão são declaração do operador (`MANUAL_DECLARED`). Relatórios, equipe e o atendimento do garçom no modo API ainda avisam que o módulo não está disponível. Esconder um módulo em Configurações só altera a navegação da demonstração.

---

## Stack

| Camada | Escolha |
| --- | --- |
| SPA | React 19, Vite, TypeScript estrito, Tailwind 4, React Router 8, TanStack Query, Zustand, React Hook Form + Zod |
| API | JDK 25 LTS, Spring Boot 4.1, grupo `dev.emilabs:sabli-api` |
| Banco | PostgreSQL 17, JPA, Flyway V1–V8 |
| Auth | JWT HS256 (access em memória) + refresh opaco no cookie HttpOnly `sabli_refresh` |
| Testes | Vitest (152), JUnit + Testcontainers (96), Playwright mockado (12) e real (2) |

Node 22+ e npm 11+. Maven Wrapper em `apps/api` — Maven global não é necessário.

## Repositório

```text
src/                 SPA (DEMO + cliente HTTP)
apps/api/            monólito modular Java
e2e/                 Playwright
scripts/             db, API, seed e verify (Windows e Unix)
compose.yaml         PostgreSQL 17 local
docs/                handbook e contratos
.github/workflows/   CI
```

Componentes visuais não importam fixtures e não chamam `fetch`.

## DEMO e API

| | DEMO | API |
| --- | --- | --- |
| Flag | `VITE_SABLI_MODE=demo` | `api` (`npm run dev:api`) |
| Dados | fixtures + `demo/session.ts` | PostgreSQL |
| Login | `/entrar` redireciona ao início | `/entrar` e `/selecionar-estabelecimento` |
| Sem API | o DEMO segue | tela de indisponível |

Módulos ligados no modo API (`src/app/layouts/module-gate.tsx`): `home`, `settings`, `products`, `pos`, `tables`, `orders`, `kitchen`, `checks`, `cash`.

## Arquitetura

```text
React SPA → cliente HTTP → Spring Boot (identity, catalog, dining, orders, billing, cash) → PostgreSQL 17
```

- Multi-tenancy: Organization → Establishment. JWT **não** carrega loja. Membership é revalidada a cada operação. Recurso alheio responde **404**.
- Cadastro inicial só com `BOOTSTRAP_TOKEN`. Sem admin de senha fixa no Git.
- Pagamentos aceitam `Idempotency-Key`.
- Flyway: V1 pgcrypto … V6 financeiro … V7 último estabelecimento … V8 auditoria do encerramento.

Detalhe: [arquitetura](arquitetura.md) e [backend](backend.md).

## Telas

| Rota | DEMO | API |
| --- | --- | --- |
| `/entrar` | redireciona | login real |
| `/selecionar-estabelecimento` | — | `/me` + `POST /me/context` |
| `/inicio` | indicadores de exemplo | contexto autorizado |
| `/mesas` | mapa local | abertura, conta, quitação, encerramento quitado e sem consumo |
| `/pedidos` | lista local | persistido + produção |
| `/pdv` e montador | rascunho local | rascunho em memória, confirmação e cotação no servidor |
| `/comandas` | sessão local | contas e pagamentos reais |
| `/produtos` | fixtures | CRUD e pizza reais |
| `/cozinha` | fila local | fila persistida |
| `/caixa` | sessão local | turno, movimentos e quitação |
| `/relatorios` `/equipe` | ilustrativo | não ligado |
| `/atendimento/*` | operacional | não ligado |
| `/design-system` | só em `npm run dev` | — |

## Como rodar e testar

Guia completo: [desenvolvimento local](desenvolvimento-local.md).

```powershell
npm ci
npm run db:up
npm run api:dev
npm run dev:seed
npm run dev:api
```

DEMO sem API: `npm run dev` → `http://127.0.0.1:5173/`. PostgreSQL local na porta **5435**. API em `8080`.

| Comando | Uso |
| --- | --- |
| `npm run db:up` / `db:down` | Compose PostgreSQL 17 |
| `npm run api:dev` / `api:test` | API local / JUnit |
| `npm run dev` / `dev:api` | Vite DEMO / API |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright mockado (4173 / 4174) |
| `npm run test:e2e:real` | Playwright com API e PostgreSQL (4175) |

CI (`.github/workflows/ci.yml`): `frontend`, `e2e`, `api` e `integration` em pull request e push na `main`.

## Invariantes

1. Não criar módulo, rota ou entidade que o produto ainda não tenha.
2. Sem mock em componente visual.
3. Access/refresh fora de `localStorage`, `sessionStorage` e Zustand.
4. Sem fallback silencioso de API → DEMO.
5. Dinheiro em centavos. `formatBRL` já prefixa `R$ `.
6. Recurso de outro tenant responde 404.
7. Encerrar mesa quitada exige saldo zero e total maior que zero. Sem consumo exige motivo.
8. Git: nunca commitar em `main`. Conventional Commits em português.

## Git

A linha de produto (`#7`–`#16`, `#18`–`#20`) está na `main`. História em merge commits; branches originais preservadas. A PR #17 antiga ficou de fora de propósito: o handbook dela descrevia comandas e caixa React desligados.

Regra operacional: [`.cursor/rules/git-workflow.mdc`](../.cursor/rules/git-workflow.mdc). Plano e merges: [git-consolidacao.md](git-consolidacao.md).

## Como continuar

Não iniciar Relatórios, Equipe, adquirente, fiscal ou deploy automaticamente. O atendimento do garçom no modo API ainda não está ligado.

## Documentação especializada

Se divergirem deste handbook, o código vence — e a divergência deve ser corrigida.

| Arquivo | Conteúdo |
| --- | --- |
| [estado-atual.md](estado-atual.md) | recorte do ponto atual |
| [desenvolvimento-local.md](desenvolvimento-local.md) | primeiro uso, portas, seed |
| [arquitetura.md](arquitetura.md) | corte vertical |
| [backend.md](backend.md) | API, variáveis, Flyway |
| [design-system.md](design-system.md) | tokens e movimento |
| [frontend-architecture.md](frontend-architecture.md) | pastas e estado do SPA |
| [screens.md](screens.md) | comportamento por rota |
| [future-api-integration.md](future-api-integration.md) | o que o SPA já consome |
| [catalog-contracts.md](catalog-contracts.md) | cardápio |
| [dining-contracts.md](dining-contracts.md) | mesas |
| [orders-contracts.md](orders-contracts.md) | pedidos e KDS |
| [billing-contracts.md](billing-contracts.md) | comandas e caixa |
| [git-consolidacao.md](git-consolidacao.md) | integração na `main` |
