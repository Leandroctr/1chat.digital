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
WAHA_BASE_URL=http://localhost:3000
WAHA_API_KEY=CHANGE_ME
WAHA_SESSION=default
```

No Railway, configure pelo menos:

```env
NODE_ENV=production
WAHA_BASE_URL=https://waha.1chat.digital
WAHA_API_KEY=CHANGE_ME
WAHA_SESSION=default
```

## Railway

O servico Node pode subir primeiro no Railway usando o `Dockerfile` e `railway.json`.

Pontos importantes:

- O Node deve usar `process.env.PORT`.
- O WAHA local nao sera acessivel pelo Railway usando `localhost`.
- Em producao, o Railway deve acessar o WAHA por `https://waha.1chat.digital`.
- O PC local expoe o WAHA pelo Cloudflare Tunnel, apontando para `http://localhost:3000`.
- `http://localhost:3001` e referencia antiga/legada e nao deve ser usado como padrao atual.
- `data/` e `logs/` gravam em disco local; em Railway, use volume para persistencia real.

## Nao versionar

- `node_modules/`
- `logs/*.log`
- `sessions/`
- `waha-data/`
- `.env`
