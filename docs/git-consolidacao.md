# Consolidação Git

Plano para integrar a linha de produto na `main`. **Nenhum merge neste documento foi executado.** Merge em `main` exige aprovação humana explícita.

Inspecionado em 20 de outubro de 2026 a partir de `fix/empty-service-close` (`7b87022`).

## Estado real

`main` está em `20c74eb` (merge da PR #6). A linha de produto já é ancestral linear até `7b87022`. Não é necessário recriar histórico nem force push.

A branch `chore/local-dev` (este checkpoint) empilha DX e documentação sobre `fix/empty-service-close`.

## PRs abertas da linha de produto

Ordem de dependência (base → head). Todas `MERGEABLE` no GitHub no momento da inspeção.

| Ordem | PR | Head | Base | CI na inspeção |
| --- | --- | --- | --- | --- |
| 1 | [#7](https://github.com/michelesilva20/sabli/pull/7) | `feat/api-foundation` | `main` | verde |
| 2 | [#8](https://github.com/michelesilva20/sabli/pull/8) | `feat/identity-tenancy` | `feat/api-foundation` | verde |
| 3 | [#9](https://github.com/michelesilva20/sabli/pull/9) | `feat/catalog-pricing` | `feat/identity-tenancy` | verde |
| 4 | [#10](https://github.com/michelesilva20/sabli/pull/10) | `feat/tables-service` | `feat/catalog-pricing` | verde |
| 5 | [#11](https://github.com/michelesilva20/sabli/pull/11) | `feat/orders-kitchen` | `feat/tables-service` | verde |
| 6 | [#12](https://github.com/michelesilva20/sabli/pull/12) | `feat/billing-cash` | `feat/orders-kitchen` | verde |
| 7 | [#13](https://github.com/michelesilva20/sabli/pull/13) | `feat/auth-session` | `feat/billing-cash` | verde |
| 8 | [#14](https://github.com/michelesilva20/sabli/pull/14) | `feat/catalog-api` | `feat/auth-session` | Playwright **vermelho histórico**; as PRs posteriores passaram |
| 9 | [#15](https://github.com/michelesilva20/sabli/pull/15) | `feat/dining-api` | `feat/catalog-api` | verde |
| 10 | [#16](https://github.com/michelesilva20/sabli/pull/16) | `feat/orders-api` | `feat/dining-api` | verde |
| 11 | [#18](https://github.com/michelesilva20/sabli/pull/18) | `feat/billing-api` | `feat/orders-api` | verde |
| 12 | [#19](https://github.com/michelesilva20/sabli/pull/19) | `fix/empty-service-close` | `feat/billing-api` | 4 jobs verdes, inclusive E2E real |
| 13 | DX | `chore/local-dev` | `fix/empty-service-close` | após o CI desta PR |

Merge na ordem acima, um PR por vez, **sem squash** para preservar a história. Depois de cada merge, o GitHub costuma retargetar o próximo para `main`. Conferir a base antes do merge seguinte.

Não apagar branches. Não force push.

## Fora da linha de merge

**PR [#17](https://github.com/michelesilva20/sabli/pull/17)** (`docs/projeto` ← `feat/orders-api`) **não entra nesta sequência.**

- Não é ancestral de `#18`/`#19`.
- Substitui `docs/estado-atual.md` por um handbook que ainda afirma comandas/caixa React desligados.
- Conflitaria com `#18`/`#19`/`chore/local-dev` em README e estado atual.

Depois da `main` conter `#19` + DX, atualizar o handbook contra o estado real (V8, billing ligado, setup local) e só então reabrir ou retargetar `#17`.

## Conflitos

GitHub marca `#7`–`#19` (exceto o conteúdo stale de `#17`) como `MERGEABLE` nas bases empilhadas. O risco aparece se alguém mergear fora de ordem ou mergear `#17` no meio da pilha.

A ponta `7b87022` já contém `#7`–`#16` + `#18` + `#19`. Uma branch temporária de integração não foi criada porque seria idêntica à ponta.

## Validações nesta branch de DX

Executado sobre `chore/local-dev` (acima de `7b87022`):

- Typecheck e lint do SPA
- Vitest: 152 testes
- Maven `verify`: 96 testes
- Playwright mockado: 12 testes
- Playwright real: 2 testes (API + PostgreSQL 17 local)
- Seed local idempotente (`npm run dev:seed`)

Nenhum merge em `main` foi feito.

## Rollback

Se um merge em `main` quebrar CI:

1. Não force push em `main`.
2. `git revert -m 1 <merge-sha>` na ordem inversa dos merges.
3. Branches originais permanecem no remoto para reabrir PR.

## O que precisa de aprovação humana

- Merge de `#7` até `#19` em `main`
- Merge de `chore/local-dev` depois de `#19`
- Destino da `#17` (rebase/reescrita, não merge cego)
