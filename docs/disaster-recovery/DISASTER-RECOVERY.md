# Disaster Recovery - 1chat.digital

Documento principal para reconstruir o 1chat.digital em caso de perda total do SSD.

## Escopo deste inventario

Inspecao realizada em 2026-07-01.

Fonte localizada nesta maquina:

- `C:\tmp\1chat-prod-main-20260618183445`

Caminho informado no pedido, mas nao existente nesta sessao:

- `C:\Users\Leandro\Desktop\1chat.digital`

Workspace atual onde estes documentos foram criados:

- `C:\Users\User\Documents\1chat digital`

## Estado encontrado

- Aplicacao Node.js/Express em `bot/`.
- Painel admin estatico em `bot/public/`.
- Site publico estatico na raiz (`index.html`, `style.css`, `app.js`, `CNAME`).
- Dominio configurado em `CNAME`: `1chat.digital`.
- Dockerfile do bot em `bot/Dockerfile`.
- Configuracao Railway em `bot/railway.json`.
- `package.json` em `bot/package.json`.
- Nao foi encontrado `docker-compose.yml` na copia inspecionada.
- Nao foram encontrados arquivos `.env` na copia inspecionada.
- Nao foi encontrada pasta `waha-data` na copia inspecionada.
- Persistencia local do bot fica em `bot/data/` e logs em `bot/logs/`.

## Componentes criticos

1. Bot WhatsApp/API
   - Express.
   - Porta padrao local: `3000`.
   - Healthcheck: `/health`.
   - Webhook WAHA: `/webhook`.
   - Painel admin: `/admin`.
   - Login admin: `/admin/login`.

2. WAHA
   - URL padrao local: `http://localhost:3001`.
   - Variaveis aceitas: `WAHA_URL` ou `WAHA_BASE_URL`.
   - Sessao padrao: `default`.
   - API key padrao no codigo: valor encontrado, mascarado como `***`.
   - Endpoints usados: `/api/sendText`, `/api/sendImage`, `/api/startTyping`, `/api/stopTyping`, `/api/server/status`, `/api/version`.

3. Banco de dados
   - PostgreSQL e usado quando `DATABASE_URL` existe.
   - Sem `DATABASE_URL`, o bot usa arquivos JSON em `bot/data/`.
   - Tabelas criadas automaticamente: `atendimentos`, `fila`, `final_message_log`, `bot_config`, `final_message_pending`, `known_sites`, `human_handoff_events`.
   - Sessao admin usa tabela `admin_sessions` quando PostgreSQL esta ativo.

4. Armazenamento de imagem final
   - Supabase Storage opcional.
   - Variaveis: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`.
   - Bucket padrao: `finalmessageassets`.

5. IA
   - Google Gemini via `@google/generative-ai`.
   - Variavel: `GEMINI_API_KEY`.
   - Modelo no codigo: `gemini-2.5-flash`.

## Ordem de recuperacao

1. Recuperar codigo-fonte do GitHub ou backup local.
2. Restaurar arquivos privados de ambiente a partir de `SECRETS.private.md` ou cofre externo.
3. Instalar Node.js 20 LTS, npm, Docker Desktop e Git.
4. Restaurar `bot/data/` se estiver operando sem PostgreSQL.
5. Restaurar banco PostgreSQL se `DATABASE_URL` estiver em uso.
6. Restaurar volume/pasta WAHA (`waha-data` ou volume Docker equivalente).
7. Subir WAHA e confirmar sessao WhatsApp.
8. Configurar webhook do WAHA para `https://<dominio-do-bot>/webhook` ou `http://localhost:3000/webhook` em ambiente local.
9. Instalar dependencias do bot com `npm install`.
10. Iniciar bot com `npm start`.
11. Validar `/health`, `/admin` e recebimento de mensagens.

## Arquivos que devem entrar no backup

- Codigo-fonte completo, exceto `node_modules` e `.git` quando o backup for operacional.
- `bot/package.json` e `bot/package-lock.json`.
- `bot/Dockerfile`.
- `bot/railway.json`.
- `bot/data/respostas.xlsx`.
- `bot/data/config.json`.
- `bot/data/atendimentos.json`.
- `bot/data/fila.json`.
- `bot/data/final-message-log.json`, se existir.
- Arquivos `.env`, guardados somente em backup privado.
- Dump PostgreSQL, se `DATABASE_URL` estiver em uso.
- Pasta/volume WAHA com sessao WhatsApp.

## Arquivos que nao devem ser publicados

- `.env` e `*.env`.
- `docs/disaster-recovery/SECRETS.private.md`.
- `backups/`.
- Dumps `*.sql` e `*.dump`.
- Arquivos compactados `*.zip`.
- `waha-data/`.

## Validacao apos restore

1. `GET /health` retorna `ok: true`.
2. Login em `/admin/login` funciona com credenciais restauradas.
3. Painel lista fila, configuracoes, respostas e status WAHA.
4. WAHA mostra estado operacional no painel.
5. Envio de mensagem de teste chega ao webhook `/webhook`.
6. Bot responde via WAHA.
7. Dados antigos aparecem em `bot/data/` ou PostgreSQL.

## Lacunas manuais

- Confirmar caminho real definitivo do projeto fora de `C:\tmp`.
- Recuperar ou recriar `docker-compose.yml`.
- Confirmar se WAHA roda via Docker Compose, Docker avulso, Railway, ngrok ou outro tunel.
- Confirmar local real do volume/pasta `waha-data`.
- Preencher valores reais no arquivo privado de segredos.
- Confirmar URL publica atual do bot e do WAHA.
- Confirmar estrategia atual de backup PostgreSQL.
