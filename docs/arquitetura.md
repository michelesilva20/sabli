# Arquitetura

Visão vertical do que o código faz hoje. Contratos detalhados ficam nos documentos especializados.

```text
React SPA
   ↓
Cliente HTTP (`src/shared/api/http-client.ts`)
   ↓
Spring Boot API (`apps/api`, monólito modular)
   ↓
Domínios: identity, catalog, dining, orders, billing, cash
   ↓
PostgreSQL 17 (Flyway V1–V8)
```

## Multi-tenancy

Hierarquia: Organization → Establishment → memberships. Um usuário pode operar várias lojas. IDs de tenant vão no path ou em `POST /api/v1/me/context`. JWT válido não autoriza sozinho. Recurso de outro tenant responde 404. Tenant `SUSPENDED` bloqueia mutações (`TENANT_SUSPENDED`).

## Autenticação

- Login por e-mail normalizado e senha BCrypt.
- Access JWT HS256 (~15 min) só com `sub` e `typ=access`, guardado em memória no SPA.
- Refresh opaco no cookie HttpOnly `sabli_refresh` (`Path=/api/v1/auth`, `SameSite=Lax`). O JSON não devolve `refreshToken`.
- Cadastro público desligado por padrão (`BOOTSTRAP_TOKEN`). Não há admin com senha fixa no repositório.

## Contexto de estabelecimento

`GET /me` devolve um hint do último estabelecimento. `POST /me/context` revalida membership e grava `users.last_*`. Trocar de loja limpa o estado operacional em memória.

## Precificação no servidor

O SPA envia intenção de item. A API congela preços no pedido. Pizza usa `POST .../catalog/pizza/quotes`. Totais da comanda saem dos pedidos persistidos, em centavos inteiros.

## Idempotência

Pagamentos aceitam `Idempotency-Key`. Reenvio com a mesma chave não duplica quitação.

## Fluxo financeiro

Pedido confirmado → comanda (`TABLE` ou `COUNTER`) → pagamentos `MANUAL_DECLARED` → saldo `remainingCents` → caixa da loja. Encerrar atendimento quitado exige `remainingCents == 0` e `totalCents > 0`. Atendimento sem consumo usa `empty` + motivo. Sem adquirente, TEF, fiscal ou estorno.

## DEMO vs API

| | DEMO | API |
| --- | --- | --- |
| Flag | `VITE_SABLI_MODE=demo` | `api` |
| Dados | fixtures + `demo/session.ts` | PostgreSQL |
| Login | sessão ilustrativa | JWT real |
| Persistência | some no F5 | Flyway + JPA |

Os modos não se misturam. Falha HTTP no modo API permanece erro.

## Onde ler mais

- Contratos: [catálogo](catalog-contracts.md), [mesas](dining-contracts.md), [pedidos](orders-contracts.md), [comandas e caixa](billing-contracts.md)
- API: [backend](backend.md)
- Frontend: [frontend-architecture](frontend-architecture.md)
- Setup: [desenvolvimento-local](desenvolvimento-local.md)
