# Runbook Backup - 1chat.digital

## Resumo

Backup e prioridade atual. O sistema depende do codigo, da planilha, dos arquivos de dados, das variaveis privadas e da sessao WAHA.

Destino padrao local:

`D:\1chat-backups\`

Este destino e a primeira camada de backup. Ele nao substitui copia em nuvem privada ou HD externo.

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

O modo implementado atualmente e backup rapido com WAHA rodando. Ele nao para WAHA, nao reinicia WAHA e nao executa `pg_dump`.

## O que precisa entrar no backup

- Codigo do projeto.
- Documentacao e scripts.
- `bot/data/`.
- `bot/data/respostas.xlsx`.
- `bot/data/config.json`, se existir.
- `waha-data/`.
- `waha-files/`, se houver midias importantes.
- Arquivos `.env` privados, se existirem.
- `docker-compose.yml` real privado.
- Configuracao Cloudflare privada.
- `.bat` de Startup do Windows.
- Dump PostgreSQL, se `DATABASE_URL` estiver em uso.

## Riscos

- Backup sem `waha-data` nao restaura sessao WhatsApp.
- Backup sem planilha nao restaura respostas.
- Backup sem `.env` nao restaura integracoes.
- Backup sem dump PostgreSQL nao restaura banco.
- Backup rapido pode copiar `waha-data/` enquanto WAHA esta em uso.
- Backup sem teste de restore nao e garantia.
- Backup no drive D: ainda fica no mesmo computador.

## O que verificar

- Backup foi criado em `D:\1chat-backups\`?
- Inventario foi gerado?
- `waha-data` foi copiado?
- `waha-files` foi copiado?
- `bot/data/respostas.xlsx` esta presente?
- `.env` privado e `docker-compose.yml` real estao presentes no backup privado?
- Dump PostgreSQL existe, se aplicavel?

## Modos

### Backup rapido

- Implementado em `scripts/backup/backup-1chat.ps1`.
- WAHA continua rodando.
- Menor interrupcao.
- Risco: `waha-data/` pode estar em uso.

### Backup consistente

- PENDENTE.
- Exige janela de manutencao.
- Deve parar WAHA de forma controlada, copiar `waha-data/` e subir WAHA novamente.
- Exige aprovacao especifica antes de executar.

## Documentos relacionados

- `docs/disaster-recovery/DISASTER-RECOVERY.md`
- `docs/disaster-recovery/BACKUP-CHECKLIST.md`
- `docs/disaster-recovery/RESTORE-CHECKLIST.md`
- `docs/disaster-recovery/RECOVERY-GAPS.md`
