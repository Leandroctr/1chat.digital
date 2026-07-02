# Checklist de Restore - 1chat.digital

## Classificacao

Pendente de validação:

- Este checklist descreve uma restauracao futura.
- Ele nao confirma restore ja testado.

## Preparacao

- Obter backup aprovado.
- Obter segredos em fonte privada.
- Instalar Git, Node.js, npm e ferramentas necessarias.
- Confirmar se PostgreSQL sera restaurado.
- Confirmar se WAHA sera restaurado.

## Codigo

- Clonar ou restaurar repositorio.
- Confirmar `bot/package.json`.
- Rodar `npm install` em `bot/`.
- Confirmar `bot/Dockerfile`.
- Confirmar `bot/railway.json`.

## Dados

- Restaurar `bot/data/respostas.xlsx`.
- Restaurar arquivos JSON de `bot/data/`, se modo arquivo estiver em uso.
- Restaurar dump PostgreSQL, se `DATABASE_URL` estiver em uso.

## Segredos

- Restaurar `.env` fora do Git.
- Confirmar `ADMIN_USER`, `ADMIN_PASSWORD` e `SESSION_SECRET`.
- Confirmar `WAHA_URL` ou `WAHA_BASE_URL`.
- Confirmar `WAHA_API_KEY` e `WAHA_SESSION`.
- Confirmar `DATABASE_URL`, se aplicavel.
- Confirmar `GEMINI_API_KEY`.
- Confirmar variaveis Supabase, se aplicavel.

## Validacao

- Validar `/health`.
- Validar `/admin/login`.
- Validar painel.
- Validar status WAHA.
- Validar webhook.
- Validar resposta WhatsApp.
- Validar dados antigos.

## Pendencias

- Criar teste estrutural atual.
- Criar teste funcional aprovado.
- Registrar resultados em documento separado.
