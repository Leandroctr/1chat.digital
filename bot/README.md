# 1Chat Digital Bot

MVP Node.js + Express para atendimento WhatsApp via WAHA.

## Rodar localmente

1. Suba o WAHA local pelo `docker-compose.yml` da raiz do projeto.
2. Entre nesta pasta:

```bash
cd bot
npm install
npm start
```

URLs locais:

- Health: `http://localhost:3000/health`
- Painel admin: `http://localhost:3000/admin`
- Webhook WAHA: `http://localhost:3000/webhook`

## Variaveis de ambiente

Valores locais padrao:

```env
PORT=3000
WAHA_BASE_URL=http://localhost:3001
WAHA_API_KEY=123456
WAHA_SESSION=default
```

No Railway, configure pelo menos:

```env
NODE_ENV=production
WAHA_BASE_URL=https://sua-url-publica-do-waha
WAHA_API_KEY=123456
WAHA_SESSION=default
```

## Railway

O servico Node pode subir primeiro no Railway usando o `Dockerfile` e `railway.json`.

Pontos importantes:

- O Node deve usar `process.env.PORT`.
- O WAHA local nao sera acessivel pelo Railway usando `localhost`.
- Para manter WAHA local, exponha o WAHA com um tunel seguro e use essa URL em `WAHA_BASE_URL`.
- `data/` e `logs/` gravam em disco local; em Railway, use volume para persistencia real.

## Nao versionar

- `node_modules/`
- `logs/*.log`
- `sessions/`
- `waha-data/`
- `.env`
