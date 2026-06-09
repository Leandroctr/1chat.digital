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
      if (!supabaseConfigurado()) {
        return res.status(500).json({ erro: "Supabase nao configurado" });
      }

      if (!req.file) {
        return res.status(400).json({ erro: "Imagem nao enviada" });
      }

      const configAtual = await carregarConfig();
      const imagemAntigaPath = configAtual.final_message_image_path;

      const imagem = await uploadImagemFinal({
        file: req.file,
        imagemAntigaPath,
      });
      const config = await salvarConfigImagem(imagem);

      escreverLog(`IMAGEM MENSAGEM FINAL CONFIGURADA | ${imagem.final_message_image_path}`);
      logInfo("SUPABASE", "Imagem mensagem final configurada", {
        path: imagem.final_message_image_path,
      });
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

    if (supabaseConfigurado() && configAtual.final_message_image_path) {
      await removerImagemFinal(configAtual.final_message_image_path);
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
      await enviarMensagem(numero, "OlÃ¡! Para iniciar o atendimento, informe seu nome.");
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
      await enviarMensagem(numero, "OlÃ¡! Para iniciar o atendimento, informe seu nome.");
      escreverLog(`CADASTRO INCOMPLETO | PEDIU NOME | ${numero}`);
      return res.sendStatus(200);
    }

    if (atendimento.etapa !== "liberado") {
      await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
      await enviarMensagem(numero, "OlÃ¡! Para iniciar o atendimento, informe seu nome.");
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
      "NÃ£o encontrei essa informaÃ§Ã£o agora. Vou encaminhar para atendimento humano."
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
