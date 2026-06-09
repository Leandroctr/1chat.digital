function criarHumanoService({ ativarModoHumano, adicionarNaFila, escreverLog }) {
  async function encaminharParaHumano(numero, mensagemTexto) {
    await ativarModoHumano(numero);
    await adicionarNaFila(numero, mensagemTexto);
    escreverLog(`ENCAMINHADO HUMANO | ${numero}`);
  }

  return {
    encaminharParaHumano,
  };
}

module.exports = {
  criarHumanoService,
};
