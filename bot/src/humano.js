const MENSAGEM_ENCAMINHAMENTO_HUMANO =
  "Aguarde um momento, um dos nossos operadores irá te atender.";

function criarHumanoService({
  ativarModoHumano,
  adicionarNaFila,
  estaEmModoHumano,
  registrarEventoEncaminhamentoHumano,
  enviarMensagem,
  escreverLog,
}) {
  async function encaminharParaHumano(numero, mensagemTexto, opcoes = {}) {
    if (await estaEmModoHumano(numero)) {
      escreverLog(`MODO HUMANO | ${numero}`);
      return;
    }

    await ativarModoHumano(numero);
    await adicionarNaFila(numero, mensagemTexto);
    await registrarEventoEncaminhamentoHumano({
      numero,
      mensagemTexto,
      origem: "pedido_usuario",
    });
    if (opcoes.enviarMensagem !== false) {
      await enviarMensagem(numero, opcoes.mensagem || MENSAGEM_ENCAMINHAMENTO_HUMANO, {
        humanizeType: "operator",
      });
    }
    escreverLog(`ENCAMINHADO HUMANO | ${numero}`);
  }

  return {
    encaminharParaHumano,
  };
}

module.exports = {
  criarHumanoService,
};
