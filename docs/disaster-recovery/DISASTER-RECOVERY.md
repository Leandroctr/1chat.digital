# Disaster Recovery - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O projeto pode ser reconstruido a partir do codigo versionado e dependencias npm.
- O bot fica em `bot/`.
- O bot usa dados em `bot/data/` quando PostgreSQL nao esta ativo.
- O bot pode usar PostgreSQL quando `DATABASE_URL` existe.
- O bot depende de WAHA para WhatsApp.

Confirmado em produção pública:

- O bot publico respondeu `/health`.
- O login admin publico respondeu.

Pendente de validação:

- Backup real.
- Restore real.
- Variaveis reais.
- Sessao WAHA.
- Banco real.
- Topologia real de tunel/infraestrutura.

## Escopo

Este documento descreve o que precisa existir para recuperar o sistema. Ele nao confirma que backups ou restores ja existem.

## Componentes criticos

Confirmado por inspeção do código em origin/main:

- Codigo do repositorio.
- `bot/package.json` e `bot/package-lock.json`.
- `bot/data/respostas.xlsx`.
- `bot/data/*.json`, quando modo arquivo estiver em uso.
- Variaveis de ambiente.
- WAHA acessivel pelo bot.
- `DATABASE_URL`, se PostgreSQL estiver ativo.
- Supabase, se imagem final estiver ativa.

Informação privada / não versionada:

- `.env`.
- Credenciais WAHA.
- Credenciais admin.
- `DATABASE_URL`.
- Chaves Supabase.
- `GEMINI_API_KEY`.
- Sessao WAHA.
- Dumps e backups.

## Ordem de recuperacao proposta

1. Recuperar codigo a partir do GitHub.
2. Restaurar segredos a partir de cofre privado.
3. Instalar Node.js e npm.
4. Instalar dependencias em `bot/`.
5. Restaurar `bot/data/` se modo arquivo estiver em uso.
6. Restaurar PostgreSQL se `DATABASE_URL` estiver em uso.
7. Restaurar WAHA e sessao, conforme topologia real validada.
8. Configurar URL WAHA para o bot.
9. Iniciar bot.
10. Validar `/health`.
11. Validar `/admin/login`.
12. Validar webhook e envio de mensagens.

## Validacoes obrigatorias

- `GET /health` retorna `ok: true`.
- Login admin funciona.
- Painel carrega fila/configuracoes/respostas.
- WAHA aparece operacional no painel.
- Webhook recebe mensagem.
- Bot responde mensagem.
- Dados antigos aparecem.

## Lacunas atuais

- Falta validar backup.
- Falta validar restore.
- Falta confirmar PostgreSQL real.
- Falta confirmar WAHA real.
- Falta confirmar variaveis reais.
- Falta documentar procedimento privado de segredos.
