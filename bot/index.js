const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const { validarCPF } = require("./validador-cpf");
const { perguntarIA } = require("./ia");

const app = express();

app.use(express.json());
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
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const pool = USAR_POSTGRES
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

const mensagensProcessadas = new Set();
const timersMensagemFinal = new Map();

const ARQUIVO_RESPOSTAS = path.join(__dirname, "data", "respostas.xlsx");
const ARQUIVO_CONFIG = path.join(__dirname, "data", "config.json");
const PASTA_LOGS = path.join(__dirname, "logs");
const ARQUIVO_ATENDIMENTOS = path.join(__dirname, "data", "atendimentos.json");
const ARQUIVO_FILA = path.join(__dirname, "data", "fila.json");
const ARQUIVO_FINAL_MESSAGE_LOG = path.join(__dirname, "data", "final-message-log.json");

const CONFIG_PADRAO = {
  mensagem_final_ativa: false,
  mensagem_final: "",
  delay_mensagem_final_segundos: 20,
  pergunta_confirmacao_final: "Te ajudo em algo mais?",
  final_message_image_url: "",
  final_message_image_path: "",
  final_message_image_mime: "",
  final_message_image_size: 0,
};

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

const PERGUNTA_VIDEO =
  "O vídeo resolveu sua dúvida? Se ainda precisar, posso encaminhar para um operador.";

function garantirPasta(caminho) {
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
}

function garantirArquivoJson(caminho, padrao) {
  garantirPasta(path.dirname(caminho));

  if (!fs.existsSync(caminho)) {
    fs.writeFileSync(caminho, JSON.stringify(padrao, null, 2), "utf8");
  }
}

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

function escreverLog(texto) {
  garantirPasta(PASTA_LOGS);
  const arquivoLog = path.join(PASTA_LOGS, `${dataAtual()}.log`);
  fs.appendFileSync(arquivoLog, `[${horarioAtual()}] ${texto}\n`, "utf8");
}

function carregarJson(caminho, padrao) {
  if (!fs.existsSync(caminho)) return padrao;

  const conteudo = fs.readFileSync(caminho, "utf8");
  if (!conteudo.trim()) return padrao;

  return JSON.parse(conteudo);
}

function salvarJson(caminho, dados) {
  garantirPasta(path.dirname(caminho));
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), "utf8");
}

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

