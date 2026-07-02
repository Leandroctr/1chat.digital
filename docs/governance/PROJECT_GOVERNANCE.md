# Project Governance - 1chat.digital

## Principio

O projeto deve ser operado com separacao clara entre codigo versionado, configuracao privada e estado operacional.

## Fonte da verdade

Pendente de validação:

- A documentacao deve ser reconstruida a partir de `origin/main`.
- A documentacao anterior foi produzida sobre copia divergente e nao e fonte da verdade.

Confirmado por inspeção do código em origin/main:

- O codigo atual esta modularizado em `bot/src/`.
- A planilha `bot/data/respostas.xlsx` existe e e sensivel.

## Regras de governanca

- Registrar decisoes em `docs/knowledge/DECISIONS.md`.
- Registrar riscos em `docs/knowledge/KNOWN-BUGS.md`.
- Registrar runbooks em `docs/runbooks/`.
- Registrar disaster recovery em `docs/disaster-recovery/`.
- Manter segredos fora do Git.

## Antes de grandes mudancas

- Confirmar estado real da producao.
- Confirmar estado real da maquina local.
- Confirmar quais arquivos serao alterados.
- Fazer backup aprovado quando houver risco operacional.
- Nao misturar correcao de documentacao com alteracao de infraestrutura.
