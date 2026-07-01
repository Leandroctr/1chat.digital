# Inventario do Projeto 1chat.digital

Auditoria realizada em 2026-07-01. Escopo: leitura e documentacao, sem instalar, sem deploy e sem commit.

## 1. Copias Encontradas

| Caminho | Ultima modificacao observada | Tamanho aprox. | Possui .git | Possui Docker | Possui WAHA | Possui PostgreSQL | Parece principal | Observacoes |
|---|---:|---:|---|---|---|---|---|---|
| `C:\Users\User\1chat.digital` | 2026-07-01 16:45:59 em `waha-data` | 917 MB | Sim | Sim, `docker-compose.yml` e `bot/Dockerfile` | Sim, `waha-data`, `waha-files`, container `1chat-waha` | Suporte via `DATABASE_URL`, sem banco local/dump encontrado | Sim | Instalacao operacional real. O container Docker monta pastas deste caminho. |
| `C:\tmp\1chat-prod-main-20260618183445` | 2026-06-23 13:56:19 em codigo | 0,42 MB | Sim, worktree com arquivo `.git` | Sim, `bot/Dockerfile`; sem compose | Nao ha `waha-data`; codigo integra com WAHA | Suporte via `DATABASE_URL`; sem banco/dump encontrado | Nao | Copia temporaria mais nova do codigo do bot/painel, possivelmente worktree de alteracoes. |
| `C:\Users\User\Documents\1chat digital` | 2026-07-01 16:44 aprox. | pequeno, docs/scripts | Sim, repo vazio sem commits | Nao | Nao | Nao | Nao | Workspace atual usado para salvar a documentacao de DR. |

Instalacao principal escolhida para inventario completo:

`C:\Users\User\1chat.digital`

Motivos: possui `.git`, `docker-compose.yml`, `bot/`, `waha-data`, `waha-files`, volume/sessoes WAHA ativas e e o caminho montado pelo container `1chat-waha`.

## 2. Estrutura Completa de Diretorios da Instalacao Principal

```text
C:\Users\User\1chat.digital
|-- .git
|-- bot
|   |-- data
|   |-- public
|   |   `-- assets
|   `-- logs (criado em runtime, se existir)
|-- waha-data
|   `-- webjs
|       |-- default
|       |   `-- session-default
|       `-- JANDIRA
|           `-- session-JANDIRA
`-- waha-files
```

Arquivos principais na raiz:

```text
admin-atual.txt
app-atual.txt
app.js
CNAME
conflito-index.txt
corrigir-encoding-ascii.ps1
corrigir-encoding-utf8-sem-bom.ps1
docker-compose.yml
index-atual.txt
index-conflito-completo.txt
index.html
mensagem-final-atendimento-humano-v2.patch
mensagem-final-atendimento-humano-v3-sem-app.patch
mensagem-final-atendimento-humano.patch
style-atual.txt
style.css
```

Arquivos principais em `bot/`:

```text
bot\.dockerignore
bot\.gitignore
bot\Dockerfile
bot\README.md
bot\data\atendimentos.json
bot\data\config.json
bot\data\fila.json
bot\data\respostas.xlsx
bot\ia.js
bot\index.js
bot\leitor-respostas.js
bot\package-lock.json
bot\package.json
bot\public\admin.html
bot\public\app.js
bot\public\assets\logo.png
bot\public\style.css
bot\railway.json
bot\validador-cpf.js
bot\zerar_fila_1chat.bat
```

## 3. Arquivos `.env` Encontrados

| Caminho | Encontrado? | Observacao |
|---|---|---|
| `C:\Users\User\1chat.digital` | Nao | Nenhum `.env`, `*.env` ou `.env.*` encontrado fora de `.git`/`node_modules`. |
| `C:\tmp\1chat-prod-main-20260618183445` | Nao | Nenhum `.env`, `*.env` ou `.env.*` encontrado. |

## 4. Docker Compose Encontrado

| Caminho | Servicos | Portas | Volumes | Segredos presentes |
|---|---|---|---|---|
| `C:\Users\User\1chat.digital\docker-compose.yml` | `waha` | `3000:3000` | `./waha-data:/app/.sessions`, `./waha-files:/tmp/whatsapp-files` | Sim, `WAHA_API_KEY=***`, `WAHA_DASHBOARD_USERNAME=***`, `WAHA_DASHBOARD_PASSWORD=***`, `WHATSAPP_SWAGGER_USERNAME=***`, `WHATSAPP_SWAGGER_PASSWORD=***` |

Nao foi encontrado `docker-compose.yml` na copia de `C:\tmp\1chat-prod-main-20260618183445`.

## 5. `package.json` Encontrados

| Caminho | Nome | Scripts npm | Dependencias principais |
|---|---|---|---|
| `C:\Users\User\1chat.digital\bot\package.json` | `1chat-bot` | `start: node index.js` | `@google/generative-ai`, `axios`, `express`, `pg`, `xlsx` |
| `C:\tmp\1chat-prod-main-20260618183445\bot\package.json` | `1chat-bot` | `start: node index.js` | `@google/generative-ai`, `@supabase/supabase-js`, `axios`, `connect-pg-simple`, `express`, `express-session`, `multer`, `pg`, `ws`, `xlsx` |

## 6. Portas Utilizadas

| Porta | Origem | Uso |
|---:|---|---|
| `3000` | `bot/index.js`, `bot/Dockerfile`, `docker-compose.yml`, container `1chat-waha` | Bot Express usa `PORT` ou `3000`; WAHA tambem esta publicado em `3000:3000` no Docker Compose atual. Ha conflito potencial se bot e WAHA rodarem localmente juntos na mesma porta. |
| `3001` | `bot/index.js`, `bot/README.md` | URL padrao esperada para WAHA pelo bot: `http://localhost:3001`. |
| `5432` | implicita por PostgreSQL/`DATABASE_URL` | Nao ha porta local PostgreSQL aberta encontrada na auditoria; banco so aparece como suporte por variavel. |

