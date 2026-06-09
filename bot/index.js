const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");
const { validarCPF } = require("./validador-cpf");
const { perguntarIA } = require("./ia");
const {
  ARQUIVO_RESPOSTAS,
  ARQUIVO_CONFIG,
  PASTA_LOGS,
  ARQUIVO_ATENDIMENTOS,
  ARQUIVO_FILA,
  ARQUIVO_FINAL_MESSAGE_LOG,
} = require("./src/paths");
const {
  escreverLog,
  logInfo,
  logWarn,
  logError,
  logState,
  rotacionarLogsNoStartup,
} = require("./src/logger");
const {
  garantirPasta,
  garantirArquivoJson,
  carregarJson,
  salvarJson,
} = require("./src/jsonStore");
const { criarWahaClient } = require("./src/waha");
const {
  PERGUNTA_VIDEO,
  criarRespostasService,
} = require("./src/respostas");
const {
  CONFIG_PADRAO,
  criarConfigService,
} = require("./src/configService");

const app = express();

app.use(
  "/webhook",
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      if (buf.length > 1024 * 1024) {
        const erro = new Error("Webhook ignorado: payload grande demais");
        erro.status = 413;
        throw erro;
      }
    },
  })
);

app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || "*";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === "entity.too.large") {
    console.log(`WEBHOOK GRANDE IGNORADO | ${req.originalUrl}`);
    logWarn("WEBHOOK", "Webhook grande ignorado", { url: req.originalUrl });
    return res.sendStatus(200);
  }

  return next(err);
});

const PORT = process.env.PORT || 3000;
const WAHA_URL = process.env.WAHA_URL || process.env.WAHA_BASE_URL || "http://localhost:3001";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "123456";
const SESSION = process.env.WAHA_SESSION || "default";
const USAR_POSTGRES = Boolean(process.env.DATABASE_URL);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "finalmessageassets";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        realtime: {
          transport: WebSocket,
        },
      })
    : null;

const pool = USAR_POSTGRES
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const {
  enviarMensagem,
  enviarImagem,
} = criarWahaClient({ WAHA_URL, WAHA_API_KEY, SESSION });

const mensagensProcessadas = new Set();
const timersMensagemFinal = new Map();

const MIME_IMAGENS_MENSAGEM_FINAL = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSAO_POR_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const uploadImagemMensagemFinal = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!MIME_IMAGENS_MENSAGEM_FINAL.has(file.mimetype)) {
      cb(new Error("Formato de imagem nao permitido"));
      return;
    }

    cb(null, true);
  },
});

garantirPasta(PASTA_LOGS);
garantirArquivoJson(ARQUIVO_ATENDIMENTOS, {});
garantirArquivoJson(ARQUIVO_FILA, []);
garantirArquivoJson(ARQUIVO_CONFIG, CONFIG_PADRAO);
garantirArquivoJson(ARQUIVO_FINAL_MESSAGE_LOG, {});

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

function dataAtual() {
  return new Date().toISOString().split("T")[0];
}

function horarioAtual() {
  return new Date().toLocaleString("pt-BR");
}

