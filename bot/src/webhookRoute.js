const {
  ETAPA_RECUPERACAO_SENHA_AGUARDANDO_NOVO_TELEFONE,
  ETAPA_RECUPERACAO_SENHA_ORIENTADO,
  MENSAGEM_RECUPERACAO_SENHA,
  MENSAGEM_RECUPERACAO_SENHA_NOVO_TELEFONE_RECEBIDO,
  MENSAGEM_RECUPERACAO_SENHA_TROCA_TELEFONE,
  classificarRecuperacaoSenha,
  criarContextoTrocaTelefoneRecuperacaoSenha,
  extrairTelefoneInformado,
} = require("./passwordRecovery");

function registrarWebhookRoute({
  app,
  mensagensProcessadas,
  normalizarTexto,
  escreverLog,
  logInfo,
  logError,
  obterOuCriarAtendimento,
  cancelarTimerMensagemFinalPersistente,
  registrarMetricasMensagem,
  usuarioConfirmouEncerramento,
  enviarMensagemFinal,
  limparAtendimento,
  atualizarAtendimento,
  usuarioConfirmouVideo,
  usuarioNegouVideo,
  encaminharParaHumano,
  estaEmModoHumano,
  ETAPA_CONFIRMAR_FILA_FORA_HORARIO,
  pediuOperador,
  enviarMensagem,
  pareceNomeCliente,
  primeiroNome,
  validarCPF,
  buscarResposta,
  PERGUNTA_VIDEO,
  iniciarFluxoPosResposta,
  perguntarIA,
  carregarConfig,
  identificarPlataforma,
  montarMensagemConfirmacaoPlataforma,
  PLATFORM_CONFIRMATION_ENABLED,
  respostaNaoPlataforma,
  respostaSimPlataforma,
}) {
  const encerramentosRecentes = new Map();
  const TEMPO_BLOQUEIO_ENCERRAMENTO_MS = 5 * 60 * 1000;

  function usuarioRepetiuNegacaoEncerramento(mensagemNormalizada) {
    return ["nao", "n", "nao obrigado", "nao obrigada"].includes(mensagemNormalizada);
  }

  function marcarEncerramentoRecente(numero) {
    const timerAnterior = encerramentosRecentes.get(numero);

    if (timerAnterior) {
      clearTimeout(timerAnterior);
    }

    const timer = setTimeout(() => {
      encerramentosRecentes.delete(numero);
    }, TEMPO_BLOQUEIO_ENCERRAMENTO_MS);

    encerramentosRecentes.set(numero, timer);
  }

  async function buscarPlataformaPorKey(key) {
    const config = await carregarConfig();
    return (config.plataformas || []).find((plataforma) => plataforma.key === key) || null;
  }

  async function responderPlataformaLiberada(numero, atendimento) {
    await enviarMensagem(
      numero,
      atendimento.nome
        ? `Perfeito, ${primeiroNome(atendimento.nome)}. Agora me diga como posso ajudar.`
        : "Perfeito. Agora me diga como posso ajudar."
    );
  }

  async function salvarPlataformaSemConfirmacao(numero, mensagemTexto, atendimento) {
    await atualizarAtendimento(numero, {
      site: mensagemTexto,
      platform_key: null,
      platform_name: null,
      platform_url: null,
      platform_raw: mensagemTexto,
      platform_confirmed: false,
      platform_candidate_key: null,
      platform_attempts: 0,
      etapa: "liberado",
    });

    await responderPlataformaLiberada(numero, atendimento);
    escreverLog(`PLATAFORMA NAO CONFIRMADA | ${numero} | ${mensagemTexto}`);
  }

  async function pedirEnderecoCompletoPlataforma(numero, mensagemTexto, tentativas) {
    await atualizarAtendimento(numero, {
      site: null,
      platform_key: null,
      platform_name: null,
      platform_url: null,
      platform_raw: mensagemTexto,
      platform_confirmed: false,
      platform_candidate_key: null,
      platform_attempts: tentativas,
      etapa: "aguardando_site_completo",
    });

    await enviarMensagem(
      numero,
      "Não consegui confirmar a plataforma com segurança.\n\nPor favor, envie o endereço completo do site ou app em que você está jogando."
    );
  }

  async function pedirConfirmacaoPlataforma(numero, mensagemTexto, plataforma) {
    await atualizarAtendimento(numero, {
      site: null,
      platform_key: null,
      platform_name: null,
      platform_url: null,
      platform_raw: mensagemTexto,
      platform_confirmed: false,
      platform_candidate_key: plataforma.key,
      platform_attempts: 0,
      etapa: "confirmando_plataforma",
    });

    await enviarMensagem(numero, montarMensagemConfirmacaoPlataforma(plataforma));
    escreverLog(`PLATAFORMA CANDIDATA | ${numero} | ${plataforma.key} | ${mensagemTexto}`);
  }

  async function processarEntradaPlataforma(numero, mensagemTexto, atendimento) {
    if (!PLATFORM_CONFIRMATION_ENABLED) {
      await atualizarAtendimento(numero, {
        site: mensagemTexto,
        etapa: "liberado",
      });

      await responderPlataformaLiberada(numero, atendimento);
      escreverLog(`SITE SALVO | ${numero} | ${mensagemTexto}`);
      return;
    }

    const config = await carregarConfig();
    const resultado = identificarPlataforma(mensagemTexto, config.plataformas || []);

    if (resultado.status === "forte") {
      await pedirConfirmacaoPlataforma(numero, mensagemTexto, resultado.plataforma);
      return;
    }

    const tentativas = Number(atendimento.platform_attempts || 0) + 1;

    if (atendimento.etapa === "aguardando_site_completo" && tentativas >= 2) {
      await salvarPlataformaSemConfirmacao(numero, mensagemTexto, atendimento);
      return;
    }

    await pedirEnderecoCompletoPlataforma(numero, mensagemTexto, tentativas);
    escreverLog(`PLATAFORMA SEM MATCH SEGURO | ${numero} | ${resultado.status} | ${mensagemTexto}`);
  }

  async function processarConfirmacaoPlataforma(numero, mensagemTexto, mensagemNormalizada, atendimento) {
    if (!PLATFORM_CONFIRMATION_ENABLED) {
      await processarEntradaPlataforma(numero, mensagemTexto, atendimento);
      return;
    }

    const plataforma = await buscarPlataformaPorKey(atendimento.platform_candidate_key);

    if (respostaSimPlataforma(mensagemNormalizada) && plataforma) {
      await atualizarAtendimento(numero, {
        site: `${plataforma.name} - ${plataforma.url}`,
        platform_key: plataforma.key,
        platform_name: plataforma.name,
        platform_url: plataforma.url,
        platform_confirmed: true,
        platform_candidate_key: null,
        platform_attempts: 0,
        etapa: "liberado",
      });

      await responderPlataformaLiberada(numero, atendimento);
      escreverLog(`PLATAFORMA CONFIRMADA | ${numero} | ${plataforma.key}`);
      return;
    }

    if (respostaNaoPlataforma(mensagemNormalizada) || !plataforma) {
      await atualizarAtendimento(numero, {
        platform_key: null,
        platform_name: null,
        platform_url: null,
        platform_confirmed: false,
        platform_candidate_key: null,
        platform_attempts: Number(atendimento.platform_attempts || 0) + 1,
        etapa: "aguardando_site",
      });

      await enviarMensagem(
        numero,
        "Certo. Por favor, envie o nome ou o endereço completo da plataforma em que você está jogando."
      );
      escreverLog(`PLATAFORMA NEGADA | ${numero} | ${mensagemTexto}`);
      return;
    }

    await enviarMensagem(numero, "Responda com 1 para Sim ou 2 para Não.");
  }

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
      await registrarMetricasMensagem({ numero, mensagemTexto });
      console.log("=================================");
      console.log("MENSAGEM RECEBIDA");
      console.log(mensagemTexto);

      const atendimento = await obterOuCriarAtendimento(numero);

      if (
        encerramentosRecentes.has(numero) &&
        usuarioRepetiuNegacaoEncerramento(mensagemNormalizada)
      ) {
        escreverLog(`[WEBHOOK] mensagem_final_fluxo_encerrado | ${numero} | ${mensagemTexto}`);
        return res.sendStatus(200);
      }

      if (atendimento.etapa === "aguardando_confirmacao_final") {
        await cancelarTimerMensagemFinalPersistente(numero);

        if (usuarioConfirmouEncerramento(mensagemNormalizada)) {
          escreverLog(`CONFIRMACAO FINAL | ${numero}`);
          await enviarMensagemFinal(numero);
          await limparAtendimento(numero);
          marcarEncerramentoRecente(numero);
          escreverLog(`[WEBHOOK] mensagem_final_fluxo_encerrado | ${numero}`);
          escreverLog(`ENCERRAMENTO CONFIRMADO | ${numero}`);
          escreverLog(`[WEBHOOK] encerramento_confirmado_return | ${numero}`);
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
            etapa: "liberado",
          });
          atendimento.modo = "bot";
          atendimento.etapa = "liberado";
          await enviarMensagem(numero, "Que bom. Se precisar de mais alguma coisa, e so me chamar.");
          await iniciarFluxoPosResposta(numero);
          escreverLog(`[WEBHOOK] encerramento_confirmado_return | ${numero}`);
          return res.sendStatus(200);
        }

        if (usuarioNegouVideo(mensagemNormalizada)) {
          escreverLog(`CONFIRMACAO VIDEO NEGATIVA | ${numero} | ${mensagemTexto}`);
          await encaminharParaHumano(numero, mensagemTexto);
          escreverLog(`[WEBHOOK] negacao_video_return | ${numero}`);
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
          marcarEncerramentoRecente(numero);
          escreverLog(`[WEBHOOK] mensagem_final_fluxo_encerrado | ${numero}`);
          escreverLog(`POS RESPOSTA ENCERRADO PELO USUARIO | ${numero}`);
          escreverLog(`[WEBHOOK] encerramento_confirmado_return | ${numero}`);
          return res.sendStatus(200);
        }

        await atualizarAtendimento(numero, { modo: "bot", etapa: "liberado" });
        atendimento.modo = "bot";
        atendimento.etapa = "liberado";
        escreverLog(`POS RESPOSTA LEGADO CANCELADO | ${numero} | ${mensagemTexto}`);
      }

      if (await estaEmModoHumano(numero)) {
        escreverLog(`MODO HUMANO | ${numero}`);
        return res.sendStatus(200);
      }

      if (
        atendimento.etapa === ETAPA_CONFIRMAR_FILA_FORA_HORARIO &&
        !pediuOperador(mensagemNormalizada)
      ) {
        await atualizarAtendimento(numero, { etapa: "liberado" });
        atendimento.etapa = "liberado";
      }

      if (pediuOperador(mensagemNormalizada)) {
        await encaminharParaHumano(numero, mensagemTexto, {
          filaForaHorario:
            atendimento.etapa === ETAPA_CONFIRMAR_FILA_FORA_HORARIO,
          verificarHorario:
            atendimento.etapa !== ETAPA_CONFIRMAR_FILA_FORA_HORARIO,
        });
        return res.sendStatus(200);
      }

      if (atendimento.etapa === ETAPA_RECUPERACAO_SENHA_AGUARDANDO_NOVO_TELEFONE) {
        const novoTelefone = extrairTelefoneInformado(mensagemTexto);
        const contextoFila = criarContextoTrocaTelefoneRecuperacaoSenha(novoTelefone);

        escreverLog(`RECUPERACAO SENHA | NOVO TELEFONE | ${numero}`);
        await atualizarAtendimento(numero, {
          modo: "bot",
          etapa: "liberado",
        });
        await encaminharParaHumano(numero, contextoFila, {
          mensagem: MENSAGEM_RECUPERACAO_SENHA_NOVO_TELEFONE_RECEBIDO,
        });
        return res.sendStatus(200);
      }

      if (atendimento.etapa === ETAPA_RECUPERACAO_SENHA_ORIENTADO) {
        const tipoRecuperacaoSenhaOrientado =
          classificarRecuperacaoSenha(mensagemNormalizada);

        if (tipoRecuperacaoSenhaOrientado === "troca_telefone") {
          escreverLog(`RECUPERACAO SENHA | PEDIU NOVO TELEFONE | ${numero}`);
          await atualizarAtendimento(numero, {
            modo: "bot",
            etapa: ETAPA_RECUPERACAO_SENHA_AGUARDANDO_NOVO_TELEFONE,
          });
          await enviarMensagem(numero, MENSAGEM_RECUPERACAO_SENHA_TROCA_TELEFONE);
          return res.sendStatus(200);
        }

        await atualizarAtendimento(numero, { modo: "bot", etapa: "liberado" });
        atendimento.modo = "bot";
        atendimento.etapa = "liberado";
      }

      if (atendimento.etapa === "inicio") {
        await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
        await enviarMensagem(numero, "Ola! Para iniciar o atendimento, informe apenas seu primeiro nome.");
        escreverLog(`PEDIU NOME | ${numero}`);
        return res.sendStatus(200);
      }

      if (atendimento.etapa === "aguardando_nome") {
        if (!pareceNomeCliente(mensagemTexto)) {
          await enviarMensagem(
            numero,
            "Para eu iniciar, envie apenas seu primeiro nome. Exemplo: Joao. Depois voce me conta o problema."
          );
          escreverLog(`NOME INVALIDO OU MENSAGEM DE PROBLEMA | ${numero} | ${mensagemTexto}`);
          return res.sendStatus(200);
        }
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
            `${validacao.mensagem}\n\nPor favor, informe um CPF valido (apenas numeros).`
          );

          escreverLog(`CPF INVALIDO | ${numero} | ${mensagemTexto}`);
          return res.sendStatus(200);
        }

        await atualizarAtendimento(numero, {
          cpf: validacao.cpfFormatado,
          etapa: "aguardando_site",
        });

        await enviarMensagem(
          numero,
          "CPF registrado com sucesso!\n\nAgora informe em qual site ou plataforma voce estava."
        );

        escreverLog(`CPF SALVO | ${numero} | ${validacao.cpfFormatado}`);
        return res.sendStatus(200);
      }

      if (atendimento.etapa === "confirmando_plataforma") {
        await processarConfirmacaoPlataforma(
          numero,
          mensagemTexto,
          mensagemNormalizada,
          atendimento
        );
        return res.sendStatus(200);
      }

      if (
        atendimento.etapa === "aguardando_site" ||
        atendimento.etapa === "aguardando_site_completo"
      ) {
        await processarEntradaPlataforma(numero, mensagemTexto, atendimento);
        return res.sendStatus(200);
      }

      if (atendimento.etapa === "liberado" && (!atendimento.nome || !atendimento.cpf || !atendimento.site)) {
        await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
        await enviarMensagem(numero, "Ola! Para iniciar o atendimento, informe apenas seu primeiro nome.");
        escreverLog(`CADASTRO INCOMPLETO | PEDIU NOME | ${numero}`);
        return res.sendStatus(200);
      }

      if (atendimento.etapa !== "liberado") {
        await atualizarAtendimento(numero, { etapa: "aguardando_nome" });
        await enviarMensagem(numero, "Ola! Para iniciar o atendimento, informe apenas seu primeiro nome.");
        escreverLog(`ETAPA INVALIDA | PEDIU NOME | ${numero}`);
        return res.sendStatus(200);
      }

      const tipoRecuperacaoSenha =
        classificarRecuperacaoSenha(mensagemNormalizada);

      if (tipoRecuperacaoSenha === "troca_telefone") {
        escreverLog(`RECUPERACAO SENHA | PEDIU NOVO TELEFONE | ${numero}`);
        await atualizarAtendimento(numero, {
          modo: "bot",
          etapa: ETAPA_RECUPERACAO_SENHA_AGUARDANDO_NOVO_TELEFONE,
        });
        await enviarMensagem(numero, MENSAGEM_RECUPERACAO_SENHA_TROCA_TELEFONE);
        return res.sendStatus(200);
      }

      if (tipoRecuperacaoSenha === "recuperacao_senha") {
        escreverLog(`RECUPERACAO SENHA | ORIENTACAO | ${numero}`);
        await atualizarAtendimento(numero, {
          modo: "bot",
          etapa: ETAPA_RECUPERACAO_SENHA_ORIENTADO,
        });
        await enviarMensagem(numero, MENSAGEM_RECUPERACAO_SENHA);
        return res.sendStatus(200);
      }

      escreverLog(`BUSCANDO RESPOSTA PLANILHA | ${numero} | ${mensagemTexto}`);
      const respostaEncontrada = buscarResposta(mensagemTexto);

      if (respostaEncontrada?.texto) {
        escreverLog(`RESPOSTA PLANILHA ENCONTRADA | ${numero}`);

        if (respostaEncontrada.encaminharHumano) {
          escreverLog(`RESPOSTA PLANILHA ENCAMINHA HUMANO | ${numero}`);
          await encaminharParaHumano(numero, mensagemTexto, {
            mensagem: respostaEncontrada.texto,
          });
          return res.sendStatus(200);
        }

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
      escreverLog(`SEM RESPOSTA | ENCAMINHANDO HUMANO | ${numero}`);
      await encaminharParaHumano(numero, mensagemTexto);

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
