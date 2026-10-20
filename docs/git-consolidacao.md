# Consolidação Git

Registro da integração da linha de produto na `main`. Executado em 20 de outubro de 2026 (checkpoint 2.2A.1).

## Resultado

| | SHA |
| --- | --- |
| `main` antes | `20c74eb` (PR #6) |
| `main` depois | `6bbc89f` (merge da PR #20) |
| Ponta do produto | `81208a0` (ancestral de `6bbc89f`) |

13 PRs integradas com **merge commit**, sem squash e sem force push. Branches originais preservadas. A PR **#17 não entrou**.

CI da ponta: [run 39454787303](https://github.com/michelesilva20/sabli/actions/runs/39454787303) — Frontend, API, Playwright mockado e Playwright real verdes.

## Ordem executada

| PR | Head | Merge SHA |
| --- | --- | --- |
| [#7](https://github.com/michelesilva20/sabli/pull/7) | `feat/api-foundation` | `b56d207` |
| [#8](https://github.com/michelesilva20/sabli/pull/8) | `feat/identity-tenancy` | `197c1f7` |
| [#9](https://github.com/michelesilva20/sabli/pull/9) | `feat/catalog-pricing` | `434b104` |
| [#10](https://github.com/michelesilva20/sabli/pull/10) | `feat/tables-service` | `f47b7c9` |
| [#11](https://github.com/michelesilva20/sabli/pull/11) | `feat/orders-kitchen` | `1bf26ae` |
| [#12](https://github.com/michelesilva20/sabli/pull/12) | `feat/billing-cash` | `90f66f2` |
| [#13](https://github.com/michelesilva20/sabli/pull/13) | `feat/auth-session` | `66240bd` |
| [#14](https://github.com/michelesilva20/sabli/pull/14) | `feat/catalog-api` | `9a2693e` |
| [#15](https://github.com/michelesilva20/sabli/pull/15) | `feat/dining-api` | `18645f6` |
| [#16](https://github.com/michelesilva20/sabli/pull/16) | `feat/orders-api` | `c4af6eb` |
| [#18](https://github.com/michelesilva20/sabli/pull/18) | `feat/billing-api` | `c7a991a` |
| [#19](https://github.com/michelesilva20/sabli/pull/19) | `fix/empty-service-close` | `f87a3ee` |
| [#20](https://github.com/michelesilva20/sabli/pull/20) | `chore/local-dev` | `6bbc89f` |

Cada PR empilhada foi retargetada para `main` só depois da anterior.

A #14 tinha Playwright histórico vermelho. O código é ancestral das PRs seguintes, cuja suíte passou.

## PR #17

A [#17](https://github.com/michelesilva20/sabli/pull/17) (`docs/projeto` ← `feat/orders-api`) permanece **aberta e fora da `main`**.

O handbook daquela branch afirma comandas/caixa React desligados e Flyway só até V7. Não deve ser mergeada. A atualização do handbook sai de uma branch nova a partir desta `main`.

## Rollback

Não force push. Se precisar reverter: `git revert -m 1` na ordem inversa, de `6bbc89f` até `b56d207`.
