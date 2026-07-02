# Checklist de Backup - 1chat.digital

## Classificacao

Pendente de validação:

- Este checklist e plano de validacao.
- Ele nao confirma que o backup existe.

## Antes do backup

- Confirmar escopo.
- Confirmar destino.
- Confirmar se WAHA pode continuar rodando.
- Confirmar se PostgreSQL esta ativo.
- Confirmar se havera `pg_dump`.
- Confirmar se dados privados ficarao fora do Git.

## Itens versionados

- Codigo fonte.
- Documentacao.
- `bot/package.json`.
- `bot/package-lock.json`.
- `bot/Dockerfile`.
- `bot/railway.json`.

## Itens de dados

- `bot/data/respostas.xlsx`.
- `bot/data/config.json`.
- `bot/data/fila.json`.
- `bot/data/atendimentos.json`.
- `bot/data/final-message-log.json`, se existir.

## Itens privados

- `.env`.
- Segredos.
- Configuracao real de WAHA.
- Sessao WAHA.
- Dump PostgreSQL.
- Configuracao real de tunel.

## Depois do backup

- Gerar inventario.
- Registrar data e origem.
- Registrar avisos.
- Testar restore estrutural em local separado.
- Planejar restore funcional em janela aprovada.
