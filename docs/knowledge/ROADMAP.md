# Roadmap - 1chat.digital

## Funcionando hoje

- WAHA local rodando em Docker.
- Container `1chat-waha` usando imagem `devlikeapro/waha-plus:latest`.
- Sessao WAHA persistida em `C:\Users\User\1chat.digital\waha-data`.
- Bot Node.js/Express em `bot/`.
- Webhook `POST /webhook`.
- Healthcheck `/health`.
- Painel admin proprio.
- Fila humana.
- Botao Encerrar.
- Coleta de nome, CPF e plataforma.
- Base de respostas em `bot/data/respostas.xlsx`.
- Suporte a PostgreSQL via `DATABASE_URL`.
- Fallback para arquivos JSON em `bot/data/`.

## Bugs e gaps urgentes

- Corrigir divergencia entre porta esperada pelo bot (`3001`) e porta publicada pelo WAHA (`3000`).
- Proteger `docker-compose.yml` ou mover credenciais para `.env` privado.
- Proteger `waha-data/` no `.gitignore` da raiz do projeto real.
- Criar rotina de backup automatico.
- Testar restore completo em outra pasta/maquina.
- Definir fonte oficial entre `C:\Users\User\1chat.digital` e `C:\tmp\1chat-prod-main-20260618183445`.
- Recuperar/documentar variaveis reais de ambiente.
- Confirmar se PostgreSQL esta em uso em producao.

## Melhorias proximas

- Criar `.env.template` sem segredos.
- Criar `docker-compose.yml` completo ou documentar claramente comandos separados para bot e WAHA.
- Fixar versao ou digest da imagem WAHA.
- Criar script de validacao pos-restore.
- Documentar configuracao de tunnel publico.
- Documentar DNS e provedor do dominio.
- Revisar logs e rotacao de logs.
- Garantir backup de `bot/data/` e `waha-data/`.

## Melhorias futuras

- Migrar para maquina dedicada no escritorio.
- Considerar Cloudflare Tunnel.
- Avaliar PostgreSQL como obrigatorio em producao.
- Melhorar painel admin sem redesenho disruptivo.
- Melhorar metricas operacionais.
- Melhorar IA apenas depois de estabilidade e backup.
- Criar testes automatizados dos fluxos principais.

## Fora de prioridade agora

- Trocar WAHA.
- Migrar para API oficial da Meta.
- Reescrever stack.
- Redesign grande do painel.
- IA avancada.
- Refatoracao extensa sem bug concreto.
