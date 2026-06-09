function registrarWebhookRoute({
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
}) {
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
        await enviarMensagem(numero, "OlÃƒÆ’Ã‚Â¡! Para iniciar o atendimento, informe seu nome.");
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
            `ÃƒÂ¢Ã‚ÂÃ…â€™ ${validacao.mensagem}\n\nPor favor, informe um CPF vÃƒÆ’Ã‚Â¡lido (apenas nÃƒÆ’Ã‚Âºmeros).`
          );
  
          escreverLog(`CPF INVÃƒÆ’Ã‚ÂLIDO | ${numero} | ${mensagemTexto}`);
          return res.sendStatus(200);
        }
  
        await atualizarAtendimento(numero, {
          cpf: validacao.cpfFormatado,
          etapa: "aguardando_site",
        });
  
        await enviarMensagem(
          numero,
          "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CPF registrado com sucesso!\n\nAgora informe em qual site ou plataforma vocÃƒÆ’Ã‚Âª estava."
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
        await enviarMensagem(numero, "OlÃƒÆ’Ã‚Â¡! Para iniciar o atendimento, informe seu nome.");
        escreverLog(`CADASTRO INCOMPLETO | PEDIU NOME | ${numero}`);
        return res.sendStatus(200);
      }
  
      if (atendimento.etapa !== "liberado") {
        await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
        await enviarMensagem(numero, "OlÃƒÆ’Ã‚Â¡! Para iniciar o atendimento, informe seu nome.");
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
        "NÃƒÆ’Ã‚Â£o encontrei essa informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o agora. Vou encaminhar para atendimento humano."
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
}

module.exports = {
  registrarWebhookRoute,
};
