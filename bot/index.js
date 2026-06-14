const express = require("express");
const path = require("path");
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
  pareceNomeCliente,
  primeiroNome,
} = require("./src/textUtils");
const { criarDb } = require("./src/db");
const { criarHumanoService } = require("./src/humano");
const { criarMetricsService } = require("./src/metrics");
const { registrarAdminRoutes } = require("./src/adminRoutes");
const { registrarWebhookRoute } = require("./src/webhookRoute");
const { configurarMiddlewares } = require("./src/appMiddleware");
const {
  PORT,
  ADMIN_PASSWORD,
  ADMIN_USER,
  SESSION,
  SESSION_SECRET,
  SUPABASE_BUCKET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  USAR_POSTGRES,
  WAHA_API_KEY,
  WAHA_URL,
} = require("./src/env");

const app = express();

const pool = USAR_POSTGRES
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

configurarMiddlewares({
  app,
  pool,
  publicDir: path.join(__dirname, "public"),
  SESSION_SECRET,
  logWarn,
});
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

const {
  adicionarResposta,
  atualizarResposta,
  buscarResposta,
  listarRespostas,
  removerResposta,
} = criarRespostasService({
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
const {
  obterMetricasHoje,
  registrarEventoEncaminhamentoHumano,
} = criarMetricsService({
  USAR_POSTGRES,
  pool,
  obterOuCriarAtendimento,
  escreverLog,
  logError,
});
const { encaminharParaHumano } = criarHumanoService({
  ativarModoHumano,
  adicionarNaFila,
  estaEmModoHumano,
  registrarEventoEncaminhamentoHumano,
  enviarMensagem,
  escreverLog,
});

registrarAdminRoutes({
  app,
  USAR_POSTGRES,
  pool,
  publicDir: path.join(__dirname, "public"),
  carregarFila,
  carregarConfig,
  salvarConfig,
  salvarConfigImagem,
  uploadImagemMensagemFinal,
  supabaseConfigurado,
  uploadImagemFinal,
  removerImagemFinal,
  listarRespostas,
  adicionarResposta,
  atualizarResposta,
  removerResposta,
  buscarResposta,
  removerDaFila,
  atualizarAtendimento,
  iniciarFluxoEncerramento,
  obterMetricasHoje,
  ADMIN_PASSWORD,
  ADMIN_USER,
  escreverLog,
  logInfo,
  logWarn,
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
  usuarioNegouVideo,
  encaminharParaHumano,
  estaEmModoHumano,
  pediuOperador,
  enviarMensagem,
  pareceNomeCliente,
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
