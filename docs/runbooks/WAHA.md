# Runbook WAHA - 1chat.digital

## Resumo

WAHA e o componente que conecta o WhatsApp ao bot. E decisao estrategica do dono do projeto manter WAHA neste momento.

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

## O que verificar

- Container `1chat-waha` esta em execucao.
- `waha-data` esta sendo atualizado.
- Porta publicada confere com `WAHA_URL`.
- API key do bot confere com API key do WAHA.
- Webhook aponta para o bot correto.

## Pendencias

- PENDENTE DE CONFIRMACAO: URL publica/tunnel atual do WAHA.
- PENDENTE DE CONFIRMACAO: porta final padronizada.
- PENDENTE DE CONFIRMACAO: se volume Docker `waha-data` e legado ou ainda usado.

## Documentos relacionados

- `docs/knowledge/DECISIONS.md`
- `docs/knowledge/KNOWN-BUGS.md`
- `docs/standards/PORTS.md`
- `docs/disaster-recovery/PROJECT-INVENTORY.md`
