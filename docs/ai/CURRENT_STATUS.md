# Current Status - 1chat.digital

## Estado atual

- Projeto: 1chat.digital
- Instalacao real: `C:\Users\User\1chat.digital`
- Objetivo: chatbot WhatsApp com WAHA + Node/Express + PostgreSQL + painel admin.
- WAHA: decisao estrategica, manter.
- Hospedagem: bot Node em producao no Railway; WAHA em Docker no PC local por decisao do dono.
- Estado geral: MVP/producao inicial.

## Funcionando

- Fluxo WhatsApp.
- Coleta de dados.
- Respostas por planilha.
- Atendimento humano.
- Fila no painel.
- Encerramento de atendimento.
- Persistencia WAHA local em `waha-data`.
- Cloudflare Tunnel expondo WAHA em `https://waha.1chat.digital`.

## Pontos criticos atuais

- Estabilidade do PC/SSD em investigacao.
- Backup externo ainda precisa ser implementado.
- Arquitetura confirmada: Railway deve acessar WAHA por `https://waha.1chat.digital`; PC local usa WAHA em `http://localhost:3000`.
- `localhost:3001` e referencia antiga/legada e nao deve ser usado como padrao atual.
- Credenciais no `docker-compose.yml` precisam ser migradas futuramente para `.env`.
- `waha-data` precisa estar protegido contra commit.
- Dump PostgreSQL ainda nao documentado/testado.

## Prioridade atual

1. Estabilidade.
2. Backup.
3. Documentacao viva.
4. Correcao de bugs.
5. Novas funcionalidades so depois.

## Instalacoes relevantes

- Principal: `C:\Users\User\1chat.digital`
- Copia temporaria: `C:\tmp\1chat-prod-main-20260618183445`
- Workspace onde a documentacao foi inicialmente criada: `C:\Users\User\Documents\1chat digital`

## Atencao

Nao assumir que a copia temporaria e a fonte oficial sem comparacao. A instalacao principal operacional e a que possui `waha-data`, `waha-files`, `.git`, `docker-compose.yml` e container WAHA apontando para ela.
