# Runbook PostgreSQL - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- PostgreSQL e usado quando `DATABASE_URL` existe.
- O modulo `bot/src/db.js` cria tabelas automaticamente.
- `connect-pg-simple` pode criar `admin_sessions` para sessoes admin.

Pendente de validação:

- Se PostgreSQL esta ativo em producao.
- Qual provedor hospeda o banco.
- Se existe rotina de backup com `pg_dump`.
- Se existe restore testado.

## Variavel de ativacao

Confirmado por inspeção do código em origin/main:

```text
DATABASE_URL
```

Se `DATABASE_URL` nao existir, o bot usa arquivos locais em `bot/data/`.

## Tabelas criadas pelo codigo

Confirmado por `bot/src/db.js`:

- `atendimentos`.
- `fila`.
- `final_message_log`.
- `bot_config`.
- `final_message_pending`.
- `known_sites`.
- `human_handoff_events`.

Confirmado por middleware de sessao:

- `admin_sessions`, quando a store PostgreSQL de sessoes esta ativa.

## Dados criticos

- Fila atual.
- Atendimentos em andamento.
- Configuracao global do bot.
- Registro de mensagem final.
- Mensagens finais pendentes.
- Sites conhecidos.
- Eventos de atendimento humano e metricas.
- Sessoes admin.

## Operacoes proibidas sem aprovacao

- `DROP`.
- `TRUNCATE`.
- Restore de dump.
- Alteracao manual de dados.
- Criacao de backup em ambiente real.
- Troca de `DATABASE_URL`.

## Backup

Pendente de validação:

- Confirmar se PostgreSQL esta em uso.
- Confirmar credenciais e host em local privado.
- Definir rotina de `pg_dump`.
- Testar restore em ambiente separado.
