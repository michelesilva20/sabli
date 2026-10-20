# Backend Sabli

API Java da plataforma. O frontend React em `src/` continua autônomo: fixtures, sessão demonstrativa e nenhum login visual. Identidade, catálogo, mesas e pedidos/KDS estão persistidos. Caixa e pagamentos ainda não existem no backend.

## Requisitos

- JDK 25 LTS (Temurin)
- Docker Desktop, para PostgreSQL 17 nos testes e no ambiente local
- Node.js 22+ e npm 11+, para o frontend

## Frontend

Na raiz do repositório:

```bash
npm ci
npm run dev
```

App em `http://127.0.0.1:5173/`.

| Comando | Uso |
| --- | --- |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright no preview |
| `npm run typecheck` / `npm run lint` / `npm run build` | Qualidade e build |

## API

```bash
cd apps/api
cp .env.example .env
```

Defina `SABLI_DATASOURCE_PASSWORD` e `SABLI_JWT_SECRET` (mínimo 32 caracteres) no `.env`. Não commite esse arquivo. Com `SABLI_REGISTRATION_MODE=BOOTSTRAP_TOKEN`, defina também `SABLI_BOOTSTRAP_SIGNUP_TOKEN`. Token vazio recusa o cadastro público.

```bash
docker compose --env-file .env up -d
```

Exporte as variáveis do `.env` no shell e suba a API:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

No PowerShell: `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"` depois de definir as variáveis de ambiente.

Saúde pública: `GET http://127.0.0.1:8080/actuator/health` → `{"status":"UP"}`.

### Variáveis

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `SABLI_DATASOURCE_URL` | no perfil `local` | JDBC PostgreSQL 17 |
| `SABLI_DATASOURCE_USERNAME` | no perfil `local` | Usuário do banco |
| `SABLI_DATASOURCE_PASSWORD` | no perfil `local` | Senha. Sem valor default no Git |
| `SABLI_JWT_SECRET` | sim | Segredo HS256, no mínimo 32 caracteres. Sem default útil no Git |
| `SABLI_REGISTRATION_MODE` | não | `DISABLED`, `OPEN` ou `BOOTSTRAP_TOKEN`. Default `BOOTSTRAP_TOKEN` |
| `SABLI_BOOTSTRAP_SIGNUP_TOKEN` | no modo bootstrap | Convite para criar a primeira organização. Vazio recusa o cadastro |
| `SABLI_CORS_ALLOWED_ORIGINS` | não | Origens permitidas, separadas por vírgula. Default `http://127.0.0.1:5173` |
| `SABLI_OPENAPI_ENABLED` | não | Liga `/v3/api-docs` no perfil `local`. Continua autenticado |
| `SABLI_BCRYPT_STRENGTH` | não | Custo BCrypt. Default 12 |

## Identidade e isolamento

Hierarquia: Organization → Establishment → memberships. Um usuário pode pertencer a várias organizações e estabelecimentos. Não há relação 1:1 entre usuário e organização.

Cadastro inicial: `POST /api/v1/auth/register-organization` cria organização, estabelecimento e o primeiro administrador. Não existe usuário admin fixo nem senha default no repositório.

Autenticação:

- Login por e-mail (normalizado) e senha (BCrypt).
- Access JWT HS256, curta duração (~15 min), claims `sub` e `typ=access`. Sem organização nem estabelecimento no token.
- Refresh opaco, 32 bytes, armazenado só como SHA-256. Rotação por família; reuso revoga a família. Logout revoga a sessão apresentada.
- Bloqueio após 5 senhas inválidas por 15 minutos. Mensagem genérica, sem enumerar e-mail.

Contexto de tenant: IDs vão no path ou em `POST /api/v1/me/context`. O servidor valida membership ativa. JWT válido não autoriza sozinho. Recurso de outro tenant responde 404. Tenant `SUSPENDED` bloqueia mutações operacionais (`TENANT_SUSPENDED`). Membership `REVOKED` some do acesso.

### Papéis

