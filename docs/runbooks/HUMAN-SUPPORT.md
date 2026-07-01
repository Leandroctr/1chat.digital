# Runbook Atendimento Humano - 1chat.digital

## Resumo

O atendimento humano e parte essencial do sistema. O bot deve preservar a possibilidade de encaminhar o cliente para uma pessoa.

## Fluxo conhecido

1. Cliente envia mensagem.
2. Bot coleta nome, CPF e plataforma.
3. Bot tenta responder com planilha/IA.
4. Se necessario, cliente entra em modo humano.
5. Cliente aparece na fila do painel.
6. Operador atende.
7. Operador usa botao Encerrar.
8. Sistema retorna cliente ao fluxo automatico.

## Gatilhos conhecidos

O bot encaminha para humano quando o cliente pede termos como:

- operador;
- humano;
- atendente;
- suporte.

Tambem pode encaminhar quando o bot nao resolve ou a resposta orienta atendimento humano.

## O que verificar

- Painel abre.
- Fila carrega.
- Cliente entra na fila.
- Botao Encerrar funciona.
- Atendimento volta para modo bot.
- Dados de nome, CPF e plataforma continuam preservados corretamente.

## Riscos

- Quebrar fila ao alterar banco ou JSON.
- Quebrar botao Encerrar ao mudar rotas.
- Deixar cliente preso em modo humano.
- Limpar atendimento antes do encerramento correto.

## Comandos

PENDENTE DE CONFIRMACAO: comando operacional padrao para abrir painel em producao.

URL local documentada:

```text
http://localhost:3000/admin
```

## Documentos relacionados

- `docs/knowledge/SYSTEM-KNOWLEDGE.md`
- `docs/knowledge/OPERATION.md`
- `docs/knowledge/KNOWN-BUGS.md`
