# Runbook Startup - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O bot inicia com `npm start` dentro de `bot/`.
- O comando de start e `node index.js`.
- O bot usa `PORT` ou `3000`.

Pendente de validação:

- Como a maquina local inicia WAHA.
- Se existe script de Startup do Windows.
- Se Cloudflare Tunnel inicia automaticamente.
- Se Docker inicia automaticamente.
- Se Railway esta configurado com todas as variaveis.

## Startup do bot

```powershell
cd bot
npm install
npm start
```

## Verificacoes

Confirmado por inspeção do código em origin/main:

- Apos iniciar, validar `GET /health`.
- Validar `/admin/login`.
- Validar que `WAHA_URL` ou `WAHA_BASE_URL` esta definido antes de testar mensagens.

## O que nao fazer sem aprovacao

- Alterar Startup do Windows.
- Alterar Docker.
- Alterar Cloudflare.
- Alterar portas.
- Alterar `.env`.
- Alterar banco.

## Pendencias

- Documentar rotina real de boot da operacao.
- Documentar dependencias externas reais.
- Validar se a producao depende de maquina local.
