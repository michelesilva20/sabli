# Estado atual do Sabli

Este documento descreve o ponto da fundação de frontend para continuar o trabalho. Não substitui as outras referências: [design system](design-system.md), [arquitetura](frontend-architecture.md), [telas](screens.md) e [API futura](future-api-integration.md).

## Em uma frase

O Sabli é o frontend demonstrativo da plataforma SaaS da Emilabs para restaurantes e pizzarias. A interface está montada, o visual da operação avançou em algumas telas, e ainda não existe backend.

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

Não há API Java, autenticação, permissões reais, pagamento de adquirente, persistência operacional, fiscal, delivery, reservas completas nem sincronização de KDS. Não inventar esses fluxos nem simulá-los como se já existissem.

Esconder um módulo em Configurações só tira o item da navegação. A rota continua existindo.

## Onde o código vive

```text
src/
├── app/             providers, rotas, layouts e preferências de interface
├── design-system/   Sabli UI (tokens e primitives, sem regra de negócio)
├── features/        uma pasta por tela ou fluxo
├── shared/
│   ├── api/         porta SabliDataSource e hooks
│   ├── demo/        sessão local do operador
│   ├── domain/      cálculos puros (dinheiro, pizza, conta, cozinha)
│   ├── mocks/       fixtures da Pizzaria do Centro
│   └── types/       contratos de domínio
└── main.tsx
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

Trabalho atual na branch `feat/plataforma-ui`, PR https://github.com/michelesilva20/sabli/pull/1, base `main`.

Entregas recentes nessa linha: fundação da plataforma, documentação, KDS alinhado ao tema do painel e tela de perfil.

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

A fundação de rotas e fluxos já existe. O próximo passo útil é escolher **uma tela ou um contrato**, sem abrir autenticação nem API.

Candidatas naturais, ainda na qualidade da fundação:

- PDV e montador de pizza
- Mapa de mesas
- Caixa
- Relatórios
- Equipe e configurações
- Atendimento do garçom (`/atendimento`)

Quando a API Java existir, a troca prevista é substituir `mockDataSource` por um cliente HTTP com os mesmos métodos. As escritas da sessão viram comandos no servidor. Até lá, o navegador não é fonte da verdade operacional.

## Referência visual

A montagem aprovada está em `Montagem UI SaaS para Pizzaria.png`, na raiz do repositório.
