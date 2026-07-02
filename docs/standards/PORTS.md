# Ports - 1chat.digital

Este arquivo documenta portas encontradas. Nao inventar padrao novo sem validar o codigo real e a operacao atual.

## Portas encontradas

| Porta | Origem | Uso observado |
|---:|---|---|
| `3000` | `bot/index.js`, `bot/Dockerfile`, `docker-compose.yml`, container `1chat-waha`, Cloudflare Tunnel | Bot usa `PORT` ou `3000`; WAHA local esta publicado em `3000:3000` no compose atual e exposto por `https://waha.1chat.digital`. |
| `3001` | `bot/index.js`, historico de docs/templates | Referencia antiga/legada do fallback local do bot; nao usar como padrao atual. |
| `5432` | PostgreSQL padrao | Nao confirmado localmente; banco e usado apenas se `DATABASE_URL` existir. |

## Arquitetura atual confirmada

- Producao: o bot Node roda no Railway.
- Railway deve acessar WAHA pela URL publica `https://waha.1chat.digital`.
- PC local: WAHA roda via Docker em `http://localhost:3000`.
- Cloudflare Tunnel no PC local expoe `waha.1chat.digital` para `http://localhost:3000`.
- O `.bat` de Startup do Windows inicia Docker/WAHA e Cloudflare Tunnel no reboot.

## Historico do BUG-001

- O fallback em `bot/index.js` ainda aponta para `http://localhost:3001` quando `WAHA_URL`/`WAHA_BASE_URL` nao estao definidos.
- `localhost:3001` e legado e nao deve ser usado como recomendacao atual.
- Em producao, esse bug nao deve afetar o Railway se `WAHA_URL` ou `WAHA_BASE_URL` estiver definido como `https://waha.1chat.digital`.

## Regra

Antes de alterar portas:

1. Confirmar qual processo esta usando a porta.
2. Confirmar `WAHA_URL`/`WAHA_BASE_URL`.
3. Confirmar Docker Compose.
4. Confirmar impacto no painel, webhook e tunnel.
5. Atualizar este arquivo e os runbooks.
