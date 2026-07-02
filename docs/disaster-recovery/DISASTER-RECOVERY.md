# Disaster Recovery - 1chat.digital

Documento principal para reconstruir o 1chat.digital em caso de perda total do SSD.

Destino local padrao de backup:

`D:\1chat-backups\`

O drive D: e uma primeira camada local. Ele nao substitui copia em nuvem privada ou HD externo.

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
   - URL local atual: `http://localhost:3000`.
   - URL publica atual: `https://waha.1chat.digital`.
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
- `docker-compose.yml` real privado.
- `C:\Users\User\.cloudflared\config.yml`.
- `.bat` de Startup do Windows.
- Dump PostgreSQL, se `DATABASE_URL` estiver em uso.
- Pasta/volume WAHA com sessao WhatsApp.

## Backup rapido atual

- Script: `scripts/backup/backup-1chat.ps1`.
- Destino: `D:\1chat-backups\manual-quick-YYYY-MM-DD_HH-mm-ss\`.
- WAHA continua rodando.
- `pg_dump` ainda nao e executado.
- Risco: `waha-data/` pode estar em uso durante a copia.

## Backup consistente futuro

- PENDENTE.
- Exige janela de manutencao.
- Deve parar WAHA de forma controlada, copiar `waha-data/` e subir WAHA novamente.
- Deve ser aprovado especificamente antes de executar.

## Restore testado

- Data: 2026-07-02.
- Backup testado: `D:\1chat-backups\manual-quick-2026-07-02_01-04-08`.
- Restore testado em pasta separada: `D:\1chat-backups\restore-test-2026-07-02_01-04-08`.
- Resultado: restore estrutural aprovado com ressalva.
- Nenhum servico foi iniciado e a producao nao foi tocada.

Itens criticos encontrados:

- `START_HERE.md`.
- `CHATGPT_PROJECT_CONTEXT.md`.
- `.env`.
- `.env.example`.
- `.gitignore`.
- `docker-compose.yml`.
- `docker-compose.example.yml`.
- `docs\`.
- `scripts\`.
- `bot\data\respostas.xlsx`.
- `waha-data\`.
- `waha-files\`.
- Cloudflare `config.yml`.
- `iniciar-1chat-producao.bat`.
- `INVENTARIO.txt`.

Ressalva:

- `waha-data\` foi restaurado e nao estava vazio: 4109 arquivos.
- `waha-files\` existia, mas estava vazio no backup/restore.
- `waha-files\` vazio deve gerar alerta/ressalva, nao reprovacao automatica, porque pode ser pasta temporaria sem arquivos no momento do backup.

Ainda nao testado:

- Restore funcional.
- Subir WAHA a partir da pasta restaurada.
- Reconexao real do WhatsApp.
- Cloudflare Tunnel usando restore.
- Bot Railway consumindo WAHA restaurado.
- `pg_dump`/PostgreSQL.

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
