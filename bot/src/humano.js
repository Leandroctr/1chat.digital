const MENSAGEM_ENCAMINHAMENTO_HUMANO =
  "Encaminhei você para uma operadora. Aguarde, em instantes você será atendido.";

function criarHumanoService({
  ativarModoHumano,
  adicionarNaFila,
  estaEmModoHumano,
  enviarMensagem,
  escreverLog,
}) {
  async function encaminharParaHumano(numero, mensagemTexto) {
    if (await estaEmModoHumano(numero)) {
      escreverLog(`MODO HUMANO | ${numero}`);
      return;
    }

    await ativarModoHumano(numero);
    await adicionarNaFila(numero, mensagemTexto);
    await enviarMensagem(numero, MENSAGEM_ENCAMINHAMENTO_HUMANO);
    escreverLog(`ENCAMINHADO HUMANO | ${numero}`);
  }

  return {
    encaminharParaHumano,
  };
}

module.exports = {
  criarHumanoService,
};
