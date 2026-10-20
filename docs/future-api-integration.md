# Integração com a API Java

Visão rápida e contratos já ligados. Arquitetura: [arquitetura](arquitetura.md). Setup: [desenvolvimento local](desenvolvimento-local.md).

A API em `apps/api` autentica e persiste catálogo, mesas, pedidos/KDS, comandas e caixa. O frontend opera em dois modos, sem fallback silencioso:

| Modo | `VITE_SABLI_MODE` | Dados |
| ---- | ----------------- | ----- |
| DEMO | `demo` (padrão) | `SabliDataSource` + `demo/session.ts` |
| API | `api` | Cliente HTTP + sessão em memória. Catálogo, mesas, pedidos, KDS, comandas e caixa ligados |

`VITE_SABLI_API_BASE_URL` aponta para `http://127.0.0.1:8080` no desenvolvimento.

## Já ligado no modo API

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` (cookie HttpOnly, sem `refreshToken` no JSON)
- `POST /api/v1/auth/logout`
- `GET /api/v1/me` (`lastOrganizationId` / `lastEstablishmentId` como hint)
- `POST /api/v1/me/context` (valida membership e lembra o último estabelecimento)
- `DELETE /api/v1/me/context`
- `GET/POST/PATCH /api/v1/establishments/{id}/catalog/**`
- `POST /api/v1/establishments/{id}/catalog/pizza/quotes`
- `GET/POST/PATCH /api/v1/establishments/{id}/tables/**`
- `POST /api/v1/establishments/{id}/tables/{id}/service`, `/bill`, `/reopen` e `/close` (`empty` + `reason` para atendimento sem consumo)
- `GET /api/v1/establishments/{id}/table-services`
- `GET /api/v1/establishments/{id}/table-services/{id}/bill`
- `GET /api/v1/establishments/{id}/orders/{id}/bill`
- `GET /api/v1/establishments/{id}/bills/{id}` e `/payments`
- `POST /api/v1/establishments/{id}/bills/{id}/payments` (`Idempotency-Key`)
- `POST/GET /api/v1/establishments/{id}/cash/sessions` e `/current`
- `POST /api/v1/establishments/{id}/cash/sessions/{id}/movements` e `/close`

Access token só em memória. Refresh só no cookie `sabli_refresh`. CORS com credenciais.

## Ainda não ligado

Quando o modo API abre relatórios ou equipe, a tela declara que o módulo ainda não está disponível. Produtos, PDV, pedidos, cozinha, comandas, caixa e o mapa de mesas usam o backend. Fixtures não aparecem como dados reais. Pagamentos PIX/cartão são declaração manual.

Pedidos ligados:

- `POST/GET /api/v1/establishments/{id}/orders`
- `GET /api/v1/establishments/{id}/orders/{orderId}`
- `GET /api/v1/establishments/{id}/kitchen/tickets` (`includeComposition=true`)
- `POST .../kitchen/tickets/{id}/advance`
- `POST .../kitchen/tickets/{id}/items/{itemId}/advance`

O mapeamento operacional continua em [catalog-contracts.md](catalog-contracts.md), [dining-contracts.md](dining-contracts.md), [orders-contracts.md](orders-contracts.md) e [billing-contracts.md](billing-contracts.md).

## Escritas que hoje são locais (DEMO)

A sessão em `src/shared/demo/session.ts` concentra o que a API deverá validar no modo API:

- abrir mesa e pedir conta;
- incluir item, aplicar desconto e enviar pedido à cozinha;
- avançar ticket de preparo;
- disponibilidade de produto;
- abrir caixa, lançar movimento, registrar pagamento e fechar turno;
- inclusão de pessoa da equipe.

Essas operações precisarão de comandos idempotentes e autorização no servidor.

## Preço da pizza

`calculatePizzaPrice` no frontend permanece como prévia local no DEMO. `POST /api/v1/establishments/{id}/catalog/pizza/quotes` já devolve o total do servidor.

## Fora desta fundação

Pagamento de adquirente, dados de cartão, fiscal, delivery, reservas completas e sincronização do KDS no SPA não têm contrato implementado. PIX e cartão no Java são declaração manual do operador.