Organização: `ADMIN`, `MANAGER`. Estabelecimento: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN`.

- `ADMIN` da organização administra a organização, estabelecimentos e qualquer membership.
- `MANAGER` da organização opera a organização, mas não concede `ADMIN` de organização nem `ADMIN` de estabelecimento.
- Papéis operacionais do estabelecimento não gerenciam organizações nem elevam privilégios acima do próprio rank.
- Garçom e cozinha não gerenciam memberships.

O PostgreSQL impede membership de estabelecimento com `organization_id` de outra organização (FK composta).

### Endpoints `/api/v1`

| Método | Caminho | Auth |
| --- | --- | --- |
| POST | `/auth/register-organization` | público, sujeitos à política de cadastro |
| POST | `/auth/login` | público |
| POST | `/auth/refresh` | público (precisa do refresh válido) |
| POST | `/auth/logout` | público (revoga se o refresh existir) |
| GET | `/me` | JWT |
| POST | `/me/context` | JWT |
| GET | `/organizations` | JWT |
| GET/PATCH | `/organizations/{id}` | JWT + membership |
| GET/POST | `/organizations/{id}/establishments` | JWT + autorização |
| GET/PUT/DELETE | `/organizations/{id}/memberships` | JWT + ADMIN/MANAGER da org |
| GET/PATCH | `/establishments/{id}` | JWT + membership |
| GET/PUT/DELETE | `/establishments/{id}/memberships` | JWT + gestor autorizado |

Erros seguem Problem Detail com `code`. Respostas usam DTOs: nenhum hash, token de sessão ou entidade JPA vazam.

## Testes da API

Os testes sobem PostgreSQL 17 com Testcontainers. Não usam banco de produção.

```bash
cd apps/api
./mvnw -B verify
```

No Windows: `mvnw.cmd -B verify`.

Os testes cobrem identidade, catálogo, mesas/atendimentos, isolamento multi-tenant, concorrência de abertura, Flyway até V4, OpenAPI e constraints do PostgreSQL.

## Migrations

Arquivos em `apps/api/src/main/resources/db/migration/`, padrão Flyway `V{versão}__descricao.sql`.

- `V1` habilita `pgcrypto`.
- `V2` cria `users`, `organizations`, `establishments`, `organization_memberships`, `establishment_memberships` e `refresh_sessions`.
- `V3` cria o catálogo e a precificação de pizza.
- `V4` cria `dining_tables` e `table_services`.
- `V5` cria pedidos, snapshots de itens e tickets de cozinha.

Tabelas de pedidos, pagamentos e clientes ficam para os próximos checkpoints. O Flyway aplica as migrations na subida da API e nos testes.

Não rode `flyway:repair` nem `flyway:clean` contra um banco compartilhado.

## Falhas comuns

| Sintoma | Causa provável |
| --- | --- |
| Contexto Spring não sobe no `local` | Variáveis `SABLI_DATASOURCE_*` ou `SABLI_JWT_SECRET` ausentes |
| Cadastro de organização 403 | Modo `BOOTSTRAP_TOKEN` sem convite, ou `DISABLED` |
| Testcontainers falha | Docker parado |
| 401 em `/actuator/health` | Caminho errado; o público é `/actuator/health` |
| 403 com origem desconhecida | CORS recusou o `Origin`; ajuste `SABLI_CORS_ALLOWED_ORIGINS` |
| Vitest timeout no CI | Jobs do frontend precisam permanecer sequenciais no mesmo runner |
| `expectedHeadOid` no merge de PR | O GitHub exige SHA completa de 40 caracteres |

## Catálogo

Tudo vive no estabelecimento autenticado. IDs de outro tenant respondem 404. Estabelecimento suspenso bloqueia leitura e escrita comerciais.

| Recurso | Caminho |
| --- | --- |
| Categorias | `GET/POST /api/v1/establishments/{id}/catalog/categories` |
| Produtos | `GET/POST /catalog/products`, `GET/PATCH /products/{id}` |
| Disponibilidade | `PATCH /products/{id}/availability` |
| Variações | `POST/PATCH /products/{id}/variants` |
| Pizza | `GET /catalog/pizza`, `PATCH /pizza/settings` |
| Tamanhos, sabores, bordas, adicionais | `POST/PATCH /pizza/sizes\|flavors\|crusts\|extras` |
| Cotação | `POST /catalog/pizza/quotes` — informativa, sem reserva |

Preço em centavos. Estratégias `HIGHEST` (sabor mais caro) e `AVERAGE` (média half-up). Tamanhos são configuração; o motor não fixa Broto/Média/Grande/Família. Mapeamento TS: [catalog-contracts.md](catalog-contracts.md).

`WAITER`, `KITCHEN` e `CASHIER` leem e cotam. Só `ADMIN`/`MANAGER` (org ou estabelecimento) alteram catálogo e preços.

## Mesas e atendimentos

Cadastro da mesa e atendimento ativo são entidades distintas. A ocupação do mapa é **derivada** (não é coluna). Encerrar a mesa sem quitação responde `409 CLOSE_REQUIRES_SETTLEMENT`. Mapeamento TS: [dining-contracts.md](dining-contracts.md).

| Recurso | Caminho |
| --- | --- |
| Mesas | `GET/POST /api/v1/establishments/{id}/tables` |
| Cadastro | `GET/PATCH /tables/{id}`, `PATCH .../availability`, `PATCH .../status` |
| Atendimento ativo | `GET/POST /tables/{id}/service` |
| Conta | `POST /tables/{id}/service/bill` e `/reopen` |
| Encerramento | `POST /tables/{id}/service/close` — bloqueado até o caixa |
| Histórico | `GET /tables/{id}/services`, `GET /table-services` |

`ADMIN`/`MANAGER` administram o cadastro. `WAITER` e `CASHIER` abrem atendimento e pedem conta. `KITCHEN` só lê.

## Pedidos e KDS

Confirmação congela nomes, composição e preços. Idempotência por `Idempotency-Key` no estabelecimento e no usuário. Mapeamento TS: [orders-contracts.md](orders-contracts.md).

| Recurso | Caminho |
| --- | --- |
| Pedidos | `POST/GET /api/v1/establishments/{id}/orders` |
| Detalhe | `GET /orders/{orderId}` |
| Fila da cozinha | `GET /kitchen/tickets` |
| Avanço | `POST /kitchen/tickets/{id}/advance` e `.../items/{itemId}/advance` |

Desconto promocional do SPA não entra no total. Encerramento da mesa continua `409 CLOSE_REQUIRES_SETTLEMENT`.

## Limites deste checkpoint

- Sem caixa, pagamentos ou faturamento. Encerramento de mesa sem quitação permanece bloqueado.
- Sem MFA.
- Sem integração React → API. `SabliDataSource` e a sessão demonstrativa permanecem.
- Actuator expõe só `health`, sem detalhes.
- OpenAPI está no classpath, desligado por padrão e protegido por autenticação.
- Micrometer/Prometheus não está exposto.
- CORS aceita somente origens configuradas, sem credenciais.
