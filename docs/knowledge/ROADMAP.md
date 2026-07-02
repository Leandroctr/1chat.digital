# Roadmap - 1chat.digital

## Confirmado por inspeção do código em origin/main

- Bot Express modularizado.
- Painel admin.
- Login admin.
- Webhook WAHA.
- Respostas por planilha.
- Atendimento humano.
- Configuracao de mensagem final.
- Metricas por gatilhos.
- Fluxo deterministico de recuperacao de senha.
- Suporte a PostgreSQL.
- Suporte a Supabase Storage.
- Healthcheck em produção pública.

## Prioridade imediata

1. Documentacao alinhada a `origin/main`.
2. Protecao de arquivos sensiveis via `.gitignore`.
3. Templates publicos sem credenciais reais.
4. Validacao posterior de backup e restore.

## Pendente de validação

- WAHA.
- Docker.
- Cloudflare Tunnel.
- PostgreSQL real.
- Backups.
- Restore funcional.
- Variaveis reais.
- Teste final do fluxo de recuperacao de senha no WhatsApp/painel.

## Melhorias futuras

- Corrigir encoding/mojibake.
- Criar rotina comprovada de backup.
- Testar restore em ambiente separado.
- Melhorar observabilidade de WAHA e banco.

## Implementado, pendente de validacao final

- Fluxo de recuperacao de senha nos commits `6bbaceb`, `6b6ec6e` e `ad9d717`.
- Validar pelo canal real do WhatsApp.
- Conferir no painel o novo texto e o contexto de recuperacao de senha/troca de telefone.

## Fora de escopo agora

- Alterar WAHA.
- Alterar Docker.
- Alterar Cloudflare.
- Alterar banco.
- Alterar portas.
- Alterar `bot/data/respostas.xlsx`.
- Executar backup ou restore.
