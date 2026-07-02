# Runbook WAHA - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O bot integra com WAHA por `bot/src/waha.js`.
- O bot aceita `WAHA_URL`, `WAHA_BASE_URL`, `WAHA_API_KEY` e `WAHA_SESSION`.
- O fallback de URL e `http://localhost:3001`.

Pendente de validação:

- URL real usada em producao.
- Porta real usada localmente.
- Como WAHA esta rodando.
- Se existe Cloudflare Tunnel ativo.
- Onde esta a sessao persistida.

Informação privada / não versionada:

- API key real.
- Credenciais dashboard/Swagger, se existirem.
- `waha-data/`.
- `waha-files/`.

## Endpoints usados pelo bot

Confirmado por `bot/src/waha.js`:

- `POST /api/sendText`.
- `POST /api/sendImage`.
- `POST /api/startTyping`.
- `POST /api/stopTyping`.
- `GET /api/server/status`.
- `GET /api/version`.

## Status WAHA no painel

Confirmado por inspeção do código em origin/main:

- O painel consulta `/api/waha-status`.
- Existe alias `/admin/api/waha-status`.
- Em falha, o codigo retorna status offline/desconectado sem quebrar o painel.

## Cuidados

Nao executar sem aprovacao:

- Reiniciar container WAHA.
- Alterar volume ou pasta de sessao.
- Alterar porta.
- Alterar Cloudflare Tunnel.
- Limpar cache ou sessao.
- Trocar API key.

## Pendencias

- Confirmar URL real de WAHA em producao.
- Confirmar topologia local.
- Confirmar politica de backup de sessao.
- Confirmar procedimento de reconexao por QR Code.
