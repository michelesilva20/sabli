# Sabli — o projeto

Documento vivo da plataforma. Leia isto para entender o produto, a arquitetura, o que já está no ar e como continuar. Contratos de API, tokens visuais e detalhes de tela ficam nos documentos especializados no final.

A regra Cursor `.cursor/rules/projeto-docs.mdc` obriga a atualizar este arquivo na mesma entrega em que o código muda.

Atualizado em 19 de outubro de 2026.

---

## Em uma frase

O **Sabli** é a plataforma SaaS da **Emilabs** para restaurantes e pizzarias. Slogan: **Seu negócio inteiro. Em um só lugar.**

O frontend React opera em dois modos: **DEMO** (fixtures e sessão volátil) e **API** (login real, sessão e contexto de estabelecimento). A API Java persiste o ciclo operacional até o caixa.

## O que o produto faz

O Sabli cobre o dia a dia de uma pizzaria em três superfícies:

| Superfície | Rota | Quem usa |
| ---------- | ---- | -------- |
| Painel administrativo | `/inicio` e irmãos, layout `BusinessLayout` | gestão, caixa, cardápio, mesas, pedidos |
| Cozinha (KDS) | `/cozinha` | produção; layout próprio, sem sidebar do painel |
| Atendimento do garçom | `/atendimento/*` | mesas, cardápio, pedido e conta no celular |

O estabelecimento de exemplo no DEMO é a **Pizzaria do Centro**. A operadora ilustrativa é **Mariana Alves**.

## O que esta versão é

- SPA React com Design System próprio (Sabli UI).
- API Spring Boot multi-tenant: identidade, catálogo, mesas, pedidos, KDS, comandas e caixa no PostgreSQL.
- Modo explícito `VITE_SABLI_MODE=demo\|api`. Erro HTTP **não** volta ao DEMO.
- Dinheiro em centavos inteiros; a tela formata com `formatBRL`.
- Tema claro, escuro ou sistema.
- CI no GitHub Actions: typecheck, lint, Vitest, Playwright e Maven da API.

## O que esta versão não é

Não há pagamento de adquirente, TEF, fiscal, estorno, MFA, delivery, reservas completas nem sincronização instantânea de KDS.

No modo API, catálogo, mesas, PDV, pedidos e cozinha já consomem o PostgreSQL. Comandas, caixa, relatórios, equipe e o atendimento do garçom ainda avisam que o módulo não está disponível. Encerrar atendimento real permanece oculto até Billing e Caixa no React. Esconder um módulo em Configurações só altera a navegação da demonstração — não é controle de acesso.

PIX e cartão no Java são declaração manual do operador (`MANUAL_DECLARED`).

---

## Stack

### Frontend (`src/`)

| Peça | Escolha |
| ---- | ------- |
| UI | React 19, Vite 8, TypeScript estrito |
| Estilo | Tailwind 4, tokens em `globals.css` |
| Rotas | React Router 8 |
| Dados remotos | TanStack Query |
| Preferência de UI | Zustand (`sabli-ui`) |
| Formulários | React Hook Form + Zod |
| Componentes | Radix UI, CVA, Lucide, Motion, Recharts |
| Testes | Vitest + Testing Library, Playwright |
| Alias | `@/` → `src/` |

Node 22+ e npm 11+.

### Backend (`apps/api/`)

| Peça | Escolha |
| ---- | ------- |
| Runtime | JDK 25 LTS (Temurin), Spring Boot 4.1 |
| Persistência | PostgreSQL 17, JPA, Flyway |
| Auth | JWT HS256 (access) + refresh opaco no cookie HttpOnly |
| Docs internas | springdoc OpenAPI (desligado por padrão, autenticado) |
| Testes | JUnit + Testcontainers |

Grupo Maven: `dev.emilabs:sabli-api`. Pacote Java: `dev.emilabs.sabli`.

---

## Como o repositório está organizado

```text
src/                         SPA React (DEMO + cliente HTTP)
  app/                       composição, rotas, layouts, store de UI
  design-system/             Sabli UI — sem regra de negócio
  features/                  telas e fluxos
  shared/api/                cliente HTTP, contratos, queries, porta DEMO
  shared/auth/               sessão API e access token em memória
  shared/demo/               sessão volátil do DEMO
  shared/domain/             dinheiro, pizza, conta, cozinha (cálculos puros)
  shared/mocks/              fixtures da pizzaria de exemplo
  shared/orders/             rascunho operacional (API, só memória)
apps/api/                    Spring Boot
  src/main/java/.../         identity, catalog, dining, orders, kitchen, billing, cash
  src/main/resources/db/migration/   Flyway V1–V7
e2e/                         Playwright
docs/                        este handbook e os contratos
.cursor/rules/               regras permanentes do agente
.github/workflows/ci.yml     CI
```

