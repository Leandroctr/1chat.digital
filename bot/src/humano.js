const {
  criarMensagemForaHorario,
  estaDentroHorarioAtendimento,
} = require("./businessHours");

const MENSAGEM_ENCAMINHAMENTO_HUMANO =
  "Aguarde um momento, um dos nossos operadores ir\u00e1 te atender.";
const MENSAGEM_FILA_FORA_HORARIO =
  "Sua solicita\u00e7\u00e3o foi registrada.\n\nNossa equipe visualizar\u00e1 sua mensagem no pr\u00f3ximo hor\u00e1rio de atendimento.";

function criarHumanoService({
  ativarModoHumano,
  adicionarNaFila,
  estaEmModoHumano,
  registrarEventoEncaminhamentoHumano,
  atualizarAtendimento,
  carregarConfig,
  enviarMensagem,
  escreverLog,
}) {
  async function encaminharParaHumano(numero, mensagemTexto, opcoes = {}) {
    if (await estaEmModoHumano(numero)) {
      escreverLog(`MODO HUMANO | ${numero}`);
      return;
    }

    if (opcoes.verificarHorario) {
      const config = await carregarConfig();

      if (!estaDentroHorarioAtendimento(config)) {
        escreverLog(`[HUMAN_QUEUE] outside_business_hours | ${numero}`);
        await atualizarAtendimento(numero, {
          etapa: "aguardando_confirmacao_fila_fora_horario",
        });
        escreverLog(`[HUMAN_QUEUE] awaiting_confirmation | ${numero}`);
        await enviarMensagem(numero, criarMensagemForaHorario(config));
        return;
      }

      escreverLog(`[HUMAN_QUEUE] inside_business_hours | ${numero}`);
    }

    await ativarModoHumano(numero);
    await adicionarNaFila(numero, mensagemTexto);
    await registrarEventoEncaminhamentoHumano({
      numero,
      mensagemTexto,
      origem: "pedido_usuario",
    });

    if (opcoes.enviarMensagem !== false) {
      const mensagemPadrao = opcoes.filaForaHorario
        ? MENSAGEM_FILA_FORA_HORARIO
        : MENSAGEM_ENCAMINHAMENTO_HUMANO;

      await enviarMensagem(
        numero,
        opcoes.mensagem || mensagemPadrao,
        {
          humanizeType: "operator",
        }
      );
    }

    if (opcoes.filaForaHorario) {
      escreverLog(`[HUMAN_QUEUE] queued_outside_business_hours | ${numero}`);
    }

    escreverLog(`ENCAMINHADO HUMANO | ${numero}`);
  }

  return {
    encaminharParaHumano,
  };
}

module.exports = {
  MENSAGEM_FILA_FORA_HORARIO,
  criarHumanoService,
};
