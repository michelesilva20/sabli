# Contratos de comandas, pagamentos e caixa (Java ↔ TypeScript)

No modo API o SPA consome os endpoints abaixo. O DEMO continua em `demo/session.ts`, sem fallback silencioso.

PIX, débito e crédito no backend são **registros manuais** (`captureKind: MANUAL_DECLARED`). Não há confirmação bancária, adquirente ou TEF.

O desconto ilustrativo de 10% do PDV (`ILLUSTRATIVE_DISCOUNT_PERCENT`) **não** entra no total da comanda. Pedidos do 2.0E já persistem `discountCents = 0`.

## Fonte da verdade

| Conceito | Persistido? | Onde |
| --- | --- | --- |
| Comanda de mesa | Sim | `bills.kind = TABLE` → um `table_service_id` |
| Conta de balcão | Sim | `bills.kind = COUNTER` → um `order_id` |
| Totais | Derivados dos pedidos congelados | `subtotalCents`, `discountCents`, `totalCents` |
| Pagamentos | Sim | `bill_payments` (`tendered`, `applied`, `change`) |
| Saldo | Derivado | `remainingCents = total − paid` |
| Caixa | Sim | uma sessão `OPEN` por **estabelecimento** |
| Gaveta | Só dinheiro | `OPENING + SUPPLY − BLEED + SALE(CASH aplicado)` |

Terminais simultâneos de caixa ficam para uma evolução futura. Escopo atual: `ESTABLISHMENT`.

Depois do primeiro pagamento, o atendimento não recebe novos pedidos (`PAYMENT_STARTED`). Não há estorno nesta etapa.

Encerrar o caixa **não** invalida pagamentos já gravados nem impede fechar uma mesa já quitada.

## Mapeamento

| TypeScript | API Java (`/api/v1/establishments/{id}`) |
| --- | --- |
| `TableService` + linhas / `billCents` | `GET /table-services/{serviceId}/bill` → `BillResponse` |
| Pedido de balcão | `GET /orders/{orderId}/bill` |
| `applyTender` / `registerPayment` | `POST /bills/{billId}/payments` + `Idempotency-Key` |
| `paidCents` / `remainingCents` | `paidCents`, `remainingCents`, `status` |
| `openCash` | `POST /cash/sessions` `{ openingFloatCents }` |
| Caixa atual | `GET /cash/sessions/current` |
| `addCashMovement` in/out | `POST /cash/sessions/{id}/movements` `{ type: SUPPLY\|BLEED }` |
| `drawerCashCents` / `salesByMethod` | `drawerCashCents`, `totalsByMethod` |
| `closeService` | `POST /tables/{id}/service/close` — quitado (`SETTLED` com total > 0) ou `{ "empty": true, "reason" }` |

Meios: `CASH`, `PIX`, `DEBIT_CARD`, `CREDIT_CARD` (SPA usa `cash` / `pix` / `debit` / `credit`). Vale (`voucher`) não existe no backend.

Dinheiro acima do saldo gera troco; o valor aplicado à conta é o restante, não o recebido.

## Permissões

- Consultar comanda: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`.
- Pagamentos e caixa: `ADMIN`, `MANAGER`, `CASHIER`.
- Encerrar mesa quitada ou atendimento sem consumo (com motivo): papéis que operam o salão (`WAITER` incluído). Conta de R$ 0,00 não é `SETTLED`.
- `KITCHEN` não lê dados financeiros detalhados.
