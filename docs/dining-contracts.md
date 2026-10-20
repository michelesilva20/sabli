# Contratos de mesas e atendimento (Java ↔ TypeScript)

No modo API, o SPA consome `src/shared/api/dining.ts`. O modo DEMO continua em `demo/session.ts` e fixtures, sem fallback silencioso.

## Fonte da verdade

| Conceito | Persistido? | Onde |
| --- | --- | --- |
| Cadastro da mesa (número, lugares, área, layout) | Sim | `dining_tables` |
| Disponibilidade cadastral `AVAILABLE` / `RESERVED` / `UNAVAILABLE` | Sim | `dining_tables.availability` |
| Ativação administrativa `ACTIVE` / `INACTIVE` | Sim | `dining_tables.status` |
| Atendimento `OPEN` → `AWAITING_BILL` → `CLOSED` | Sim | `table_services.status` |
| Ocupação do mapa (`LiveTable.status`) | **Derivada** | cadastro + atendimento ativo |
| `billCents` / saldo | Sim | `GET /table-services/{id}/bill` |
| Encerramento / quitação | Sim | close quitado (`SETTLED` com consumo) ou close vazio explícito |

`occupancy` da API equivale a `LiveTable.status`:

- mesa inativa ou `UNAVAILABLE` → `UNAVAILABLE`
- atendimento `OPEN` → `OCCUPIED`
- atendimento `AWAITING_BILL` → `AWAITING_BILL`
- cadastro `RESERVED` sem atendimento → `RESERVED`
- caso contrário → `AVAILABLE`

Uma mesa tem no máximo um atendimento não encerrado (índice único parcial no PostgreSQL). Mesa reservada só ocupa com abertura explícita; a reserva é consumida nesse comando.

## Mapeamento

| TypeScript | API Java (`/api/v1/establishments/{id}`) |
| --- | --- |
| `DiningTable` (fixture) | cadastro em `GET/POST /tables` |
| `LiveTable` | `TableResponse` (`occupancy`, `activeService`) |
| `TableService` | `ServiceResponse` em `/tables/{id}/service` |
| `openTable` | `POST /tables/{id}/service` `{ guests }` |
| `requestBill` | `POST /tables/{id}/service/bill` |
| `reopenService` | `POST /tables/{id}/service/reopen` |
| `closeService` | `POST /tables/{id}/service/close` — quitado: `{}` / `409 CLOSE_REQUIRES_SETTLEMENT`. Sem consumo: `{ "empty": true, "reason" }` |
| histórico | `GET /tables/{id}/services` e `GET /table-services` |

IDs estáveis para o futuro: `table.id`, `service.id`, `establishmentId`, `organizationId`. Pedidos, comandas, pagamentos e caixa devem apontar para o atendimento, não só para o número da mesa.

## Permissões

- Leitura: membership ativa do estabelecimento (inclui `KITCHEN`).
- Cadastro da mesa: `ADMIN`/`MANAGER` da organização ou do estabelecimento.
- Abrir, pedir conta e reabrir: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`. `KITCHEN` não opera o salão.
- Encerrar com consumo: papéis que operam o salão, somente com conta `SETTLED` e total > 0. Sem quitação: `409 CLOSE_REQUIRES_SETTLEMENT`.
- Encerrar sem consumo: o mesmo RBAC, com `{ "empty": true, "reason" }` (3–140 caracteres). Pedido confirmado → `409 CLOSE_HAS_CONSUMPTION`. Pagamento → `409 CLOSE_HAS_PAYMENTS`. Conta de R$ 0,00 **não** é `SETTLED`.
