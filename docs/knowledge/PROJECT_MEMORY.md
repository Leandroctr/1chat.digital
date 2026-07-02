# Project Memory - 1chat.digital

Memoria operacional do projeto.

## Regras permanentes

- `origin/main` e a base principal para documentacao versionada.
- Documentos antigos podem orientar, mas nao provar estado atual.
- Hipoteses devem ser marcadas como pendentes.
- Informação privada / não versionada nao deve ser publicada.

## Areas que nao podem ser alteradas por engano

- `bot/data/respostas.xlsx`.
- `.env`.
- WAHA.
- Docker.
- Cloudflare.
- PostgreSQL.
- `waha-data/`.
- `waha-files/`.
- Backups e dumps.

## Dados que precisam ser preservados

Confirmado por inspeção do código em origin/main:

- `bot/data/respostas.xlsx`.
- `bot/data/config.json`.
- `bot/data/fila.json`.
- `bot/data/atendimentos.json`.

Pendente de validação:

- Dados reais em PostgreSQL.
- Sessao WAHA real.
- Backups existentes.
- Restore funcional.

## Decisoes a nao reabrir sem motivo

- Nao usar documento gerado em copia divergente como fonte da verdade.
- Nao misturar documentacao com mudanca operacional.
- Nao versionar segredos.
