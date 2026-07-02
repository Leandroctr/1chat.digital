# Arquitetura - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- Site estatico na raiz.
- Bot Node.js/Express em `bot/`.
- Backend modular em `bot/src/`.
- Painel admin em `bot/public/`.
- Healthcheck em `GET /health`.
- Deploy do bot descrito por `bot/Dockerfile` e `bot/railway.json`.

Confirmado em produção pública:

- `/health` respondeu `200`.
- O servico publico retornou `service = 1chat-bot`.
- O modo publico retornou `mode = production`.
- `/admin/login` respondeu.

Pendente de validação:

- Estado real de WAHA, Docker, Cloudflare Tunnel, PostgreSQL, backup e variaveis reais.

## Visao geral

```text
Cliente WhatsApp
  -> WAHA
  -> POST /webhook
  -> bot Express
  -> planilha, regras, dados locais/PostgreSQL e IA
  -> WAHA sendText/sendImage

Admin
  -> /admin/login
  -> /admin
  -> /api/*
  -> dados locais ou PostgreSQL
```

## Estrutura confirmada

```text
.
|-- CNAME
|-- app.js
|-- index.html
|-- style.css
`-- bot
    |-- Dockerfile
    |-- README.md
    |-- ia.js
    |-- index.js
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

Confirmado por inspeção do código em origin/main:

- Entrada: `bot/index.js`.
- Framework: Express.
- Porta: `PORT` ou `3000`.
- Middlewares: `bot/src/appMiddleware.js`.
- Healthcheck: registrado em `bot/src/adminRoutes.js`.
- Webhook: registrado em `bot/src/webhookRoute.js`.
- Rotas admin: `bot/src/adminRoutes.js`.

## Painel admin

Arquivos confirmados:

- `bot/public/admin.html`.
- `bot/public/app.js`.
- `bot/public/style.css`.
- `bot/public/login.html`.
- `bot/public/login.css`.

Rotas confirmadas:

- `GET /admin/login`.
- `POST /admin/login`.
- `POST /admin/logout`.
- `GET /admin`.
- `GET /api/fila`.
- `POST /api/fila/encerrar`.
- `GET /api/config`.
- `POST /api/config`.
- `GET /api/metrics/today`.
- `GET /api/waha-status`.
- `GET /admin/api/waha-status`.
- `GET /api/respostas`.
- `POST /api/respostas`.
- `PUT /api/respostas/:id`.
- `DELETE /api/respostas/:id`.
- `POST /api/respostas/testar`.
- `POST /api/config/final-message-image`.
- `DELETE /api/config/final-message-image`.
- `POST /api/admin/reset-operacional`.

## Persistencia

Confirmado por inspeção do código em origin/main:

- `DATABASE_URL` ativa PostgreSQL.
- Sem `DATABASE_URL`, o bot usa arquivos em `bot/data/`.

Arquivos locais:

- `bot/data/atendimentos.json`.
- `bot/data/fila.json`.
- `bot/data/config.json`.
- `bot/data/final-message-log.json`, criado em runtime se necessario.
- `bot/data/respostas.xlsx`.

Tabelas PostgreSQL criadas pelo codigo:

- `atendimentos`.
- `fila`.
- `final_message_log`.
- `bot_config`.
- `final_message_pending`.
- `known_sites`.
- `human_handoff_events`.
- `admin_sessions`, criada pela store de sessao quando PostgreSQL esta ativo.

## Integracoes

WAHA:

- Modulo: `bot/src/waha.js`.
- Variaveis: `WAHA_URL`, `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`.
- Fallback de URL no codigo: `http://localhost:3001`.
- Endpoints usados: `/api/sendText`, `/api/sendImage`, `/api/startTyping`, `/api/stopTyping`, `/api/server/status`, `/api/version`.

IA:

- Modulo: `bot/ia.js`.
- Variavel: `GEMINI_API_KEY`.
- Modelo no codigo: `gemini-2.5-flash`.

Supabase Storage:

- Modulo: `bot/src/supabaseStorage.js`.
- Variaveis: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`.
- Bucket padrao: `finalmessageassets`.

## Deploy

Confirmado por inspeção do código em origin/main:

- `bot/Dockerfile` usa Node.
- `bot/railway.json` define deploy do bot e healthcheck `/health`.

Pendente de validação:

- Variaveis reais configuradas no Railway.
- Banco real em producao.
- URL real de WAHA usada pela producao.
