# Project Memory - 1chat.digital

Este arquivo guarda regras fortes do projeto. Leia antes de mexer em qualquer coisa.

## Regras obrigatorias

- Nunca subir `waha-data/` para Git.
- Nunca versionar credenciais reais.
- Nunca versionar `.env`.
- Nunca publicar dumps, backups, zips ou arquivos com sessao.
- Nunca trocar WAHA sem motivo tecnico forte e sem decisao do dono.
- Sempre documentar mudancas importantes.
- Sempre testar backup e restauracao quando mexer em persistencia.
- Manter atendimento humano funcional.
- Nao quebrar fluxo atual para criar recurso novo.
- Nao priorizar redesign antes de estabilidade.
- Nao sugerir API oficial da Meta como primeira resposta.

## Regras de trabalho para IA/desenvolvedor

- Antes de editar, ler a documentacao em `docs/`.
- Antes de mexer em Docker, entender `docker-compose.yml`, portas e volumes.
- Antes de mexer em WAHA, verificar se `waha-data/` esta protegido e com backup.
- Antes de mexer no bot, entender coleta de nome, CPF e plataforma.
- Antes de mexer na fila, garantir que o botao Encerrar continue funcionando.
- Antes de mexer em banco, confirmar se ambiente usa PostgreSQL ou arquivos JSON.

## Dados que nao podem ser perdidos

- Sessao WhatsApp em `waha-data/`.
- Planilha `bot/data/respostas.xlsx`.
- Configuracao `bot/data/config.json`.
- Fila/atendimentos, em PostgreSQL ou JSON.
- Variaveis reais de ambiente.
- Configuracao do tunnel, se houver.

## Decisoes que nao devem ser reabertas sem motivo

- Uso de WAHA.
- Operacao local nesta fase.
- Atendimento passivo.
- Painel admin proprio.
- Foco em estabilidade e recuperacao.

## Prioridade atual

1. Estabilidade.
2. Backup automatico.
3. Restore testado.
4. Protecao contra segredos no Git.
5. Correcao de bugs.
6. Melhorias pequenas no fluxo.
7. Somente depois, novas features maiores.
