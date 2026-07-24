const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const { registrarWebhookRoute } = require("../src/webhookRoute");
const { clone, fixtures } = require("./fixtures/wahaWebhookPayloads");

function criarAppTeste(overrides = {}) {
  const app = express();
  app.use(express.json());
  const mensagensProcessadas = new Set();

  const chamadas = {
    obterOuCriarAtendimento: 0,
    atualizarAtendimento: 0,
    cancelarTimerMensagemFinalPersistente: 0,
    registrarMetricasMensagem: 0,
    enviarMensagemFinal: 0,
    limparAtendimento: 0,
    enviarMensagem: 0,
    encaminharParaHumano: 0,
    estaEmModoHumano: 0,
    iniciarFluxoPosResposta: 0,
    perguntarIA: 0,
    carregarConfig: 0,
    identificarPlataforma: 0,
    buscarResposta: 0,
    logError: 0,
  };

  registrarWebhookRoute({
    app,
    mensagensProcessadas,
    normalizarTexto: (texto) => String(texto || "").toLowerCase().trim(),
    escreverLog: () => {},
    logInfo: () => {},
    logError: () => {
      chamadas.logError += 1;
    },
    obterOuCriarAtendimento: overrides.obterOuCriarAtendimento || (async () => {
      chamadas.obterOuCriarAtendimento += 1;
      return { etapa: "inicio", modo: "bot" };
    }),
    cancelarTimerMensagemFinalPersistente: async () => {
      chamadas.cancelarTimerMensagemFinalPersistente += 1;
    },
    registrarMetricasMensagem: async () => {
      chamadas.registrarMetricasMensagem += 1;
    },
    usuarioConfirmouEncerramento: () => false,
    enviarMensagemFinal: async () => {
      chamadas.enviarMensagemFinal += 1;
    },
    limparAtendimento: async () => {
      chamadas.limparAtendimento += 1;
    },
    atualizarAtendimento: async () => {
      chamadas.atualizarAtendimento += 1;
    },
    usuarioConfirmouVideo: () => false,
    usuarioNegouVideo: () => false,
    encaminharParaHumano: async () => {
      chamadas.encaminharParaHumano += 1;
    },
    estaEmModoHumano: async () => {
      chamadas.estaEmModoHumano += 1;
      return false;
    },
    ETAPA_CONFIRMAR_FILA_FORA_HORARIO: "confirmar_fila_fora_horario",
    pediuOperador: () => false,
    enviarMensagem: async () => {
      chamadas.enviarMensagem += 1;
    },
    pareceNomeCliente: () => true,
    primeiroNome: (nome) => String(nome || "").split(/\s+/)[0],
    validarCPF: () => ({ valido: true, cpfFormatado: "000.000.000-00" }),
    buscarResposta: () => {
      chamadas.buscarResposta += 1;
      return null;
    },
    PERGUNTA_VIDEO: "Video ajudou?",
    iniciarFluxoPosResposta: async () => {
      chamadas.iniciarFluxoPosResposta += 1;
    },
    perguntarIA: async () => {
      chamadas.perguntarIA += 1;
      return null;
    },
    carregarConfig: async () => {
      chamadas.carregarConfig += 1;
      return { plataformas: [] };
    },
    identificarPlataforma: () => {
      chamadas.identificarPlataforma += 1;
      return { status: "nenhum" };
    },
    montarMensagemConfirmacaoPlataforma: () => "Confirmar plataforma?",
    PLATFORM_CONFIRMATION_ENABLED: true,
    respostaNaoPlataforma: () => false,
    respostaSimPlataforma: () => false,
  });

  return { app, chamadas, mensagensProcessadas };
}

function postWebhook(app, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      const payload = body === undefined ? "" : JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/webhook",
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            server.close(() => {
              let body = data || null;
              if (data) {
                try {
                  body = JSON.parse(data);
                } catch {
                  body = data;
                }
              }

              resolve({
                statusCode: res.statusCode,
                body,
              });
            });
          });
        }
      );

      req.on("error", (error) => {
        server.close(() => reject(error));
      });
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

function mensagemValida(id = "msg-1") {
  const payload = clone(fixtures.textoValido);
  payload.payload.id = id;
  return payload;
}

function assertSemEfeitosFuncionais(chamadas) {
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
  assert.equal(chamadas.atualizarAtendimento, 0);
  assert.equal(chamadas.cancelarTimerMensagemFinalPersistente, 0);
  assert.equal(chamadas.registrarMetricasMensagem, 0);
  assert.equal(chamadas.enviarMensagemFinal, 0);
  assert.equal(chamadas.limparAtendimento, 0);
  assert.equal(chamadas.enviarMensagem, 0);
  assert.equal(chamadas.encaminharParaHumano, 0);
  assert.equal(chamadas.estaEmModoHumano, 0);
  assert.equal(chamadas.iniciarFluxoPosResposta, 0);
  assert.equal(chamadas.perguntarIA, 0);
  assert.equal(chamadas.carregarConfig, 0);
  assert.equal(chamadas.identificarPlataforma, 0);
  assert.equal(chamadas.buscarResposta, 0);
}

test("message valido e processado uma unica vez", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, mensagemValida("msg-valida"));

  assert.equal(response.statusCode, 200);
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.registrarMetricasMensagem, 1);
  assert.equal(chamadas.enviarMensagem, 1);
});

