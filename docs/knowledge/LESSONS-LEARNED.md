# Lessons Learned - 1chat.digital

## Documentacao precisa partir da base correta

Licao confirmada pelo processo:

- A documentacao anterior foi feita sobre copia local divergente.
- Isso criou risco de documentar arquitetura, caminhos e operacao que nao representavam `origin/main`.
- A correcao e reconstruir a documentacao a partir da branch limpa.

## Referencia nao e fonte da verdade

Documentos antigos podem ajudar a lembrar decisoes e riscos, mas cada afirmacao precisa ser revalidada contra:

- Codigo atual.
- GitHub.
- Producao publica.
- Maquina local, quando a tarefa permitir.

## Infraestrutura exige validacao

WAHA, Docker, Cloudflare, PostgreSQL, portas e backups dependem de estado externo ao Git. Nunca documentar como fato sem evidencia atual.

## Dados sensiveis exigem protecao

`bot/data/respostas.xlsx`, `.env`, `waha-data/`, `waha-files/`, dumps e backups nao devem entrar em mudancas por acidente.

## Backup sem restore testado nao basta

Pendente de validação:

- Rotina real de backup.
- Restore estrutural atual.
- Restore funcional.

## Nao manter pendencias historicas depois que a main muda

Licao confirmada pelo processo:

- A documentacao reconstruida dizia que recuperacao de senha era pendente/historica.
- Depois dos commits `6bbaceb`, `6b6ec6e` e `ad9d717`, esse fluxo passou a existir em `origin/main`.
- Pendencias devem ser reclassificadas: implementacao confirmada, validacao funcional final ainda pendente.