function dataBanco(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

const { buscarResposta } = criarRespostasService({
  ARQUIVO_RESPOSTAS,
  escreverLog,
  normalizarTexto,
});
const {
  carregarConfig,
  salvarConfig,
  salvarConfigImagem,
} = criarConfigService({
  USAR_POSTGRES,
  pool,
  ARQUIVO_CONFIG,
  carregarJson,
  salvarJson,
});

async function initDb() {
  if (!USAR_POSTGRES) return;

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_message_log (
      id SERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(numero, sent_date)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_config (
      chave TEXT PRIMARY KEY,
      valor JSONB NOT NULL,
      atualizado_em TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS final_message_pending (
      numero TEXT PRIMARY KEY,
      origem TEXT,
      scheduled_at TIMESTAMPTZ NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function mapearAtendimento(row) {
  if (!row) return null;

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
    horario: row.horario ? new Date(row.horario).toLocaleString("pt-BR") : null,
    status: row.status,
  };
}

async function carregarAtendimentos() {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query("SELECT * FROM atendimentos");
    return rows.reduce((acc, row) => {
      acc[row.numero] = mapearAtendimento(row);
      return acc;
    }, {});
  }

  return carregarJson(ARQUIVO_ATENDIMENTOS, {});
}

async function salvarAtendimentos(dados) {
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

  salvarJson(ARQUIVO_ATENDIMENTOS, dados);
}

async function obterOuCriarAtendimento(numero) {
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

  const atendimentos = await carregarAtendimentos();

  if (!atendimentos[numero]) {
    atendimentos[numero] = {
      modo: "bot",
      etapa: "inicio",
      nome: null,
      cpf: null,
      site: null,
      criadoEm: horarioAtual(),
      atualizadoEm: horarioAtual(),
    };

    await salvarAtendimentos(atendimentos);
  }

  return atendimentos[numero];
}

async function atualizarAtendimento(numero, novosDados) {
  if (USAR_POSTGRES) {
    const atual = await obterOuCriarAtendimento(numero);
    const atendimento = { ...atual, ...novosDados };

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

    const atualizado = mapearAtendimento(rows[0]);

    if (novosDados.etapa && atual.etapa !== atualizado.etapa) {
      logState(numero, atual.etapa, atualizado.etapa, "atualizar_atendimento");
    }

    return atualizado;
  }

  const atendimentos = await carregarAtendimentos();
  const etapaAnterior = atendimentos[numero]?.etapa;

  atendimentos[numero] = {
    ...(atendimentos[numero] || {}),
    ...novosDados,
    atualizadoEm: horarioAtual(),
  };

  await salvarAtendimentos(atendimentos);

  if (novosDados.etapa && etapaAnterior !== atendimentos[numero].etapa) {
    logState(numero, etapaAnterior, atendimentos[numero].etapa, "atualizar_atendimento");
  }

  return atendimentos[numero];
}

async function estaEmModoHumano(numero) {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query("SELECT modo FROM atendimentos WHERE numero = $1", [numero]);
    return rows[0]?.modo === "humano";
  }

  const atendimentos = await carregarAtendimentos();
  return atendimentos[numero]?.modo === "humano";
}

async function ativarModoHumano(numero) {
  await atualizarAtendimento(numero, {
    modo: "humano",
    etapa: "humano",
    iniciadoEm: USAR_POSTGRES ? new Date() : horarioAtual(),
  });
}

async function limparAtendimento(numero) {
  if (USAR_POSTGRES) {
    await pool.query("DELETE FROM atendimentos WHERE numero = $1", [numero]);
    return;
  }

  const atendimentos = await carregarAtendimentos();
  delete atendimentos[numero];
  await salvarAtendimentos(atendimentos);
}

async function carregarFila() {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query(
      `SELECT numero, nome, cpf, site, mensagem, horario, status
       FROM fila
       ORDER BY horario ASC`
    );

    return rows.map(mapearItemFila);
  }

  return carregarJson(ARQUIVO_FILA, []);
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

  salvarJson(ARQUIVO_FILA, fila);
}

async function adicionarNaFila(numero, mensagem) {
  const atendimento = await obterOuCriarAtendimento(numero);

  if (USAR_POSTGRES) {
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

  const fila = await carregarFila();
  const jaExiste = fila.find((item) => item.numero === numero && item.status === "aguardando");
  if (jaExiste) return;

  fila.push({
    numero,
    nome: atendimento.nome || null,
    cpf: atendimento.cpf || null,
    site: atendimento.site || null,
    mensagem,
    horario: horarioAtual(),
    status: "aguardando",
  });

  await salvarFila(fila);
}

async function removerDaFila(numero) {
  if (USAR_POSTGRES) {
    await pool.query("DELETE FROM fila WHERE numero = $1", [numero]);
    return;
  }

  const fila = await carregarFila();
  await salvarFila(fila.filter((item) => item.numero !== numero));
}

async function podeEnviarMensagemFinal(numero) {
  if (USAR_POSTGRES) {
    const { rows } = await pool.query(
      `SELECT 1
       FROM final_message_log
       WHERE numero = $1
         AND sent_date = CURRENT_DATE
       LIMIT 1`,
      [numero]
    );

    return rows.length === 0;
  }

  const log = carregarJson(ARQUIVO_FINAL_MESSAGE_LOG, {});
  return log[numero] !== dataAtual();
}

async function registrarMensagemFinalEnviada(numero) {
  if (USAR_POSTGRES) {
    await pool.query(
      `INSERT INTO final_message_log
        (numero, sent_date)
       VALUES
        ($1, CURRENT_DATE)
       ON CONFLICT (numero, sent_date)
       DO NOTHING`,
      [numero]
    );

    return;
  }

  const log = carregarJson(ARQUIVO_FINAL_MESSAGE_LOG, {});
  log[numero] = dataAtual();
  salvarJson(ARQUIVO_FINAL_MESSAGE_LOG, log);
}

async function enviarMensagemFinal(numero) {
  const config = await carregarConfig();

  if (
    !config.mensagem_final_ativa ||
    (!config.final_message_image_url && !config.mensagem_final.trim())
  ) {
    escreverLog(`MENSAGEM FINAL DESATIVADA | ${numero}`);
    return false;
  }

  if (!(await podeEnviarMensagemFinal(numero))) {
    escreverLog(`MENSAGEM FINAL JÁ ENVIADA HOJE | ${numero}`);
    return false;
  }

  let enviouAlgo = false;

  if (config.final_message_image_url) {
    try {
      await enviarImagem(numero, config.final_message_image_url);
      enviouAlgo = true;
      escreverLog(`IMAGEM MENSAGEM FINAL ENVIADA | ${numero}`);
    } catch (error) {
      escreverLog(`ERRO IMAGEM MENSAGEM FINAL | ${numero} | ${error.message}`);
    }
  }

  if (config.mensagem_final.trim()) {
    await enviarMensagem(numero, config.mensagem_final);
    enviouAlgo = true;
  }

  if (!enviouAlgo) {
    escreverLog(`MENSAGEM FINAL NAO ENVIADA | ${numero}`);
    return false;
  }

  await registrarMensagemFinalEnviada(numero);
  escreverLog(`MENSAGEM FINAL ENVIADA | ${numero}`);
  return true;
}

function cancelarTimerMensagemFinal(numero) {
  const timer = timersMensagemFinal.get(numero);

  if (timer) {
    clearTimeout(timer);
    timersMensagemFinal.delete(numero);
  }
}

async function removerMensagemFinalPendente(numero) {
  if (!USAR_POSTGRES) return;

  await pool.query("DELETE FROM final_message_pending WHERE numero = $1", [numero]);
}

async function salvarMensagemFinalPendente(numero, origem, delaySegundos) {
  if (!USAR_POSTGRES) return;

  await pool.query(
    `INSERT INTO final_message_pending
      (numero, origem, scheduled_at)
     VALUES
      ($1, $2, NOW() + ($3 * INTERVAL '1 second'))
     ON CONFLICT (numero)
     DO UPDATE SET
      origem = EXCLUDED.origem,
      scheduled_at = EXCLUDED.scheduled_at,
      criado_em = NOW()`,
    [numero, origem, delaySegundos]
  );
}

async function cancelarTimerMensagemFinalPersistente(numero) {
  cancelarTimerMensagemFinal(numero);
  await removerMensagemFinalPendente(numero);
}

async function iniciarPerguntaFinal(numero, origem) {
  await cancelarTimerMensagemFinalPersistente(numero);

  const config = await carregarConfig();
  const atendimento = await obterOuCriarAtendimento(numero);
  const nome = primeiroNome(atendimento.nome);
  const pergunta = nome
    ? `${nome}, ${config.pergunta_confirmacao_final.charAt(0).toLowerCase()}${config.pergunta_confirmacao_final.slice(1)}`
    : config.pergunta_confirmacao_final;

  await enviarMensagem(numero, pergunta);
  escreverLog(`FINAL PERGUNTA ENVIADA | ${numero} | ${origem}`);
  await salvarMensagemFinalPendente(numero, origem, config.delay_mensagem_final_segundos);

  const timer = setTimeout(async () => {
    timersMensagemFinal.delete(numero);

    try {
      await enviarMensagemFinal(numero);
      await limparAtendimento(numero);
      await removerMensagemFinalPendente(numero);
      escreverLog(`FINAL AUTOMATICO | ${numero} | ${origem}`);
    } catch (error) {
      escreverLog(`ERRO FINAL AUTOMATICO | ${numero} | ${origem} | ${error.message}`);
    }
  }, config.delay_mensagem_final_segundos * 1000);

  timersMensagemFinal.set(numero, timer);
  escreverLog(`TIMER FINAL INICIADO | ${numero} | ${origem}`);
}

async function iniciarFluxoEncerramento(numero) {
  await iniciarPerguntaFinal(numero, "encerramento_humano");
}

async function iniciarFluxoPosResposta(numero) {
  if (timersMensagemFinal.has(numero)) {
    escreverLog(`TIMER POS RESPOSTA JA EXISTE | ${numero}`);
    return;
  }

  if (await estaEmModoHumano(numero)) {
    escreverLog(`POS RESPOSTA IGNORADO MODO HUMANO | ${numero}`);
    return;
  }

  const atendimento = await obterOuCriarAtendimento(numero);

  if (atendimento?.etapa !== "liberado") {
    escreverLog(`POS RESPOSTA IGNORADO ETAPA | ${numero} | ${atendimento?.etapa || "sem_atendimento"}`);
    return;
  }

  const config = await carregarConfig();

  if (
    !config.mensagem_final_ativa ||
    (!config.final_message_image_url && !config.mensagem_final.trim())
  ) {
    escreverLog(`POS RESPOSTA IGNORADO MENSAGEM FINAL DESATIVADA | ${numero}`);
    return;
  }

  await atualizarAtendimento(numero, {
    modo: "bot",
    etapa: "aguardando_confirmacao_pos_resposta",
  });
  await iniciarPerguntaFinal(numero, "pos_resposta");
}

let verificandoMensagensFinaisPendentes = false;

async function verificarMensagensFinaisPendentes() {
  if (!USAR_POSTGRES || verificandoMensagensFinaisPendentes) return;

  verificandoMensagensFinaisPendentes = true;

  try {
    const { rows } = await pool.query(
      `SELECT numero, origem
       FROM final_message_pending
       WHERE scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT 20`
    );

    for (const item of rows) {
      try {
        cancelarTimerMensagemFinal(item.numero);
        await enviarMensagemFinal(item.numero);
        await limparAtendimento(item.numero);
        await removerMensagemFinalPendente(item.numero);
        escreverLog(`FINAL AUTOMATICO PERSISTENTE | ${item.numero} | ${item.origem || "sem_origem"}`);
      } catch (error) {
        escreverLog(`ERRO FINAL AUTOMATICO PERSISTENTE | ${item.numero} | ${error.message}`);
      }
    }
  } catch (error) {
    escreverLog(`ERRO VERIFICAR FINAL PENDENTE | ${error.message}`);
  } finally {
    verificandoMensagensFinaisPendentes = false;
  }
}

function iniciarVerificadorMensagensFinaisPendentes() {
  if (!USAR_POSTGRES) return;

  setInterval(verificarMensagensFinaisPendentes, 5000);
  verificarMensagensFinaisPendentes();
}

function usuarioConfirmouEncerramento(mensagemNormalizada) {
  const respostasExatas = ["nao", "n", "ok", "valeu", "tudo certo", "sim", "sim obrigado"];

  if (respostasExatas.includes(mensagemNormalizada)) {
    return true;
  }

  const respostasPorTrecho = ["obrigado", "obrigada"];
  return respostasPorTrecho.some((resposta) => mensagemNormalizada.includes(resposta));
}

function usuarioConfirmouVideo(mensagemNormalizada) {
  const respostasExatas = [
    "sim",
    "sim resolveu",
    "resolveu",
    "ok",
    "obrigado",
    "obrigada",
    "valeu",
    "tudo certo",
  ];

  if (respostasExatas.includes(mensagemNormalizada)) {
    return true;
  }

  return mensagemNormalizada.includes("obrigado") || mensagemNormalizada.includes("obrigada");
}

function usuarioNegouVideo(mensagemNormalizada) {
  const respostasNegativas = ["nao", "nao resolveu"];

  if (respostasNegativas.includes(mensagemNormalizada)) {
    return true;
  }

  return pediuOperador(mensagemNormalizada);
}

function pediuOperador(mensagemNormalizada) {
  const palavrasOperador = ["operador", "humano", "atendente", "suporte"];
  return palavrasOperador.some((palavra) => mensagemNormalizada.includes(palavra));
}

async function encaminharParaHumano(numero, mensagemTexto) {
  await ativarModoHumano(numero);
  await adicionarNaFila(numero, mensagemTexto);
  escreverLog(`ENCAMINHADO HUMANO | ${numero}`);
}

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "1chat-bot",
    mode: process.env.NODE_ENV || "local",
    timestamp: new Date().toISOString(),
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/fila", async (req, res) => {
  const fila = await carregarFila();
  res.json(fila);
});

