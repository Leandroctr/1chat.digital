# AGENTS.md - 1chat.digital

Este e o primeiro arquivo que qualquer IA, Codex ou operador deve ler antes de agir neste projeto.

## Validacao obrigatoria antes de qualquer acao

Antes de diagnosticar, editar, atualizar via Git, rodar comandos operacionais ou responder com conclusoes, confirmar:

```powershell
pwd
git remote -v
git branch --show-current
git status -sb
Test-Path docker-compose.yml
Test-Path waha-data
Test-Path bot\data\respostas.xlsx
```

Instalacao operacional principal confirmada em 2026-07-06:

```text
C:\Users\User\1chat.digital
```

Nao assumir que uma pasta e producao apenas pelo nome. A pasta correta deve ser validada por remote Git, branch, status e arquivos criticos.

Pastas que podem existir e causar confusao:

- `C:\Projetos\1chat-hml`
- `C:\Users\User\Documents\app-site`
- `C:\Projetos\app-big`
- `C:\Projetos\app-megabingo7`

## Antes de git pull

Nao comecar por `git pull`.

Primeiro rodar:

```powershell
git fetch origin
git log --oneline HEAD..origin/main
git log --oneline origin/main..HEAD
git status --short
```

Usar `git pull --ff-only origin main` somente se:

- a pasta operacional foi confirmada;
- o remote e o repositorio `1chat.digital` correto;
- a branch e `main`;
- a working tree esta limpa;
- `origin/main..HEAD` esta vazio;
- o repositorio esta apenas behind.

## Operacoes proibidas sem autorizacao explicita

Nunca executar sem autorizacao clara:

- `git reset --hard`
- `git clean -fd`
- `git rebase`
- checkout/restauracao destrutiva
- `git restore` em arquivos do usuario
- alteracao em `.env`
- alteracao em `waha-data/`
- alteracao em `waha-files/`
- alteracao em banco
- alteracao em sessao WhatsApp
- restart de Docker/WAHA

Nunca expor API keys, tokens, senhas, telefone completo, CPF ou mensagens reais.

## Areas sensiveis

Nao mexer sem diagnostico e autorizacao:

- WAHA
- Docker
- Cloudflare Tunnel
- banco
- `.env`
- `waha-data/`
- `waha-files/`
- `bot/data/respostas.xlsx`
- sessoes WhatsApp

## Estado operacional importante

- WAHA do `1chat.digital` usa a sessao `default`.
- Railway/bot deve usar `WAHA_SESSION=default`.
- `JANDIRA` pertence a outro projeto e nao deve aparecer em runtime do `1chat.digital`.
- O painel admin separa:
  - `systemStatus`: integracao geral, Cloudflare Tunnel e API;
  - `wahaSession`: sessao WhatsApp `default`.

## Ordem obrigatoria de leitura

1. `AGENTS.md`
2. `START_HERE.md`
3. `CHATGPT_PROJECT_CONTEXT.md`
4. `docs/AI_CONTEXT.md`, se existir
5. `docs/ai/AI_RULES.md`
6. `docs/ai/CURRENT_STATUS.md`
7. `docs/knowledge/PROJECT_MEMORY.md`
8. `docs/knowledge/KNOWN-BUGS.md`
