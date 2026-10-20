# Sabli

Fundação de frontend do **Sabli**, plataforma SaaS da **Emilabs** para gestão de restaurantes e pizzarias.

Slogan: **Seu negócio inteiro. Em um só lugar.**

Esta versão é uma aplicação demonstrativa. O frontend ainda não fala com a API. Não há autenticação real, pagamento de adquirente, persistência operacional no SPA nem emissão fiscal.

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
| `npm run dev`       | Sobe o Vite em desenvolvimento              |
| `npm run typecheck` | Verifica o TypeScript estrito               |
| `npm run lint`      | Roda o ESLint                               |
| `npm run test`      | Roda os testes unitários e de componente    |
| `npm run test:e2e`  | Roda o Playwright contra o build de preview |
| `npm run build`     | Gera o build de produção                    |
| `npm run preview`   | Serve o build                               |

A rota `/design-system` existe apenas com `npm run dev`. Ela não entra no roteador dos builds de produção.

## API

A fundação Java vive em `apps/api`. Instruções, variáveis e limites: [backend](docs/backend.md).

## Estrutura

```text
src/                 SPA React (demonstração)
apps/api/            Fundação Spring Boot
.github/workflows/   CI do frontend e da API
```

A referência visual aprovada está em `Montagem UI SaaS para Pizzaria.png`.

## Documentação

- [Estado atual](docs/estado-atual.md)
- [Design system](docs/design-system.md)
- [Arquitetura](docs/frontend-architecture.md)
- [Telas](docs/screens.md)
- [Integração futura com a API](docs/future-api-integration.md)
- [Backend](docs/backend.md)
