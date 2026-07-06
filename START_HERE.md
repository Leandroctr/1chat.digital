# START HERE - 1chat.digital

Este e o ponto inicial para qualquer trabalho no projeto.

## Antes de atualizar este projeto via Git

Nao comecar por `git pull`.

Antes de qualquer atualizacao via Git, confirmar:

- pasta real em uso;
- `git remote -v`;
- `git branch --show-current`;
- `git status -sb`;
- se o repositorio e o `1chat.digital` correto;
- presenca dos arquivos criticos quando estiver na maquina operacional:
  - `docker-compose.yml`;
  - `waha-data/`;
  - `bot/data/respostas.xlsx`.

Instalacao operacional principal confirmada em 2026-07-06:

```text
C:\Users\User\1chat.digital
```

Se houver alteracao local em `bot/`, `.env`, `docker-compose.yml`, `waha-data/` ou `bot/data/`, parar e reportar antes de atualizar.

Se a working tree estiver limpa, a branch for `main`, o remote for o correto e o repositorio estiver apenas behind, usar:

```powershell
git pull --ff-only origin main
```

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

1. `AGENTS.md`
2. `CHATGPT_PROJECT_CONTEXT.md`
3. `docs/AI_CONTEXT.md`
4. `docs/ai/AI_RULES.md`
5. `docs/ai/CURRENT_STATUS.md`
6. `docs/knowledge/PROJECT_MEMORY.md`
7. `docs/knowledge/KNOWN-BUGS.md`
8. `docs/ai/AI_CHANGE_POLICY.md`
9. `docs/knowledge/SYSTEM-KNOWLEDGE.md`
10. `docs/disaster-recovery/ARCHITECTURE.md`

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
