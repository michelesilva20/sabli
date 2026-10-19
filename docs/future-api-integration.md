# Integração futura com a API Java

A API em `apps/api` já autentica e persiste catálogo, mesas, pedidos/KDS, comandas e caixa. O frontend continua em `SabliDataSource` (`src/shared/api/data-source.ts`) com fixtures e atraso curto. O mapeamento está em [catalog-contracts.md](catalog-contracts.md), [dining-contracts.md](dining-contracts.md), [orders-contracts.md](orders-contracts.md) e [billing-contracts.md](billing-contracts.md).

Quando a API existir, a troca prevista é substituir `mockDataSource` por um cliente HTTP, mantendo os mesmos métodos e os tipos de `src/shared/types/domain.ts`.

## Leituras

- Estabelecimentos da conta.
- Indicadores do dashboard por estabelecimento e período.
- Mesas, categorias, produtos e opções de pizza.
- Pedidos, sementes de cozinha, equipe e notificações.

Os gráficos e a listagem devem passar a receber os contratos da API, sem recalcular faturamento oficial no navegador.

## Escritas que hoje são locais

A sessão em `src/shared/demo/session.ts` concentra o que a API deverá validar:

- abrir mesa e pedir conta;
- incluir item, aplicar desconto e enviar pedido à cozinha;
- avançar ticket de preparo;
- disponibilidade de produto;
- abrir caixa, lançar movimento, registrar pagamento e fechar turno;
- inclusão de pessoa da equipe;
- atualização do perfil da conta demonstrativa.

Essas operações precisarão de comandos idempotentes, conferência de estoque, regra de preço e autorização no servidor. O frontend não deve ser tratado como fonte da verdade.

## Preço da pizza

`calculatePizzaPrice` no frontend permanece como prévia local. `POST /api/v1/establishments/{id}/catalog/pizza/quotes` já devolve o total do servidor (borda, adicionais, tamanho e estratégia). A cotação não reserva preço; a confirmação do pedido congela nomes, composição e valores.

## Fora desta fundação

Pagamento de adquirente, dados de cartão, fiscal, delivery, reservas completas e sincronização do KDS no SPA não têm contrato implementado. PIX e cartão no Java são declaração manual do operador.
