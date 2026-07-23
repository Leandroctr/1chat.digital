# Template de Segredos - 1chat.digital

Este arquivo e um modelo publico. Nao preencha valores reais nele.

## Classificacao

Informação privada / não versionada:

- Valores reais de credenciais.
- URLs privadas.
- Chaves de API.
- Strings de conexao.
- Senhas.

## Ambiente do bot

```env
PORT=3000
NODE_ENV=production

WAHA_BASE_URL=https://***WAHA_PUBLIC_OR_LOCAL_URL***
WAHA_API_KEY=***WAHA_API_KEY***
WAHA_SESSION=***WAHA_SESSION_NAME***

DATABASE_URL=postgresql://***USER***:***PASSWORD***@***HOST***:***PORT***/***DATABASE***

SUPABASE_URL=https://***PROJECT_REF***.supabase.co
SUPABASE_SERVICE_ROLE_KEY=***SUPABASE_SERVICE_ROLE_KEY***
SUPABASE_BUCKET=finalmessageassets

ADMIN_USER=***ADMIN_USER***
ADMIN_PASSWORD=***ADMIN_PASSWORD***
SESSION_SECRET=***LONG_RANDOM_SESSION_SECRET***

GEMINI_API_KEY=***GEMINI_API_KEY***
CORS_ORIGIN=*
```

## URLs

```text
URL publica do bot: https://***BOT_DOMAIN***
URL publica/local do WAHA: https://***WAHA_DOMAIN_OR_TUNNEL***
Webhook WAHA: https://***BOT_DOMAIN***/webhook
Painel admin: https://***BOT_DOMAIN***/admin
Healthcheck: https://***BOT_DOMAIN***/health
```

## Regras

- Guardar valores reais fora do Git.
- Nao copiar `.env` para commits.
- Nao registrar senha em issue, PR ou documento publico.
- Atualizar este template quando o codigo passar a exigir nova variavel.
