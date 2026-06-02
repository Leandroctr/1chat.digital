const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const { validarCPF } = require("./validador-cpf");

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || "*";

  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const WAHA_URL = process.env.WAHA_URL || process.env.WAHA_BASE_URL || "http://localhost:3001";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "123456";
const SESSION = process.env.WAHA_SESSION || "default";
const USAR_POSTGRES = Boolean(process.env.DATABASE_URL);
const pool = USAR_POSTGRES
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : null;

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

function dataBanco(valor) {
  if (!valor) {
    return null;
  }

  if (valor instanceof Date) {
    return valor;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data;
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

async function initDb() {
  if (!USAR_POSTGRES) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atendimentos (
      numero TEXT PRIMARY KEY,
      modo TEXT NOT NULL DEFAULT 'bot',
      etapa TEXT NOT NULL DEFAULT 'inicio',
      nome TEXT,
      cpf TEXT,
      site TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW(),
      iniciado_em TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fila (
      id SERIAL PRIMARY KEY,
      numero TEXT UNIQUE NOT NULL,
      nome TEXT,
      cpf TEXT,
      site TEXT,
      mensagem TEXT,
      horario TIMESTAMPTZ DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'aguardando'
    );
  `);
}

function mapearAtendimento(row) {
  if (!row) {
    return null;
  }

  return {
    modo: row.modo,
    etapa: row.etapa,
    nome: row.nome,
    cpf: row.cpf,
    site: row.site,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    iniciadoEm: row.iniciado_em,
  };
}

function mapearItemFila(row) {
  return {
    numero: row.numero,
    nome: row.nome,
    cpf: row.cpf,
    site: row.site,
    mensagem: row.mensagem,
    horario: row.horario
      ? new Date(row.horario).toLocaleString("pt-BR")
      : null,
    status: row.status,
  };
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

async function carregarAtendimentos() {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query(
      "SELECT * FROM atendimentos"
    );

    return rows.reduce((acc, row) => {
      acc[row.numero] = mapearAtendimento(row);
      return acc;
    }, {});
  }

  return carregarJson(
    ARQUIVO_ATENDIMENTOS,
    {}
  );
}

async function salvarAtendimentos(
  dados
) {
  if (USAR_POSTGRES) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM atendimentos");

      for (const [numero, atendimento] of Object.entries(dados)) {
        await client.query(
          `INSERT INTO atendimentos
            (numero, modo, etapa, nome, cpf, site, criado_em, atualizado_em, iniciado_em)
           VALUES
            ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), NOW(), $8)`,
          [
            numero,
            atendimento.modo || "bot",
            atendimento.etapa || "inicio",
            atendimento.nome || null,
            atendimento.cpf || null,
            atendimento.site || null,
            dataBanco(atendimento.criadoEm),
            dataBanco(atendimento.iniciadoEm),
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return;
  }

  salvarJson(
    ARQUIVO_ATENDIMENTOS,
    dados
  );
}

async function obterOuCriarAtendimento(
  numero
) {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query(
      `INSERT INTO atendimentos (numero)
       VALUES ($1)
       ON CONFLICT (numero) DO UPDATE
       SET numero = EXCLUDED.numero
       RETURNING *`,
      [numero]
    );

    return mapearAtendimento(rows[0]);
  }

  const atendimentos =
    await carregarAtendimentos();

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

    await salvarAtendimentos(
      atendimentos
    );
  }

  return atendimentos[numero];
}

async function atualizarAtendimento(
  numero,
  novosDados
) {
  if (USAR_POSTGRES) {
    const atendimentoAtual =
      await obterOuCriarAtendimento(
        numero
      );

    const atendimento = {
      ...atendimentoAtual,
      ...novosDados,
    };

    const { rows } = await pool.query(
      `UPDATE atendimentos
       SET modo = $2,
           etapa = $3,
           nome = $4,
           cpf = $5,
           site = $6,
           atualizado_em = NOW(),
           iniciado_em = COALESCE($7, iniciado_em)
       WHERE numero = $1
       RETURNING *`,
      [
        numero,
        atendimento.modo || "bot",
        atendimento.etapa || "inicio",
        atendimento.nome || null,
        atendimento.cpf || null,
        atendimento.site || null,
        dataBanco(atendimento.iniciadoEm),
      ]
    );

    return mapearAtendimento(rows[0]);
  }

  const atendimentos =
    await carregarAtendimentos();

  atendimentos[numero] = {
    ...(atendimentos[numero] ||
      {}),
    ...novosDados,
    atualizadoEm:
      horarioAtual(),
  };

  await salvarAtendimentos(
    atendimentos
  );

  return atendimentos[numero];
}

async function estaEmModoHumano(
  numero
) {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query(
      "SELECT modo FROM atendimentos WHERE numero = $1",
      [numero]
    );

    return rows[0]?.modo === "humano";
  }

  const atendimentos =
    await carregarAtendimentos();

  return (
    atendimentos[numero]
      ?.modo === "humano"
  );
}

async function ativarModoHumano(
  numero
) {
  await atualizarAtendimento(
    numero,
    {
      modo: "humano",
      etapa: "humano",
      iniciadoEm:
        USAR_POSTGRES
          ? new Date()
          : horarioAtual(),
    }
  );
}

// ==============================
// FILA
// ==============================

async function carregarFila() {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query(
      `SELECT numero, nome, cpf, site, mensagem, horario, status
       FROM fila
       ORDER BY horario ASC`
    );

    return rows.map(mapearItemFila);
  }

  return carregarJson(
    ARQUIVO_FILA,
    []
  );
}

async function salvarFila(fila) {
  if (USAR_POSTGRES) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM fila");

      for (const item of fila) {
        await client.query(
          `INSERT INTO fila
            (numero, nome, cpf, site, mensagem, horario, status)
           VALUES
            ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7)
           ON CONFLICT (numero) DO UPDATE
           SET nome = EXCLUDED.nome,
               cpf = EXCLUDED.cpf,
               site = EXCLUDED.site,
               mensagem = EXCLUDED.mensagem,
               horario = EXCLUDED.horario,
               status = EXCLUDED.status`,
          [
            item.numero,
            item.nome || null,
            item.cpf || null,
            item.site || null,
            item.mensagem || null,
            dataBanco(item.horario),
            item.status || "aguardando",
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return;
  }

  salvarJson(
    ARQUIVO_FILA,
    fila
  );
}

async function adicionarNaFila(
  numero,
  mensagem
) {
  if (USAR_POSTGRES) {
    const atendimento =
      await obterOuCriarAtendimento(
        numero
      );

    await pool.query(
      `INSERT INTO fila
        (numero, nome, cpf, site, mensagem, status)
       VALUES
        ($1, $2, $3, $4, $5, 'aguardando')
       ON CONFLICT (numero) DO UPDATE
       SET nome = EXCLUDED.nome,
           cpf = EXCLUDED.cpf,
           site = EXCLUDED.site,
           mensagem = EXCLUDED.mensagem,
           status = 'aguardando'`,
      [
        numero,
        atendimento.nome || null,
        atendimento.cpf || null,
        atendimento.site || null,
        mensagem,
      ]
    );

    return;
  }

  const fila =
    await carregarFila();

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
    await obterOuCriarAtendimento(
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

  await salvarFila(fila);
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
  async (req, res) => {
    const fila =
      await carregarFila();

    res.json(fila);
  }
);

app.post(
  "/api/fila/encerrar",
  async (req, res) => {
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

    if (USAR_POSTGRES) {
      await pool.query(
        "DELETE FROM fila WHERE numero = $1",
        [numero]
      );

      await pool.query(
        "DELETE FROM atendimentos WHERE numero = $1",
        [numero]
      );
    } else {
      // Remove da fila
      const fila =
        await carregarFila();

      const novaFila =
        fila.filter(
          (item) =>
            item.numero !==
            numero
        );

      await salvarFila(novaFila);

      // Remove atendimento
      const atendimentos =
        await carregarAtendimentos();

      delete atendimentos[
        numero
      ];

      await salvarAtendimentos(
        atendimentos
      );
    }

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
        await obterOuCriarAtendimento(
          numero
        );

      // ==============================
      // MODO HUMANO
      // ==============================

      if (
        await estaEmModoHumano(
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
        await atualizarAtendimento(
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
        await atualizarAtendimento(
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
        await atualizarAtendimento(
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
        await atualizarAtendimento(
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
        await ativarModoHumano(
          numero
        );

        await adicionarNaFila(
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

async function start() {
  await initDb();

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
}

start().catch((error) => {
  console.error(
    "ERRO AO INICIAR"
  );
  console.error(error);
  process.exit(1);
});
