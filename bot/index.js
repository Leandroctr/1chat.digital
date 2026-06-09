const express = require("express");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
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
const { criarSupabaseStorage } = require("./src/supabaseStorage");
const { criarAtendimentosService } = require("./src/atendimentos");
const { criarFilaService } = require("./src/fila");
const { criarMensagemFinalStore } = require("./src/mensagemFinalStore");
const { criarMensagemFinalService } = require("./src/mensagemFinalService");
const {
  pediuOperador,
  usuarioConfirmouEncerramento,
  usuarioConfirmouVideo,
  usuarioNegouVideo,
} = require("./src/confirmacoes");
const {
  dataBanco,
  horarioAtual,
  normalizarTexto,
  primeiroNome,
} = require("./src/textUtils");
const { criarDb } = require("./src/db");
const { criarHumanoService } = require("./src/humano");
const { registrarAdminRoutes } = require("./src/adminRoutes");
const { registrarWebhookRoute } = require("./src/webhookRoute");

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

const pool = USAR_POSTGRES
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const {
  enviarMensagem,
  enviarImagem,
} = criarWahaClient({ WAHA_URL, WAHA_API_KEY, SESSION });
const {
  estaConfigurado: supabaseConfigurado,
  removerImagemFinal,
  uploadImagemFinal,
  uploadImagemMensagemFinal,
} = criarSupabaseStorage({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_BUCKET,
  escreverLog,
  logInfo,
  logWarn,
});

const mensagensProcessadas = new Set();

garantirPasta(PASTA_LOGS);
garantirArquivoJson(ARQUIVO_ATENDIMENTOS, {});
garantirArquivoJson(ARQUIVO_FILA, []);
garantirArquivoJson(ARQUIVO_CONFIG, CONFIG_PADRAO);
garantirArquivoJson(ARQUIVO_FINAL_MESSAGE_LOG, {});

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
const {
  carregarAtendimentos,
  salvarAtendimentos,
  obterOuCriarAtendimento,
  atualizarAtendimento,
  estaEmModoHumano,
  ativarModoHumano,
  limparAtendimento,
} = criarAtendimentosService({
  USAR_POSTGRES,
  pool,
  ARQUIVO_ATENDIMENTOS,
  carregarJson,
  salvarJson,
  horarioAtual,
  dataBanco,
  logState,
});
const {
  carregarFila,
  salvarFila,
  adicionarNaFila,
  removerDaFila,
} = criarFilaService({
  USAR_POSTGRES,
  pool,
  ARQUIVO_FILA,
  carregarJson,
  salvarJson,
  dataBanco,
  horarioAtual,
  obterOuCriarAtendimento,
});
const {
  buscarMensagensFinaisPendentes,
  podeEnviarMensagemFinal,
  registrarMensagemFinalEnviada,
  removerMensagemFinalPendente,
  salvarMensagemFinalPendente,
} = criarMensagemFinalStore({
  USAR_POSTGRES,
  pool,
  ARQUIVO_FINAL_MESSAGE_LOG,
  carregarJson,
  salvarJson,
});
const {
  cancelarTimerMensagemFinalPersistente,
  enviarMensagemFinal,
  iniciarFluxoEncerramento,
  iniciarFluxoPosResposta,
  iniciarPerguntaFinal,
  iniciarVerificadorMensagensFinaisPendentes,
} = criarMensagemFinalService({
  USAR_POSTGRES,
  carregarConfig,
  enviarImagem,
  enviarMensagem,
  podeEnviarMensagemFinal,
  registrarMensagemFinalEnviada,
  removerMensagemFinalPendente,
  salvarMensagemFinalPendente,
  buscarMensagensFinaisPendentes,
  obterOuCriarAtendimento,
  atualizarAtendimento,
  limparAtendimento,
  estaEmModoHumano,
  primeiroNome,
  escreverLog,
});
const { initDb } = criarDb({
  USAR_POSTGRES,
  pool,
});
const { encaminharParaHumano } = criarHumanoService({
  ativarModoHumano,
  adicionarNaFila,
  escreverLog,
});

registrarAdminRoutes({
  app,
  publicDir: path.join(__dirname, "public"),
  carregarFila,
  carregarConfig,
  salvarConfig,
  salvarConfigImagem,
  uploadImagemMensagemFinal,
  supabaseConfigurado,
  uploadImagemFinal,
  removerImagemFinal,
  removerDaFila,
  atualizarAtendimento,
  iniciarFluxoEncerramento,
  escreverLog,
  logInfo,
  logError,
});


registrarWebhookRoute({
  app,
  mensagensProcessadas,
  normalizarTexto,
  escreverLog,
  logInfo,
  logError,
  obterOuCriarAtendimento,
  cancelarTimerMensagemFinalPersistente,
  usuarioConfirmouEncerramento,
  enviarMensagemFinal,
  limparAtendimento,
  atualizarAtendimento,
  usuarioConfirmouVideo,
  iniciarPerguntaFinal,
  usuarioNegouVideo,
  encaminharParaHumano,
  estaEmModoHumano,
  pediuOperador,
  enviarMensagem,
  primeiroNome,
  validarCPF,
  buscarResposta,
  PERGUNTA_VIDEO,
  iniciarFluxoPosResposta,
  perguntarIA,
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
