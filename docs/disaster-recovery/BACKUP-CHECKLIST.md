# Checklist de Backup - 1chat.digital

## Diario

- Confirmar que o bot responde em `/health`.
- Confirmar que o painel admin abre.
- Confirmar que WAHA aparece operacional.
- Rodar `scripts\backup\backup-1chat.ps1`.
- Confirmar que o backup foi criado em `D:\1chat-backups\manual-quick-YYYY-MM-DD_HH-mm-ss\`.
- Confirmar que o backup contem `bot/data/respostas.xlsx`.
- Confirmar que o backup contem arquivos `.env` no armazenamento privado.
- Confirmar que o backup contem `docker-compose.yml` real privado.
- Confirmar que o backup contem `waha-data/` e `waha-files/`.
- Confirmar que `INVENTARIO.txt` foi criado.
- Se usar PostgreSQL, planejar dump com `pg_dump` em etapa aprovada.

## Semanal

- Copiar backup para uma segunda midia ou nuvem privada.
- Conferir tamanho do backup e comparar com a semana anterior.
- Conferir se `waha-data` ou volume Docker equivalente esta sendo salvo.
- Exportar lista de containers, imagens e volumes Docker.
- Conferir se `SECRETS.private.md` esta atualizado e fora do Git.
- Planejar backup consistente com janela de manutencao.

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

## Retencao sugerida

- Manter os ultimos 7 backups diarios em `D:\1chat-backups\`.
- Manter os ultimos 4 backups semanais.
- Guardar backups manuais antes de mudancas criticas.
- Copiar periodicamente para nuvem privada ou HD externo.
