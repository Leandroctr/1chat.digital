# Operation Manual - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O bot pode ser iniciado com `npm start` dentro de `bot/`.
- O healthcheck e `GET /health`.
- O painel admin e `/admin`.
- O login admin e `/admin/login`.

Confirmado em produção pública:

- `/health` respondeu `200`.
- `/admin/login` respondeu.

Pendente de validação:

- Como WAHA esta rodando atualmente.
- Como Cloudflare Tunnel esta configurado.
- Se PostgreSQL esta ativo em producao.
- Como backup esta sendo executado.

## Operacao do bot

Comandos confirmados pelo `bot/package.json`:

```powershell
cd bot
npm install
npm start
```

Variaveis relevantes confirmadas por codigo:

- `PORT`.
- `NODE_ENV`.
- `WAHA_URL`.
- `WAHA_BASE_URL`.
- `WAHA_API_KEY`.
- `WAHA_SESSION`.
- `DATABASE_URL`.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SUPABASE_BUCKET`.
- `ADMIN_USER`.
- `ADMIN_PASSWORD`.
- `SESSION_SECRET`.
- `GEMINI_API_KEY`.
- `CORS_ORIGIN`.

## Validacoes basicas

Confirmado por inspeção do código em origin/main:

- `GET /health` deve retornar JSON com `ok: true`.
- `/admin/login` deve servir a tela de login.
- `/admin` exige sessao admin.
- APIs `/api/*` exigem login admin.

## Operacao do painel

Confirmado por inspeção do código em origin/main:

- O painel lista fila.
- O painel le e salva configuracao.
- O painel gerencia respostas.
- O painel mostra metricas.
- O painel consulta status WAHA.
- O painel permite encerrar atendimento na fila.
- O painel pode configurar imagem da mensagem final quando Supabase esta configurado.

## Operacao sensivel

Nao executar sem aprovacao explicita:

- Reiniciar WAHA.
- Alterar Docker.
- Alterar Cloudflare Tunnel.
- Alterar portas.
- Alterar banco ou rodar migracoes manuais.
- Alterar `.env`.
- Alterar `bot/data/respostas.xlsx`.
- Fazer backup/restore operacional.

## Quando houver duvida

- Consultar o codigo primeiro.
- Registrar a informacao como pendente se nao houver evidencia.
- Nao assumir que a maquina local representa a producao.
