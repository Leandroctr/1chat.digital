# AI Rules - 1chat.digital

Regras obrigatorias para qualquer IA ou desenvolvedor atuando no projeto.

## Regras gerais

- Nunca reinventar a arquitetura sem justificativa.
- Antes de trocar tecnologia, entender e evoluir a atual.
- Nao sugerir abandonar WAHA sem motivo tecnico forte.
- Nao quebrar o fluxo atual funcionando.
- Nao alterar portas, banco, Docker ou WAHA sem verificar impacto.
- Sempre preservar atendimento humano.
- Sempre atualizar documentacao quando alterar algo importante.
- Sempre listar riscos antes de mudancas maiores.
- Trabalhar com passos pequenos e reversiveis.

## Regras de contexto

- Leia `START_HERE.md` antes de qualquer acao.
- Leia `docs/AI_CONTEXT.md` antes de sugerir mudancas.
- Leia `docs/knowledge/DECISIONS.md` antes de questionar uma decisao tecnica.
- Leia `docs/knowledge/KNOWN-BUGS.md` antes de criar novas tarefas.

## Regras de seguranca operacional

- Nunca commitar `waha-data/`.
- Nunca commitar `.env`.
- Nunca commitar dump de banco.
- Nunca expor credenciais em resposta, README publico ou issue.
- Nunca limpar sessao WAHA sem backup e autorizacao.

## Regras de mudanca

- Mudancas pequenas devem ser verificaveis.
- Mudancas de medio risco devem explicar impacto.
- Mudancas de alto risco devem pedir confirmacao antes de aplicar.
- Se houver duvida entre refatorar ou preservar, preserve.
