# Arquitetura - 1chat.digital

## Visao geral

O projeto combina um site publico estatico, um backend Node.js/Express para atendimento WhatsApp, um painel admin e integracoes externas com WAHA, PostgreSQL, Supabase Storage e Google Gemini.

```text
Cliente WhatsApp
  -> WAHA
  -> POST /webhook no bot Express
  -> regras/planilha/IA
  -> WAHA /api/sendText ou /api/sendImage

Admin
  -> /admin/login
  -> /admin
  -> /api/*
  -> dados em PostgreSQL ou bot/data
```

## Estrutura encontrada

```text
.
|-- CNAME
|-- index.html
|-- style.css
|-- app.js
`-- bot
    |-- Dockerfile
    |-- README.md
    |-- index.js
    |-- ia.js
    |-- leitor-respostas.js
    |-- package.json
    |-- package-lock.json
    |-- railway.json
    |-- validador-cpf.js
    |-- data
    |   |-- atendimentos.json
    |   |-- config.json
    |   |-- fila.json
    |   `-- respostas.xlsx
    |-- public
    |   |-- admin.html
    |   |-- app.js
    |   |-- login.css
    |   |-- login.html
    |   |-- style.css
    |   `-- assets
    |       |-- .gitkeep
    |       `-- logo.png
    `-- src
        |-- adminRoutes.js
        |-- appMiddleware.js
        |-- atendimentos.js
        |-- businessHours.js
        |-- configService.js
        |-- confirmacoes.js
        |-- db.js
        |-- env.js
        |-- fila.js
        |-- humano.js
        |-- jsonStore.js
        |-- logger.js
        |-- mensagemFinalService.js
        |-- mensagemFinalStore.js
        |-- metrics.js
        |-- paths.js
        |-- respostas.js
        |-- supabaseStorage.js
        |-- textUtils.js
        |-- waha.js
        `-- webhookRoute.js
```

## Backend

- Entrada principal: `bot/index.js`.
- Framework: Express.
- Porta: `PORT` ou `3000`.
- Middlewares: JSON, form URL encoded, arquivos estaticos, sessao admin.
- Healthcheck: `GET /health`.
- Webhook: `POST /webhook`.
- Admin: `GET /admin`, `GET/POST /admin/login`, `POST /admin/logout`.

## Painel admin

Arquivos:

- `bot/public/admin.html`
- `bot/public/app.js`
- `bot/public/style.css`
- `bot/public/login.html`
- `bot/public/login.css`

APIs principais:

- `GET /api/fila`
- `POST /api/fila/encerrar`
- `GET /api/config`
- `POST /api/config`
- `GET /api/metrics/today`
- `GET /api/waha-status`
- `GET /api/respostas`
- `POST /api/respostas`
- `PUT /api/respostas/:id`
- `DELETE /api/respostas/:id`
- `POST /api/respostas/testar`
- `POST /api/config/final-message-image`
- `DELETE /api/config/final-message-image`
- `POST /api/admin/reset-operacional`

## Persistencia

Modo arquivo, quando `DATABASE_URL` nao existe:

- `bot/data/atendimentos.json`
- `bot/data/fila.json`
- `bot/data/config.json`
- `bot/data/final-message-log.json`
- `bot/data/respostas.xlsx`

Modo PostgreSQL, quando `DATABASE_URL` existe:

- `atendimentos`
- `fila`
- `final_message_log`
- `bot_config`
- `final_message_pending`
- `known_sites`
- `human_handoff_events`
- `admin_sessions`

## WAHA

Configuracao lida de:

- `WAHA_URL`
- `WAHA_BASE_URL`
- `WAHA_API_KEY`
- `WAHA_SESSION`

Padroes do codigo:

- URL: `http://localhost:3001`
- API key: valor padrao local encontrado, mascarado como `***`
- Sessao: `default`

## Dependencias principais

- `express`
- `express-session`
- `connect-pg-simple`
- `pg`
- `axios`
- `xlsx`
- `multer`
- `@google/generative-ai`
- `@supabase/supabase-js`
- `ws`

## Deploy

Ha `bot/Dockerfile` com `node:20-alpine`, `npm install --omit=dev`, `EXPOSE 3000` e `npm start`.

Ha `bot/railway.json` com build por Dockerfile e healthcheck `/health`.

Nao foi encontrado `docker-compose.yml` na copia inspecionada.
