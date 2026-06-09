const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PASTA_LOGS = path.join(ROOT_DIR, "logs");

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  ARQUIVO_RESPOSTAS: path.join(DATA_DIR, "respostas.xlsx"),
  ARQUIVO_CONFIG: path.join(DATA_DIR, "config.json"),
  PASTA_LOGS,
  ARQUIVO_APP_LOG: path.join(PASTA_LOGS, "app.log"),
  ARQUIVO_ERROR_LOG: path.join(PASTA_LOGS, "error.log"),
  ARQUIVO_ATENDIMENTOS: path.join(DATA_DIR, "atendimentos.json"),
  ARQUIVO_FILA: path.join(DATA_DIR, "fila.json"),
  ARQUIVO_FINAL_MESSAGE_LOG: path.join(DATA_DIR, "final-message-log.json"),
};
