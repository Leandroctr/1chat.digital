# AI Change Policy - 1chat.digital

Esta politica define como classificar mudancas antes de aplicar qualquer alteracao.

## Baixo risco

Exemplos:

- Documentacao.
- Comentarios.
- Pequenas correcoes visuais.
- Ajustes de texto sem mudar fluxo.
- Organizacao de arquivos de docs.

Conduta:

- Pode aplicar com verificacao simples.
- Registrar se alterar contexto importante.

## Medio risco

Exemplos:

- Rotas.
- Configuracoes.
- Ajustes de fluxo.
- Dependencias.
- Mudancas no painel admin.
- Mudancas em validacoes.

Conduta:

- Explicar impacto.
- Indicar arquivos afetados.
- Testar fluxo relacionado.
- Ter plano de rollback simples.

## Alto risco

Exemplos:

- Banco.
- Docker.
- WAHA.
- Autenticacao.
- Filas.
- Deploy.
- Sessoes WhatsApp.
- Portas.
- Persistencia.

Conduta obrigatoria:

- Explicar impacto.
- Indicar arquivos afetados.
- Propor rollback.
- Pedir confirmacao antes de aplicar.
- Nao executar se houver risco de perda de sessao, dados ou atendimento sem backup.

## Regra final

Se a IA nao consegue classificar o risco com seguranca, tratar como medio ou alto risco.
