# Decisions - 1chat.digital

Este arquivo registra decisoes de projeto para evitar que outro desenvolvedor ou IA reabra discussoes ja decididas sem motivo tecnico forte.

## DEC-001 - Manter WAHA

Status: decidido.

O uso de WAHA foi escolha do dono do projeto.

Motivos:

- APIs oficiais/Meta nao se encaixam bem no tipo de atendimento do projeto.
- A Meta tem derrubado ou restringido conexoes/atendimentos por palavras e contextos, mesmo sem dinheiro envolvido.
- O atendimento do 1chat.digital e passivo, nao disparo ativo em massa.
- Neste momento, WAHA e uma decisao estrategica.

Orientacao:

- Nao sugerir troca de WAHA antes de esgotar estabilidade, Docker Compose, backup e operacao local.

## DEC-002 - Baileys foi abandonado

Status: decidido.

Baileys foi abandonado apos instabilidade e erro 405 no contexto do projeto.

Motivo:

- Nao entregou confiabilidade suficiente para o MVP em operacao.
- O foco atual e estabilidade, nao troca recorrente de biblioteca WhatsApp.

## DEC-003 - Hospedagem local

Status: decidido.

A hospedagem local foi escolha do dono do projeto.

Motivos:

- Controle operacional.
- Menor dependencia de terceiros.
- Projeto em fase MVP/producao inicial.
- WAHA local com persistencia e aceitavel neste estagio.

Possivel evolucao futura:

- Maquina dedicada no escritorio.
- Cloudflare Tunnel para expor endpoint com mais previsibilidade.

## DEC-004 - Docker Compose para WAHA

Status: decidido.

WAHA deve rodar por Docker Compose sempre que possivel.

Motivo:

- Facilita restart.
- Permite persistencia controlada.
- Evita perda de sessao causada por containers descartaveis.

## DEC-005 - Persistencia de `waha-data`

Status: decidido.

`waha-data` e ativo critico do projeto.

Motivo:

- Guarda a sessao WhatsApp.
- Sem essa pasta/volume, pode ser necessario ler QR Code novamente.
- Em perda de SSD, a sessao pode ser perdida se nao houver backup.

## DEC-006 - PostgreSQL suportado

Status: decidido.

O bot suporta PostgreSQL quando `DATABASE_URL` esta configurada.

Motivo:

- Persistencia mais robusta do que arquivos JSON.
- Melhor caminho para producao estavel.

Observacao:

- Se `DATABASE_URL` nao existir, o bot cai para arquivos locais em `bot/data/`.

## DEC-007 - Painel admin proprio

Status: decidido.

O projeto usa painel admin proprio para fila, configuracao e operacao.

Motivo:

- Operacao simples e direta.
- Menos dependencia de ferramentas externas.
- Fluxo adequado ao MVP.

## DEC-008 - Atendimento passivo

Status: decidido.

O sistema deve atender mensagens recebidas. Nao deve ser tratado como ferramenta de disparo ativo em massa.

## DEC-009 - Nao usar API oficial da Meta neste momento

Status: decidido.

Nao usar API oficial da Meta agora.

Motivo:

- Nao atende bem o contexto atual.
- Pode criar restricoes que atrapalham o tipo de atendimento desejado.

## DEC-010 - Nao trocar tecnologia sem esgotar a atual

Status: regra de trabalho.

Antes de sugerir troca de stack, esgotar:

- estabilidade do WAHA;
- Docker Compose;
- backup;
- restore;
- operacao local;
- logs;
- correcao de bugs conhecidos.
