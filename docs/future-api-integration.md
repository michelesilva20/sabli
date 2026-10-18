# Integração futura com a API Java

A fundação Spring Boot está em `apps/api`. Ela ainda não expõe operações de negócio. O frontend continua em `SabliDataSource` (`src/shared/api/data-source.ts`) com fixtures e atraso curto.

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

`calculatePizzaPrice` documenta duas regras de demonstração. O contrato final deve devolver o total calculado pela API, inclusive borda, adicionais, tamanho e estratégia configurada pelo estabelecimento. O navegador pode exibir uma prévia, mas o valor cobrado será o da resposta Java.

## Fora desta fundação

Autenticação, permissões reais, pagamento de adquirente, dados de cartão, fiscal, delivery, reservas completas e sincronização do KDS não têm contrato implementado. Não devem ser simulados como se já existissem.
