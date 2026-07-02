# Ports - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O bot usa `PORT` ou `3000`.
- O fallback de URL WAHA no codigo e `http://localhost:3001`.

Confirmado em produção pública:

- A produção pública respondeu por HTTPS em `www.1chat.digital`.

Pendente de validação:

- Porta real do WAHA local.
- Porta real de qualquer Docker local.
- Configuracao real de Cloudflare Tunnel.
- Portas do banco real.

## Portas conhecidas por codigo

| Porta | Evidencia | Uso |
|---:|---|---|
| 3000 | `bot/src/env.js`, `bot/Dockerfile`, `bot/README.md` | Porta padrao do bot quando `PORT` nao e definido |
| 3001 | `bot/src/env.js`, `bot/README.md` | Fallback local legado para WAHA |
| 5432 | Padrao PostgreSQL | Possivel uso por `DATABASE_URL`, nao confirmado localmente |

## Regra

Antes de alterar ou documentar porta operacional:

1. Confirmar processo real.
2. Confirmar variaveis de ambiente.
3. Confirmar impacto no webhook.
4. Confirmar impacto no painel.
5. Confirmar impacto no tunel, se existir.

Sem essa validacao, registrar como pendente.
