# Lessons Learned - 1chat.digital

## Docker descartavel perde sessao

Rodar WAHA com `docker run --rm` ou sem volume persistente pode causar perda da sessao WhatsApp.

Aprendizado:

- WAHA precisa de volume/pasta persistente.
- `waha-data` e parte critica do sistema.

## API key e credenciais precisam persistir

Credenciais mudando ou sendo esquecidas quebram a comunicacao entre bot e WAHA.

Aprendizado:

- Valores reais devem ficar em `.env` privado ou cofre.
- Template publico deve ter apenas valores mascarados.

## Baileys nao foi confiavel neste contexto

Baileys apresentou instabilidade/erro 405 e foi abandonado.

Aprendizado:

- Nao reabrir troca de biblioteca WhatsApp sem motivo tecnico forte.
- O foco agora e estabilizar WAHA.

## WAHA precisa de backup real

WAHA funciona bem para o objetivo atual, mas depende da sessao local.

Aprendizado:

- Backup de codigo sem `waha-data` nao recupera tudo.
- Backup de `waha-data` sem teste de restore tambem nao garante operacao.

## Backup sem restore testado nao e garantia

Ter arquivo de backup nao prova que o sistema volta.

Aprendizado:

- Deve haver restore testado em pasta ou maquina limpa.
- O teste deve validar bot, WAHA, painel, planilha e banco.

## Documentacao precisa estar dentro do projeto

Conhecimento solto em chat se perde.

Aprendizado:

- Decisoes, bugs, operacao e disaster recovery devem ficar em `docs/`.
- Toda mudanca operacional importante deve atualizar documentacao.

## MVP precisa de estabilidade antes de evolucao

O projeto ja atende uma necessidade real.

Aprendizado:

- Evitar overengineering.
- Corrigir riscos antes de criar features.
- Preservar atendimento humano e fluxo atual.
