# START HERE - 1chat.digital

Este e o ponto inicial para qualquer trabalho no projeto.

## Fonte da verdade

Confirmado por inspeção do código em origin/main:

- A base atual desta documentacao e a branch `sync-docs-from-origin`, criada a partir de `origin/main`.
- O bot fica em `bot/`.
- A entrada principal do bot e `bot/index.js`.
- O codigo atual esta modularizado em `bot/src/`.
- O fluxo deterministico de recuperacao de senha existe em `origin/main` e deve ser tratado como implementado, nao como pendente historico.
- A documentacao anterior pode ser usada apenas como referencia historica.

Pendente de validação:

- Estado real de WAHA.
- Estado real de Docker.
- Estado real de Cloudflare Tunnel.
- Estado real de PostgreSQL.
- Estado real de backup e restore.
- Variaveis reais de producao.
- Teste funcional completo do fluxo de recuperacao de senha no WhatsApp/painel apos o ultimo ajuste de texto.

## Ordem de leitura

1. `CHATGPT_PROJECT_CONTEXT.md`
2. `docs/AI_CONTEXT.md`
3. `docs/ai/AI_RULES.md`
4. `docs/ai/AI_CHANGE_POLICY.md`
5. `docs/knowledge/SYSTEM-KNOWLEDGE.md`
6. `docs/disaster-recovery/ARCHITECTURE.md`

## Regras antes de mudar qualquer coisa

- Confirmar estado real antes de alterar operacao.
- Confirmar estado real antes de alterar infraestrutura.
- Confirmar estado real antes de alterar dados.
- Diferenciar fato confirmado, inferencia e pendencia.
- Nunca tratar documento antigo como fonte da verdade.

## Areas sensiveis

Informação privada / não versionada:

- WAHA.
- Docker.
- Cloudflare.
- PostgreSQL.
- `.env`.
- `waha-data/`.
- `waha-files/`.
- `bot/data/respostas.xlsx`.
- Backups, dumps e arquivos compactados.

Qualquer mudanca nessas areas exige aprovacao explicita e verificacao do estado real.
