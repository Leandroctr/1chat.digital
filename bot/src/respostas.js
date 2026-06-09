const fs = require("fs");
const XLSX = require("xlsx");

const PERGUNTA_VIDEO =
  "O vÃ­deo resolveu sua dÃºvida? Se ainda precisar, posso encaminhar para uma operadora.";

function criarRespostasService({ ARQUIVO_RESPOSTAS, escreverLog, normalizarTexto }) {
  function carregarRespostas() {
    if (!fs.existsSync(ARQUIVO_RESPOSTAS)) {
      escreverLog("ARQUIVO RESPOSTAS NAO ENCONTRADO");
      return [];
    }

    const workbook = XLSX.readFile(ARQUIVO_RESPOSTAS);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  }

  function extrairTermos(item) {
    const termos = [];

    if (item.gatilho) termos.push(String(item.gatilho));
    if (item.gatilhos) termos.push(String(item.gatilhos));
    if (item.sinonimos) termos.push(...String(item.sinonimos).split(/[;|,]/));

    return termos.map((termo) => normalizarTexto(termo)).filter(Boolean);
  }

  function limparLinksDoTexto(texto) {
    return String(texto || "")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function limparPerguntaVideoDoTexto(texto) {
    return String(texto || "")
      .replace(PERGUNTA_VIDEO, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function buscarResposta(mensagemCliente) {
    const mensagemNormalizada = normalizarTexto(mensagemCliente);
    const respostas = carregarRespostas();

    let melhorResposta = null;
    let melhorPrioridade = -1;

    for (const item of respostas) {
      const ativo = normalizarTexto(item.ativo);
      if (ativo !== "sim") continue;
      if (!item.resposta) continue;

      const termos = extrairTermos(item);
      if (!termos.length) continue;

      const encontrou = termos.some((termo) => mensagemNormalizada.includes(termo));
      if (!encontrou) continue;

      const prioridade = Number(item.prioridade || 0);

      if (!melhorResposta || prioridade > melhorPrioridade) {
        const linkVideo = item.link_video ? String(item.link_video).trim() : null;

        melhorPrioridade = prioridade;
        melhorResposta = {
          texto: linkVideo
            ? limparPerguntaVideoDoTexto(limparLinksDoTexto(item.resposta))
            : String(item.resposta).trim(),
          linkVideo,
        };
      }
    }

    return melhorResposta;
  }

  return {
    buscarResposta,
  };
}

module.exports = {
  PERGUNTA_VIDEO,
  criarRespostasService,
};
