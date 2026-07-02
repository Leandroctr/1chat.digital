# Runbook Backup - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- Existem dados locais em `bot/data/`.
- `bot/data/respostas.xlsx` e critico.
- O codigo pode usar PostgreSQL se `DATABASE_URL` existir.
- WAHA depende de configuracao externa ao Git.

Pendente de validação:

- Rotina real de backup.
- Destino real de backup.
- Se PostgreSQL esta ativo.
- Se existe `pg_dump`.
- Se existe backup de WAHA.
- Restore estrutural e funcional.

Informação privada / não versionada:

- `.env`.
- `docker-compose.yml` real, se existir.
- `waha-data/`.
- `waha-files/`.
- Dumps.
- Backups.
- Credenciais.

## O que precisa entrar em um backup real

Confirmado por inspeção do código em origin/main:

- Codigo versionado.
- `bot/package.json`.
- `bot/package-lock.json`.
- `bot/Dockerfile`.
- `bot/railway.json`.
- `bot/data/respostas.xlsx`.
- `bot/data/config.json`, se usado.
- `bot/data/fila.json`, se usado.
- `bot/data/atendimentos.json`, se usado.

Pendente de validação:

- `.env` privado.
- Configuracao real de WAHA.
- Sessao WAHA.
- Dump PostgreSQL.
- Configuracao de tunel.
- Configuracao de deploy.

## Regras

- Backup nao faz parte desta etapa de documentacao.
- Nao executar backup sem aprovacao.
- Nao parar WAHA sem aprovacao.
- Nao tocar banco sem aprovacao.
- Nao copiar credenciais para o Git.

## Validacao futura

- Gerar backup.
- Gerar inventario.
- Restaurar em pasta/ambiente separado.
- Validar estrutura.
- Validar funcionamento somente em janela aprovada.
