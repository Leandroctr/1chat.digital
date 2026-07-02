# Lacunas de Recuperacao - 1chat.digital

## Critico

Pendente de validação:

- Backup real.
- Restore real.
- Segredos reais em local privado.
- Estado real de WAHA.
- Estado real de PostgreSQL.

## Alto

- Confirmar se `DATABASE_URL` esta em uso.
- Confirmar rotina de `pg_dump`.
- Confirmar onde a sessao WAHA e persistida.
- Confirmar topologia real de tunel.
- Confirmar procedimento de reconexao WhatsApp.

## Medio

- Confirmar politica de retencao de backups.
- Confirmar responsavel por restore.
- Confirmar checklist operacional dos atendentes.
- Corrigir encoding/mojibake.

## Confirmado por inspeção do código em origin/main

- O bot suporta modo arquivo.
- O bot suporta PostgreSQL.
- O bot suporta WAHA por URL configuravel.
- O bot suporta login admin.
- O bot suporta Supabase opcional.

## Estado-alvo futuro

Pendente de validação:

- Os itens abaixo representam objetivos futuros.
- Eles nao devem ser interpretados como estado atual confirmado.

- Backup recorrente documentado.
- Restore estrutural testado.
- Restore funcional testado.
- Segredos em cofre privado.
- Runbooks atualizados apos cada mudanca operacional.