Portas em escuta observadas relevantes:

| Porta | Processo observado | Observacao |
|---:|---|---|
| `3000` | Docker/WSL relay | Container `1chat-waha` publicado em `0.0.0.0:3000->3000/tcp`. |

## 7. URLs Encontradas

| URL | Origem | Uso |
|---|---|---|
| `1chat.digital` | `CNAME` | Dominio publico do site. |
| `http://localhost:3000/health` | `bot/README.md` | Healthcheck local do bot. |
| `http://localhost:3000/admin` | `bot/README.md` | Painel admin local. |
| `http://localhost:3000/webhook` | `bot/README.md` | Webhook local esperado para WAHA. |
| `http://localhost:3001` | `bot/index.js`, `bot/README.md` | WAHA local esperado pelo bot. |
| `https://sua-url-publica-do-waha` | `bot/README.md` | Placeholder de WAHA em producao/Railway. |
| `https://railway.app/railway.schema.json` | `bot/railway.json` | Schema do Railway. |
| `https://registry.npmjs.org/...` | `bot/package-lock.json` | Dependencias npm. |

## 8. Webhooks

| Webhook | Metodo | Arquivo | Observacao |
|---|---|---|---|
| `/webhook` | `POST` | `bot/index.js` | Recebe eventos WAHA. Processa apenas `event === "message"`, ignora mensagens proprias e grupos. |
| `http://localhost:3000/webhook` | configuracao recomendada | `bot/README.md` | URL local documentada para configurar no WAHA. |

## 9. Chaves, Tokens e Segredos Usados, Mascarados

