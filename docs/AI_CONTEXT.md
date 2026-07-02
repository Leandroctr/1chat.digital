# AI Context - 1chat.digital

Este documento orienta assistentes de IA que trabalham no projeto.

## Fonte da verdade

Confirmado por inspeção do código em origin/main:

- O projeto contem um site estatico na raiz.
- O backend do bot fica em `bot/`.
- `bot/index.js` inicializa o Express, servicos e rotas.
- Modulos principais ficam em `bot/src/`.
- O painel admin fica em `bot/public/`.
- A planilha `bot/data/respostas.xlsx` existe e deve ser preservada.
- O fluxo deterministico de recuperacao de senha existe em `bot/src/passwordRecovery.js` e e integrado em `bot/src/webhookRoute.js`.

Informação privada / não versionada:

- Credenciais reais.
- `.env`.
- Sessao WAHA.
- Dados de backup.
- Dumps de banco.

## Comportamento esperado

- Trabalhar a partir do codigo atual.
- Confirmar estado antes de alterar operacao, infraestrutura ou dados.
- Separar claramente fato, inferencia e pendencia.
- Evitar refatoracoes fora do escopo.
- Nao sugerir troca de stack sem evidencias e sem esgotar a abordagem atual.

## Areas sensiveis

WAHA, Docker, Cloudflare, PostgreSQL, `.env`, `waha-data/`, `waha-files/` e `bot/data/respostas.xlsx` sao areas sensiveis.

Mudancas nessas areas exigem aprovacao explicita.

## Prioridade

1. Preservar dados e operacao.
2. Corrigir documentacao divergente.
3. Registrar pendencias com clareza.
4. Implementar mudancas somente quando a base real estiver confirmada.

## Recuperacao de senha

Confirmado por inspecao do codigo em origin/main:

- O fluxo de recuperacao de senha foi implementado pelos commits `6bbaceb`, `6b6ec6e` e `ad9d717`.
- O fluxo roda depois da coleta de nome, CPF e site/plataforma.
- O fluxo roda antes da busca na planilha e antes do Gemini.
- Se o usuario nao tem mais acesso ao telefone/numero/WhatsApp, o bot pede o novo telefone e encaminha para atendimento humano com contexto.

Pendente de validacao:

- Teste real completo no WhatsApp apos o ultimo ajuste de texto.
- Conferencia visual final no painel com o novo texto e contexto.
