# Ports - 1chat.digital

Este arquivo documenta portas encontradas. Nao inventar padrao novo sem validar o codigo real e a operacao atual.

## Portas encontradas

| Porta | Origem | Uso observado |
|---:|---|---|
| `3000` | `bot/index.js`, `bot/Dockerfile`, `docker-compose.yml`, container `1chat-waha` | Bot usa `PORT` ou `3000`; WAHA tambem esta publicado em `3000:3000` no compose atual. |
| `3001` | `bot/index.js`, `bot/README.md` | WAHA padrao esperado pelo bot quando `WAHA_URL`/`WAHA_BASE_URL` nao estao definidos. |
| `5432` | PostgreSQL padrao | Nao confirmado localmente; banco e usado apenas se `DATABASE_URL` existir. |

## Divergencia atual

PENDENTE DE CONFIRMACAO:

- O bot espera WAHA em `http://localhost:3001` por padrao.
- O `docker-compose.yml` atual publica WAHA em `3000:3000`.
- O bot tambem usa `3000` como porta padrao.

## Regra

Antes de alterar portas:

1. Confirmar qual processo esta usando a porta.
2. Confirmar `WAHA_URL`/`WAHA_BASE_URL`.
3. Confirmar Docker Compose.
4. Confirmar impacto no painel, webhook e tunnel.
5. Atualizar este arquivo e os runbooks.