Componentes visuais não importam fixtures e não chamam `fetch`. Dados reais passam pelo cliente HTTP (`src/shared/api/http-client.ts`) e pela sessão em memória.

---

## Dois modos de operação

Definidos em `src/shared/config/runtime.ts`. Valor inválido derruba a subida.

| | DEMO | API |
| --- | --- | --- |
| `VITE_SABLI_MODE` | `demo` (padrão) | `api` |
| Base da API | ignorada | `VITE_SABLI_API_BASE_URL` (default `http://127.0.0.1:8080`) |
| Leituras | `SabliDataSource` + fixtures | cliente HTTP + PostgreSQL |
| Escritas | `src/shared/demo/session.ts` | endpoints do estabelecimento autenticado |
| Login | redireciona `/entrar` → `/inicio` | `/entrar` e `/selecionar-estabelecimento` |
| Sem API no ar | o DEMO segue | tela de indisponível; **sem** fallback para fixtures |

O rascunho do PDV no modo API vive em `src/shared/orders/order-draft.ts` (memória). A confirmação congela preço no servidor.

Módulos prontos no modo API (lista em `src/app/layouts/module-gate.tsx`): `home`, `settings`, `products`, `pos`, `tables`, `orders`, `kitchen`.

---

## Arquitetura do frontend

### Responsabilidades

- `src/app` — roteamento, layouts (`BusinessLayout`, `KitchenLayout`, `WaiterLayout`), `ModuleGate`, preferências.
- `src/design-system` — aparência e primitives. Sem regra de negócio.
- `src/features` — uma pasta por fluxo. Página DEMO e página `api-*` no mesmo feature, escolhidas por `isApiMode()`.
- `src/shared/domain` — cálculos puros (centavos, pizza, divisão de conta, fluxo da cozinha).
- `src/shared/api` — porta DEMO, HTTP, Zod, TanStack Query por domínio (`catalog`, `dining`, `orders`).

### Estado

| O quê | Onde | Persiste? |
| ----- | ---- | --------- |
| Tema | `localStorage` `sabli-theme` | Sim, no navegador |
| Sidebar, estabelecimento DEMO, módulos visíveis | Zustand `sabli-ui` | Sim, no navegador |
| Access token | memória (`token-memory.ts`) | Não |
| Refresh | cookie HttpOnly `sabli_refresh` | Sim, Path `/api/v1/auth`, SameSite Lax |
| Contexto de estabelecimento | memória da sessão API + `users.last_*` no servidor | Hint no `GET /me`, sempre revalidado em `POST /me/context` |
| Mesas, pedido, cozinha, caixa (DEMO) | `demo/session.ts` | Não (recarregar a página recria o exemplo) |
| Rascunho operacional (API) | `order-draft.ts` | Não |
| Catálogos DEMO | Query + fixtures | Não |

Zustand **não** guarda dado de negócio nem token. O tema fica fora do store para o script anti-flash de `index.html` ler um valor simples.

### Dinheiro e pizza

Valores trafegam em centavos inteiros. Desconto, divisão de conta e preço arredondam com `Math.round`.

`formatBRL` já prefixa `R$ `. Não concatenar outro `R$`.

No DEMO, o montador oferece duas regras: maior valor (depois de ajustar o sabor ao tamanho) e média proporcional das frações. Tamanhos ilustrativos: broto (1 sabor), média (2), grande (3), família (4).

No modo API, o servidor é a autoridade. `POST .../catalog/pizza/quotes` cotação informativa, sem reserva. Tamanhos são configuração; o motor Java não fixa Broto/Média/Grande/Família. Estratégias: `HIGHEST` e `AVERAGE` (half-up).

O desconto ilustrativo de 10% do PDV **não** entra no total persistido. Pedidos confirmados gravam `discountCents = 0`.

### Breakpoints

| Nome | Largura | Uso |
| ---- | ------- | --- |
| base | 360–639 | celular pequeno e 390px |
| md | 768 | tablet; tabela vira lista abaixo disso |
| lg | 1024 | sidebar fixa |
| xl | 1280 | notebook e tema compacto no header |
| 2xl | 1536 | desktop amplo, conteúdo limitado a 1400px |

O corpo usa `overflow-x: clip`. O mapa de mesas, no celular, rola dentro do próprio quadro. O atendimento do garçom não reaproveita a sidebar: em tela larga fica numa coluna estreita; no celular ocupa a largura toda.

---

## Arquitetura da API

Prefixo: `/api/v1`. Erros em Problem Detail com `code`. Respostas são DTOs: hash, token de sessão e entidade JPA não vazam.

### Identidade e isolamento

Hierarquia: **Organization → Establishment → memberships**. Um usuário pode pertencer a várias organizações e estabelecimentos. Não há relação 1:1 entre usuário e loja.