app.get("/api/config", async (req, res) => {
  res.json(await carregarConfig());
});

app.post("/api/config", async (req, res) => {
  const config = await salvarConfig(req.body || {});
  res.json(config);
});

app.post(
  "/api/config/final-message-image",
  uploadImagemMensagemFinal.single("image"),
  async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ erro: "Supabase nao configurado" });
      }

      if (!req.file) {
        return res.status(400).json({ erro: "Imagem nao enviada" });
      }

      const extensao = EXTENSAO_POR_MIME[req.file.mimetype];
      const filePath = `final-message-${Date.now()}.${extensao}`;
      const configAtual = await carregarConfig();
      const imagemAntigaPath = configAtual.final_message_image_path;

      logInfo("SUPABASE", "Upload imagem final iniciado", {
        path: filePath,
        mime: req.file.mimetype,
        tamanho: req.file.size,
      });

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      logInfo("SUPABASE", "Upload imagem final concluido", { path: filePath });

      if (imagemAntigaPath) {
        try {
          const { error: removeError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove([imagemAntigaPath]);

          if (removeError) {
            throw removeError;
          }

          escreverLog(`IMAGEM ANTIGA REMOVIDA | ${imagemAntigaPath}`);
          logInfo("SUPABASE", "Imagem antiga removida", { path: imagemAntigaPath });
        } catch (error) {
          escreverLog(`ERRO REMOVER IMAGEM ANTIGA | ${imagemAntigaPath} | ${error.message}`);
          logWarn("SUPABASE", "Erro remover imagem antiga", { path: imagemAntigaPath, erro: error.message });
        }
      }

      const { data } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);

      const config = await salvarConfigImagem({
        final_message_image_url: data.publicUrl,
        final_message_image_path: filePath,
        final_message_image_mime: req.file.mimetype,
        final_message_image_size: req.file.size,
      });

      escreverLog(`IMAGEM MENSAGEM FINAL CONFIGURADA | ${filePath}`);
      logInfo("SUPABASE", "Imagem mensagem final configurada", { path: filePath });
      return res.json(config);
    } catch (error) {
      escreverLog(`ERRO UPLOAD IMAGEM MENSAGEM FINAL | ${error.message}`);
      logError("SUPABASE", "Erro upload imagem mensagem final", error);
      return res.status(500).json({ erro: "Nao foi possivel enviar a imagem" });
    }
  }
);

