# WAHA Status Panel

## Objetivo

Documentar o indicador de status WAHA no painel admin do `1chat.digital`.

## Separacao de responsabilidades

O painel separa dois conceitos:

- `systemStatus`: estado geral da integracao, Cloudflare Tunnel e API.
- `wahaSession`: estado da sessao WhatsApp `default`.

## systemStatus

`systemStatus` representa integracao geral, Cloudflare Tunnel e API.

Mapeamento visual:

- `operational` = Operando.
- `auth_error` = Atencao.
- `offline` = Offline.
- `unknown` = Indisponivel.

Esse status alimenta o card superior "Integracao". Ele nao deve mostrar `WORKING`, porque `WORKING` e status de sessao WAHA.

## wahaSession

`wahaSession` representa a sessao WhatsApp `default`.

Mapeamento visual:

- `WORKING` = Conectado.
- `SCAN_QR_CODE` = QR Code necessario.
- `STARTING` = Iniciando.
- `STOPPED` = Parado.
- `FAILED` = Erro.
- `UNKNOWN` = Indisponivel.

Esse status alimenta o card lateral "Status WhatsApp".

## Regras de seguranca

- `WAHA_API_KEY` nunca vai para o frontend.
- A consulta ao WAHA fica no backend.
- O painel recebe apenas status limpo.
- A resposta ao frontend nao deve conter API key, token, telefone completo, CPF ou mensagens reais.
- Nao existem botoes de start, restart, logout ou limpeza de sessao nesta etapa.
- A feature e somente leitura/observabilidade.

## Sessao correta

O projeto `1chat.digital` deve usar:

```text
WAHA_SESSION=<nome-da-sessao>
```

`JANDIRA` pertence a outro projeto e nao deve aparecer em runtime do `1chat.digital`.
