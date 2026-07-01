# Instalar do Zero - 1chat.digital

Passo a passo para montar o ambiente em um PC novo.

## 1. Instalar ferramentas

Instale:

- Git.
- Node.js 20 LTS.
- npm.
- Docker Desktop.
- Editor de codigo.
- Cliente PostgreSQL (`pg_dump` e `psql`), se usar `DATABASE_URL`.

Verifique:

```powershell
node --version
npm --version
docker --version
git --version
```

## 2. Restaurar codigo

Opcoes:

```powershell
git clone https://github.com/Leandroctr/1chat.digital.git
```

Ou restaure a pasta do backup mais recente.

## 3. Restaurar segredos

Crie `bot\.env` ou configure as variaveis no provedor de deploy.

Use `docs\disaster-recovery\SECRETS.private.md` como referencia privada e `SECRETS.template.md` como modelo sem segredos.

Variaveis esperadas:

```env
PORT=3000
NODE_ENV=production
WAHA_URL=https://...
WAHA_BASE_URL=https://...
WAHA_API_KEY=...
WAHA_SESSION=default
DATABASE_URL=postgres://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BUCKET=finalmessageassets
ADMIN_USER=...
ADMIN_PASSWORD=...
SESSION_SECRET=...
GEMINI_API_KEY=...
```

## 4. Instalar dependencias do bot

```powershell
cd bot
npm install
```

## 5. Restaurar dados locais

Se nao usar PostgreSQL, restaure `bot\data\`:

- `respostas.xlsx`
- `config.json`
- `atendimentos.json`
- `fila.json`
- `final-message-log.json`, se existir

Crie tambem `bot\logs\` se necessario.

## 6. Restaurar PostgreSQL

Se `DATABASE_URL` estiver configurada, restaure o dump mais recente:

```powershell
psql "$env:DATABASE_URL" -f caminho\do\backup.sql
```

O bot cria tabelas automaticamente no startup, mas dados historicos exigem restore do dump.

## 7. Restaurar WAHA

Recrie o container WAHA conforme o `docker-compose.yml` real do ambiente. A copia inspecionada nao continha esse arquivo.

Pontos obrigatorios:

- Porta local esperada pelo bot: `3001`.
- API key precisa bater com `WAHA_API_KEY`.
- Sessao precisa bater com `WAHA_SESSION`.
- Persistencia da sessao deve apontar para `waha-data` ou volume Docker equivalente.
- Webhook deve apontar para `/webhook` no bot.

## 8. Subir bot localmente

```powershell
cd bot
npm start
```

Valide:

- `http://localhost:3000/health`
- `http://localhost:3000/admin/login`
- `http://localhost:3000/webhook` configurado no WAHA

## 9. Checklist final

- Admin autentica.
- Status WAHA aparece operacional.
- Planilha `respostas.xlsx` carrega.
- Fila e metricas abrem.
- Mensagem WhatsApp chega no webhook.
- Bot envia resposta pelo WAHA.
