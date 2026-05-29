const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const WAHA_URL = process.env.WAHA_URL || process.env.WAHA_BASE_URL || "http://localhost:3001";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "123456";
const SESSION = process.env.WAHA_SESSION || "default";

const mensagensProcessadas = new Set();

const ARQUIVO_RESPOSTAS = path.join(
  __dirname,
  "respostas.xlsx"
);

const PASTA_LOGS = path.join(
  __dirname,
  "logs"
);

const ARQUIVO_ATENDIMENTOS = path.join(
  __dirname,
  "data",
  "atendimentos.json"
);

const ARQUIVO_FILA = path.join(
  __dirname,
  "data",
  "fila.json"
);

function garantirPasta(caminho) {
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, {
      recursive: true,
    });
  }
}

function garantirArquivoJson(caminho, padrao) {
  garantirPasta(path.dirname(caminho));

  if (!fs.existsSync(caminho)) {
    fs.writeFileSync(
      caminho,
      JSON.stringify(padrao, null, 2),
      "utf8"
    );
  }
}

garantirPasta(PASTA_LOGS);
garantirArquivoJson(ARQUIVO_ATENDIMENTOS, {});
garantirArquivoJson(ARQUIVO_FILA, []);

// ==============================
// FUNÇÕES AUXILIARES
// ==============================

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function dataAtual() {
  return new Date().toISOString().split("T")[0];
}

function horarioAtual() {
  return new Date().toLocaleString("pt-BR");
}

function escreverLog(texto) {
  garantirPasta(PASTA_LOGS);

  const arquivoLog = path.join(
    PASTA_LOGS,
    `${dataAtual()}.log`
  );

  fs.appendFileSync(
    arquivoLog,
    `[${horarioAtual()}] ${texto}\n`,
    "utf8"
  );
}

function carregarJson(caminho, padrao) {
  if (!fs.existsSync(caminho)) {
    return padrao;
  }

  const conteudo = fs.readFileSync(
    caminho,
    "utf8"
  );

  if (!conteudo.trim()) {
    return padrao;
  }

  return JSON.parse(conteudo);
}

function salvarJson(caminho, dados) {
  garantirPasta(path.dirname(caminho));

  fs.writeFileSync(
    caminho,
    JSON.stringify(dados, null, 2),
    "utf8"
  );
}

// ==============================
// RESPOSTAS EXCEL
// ==============================

function carregarRespostas() {
  const workbook = XLSX.readFile(
    ARQUIVO_RESPOSTAS
  );

  const sheet =
    workbook.Sheets[
      workbook.SheetNames[0]
    ];

  return XLSX.utils.sheet_to_json(
    sheet
  );
}

function buscarResposta(
  mensagemCliente
) {
  const mensagemNormalizada =
    normalizarTexto(
      mensagemCliente
    );

  const respostas =
    carregarRespostas();

  for (const item of respostas) {
    const ativo =
      normalizarTexto(
        item.ativo
      );

    const gatilho =
      normalizarTexto(
        item.gatilho
      );

    if (ativo !== "sim")
      continue;

    if (
      !gatilho ||
      !item.resposta
    )
      continue;

    if (
      mensagemNormalizada.includes(
        gatilho
      )
    ) {
      return item.resposta;
    }
  }

  return "Olá! Recebi sua mensagem. Em breve vou te responder por aqui.";
}

// ==============================
// ATENDIMENTOS
// ==============================

function carregarAtendimentos() {
  return carregarJson(
    ARQUIVO_ATENDIMENTOS,
    {}
  );
}

function salvarAtendimentos(
  dados
) {
  salvarJson(
    ARQUIVO_ATENDIMENTOS,
    dados
  );
}

function obterOuCriarAtendimento(
  numero
) {
  const atendimentos =
    carregarAtendimentos();

  if (!atendimentos[numero]) {
    atendimentos[numero] = {
      modo: "bot",
      etapa: "inicio",
      nome: null,
      cpf: null,
      site: null,
      criadoEm:
        horarioAtual(),
      atualizadoEm:
        horarioAtual(),
    };

    salvarAtendimentos(
      atendimentos
    );
  }

  return atendimentos[numero];
}

function atualizarAtendimento(
  numero,
  novosDados
) {
  const atendimentos =
    carregarAtendimentos();

  atendimentos[numero] = {
    ...(atendimentos[numero] ||
      {}),
    ...novosDados,
    atualizadoEm:
      horarioAtual(),
  };

  salvarAtendimentos(
    atendimentos
  );

  return atendimentos[numero];
}