app.delete("/api/config/final-message-image", async (req, res) => {
  try {
    const configAtual = await carregarConfig();

    if (supabase && configAtual.final_message_image_path) {
      await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([configAtual.final_message_image_path]);
    }

    const config = await salvarConfigImagem({
      final_message_image_url: "",
      final_message_image_path: "",
      final_message_image_mime: "",
      final_message_image_size: 0,
    });

    escreverLog("IMAGEM MENSAGEM FINAL REMOVIDA");
    logInfo("SUPABASE", "Imagem removida manualmente");
    return res.json(config);
  } catch (error) {
    escreverLog(`ERRO REMOVER IMAGEM MENSAGEM FINAL | ${error.message}`);
    logError("SUPABASE", "Erro remover imagem mensagem final", error);
    return res.status(500).json({ erro: "Nao foi possivel remover a imagem" });
  }
});

app.post("/api/fila/encerrar", async (req, res) => {
  const { numero } = req.body;

  if (!numero) {
    return res.status(400).json({ erro: "Número não informado" });
  }

  await removerDaFila(numero);
  await atualizarAtendimento(numero, {
    modo: "bot",
    etapa: "aguardando_confirmacao_final",
  });
  await iniciarFluxoEncerramento(numero);

  escreverLog(`FLUXO ENCERRAMENTO INICIADO | ${numero}`);
  return res.json({ ok: true });
});

