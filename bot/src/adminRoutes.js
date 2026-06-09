const path = require("path");

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
  escreverLog,
  logInfo,
  logError,
}) {
  app.get("/health", (req, res) => {
    res.status(200).json({
      ok: true,
      service: "1chat-bot",
      mode: process.env.NODE_ENV || "local",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/admin", (req, res) => {
    res.sendFile(path.join(publicDir, "admin.html"));
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
      return res.status(400).json({ erro: "NÃƒÂºmero nÃƒÂ£o informado" });
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
