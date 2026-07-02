# AI Change Policy - 1chat.digital

Esta politica classifica risco de mudancas feitas por IA ou desenvolvedor.

## Baixo risco

Pode ser feito com revisao normal:

- Documentacao baseada no codigo atual.
- Comentarios explicativos pontuais.
- Ajustes de texto sem alterar comportamento.
- Templates sem credenciais reais.

## Medio risco

Exige leitura dos arquivos relacionados e validacao antes de concluir:

- Alteracao em rotas Express.
- Alteracao no painel admin.
- Alteracao em fluxo de atendimento.
- Alteracao em logging.
- Alteracao em `.env.example`.
- Alteracao em `.gitignore`.

## Alto risco

Exige aprovacao explicita e verificacao do estado real:

- WAHA.
- Docker.
- Cloudflare.
- PostgreSQL.
- Portas.
- Dados de `bot/data/`.
- `bot/data/respostas.xlsx`.
- `.env` real.
- `waha-data/`.
- `waha-files/`.
- Backup e restore.

## Regra final

Se uma mudanca puder afetar atendimento, sessao WhatsApp, dados, credenciais ou infraestrutura, parar e pedir aprovacao antes de executar.
