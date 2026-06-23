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
  USAR_POSTGRES,
  pool,
  publicDir,
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
  obterStatusWaha,
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
    escreverLog("[ADMIN_LOGIN] tentativa");
    escreverLog(
      `[ADMIN_LOGIN] admin_user_configurado=${ADMIN_USER ? "sim" : "nao"}`
    );
    escreverLog(
      `[ADMIN_LOGIN] admin_password_configurado=${ADMIN_PASSWORD ? "sim" : "nao"}`
    );

    if (!credenciaisConfiguradas) {
      escreverLog("[ADMIN_LOGIN] falha | motivo=credenciais_nao_configuradas");
      escreverLog("ADMIN LOGIN RECUSADO | credenciais nao configuradas");
      return res.redirect("/admin/login?erro=config");
    }

    const usuario = req.body?.usuario || "";
    const senha = req.body?.senha || "";
    const usuarioOk = valoresIguais(usuario, ADMIN_USER);
    const senhaOk = valoresIguais(senha, ADMIN_PASSWORD);

    escreverLog(
      `[ADMIN_LOGIN] user_recebido=${usuario ? "sim" : "nao"} | tamanho=${String(usuario).length}`
    );
    escreverLog(`[ADMIN_LOGIN] usuario_ok=${usuarioOk}`);
    escreverLog(`[ADMIN_LOGIN] senha_ok=${senhaOk}`);

    if (usuarioOk && senhaOk) {
      req.session.adminAutenticado = true;
      return req.session.save((error) => {
        if (error) {
          escreverLog(`[ADMIN_LOGIN] falha | motivo=sessao | ${error.message}`);
          logError("ADMIN", "Erro ao salvar sessao admin", error);
          return res.redirect("/admin/login?erro=sessao");
        }

        escreverLog("[ADMIN_LOGIN] sucesso");
        escreverLog("ADMIN LOGIN OK");
        return res.redirect("/admin");
      });
    }

    escreverLog("[ADMIN_LOGIN] falha | motivo=credenciais");
    escreverLog("ADMIN LOGIN INVALIDO");
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

  app.get(
    ["/api/waha-status", "/admin/api/waha-status"],
    autenticarAdmin,
    async (req, res) => {
      try {
        return res.json(await obterStatusWaha());
      } catch (error) {
        logError("ADMIN", "Erro ao consultar status WAHA", error);
        return res.json({
          ok: false,
          status: "error",
          label: "WAHA desconectado",
          detail: "Tunnel/WAHA indisponivel",
          action: "Disponibilidade Offline",
          checkedAt: new Date().toISOString(),
        });
      }
    }
  );

  app.get("/api/respostas", autenticarAdmin, (req, res) => {
    res.json(listarRespostas());
  });

  app.post("/api/respostas/testar", autenticarAdmin, (req, res) => {
    const mensagem = String(req.body?.mensagem || "").trim();

    if (!mensagem) {
      return res.status(400).json({ erro: "Mensagem de teste nao informada" });
    }

    const resposta = buscarResposta(mensagem);

    if (!resposta) {
      return res.json({
        encontrou: false,
        mensagem,
      });
    }

    return res.json({
      encontrou: true,
      mensagem,
      resposta: resposta.texto,
      video: resposta.linkVideo || "",
      encaminhar_humano: Boolean(resposta.encaminharHumano),
    });
  });

  app.post("/api/respostas", autenticarAdmin, async (req, res) => {
    try {
      return res.status(201).json(await adicionarResposta(req.body || {}));
    } catch (error) {
      logError("ADMIN", "Erro ao adicionar resposta", error);
      return res.status(error.status || 400).json({ erro: error.message });
    }
  });

  app.put("/api/respostas/:id", autenticarAdmin, async (req, res) => {
    try {
      return res.json(await atualizarResposta(req.params.id, req.body || {}));
    } catch (error) {
      logError("ADMIN", "Erro ao atualizar resposta", error);
      return res.status(error.status || 400).json({ erro: error.message });
    }
  });

  app.delete("/api/respostas/:id", autenticarAdmin, async (req, res) => {
    try {
      return res.json(await removerResposta(req.params.id));
    } catch (error) {
      logError("ADMIN", "Erro ao remover resposta", error);
      return res.status(error.status || 400).json({ erro: error.message });
    }
  });

  app.post("/api/admin/reset-operacional", autenticarAdmin, async (req, res) => {
    escreverLog("ADMIN RESET OPERACIONAL SOLICITADO");

    if (!ADMIN_PASSWORD) {
      escreverLog(
        "ADMIN RESET OPERACIONAL ERRO | ADMIN_PASSWORD nao configurado"
      );
      return res.status(500).json({
        erro: "Senha admin nao configurada. Configure ADMIN_PASSWORD.",
      });
    }

    if (!valoresIguais(req.body?.password || "", ADMIN_PASSWORD)) {
      escreverLog("ADMIN RESET OPERACIONAL SENHA INVALIDA");
      return res.status(401).json({ erro: "Senha admin invalida." });
    }

    if (!USAR_POSTGRES) {
      escreverLog("ADMIN RESET OPERACIONAL ERRO | PostgreSQL nao configurado");
      return res.status(500).json({
        erro: "Reset operacional disponivel apenas com PostgreSQL.",
      });
    }

    try {
      await pool.query(`
        TRUNCATE fila, atendimentos, final_message_log,
          final_message_pending
        RESTART IDENTITY
      `);

      escreverLog("ADMIN RESET OPERACIONAL EXECUTADO");
      return res.json({ ok: true });
    } catch (error) {
      escreverLog(`ADMIN RESET OPERACIONAL ERRO | ${error.message}`);
      logError("ADMIN", "Erro no reset operacional", error);
      return res.status(500).json({
        erro: "Nao foi possivel executar o reset operacional.",
      });
    }
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
