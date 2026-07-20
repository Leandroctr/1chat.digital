const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const { validarCPF } = require("./validador-cpf");
const { perguntarIA } = require("./ia");

const app = express();

app.use(express.json());
app.use((err, req, res, next) => {
  const isJsonParseError =
    err &&
    (err.type === "entity.parse.failed" ||
      (err instanceof SyntaxError && err.status === 400 && "body" in err));

  if (!isJsonParseError) {
    return next(err);
  }

  console.warn("[HTTP] JSON invalido recebido", {
    method: req.method,
    path: req.originalUrl || req.url,
    contentType: req.headers["content-type"],
    userAgent: req.headers["user-agent"],
  });

  return res.status(400).json({
    ok: false,
    error: "invalid_json",
  });
});

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
const PLATFORM_CONFIRMATION_ENABLED =
  String(process.env.PLATFORM_CONFIRMATION_ENABLED || "true").toLowerCase() !== "false";

const pool = USAR_POSTGRES
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

const mensagensProcessadas = new Set();
const timersMensagemFinal = new Map();

const ARQUIVO_RESPOSTAS = path.join(__dirname, "data", "respostas.xlsx");
const ARQUIVO_CONFIG = path.join(
  __dirname,
  "data",
  "config.json"
);
const PASTA_LOGS = path.join(__dirname, "logs");
const ARQUIVO_ATENDIMENTOS = path.join(__dirname, "data", "atendimentos.json");
const ARQUIVO_FILA = path.join(__dirname, "data", "fila.json");
const ARQUIVO_FINAL_MESSAGE_LOG = path.join(
  __dirname,
  "data",
  "final-message-log.json"
);

const CONFIG_PADRAO = {
  mensagem_final_ativa: false,
  mensagem_final: "",
  delay_mensagem_final_segundos: 20,
  pergunta_confirmacao_final: "Te ajudo em algo mais?",
  plataformas: [
    {
      key: "obapremios",
      name: "Oba Prêmios",
      url: "https://obapremios.com",
      aliases: ["oba", "obá", "oba premios", "oba prêmio", "obapremios", "obapremios.com"],
      active: true,
    },
  ],
};

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

