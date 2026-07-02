# Runbook Atendimento Humano - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O atendimento humano e controlado por `bot/src/humano.js`.
- A fila e controlada por `bot/src/fila.js`.
- O estado de atendimento e controlado por `bot/src/atendimentos.js`.
- O horario humano e controlado por `bot/src/businessHours.js`.

Pendente de validação:

- Processo operacional real dos atendentes.
- Escala real de atendimento.
- Uso real de PostgreSQL em producao.

## Entrada na fila humana

Confirmado por inspeção do código em origin/main:

- O usuario pode pedir operador/humano/atendente/suporte.
- Respostas da planilha podem marcar encaminhamento humano.
- Negacao de video apos resposta pode encaminhar para humano.
- Fallback sem resposta pode encaminhar para humano.
- Recuperacao de senha com perda/troca de telefone encaminha para humano automaticamente apos o usuario informar o novo telefone.
- Nesse fluxo, o usuario nao precisa digitar `operador`.

## Horario humano

Confirmado por inspeção do código em origin/main:

- Segunda a sabado usam `horario_humano_segunda_sabado_inicio` e `horario_humano_segunda_sabado_fim`.
- Domingo usa `horario_humano_domingo_inicio` e `horario_humano_domingo_fim`.
- Fuso usado pelo codigo: `America/Sao_Paulo`.
- Fora do horario, o bot pede confirmacao antes de colocar na fila.

## Dados gravados

Confirmado por inspeção do código em origin/main:

- Sem PostgreSQL, fila e atendimentos ficam em JSON dentro de `bot/data/`.
- Com PostgreSQL, fila e atendimentos ficam nas tabelas `fila` e `atendimentos`.
- Metricas de encaminhamento humano podem ser gravadas em `human_handoff_events`.
- No fluxo de recuperacao de senha com troca/perda de telefone, a fila recebe contexto com recuperacao de senha, troca/perda de telefone e novo telefone informado.

## Encerramento

Confirmado por inspeção do código em origin/main:

- O painel chama `POST /api/fila/encerrar`.
- O atendimento volta para modo `bot`.
- O fluxo de encerramento/mensagem final e iniciado.
- O botao Encerrar foi preservado no fluxo de atendimento humano.

## Cuidados

- Nao limpar fila ou atendimentos sem aprovacao.
- Nao truncar tabelas sem aprovacao.
- Nao alterar `bot/data/*.json` diretamente em producao sem validacao.
