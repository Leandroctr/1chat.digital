# AI Context - 1chat.digital

Antes de alterar qualquer codigo, leia `START_HERE.md` e siga a ordem de leitura obrigatoria.

Leia este arquivo antes de sugerir ou fazer qualquer mudanca no projeto.

## Contexto do projeto

1chat.digital e um sistema de atendimento passivo via WhatsApp. Ele usa WAHA para conectar ao WhatsApp, um bot Node.js/Express para processar mensagens, planilha Excel para respostas e painel admin proprio para fila humana.

O projeto esta em MVP/producao inicial. A prioridade atual e estabilidade, documentacao, backup, restore e correcao de bugs.

## Decisoes do dono

- WAHA foi escolhido estrategicamente.
- Hospedagem local foi escolhida por controle operacional.
- API oficial da Meta nao deve ser sugerida agora sem motivo muito forte.
- Baileys foi abandonado apos instabilidade/erro 405.
- Atendimento e passivo, nao disparo em massa.
- Nao trocar stack sem esgotar estabilidade da atual.

## Tecnologias atuais

- Node.js/Express.
- WAHA via Docker/Docker Compose.
- WhatsApp WebJS com sessao em `waha-data`.
- Excel (`bot/data/respostas.xlsx`) para respostas.
- PostgreSQL opcional via `DATABASE_URL`.
- JSON local em `bot/data/` como fallback.
- Google Gemini opcional via `GEMINI_API_KEY`.
- Painel admin proprio.

## O que nao sugerir sem necessidade

- Trocar WAHA.
- Migrar para API oficial da Meta.
- Reescrever backend.
- Trocar banco.
- Redesign grande do painel.
- IA avancada antes de estabilidade.
- Refatoracao grande sem bug claro.

## Prioridades

1. Preservar funcionamento atual.
2. Proteger segredos e `waha-data`.
3. Corrigir divergencia de porta WAHA/bot.
4. Criar backup automatico e restore testado.
5. Documentar variaveis reais em arquivo privado.
6. Confirmar PostgreSQL e dumps.
7. Consolidar copias do projeto.

## Riscos urgentes

- `docker-compose.yml` da instalacao real contem credenciais WAHA.
- `waha-data/` aparece fora do `.gitignore` raiz da instalacao real.
- Nao ha `.env` real encontrado.
- Nao ha dump PostgreSQL encontrado.
- WAHA e bot podem conflitar na porta `3000`.
- O bot espera WAHA em `localhost:3001`, mas o compose publica WAHA em `3000`.
- Existe copia temporaria em `C:\tmp` com codigo diferente.
- Perda do SSD local pode derrubar o atendimento e perder sessao.

## Bugs conhecidos

Ver:

- `docs/knowledge/KNOWN-BUGS.md`
- `docs/disaster-recovery/PROJECT-INVENTORY.md`
- `docs/disaster-recovery/RECOVERY-GAPS.md`

## Estilo de trabalho esperado

- Ler antes de editar.
- Fazer mudancas pequenas e verificaveis.
- Nao alterar funcionamento sem necessidade.
- Documentar decisoes e riscos.
- Preservar atendimento humano.
- Preservar fluxo nome -> CPF -> plataforma -> resposta/fila.
- Nunca expor segredo em resposta publica.
- Nunca versionar `waha-data`, `.env`, dumps ou backups.

## Obrigacao principal

Preservar o funcionamento atual antes de refatorar.

Se uma mudanca aumenta risco operacional, primeiro documente, proponha plano de rollback e valide com o dono.
