# Runbook Backup - 1chat.digital

## Resumo

Backup e prioridade atual. O sistema depende do codigo, da planilha, dos arquivos de dados, das variaveis privadas e da sessao WAHA.

## Script conhecido

Script de backup criado:

`scripts/backup/backup-1chat.ps1`

## Comando conhecido

PENDENTE DE CONFIRMACAO: rotina agendada definitiva.

Execucao manual esperada:

```powershell
cd C:\Users\User\1chat.digital
.\scripts\backup\backup-1chat.ps1
```

## O que precisa entrar no backup

- Codigo do projeto.
- `bot/data/`.
- `bot/data/respostas.xlsx`.
- `waha-data/`.
- `waha-files/`, se houver midias importantes.
- Arquivos `.env` privados, se existirem.
- Dump PostgreSQL, se `DATABASE_URL` estiver em uso.
- `docker-compose.yml`, com cuidado por conter credenciais.

## Riscos

- Backup sem `waha-data` nao restaura sessao WhatsApp.
- Backup sem planilha nao restaura respostas.
- Backup sem `.env` nao restaura integracoes.
- Backup sem dump PostgreSQL nao restaura banco.
- Backup sem teste de restore nao e garantia.

## O que verificar

- Backup foi criado fora do SSD principal?
- ZIP abre?
- Inventario foi gerado?
- `waha-data` foi copiado/compactado?
- `bot/data/respostas.xlsx` esta presente?
- Dump PostgreSQL existe, se aplicavel?

## Documentos relacionados

- `docs/disaster-recovery/DISASTER-RECOVERY.md`
- `docs/disaster-recovery/BACKUP-CHECKLIST.md`
- `docs/disaster-recovery/RESTORE-CHECKLIST.md`
- `docs/disaster-recovery/RECOVERY-GAPS.md`
