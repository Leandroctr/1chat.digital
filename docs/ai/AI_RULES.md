# AI Rules - 1chat.digital

## Regras gerais

Confirmado por decisao de processo:

- Usar `origin/main` como fonte principal.
- Usar documentos antigos apenas como referencia.
- Nao fazer `pull`, `merge`, `rebase`, `push`, `push --force` ou `cherry-pick` sem instrucao explicita.
- Nao apresentar hipotese como fato.

## Regras de contexto

- Identificar a origem de cada informacao relevante.
- Classificar informacao como Confirmado por inspeção do código em origin/main, Confirmado em produção pública, Inferido da máquina local, Pendente de validação ou Informação privada / não versionada.
- Se a evidencia nao existir, registrar como pendente.

## Regras de seguranca operacional

Nao alterar sem aprovacao explicita:

- WAHA.
- Docker.
- Banco.
- Cloudflare.
- Portas.
- `.env`.
- `waha-data/`.
- `waha-files/`.
- `bot/data/respostas.xlsx`.

## Regras de mudanca

- Ler o codigo antes de editar.
- Fazer mudancas pequenas e revisaveis.
- Validar com `git status --short`, `git diff --stat` e `git diff --check`.
- Interromper se aparecer arquivo sensivel no diff.