app.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;
    const event = payload.event;
    const message = payload.payload;

    if (event !== "message") return res.sendStatus(200);
    if (!message || !message.from || !message.body) return res.sendStatus(200);
    if (message.fromMe) return res.sendStatus(200);
    if (message.from.includes("@g.us")) return res.sendStatus(200);

    const numero = message.from;
    const mensagemTexto = message.body;
    const mensagemNormalizada = normalizarTexto(mensagemTexto);
    const messageId = message.id || message._data?.id || `${numero}-${mensagemTexto}`;

    if (mensagensProcessadas.has(messageId)) {
      escreverLog(`DUPLICADA IGNORADA | ${numero}`);
      return res.sendStatus(200);
    }

    mensagensProcessadas.add(messageId);
    setTimeout(() => mensagensProcessadas.delete(messageId), 5 * 60 * 1000);

    escreverLog(`MENSAGEM | ${numero} | ${mensagemTexto}`);
    console.log("=================================");
    console.log("MENSAGEM RECEBIDA");
    console.log(mensagemTexto);

    const atendimento = await obterOuCriarAtendimento(numero);

    if (atendimento.etapa === "aguardando_confirmacao_final") {
      await cancelarTimerMensagemFinalPersistente(numero);

      if (usuarioConfirmouEncerramento(mensagemNormalizada)) {
        escreverLog(`CONFIRMACAO FINAL | ${numero}`);
        await enviarMensagemFinal(numero);
        await limparAtendimento(numero);
        escreverLog(`ENCERRAMENTO CONFIRMADO | ${numero}`);
        return res.sendStatus(200);
      }

      await atualizarAtendimento(numero, { modo: "bot", etapa: "liberado" });
      atendimento.modo = "bot";
      atendimento.etapa = "liberado";
      escreverLog(`ENCERRAMENTO CANCELADO | ${numero} | ${mensagemTexto}`);
    }

    if (atendimento.etapa === "aguardando_confirmacao_video") {
      if (usuarioConfirmouVideo(mensagemNormalizada)) {
        escreverLog(`CONFIRMACAO VIDEO POSITIVA | ${numero} | ${mensagemTexto}`);
        await atualizarAtendimento(numero, {
          modo: "bot",
          etapa: "aguardando_confirmacao_final",
        });
        await iniciarPerguntaFinal(numero, "confirmacao_video");
        return res.sendStatus(200);
      }

      if (usuarioNegouVideo(mensagemNormalizada)) {
        escreverLog(`CONFIRMACAO VIDEO NEGATIVA | ${numero} | ${mensagemTexto}`);
        await encaminharParaHumano(numero, mensagemTexto);
        return res.sendStatus(200);
      }

      await atualizarAtendimento(numero, { modo: "bot", etapa: "liberado" });
      atendimento.modo = "bot";
      atendimento.etapa = "liberado";
      escreverLog(`CONFIRMACAO VIDEO CONTINUOU ATENDIMENTO | ${numero} | ${mensagemTexto}`);
    }

    if (atendimento.etapa === "aguardando_confirmacao_pos_resposta") {
      await cancelarTimerMensagemFinalPersistente(numero);

      if (usuarioConfirmouEncerramento(mensagemNormalizada)) {
        escreverLog(`CONFIRMACAO FINAL | ${numero}`);
        await enviarMensagemFinal(numero);
        await limparAtendimento(numero);
        escreverLog(`POS RESPOSTA ENCERRADO PELO USUARIO | ${numero}`);
        return res.sendStatus(200);
      }

      await atualizarAtendimento(numero, { modo: "bot", etapa: "liberado" });
      atendimento.modo = "bot";
      atendimento.etapa = "liberado";
      escreverLog(`POS RESPOSTA CONTINUOU ATENDIMENTO | ${numero} | ${mensagemTexto}`);
    }

    if (await estaEmModoHumano(numero)) {
      escreverLog(`MODO HUMANO | ${numero}`);
      return res.sendStatus(200);
    }

    if (pediuOperador(mensagemNormalizada)) {
      await encaminharParaHumano(numero, mensagemTexto);
      return res.sendStatus(200);
    }

    if (atendimento.etapa === "inicio") {
      await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
      await enviarMensagem(numero, "Olá! Para iniciar o atendimento, informe seu nome.");
      escreverLog(`PEDIU NOME | ${numero}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa === "aguardando_nome") {
      const nomeCliente = primeiroNome(mensagemTexto);

      await atualizarAtendimento(numero, {
        nome: mensagemTexto,
        etapa: "aguardando_cpf",
      });

      await enviarMensagem(
        numero,
        nomeCliente ? `Obrigado, ${nomeCliente}. Agora informe seu CPF.` : "Obrigado. Agora informe seu CPF."
      );
      escreverLog(`NOME SALVO | ${numero} | ${mensagemTexto}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa === "aguardando_cpf") {
      const validacao = validarCPF(mensagemTexto);

      if (!validacao.valido) {
        await enviarMensagem(
          numero,
          `❌ ${validacao.mensagem}\n\nPor favor, informe um CPF válido (apenas números).`
        );

        escreverLog(`CPF INVÁLIDO | ${numero} | ${mensagemTexto}`);
        return res.sendStatus(200);
      }

      await atualizarAtendimento(numero, {
        cpf: validacao.cpfFormatado,
        etapa: "aguardando_site",
      });

      await enviarMensagem(
        numero,
        "✅ CPF registrado com sucesso!\n\nAgora informe em qual site ou plataforma você estava."
      );

      escreverLog(`CPF SALVO | ${numero} | ${validacao.cpfFormatado}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa === "aguardando_site") {
      await atualizarAtendimento(numero, {
        site: mensagemTexto,
        etapa: "liberado",
      });

      await enviarMensagem(
        numero,
        atendimento.nome
          ? `Perfeito, ${primeiroNome(atendimento.nome)}. Agora me diga como posso ajudar.`
          : "Perfeito. Agora me diga como posso ajudar."
      );
      escreverLog(`SITE SALVO | ${numero} | ${mensagemTexto}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa === "liberado" && (!atendimento.nome || !atendimento.cpf || !atendimento.site)) {
      await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
      await enviarMensagem(numero, "Olá! Para iniciar o atendimento, informe seu nome.");
      escreverLog(`CADASTRO INCOMPLETO | PEDIU NOME | ${numero}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa !== "liberado") {
      await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
      await enviarMensagem(numero, "Olá! Para iniciar o atendimento, informe seu nome.");
      escreverLog(`ETAPA INVALIDA | PEDIU NOME | ${numero}`);
      return res.sendStatus(200);
    }

    escreverLog(`BUSCANDO RESPOSTA PLANILHA | ${numero} | ${mensagemTexto}`);
    const respostaEncontrada = buscarResposta(mensagemTexto);

    if (respostaEncontrada?.texto) {
      escreverLog(`RESPOSTA PLANILHA ENCONTRADA | ${numero}`);
      await enviarMensagem(numero, respostaEncontrada.texto);

      if (respostaEncontrada.linkVideo) {
        escreverLog(`LINK VIDEO ENCONTRADO | ${numero} | ${respostaEncontrada.linkVideo}`);
        await enviarMensagem(numero, respostaEncontrada.linkVideo);
        await enviarMensagem(numero, PERGUNTA_VIDEO);
        await atualizarAtendimento(numero, {
          modo: "bot",
          etapa: "aguardando_confirmacao_video",
        });
        return res.sendStatus(200);
      }

      await iniciarFluxoPosResposta(numero);
      return res.sendStatus(200);
    }

    escreverLog(`CHAMANDO IA | ${numero}`);
    logInfo("IA", "Chamada IA iniciada", { numero });
    const inicioIA = Date.now();

    try {
      const respostaIA = await perguntarIA(mensagemTexto);

      if (respostaIA) {
        escreverLog(`RESPOSTA | ${numero} | ${respostaIA}`);
        logInfo("IA", "Resposta IA concluida", { numero, duracaoMs: Date.now() - inicioIA });
        await enviarMensagem(numero, respostaIA);
        await iniciarFluxoPosResposta(numero);
        return res.sendStatus(200);
      }
    } catch (errorIA) {
      escreverLog(`ERRO IA | ${numero} | ${errorIA.message}`);
      logError("IA", "Erro IA", errorIA, { numero, duracaoMs: Date.now() - inicioIA });
    }

    await enviarMensagem(
      numero,
      "Não encontrei essa informação agora. Vou encaminhar para atendimento humano."
    );

    return res.sendStatus(200);
  } catch (error) {
    escreverLog(`ERRO | ${error.message}`);
    logError("ERRO", "Erro no webhook", error);

    console.error("=================================");
    console.error("ERRO NO WEBHOOK");

    if (error.response?.data) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }

    return res.sendStatus(500);
  }
});

async function start() {
  rotacionarLogsNoStartup();
  await initDb();
  iniciarVerificadorMensagensFinaisPendentes();

  app.listen(PORT, () => {
    console.log("=================================");
    console.log("BOT ONLINE");
    console.log(`http://localhost:${PORT}`);
    console.log("=================================");
  });
}

start().catch((error) => {
  console.error("ERRO AO INICIAR");
  console.error(error);
  process.exit(1);
});
