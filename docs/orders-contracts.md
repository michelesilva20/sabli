# Contratos de pedidos e KDS (Java ↔ TypeScript)

O modo DEMO continua em `demo/session.ts`. No modo API, o SPA confirma pedidos com `POST /orders` e acompanha a produção em `GET /kitchen/tickets`.

## Fonte da verdade

| Conceito | Persistido? | Onde |
| --- | --- | --- |
| Pedido confirmado | Sim | `orders` |
| Itens e composição estruturada | Sim | `order_items`, `order_item_pizza_flavors`, `order_item_modifiers` |
| Preço unitário, subtotal e total | Sim, congelado na confirmação | centavos inteiros |
| Desconto | Campo `discountCents` | sempre `0` nesta etapa |
| Ticket de cozinha | Sim | `kitchen_tickets` + `kitchen_ticket_items` |
| Estado de produção do item | Sim | `kitchen_ticket_items.production_status` |
| Estado agregado da produção | **Derivado** dos itens e cacheado | WAITING / PREPARING / READY / DELIVERED |
| Estado comercial | Sim | `CONFIRMED` |
| Estado financeiro / quitação | Não | módulo de caixa |

O desconto ilustrativo de 10% do PDV (`ILLUSTRATIVE_DISCOUNT_PERCENT`) **não** é aplicado no backend. Promoções ficam para um motor futuro.

Pedido de mesa exige `TableService` **OPEN** do mesmo estabelecimento. `AWAITING_BILL` e `CLOSED` recusam novos pedidos. Pedido de balcão não leva mesa.

## Precificação

O cliente envia IDs e quantidades. O servidor recalcula:

- produto comum: preço da variação ativa no catálogo;
- pizza: motor do 2.0C (`HIGHEST` / `AVERAGE`, borda, adicionais, half-up).

Alterar o catálogo depois **não** muda o pedido histórico.

A cotação de pizza não reserva preço. `PlaceOrderRequest.expectedTotalCents` é opcional: se o total do servidor divergir, a API responde `409 PRICE_CHANGED` com `actualTotalCents` **antes** de persistir. O operador confirma o valor atual na mesma tentativa lógica (mesma `Idempotency-Key`).

## Mapeamento

| TypeScript | API Java (`/api/v1/establishments/{id}`) |
| --- | --- |
| `sendToKitchen` / `LocalOrder` | `POST /orders` + header `Idempotency-Key` |
| `CatalogOrder` / `SaleItem` | `GET /orders/{id}` → `OrderResponse` |
| `PizzaComposition` | `OrderItemResponse.pizza` (sabores com frações iguais) |
| `LiveTicket` | `GET /kitchen/tickets` |
| `advanceTicketItem` | `POST /kitchen/tickets/{id}/items/{itemId}/advance` |
| `advanceTicket` | `POST /kitchen/tickets/{id}/advance` — só itens no estado agregado atual |

Fila de um atendimento (base do caixa): `GET /orders?tableServiceId={id}`.

## Permissões

- Criar pedido: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`.
- Ler pedidos e fila: membership ativa, inclusive `KITCHEN`.
- Avançar produção: `KITCHEN`, `ADMIN`, `MANAGER` do estabelecimento (ou org).
