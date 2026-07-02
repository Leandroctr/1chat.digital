# Decisions - 1chat.digital

## Objetivo

Este documento registra decisoes arquiteturais e operacionais relevantes para o projeto.

## Como registrar decisoes

Cada nova decisao deve ser adicionada como uma entrada independente, com identificador estavel e evidencias claras. A decisao deve diferenciar informacoes usando exatamente estas classificacoes: Confirmado por inspeção do código em origin/main, Confirmado em produção pública, Inferido da máquina local, Pendente de validação e Informação privada / não versionada.

## Estrutura sugerida

```text
## DEC-000 - Titulo da decisao

ID:
Data:
Contexto:
Decisao:
Consequencias:
Evidencias:
Classificacao:
```

Campos recomendados:

- ID: identificador sequencial, por exemplo `DEC-001`.
- Data: data em que a decisao foi registrada.
- Contexto: problema ou motivacao.
- Decisao: escolha feita.
- Consequencias: impactos esperados, riscos e tradeoffs.
- Evidencias: arquivos, rotas, commits, produção pública ou validacoes usadas.

## DEC-001 - Fluxo deterministico de recuperacao de senha

ID: DEC-001

Data: 2026-07-02

Contexto:

- Usuarios pedem recuperacao de senha pelo WhatsApp.
- Parte dos usuarios nao tem mais acesso ao telefone, numero ou WhatsApp cadastrado.
- O projeto precisa orientar a recuperacao sem depender do Gemini ou da planilha para esse caso critico.
- O atendimento humano precisa receber contexto suficiente quando houver troca/perda de telefone.

Decisao:

- Implementar fluxo deterministico de recuperacao de senha em `bot/src/passwordRecovery.js`.
- Integrar o fluxo em `bot/src/webhookRoute.js`.
- Rodar a classificacao depois da coleta de nome, CPF e site/plataforma.
- Rodar antes da busca em `respostas.xlsx` e antes do Gemini.
- Para recuperacao simples, orientar o usuario a usar o botao "Recuperar senha" no site.
- Se o usuario nao tem mais acesso ao telefone/numero/WhatsApp, pedir o novo telefone.
- Depois de receber o novo telefone, encaminhar automaticamente para atendimento humano com contexto.
- Preservar atendimento humano e botao Encerrar.

Consequencias:

- Recuperacao de senha deixa de ser pendencia de implementacao.
- O usuario nao precisa digitar `operador` quando o caso for perda/troca de telefone dentro desse fluxo.
- A fila humana recebe contexto de recuperacao de senha, perda/troca de telefone e novo telefone informado.
- O fluxo fica previsivel e auditavel, reduzindo dependencia de IA para um caso operacional critico.
- Ainda e necessario validar o fluxo completo no WhatsApp e conferir o painel apos o ultimo ajuste de texto.

Evidencias:

- `bot/src/passwordRecovery.js` existe em `origin/main`.
- `bot/src/webhookRoute.js` integra `passwordRecovery`.
- Commits relacionados:
  - `6bbaceb feat: add password recovery flow`
  - `6b6ec6e fix: guide password recovery phone change flow`
  - `ad9d717 chore: adjust password recovery messages`
- Confirmado em producao publica ja registrado:
  - `/health` respondeu `200`.
  - `service = 1chat-bot`.
  - `mode = production`.
  - `/admin/login` respondeu `200`, conforme registro documental existente.

Classificacao:

- Confirmado por inspecao do codigo em origin/main.
- Confirmado parcialmente em producao publica.
- Pendente de validacao funcional completa no WhatsApp/painel.