function estaEmModoHumano(
  numero
) {
  const atendimentos =
    carregarAtendimentos();

  return (
    atendimentos[numero]
      ?.modo === "humano"
  );
}

function ativarModoHumano(
  numero
) {
  atualizarAtendimento(
    numero,
    {
      modo: "humano",
      etapa: "humano",
      iniciadoEm:
        horarioAtual(),
    }
  );
}

// ==============================
// FILA
// ==============================

function carregarFila() {
  return carregarJson(
    ARQUIVO_FILA,
    []
  );
}

function salvarFila(fila) {
  salvarJson(
    ARQUIVO_FILA,
    fila
  );
}

function adicionarNaFila(
  numero,
  mensagem
) {
  const fila =
    carregarFila();

  const jaExiste = fila.find(
    (item) =>
      item.numero ===
        numero &&
      item.status ===
        "aguardando"
  );

  if (jaExiste) {
    return;
  }

  const atendimento =
    obterOuCriarAtendimento(
      numero
    );

  fila.push({
    numero,
    nome:
      atendimento.nome ||
      null,
    cpf:
      atendimento.cpf ||
      null,
    site:
      atendimento.site ||
      null,
    mensagem,
    horario:
      horarioAtual(),
    status: "aguardando",
  });

  salvarFila(fila);
}

// ==============================
// ENVIO MENSAGEM
// ==============================

async function enviarMensagem(
  numero,
  texto
) {
  await axios.post(
    `${WAHA_URL}/api/sendText`,
    {
      session: SESSION,
      chatId: numero,
      text: texto,
    },
    {
      headers: {
        "X-Api-Key":
          WAHA_API_KEY,
      },
    }
  );
}

// ==============================
// HEALTH
// ==============================

app.get(
  "/health",
  (req, res) => {
    res.status(200).json({
      ok: true,
      service: "1chat-bot",
      mode: process.env.NODE_ENV || "local",
      timestamp: new Date().toISOString(),
    });
  }
);

// ==============================
// PAINEL ADMIN
// ==============================

app.get(
  "/admin",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "admin.html"
      )
    );
  }
);

app.get(
  "/api/fila",
  (req, res) => {
    const fila =
      carregarFila();

    res.json(fila);
  }
);

app.post(
  "/api/fila/encerrar",
  (req, res) => {
    const { numero } =
      req.body;

    if (!numero) {
      return res
        .status(400)
        .json({
          erro:
            "Número não informado",
        });
    }

    // Remove da fila
    const fila =
      carregarFila();

    const novaFila =
      fila.filter(
        (item) =>
          item.numero !==
          numero
      );

    salvarFila(novaFila);

    // Remove atendimento
    const atendimentos =
      carregarAtendimentos();

    delete atendimentos[
      numero
    ];

    salvarAtendimentos(
      atendimentos
    );

    escreverLog(
      `ATENDIMENTO ENCERRADO | ${numero}`
    );

    return res.json({
      ok: true,
    });
  }
);

// ==============================
// WEBHOOK
// ==============================

