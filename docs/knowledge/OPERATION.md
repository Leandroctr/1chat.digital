# Operation Manual - 1chat.digital

## Caminho principal

Instalacao operacional encontrada:

`C:\Users\User\1chat.digital`

## Como iniciar WAHA

No projeto real:

```powershell
cd C:\Users\User\1chat.digital
docker compose up -d
```

Container esperado:

`1chat-waha`

Imagem esperada:

`devlikeapro/waha-plus:latest`

## Como reiniciar WAHA

```powershell
cd C:\Users\User\1chat.digital
docker compose restart waha
```

Ou:

```powershell
docker restart 1chat-waha
```

## Como verificar WAHA

```powershell
docker ps
docker logs 1chat-waha
```

Verificar tambem se a porta publicada esta correta:

```powershell
docker inspect 1chat-waha
```

## Como saber se WhatsApp conectou

Verificar:

- dashboard do WAHA;
- logs do container;
- se `waha-data/webjs/.../session-*` esta sendo atualizado;
- se o painel/admin mostra status operacional, quando disponivel;
- se mensagem de teste chega ao webhook.

## Como iniciar o bot

No projeto real:

```powershell
cd C:\Users\User\1chat.digital\bot
npm start
```

Antes de iniciar, confirmar:

- `WAHA_URL` aponta para a porta correta do WAHA;
- `WAHA_API_KEY` bate com a configuracao do WAHA;
- `GEMINI_API_KEY` existe se IA for usada;
- `DATABASE_URL` existe se PostgreSQL for usado.

## Como verificar o bot

Healthcheck:

```text
http://localhost:3000/health
```

Painel:

```text
http://localhost:3000/admin
```

Webhook:

```text
http://localhost:3000/webhook
```

## Como verificar logs

WAHA:

```powershell
docker logs 1chat-waha
```

Bot:

- console onde `npm start` esta rodando;
- pasta `bot/logs/`, quando existir.

## Como operar fila humana

1. Abrir painel admin.
2. Ver fila de clientes aguardando atendimento humano.
3. Atender pelo WhatsApp/operacao humana definida.
4. Quando finalizar, usar botao Encerrar.
5. O sistema pergunta se ainda pode ajudar.
6. O cliente volta ao fluxo automatico quando encerrado.

## Como encerrar atendimento

No painel, usar o botao Encerrar do item da fila.

Efeito esperado:

- cliente sai da fila;
- atendimento volta para modo bot;
- bot envia pergunta de confirmacao/finalizacao;
- fluxo automatico fica disponivel novamente.

## Se WAHA cair

1. Nao apagar `waha-data`.
2. Verificar `docker ps`.
3. Verificar logs: `docker logs 1chat-waha`.
4. Reiniciar container.
5. Confirmar se sessao WhatsApp continua conectada.
6. Se pedir QR Code, reconectar com responsavel autorizado.
7. Registrar incidente em documentacao.

## Se o PC reiniciar

1. Abrir Docker Desktop.
2. Verificar se `1chat-waha` subiu.
3. Se nao subiu, rodar `docker compose up -d`.
4. Iniciar bot se ele nao estiver como servico.
5. Testar `/health`.
6. Testar mensagem WhatsApp.

## Se banco nao conectar

1. Confirmar se `DATABASE_URL` esta definida.
2. Confirmar rede/acesso ao banco.
3. Verificar logs do bot.
4. Se nao houver PostgreSQL, confirmar se fallback JSON em `bot/data/` esta preservado.
5. Nao apagar arquivos JSON.
6. Se houver dump, restaurar em ambiente controlado.

## Se a planilha parar de responder

1. Confirmar existencia de `bot/data/respostas.xlsx`.
2. Confirmar se a planilha abre.
3. Confirmar colunas esperadas pelo bot.
4. Restaurar copia de backup se a planilha estiver corrompida.

## Se houver conflito de porta

Sintoma comum:

- bot usa `3000`;
- WAHA tambem esta publicado em `3000`;
- bot espera WAHA em `3001`.

Acao:

- decidir porta oficial;
- ajustar `WAHA_URL` ou compose;
- registrar mudanca.
