# Current Status - 1chat.digital

## Status atual - 2026-07-06

- WAHA operacional.
- Pasta operacional confirmada: `C:\Users\User\1chat.digital`.
- Sessao correta: `default`.
- Dashboard WAHA acessivel.
- Painel admin `1chat.digital` exibe:
  - Integracao: status geral/tunnel/API.
  - Status WhatsApp: sessao `default`.
- Bot/Railway deve usar `WAHA_SESSION=default`.
- `JANDIRA` e de outro projeto e nao deve aparecer em runtime do `1chat.digital`.

## Confirmado por inspeção do código em origin/main

- Site estatico na raiz.
- Bot Node.js/Express em `bot/`.
- Backend modular em `bot/src/`.
- Painel admin em `bot/public/`.
- Healthcheck em `/health`.
- Login admin em `/admin/login`.
- Deploy do bot descrito por `bot/Dockerfile` e `bot/railway.json`.
- Suporte a `PORT`.
- Suporte a `DATABASE_URL`.
- Suporte a `WAHA_URL` e `WAHA_BASE_URL`.
- Suporte a `GEMINI_API_KEY`.
- Suporte a `ADMIN_USER`, `ADMIN_PASSWORD` e `SESSION_SECRET`.
- Suporte a variaveis Supabase.
- `bot/data/respostas.xlsx` existe.
- Fluxo deterministico de recuperacao de senha em `bot/src/passwordRecovery.js`.
- Integracao do fluxo de recuperacao de senha em `bot/src/webhookRoute.js`.

## Confirmado em produção pública

- `/health` respondeu `200`.
- O JSON publico indicou `service = 1chat-bot`.
- O JSON publico indicou `mode = production`.
- `/admin/login` respondeu.
- A pagina inicial entrega ou redireciona para o login.

## Pendente de validação

- Estado real do WAHA.
- Estado real do Docker.
- Estado real do Cloudflare Tunnel.
- Estado real do PostgreSQL.
- Estado real de backups.
- Restore estrutural atual.
- Restore funcional.
- Variaveis reais de producao.
- Teste real completo no WhatsApp do fluxo de recuperacao de senha apos `ad9d717`.
- Conferencia visual final no painel com contexto de recuperacao de senha/troca de telefone.

## Areas sensiveis

- WAHA.
- Docker.
- Cloudflare.
- Banco.
- Portas.
- `.env`.
- `waha-data/`.
- `waha-files/`.
- `bot/data/respostas.xlsx`.

## Prioridade atual

1. Manter a documentacao alinhada a `origin/main`.
2. Separar fatos confirmados de pendencias.
3. Proteger dados e credenciais.
4. Validar backup e restore em etapa propria.
5. Validar fluxo de recuperacao de senha no canal real e no painel.