| Chave/segredo | Onde aparece | Valor na resposta |
|---|---|---|
| `WAHA_API_KEY` | `docker-compose.yml`, `bot/index.js`, `bot/README.md`, container `1chat-waha` | `***` |
| `WAHA_DASHBOARD_USERNAME` | `docker-compose.yml`, container `1chat-waha` | `***` |
| `WAHA_DASHBOARD_PASSWORD` | `docker-compose.yml`, container `1chat-waha` | `***` |
| `WHATSAPP_SWAGGER_USERNAME` | `docker-compose.yml`, container `1chat-waha` | `***` |
| `WHATSAPP_SWAGGER_PASSWORD` | `docker-compose.yml`, container `1chat-waha` | `***` |
| `GEMINI_API_KEY` | `bot/ia.js` | `***`, valor real nao encontrado em `.env` |
| `DATABASE_URL` | `bot/index.js` | `***`, valor real nao encontrado em `.env` |
| `WAHA_URL` | `bot/index.js` | `***`, valor real nao encontrado em `.env` |
| `WAHA_BASE_URL` | `bot/index.js`, `bot/README.md` | `***`, valor real nao encontrado em `.env` |
| `WAHA_SESSION` | `bot/index.js`, `bot/README.md` | `***`, default documentado como `default` |
| `CORS_ORIGIN` | `bot/index.js` | `***`, opcional |

## 10. Scripts npm

| Projeto | Script | Comando |
|---|---|---|
| `C:\Users\User\1chat.digital\bot` | `start` | `node index.js` |
| `C:\tmp\1chat-prod-main-20260618183445\bot` | `start` | `node index.js` |

## 11. Servicos Docker

| Servico | Container | Imagem | Restart | Portas | Volumes |
|---|---|---|---|---|---|
| `waha` | `1chat-waha` | `devlikeapro/waha-plus:latest` | `unless-stopped` | `3000:3000` | `./waha-data:/app/.sessions`, `./waha-files:/tmp/whatsapp-files` |

## 12. Volumes Docker

| Volume/mount | Tipo | Origem | Destino | Observacao |
|---|---|---|---|---|
| `waha-data` | Volume Docker local | Docker volume local | Nao montado pelo compose atual | Existe em `docker volume ls`, mas o container atual usa bind mount. |
| `C:\Users\User\1chat.digital\waha-data` | Bind mount | host | `/app/.sessions` | Sessao WAHA real, critica para restore. |
| `C:\Users\User\1chat.digital\waha-files` | Bind mount | host | `/tmp/whatsapp-files` | Arquivos temporarios/midia WAHA. |

## 13. Containers em Execucao

| Container | Imagem | Status | Portas |
|---|---|---|---|
| `1chat-waha` | `devlikeapro/waha-plus:latest` | Em execucao | `0.0.0.0:3000->3000/tcp`, `[::]:3000->3000/tcp` |

Imagens Docker locais relevantes:

| Imagem | Tag | Tamanho |
|---|---|---:|
| `devlikeapro/waha-plus` | `latest` | 4.05 GB |
| `devlikeapro/waha` | `latest` | 4.05 GB |

## 14. Bancos Encontrados

| Banco | Evidencia | Estado |
|---|---|---|
| PostgreSQL | Dependencia `pg`, codigo usa `DATABASE_URL`, cria tabelas `atendimentos`, `fila`, `final_message_log` | Suportado, mas nenhuma `DATABASE_URL`, dump ou container PostgreSQL local foi encontrado. |
| Arquivos JSON locais | `bot/data/atendimentos.json`, `bot/data/fila.json`, `bot/data/config.json` | Ativo como fallback quando `DATABASE_URL` nao existe. |
| Excel | `bot/data/respostas.xlsx` | Base de respostas do bot. |

## 15. Arquivos SQL

Nenhum arquivo `.sql` ou `.dump` encontrado nas copias auditadas.

## 16. Arquivos Excel Utilizados

| Caminho | Tamanho | Ultima modificacao | Uso |
|---|---:|---:|---|
| `C:\Users\User\1chat.digital\bot\data\respostas.xlsx` | 18 KB | 2026-06-11 12:46:44 | Base de respostas/gatilhos do bot. |
| `C:\tmp\1chat-prod-main-20260618183445\bot\data\respostas.xlsx` | 15 KB | 2026-06-18 18:34:45 | Copia temporaria da base de respostas. |

## 17. Arquivos de Configuracao

| Caminho | Uso |
|---|---|
| `docker-compose.yml` | Sobe WAHA local. |
| `bot\Dockerfile` | Build do bot Node.js. |
| `bot\railway.json` | Deploy Railway com healthcheck `/health`. |
| `bot\.dockerignore` | Excludes do build Docker. |
| `bot\.gitignore` | Ignora `node_modules`, `.env`, logs e sessoes dentro de `bot/`. |
| `bot\data\config.json` | Configuracao operacional do bot/mensagem final. |
| `CNAME` | Dominio `1chat.digital`. |

