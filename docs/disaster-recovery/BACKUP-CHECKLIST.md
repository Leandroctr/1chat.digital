# Checklist de Backup - 1chat.digital

## Diario

- Confirmar que o bot responde em `/health`.
- Confirmar que o painel admin abre.
- Confirmar que WAHA aparece operacional.
- Rodar `scripts\backup\backup-1chat.ps1` e guardar o ZIP fora do SSD principal.
- Se usar PostgreSQL, gerar dump com `pg_dump` e guardar junto do backup.
- Confirmar que o backup contem `bot/data/respostas.xlsx`.
- Confirmar que o backup contem arquivos `.env` no armazenamento privado.

## Semanal

- Copiar backup para uma segunda midia ou nuvem privada.
- Testar abertura do ZIP.
- Conferir tamanho do backup e comparar com a semana anterior.
- Conferir se `waha-data` ou volume Docker equivalente esta sendo salvo.
- Exportar lista de containers, imagens e volumes Docker.
- Conferir se `SECRETS.private.md` esta atualizado e fora do Git.

## Mensal

- Fazer teste de restore em uma pasta temporaria.
- Validar login admin no ambiente restaurado.
- Validar leitura da planilha `respostas.xlsx`.
- Validar conexao com WAHA usando sessao restaurada.
- Validar restore do PostgreSQL, se aplicavel.
- Revisar variaveis de ambiente e rotacionar senhas/chaves quando necessario.

## Sempre antes de mudancas grandes

- Rodar backup completo.
- Salvar dump PostgreSQL, se aplicavel.
- Exportar ou copiar volume WAHA.
- Registrar versoes de Node, npm, Docker e imagem WAHA.
