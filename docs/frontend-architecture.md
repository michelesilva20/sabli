# Arquitetura de frontend

## Responsabilidades

- `src/app`: composição da aplicação, roteamento, layouts e preferências de interface.
- `src/design-system`: aparência e componentes reutilizáveis, sem regra de negócio.
- `src/features`: telas e fluxos.
- `src/shared/domain`: cálculos puros de dinheiro, pizza, divisão de conta e fluxo da cozinha.
- `src/shared/api`: porta `SabliDataSource` e a implementação demonstrativa.
- `src/shared/mocks`: fixtures da pizzaria de exemplo.
- `src/shared/demo/session.ts`: sessão local das ações do operador.

## Estado

Zustand guarda só preferência de interface: menu recolhido, estabelecimento selecionado e módulos visíveis. A chave é `sabli-ui`.

O tema fica fora desse store, em `sabli-theme`, para o script anti-flash ler um valor simples.

Catálogos, indicadores, equipe e notificações passam por TanStack Query e pela porta de dados. Componentes visuais não chamam HTTP e não importam fixtures.

A sessão demonstrativa é um store externo com `useSyncExternalStore`. Ela guarda rascunho de pedido, status local das mesas, tickets da cozinha, caixa e disponibilidade temporária. Recarregar a página recria o exemplo. Reiniciar pelo menu do usuário também.

Esconder um módulo em Configurações só altera a navegação. A rota continua existindo e explica que aquilo não é controle de acesso.

## Dinheiro e pizza

Valores trafegam em centavos inteiros. Desconto, divisão de conta e preço da pizza arredondam com `Math.round` em inteiros.

O montador oferece duas regras de exemplo:

- maior valor, depois de ajustar o sabor ao tamanho;
- média proporcional das frações.

Tamanhos: broto (1 sabor), média (2), grande (3) e família (4). O fator de tamanho também é racional. No modo API a cotação sai do servidor (`POST .../catalog/pizza/quotes`). No DEMO as regras acima ficam no cliente.

## Breakpoints

Os breakpoints do Tailwind são a referência:

| Nome | Largura | Uso                                       |
| ---- | ------- | ----------------------------------------- |
| base | 360–639 | celular pequeno e 390px                   |
| md   | 768     | tablet; tabela vira lista abaixo disso    |
| lg   | 1024    | sidebar fixa                              |
| xl   | 1280    | notebook e tema compacto no header        |
| 2xl  | 1536    | desktop amplo, conteúdo limitado a 1400px |

O corpo usa `overflow-x: clip`. O mapa de mesas, quando aberto no celular, rola dentro do próprio quadro.

## Testes

Vitest e Testing Library cobrem tema, botão, diálogo, navegação, mesa, PDV, KDS, validação de caixa e regras de domínio. Playwright cobre o fluxo de painel, tema e inclusão de produto.
