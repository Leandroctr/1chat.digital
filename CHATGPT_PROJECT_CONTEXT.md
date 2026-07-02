# CHATGPT_PROJECT_CONTEXT.md

Contexto operacional para assistentes de IA e desenvolvedores trabalhando no `1chat.digital`.

## Classificacao das informacoes

Confirmado por inspeção do código em origin/main:

- O repositorio contem site estatico na raiz.
- O bot Node.js/Express fica em `bot/`.
- O bot usa `bot/package.json`.
- O bot tem `bot/Dockerfile` e `bot/railway.json`.
- O backend esta modularizado em `bot/src/`.
- `bot/data/respostas.xlsx` existe e e base sensivel de respostas.

Confirmado em produção pública:

- `/health` respondeu `200`.
- O servico publico retornou `service = 1chat-bot`.
- O modo publico retornou `mode = production`.
- `/admin/login` respondeu.
- A pagina inicial entrega ou redireciona para o login admin.

Pendente de validação:

- Estado real de WAHA.
- Estado real de Docker e Cloudflare Tunnel.
- Estado real de PostgreSQL.
- Rotina real de backup.
- Restore funcional.
- Variaveis reais.

## Regra principal

Toda mudanca deve partir do estado atual de `origin/main`. Documentos antigos gerados em copia local divergente servem apenas como referencia historica.

## Areas que exigem cuidado

Nao alterar sem aprovacao explicita:

- WAHA.
- Docker.
- Banco.
- Cloudflare.
- Portas.
- `.env`.
- `waha-data/`.
- `waha-files/`.
- `bot/data/respostas.xlsx`.

## Antes de responder ou alterar

- Ler os arquivos atuais.
- Identificar se a informacao se enquadra como Confirmado por inspeção do código em origin/main, Confirmado em produção pública, Inferido da máquina local, Pendente de validação ou Informação privada / não versionada.
- Registrar pendencias quando a evidencia nao existir.
- Nao inventar estado operacional.
