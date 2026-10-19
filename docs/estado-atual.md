# Estado atual do Sabli

Este documento descreve o ponto atual para continuar o trabalho. Não substitui as outras referências: [design system](design-system.md), [arquitetura](frontend-architecture.md), [telas](screens.md), [API futura](future-api-integration.md) e [backend](backend.md).

## Em uma frase

O Sabli é a plataforma SaaS da Emilabs para restaurantes e pizzarias. O frontend demonstrativo está na `main`. A API Java autentica tenants e persiste o catálogo (produtos, variações e precificação de pizza). Ainda não há mesas, pedidos, KDS nem caixa no backend.

Slogan: **Seu negócio inteiro. Em um só lugar.**

## O que já é verdade

- Stack: React 19, Vite, TypeScript estrito, Tailwind 4, React Router 8, TanStack Query, Zustand, React Hook Form + Zod, Vitest e Playwright.
- Três superfícies: painel administrativo (`BusinessLayout`), cozinha (`/cozinha`) e atendimento do garçom (`/atendimento`).
- Leituras passam por `SabliDataSource` (`src/shared/api/data-source.ts`) e devolvem fixtures com atraso curto.
- Escritas de operação ficam em `src/shared/demo/session.ts`. Recarregar a página recria o exemplo.
- Dinheiro entra e sai em centavos inteiros. A tela formata com `formatBRL`.
- Tema claro, escuro ou sistema em `localStorage` (`sabli-theme`). A cozinha segue o mesmo tema do painel.
- Preferências de interface (sidebar, estabelecimento, módulos visíveis) ficam no Zustand, chave `sabli-ui`.
- Identidade visual: coral `#FF5A3C`, roxo `#6C4CF5`, lime `#B9F34A`, grafite `#28212C`, creme `#FFF9F5`, Nunito Sans. Sem degradê. Logo não se redesenha.

## O que esta versão não é

Não há pagamento de adquirente, persistência operacional no SPA, fiscal, delivery, reservas completas nem sincronização de KDS. A API em `apps/api` autentica e persiste o catálogo, mas o SPA ainda usa fixtures e a sessão demonstrativa. Não ligar o React à API neste ponto nem inventar mesas, pedidos, KDS ou caixa no backend.

Esconder um módulo em Configurações só tira o item da navegação. A rota continua existindo.

## Onde o código vive

```text
src/                 SPA React (inalterado neste checkpoint)
apps/api/            identidade, catálogo e precificação de pizza
.github/workflows/   CI
```

Componentes visuais não importam fixtures e não chamam HTTP. Dados entram por hooks ou pela sessão demonstrativa.

## Telas

| Rota | Situação | Observação |
| ---- | -------- | ---------- |
| `/inicio` | Fundação | Saudação usa o perfil da sessão. Período e estabelecimento mudam os indicadores de exemplo. |
| `/mesas` | Fundação | Mapa ou lista, detalhe em sheet, abrir atendimento e pedir conta. |
| `/pedidos` | Polida | Fila tabular, filtros, busca e detalhe em sheet. |
| `/pdv` | Fundação | Categorias, busca, rascunho e envio local à cozinha. |
| `/pdv/montar-pizza` | Fundação | Tamanho, sabores, borda e adicionais. Preço é prévia local. |
| `/comandas` | Polida | Fila de contas + painel de detalhe. Pedir conta, ir ao caixa, adicionar itens. |
| `/produtos` | Polida | Cards com fotos (Pexels) e disponibilidade no próprio card. |
| `/cozinha` | Polida | KDS por colunas, tickets com urgência, tema do painel. Indicador Demonstração. |
| `/caixa` | Fundação | Abertura, lançamentos, divisão e fechamento simulados. Sem cartão. |
| `/relatorios` | Fundação | Mesma base ilustrativa do painel. Não é fechamento. |
| `/equipe` | Fundação | Lista de exemplo e inclusão local, sem convite. |
| `/configuracoes` | Fundação | Tema, módulos visíveis e telefone que não grava. |
| `/perfil` | Nova | Conta demonstrativa. Nome, e-mail, telefone e turno valem só na sessão. Não é módulo da sidebar. |
| `/atendimento/*` | Fundação | Mesas, cardápio, pedido e conta, com navegação inferior. |
| `/design-system` | Dev | Inspeção do Sabli UI. Só existe em `npm run dev`. |

Acesso ao perfil: menu da conta (**Meu perfil**), avatar da sidebar e busca por “perfil”.

Estabelecimento de exemplo: Pizzaria do Centro. Operadora de exemplo: Mariana Alves, gerente, turno da tarde.

## Como o estado se divide

| O quê | Onde | Persiste? |
| ----- | ---- | --------- |
| Tema | `sabli-theme` | Sim, no navegador |
| Sidebar, estabelecimento, módulos | Zustand `sabli-ui` | Sim, no navegador |
| Mesas, pedido, cozinha, caixa, disponibilidade, perfil | `demo/session.ts` | Não. Recarregar restaura o exemplo |
| Catálogos, dashboard, equipe, notificações | Query + fixtures | Não |

## Regras para o próximo trabalho

1. Não criar módulo, rota ou entidade que o produto ainda não tenha.
2. Não colocar mock dentro de componente visual.
3. Não persistir operação em `localStorage`. Sessão demonstrativa é volátil de propósito.
4. Não usar Zustand para dado de negócio.
5. Valores em centavos inteiros. `formatBRL` já prefixa `R$ `; não duplicar.
6. Botão preenchido no claro: `--primary-action` (`#C73D2A`) com texto branco. Lime nunca leva texto branco.
7. Cozinha acompanha claro / escuro / sistema. Não forçar tema próprio.
8. Perfil não entra na lista de módulos e não ganha senha, login ou auth.
9. Chrome compartilhado (`PageHeader`, sidebar, topbar, `MetricCard`, `DataTable`) muda as outras telas de propósito quando o pedido for de layout da plataforma.
10. Git: nunca commitar em `main`. Branch kebab-case, Conventional Commits em português, push e PR. Detalhe em `.cursor/rules/git-workflow.mdc`.

## Git e entrega

Frontend integrado na `main` pelo merge da PR #6 (`20c74eb`). A fundação da API está na PR #7. Identidade na PR #8 (`feat/identity-tenancy`). Catálogo segue empilhado em `feat/catalog-pricing` sobre a #8.

## Como rodar

```bash
npm install
npm run dev
```

App em `http://127.0.0.1:5173/`. Node 22+ e npm 11+.

| Comando | Uso |
| ------- | --- |
| `npm run dev` | Desenvolvimento |
| `npm run test` | Vitest (domínio, UI, navegação, mesa, PDV, KDS, caixa, perfil) |
| `npm run test:e2e` | Playwright contra o preview |
| `npm run lint` / `npm run typecheck` / `npm run build` | Qualidade e build |

## Como continuar

O catálogo da API existe. O próximo checkpoint comercial é mesas/comandas no Java, ou a ligação do SPA à autenticação e ao catálogo real.

O SPA continua falando com fixtures e com `demo/session.ts`. Não ligar o React à API neste ponto. Ver o mapeamento em [catalog-contracts.md](catalog-contracts.md).

## Referência visual

A montagem aprovada está em `Montagem UI SaaS para Pizzaria.png`, na raiz do repositório.
