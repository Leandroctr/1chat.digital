const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const { registrarWebhookRoute } = require("../src/webhookRoute");

function criarAppTeste(overrides = {}) {
  const app = express();
  app.use(express.json());

  const chamadas = {
    obterOuCriarAtendimento: 0,
    atualizarAtendimento: 0,
    registrarMetricasMensagem: 0,
    enviarMensagem: 0,
    iniciarFluxoPosResposta: 0,
    perguntarIA: 0,
    logError: 0,
  };

  registrarWebhookRoute({
    app,
    mensagensProcessadas: new Set(),
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
    cancelarTimerMensagemFinalPersistente: async () => {},
    registrarMetricasMensagem: async () => {
      chamadas.registrarMetricasMensagem += 1;
    },
    usuarioConfirmouEncerramento: () => false,
    enviarMensagemFinal: async () => {},
    limparAtendimento: async () => {},
    atualizarAtendimento: async () => {
      chamadas.atualizarAtendimento += 1;
    },
    usuarioConfirmouVideo: () => false,
    usuarioNegouVideo: () => false,
    encaminharParaHumano: async () => {},
    estaEmModoHumano: async () => false,
    ETAPA_CONFIRMAR_FILA_FORA_HORARIO: "confirmar_fila_fora_horario",
    pediuOperador: () => false,
    enviarMensagem: async () => {
      chamadas.enviarMensagem += 1;
    },
    pareceNomeCliente: () => true,
    primeiroNome: (nome) => String(nome || "").split(/\s+/)[0],
    validarCPF: () => ({ valido: true, cpfFormatado: "000.000.000-00" }),
    buscarResposta: () => null,
    PERGUNTA_VIDEO: "Video ajudou?",
    iniciarFluxoPosResposta: async () => {
      chamadas.iniciarFluxoPosResposta += 1;
    },
    perguntarIA: async () => {
      chamadas.perguntarIA += 1;
      return null;
    },
    carregarConfig: async () => ({ plataformas: [] }),
    identificarPlataforma: () => ({ status: "nenhum" }),
    montarMensagemConfirmacaoPlataforma: () => "Confirmar plataforma?",
    PLATFORM_CONFIRMATION_ENABLED: true,
    respostaNaoPlataforma: () => false,
    respostaSimPlataforma: () => false,
  });

  return { app, chamadas };
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
  return {
    event: "message",
    payload: {
      id,
      from: "cliente@c.us",
      body: "ola",
      fromMe: false,
    },
  };
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
  const response = await postWebhook(app, {
    ...mensagemValida("msg-any"),
    event: "message.any",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ignored, true);
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
  assert.equal(chamadas.registrarMetricasMensagem, 0);
  assert.equal(chamadas.enviarMensagem, 0);
  assert.equal(chamadas.iniciarFluxoPosResposta, 0);
  assert.equal(chamadas.perguntarIA, 0);
});

test("fromMe retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-from-me",
      from: "cliente@c.us",
      body: "ola",
      fromMe: true,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "from_me");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("fromMe em _data.key retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-from-me-nested",
      from: "cliente@c.us",
      body: "ola",
      _data: {
        key: {
          fromMe: true,
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "from_me");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("grupo retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-grupo",
      from: "grupo@g.us",
      body: "ola",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "group_message");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
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
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("session.status retorna 200 e nao envia mensagem", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "session.status",
    payload: { status: "WORKING" },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "session_status");
  assert.equal(chamadas.enviarMensagem, 0);
});

test("mensagem sem id retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      from: "cliente@c.us",
      body: "ola",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "missing_message_id");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
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
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-sem-origem",
      body: "ola",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
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
  const response = await postWebhook(app, {
    event: "message",
    payload: {
      id: "msg-sem-corpo",
      from: "cliente@c.us",
      fromMe: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
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
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
});

test("json valido com estrutura inesperada retorna 200 e nao processa", async () => {
  const { app, chamadas } = criarAppTeste();
  const response = await postWebhook(app, {
    event: "message",
    payload: "texto",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, "invalid_message");
  assert.equal(chamadas.obterOuCriarAtendimento, 0);
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
  const { app, chamadas } = criarAppTeste({
    obterOuCriarAtendimento: async () => {
      chamadas.obterOuCriarAtendimento += 1;
      throw new Error("falha controlada");
    },
  });

  const response = await postWebhook(app, mensagemValida("msg-erro-real"));

  assert.equal(response.statusCode, 500);
  assert.equal(chamadas.obterOuCriarAtendimento, 1);
  assert.equal(chamadas.logError, 1);
});