function carregarRespostas() {
  if (!fs.existsSync(ARQUIVO_RESPOSTAS)) {
    escreverLog("ARQUIVO RESPOSTAS NAO ENCONTRADO");
    return [];
  }

  const workbook = XLSX.readFile(ARQUIVO_RESPOSTAS);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

function extrairTermos(item) {
  const termos = [];

  if (item.gatilho) termos.push(String(item.gatilho));
  if (item.gatilhos) termos.push(String(item.gatilhos));
  if (item.sinonimos) termos.push(...String(item.sinonimos).split(/[;|,]/));

  return termos.map((termo) => normalizarTexto(termo)).filter(Boolean);
}

function limparLinksDoTexto(texto) {
  return String(texto || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limparPerguntaVideoDoTexto(texto) {
  return String(texto || "")
    .replace(PERGUNTA_VIDEO, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buscarResposta(mensagemCliente) {
  const mensagemNormalizada = normalizarTexto(mensagemCliente);
  const respostas = carregarRespostas();

  let melhorResposta = null;
  let melhorPrioridade = -1;

  for (const item of respostas) {
    const ativo = normalizarTexto(item.ativo);
    if (ativo !== "sim") continue;
    if (!item.resposta) continue;

    const termos = extrairTermos(item);
    if (!termos.length) continue;

    const encontrou = termos.some((termo) => mensagemNormalizada.includes(termo));
    if (!encontrou) continue;

    const prioridade = Number(item.prioridade || 0);

    if (!melhorResposta || prioridade > melhorPrioridade) {
      const linkVideo = item.link_video ? String(item.link_video).trim() : null;

      melhorPrioridade = prioridade;
      melhorResposta = {
        texto: linkVideo
          ? limparPerguntaVideoDoTexto(limparLinksDoTexto(item.resposta))
          : String(item.resposta).trim(),
        linkVideo,
      };
    }
  }

  return melhorResposta;
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

    return mapearAtendimento(rows[0]);
  }

  const atendimentos = await carregarAtendimentos();
  atendimentos[numero] = {
    ...(atendimentos[numero] || {}),
    ...novosDados,
    atualizadoEm: horarioAtual(),
  };

  await salvarAtendimentos(atendimentos);
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

async function enviarMensagem(numero, texto) {
  await axios.post(
    `${WAHA_URL}/api/sendText`,
    {
      session: SESSION,
      chatId: numero,
      text: texto,
    },
    {
      headers: { "X-Api-Key": WAHA_API_KEY },
    }
  );
}

async function enviarImagem(numero, imageUrl) {
  await axios.post(
    `${WAHA_URL}/api/sendImage`,
    {
      session: SESSION,
      chatId: numero,
      file: {
        url: imageUrl,
      },
    },
    {
      headers: { "X-Api-Key": WAHA_API_KEY },
    }
  );
}

function normalizarConfig(config) {
  const delayInformado = Number(config?.delay_mensagem_final_segundos);
  const tamanhoImagem = Number(config?.final_message_image_size);

  return {
    ...CONFIG_PADRAO,
    ...config,
    mensagem_final_ativa: Boolean(config?.mensagem_final_ativa),
    mensagem_final: String(config?.mensagem_final || ""),
    pergunta_confirmacao_final: String(
      config?.pergunta_confirmacao_final || CONFIG_PADRAO.pergunta_confirmacao_final
    ),
    delay_mensagem_final_segundos: Math.max(
      0,
      Number.isNaN(delayInformado) ? CONFIG_PADRAO.delay_mensagem_final_segundos : delayInformado
    ),
    final_message_image_url: String(config?.final_message_image_url || ""),
    final_message_image_path: String(config?.final_message_image_path || ""),
    final_message_image_mime: String(config?.final_message_image_mime || ""),
    final_message_image_size: Number.isNaN(tamanhoImagem) ? 0 : tamanhoImagem,
  };
}

function carregarConfig() {
  return normalizarConfig(carregarJson(ARQUIVO_CONFIG, CONFIG_PADRAO));
}

function salvarConfig(config) {
  const configAtual = carregarConfig();
  const configPermitida = {};
  const camposPermitidos = [
    "mensagem_final_ativa",
    "mensagem_final",
    "delay_mensagem_final_segundos",
    "pergunta_confirmacao_final",
  ];

  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(config, campo)) {
      configPermitida[campo] = config[campo];
    }
  }

  const novaConfig = normalizarConfig({ ...configAtual, ...configPermitida });
  salvarJson(ARQUIVO_CONFIG, novaConfig);
  return novaConfig;
}

function salvarConfigImagem(camposImagem) {
  const novaConfig = normalizarConfig({
    ...carregarConfig(),
    ...camposImagem,
  });

  salvarJson(ARQUIVO_CONFIG, novaConfig);
  return novaConfig;
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
  const config = carregarConfig();

  if (!config.mensagem_final_ativa || !config.mensagem_final.trim()) {
    escreverLog(`MENSAGEM FINAL DESATIVADA | ${numero}`);
    return false;
  }

  if (!(await podeEnviarMensagemFinal(numero))) {
    escreverLog(`MENSAGEM FINAL JÁ ENVIADA HOJE | ${numero}`);
    return false;
  }

  if (config.final_message_image_url) {
    try {
      await enviarImagem(numero, config.final_message_image_url);
      escreverLog(`IMAGEM MENSAGEM FINAL ENVIADA | ${numero}`);
    } catch (error) {
      escreverLog(`ERRO IMAGEM MENSAGEM FINAL | ${numero} | ${error.message}`);
    }
  }

  await enviarMensagem(numero, config.mensagem_final);
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

async function iniciarFluxoEncerramento(numero) {
  cancelarTimerMensagemFinal(numero);

  const config = carregarConfig();
  await enviarMensagem(numero, config.pergunta_confirmacao_final);

  const timer = setTimeout(async () => {
    timersMensagemFinal.delete(numero);

    try {
      await enviarMensagemFinal(numero);
      await limparAtendimento(numero);
      escreverLog(`ENCERRAMENTO AUTOMÁTICO | ${numero}`);
    } catch (error) {
      escreverLog(`ERRO MENSAGEM FINAL AUTOMÁTICA | ${numero} | ${error.message}`);
    }
  }, config.delay_mensagem_final_segundos * 1000);

  timersMensagemFinal.set(numero, timer);
}

function usuarioConfirmouEncerramento(mensagemNormalizada) {
  const respostasExatas = ["nao", "n", "ok", "valeu", "tudo certo"];

  if (respostasExatas.includes(mensagemNormalizada)) {
    return true;
  }

  const respostasPorTrecho = ["obrigado", "obrigada"];
  return respostasPorTrecho.some((resposta) => mensagemNormalizada.includes(resposta));
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

app.get("/api/config", (req, res) => {
  res.json(carregarConfig());
});

app.post("/api/config", (req, res) => {
  const config = salvarConfig(req.body || {});
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

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const configAtual = carregarConfig();

      if (configAtual.final_message_image_path) {
        await supabase.storage
          .from(SUPABASE_BUCKET)
          .remove([configAtual.final_message_image_path]);
      }

      const { data } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);

      const config = salvarConfigImagem({
        final_message_image_url: data.publicUrl,
        final_message_image_path: filePath,
        final_message_image_mime: req.file.mimetype,
        final_message_image_size: req.file.size,
      });

      escreverLog(`IMAGEM MENSAGEM FINAL CONFIGURADA | ${filePath}`);
      return res.json(config);
    } catch (error) {
      escreverLog(`ERRO UPLOAD IMAGEM MENSAGEM FINAL | ${error.message}`);
      return res.status(500).json({ erro: "Nao foi possivel enviar a imagem" });
    }
  }
);

app.delete("/api/config/final-message-image", async (req, res) => {
  try {
    const configAtual = carregarConfig();

    if (supabase && configAtual.final_message_image_path) {
      await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([configAtual.final_message_image_path]);
    }

    const config = salvarConfigImagem({
      final_message_image_url: "",
      final_message_image_path: "",
      final_message_image_mime: "",
      final_message_image_size: 0,
    });

    escreverLog("IMAGEM MENSAGEM FINAL REMOVIDA");
    return res.json(config);
  } catch (error) {
    escreverLog(`ERRO REMOVER IMAGEM MENSAGEM FINAL | ${error.message}`);
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
      cancelarTimerMensagemFinal(numero);

      if (usuarioConfirmouEncerramento(mensagemNormalizada)) {
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
      await atualizarAtendimento(numero, {
        nome: mensagemTexto,
        etapa: "aguardando_cpf",
      });

      await enviarMensagem(numero, "Obrigado. Agora informe seu CPF.");
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

      await enviarMensagem(numero, "Perfeito. Agora me diga como posso ajudar.");
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
      }

      return res.sendStatus(200);
    }

    escreverLog(`CHAMANDO IA | ${numero}`);

    try {
      const respostaIA = await perguntarIA(mensagemTexto);

      if (respostaIA) {
        escreverLog(`RESPOSTA | ${numero} | ${respostaIA}`);
        await enviarMensagem(numero, respostaIA);
        return res.sendStatus(200);
      }
    } catch (errorIA) {
      escreverLog(`ERRO IA | ${numero} | ${errorIA.message}`);
    }

    await enviarMensagem(
      numero,
      "Não encontrei essa informação agora. Vou encaminhar para atendimento humano."
    );

    return res.sendStatus(200);
  } catch (error) {
    escreverLog(`ERRO | ${error.message}`);

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
  await initDb();

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
