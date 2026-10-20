# Contratos de catálogo (Java ↔ TypeScript)

O SPA ainda usa fixtures em `SabliDataSource`. Esta tabela documenta o mapeamento para a integração posterior. Não substitua o data source neste checkpoint.

Preços em **centavos inteiros**. O servidor é a autoridade; o cliente não envia o total cobrado.

| TypeScript (`src/shared/types/domain.ts`) | API Java (`/api/v1/establishments/{id}/catalog`) |
| --- | --- |
| `ProductCategory` | `GET/POST /categories` → `CategoryResponse` |
| `Product` | `GET/POST/PATCH /products` → `ProductResponse` (`priceCents` = menor variação ativa) |
| — | `ProductResponse.variants` → variações e preços |
| `Product.available` | `PATCH /products/{id}/availability` |
| `PizzaFlavor` + `grandePriceCents` | `GET /pizza` → `FlavorResponse.pricesBySizeId` |
| `PizzaSizeId` / `PIZZA_SIZES` | `GET/POST /pizza/sizes` — nomes e fatores são dados, não enum do motor |
| `PizzaCrust` | `GET/POST /pizza/crusts` (`priceCents = 0` é borda gratuita) |
| `PizzaExtra` | `GET/POST /pizza/extras` |
| `PricingStrategy` `'highest' \| 'proportional'` | `HIGHEST` / `AVERAGE` em `/pizza/settings` |
| `calculatePizzaPrice` | `POST /pizza/quotes` — cotação informativa, sem reserva |

Arredondamento: half-up para o centavo mais próximo (`Math.round` em Java e no frontend).

Leitura: qualquer membership ativa do estabelecimento. Escrita (preço, produto, pizza): `ADMIN`/`MANAGER` da organização ou `ADMIN`/`MANAGER` do estabelecimento. `CASHIER`, `WAITER` e `KITCHEN` só leem e cotam.
