# Sabli

Fundação de frontend do **Sabli**, plataforma SaaS da **Emilabs** para gestão de restaurantes e pizzarias.

Slogan: **Seu negócio inteiro. Em um só lugar.**

Esta versão é uma aplicação demonstrativa. Ela não possui backend, autenticação, pagamento real, persistência operacional nem emissão fiscal.

## Requisitos

- Node.js 22 ou superior
- npm 11 ou superior

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

## Estrutura

```text
src/
├── app/             providers, rotas, layouts e preferências de interface
├── design-system/   Sabli UI: tokens, primitives e padrões
├── features/        telas de negócio
├── shared/          tipos, domínio, fixtures e acesso a dados
└── main.tsx
```

A referência visual aprovada está em `Montagem UI SaaS para Pizzaria.png`.

## Documentação

- [Estado atual](docs/estado-atual.md)
- [Design system](docs/design-system.md)
- [Arquitetura](docs/frontend-architecture.md)
- [Telas](docs/screens.md)
- [Integração futura com a API](docs/future-api-integration.md)
