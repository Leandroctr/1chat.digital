# Known Bugs and Risks - 1chat.digital

## BUG-001 - Divergencia de porta entre bot e Docker Compose

Status: aberto.

Impacto: o fallback local do bot ainda aponta para `http://localhost:3001`, mas o WAHA real no PC local esta em `http://localhost:3000` e e exposto para producao por `https://waha.1chat.digital`.

Risco: execucao local/dev do bot sem `WAHA_URL`/`WAHA_BASE_URL` pode tentar acessar a porta legada `3001`. Em producao Railway, o risco e baixo se `WAHA_URL` ou `WAHA_BASE_URL` estiver configurado como `https://waha.1chat.digital`.

Evidencia: `bot/index.js` usa `WAHA_URL || WAHA_BASE_URL || "http://localhost:3001"`; `docker-compose.yml` usa `"3000:3000"`; Cloudflare Tunnel aponta `waha.1chat.digital` para `http://localhost:3000`.

Arquivos relacionados: `bot/index.js`, `bot/README.md`, `.env.example`, `docker-compose.yml`, `C:\Users\User\.cloudflared\config.yml`, `.bat` de Startup do Windows.

Como reproduzir: iniciar WAHA pelo compose atual e iniciar bot sem `WAHA_URL`; o bot tentara acessar WAHA em `localhost:3001`.

Como corrigir: manter Docker/WAHA em `localhost:3000`; definir `WAHA_URL`/`WAHA_BASE_URL` explicitamente no ambiente. Para Railway, usar `https://waha.1chat.digital`. Para execucao local no PC, usar `http://localhost:3000`. Tratar `localhost:3001` como legado ate decidir se o fallback do codigo sera ajustado.

Atencao: qualquer correcao que altere Docker, WAHA, porta, Cloudflare ou inicializacao deve revisar `docs/runbooks/STARTUP.md`, porque o reboot do PC depende do `.bat` de Startup.

Prioridade: alta.

## BUG-002 - Credenciais WAHA em `docker-compose.yml`

Status: aberto.

Impacto: API key, usuario e senha do dashboard/Swagger ficam em texto claro.

Risco: commit acidental expor credenciais.

Evidencia: `docker-compose.yml` contem variaveis WAHA sensiveis.

Arquivos relacionados: `docker-compose.yml`.

Como reproduzir: abrir `docker-compose.yml`.

Como corrigir: mover valores para `.env` privado e deixar compose usando interpolacao; ou garantir que compose privado nao seja commitado.

Prioridade: alta.

## BUG-003 - `waha-data/` fora do `.gitignore` raiz

Status: aberto.

Impacto: a sessao WhatsApp pode aparecer como arquivo nao versionado e ser commitada por engano.

Risco: vazamento de sessao WhatsApp e dados locais do navegador.

Evidencia: `git status` na instalacao real mostra `?? waha-data/`.

Arquivos relacionados: `.gitignore` raiz ausente/insuficiente, `waha-data/`.

Como reproduzir: rodar `git status --short` em `C:\Users\User\1chat.digital`.

Como corrigir: adicionar `waha-data/`, `waha-files/`, backups e dumps ao `.gitignore` da raiz do projeto real.

Prioridade: alta.

## BUG-004 - Ausencia de dump PostgreSQL

Status: aberto.

Impacto: se producao usa PostgreSQL, os dados nao podem ser restaurados sem dump.

Risco: perda de fila, historico e estados de atendimento.

Evidencia: nenhum `.sql` ou `.dump` encontrado; codigo usa PostgreSQL somente se `DATABASE_URL` existir.

Arquivos relacionados: `bot/index.js`, rotina de backup futura.

Como reproduzir: procurar por `*.sql` e `*.dump` nas copias locais.

Como corrigir: confirmar uso real de PostgreSQL e criar rotina `pg_dump`.

Prioridade: alta.

## BUG-005 - Ausencia de `.env` real documentado

Status: aberto.

Impacto: outro computador nao consegue reconstruir ambiente completo sem recuperar chaves de outro local.

Risco: bot subir sem IA, sem banco ou sem URL correta do WAHA.

Evidencia: nenhum `.env`, `*.env` ou `.env.*` encontrado nas copias auditadas.

Arquivos relacionados: `bot/index.js`, `bot/ia.js`, documentacao privada de segredos.

Como reproduzir: procurar arquivos `.env` nas copias.

Como corrigir: criar arquivo privado com valores reais e template publico sem segredos.

Prioridade: alta.

## BUG-006 - Copia temporaria em `C:\tmp`

Status: aberto.

Impacto: ha duas copias com diferencas relevantes.

Risco: restaurar codigo antigo ou perder alteracoes mais novas.

Evidencia: `C:\Users\User\1chat.digital` e `C:\tmp\1chat-prod-main-20260618183445` contem versoes diferentes do bot.

