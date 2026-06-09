function criarMensagemFinalService({
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
}) {
  const timersMensagemFinal = new Map();
  let verificandoMensagensFinaisPendentes = false;

  async function enviarMensagemFinal(numero) {
    const config = await carregarConfig();

    if (
      !config.mensagem_final_ativa ||
      (!config.final_message_image_url && !config.mensagem_final.trim())
    ) {
      escreverLog(`MENSAGEM FINAL DESATIVADA | ${numero}`);
      return false;
    }

    if (!(await podeEnviarMensagemFinal(numero))) {
      escreverLog(`MENSAGEM FINAL JÁ ENVIADA HOJE | ${numero}`);
      return false;
    }

    let enviouAlgo = false;

    if (config.final_message_image_url) {
      try {
        await enviarImagem(numero, config.final_message_image_url);
        enviouAlgo = true;
        escreverLog(`IMAGEM MENSAGEM FINAL ENVIADA | ${numero}`);
      } catch (error) {
        escreverLog(`ERRO IMAGEM MENSAGEM FINAL | ${numero} | ${error.message}`);
      }
    }

    if (config.mensagem_final.trim()) {
      await enviarMensagem(numero, config.mensagem_final);
      enviouAlgo = true;
    }

    if (!enviouAlgo) {
      escreverLog(`MENSAGEM FINAL NAO ENVIADA | ${numero}`);
      return false;
    }

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

  async function cancelarTimerMensagemFinalPersistente(numero) {
    cancelarTimerMensagemFinal(numero);
    await removerMensagemFinalPendente(numero);
  }

  async function iniciarPerguntaFinal(numero, origem) {
    await cancelarTimerMensagemFinalPersistente(numero);

    const config = await carregarConfig();
    const atendimento = await obterOuCriarAtendimento(numero);
    const nome = primeiroNome(atendimento.nome);
    const pergunta = nome
      ? `${nome}, ${config.pergunta_confirmacao_final.charAt(0).toLowerCase()}${config.pergunta_confirmacao_final.slice(1)}`
      : config.pergunta_confirmacao_final;

    await enviarMensagem(numero, pergunta);
    escreverLog(`FINAL PERGUNTA ENVIADA | ${numero} | ${origem}`);
    await salvarMensagemFinalPendente(numero, origem, config.delay_mensagem_final_segundos);

    const timer = setTimeout(async () => {
      timersMensagemFinal.delete(numero);

      try {
        await enviarMensagemFinal(numero);
        await limparAtendimento(numero);
        await removerMensagemFinalPendente(numero);
        escreverLog(`FINAL AUTOMATICO | ${numero} | ${origem}`);
      } catch (error) {
        escreverLog(`ERRO FINAL AUTOMATICO | ${numero} | ${origem} | ${error.message}`);
      }
    }, config.delay_mensagem_final_segundos * 1000);

    timersMensagemFinal.set(numero, timer);
    escreverLog(`TIMER FINAL INICIADO | ${numero} | ${origem}`);
  }

  async function iniciarFluxoEncerramento(numero) {
    await iniciarPerguntaFinal(numero, "encerramento_humano");
  }

  async function iniciarFluxoPosResposta(numero) {
    if (timersMensagemFinal.has(numero)) {
      escreverLog(`TIMER POS RESPOSTA JA EXISTE | ${numero}`);
      return;
    }

    if (await estaEmModoHumano(numero)) {
      escreverLog(`POS RESPOSTA IGNORADO MODO HUMANO | ${numero}`);
      return;
    }

    const atendimento = await obterOuCriarAtendimento(numero);

    if (atendimento?.etapa !== "liberado") {
      escreverLog(`POS RESPOSTA IGNORADO ETAPA | ${numero} | ${atendimento?.etapa || "sem_atendimento"}`);
      return;
    }

    const config = await carregarConfig();

    if (
      !config.mensagem_final_ativa ||
      (!config.final_message_image_url && !config.mensagem_final.trim())
    ) {
      escreverLog(`POS RESPOSTA IGNORADO MENSAGEM FINAL DESATIVADA | ${numero}`);
      return;
    }

    await atualizarAtendimento(numero, {
      modo: "bot",
      etapa: "aguardando_confirmacao_pos_resposta",
    });
    await iniciarPerguntaFinal(numero, "pos_resposta");
  }

  async function verificarMensagensFinaisPendentes() {
    if (!USAR_POSTGRES || verificandoMensagensFinaisPendentes) return;

    verificandoMensagensFinaisPendentes = true;

    try {
      const pendentes = await buscarMensagensFinaisPendentes();

      for (const item of pendentes) {
        try {
          cancelarTimerMensagemFinal(item.numero);
          await enviarMensagemFinal(item.numero);
          await limparAtendimento(item.numero);
          await removerMensagemFinalPendente(item.numero);
          escreverLog(`FINAL AUTOMATICO PERSISTENTE | ${item.numero} | ${item.origem || "sem_origem"}`);
        } catch (error) {
          escreverLog(`ERRO FINAL AUTOMATICO PERSISTENTE | ${item.numero} | ${error.message}`);
        }
      }
    } catch (error) {
      escreverLog(`ERRO VERIFICAR FINAL PENDENTE | ${error.message}`);
    } finally {
      verificandoMensagensFinaisPendentes = false;
    }
  }

  function iniciarVerificadorMensagensFinaisPendentes() {
    if (!USAR_POSTGRES) return;

    setInterval(verificarMensagensFinaisPendentes, 5000);
    verificarMensagensFinaisPendentes();
  }

  return {
    cancelarTimerMensagemFinalPersistente,
    enviarMensagemFinal,
    iniciarFluxoEncerramento,
    iniciarFluxoPosResposta,
    iniciarPerguntaFinal,
    iniciarVerificadorMensagensFinaisPendentes,
  };
}

module.exports = {
  criarMensagemFinalService,
};
