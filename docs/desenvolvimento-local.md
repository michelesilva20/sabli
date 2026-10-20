# Desenvolvimento local

Primeiro uso no Windows (PowerShell). Linux/macOS usam os mesmos scripts `npm`; troque `copy` por `cp`.

Não há hospedagem. Tudo roda na máquina do desenvolvedor.

## Requisitos

- Node.js 22+ e npm 11+
- JDK 25 LTS no `PATH` ou em `JAVA_HOME` (`java -version` deve mostrar 25)
- Docker Desktop, para o PostgreSQL 17
- Maven Wrapper em `apps/api` (`mvnw` / `mvnw.cmd`) — Maven global não é necessário

## 1. Configurar variáveis

```powershell
copy .env.example .env
copy apps\api\.env.example apps\api\.env
```

No `apps/api/.env`:

| Variável | Função |
| --- | --- |
| `SABLI_DATASOURCE_*` | JDBC local. A senha precisa coincidir com `SABLI_POSTGRES_PASSWORD` |
| `SABLI_JWT_SECRET` | HS256, mínimo 32 caracteres. Sem default útil no Git |
| `SABLI_REGISTRATION_MODE` | Deixe `BOOTSTRAP_TOKEN` |
| `SABLI_BOOTSTRAP_SIGNUP_TOKEN` | Convite local. Vazio recusa cadastro |
| `SABLI_COOKIE_SECURE` | `false` em HTTP local |
| `SABLI_DEV_EMAIL` / `SABLI_DEV_PASSWORD` | Conta do seed. Senha ≥ 10 caracteres |
| `SABLI_CORS_ALLOWED_ORIGINS` | Default já inclui `5173` e as portas Playwright |

No Compose, senha vazia vira `sabli` só para o volume local. Isso não é credencial de produção. Não commite `.env`.

O SPA lê `.env` (DEMO) e `.env.api` (modo API). `VITE_SABLI_API_BASE_URL` padrão: `http://127.0.0.1:8080`.

## 2. Subir o PostgreSQL

```powershell
npm run db:up
```

Sobe `postgres:17-alpine` com healthcheck e volume `sabli_pgdata`. A porta no host é **5435** por padrão, para não colidir com PostgreSQL local em `5432`. Configure `SABLI_POSTGRES_PORT` se essa porta já estiver ocupada.

## 3. Subir a API

```powershell
npm run api:dev
```

Equivalente a `mvnw spring-boot:run -Dspring-boot.run.profiles=local`. O Flyway aplica V1–V8 na subida. Saúde: `GET http://127.0.0.1:8080/actuator/health`.

## 4. Seed de desenvolvimento

Com a API no ar, em outro terminal:

```powershell
npm run dev:seed
```

O script é idempotente: cadastra a organização com o token de bootstrap ou reutiliza o login; cria categoria, produto e mesa 01 se ainda não existirem. Não imprime senha nem access token. Não roda no CI nem em perfil que não seja local.

## 5. Abrir o SPA

| Comando | Modo | URL |
| --- | --- | --- |
| `npm run dev` | DEMO, sem API | `http://127.0.0.1:5173/` |
| `npm run dev:api` | API (`vite --mode api`) | `http://127.0.0.1:5173/entrar` |

Entre com `SABLI_DEV_EMAIL`. A senha é a do seu `.env`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run db:up` | PostgreSQL 17 |
| `npm run db:down` | Para o Compose (o volume persiste) |
| `npm run api:dev` | API no perfil `local` |
| `npm run api:test` | `mvnw verify` (Testcontainers) |
| `npm run dev` / `npm run dev:demo` | Vite DEMO |
| `npm run dev:api` | Vite modo API |
| `npm run dev:seed` | Organização e catálogo mínimos |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright mockado (4173 DEMO, 4174 API build) |
| `npm run test:e2e:real` | Playwright contra API real (4175). API e Postgres já precisam estar no ar |
| `npm run typecheck` / `npm run lint` / `npm run build` | Qualidade e build |
| `npm run build:api` | Bundle do SPA em modo API |

Para a API e o Vite, use `Ctrl+C`. `npm run db:down` não apaga o volume. Para zerar o banco local: `docker compose down -v` — só no seu Docker.

## Portas

| Serviço | Porta |
| --- | --- |
| Vite | 5173 |
| API | 8080 |
| PostgreSQL | 5435 no host → 5432 no container (`SABLI_POSTGRES_PORT`) |
| Playwright DEMO | 4173 |
| Playwright SPA modo API (mock) | 4174 |
| Playwright SPA + API real | 4175 |

## Problemas frequentes

| Sintoma | Causa |
| --- | --- |
| `java -version` não é 25 | Ajuste `JAVA_HOME` para o JDK 25 LTS |
| API não sobe | `.env` ausente, senha JDBC diferente do Compose, JWT curto, porta 5435 ocupada, JDBC de outro PostgreSQL, ou `SPRING_DATASOURCE_*` herdado no shell apontando para `5432` |
| Cadastro recusado | `SABLI_BOOTSTRAP_SIGNUP_TOKEN` vazio ou diferente no seed |
| CORS / refresh | origem fora da allowlist; cookie pede HTTP em `127.0.0.1` |
| Playwright real falha | API fora do ar. Com `BOOTSTRAP_TOKEN`, o teste envia `SABLI_BOOTSTRAP_SIGNUP_TOKEN` do `apps/api/.env`. No CI o cadastro fica `OPEN`. |