Arquivos relacionados: ambas as arvores.

Como reproduzir: comparar `bot/package.json`, `bot/index.js` e `bot/src/`.

Como corrigir: decidir fonte oficial e consolidar diferencas em branch controlada.

Prioridade: alta.

## BUG-007 - Risco de perda do SSD local

Status: aberto.

Impacto: perda do projeto, sessao WAHA, planilha e dados locais.

Risco: parada total do atendimento.

Evidencia: instalacao operacional esta em disco local; `waha-data` e `bot/data` sao criticos.

Arquivos relacionados: `waha-data/`, `bot/data/`, docs de disaster recovery.

Como reproduzir: nao aplicavel; risco operacional.

Como corrigir: backup automatico externo e restore testado.

Prioridade: alta.

## BUG-008 - Backup automatico ainda nao validado em producao

Status: aberto.

Impacto: existe script/documentacao, mas falta confirmar execucao real recorrente.

Risco: falsa sensacao de seguranca.

Evidencia: documentacao criada; nao ha evidencia de tarefa agendada.

Arquivos relacionados: `scripts/backup/backup-1chat.ps1`.

Como reproduzir: verificar Agendador de Tarefas/rotina de backup.

Como corrigir: agendar backup, validar arquivo gerado e guardar fora do SSD.

Prioridade: alta.

## BUG-009 - Restore ainda nao testado

Status: aberto.

Impacto: backups podem nao restaurar sistema funcional.

Risco: descobrir falha somente em desastre real.

Evidencia: nao ha registro de restore completo testado.

Arquivos relacionados: `docs/disaster-recovery/RESTORE-CHECKLIST.md`.

Como reproduzir: tentar restaurar em pasta/maquina limpa.

Como corrigir: executar restore de teste e registrar resultado.

Prioridade: alta.

## BUG-010 - WAHA pode desconectar

Status: monitorar.

Impacto: atendimento WhatsApp para.

Risco: perda de mensagens ou demora no atendimento.

Evidencia: WAHA depende de sessao WebJS e persistencia local.

Arquivos relacionados: `docker-compose.yml`, `waha-data/`.

Como reproduzir: reiniciar container/PC ou perder sessao WhatsApp.

Como corrigir: monitorar status, manter volume, documentar reconexao por QR Code.

Prioridade: alta.

## BUG-011 - Risco de perda de sessao WhatsApp

Status: aberto.

Impacto: necessidade de reconectar WhatsApp via QR Code.

Risco: parada operacional se o responsavel nao estiver disponivel.

Evidencia: sessao fica em `waha-data/webjs/.../session-*`.

Arquivos relacionados: `waha-data/`.

Como reproduzir: subir WAHA sem volume/sessao persistida.

Como corrigir: backup de `waha-data`, compose com volume correto e procedimento de reconexao.

Prioridade: alta.

## BUG-012 - Risco com service workers/push/cache do WAHA

Status: monitorar.

Impacto: sessoes WebJS podem acumular cache/service workers antigos.

Risco: comportamento estranho do WhatsApp Web apos atualizacoes ou conflitos de sessao.

Evidencia: `waha-data` contem caches, service workers e IndexedDB de `web.whatsapp.com` para sessoes `default` e `JANDIRA`.

Arquivos relacionados: `waha-data/webjs/...`.

Como reproduzir: dificil reproduzir; observar instabilidade apos updates do WhatsApp Web/WAHA.

Como corrigir: antes de limpar qualquer cache, fazer backup; preferir procedimento oficial WAHA ou recriar sessao com plano de rollback.

Prioridade: media.

## BUG-013 - Mojibake/encoding em textos do bot

Status: aberto.

Impacto: mensagens ao cliente podem aparecer com caracteres quebrados.

Risco: atendimento parecer pouco profissional.

Evidencia: arquivos da instalacao principal exibem trechos como `OlÃƒÂ¡`, `NÃƒÂ£o`, `Ã¢Å“â€¦`.

Arquivos relacionados: `bot/index.js`, `bot/ia.js`, `bot/public/app.js`.

Como reproduzir: abrir arquivos ou disparar fluxo de CPF/nome.

Como corrigir: corrigir encoding com cuidado, testar mensagens e evitar alterar logica junto da correcao.

Prioridade: media.

## BUG-014 - `docker run --rm` perde sessao se usado sem volume

Status: aprendizado/risco.

Impacto: sessao WhatsApp some ao remover container.

Risco: queda operacional e necessidade de novo QR Code.

Evidencia: decisao registrada pelo dono; WAHA precisa persistencia em volume/pasta.

Arquivos relacionados: `docker-compose.yml`, `waha-data/`.

Como reproduzir: rodar WAHA descartavel sem volume e remover container.

Como corrigir: usar Docker Compose com `waha-data` persistente.

Prioridade: alta.
