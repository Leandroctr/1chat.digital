const fs = require("fs");
const path = require("path");
const {
  PASTA_LOGS,
  ARQUIVO_APP_LOG,
  ARQUIVO_ERROR_LOG,
} = require("./paths");

function garantirPasta(caminho) {
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
}

function dataAtual() {
  return new Date().toISOString().split("T")[0];
}

function timestampLog() {
  const data = new Date();
  const pad = (valor) => String(valor).padStart(2, "0");

  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())} ${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}`;
}

function sanitizarLog(valor) {
  return String(valor || "")
    .replace(/SUPABASE_SERVICE_ROLE_KEY=[^\s|]+/gi, "SUPABASE_SERVICE_ROLE_KEY=[redacted]")
    .replace(/WAHA_API_KEY=[^\s|]+/gi, "WAHA_API_KEY=[redacted]")
    .replace(/DATABASE_URL=[^\s|]+/gi, "DATABASE_URL=[redacted]")
    .replace(/token=[^\s|]+/gi, "token=[redacted]")
    .slice(0, 700);
}

function escreverLinhaLog(arquivo, linha) {
  garantirPasta(PASTA_LOGS);
  fs.appendFileSync(arquivo, `${linha}\n`, "utf8");
}

function escreverLog(texto) {
  const mensagem = sanitizarLog(texto);
  const categoria = mensagem.startsWith("ERRO") ? "ERRO" : "LOG";
  const nivel = categoria === "ERRO" ? "ERROR" : "INFO";
  const linha = `[${timestampLog()}] [${nivel}] [${categoria}] ${mensagem}`;

  escreverLinhaLog(ARQUIVO_APP_LOG, linha);

  if (nivel === "ERROR") {
    escreverLinhaLog(ARQUIVO_ERROR_LOG, linha);
  }
}

function logInfo(categoria, mensagem, dados = {}) {
  const extras = Object.entries(dados)
    .filter(([chave, valor]) => valor !== undefined && valor !== null && !/key|token|secret|password|database_url/i.test(chave))
    .map(([chave, valor]) => `${chave}=${sanitizarLog(valor)}`)
    .join(" | ");

  escreverLinhaLog(
    ARQUIVO_APP_LOG,
    `[${timestampLog()}] [INFO] [${categoria}] ${sanitizarLog(mensagem)}${extras ? ` | ${extras}` : ""}`
  );
}

function logWarn(categoria, mensagem, dados = {}) {
  const extras = Object.entries(dados)
    .filter(([chave, valor]) => valor !== undefined && valor !== null && !/key|token|secret|password|database_url/i.test(chave))
    .map(([chave, valor]) => `${chave}=${sanitizarLog(valor)}`)
    .join(" | ");

  escreverLinhaLog(
    ARQUIVO_APP_LOG,
    `[${timestampLog()}] [WARN] [${categoria}] ${sanitizarLog(mensagem)}${extras ? ` | ${extras}` : ""}`
  );
}

function logError(categoria, mensagem, error, dados = {}) {
  const detalhes = {
    ...dados,
    erro: error?.message || error,
    status: error?.response?.status,
  };
  const extras = Object.entries(detalhes)
    .filter(([chave, valor]) => valor !== undefined && valor !== null && !/key|token|secret|password|database_url/i.test(chave))
    .map(([chave, valor]) => `${chave}=${sanitizarLog(valor)}`)
    .join(" | ");
  const linha = `[${timestampLog()}] [ERROR] [${categoria}] ${sanitizarLog(mensagem)}${extras ? ` | ${extras}` : ""}`;

  escreverLinhaLog(ARQUIVO_APP_LOG, linha);
  escreverLinhaLog(ARQUIVO_ERROR_LOG, linha);
}

function logState(numero, etapaAnterior, etapaNova, motivo) {
  escreverLinhaLog(
    ARQUIVO_APP_LOG,
    `[${timestampLog()}] [STATE] numero=${sanitizarLog(numero)} | ${sanitizarLog(etapaAnterior || "-")} -> ${sanitizarLog(etapaNova || "-")} | motivo=${sanitizarLog(motivo || "atualizar_atendimento")}`
  );
}

function rotacionarArquivoLog(nomeBase) {
  const arquivoAtual = path.join(PASTA_LOGS, `${nomeBase}.log`);

  if (!fs.existsSync(arquivoAtual)) {
    fs.writeFileSync(arquivoAtual, "", "utf8");
    return;
  }

  const dataArquivo = fs.statSync(arquivoAtual).mtime.toISOString().split("T")[0];

  if (dataArquivo === dataAtual()) return;

  const destino = path.join(PASTA_LOGS, `${nomeBase}-${dataArquivo}.log`);

  if (fs.existsSync(destino)) {
    fs.unlinkSync(destino);
  }

  fs.renameSync(arquivoAtual, destino);
  fs.writeFileSync(arquivoAtual, "", "utf8");
}

function limparLogsAntigos() {
  const hoje = dataAtual();
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const manter = new Set(["app.log", "error.log", `app-${hoje}.log`, `error-${hoje}.log`, `app-${ontem}.log`, `error-${ontem}.log`]);

  for (const arquivo of fs.readdirSync(PASTA_LOGS)) {
    if (/^(app|error)-\d{4}-\d{2}-\d{2}\.log$/.test(arquivo) && !manter.has(arquivo)) {
      fs.unlinkSync(path.join(PASTA_LOGS, arquivo));
    }
  }
}

function rotacionarLogsNoStartup() {
  try {
    garantirPasta(PASTA_LOGS);
    rotacionarArquivoLog("app");
    rotacionarArquivoLog("error");
    limparLogsAntigos();
    logInfo("LOG", "Rotacao de logs executada");
  } catch (error) {
    try {
      logWarn("LOG", "Falha ao limpar logs antigos", { erro: error.message });
    } catch {
      console.error("Falha ao rotacionar logs", error.message);
    }
  }
}

module.exports = {
  escreverLog,
  logInfo,
  logWarn,
  logError,
  logState,
  rotacionarLogsNoStartup,
};
