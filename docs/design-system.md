# Sabli UI

O Sabli UI é a fonte visual da interface. Tokens semânticos vivem em `src/design-system/styles/globals.css` e são consumidos pelo Tailwind.

## Cor

A identidade é creme, coral, roxo e lime. Azul aparece só como informação discreta.

| Token           | Light     | Dark      |
| --------------- | --------- | --------- |
| Primary (marca) | `#FF5A3C` | `#FF7055` |
| Primary action  | `#C73D2A` | `#FF7055` |
| Secondary       | `#6C4CF5` | `#9278FF` |
| Accent          | `#B9F34A` | `#B9F34A` |
| Background      | `#FFF9F5` | `#17151D` |
| Surface / card  | `#FFFFFF` | `#211E29` |
| Text            | `#28212C` | `#F7F3F8` |
| Text secondary  | `#746C78` | `#B9B1C0` |
| Border          | `#EAE5E3` | `#393440` |

O coral de marca `#FF5A3C` não tem contraste suficiente para texto branco pequeno. Por isso botões preenchidos no tema claro usam `#C73D2A` com texto branco. No tema escuro, o botão usa `#FF7055` com texto `#28212C`. Lime nunca recebe texto branco.

Sucesso, aviso, perigo e informação têm fundo suave e texto próprio. Status de mesa e de pedido também levam rótulo, não só cor.

## Tipografia

Nunito Sans, com fallback Segoe UI. Pesos 400, 600, 700 e 800, incluindo latin-ext para o português.

Valores financeiros, quantidades e horários usam números tabulares.

## Espaço e forma

A escala prática é 4, 8, 12, 16, 20, 24, 32, 40 e 48. Botões e inputs usam raio de 12px. Cards usam 16px ou 20px. Badges são pílulas.

Sombras são suaves no claro e discretas no escuro. Não há vidro fosco como linguagem principal.

## Tema

Preferências: claro, escuro e sistema. A escolha fica em `localStorage` na chave `sabli-theme`. Um script no `index.html` aplica a classe `dark` antes do React para evitar o flash do tema errado.

A cozinha segue o tema global (claro, escuro ou sistema). Os tickets usam o mesmo cartão da plataforma, com o tempo colorido por urgência.

## Componentes

Primitives em `src/design-system/components`:

- Botão com variantes primary, secondary, outline, ghost, destructive, success e link; tamanhos sm, md, lg e icon; estados hover, active, focus-visible, disabled e loading.
- Campos: input, busca, textarea, select, combobox, multiselect, checkbox, rádio, switch, número, moeda, quantidade e data.
- FormField associa label, descrição e erro.
- Cards, MetricCard, badges e StatusBadge.
- Dialog, ConfirmationDialog, Sheet, Drawer, Popover, Tooltip, DropdownMenu e Toast.
- Alert, Banner, Skeleton, EmptyState, Progress e LoadingOverlay.
- DataTable com lista empilhada no mobile.
- BarChart, LineChart e DonutChart, com tabela acessível equivalente.
- Sidebar, header, breadcrumb, tabs, paginação, segmented control e ThemeSwitcher.

Formulários de caixa, equipe e configurações usam React Hook Form e Zod. O erro fica junto do campo.

## Movimento

Transições curtas: 150ms em controles, cerca de 220ms em diálogos e páginas. `prefers-reduced-motion` reduz animações a quase zero. PDV e KDS não usam animação contínua.

## Uso

Componentes de tela importam o Sabli UI. Não criam paleta própria. Cores operacionais de mesa e de coluna da cozinha são exceção documentada e sempre acompanham texto.
