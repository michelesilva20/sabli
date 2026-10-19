# Sabli

Plataforma SaaS da **Emilabs** para gestão de restaurantes e pizzarias.

Slogan: **Seu negócio inteiro. Em um só lugar.**

O frontend React opera em dois modos: **DEMO** (fixtures e sessão volátil) e **API** (login real contra o Java em `apps/api`). O panorama completo do projeto está em [docs/projeto.md](docs/projeto.md).

## Requisitos

- Node.js 22 ou superior
- npm 11 ou superior
- JDK 25 LTS e Docker, para a API em `apps/api`

## Instalação

```bash
npm install
```

## Comandos

| Comando             | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Sobe o Vite em desenvolvimento (DEMO)       |
| `npm run typecheck` | Verifica o TypeScript estrito               |
| `npm run lint`      | Roda o ESLint                               |
| `npm run test`      | Roda os testes unitários e de componente    |
| `npm run test:e2e`  | Roda o Playwright contra o build de preview |
| `npm run build`     | Gera o build de produção                    |
| `npm run preview`   | Serve o build                               |

A rota `/design-system` existe apenas com `npm run dev`. Ela não entra no roteador dos builds de produção.

Modo API no PowerShell: `$env:VITE_SABLI_MODE='api'; npm run dev`, com a API no ar.

## API

A fundação Java vive em `apps/api`. Instruções, variáveis e limites: [backend](docs/backend.md).

## Estrutura

```text
src/                 SPA React (DEMO + cliente HTTP)
apps/api/            Spring Boot (identidade até o caixa)
.github/workflows/   CI do frontend e da API
docs/projeto.md      Handbook vivo do produto
```

A referência visual aprovada está em `Montagem UI SaaS para Pizzaria.png`.

## Documentação

- [Projeto (completo)](docs/projeto.md)
- [Design system](docs/design-system.md)
- [Arquitetura](docs/frontend-architecture.md)
- [Telas](docs/screens.md)
- [Integração com a API](docs/future-api-integration.md)
- [Backend](docs/backend.md)
