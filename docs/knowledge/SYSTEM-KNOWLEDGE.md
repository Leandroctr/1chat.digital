# System Knowledge - 1chat.digital

## Classificacao

Confirmado por inspeção do código em origin/main:

- O sistema tem site estatico, bot Express, painel admin, webhook WAHA, planilha de respostas, fallback de IA e persistencia local/PostgreSQL.

Confirmado em produção pública:

- O bot publico responde em `/health`.
- O login admin publico responde.

Pendente de validação:

- Estado de WAHA, Docker, Cloudflare, PostgreSQL e backups.

## Fluxo principal

Confirmado por `bot/src/webhookRoute.js`:

1. O bot recebe `POST /webhook`.
2. Eventos diferentes de `message` sao ignorados.
3. Mensagens proprias e grupos sao ignorados.
4. Mensagens duplicadas sao filtradas por `messageId`.
5. O atendimento e carregado ou criado.
6. O fluxo coleta nome, CPF e site quando necessario.
7. Apos cadastro, o bot classifica mensagens de recuperacao de senha.
8. Se for recuperacao de senha, orienta o usuario pelo fluxo deterministico.
9. Se envolver perda/troca de telefone, pede o novo telefone e encaminha para humano com contexto.
10. Se nao for recuperacao de senha, procura resposta em `respostas.xlsx`.
11. Se houver resposta com encaminhamento humano, entra na fila humana.
12. Se houver link de video, envia link e pergunta se ajudou.
13. Se nao houver resposta, chama Gemini.
14. Se a IA nao resolver, encaminha para humano.

## Coleta de dados

Confirmado por inspeção do código em origin/main:

- Etapa inicial pede primeiro nome.
- Depois pede CPF.
- O CPF e validado por `bot/validador-cpf.js`.
- Depois pede site/plataforma.
- A etapa `liberado` permite atendimento normal.

## Respostas por planilha

Confirmado por inspeção do código em origin/main:

- A planilha fica em `bot/data/respostas.xlsx`.
- Leitura e busca ficam em `bot/src/respostas.js`.
- O painel admin expoe CRUD de respostas.
- A planilha e area sensivel e nao deve ser alterada sem aprovacao.

## Atendimento humano

Confirmado por inspeção do código em origin/main:

- Logica em `bot/src/humano.js`.
- Fila em `bot/src/fila.js`.
- Atendimentos em `bot/src/atendimentos.js`.
- `operador`, `humano`, `atendente` e termos similares disparam pedido de humano.
- Horario humano e validado em `bot/src/businessHours.js`.
- Fora do horario, o usuario precisa confirmar para entrar na fila.
- Recuperacao de senha com perda/troca de telefone encaminha para humano automaticamente depois que o usuario informa o novo telefone.

## Mensagem final

Confirmado por inspeção do código em origin/main:

- Logica em `bot/src/mensagemFinalService.js`.
- Persistencia em `bot/src/mensagemFinalStore.js`.
- Configuracao em `bot/src/configService.js`.
- Pode usar imagem final via Supabase Storage.

## Metricas

Confirmado por inspeção do código em origin/main:

- Logica em `bot/src/metrics.js`.
- Categorias por gatilhos incluem senha, saque, deposito, bonus, sac, operador, cpf_cadastro e plataforma.
- Com PostgreSQL ativo, eventos sao gravados em `human_handoff_events`.
- O painel le `GET /api/metrics/today`.

## Admin

Confirmado por inspeção do código em origin/main:

- Login em `/admin/login`.
- Sessao com `express-session`.
- Cookie `1chat.admin.sid`.
- Credenciais via `ADMIN_USER` e `ADMIN_PASSWORD`.
- `SESSION_SECRET` deve existir em ambiente real.
- Em PostgreSQL, sessoes usam `connect-pg-simple`.

## Recuperacao de senha

Confirmado por inspecao do codigo em origin/main:

- Existe `bot/src/passwordRecovery.js`.
- Existe integracao em `bot/src/webhookRoute.js`.
- O fluxo detecta recuperacao de senha por padroes de mensagem.
- O fluxo roda depois da coleta de nome, CPF e site/plataforma.
- O fluxo roda antes da busca na planilha e antes do Gemini.
- Se o usuario nao tem mais acesso ao telefone, numero ou WhatsApp, o bot pergunta o novo telefone.
- Apos receber o novo telefone, o bot encaminha automaticamente para atendimento humano.
- A fila recebe contexto de recuperacao de senha, perda/troca de telefone e novo telefone informado.
- O usuario nao precisa digitar `operador` nesse fluxo.
- O atendimento humano e o botao Encerrar foram preservados.

Pendente de validacao:

- Teste real completo no WhatsApp apos o commit `ad9d717`.
- Conferencia visual final no painel com o novo texto e contexto.
