const path = require("path");
const crypto = require("crypto");

function valoresIguais(valorA = "", valorB = "") {
  const bufferA = Buffer.from(String(valorA));
  const bufferB = Buffer.from(String(valorB));

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function registrarAdminRoutes({
  app,
  publicDir,
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
  obterMetricasHoje,
  ADMIN_PASSWORD,
  ADMIN_USER,
  escreverLog,
  logInfo,
  logWarn,
  logError,
}) {
  const credenciaisConfiguradas = Boolean(ADMIN_USER && ADMIN_PASSWORD);

  if (!credenciaisConfiguradas) {
    logWarn(
      "ADMIN",
      "ADMIN_USER ou ADMIN_PASSWORD nao configurado; login bloqueado"
    );
    escreverLog("ADMIN LOGIN BLOQUEADO | credenciais nao configuradas");
  }

  function autenticarAdmin(req, res, next) {
    if (req.session?.adminAutenticado) {
      return next();
    }

    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ erro: "Login necessario" });
    }

    return res.redirect("/admin/login");
  }

  app.get("/health", (req, res) => {
    res.status(200).json({
      ok: true,
      service: "1chat-bot",
      mode: process.env.NODE_ENV || "local",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/admin/login", (req, res) => {
    if (req.session?.adminAutenticado) {
      return res.redirect("/admin");
    }

    return res.sendFile(path.join(publicDir, "login.html"));
  });

  app.post("/admin/login", (req, res) => {
    if (!credenciaisConfiguradas) {
      escreverLog("ADMIN LOGIN RECUSADO | credenciais nao configuradas");
      return res.redirect("/admin/login?erro=config");
    }

    const usuario = req.body?.usuario || "";
    const senha = req.body?.senha || "";

    if (
      valoresIguais(usuario, ADMIN_USER) &&
      valoresIguais(senha, ADMIN_PASSWORD)
    ) {
      req.session.adminAutenticado = true;
      escreverLog(`ADMIN LOGIN OK | ${usuario}`);
      return res.redirect("/admin");
    }

    escreverLog(`ADMIN LOGIN INVALIDO | ${usuario || "sem usuario"}`);
    return res.redirect("/admin/login?erro=credenciais");
  });

  app.post("/admin/logout", autenticarAdmin, (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        logError("ADMIN", "Erro ao encerrar sessao admin", error);
        return res.redirect("/admin");
      }

      res.clearCookie("1chat.admin.sid");
      return res.redirect("/admin/login");
    });
  });

  app.get("/admin", autenticarAdmin, (req, res) => {
    res.sendFile(path.join(publicDir, "admin.html"));
  });

  app.get("/api/fila", autenticarAdmin, async (req, res) => {
    const fila = await carregarFila();
    res.json(fila);
  });

  app.get("/api/config", autenticarAdmin, async (req, res) => {
    res.json(await carregarConfig());
  });

  app.get("/api/metrics/today", autenticarAdmin, async (req, res) => {
    res.json(await obterMetricasHoje());
  });

  app.post("/api/config", autenticarAdmin, async (req, res) => {
    const config = await salvarConfig(req.body || {});
    res.json(config);
  });

  app.post(
    "/api/config/final-message-image",
    autenticarAdmin,
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

  app.delete(
    "/api/config/final-message-image",
    autenticarAdmin,
    async (req, res) => {
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
    }
  );

  app.post("/api/fila/encerrar", autenticarAdmin, async (req, res) => {
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
}

module.exports = {
  registrarAdminRoutes,
};
