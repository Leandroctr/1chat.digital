# Runbook PostgreSQL - 1chat.digital

## Resumo

O bot suporta PostgreSQL quando `DATABASE_URL` esta configurada. Sem `DATABASE_URL`, usa arquivos JSON em `bot/data/`.

## Estado conhecido

- Dependencia `pg` existe no bot.
- Codigo cria tabelas automaticamente quando `DATABASE_URL` existe.
- Nenhum `.env` real encontrado.
- Nenhum dump `.sql` ou `.dump` encontrado.
- Nenhum container PostgreSQL confirmado na instalacao local.

## Tabelas conhecidas

Na instalacao principal:

- `atendimentos`
- `fila`
- `final_message_log`

Na copia temporaria mais nova, tambem aparecem:

- `bot_config`
- `final_message_pending`
- `known_sites`
- `human_handoff_events`
- `admin_sessions` para sessao admin quando PostgreSQL esta ativo

## Comandos conhecidos

PENDENTE DE CONFIRMACAO: comando real de conexao/dump em producao.

Comando recomendado para documentar quando `DATABASE_URL` estiver confirmado:

```powershell
pg_dump "$env:DATABASE_URL" -F c -f ".\backup.dump"
```

Nao executar dump sem confirmar `DATABASE_URL`, destino e permissao.

## Riscos

- Perder dados se PostgreSQL estiver em uso e nao houver dump.
- Confundir fallback JSON com banco real.
- Restaurar codigo sem restaurar banco.

## O que verificar

- `DATABASE_URL` existe no ambiente?
- O bot esta usando PostgreSQL ou JSON local?
- Existe rotina de `pg_dump`?
- Onde ficam os backups?
- Restore ja foi testado?

## Documentos relacionados

- `docs/disaster-recovery/RECOVERY-GAPS.md`
- `docs/disaster-recovery/BACKUP-CHECKLIST.md`
- `docs/knowledge/KNOWN-BUGS.md`