## 18. Certificados

Nenhum arquivo `*.pem`, `*.crt`, `*.key`, `*.pfx`, `*.cer` ou `*.cert` encontrado fora de `.git`/`node_modules`.

## 19. Tokens

Tokens/credenciais reais observados apenas em configuracao WAHA local e container Docker, mascarados neste documento:

- `WAHA_API_KEY=***`
- `WAHA_DASHBOARD_USERNAME=***`
- `WAHA_DASHBOARD_PASSWORD=***`
- `WHATSAPP_SWAGGER_USERNAME=***`
- `WHATSAPP_SWAGGER_PASSWORD=***`

Tokens esperados mas sem valor real encontrado:

- `GEMINI_API_KEY=***`
- `DATABASE_URL=***`
- `WAHA_URL=***`
- `WAHA_BASE_URL=***`
- `WAHA_SESSION=***`
- `CORS_ORIGIN=***`

## 20. Segredos Nao Protegidos Pelo `.gitignore`

| Item | Caminho | Protegido? | Risco |
|---|---|---|---|
| Credenciais WAHA em compose | `C:\Users\User\1chat.digital\docker-compose.yml` | Nao. Arquivo aparece como `?? docker-compose.yml` no `git status`; nao esta ignorado. | Alto: commit acidental exporia `WAHA_API_KEY`, usuario/senha dashboard e Swagger. |
| Sessao WAHA | `C:\Users\User\1chat.digital\waha-data\` | Nao. Aparece como `?? waha-data/` no `git status`; nao esta ignorado na raiz. | Alto: pode conter sessao WhatsApp e dados de navegador. |
| Arquivos WAHA | `C:\Users\User\1chat.digital\waha-files\` | Nao apareceu no `git status` resumido, mas tambem nao ha `.gitignore` raiz protegendo. | Medio/alto: pode conter midia/arquivos temporarios. |
| Arquivos auxiliares e patches | `*.txt`, `*.patch`, `*.ps1` na raiz | Nao. Varios aparecem como `??`. | Medio: podem conter trechos antigos, conflitos ou dados operacionais. |
| `bot/bot.rar` | `C:\Users\User\1chat.digital\bot\bot.rar` | Nao. Aparece como `?? bot/bot.rar`. | Medio/alto: arquivo compactado nao auditado; pode conter segredos/codigo antigo. |

Observacao: `bot\.gitignore` protege somente dentro da pasta `bot/`. Nao ha evidencia de `.gitignore` raiz protegendo `docker-compose.yml`, `waha-data/`, `waha-files/`, `*.zip`, `*.rar`, `*.sql`, `*.dump` ou backups.

## 21. Tudo Que Impede Recuperacao Completa

- Nao ha `.env` real encontrado com `GEMINI_API_KEY`, `DATABASE_URL`, URL publica de WAHA ou variaveis de producao.
- `docker-compose.yml` sobe somente WAHA; nao sobe bot nem PostgreSQL.
- Bot espera WAHA em `http://localhost:3001`, mas o compose publica WAHA em `3000:3000`; isso precisa ser reconciliado em restore.
- O container `1chat-waha` usa bind mount para `C:\Users\User\1chat.digital\waha-data`; se essa pasta nao for salva, a sessao WhatsApp pode ser perdida.
- Existe volume Docker local chamado `waha-data`, mas o container atual usa bind mount; falta documentar se o volume e legado ou ainda necessario.
- Nao ha dump PostgreSQL nem evidencia de banco local ativo.
- Nao ha documentacao da URL publica/tunel atual para WAHA.
- Nao ha documentacao do provedor/variaveis reais do Railway.
- Nao ha backup validado de `bot/data/` e `waha-data/`.
- Ha duas copias de codigo com diferencas relevantes: principal local mais antiga e worktree temporaria mais nova/modularizada em `C:\tmp`.
