# Runbook - Atualizacao segura via Git

## Objetivo

Evitar atualizacao da pasta errada, perda de alteracoes locais ou mistura entre projetos antes de sincronizar o `1chat.digital`.

## Quando usar

Usar antes de qualquer `git pull`, sincronizacao, atualizacao local ou preparacao de ambiente em outro computador.

## Pre-requisitos

- Ler `AGENTS.md`.
- Confirmar que a pasta candidata e o projeto correto.
- Nao alterar arquivos durante o diagnostico.
- Nao expor secrets.

## Comandos somente diagnostico

```powershell
pwd
git remote -v
git branch --show-current
git status -sb
git status --short
git log --oneline --decorate -5
git fetch origin
git log --oneline HEAD..origin/main
git log --oneline origin/main..HEAD
```

## Criterios para permitir pull

Permitir `pull` somente quando todos os criterios forem verdadeiros:

- branch atual e `main`;
- remote aponta para o repositorio correto do `1chat.digital`;
- working tree esta limpa;
- `git log --oneline origin/main..HEAD` esta vazio;
- ha apenas commits remotos pendentes em `HEAD..origin/main`;
- nao existem mudancas locais sensiveis.

Comando permitido:

```powershell
git pull --ff-only origin main
```

## Criterios para bloquear

Bloquear e reportar se houver:

- alteracoes em `bot/`;
- alteracoes em `docker-compose.yml`;
- `.env` presente no diff ou modificado;
- `waha-data/` aparecendo no status/diff;
- `waha-files/` aparecendo no status/diff;
- `bot/data/` modificado;
- divergencia local (`origin/main..HEAD` nao vazio);
- branch diferente de `main`;
- remote incorreto;
- pasta sem arquivos criticos esperados na instalacao operacional.

## O que reportar ao usuario

Reportar:

- pasta atual (`pwd`);
- remote;
- branch;
- status resumido;
- se esta clean, behind, ahead ou divergente;
- arquivos sensiveis que bloqueiam a atualizacao;
- recomendacao objetiva: permitir `pull --ff-only`, bloquear ou pedir confirmacao.

## O que nunca fazer

Nunca executar como atalho para resolver divergencia:

- `git reset --hard`
- `git clean -fd`
- `git rebase`
- merge manual sem autorizacao
- `git push --force`
- restore/checkout destrutivo de arquivos locais
