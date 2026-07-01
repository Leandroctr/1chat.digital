# Lacunas de Recuperacao - 1chat.digital

Este arquivo lista o que ainda falta documentar ou corrigir para reconstruir 100% do ambiente em outro computador.

## Critico

| Lacuna | Impacto | Acao necessaria |
|---|---|---|
| Valores reais de ambiente nao encontrados | Sem `GEMINI_API_KEY`, `DATABASE_URL` ou URLs reais, o bot pode subir parcialmente, mas IA/banco/producao podem falhar. | Recuperar variaveis do Railway, cofre de senhas, terminal antigo ou provedor. Registrar em local privado, nunca no README publico. |
| `docker-compose.yml` contem segredos e nao esta protegido na raiz | Risco de commit acidental de credenciais WAHA. | Criar `.gitignore` raiz no projeto real protegendo `docker-compose.yml` se ele permanecer com segredos, ou mover segredos para `.env` privado. |
| `waha-data/` nao esta protegido na raiz | Risco de versionar sessao WhatsApp e perda de restore se nao for copiado. | Ignorar `waha-data/` no Git e incluir no backup privado. |
| Porta WAHA conflitante/documentacao divergente | O bot espera `http://localhost:3001`, mas o compose atual publica WAHA em `3000`. | Decidir padrao: publicar WAHA em `3001:3000` ou configurar `WAHA_URL=http://localhost:3000`. Documentar. |
| Nao ha dump PostgreSQL | Se producao usa PostgreSQL, nao ha como restaurar dados historicos. | Confirmar se `DATABASE_URL` esta ativo em producao. Criar rotina `pg_dump` e armazenar dumps privados. |
| Copia principal e copia temporaria divergem | Pode haver perda de alteracoes mais novas se restaurar a copia errada. | Comparar `C:\Users\User\1chat.digital` com `C:\tmp\1chat-prod-main-20260618183445` e definir fonte oficial. |

## Alto

| Lacuna | Impacto | Acao necessaria |
|---|---|---|
| Compose sobe apenas WAHA | PC novo nao sobe o bot completo com um unico comando. | Criar/documentar compose completo com `bot`, `waha` e opcionalmente `postgres`, ou documentar comandos separados. |
| Volume Docker `waha-data` existe, mas container usa bind mount | Ambiguidade no que deve ser salvo/restaurado. | Confirmar se o volume Docker local e legado. Documentar que a sessao real esta em `C:\Users\User\1chat.digital\waha-data`. |
| `bot/bot.rar` nao auditado | Pode conter codigo/segredos antigos. | Abrir e inventariar em ambiente seguro, sem publicar conteudo sensivel. |
| Arquivos `.patch`, `.txt` e scripts soltos na raiz | Podem conter estado antigo, conflito ou informacao operacional. | Classificar o que deve ser guardado, apagado futuramente ou ignorado. Nao deletar sem decisao. |
| Sem documentacao do tunel publico | WAHA local nao e acessivel por Railway/externo sem tunel. | Registrar provedor, comando de start, URL fixa, conta e arquivo de configuracao do tunel. |
| Sem documentacao de DNS | Dominio existe em `CNAME`, mas falta provedor/DNS. | Registrar onde `1chat.digital` e gerenciado e quais registros DNS existem. |

## Medio

| Lacuna | Impacto | Acao necessaria |
|---|---|---|
| Ausencia de `.env.template` no projeto real | Instalacao nova depende de memoria/documentos externos. | Criar template sem segredos com todas as variaveis. |
| Sem checklist de teste automatizado de restore | Restore pode parecer OK mas falhar no fluxo WhatsApp. | Definir teste minimo: `/health`, admin, status WAHA, mensagem recebida, resposta enviada. |
| Sem versao fixa da imagem WAHA | `latest` pode mudar e quebrar restore futuro. | Registrar digest/tag testada ou fixar versao especifica. |
| Sem backup versionado da planilha operacional | `respostas.xlsx` e critico para respostas do bot. | Garantir backup diario e historico rotativo. |
| Sem documentacao de encoding | Existem scripts de correcao de encoding e textos com mojibake no codigo. | Documentar codificacao esperada e avaliar correcao futura em tarefa separada. |

## Informacoes Ainda a Preencher

```text
Caminho oficial do projeto:
Repositorio GitHub oficial:
Branch oficial:
URL publica do bot:
URL publica/local do WAHA:
Webhook configurado no WAHA:
Provedor do tunel:
Arquivo/config do tunel:
Railway project:
Railway service:
Variaveis configuradas no Railway:
Banco PostgreSQL usado em producao:
Rotina de pg_dump:
Local dos backups:
Frequencia dos backups:
Responsavel pelo backup:
Procedimento para restaurar WhatsApp se waha-data falhar:
```

## Recomendacao de Estado-Alvo Para Recuperacao 100%

1. Definir `C:\Users\User\1chat.digital` ou outra pasta como fonte oficial.
2. Consolidar alteracoes da copia temporaria se forem validas.
3. Criar `.gitignore` raiz protegendo segredos, backups, dumps e sessoes WAHA.
4. Separar segredos do `docker-compose.yml` para `.env` privado.
5. Ajustar porta/URL WAHA para eliminar conflito `3000` vs `3001`.
6. Documentar e testar backup de `bot/data/` e `waha-data/`.
7. Confirmar se PostgreSQL e usado em producao; se sim, criar dump recorrente.
8. Fixar versao da imagem WAHA ou registrar digest.
9. Executar um restore de teste em pasta separada e registrar resultado.
