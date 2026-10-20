# Backend Sabli

Fundação Java da API. O frontend React em `src/` continua autônomo: ainda não há autenticação real, operações de negócio nem integração HTTP com o SPA.

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

Defina `SABLI_DATASOURCE_PASSWORD` no `.env`. Não commite esse arquivo.

```bash
docker compose --env-file .env up -d
```

Exporte as variáveis do `.env` no shell e suba a API:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

No PowerShell: `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"` depois de definir as variáveis de ambiente.

Saúde pública: `GET http://127.0.0.1:8080/actuator/health` → `{"status":"UP"}`.

Qualquer outro caminho responde 401. Não existe usuário administrador, senha padrão, JWT nem RBAC.

### Variáveis

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `SABLI_DATASOURCE_URL` | no perfil `local` | JDBC PostgreSQL 17 |
| `SABLI_DATASOURCE_USERNAME` | no perfil `local` | Usuário do banco |
| `SABLI_DATASOURCE_PASSWORD` | no perfil `local` | Senha. Sem valor default no Git |
| `SABLI_CORS_ALLOWED_ORIGINS` | não | Origens permitidas, separadas por vírgula. Default `http://127.0.0.1:5173` |
| `SABLI_OPENAPI_ENABLED` | não | Liga `/v3/api-docs` no perfil `local`. Continua autenticado |

## Testes da API

Os testes sobem PostgreSQL 17 com Testcontainers. Não usam banco de produção.

```bash
cd apps/api
./mvnw -B verify
```

No Windows: `mvnw.cmd -B verify`.

## Migrations

Arquivos em `apps/api/src/main/resources/db/migration/`, padrão Flyway `V{versão}__descricao.sql`.

A `V1` só habilita `pgcrypto`. Tabelas de pedidos, pagamentos e clientes ficam para os próximos checkpoints. O Flyway aplica as migrations na subida da API e nos testes.

Não rode `flyway:repair` nem `flyway:clean` contra um banco compartilhado.

## Falhas comuns

| Sintoma | Causa provável |
| --- | --- |
| Contexto Spring não sobe no `local` | Variáveis `SABLI_DATASOURCE_*` ausentes |
| Testcontainers falha | Docker parado |
| 401 em `/actuator/health` | Caminho errado; o público é `/actuator/health` |
| 403 com origem desconhecida | CORS recusou o `Origin`; ajuste `SABLI_CORS_ALLOWED_ORIGINS` |
| Vitest timeout no CI | Jobs do frontend precisam permanecer sequenciais no mesmo runner |
| `expectedHeadOid` no merge de PR | O GitHub exige SHA completa de 40 caracteres |

## Limites desta fundação

- Sem login, JWT, RBAC ou usuário inicial.
- Sem entidades de negócio.
- Sem integração React → API.
- Actuator expõe só `health`, sem detalhes.
- OpenAPI está no classpath, desligado por padrão e protegido por autenticação.
- Micrometer/Prometheus não está exposto.
- CORS aceita somente origens configuradas, sem credenciais.

O próximo checkpoint (2.0B) trata identidade, organizações, estabelecimentos e isolamento multi-tenant.