function removerEsquemaUrl(texto) {
  return String(texto || "")
    .replace(/https?:\/\//gi, "")
    .replace(/\bwww\./gi, "");
}

function normalizarTextoPlataforma(texto) {
  return removerEsquemaUrl(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[/?#].*$/g, "")
    .replace(/[^\w.\s-]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactarTextoPlataforma(texto) {
  return normalizarTextoPlataforma(texto).replace(/[^\w]/g, "");
}

function gerarPlatformKey(valor) {
  return compactarTextoPlataforma(valor).slice(0, 60);
}

function normalizarUrlPlataforma(url) {
  const texto = String(url || "").trim();
  if (!texto) return "";

  if (/^https?:\/\//i.test(texto)) return texto;
  return `https://${removerEsquemaUrl(texto)}`;
}

function dividirAliases(valor) {
  if (Array.isArray(valor)) return valor;

  return String(valor || "")
    .split(/[\n;,|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function normalizarPlataformaConfig(plataforma) {
  const name = String(plataforma?.name || "").trim();
  const url = normalizarUrlPlataforma(plataforma?.url);
  const key = gerarPlatformKey(plataforma?.key || name || url);

  if (!key || !name || !url) return null;

  return {
    key,
    name,
    url,
    aliases: dividirAliases(plataforma?.aliases),
    active: plataforma?.active !== false,
  };
}

function normalizarCatalogoPlataformas(plataformas) {
  const catalogo = Array.isArray(plataformas) ? plataformas : CONFIG_PADRAO.plataformas;
  const porChave = new Map();

  for (const plataforma of catalogo) {
    const normalizada = normalizarPlataformaConfig(plataforma);
    if (!normalizada) continue;
    porChave.set(normalizada.key, normalizada);
  }

  return Array.from(porChave.values());
}

function termosDaPlataforma(plataforma) {
  return [
    plataforma.key,
    plataforma.name,
    plataforma.url,
    removerEsquemaUrl(plataforma.url),
    ...dividirAliases(plataforma.aliases),
  ].filter(Boolean);
}

function classificarMatchPlataforma(texto, plataforma) {
  const entrada = normalizarTextoPlataforma(texto);
  const entradaCompacta = compactarTextoPlataforma(texto);
  if (!entrada || !entradaCompacta) return null;

  let encontrouFraco = false;

  for (const termo of termosDaPlataforma(plataforma)) {
    const termoNormalizado = normalizarTextoPlataforma(termo);
    const termoCompacto = compactarTextoPlataforma(termo);
    if (!termoNormalizado || !termoCompacto) continue;

    if (entrada === termoNormalizado || entradaCompacta === termoCompacto) {
      return "forte";
    }

    const entradaPareceDominio = entrada.includes(".");
    const termoPareceDominio = termoNormalizado.includes(".");
    if (
      entradaPareceDominio &&
      termoPareceDominio &&
      (entrada === termoNormalizado || entrada.startsWith(`${termoNormalizado}/`))
    ) {
      return "forte";
    }

    if (
      entradaCompacta.length >= 4 &&
      termoCompacto.length >= 4 &&
      (entradaCompacta.includes(termoCompacto) || termoCompacto.includes(entradaCompacta))
    ) {
      encontrouFraco = true;
    }
  }

  return encontrouFraco ? "fraco" : null;
}

function identificarPlataforma(texto) {
  const plataformas = carregarConfig().plataformas.filter((plataforma) => plataforma.active !== false);
  const fortes = [];
  const fracos = [];

  for (const plataforma of plataformas) {
    const classificacao = classificarMatchPlataforma(texto, plataforma);
    if (classificacao === "forte") fortes.push(plataforma);
    if (classificacao === "fraco") fracos.push(plataforma);
  }

  if (fortes.length === 1 && fracos.length === 0) {
    return { status: "forte", plataforma: fortes[0] };
  }

  if (fortes.length > 0 || fracos.length > 1) {
    return { status: "multiplo" };
  }

  if (fracos.length === 1) {
    return { status: "fraco" };
  }

  return { status: "nenhum" };
}

function montarMensagemConfirmacaoPlataforma(plataforma) {
  return `Você quis dizer esta plataforma?\n\n${plataforma.name}\n${plataforma.url}\n\nResponda:\n1 - Sim\n2 - Não`;
}

function respostaSimPlataforma(mensagemNormalizada) {
  return ["1", "sim", "s", "isso", "correto", "certo"].includes(mensagemNormalizada);
}

function respostaNaoPlataforma(mensagemNormalizada) {
  return ["2", "nao", "n", "não"].includes(mensagemNormalizada);
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
      platform_key TEXT,
      platform_name TEXT,
      platform_url TEXT,
      platform_raw TEXT,
      platform_confirmed BOOLEAN DEFAULT FALSE,
      platform_candidate_key TEXT,
      platform_attempts INTEGER DEFAULT 0,
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW(),
      iniciado_em TIMESTAMPTZ
    );
  `);

  await pool.query(`
    ALTER TABLE atendimentos
      ADD COLUMN IF NOT EXISTS platform_key TEXT,
      ADD COLUMN IF NOT EXISTS platform_name TEXT,
      ADD COLUMN IF NOT EXISTS platform_url TEXT,
      ADD COLUMN IF NOT EXISTS platform_raw TEXT,
      ADD COLUMN IF NOT EXISTS platform_confirmed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS platform_candidate_key TEXT,
      ADD COLUMN IF NOT EXISTS platform_attempts INTEGER DEFAULT 0;
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
    platform_key: row.platform_key,
    platform_name: row.platform_name,
    platform_url: row.platform_url,
    platform_raw: row.platform_raw,
    platform_confirmed: Boolean(row.platform_confirmed),
    platform_candidate_key: row.platform_candidate_key,
    platform_attempts: Number(row.platform_attempts || 0),
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
  const workbook = XLSX.readFile(ARQUIVO_RESPOSTAS);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

function extrairTermos(item) {
  const termos = [];

  if (item.gatilho) {
    termos.push(String(item.gatilho));
  }

  if (item.gatilhos) {
    termos.push(String(item.gatilhos));
  }

  if (item.sinonimos) {
    termos.push(...String(item.sinonimos).split(/[;|,]/));
  }

  return termos
    .map((termo) => normalizarTexto(termo))
    .filter(Boolean);
}

function limparLinksDoTexto(texto) {
  return String(texto || "")
    .replace(/https?:\/\/\S+/gi, "")
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
          ? limparLinksDoTexto(item.resposta)
          : String(item.resposta).trim(),
        linkVideo,
      };
    }
  }

  if (melhorResposta) return melhorResposta;

  return {
    texto: "OlÃ¡! Recebi sua mensagem. Em breve vou te responder por aqui.",
    linkVideo: null,
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
            (
              numero, modo, etapa, nome, cpf, site,
              platform_key, platform_name, platform_url, platform_raw,
              platform_confirmed, platform_candidate_key, platform_attempts,
              criado_em, atualizado_em, iniciado_em
            )
           VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()), NOW(), $15)`,
          [
            numero,
            atendimento.modo || "bot",
            atendimento.etapa || "inicio",
            atendimento.nome || null,
            atendimento.cpf || null,
            atendimento.site || null,
            atendimento.platform_key || null,
            atendimento.platform_name || null,
            atendimento.platform_url || null,
            atendimento.platform_raw || null,
            Boolean(atendimento.platform_confirmed),
            atendimento.platform_candidate_key || null,
            Number(atendimento.platform_attempts || 0),
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
      platform_key: null,
      platform_name: null,
      platform_url: null,
      platform_raw: null,
      platform_confirmed: false,
      platform_candidate_key: null,
      platform_attempts: 0,
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
           platform_key = $7,
           platform_name = $8,
           platform_url = $9,
           platform_raw = $10,
           platform_confirmed = $11,
           platform_candidate_key = $12,
           platform_attempts = $13,
           atualizado_em = NOW(),
           iniciado_em = COALESCE($14, iniciado_em)
       WHERE numero = $1
       RETURNING *`,
      [
        numero,
        atendimento.modo || "bot",
        atendimento.etapa || "inicio",
        atendimento.nome || null,
        atendimento.cpf || null,
        atendimento.site || null,
        atendimento.platform_key || null,
        atendimento.platform_name || null,
        atendimento.platform_url || null,
        atendimento.platform_raw || null,
        Boolean(atendimento.platform_confirmed),
        atendimento.platform_candidate_key || null,
        Number(atendimento.platform_attempts || 0),
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

function normalizarConfig(config) {
  const delayInformado = Number(config?.delay_mensagem_final_segundos);
  const plataformas = Object.prototype.hasOwnProperty.call(config || {}, "plataformas")
    ? config.plataformas
    : CONFIG_PADRAO.plataformas;

  return {
    ...CONFIG_PADRAO,
    ...config,
    mensagem_final_ativa: Boolean(config?.mensagem_final_ativa),
    mensagem_final: String(config?.mensagem_final || ""),
    pergunta_confirmacao_final: String(
      config?.pergunta_confirmacao_final ||
        CONFIG_PADRAO.pergunta_confirmacao_final
    ),
    delay_mensagem_final_segundos: Math.max(
      0,
      Number.isNaN(delayInformado)
        ? CONFIG_PADRAO.delay_mensagem_final_segundos
        : delayInformado
    ),
    plataformas: normalizarCatalogoPlataformas(plataformas),
    platform_confirmation_enabled: PLATFORM_CONFIRMATION_ENABLED,
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
    "plataformas",
  ];

  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(config, campo)) {
      configPermitida[campo] = config[campo];
    }
  }

  const novaConfig = normalizarConfig({
    ...configAtual,
    ...configPermitida,
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
  return respostasPorTrecho.some((resposta) =>
    mensagemNormalizada.includes(resposta)
  );
}

function pediuOperador(mensagemNormalizada) {
  const palavrasOperador = ["operador", "humano", "atendente", "suporte"];
  return palavrasOperador.some((palavra) => mensagemNormalizada.includes(palavra));
}

function pediuRecuperacaoSenha(mensagemNormalizada) {
  const gatilhos = [
    "recuperar senha",
    "esqueci minha senha",
    "esqueci a senha",
    "nao consigo entrar",
    "nao consigo acessar",
    "nao consigo fazer login",
    "nao entra",
    "nao esta entrando",
    "nao consigo jogar",
    "nao abre minha conta",
    "minha conta nao entra",
    "login nao funciona",
  ];

  return gatilhos.some((gatilho) => mensagemNormalizada.includes(gatilho));
}

function respostaAfirmativa(mensagemNormalizada) {
  const respostasExatas = ["sim", "s", "isso", "ja", "usei", "ja usei"];
  if (respostasExatas.includes(mensagemNormalizada)) return true;

  const respostasPorTrecho = ["ja utilizei", "ja cliquei", "ja apertei", "e o mesmo"];
  return respostasPorTrecho.some((resposta) => mensagemNormalizada.includes(resposta));
}

function respostaNegativa(mensagemNormalizada) {
  const respostasExatas = ["nao", "n", "nunca"];
  if (respostasExatas.includes(mensagemNormalizada)) return true;

  const respostasPorTrecho = ["ainda nao", "nao usei", "nao utilizei", "nao cliquei", "nao apertei", "nao e o mesmo"];
  return respostasPorTrecho.some((resposta) => mensagemNormalizada.includes(resposta));
}

async function encaminharParaHumano(numero, mensagemTexto) {
  await ativarModoHumano(numero);
  await adicionarNaFila(numero, mensagemTexto);
  escreverLog(`ENCAMINHADO HUMANO | ${numero}`);
}

function buscarPlataformaPorKey(key) {
  return carregarConfig().plataformas.find((plataforma) => plataforma.key === key) || null;
}

async function salvarPlataformaSemConfirmacao(numero, mensagemTexto) {
  await atualizarAtendimento(numero, {
    site: mensagemTexto,
    platform_key: null,
    platform_name: null,
    platform_url: null,
    platform_raw: mensagemTexto,
    platform_confirmed: false,
    platform_candidate_key: null,
    platform_attempts: 0,
    etapa: "liberado",
  });

  await enviarMensagem(numero, "Perfeito. Agora me diga como posso ajudar.");
  escreverLog(`PLATAFORMA NAO CONFIRMADA | ${numero} | ${mensagemTexto}`);
}

async function pedirEnderecoCompletoPlataforma(numero, mensagemTexto, tentativas) {
  await atualizarAtendimento(numero, {
    site: null,
    platform_key: null,
    platform_name: null,
    platform_url: null,
    platform_raw: mensagemTexto,
    platform_confirmed: false,
    platform_candidate_key: null,
    platform_attempts: tentativas,
    etapa: "aguardando_site_completo",
  });

  await enviarMensagem(
    numero,
    "Não consegui confirmar a plataforma com segurança.\n\nPor favor, envie o endereço completo do site ou app em que você está jogando."
  );
}

async function pedirConfirmacaoPlataforma(numero, mensagemTexto, plataforma) {
  await atualizarAtendimento(numero, {
    site: null,
    platform_key: null,
    platform_name: null,
    platform_url: null,
    platform_raw: mensagemTexto,
    platform_confirmed: false,
    platform_candidate_key: plataforma.key,
    platform_attempts: 0,
    etapa: "confirmando_plataforma",
  });

  await enviarMensagem(numero, montarMensagemConfirmacaoPlataforma(plataforma));
  escreverLog(`PLATAFORMA CANDIDATA | ${numero} | ${plataforma.key} | ${mensagemTexto}`);
}

async function processarEntradaPlataforma(numero, mensagemTexto, atendimento) {
  if (!PLATFORM_CONFIRMATION_ENABLED) {
    await atualizarAtendimento(numero, {
      site: mensagemTexto,
      etapa: "liberado",
    });

    await enviarMensagem(numero, "Perfeito. Agora me diga como posso ajudar.");
    escreverLog(`SITE SALVO | ${numero} | ${mensagemTexto}`);
    return true;
  }

  const resultado = identificarPlataforma(mensagemTexto);

  if (resultado.status === "forte") {
    await pedirConfirmacaoPlataforma(numero, mensagemTexto, resultado.plataforma);
    return true;
  }

  const tentativas = Number(atendimento.platform_attempts || 0) + 1;

  if (atendimento.etapa === "aguardando_site_completo" && tentativas >= 2) {
    await salvarPlataformaSemConfirmacao(numero, mensagemTexto);
    return true;
  }

  await pedirEnderecoCompletoPlataforma(numero, mensagemTexto, tentativas);
  escreverLog(`PLATAFORMA SEM MATCH SEGURO | ${numero} | ${resultado.status} | ${mensagemTexto}`);
  return true;
}

async function processarConfirmacaoPlataforma(numero, mensagemTexto, mensagemNormalizada, atendimento) {
  if (!PLATFORM_CONFIRMATION_ENABLED) {
    return processarEntradaPlataforma(numero, mensagemTexto, atendimento);
  }

  const plataforma = buscarPlataformaPorKey(atendimento.platform_candidate_key);

  if (respostaSimPlataforma(mensagemNormalizada) && plataforma) {
    await atualizarAtendimento(numero, {
      site: `${plataforma.name} - ${plataforma.url}`,
      platform_key: plataforma.key,
      platform_name: plataforma.name,
      platform_url: plataforma.url,
      platform_confirmed: true,
      platform_candidate_key: null,
      platform_attempts: 0,
      etapa: "liberado",
    });

    await enviarMensagem(numero, "Perfeito. Agora me diga como posso ajudar.");
    escreverLog(`PLATAFORMA CONFIRMADA | ${numero} | ${plataforma.key}`);
    return true;
  }

  if (respostaNaoPlataforma(mensagemNormalizada) || !plataforma) {
    await atualizarAtendimento(numero, {
      platform_key: null,
      platform_name: null,
      platform_url: null,
      platform_confirmed: false,
      platform_candidate_key: null,
      platform_attempts: Number(atendimento.platform_attempts || 0) + 1,
      etapa: "aguardando_site",
    });

    await enviarMensagem(
      numero,
      "Certo. Por favor, envie o nome ou o endereço completo da plataforma em que você está jogando."
    );
    escreverLog(`PLATAFORMA NEGADA | ${numero} | ${mensagemTexto}`);
    return true;
  }

  await enviarMensagem(numero, "Responda com 1 para Sim ou 2 para Não.");
  return true;
}

async function iniciarFluxoRecuperacaoSenha(numero) {
  await atualizarAtendimento(numero, {
    modo: "bot",
    etapa: "recuperacao_senha_aguardando_botao",
  });

  await enviarMensagem(
    numero,
    'Para recuperar sua senha, toque no botao "Recuperar senha" na tela de login.\n\nVoce ja utilizou esse botao? Responda com sim ou nao.'
  );

  escreverLog(`FLUXO RECUPERACAO SENHA INICIADO | ${numero}`);
}

async function processarFluxoRecuperacaoSenha(numero, mensagemTexto, mensagemNormalizada, etapa) {
  if (etapa === "recuperacao_senha_aguardando_botao") {
    if (respostaNegativa(mensagemNormalizada)) {
      await atualizarAtendimento(numero, {
        etapa: "recuperacao_senha_aguardando_mesmo_whatsapp",
      });

      await enviarMensagem(
        numero,
        'Tudo bem. Primeiro toque no botao "Recuperar senha" na tela de login.\n\nO WhatsApp que voce esta usando agora e o mesmo cadastrado na sua conta?'
      );

      escreverLog(`RECUPERACAO SENHA | BOTAO NAO USADO | ${numero}`);
      return true;
    }

    if (respostaAfirmativa(mensagemNormalizada)) {
      await atualizarAtendimento(numero, {
        etapa: "recuperacao_senha_aguardando_mesmo_whatsapp",
      });

      await enviarMensagem(
        numero,
        "O WhatsApp que voce esta usando agora e o mesmo cadastrado na sua conta?"
      );

      escreverLog(`RECUPERACAO SENHA | BOTAO USADO | ${numero}`);
      return true;
    }

    await enviarMensagem(numero, "Responda apenas com sim ou nao: voce ja utilizou o botao Recuperar senha?");
    return true;
  }

  if (etapa === "recuperacao_senha_aguardando_mesmo_whatsapp") {
    if (respostaNegativa(mensagemNormalizada)) {
      await atualizarAtendimento(numero, {
        etapa: "recuperacao_senha_aguardando_novo_telefone",
      });

      await enviarMensagem(numero, "Informe o novo numero de telefone com DDD.");
      escreverLog(`RECUPERACAO SENHA | TROCA TELEFONE NECESSARIA | ${numero}`);
      return true;
    }

    if (respostaAfirmativa(mensagemNormalizada)) {
      await atualizarAtendimento(numero, { etapa: "liberado" });
      await enviarMensagem(
        numero,
        "Perfeito. Aguarde o codigo chegar nesse WhatsApp para criar uma nova senha."
      );
      escreverLog(`RECUPERACAO SENHA | MESMO WHATSAPP | ${numero}`);
      return true;
    }

    await enviarMensagem(numero, "Responda apenas com sim ou nao: este WhatsApp e o mesmo cadastrado na sua conta?");
    return true;
  }

  if (etapa === "recuperacao_senha_aguardando_novo_telefone") {
    const novoTelefone = mensagemTexto.trim();
    const motivo = "Troca de telefone para recuperacao de senha";

    await encaminharParaHumano(numero, motivo);
    await enviarMensagem(
      numero,
      "Sua solicitacao foi encaminhada para um operador. Ele vai verificar a troca de telefone para recuperacao de senha."
    );

    escreverLog(`RECUPERACAO SENHA | ENCAMINHADO HUMANO | ${numero} | ${novoTelefone}`);
    return true;
  }

  return false;
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

app.post("/api/fila/encerrar", async (req, res) => {
  const { numero } = req.body;

  if (!numero) {
    return res.status(400).json({ erro: "NÃºmero nÃ£o informado" });
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

      await atualizarAtendimento(numero, {
        modo: "bot",
        etapa: "liberado",
      });

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
      await enviarMensagem(numero, "OlÃ¡! Para iniciar o atendimento, informe seu nome.");
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
          `âŒ ${validacao.mensagem}\n\nPor favor, informe um CPF vÃ¡lido (apenas nÃºmeros).`
        );

        escreverLog(`CPF INVÃLIDO | ${numero} | ${mensagemTexto}`);
        return res.sendStatus(200);
      }

      await atualizarAtendimento(numero, {
        cpf: validacao.cpfFormatado,
        etapa: "aguardando_site",
      });

      await enviarMensagem(
        numero,
        "âœ… CPF registrado com sucesso!\n\nAgora informe em qual site ou plataforma vocÃª estava."
      );

      escreverLog(`CPF SALVO | ${numero} | ${validacao.cpfFormatado}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa === "confirmando_plataforma") {
      await processarConfirmacaoPlataforma(
        numero,
        mensagemTexto,
        mensagemNormalizada,
        atendimento
      );
      return res.sendStatus(200);
    }

    if (
      atendimento.etapa === "aguardando_site" ||
      atendimento.etapa === "aguardando_site_completo"
    ) {
      await processarEntradaPlataforma(numero, mensagemTexto, atendimento);
      return res.sendStatus(200);
    }

    if (
      await processarFluxoRecuperacaoSenha(
        numero,
        mensagemTexto,
        mensagemNormalizada,
        atendimento.etapa
      )
    ) {
      return res.sendStatus(200);
    }

    if (pediuRecuperacaoSenha(mensagemNormalizada)) {
      await iniciarFluxoRecuperacaoSenha(numero);
      return res.sendStatus(200);
    }

    let respostaEncontrada = buscarResposta(mensagemTexto);
    let resposta = respostaEncontrada.texto;
    let linkVideo = respostaEncontrada.linkVideo;

    if (!resposta || resposta.includes("Recebi sua mensagem")) {
      resposta = await perguntarIA(mensagemTexto);
      linkVideo = null;
    }

    escreverLog(`RESPOSTA | ${numero} | ${resposta}`);
    console.log("RESPOSTA ENVIADA");
    console.log(resposta);

    await enviarMensagem(numero, resposta);

    if (linkVideo) {
      await enviarMensagem(numero, linkVideo);
    }

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

