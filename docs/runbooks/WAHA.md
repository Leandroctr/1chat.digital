# Runbook WAHA - 1chat.digital

## Resumo

WAHA e o componente que conecta o WhatsApp ao bot. E decisao estrategica do dono do projeto manter WAHA neste momento.

Arquitetura operacional atual:

- O bot Node de producao roda no Railway.
- O Railway deve acessar o WAHA por `https://waha.1chat.digital`.
- O WAHA roda no PC local via Docker em `http://localhost:3000`.
- O PC local usa Cloudflare Tunnel para expor o WAHA publicamente.
- O `.bat` de Startup do Windows inicia Docker/WAHA e Cloudflare Tunnel no reboot.
- `http://localhost:3001` e referencia antiga/legada e nao deve ser usado como padrao atual.

Instalacao real:

`C:\Users\User\1chat.digital`

Container conhecido:

`1chat-waha`

Imagem conhecida:

`devlikeapro/waha-plus:latest`

## Comandos conhecidos

Subir pelo compose:

```powershell
cd C:\Users\User\1chat.digital
docker compose up -d
```

Ver container:

```powershell
docker ps
```

Logs:

```powershell
docker logs 1chat-waha
```

Inspecionar configuracao:

```powershell
docker inspect 1chat-waha
```

## Persistencia

Pasta critica:

`C:\Users\User\1chat.digital\waha-data`

Arquivos/midia:

`C:\Users\User\1chat.digital\waha-files`

## Riscos

- Perda de sessao WhatsApp se `waha-data` nao for salvo.
- Commit acidental de `waha-data`.
- Credenciais em `docker-compose.yml`.
- Divergencia de porta entre bot e WAHA.
- WAHA desconectar e exigir QR Code.
- Mudancas em Docker, WAHA, porta ou Cloudflare sem revisar o `.bat` de Startup.

## O que verificar

- Container `1chat-waha` esta em execucao.
- `waha-data` esta sendo atualizado.
- Porta publicada confere com `WAHA_URL`/`WAHA_BASE_URL`.
- Em producao Railway, `WAHA_URL` ou `WAHA_BASE_URL` aponta para `https://waha.1chat.digital`.
- No PC local, WAHA responde em `http://localhost:3000`.
- API key do bot confere com API key do WAHA.
- Webhook aponta para o bot correto.

## Pendencias

- PENDENTE DE CONFIRMACAO: variaveis reais no Railway devem apontar para `https://waha.1chat.digital`.
- PENDENTE DE CONFIRMACAO: se volume Docker `waha-data` e legado ou ainda usado.

## Documentos relacionados

- `docs/knowledge/DECISIONS.md`
- `docs/knowledge/KNOWN-BUGS.md`
- `docs/standards/PORTS.md`
- `docs/runbooks/STARTUP.md`
- `docs/disaster-recovery/PROJECT-INVENTORY.md`