Cadastro inicial: `POST /api/v1/auth/register-organization` cria organização, estabelecimento e o primeiro administrador. Não existe usuário admin fixo nem senha default no Git.

Autenticação:

- Login por e-mail normalizado e senha BCrypt.
- Access JWT HS256, ~15 min, claims `sub` e `typ=access`. Sem organização nem estabelecimento no token.
- Refresh opaco, 32 bytes, guardado só como SHA-256, cookie `sabli_refresh`. O JSON **não** devolve `refreshToken`. Rotação por família; reuso revoga a família. Logout revoga e limpa o cookie.
- Bloqueio após 5 senhas inválidas por 15 minutos. Mensagem genérica.

JWT válido **não** autoriza sozinho. O contexto vai no path ou em `POST /me/context`. Recurso de outro tenant responde **404**. Tenant `SUSPENDED` bloqueia mutações (`TENANT_SUSPENDED`). Membership `REVOKED` some do acesso.

Papéis da organização: `ADMIN`, `MANAGER`. Do estabelecimento: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN`.

O PostgreSQL impede membership de estabelecimento com `organization_id` de outra organização (FK composta).

### Módulos Java

| Pacote | Responsabilidade |
| ------ | ---------------- |
| `identity` | usuários, orgs, lojas, memberships, sessão |
| `catalog` | categorias, produtos, variações, pizza e cotação |
| `dining` | cadastro de mesa e `TableService`; ocupação é **derivada** |
| `orders` | pedido confirmado com preço congelado |
| `kitchen` | tickets; status agregado derivado dos itens |
| `billing` | comandas e pagamentos declarados |
| `cash` | uma sessão de caixa aberta por estabelecimento |
| `reporting` | pacote reservado; UI ainda ilustrativa |
| `shared` | segurança, CORS, erros, OpenAPI |

### Migrations Flyway

Em `apps/api/src/main/resources/db/migration/`:

| Versão | Conteúdo |
| ------ | -------- |
| V1 | `pgcrypto` |
| V2 | users, organizations, establishments, memberships, refresh_sessions |
| V3 | catálogo e precificação de pizza |
| V4 | `dining_tables`, `table_services` |
| V5 | pedidos, snapshots, tickets de cozinha |
| V6 | comandas, pagamentos, sessões de caixa |
| V7 | último estabelecimento da conta (`users.last_*`) |

Não há tabela de clientes. Não rode `flyway:repair` nem `flyway:clean` contra banco compartilhado.

Idempotência: header `Idempotency-Key` em confirmação de pedido e pagamento.

---

## Telas e rotas

Fonte: `src/app/router/router.tsx`. No DEMO, `/entrar` redireciona ao início.

| Rota | Situação | DEMO | API |
| ---- | -------- | ---- | --- |
| `/entrar` | Nova | redireciona | login real |
| `/selecionar-estabelecimento` | Nova | — | lista orgs/lojas de `/me`, valida `POST /me/context` |
| `/inicio` | Fundação | indicadores de exemplo | contexto autorizado, sem fixtures |
| `/mesas` | Fundação | mapa local | mapa, abertura, conta e reabertura reais. Sem encerramento financeiro |
| `/pedidos` | Polida | lista + sessão | lista persistida, detalhe e produção |
| `/pdv` | Fundação | rascunho local | rascunho volátil e confirmação no servidor |
| `/pdv/montar-pizza` | Fundação | cotação local | cotação do servidor e inclusão no rascunho |
| `/comandas` | Polida | contas da sessão | não ligado |
| `/produtos` | Polida | cardápio local | CRUD, busca, filtros e pizza reais |
| `/cozinha` | Polida | fila local | fila persistida, avanço com versão |
| `/caixa` | Fundação | abertura e fechamento locais | não ligado |
| `/relatorios` | Fundação | ilustrativo | não ligado |
| `/equipe` | Fundação | inclusão local | não ligado |
| `/configuracoes` | Fundação | módulos visíveis | só aparência |
| `/perfil` | Nova | sessão volátil | dados de `/me`, sem troca de senha |
| `/atendimento/*` | Fundação | operacional | não ligado |
| `/design-system` | Dev | inspeção do Sabli UI | só existe em `npm run dev` |

---

## Design system (Sabli UI)

Identidade: coral `#FF5A3C`, roxo `#6C4CF5`, lime `#B9F34A`, grafite `#28212C`, creme `#FFF9F5`. Nunito Sans (400/600/700/800, latin-ext). Sem degradê. Logo não se redesenha.

Botão preenchido no claro: `--primary-action` (`#C73D2A`) com texto branco — o coral de marca não tem contraste suficiente. No escuro: `#FF7055` com texto `#28212C`. Lime **nunca** leva texto branco.

Status de mesa e de pedido levam rótulo, não só cor. Transições curtas (150–220 ms); `prefers-reduced-motion` reduz a quase zero. PDV e KDS não usam animação contínua.

Referência visual aprovada: `Montagem UI SaaS para Pizzaria.png` na raiz. Screenshots de login: `docs/screenshots/`. Detalhe em [design-system.md](design-system.md).

---

## Como rodar

### Frontend DEMO

```bash
npm install
npm run dev
```

App em `http://127.0.0.1:5173/`.

### Frontend no modo API

A API precisa estar no ar. No PowerShell:

```powershell
$env:VITE_SABLI_MODE='api'
$env:VITE_SABLI_API_BASE_URL='http://127.0.0.1:8080'
npm run dev
```

### API Java

```bash
cd apps/api
cp .env.example .env
```

Defina `SABLI_DATASOURCE_PASSWORD` e `SABLI_JWT_SECRET` (mínimo 32 caracteres). Com `SABLI_REGISTRATION_MODE=BOOTSTRAP_TOKEN`, defina `SABLI_BOOTSTRAP_SIGNUP_TOKEN`. Não commite o `.env`.

```bash
docker compose --env-file .env up -d
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

No Windows: `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"` depois de exportar as variáveis.

Saúde pública: `GET http://127.0.0.1:8080/actuator/health` → `{"status":"UP"}`.

Variáveis, papéis e falhas comuns: [backend.md](backend.md).

### Comandos

| Comando | Uso |
| ------- | --- |
| `npm run dev` | Vite (DEMO por padrão) |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright: DEMO em 4173; login API em 4174 com API mockada |
| `npm run lint` / `typecheck` / `build` | qualidade e build |
| `cd apps/api && ./mvnw -B verify` | testes da API com Testcontainers (Docker obrigatório) |

CI (`.github/workflows/ci.yml`): jobs `frontend`, `e2e` e `api` em pull request e push em `main`.

---

## Invariantes

1. Não criar módulo, rota ou entidade que o produto ainda não tenha.
2. Não colocar mock dentro de componente visual.
3. Não persistir access/refresh em `localStorage`, `sessionStorage` ou Zustand.
4. Não usar Zustand para dado de negócio.
5. Não fazer fallback silencioso de API → DEMO.
6. Valores em centavos inteiros. `formatBRL` já prefixa `R$ `.
7. Botão preenchido no claro: `--primary-action` com texto branco. Lime nunca leva texto branco.
8. Git: nunca commitar em `main`. Branch kebab-case, Conventional Commits em português, push e PR.
9. Recurso de outro tenant responde 404, não 403.
10. Encerrar mesa exige conta quitada (`CLOSE_REQUIRES_SETTLEMENT`).

---

## Git e entrega

Nunca commitar direto em `main`. Uma branch por assunto, prefixo `feat/`, `fix/`, `ui/`, `refactor/`, `docs/`, `test/` ou `chore/`. Conventional Commits em português, imperativo.

O SPA demonstrativo está na `main` (PR #6). Identidade, catálogo, mesas, pedidos/KDS, caixa Java e o modo API do React ainda avançam em PRs empilhadas — conferir o remoto antes de afirmar o que já entrou na `main`. Este handbook descreve o produto **completo da linha atual**, não só o que já foi mergeado.

Regra operacional: [`.cursor/rules/git-workflow.mdc`](../.cursor/rules/git-workflow.mdc).

## Como continuar

O próximo passo comercial é ligar **Billing e Caixa** no React (Checkpoint 2.1E): comandas, pagamentos declarados, sessão de caixa e só então o encerramento real da mesa. Não iniciar isso automaticamente.

Fora da fundação: adquirente, fiscal, delivery, reservas, MFA, Prometheus público e KDS em tempo real.

---

## Documentação especializada

Consulte estes arquivos para o detalhe. Se divergirem deste handbook, o handbook e o código vencem — e a divergência deve ser corrigida na mesma entrega.

| Arquivo | Conteúdo |
| ------- | -------- |
| [estado-atual.md](estado-atual.md) | recorte curto do ponto atual; aponta para cá |
| [design-system.md](design-system.md) | tokens, componentes, movimento |
| [frontend-architecture.md](frontend-architecture.md) | pastas, estado, breakpoints, testes do SPA |
| [screens.md](screens.md) | comportamento por rota (ainda mais DEMO-cêntrico) |
| [future-api-integration.md](future-api-integration.md) | o que o SPA já consome da API |
| [backend.md](backend.md) | como subir a API, variáveis, identidade, limites |
| [catalog-contracts.md](catalog-contracts.md) | Java ↔ TypeScript do cardápio |
| [dining-contracts.md](dining-contracts.md) | mesas e atendimentos |
| [orders-contracts.md](orders-contracts.md) | pedidos e KDS |
| [billing-contracts.md](billing-contracts.md) | comandas, pagamentos e caixa |
