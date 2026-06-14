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

  function logMensagemFinal(evento, numero, dados = {}) {
    const detalhes = Object.entries(dados)
      .filter(([, valor]) => valor !== undefined && valor !== null)
      .map(([chave, valor]) => `${chave}=${valor}`)
      .join(" | ");
    const linha = `[FINAL_MESSAGE] ${evento} | numero=${numero}${detalhes ? ` | ${detalhes}` : ""}`;

    console.log(linha);
    escreverLog(linha);
  }

  async function enviarMensagemFinal(numero) {
    const config = await carregarConfig();
    const temImagem = Boolean(config.final_message_image_url);
    const temTexto = Boolean(config.mensagem_final.trim());

    logMensagemFinal("checagem_config", numero, {
      ativa: config.mensagem_final_ativa ? "sim" : "nao",
      imagem: temImagem ? "sim" : "nao",
      texto: temTexto ? "sim" : "nao",
      regra: "uma_vez_por_dia_calendario",
    });

    if (
      !config.mensagem_final_ativa ||
      (!temImagem && !temTexto)
    ) {
      logMensagemFinal("nao_enviada_config_desativada", numero);
      return false;
    }

    const registrouEnvio = await registrarMensagemFinalEnviada(numero);

    if (!registrouEnvio) {
      logMensagemFinal("bloqueada_ja_enviada_hoje", numero);
      return false;
    }

    let enviouAlgo = false;

    if (temImagem) {
      try {
        logMensagemFinal("enviando_imagem", numero);
        await enviarImagem(numero, config.final_message_image_url);
        enviouAlgo = true;
        logMensagemFinal("imagem_enviada", numero);
      } catch (error) {
        logMensagemFinal("erro_imagem", numero, { erro: error.message });
      }
    }

    if (temTexto) {
      logMensagemFinal("enviando_texto", numero);
      await enviarMensagem(numero, config.mensagem_final);
      enviouAlgo = true;
      logMensagemFinal("texto_enviado", numero);
    }

    if (!enviouAlgo) {
      logMensagemFinal("nao_enviada_sem_midia_ou_texto_entregue", numero);
      return false;
    }

    logMensagemFinal("enviada", numero);
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

    await atualizarAtendimento(numero, {
      modo: "bot",
      etapa: "aguardando_confirmacao_pos_resposta",
    });

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
