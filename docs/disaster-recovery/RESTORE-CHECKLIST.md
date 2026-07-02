# Checklist de Restore - Perda Total do SSD

## Preparacao

- Instalar Windows e atualizacoes.
- Instalar Git, Node.js 20 LTS, Docker Desktop e cliente PostgreSQL.
- Restaurar acesso ao GitHub, Railway, Supabase, provedor de dominio e provedor de tunel, se houver.
- Baixar backup mais recente para disco local.
- Se disponivel, usar backup em `D:\1chat-backups\manual-quick-YYYY-MM-DD_HH-mm-ss\`.

## Codigo e dependencias

- Restaurar ou clonar o projeto.
- Confirmar existencia de `bot/package.json`.
- Rodar `npm install` dentro de `bot`.
- Confirmar `bot/Dockerfile` e `bot/railway.json`.

## Segredos

- Restaurar variaveis reais a partir de `SECRETS.private.md` ou cofre externo.
- Criar `.env` local apenas em ambiente privado.
- Confirmar que `.env` nao sera commitado.
- Confirmar `ADMIN_USER`, `ADMIN_PASSWORD` e `SESSION_SECRET`.
- Confirmar `WAHA_API_KEY`, `WAHA_SESSION` e URL WAHA.
- Confirmar `DATABASE_URL`, se PostgreSQL for usado.
- Confirmar `GEMINI_API_KEY`.
- Confirmar Supabase, se upload de imagem final estiver ativo.

## Dados

- Restaurar `bot/data/`.
- Restaurar `respostas.xlsx`.
- Restaurar `config.json`, `fila.json`, `atendimentos.json` e `final-message-log.json`, se aplicavel.
- Restaurar dump PostgreSQL, se `DATABASE_URL` estiver em uso.
- Restaurar `waha-data` ou volume Docker equivalente.
- Restaurar `waha-files/`, se existir no backup.
- Restaurar `docker-compose.yml` real privado e `.env` privado.
- Restaurar `C:\Users\User\.cloudflared\config.yml`, se a maquina for a mesma topologia.
- Restaurar o `.bat` de Startup do Windows, se o PC local continuar responsavel por WAHA/Cloudflare.

## WAHA

- Recriar container WAHA com persistencia.
- Confirmar WAHA local em `http://localhost:3000`.
- Confirmar Cloudflare expondo `https://waha.1chat.digital`.
- Confirmar API key.
- Confirmar sessao WhatsApp.
- Ler QR Code novamente somente se a sessao restaurada nao funcionar.
- Configurar webhook para `/webhook`.

## Bot

- Iniciar bot.
- Validar `GET /health`.
- Validar login em `/admin/login`.
- Validar status WAHA no painel.
- Validar APIs do painel.
- Validar recebimento de mensagem WhatsApp.
- Validar envio de resposta.

## Pos-restore

- Rodar backup imediatamente apos estabilizar.
- Registrar caminho novo do projeto.
- Atualizar `SECRETS.private.md` privado.
- Atualizar documentacao se a topologia tiver mudado.
