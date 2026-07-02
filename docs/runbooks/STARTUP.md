# Runbook Startup - 1chat.digital

## Resumo

O Windows Startup possui um arquivo `.bat` critico para religar a producao local quando o PC reinicia.

Caminho:

`C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\iniciar-1chat-producao.bat`

## O que ele inicia

- Docker Desktop.
- `docker compose up -d` na instalacao real do projeto.
- Cloudflare Tunnel para expor o WAHA publicamente.

## O que ele nao inicia

- Bot Node.
- `npm`.
- `node index.js`.

O bot Node de producao roda no Railway, nao no PC local.

## Dependencias

- Instalacao real: `C:\Users\User\1chat.digital`.
- `docker-compose.yml` real privado.
- `.env` privado.
- `waha-data/`.
- `waha-files/`.
- Configuracao Cloudflare: `C:\Users\User\.cloudflared\config.yml`.
- Tunnel Cloudflare: `1chat-waha`.

## Arquitetura relacionada

- WAHA local roda em `http://localhost:3000`.
- Cloudflare expoe o WAHA em `https://waha.1chat.digital`.
- Railway deve acessar WAHA pela URL publica `https://waha.1chat.digital`.

## Regras de mudanca

Qualquer mudanca em Docker, WAHA, porta, Cloudflare Tunnel, caminho do projeto ou inicializacao deve revisar este `.bat`.

Antes de alterar esse fluxo, verificar:

1. `docker-compose.yml` real privado.
2. `.env` privado.
3. `C:\Users\User\.cloudflared\config.yml`.
4. Porta local do WAHA.
5. URL publica usada pelo Railway.
6. Persistencia em `waha-data/` e `waha-files/`.

## Riscos

- Reboot pode subir uma configuracao quebrada se `docker-compose.yml` ou `.env` estiverem errados.
- Trocar porta sem revisar Cloudflare pode derrubar o acesso publico ao WAHA.
- Mudar a pasta do projeto quebra o `.bat`.
- O bot Node nao sera religado por esse `.bat`, pois roda no Railway.
- Se `waha-data/` ou `waha-files/` estiverem ausentes, WAHA pode perder sessao ou arquivos.

## Documentos relacionados

- `docs/runbooks/WAHA.md`
- `docs/standards/PORTS.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/knowledge/KNOWN-BUGS.md`
