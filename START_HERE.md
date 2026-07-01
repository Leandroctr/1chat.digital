# START HERE - 1chat.digital

Este e o primeiro arquivo que qualquer IA ou desenvolvedor deve ler antes de alterar o projeto.

O objetivo deste protocolo e preservar continuidade, contexto e funcionamento atual. Nao reinvente o projeto antes de entender as decisoes existentes.

## Ordem obrigatoria de leitura

1. `START_HERE.md`
2. `docs/AI_CONTEXT.md`
3. `docs/ai/AI_RULES.md`
4. `docs/ai/CURRENT_STATUS.md`
5. `docs/knowledge/PROJECT_MEMORY.md`

## Depois, conforme a tarefa

- WAHA: `docs/runbooks/WAHA.md`
- Banco/PostgreSQL: `docs/runbooks/POSTGRES.md` ou `docs/architecture/DATABASE.md`
- Atendimento humano: `docs/runbooks/HUMAN-SUPPORT.md`
- Backup/restore: `docs/disaster-recovery/`
- Bugs: `docs/knowledge/KNOWN-BUGS.md`
- Decisoes: `docs/knowledge/DECISIONS.md`

## Regras antes de qualquer mudanca

- Nao alterar codigo funcional sem entender o fluxo atual.
- Nao trocar WAHA sem motivo tecnico forte.
- Nao mexer em Docker, portas, banco, sessoes ou filas sem verificar impacto.
- Nao versionar credenciais, `.env`, backups, dumps ou `waha-data`.
- Documentar mudancas relevantes.
- Para mudancas de risco medio ou alto, listar impacto e rollback antes de aplicar.

## Prioridade do projeto

1. Estabilidade.
2. Backup.
3. Documentacao viva.
4. Correcao de bugs.
5. Novas funcionalidades somente depois.