app.post(
  "/webhook",
  async (req, res) => {
    try {
      const payload =
        req.body;

      const event =
        payload.event;

      const message =
        payload.payload;

      if (
        event !== "message"
      ) {
        return res.sendStatus(
          200
        );
      }

      if (
        !message ||
        !message.from ||
        !message.body
      ) {
        return res.sendStatus(
          200
        );
      }

      if (message.fromMe) {
        return res.sendStatus(
          200
        );
      }

      if (
        message.from.includes(
          "@g.us"
        )
      ) {
        return res.sendStatus(
          200
        );
      }

      const numero =
        message.from;

      const mensagemTexto =
        message.body;

      const mensagemNormalizada =
        normalizarTexto(
          mensagemTexto
        );

      const messageId =
        message.id ||
        message._data?.id ||
        `${numero}-${mensagemTexto}`;

      if (
        mensagensProcessadas.has(
          messageId
        )
      ) {
        escreverLog(
          `DUPLICADA IGNORADA | ${numero}`
        );

        return res.sendStatus(
          200
        );
      }

      mensagensProcessadas.add(
        messageId
      );

      setTimeout(() => {
        mensagensProcessadas.delete(
          messageId
        );
      }, 5 * 60 * 1000);

      escreverLog(
        `MENSAGEM | ${numero} | ${mensagemTexto}`
      );

      console.log(
        "================================="
      );

      console.log(
        "MENSAGEM RECEBIDA"
      );

      console.log(
        mensagemTexto
      );

      const atendimento =
        obterOuCriarAtendimento(
          numero
        );

      // ==============================
      // MODO HUMANO
      // ==============================

      if (
        estaEmModoHumano(
          numero
        )
      ) {
        escreverLog(
          `MODO HUMANO | ${numero}`
        );

        return res.sendStatus(
          200
        );
      }

      // ==============================
      // ETAPA INICIAL
      // ==============================

      if (
        atendimento.etapa ===
        "inicio"
      ) {
        atualizarAtendimento(
          numero,
          {
            etapa:
              "aguardando_nome",
          }
        );

        await enviarMensagem(
          numero,
          "Olá! Para iniciar o atendimento, informe seu nome."
        );

        escreverLog(
          `PEDIU NOME | ${numero}`
        );

        return res.sendStatus(
          200
        );
      }

      // ==============================
      // AGUARDANDO NOME
      // ==============================

      if (
        atendimento.etapa ===
        "aguardando_nome"
      ) {
        atualizarAtendimento(
          numero,
          {
            nome:
              mensagemTexto,
            etapa:
              "aguardando_cpf",
          }
        );

        await enviarMensagem(
          numero,
          "Obrigado. Agora informe seu CPF."
        );

        escreverLog(
          `NOME SALVO | ${numero} | ${mensagemTexto}`
        );

        return res.sendStatus(
          200
        );
      }

      // ==============================
      // AGUARDANDO CPF
      // ==============================

      if (
        atendimento.etapa ===
        "aguardando_cpf"
      ) {
        atualizarAtendimento(
          numero,
          {
            cpf:
              mensagemTexto,
            etapa:
              "aguardando_site",
          }
        );

        await enviarMensagem(
          numero,
          "Obrigado. Agora informe em qual site ou plataforma você estava."
        );

        escreverLog(
          `CPF SALVO | ${numero} | ${mensagemTexto}`
        );

        return res.sendStatus(
          200
        );
      }

      // ==============================
      // AGUARDANDO SITE
      // ==============================

      if (
        atendimento.etapa ===
        "aguardando_site"
      ) {
        atualizarAtendimento(
          numero,
          {
            site:
              mensagemTexto,
            etapa:
              "liberado",
          }
        );

        await enviarMensagem(
          numero,
          "Perfeito. Agora me diga como posso ajudar."
        );

        escreverLog(
          `SITE SALVO | ${numero} | ${mensagemTexto}`
        );

        return res.sendStatus(
          200
        );
      }

      // ==============================
      // OPERADOR
      // ==============================

      const palavrasOperador =
        [
          "operador",
          "humano",
          "atendente",
          "suporte",
        ];

      const pediuHumano =
        palavrasOperador.some(
          (palavra) =>
            mensagemNormalizada.includes(
              palavra
            )
        );

      if (pediuHumano) {
        ativarModoHumano(
          numero
        );

        adicionarNaFila(
          numero,
          mensagemTexto
        );

        escreverLog(
          `ENCAMINHADO HUMANO | ${numero}`
        );

        await enviarMensagem(
          numero,
          "Seu atendimento foi encaminhado para um operador. Aguarde por favor."
        );

        return res.sendStatus(
          200
        );
      }

      // ==============================
      // RESPOSTA AUTOMÁTICA
      // ==============================

      const resposta =
        buscarResposta(
          mensagemTexto
        );

      escreverLog(
        `RESPOSTA | ${numero} | ${resposta}`
      );

      console.log(
        "RESPOSTA ENVIADA"
      );

      console.log(
        resposta
      );

      await enviarMensagem(
        numero,
        resposta
      );

      return res.sendStatus(
        200
      );
    } catch (error) {
      escreverLog(
        `ERRO | ${error.message}`
      );

      console.error(
        "================================="
      );

      console.error(
        "ERRO NO WEBHOOK"
      );

      if (
        error.response?.data
      ) {
        console.error(
          error.response.data
        );
      } else {
        console.error(
          error.message
        );
      }

      return res.sendStatus(
        500
      );
    }
  }
);

// ==============================
// START
// ==============================

app.listen(PORT, () => {
  console.log(
    "================================="
  );

  console.log(
    "BOT ONLINE"
  );

  console.log(
    `http://localhost:${PORT}`
  );

  console.log(
    "================================="
  );
});