test("message.any retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.messageAny));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ignored, true);
  assertSemEfeitosFuncionais(chamadas);
});

test("fromMe retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.fromMeTopLevel));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "from_me");
  assertSemEfeitosFuncionais(chamadas);
});

test("fromMe em _data.key retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.fromMeDataKey));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "from_me");
  assertSemEfeitosFuncionais(chamadas);
});

test("grupo retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.grupo));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "group_message");
  assertSemEfeitosFuncionais(chamadas);
});

test("evento desconhecido retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "ack",
    payload: {
      id: "msg-ack",
      from: "cliente@c.us",
      body: "ola",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "event_ignored");
  assertSemEfeitosFuncionais(chamadas);
});

test("session.status retorna 200 e nao envia mensagem", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.sessionStatus));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "session_status");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem sem id retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.semId));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "missing_message_id");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem com id vazio retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "   ",
      from: "cliente@c.us",
      body: "ola",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "missing_message_id");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("mensagem sem origem retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.semOrigem));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem com origem vazia retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-origem-vazia",
      from: "   ",
      body: "ola",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("mensagem sem corpo retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.semCorpo));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem com corpo vazio retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-corpo-vazio",
      from: "cliente@c.us",
      body: "   ",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("payload ausente retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, undefined);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "event_ignored");
  assertSemEfeitosFuncionais(chamadas);
});

test("json valido com estrutura inesperada retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.estruturaInesperada));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem sem objeto payload retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.semPayload));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem com id em _data.id e processada", async () => {
  const { app, chamadas, mensagensProcessadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.idEmData));

  assert.equal(response.statusCode, 200);
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.registrarMetricasMensagem, 1);
  assert.equal(chamadas.enviarMensagem, 1);
  assert.equal(mensagensProcessadas.has("msg-data-id-001"), true);
});

test("id em objeto inesperado nao vira chave object Object", async () => {
  const { app, chamadas, mensagensProcessadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.idObjetoInesperado));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "missing_message_id");
  assert.equal(mensagensProcessadas.has("[object Object]"), false);
  assert.equal(mensagensProcessadas.size, 0);
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagem de midia sem body segue contrato atual e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, clone(fixtures.midiaSemBody));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assertSemEfeitosFuncionais(chamadas);
});

test("mensagens duplicadas com mesmo id nao processam duas vezes", async () => {
  const { app, chamadas } = criarAppTeste();

  const first = await postWebhook(app, mensagemValida("msg-duplicada"));
  const second = await postWebhook(app, mensagemValida("msg-duplicada"));

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.enviarMensagem, 1);
});

test("duas mensagens diferentes com mesmo corpo nao sao duplicadas", async () => {
  const { app, chamadas } = criarAppTeste();
  const first = mensagemValida("msg-corpo-igual-1");
  const second = mensagemValida("msg-corpo-igual-2");
  first.payload.body = "mesmo corpo";
  second.payload.body = "mesmo corpo";

  const firstResponse = await postWebhook(app, first);
  const secondResponse = await postWebhook(app, second);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(chamadas.obterOuCriarAtendimento, 2);
  assert.equal(chamadas.enviarMensagem, 2);
});

test("message.any com mesmo id nao marca deduplicacao do message posterior", async () => {
  const { app, chamadas } = criarAppTeste();
  const ignored = clone(fixtures.messageAny);
  ignored.payload.id = "msg-any-then-message";
  const valid = mensagemValida("msg-any-then-message");

  const ignoredResponse = await postWebhook(app, ignored);
  const validResponse = await postWebhook(app, valid);

  assert.equal(ignoredResponse.statusCode, 200);
  assert.equal(validResponse.statusCode, 200);
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.enviarMensagem, 1);
});

test("id repetido com payload diferente nao processa novamente", async () => {
  const { app, chamadas } = criarAppTeste();

  const first = await postWebhook(app, mensagemValida("msg-id-repetido"));
  const second = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-id-repetido",
      from: "outro-cliente@c.us",
      body: "outra mensagem",
      fromMe: false,
    },
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.enviarMensagem, 1);
});

test("erro real no processador retorna 500 e registra erro", async () => {
  const { app, chamadas, mensagensProcessadas } = criarAppTeste({
    obterOuCriarAtendimento: async () => {
      chamadas.obterOuCriarAtendimento += 1;
      throw new Error("falha controlada");
    },
  });

  const response = await postWebhook(app, mensagemValida("msg-erro-real"));

  assert.equal(response.statusCode, 500);
  assert.equal(response.body, "Internal Server Error");
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.logError, 1);
  assert.equal(mensagensProcessadas.has("msg-erro-real"), true);
});

test("erro real mantem id deduplicado e repeticao posterior fica silenciosa", async () => {
  const { app, chamadas } = criarAppTeste({
    obterOuCriarAtendimento: async () => {
      chamadas.obterOuCriarAtendimento += 1;
      throw new Error("falha controlada");
    },
  });

  const first = await postWebhook(app, mensagemValida("msg-erro-dedupe"));
  const second = await postWebhook(app, mensagemValida("msg-erro-dedupe"));

  assert.equal(first.statusCode, 500);
  assert.equal(first.body, "Internal Server Error");
  assert.equal(second.statusCode, 200);
  assert.equal(second.body, "OK");
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.logError, 1);
});
