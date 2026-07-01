# System Knowledge - 1chat.digital

## O que e o 1chat.digital

O 1chat.digital e um sistema de atendimento passivo via WhatsApp. Ele recebe mensagens de clientes, coleta dados basicos, tenta responder automaticamente com base em uma planilha Excel e encaminha para atendimento humano quando necessario.

O projeto esta em fase MVP/producao inicial. A prioridade atual e estabilidade operacional, backup, recuperacao e correcao de bugs reais.

## Objetivo do projeto

- Centralizar atendimento WhatsApp.
- Reduzir repeticao de respostas simples.
- Preservar atendimento humano quando o bot nao resolver.
- Manter operacao local controlada pelo dono do projeto.
- Permitir recuperacao em outro computador caso o SSD seja perdido.

## Fluxo geral

```text
Cliente WhatsApp
  -> WAHA local
  -> webhook do bot/backend
  -> coleta nome, CPF e plataforma
  -> busca resposta em Excel
  -> opcionalmente chama IA
  -> responde via WAHA
  -> se necessario, encaminha para fila humana
  -> painel admin acompanha e encerra atendimento
```

## Fluxo WhatsApp -> WAHA -> bot/backend -> dados -> painel

1. O cliente envia mensagem no WhatsApp.
2. O WAHA recebe a mensagem usando a sessao persistida em `waha-data`.
3. O WAHA envia evento para o webhook do bot: `POST /webhook`.
4. O backend Node.js/Express processa a mensagem.
5. O bot grava estado em arquivos JSON locais ou PostgreSQL se `DATABASE_URL` estiver configurada.
6. O painel admin le a fila e configuracoes por endpoints `/api/*`.
7. O operador humano atua pela fila quando o bot encaminha o cliente.

## Coleta de dados

O fluxo atual coleta:

- nome;
- CPF;
- site/plataforma onde o cliente estava;
- mensagem/problema do cliente.

Esses dados alimentam o atendimento, a fila humana e, quando PostgreSQL esta ativo, tabelas como `atendimentos` e `fila`.

## Respostas por planilha Excel

A base de respostas do bot fica em:

`bot/data/respostas.xlsx`

O bot le gatilhos, sinonimos, prioridade, resposta e possivel link de video. Essa planilha e critica para restore e deve estar em todo backup.

## Atendimento humano

O atendimento humano entra quando:

- o cliente pede operador, humano, atendente ou suporte;
- o bot nao consegue resolver;
- uma resposta da planilha orienta encaminhamento;
- o cliente nega que a resposta/video resolveu.

Quando isso acontece, o atendimento passa para modo humano e entra na fila do painel.

## Fila do painel

O painel admin exibe a fila humana. O operador acompanha:

- numero;
- nome;
- CPF;
- site/plataforma;
- mensagem;
- horario;
- status.

## Botao Encerrar

O botao Encerrar tira o cliente da fila humana e inicia o fluxo de encerramento. O sistema pergunta se ainda pode ajudar e, dependendo da resposta ou do timer, retorna o atendimento ao fluxo automatico.

## Retorno ao fluxo automatico

Depois do encerramento, o atendimento volta para modo `bot`. O cliente pode voltar a conversar e o fluxo automatico retoma desde o ponto definido pelo estado salvo.

## Dados criticos para operacao

- `waha-data/`: sessao WhatsApp.
- `waha-files/`: arquivos temporarios/midia do WAHA.
- `bot/data/respostas.xlsx`: base de respostas.
- `bot/data/config.json`: configuracao operacional.
- `bot/data/atendimentos.json`: estado local se nao houver PostgreSQL.
- `bot/data/fila.json`: fila local se nao houver PostgreSQL.
- `DATABASE_URL`: quando PostgreSQL estiver ativo.
- `GEMINI_API_KEY`: quando IA estiver ativa.
- Credenciais WAHA: API key, dashboard e Swagger.
