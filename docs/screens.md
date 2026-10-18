# Telas e rotas

Nada nesta lista persiste em servidor. Onde uma ação muda a tela, a mudança vale só para a sessão do navegador.

| Rota                | Tela          | Comportamento                                                                                                                                         |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/inicio`           | Dashboard     | Saudação, período e estabelecimento alteram os indicadores de exemplo.                                                                                |
| `/mesas`            | Mapa de mesas | Mapa ou lista, filtro por status, detalhe em sheet, abrir atendimento e pedir conta. Nova reserva explica que o fluxo completo não existe nesta fase. |
| `/pedidos`          | Pedidos       | Lista de exemplo mais os pedidos enviados na sessão.                                                                                                  |
| `/pdv`              | PDV           | Categorias, busca, indisponíveis, rascunho e envio local para a cozinha.                                                                              |
| `/pdv/montar-pizza` | Montador      | Tamanho, sabores, frações iguais, borda, adicionais, observação, revisão e inclusão no pedido.                                                        |
| `/comandas`         | Comandas      | Contas parciais das mesas ocupadas ou aguardando conta.                                                                                               |
| `/produtos`         | Produtos      | Cardápio e disponibilidade local.                                                                                                                     |
| `/cozinha`          | KDS           | Segue o tema do painel. Avanço explícito entre aguardando, preparo, pronto e entregue. O indicador diz Demonstração.                                  |
| `/caixa`            | Caixa         | Abertura com validação, lançamentos, divisão de conta e fechamento. Pagamentos são simulados e não coletam cartão.                                    |
| `/relatorios`       | Relatórios    | Mesma base ilustrativa do painel, com aviso de que não é fechamento.                                                                                  |
| `/equipe`           | Equipe        | Lista de exemplo e inclusão local, sem convite.                                                                                                       |
| `/configuracoes`    | Configurações | Tema, módulos visíveis e telefone que não é gravado.                                                                                                  |
| `/perfil`           | Perfil        | Dados da conta demonstrativa. Nome, e-mail, telefone e turno valem só nesta sessão.                                                                   |
| `/atendimento/*`    | Garçom        | Navegação inferior: mesas, cardápio, pedido e conta. Inclui detalhe, comanda, montador e revisão.                                                     |
| `/design-system`    | Sabli UI      | Inspeção interna. Só existe no `dev`.                                                                                                                 |

O atendimento do garçom não reaproveita a sidebar do painel. Em telas largas ele fica numa coluna estreita para revisão; no celular ocupa a largura toda.
