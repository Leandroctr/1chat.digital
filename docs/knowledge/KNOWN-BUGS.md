# Known Bugs and Risks - 1chat.digital

## Classificacao

Este arquivo registra riscos confirmados por inspeção do código em origin/main e pendencias operacionais. Ele nao prova estado real de infraestrutura.

## BUG-001 - Fallback WAHA usa porta local legada

Confirmado por inspeção do código em origin/main:

Evidencia:

- `bot/src/env.js` usa `WAHA_URL || WAHA_BASE_URL || "http://localhost:3001"`.

Impacto:

- Se o ambiente nao definir `WAHA_URL` ou `WAHA_BASE_URL`, o bot tentara usar `localhost:3001`.

Pendente de validação:

- Validar qual URL WAHA esta configurada em producao.
- Validar qual porta WAHA usa na maquina local.

## BUG-002 - Estado real de WAHA nao esta validado nesta documentacao

Pendente de validação:

Impacto:

- Sem validacao, nao e seguro afirmar disponibilidade, URL, porta, volume ou sessao WAHA.

Como tratar:

- Validar em etapa propria, sem alterar Docker/WAHA sem aprovacao.

## BUG-003 - Backup e restore nao estao comprovados nesta base

Pendente de validação:

Impacto:

- Pode existir falsa sensacao de recuperacao se backup e restore nao forem testados.

Como tratar:

- Planejar backup e restore depois da revisao documental.

## BUG-004 - PostgreSQL pode estar ativo, mas uso real nao foi validado

Pendente de validação:

Evidencia de suporte:

- O codigo ativa PostgreSQL com `DATABASE_URL`.

Pendente de validação:

- Confirmar se `DATABASE_URL` esta configurado em producao.
- Confirmar rotina de dump e restore.

## BUG-005 - Segredos e configuracoes reais nao podem ser inferidos pelo Git

Informação privada / não versionada:

Impacto:

- `.env`, chaves WAHA, credenciais admin, Supabase, Gemini e banco devem ficar fora do Git.

Como tratar:

- Usar `SECRETS.template.md` apenas com placeholders.
- Guardar valores reais em cofre ou documento privado nao versionado.

## BUG-006 - Mojibake/encoding em textos existentes

Confirmado por inspeção do código em origin/main:

Evidencia:

- Alguns textos em `bot/ia.js` e rotas contem caracteres quebrados.

Impacto:

- Mensagens ao cliente ou ao admin podem aparecer com acentuacao quebrada.

Como tratar:

- Corrigir em etapa separada, com teste de mensagens e sem misturar com documentacao.

## BUG-007 - Validacao final do fluxo de recuperacao de senha

Confirmado por inspecao do codigo em origin/main:

Evidencia:

- O fluxo de recuperacao de senha existe em `bot/src/passwordRecovery.js`.
- O fluxo esta integrado em `bot/src/webhookRoute.js`.
- O fluxo foi incorporado em `origin/main` pelos commits `6bbaceb`, `6b6ec6e` e `ad9d717`.
- Ele roda depois da coleta de nome, CPF e site/plataforma.
- Ele roda antes da busca na planilha e antes do Gemini.
- Quando o usuario perdeu/trocou telefone, o bot pede o novo telefone e encaminha para humano com contexto.

Pendente de validacao:

- Teste real completo no WhatsApp apos o ajuste de texto `ad9d717`.
- Conferencia visual final no painel com o novo texto e o contexto de recuperacao de senha/troca de telefone.

Como tratar:

- Nao tratar recuperacao de senha como implementacao pendente.
- Tratar apenas a validacao funcional final no WhatsApp/painel como pendente.
