const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const COLUNAS_RESPOSTAS = [
  "gatilho",
  "resposta",
  "ativo",
  "categoria",
  "prioridade",
  "encaminhar_humano",
  "sinonimos",
  "observacao",
  "link_video",
];

const PERGUNTA_VIDEO =
  "O vídeo resolveu sua dúvida? Se ainda precisar, posso encaminhar para uma operadora.";

function criarRespostasService({ ARQUIVO_RESPOSTAS, escreverLog, normalizarTexto }) {
  let filaEscrita = Promise.resolve();

  function carregarRespostas() {
    if (!fs.existsSync(ARQUIVO_RESPOSTAS)) {
      escreverLog("ARQUIVO RESPOSTAS NAO ENCONTRADO");
      return [];
    }

    const workbook = XLSX.readFile(ARQUIVO_RESPOSTAS);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  }

  function listarRespostas() {
    return carregarRespostas().map((item, index) => ({
      id: index + 1,
      pergunta: String(item.gatilho || item.gatilhos || ""),
      resposta: String(item.resposta || ""),
      video: String(item.link_video || ""),
      ativo: normalizarTexto(item.ativo) === "sim",
      categoria: String(item.categoria || ""),
      prioridade: Number(item.prioridade || 0),
      sinonimos: String(item.sinonimos || ""),
      encaminhar_humano: String(item.encaminhar_humano || ""),
      observacao: String(item.observacao || ""),
    }));
  }

  function normalizarEntrada(dados, atual = {}) {
    const pergunta = String(dados.pergunta ?? atual.gatilho ?? "").trim();
    const resposta = String(dados.resposta ?? atual.resposta ?? "").trim();

    if (!pergunta) throw new Error("Pergunta obrigatoria");
    if (!resposta) throw new Error("Resposta obrigatoria");

    return {
      ...atual,
      gatilho: pergunta,
      resposta,
      link_video: String(dados.video ?? atual.link_video ?? "").trim(),
      ativo: dados.ativo === undefined
        ? String(atual.ativo || "sim")
        : dados.ativo ? "sim" : "nao",
      categoria: String(dados.categoria ?? atual.categoria ?? "").trim(),
      prioridade: Number(dados.prioridade ?? atual.prioridade ?? 0) || 0,
      sinonimos: String(dados.sinonimos ?? atual.sinonimos ?? "").trim(),
      encaminhar_humano: String(
        dados.encaminhar_humano ?? atual.encaminhar_humano ?? "nao"
      ).trim(),
      observacao: String(dados.observacao ?? atual.observacao ?? "").trim(),
    };
  }

  function salvarRespostas(itens) {
    const workbook = XLSX.readFile(ARQUIVO_RESPOSTAS);
    const nomeAba = workbook.SheetNames[0];
    const abaAtual = workbook.Sheets[nomeAba];
    const metadados = {
      cols: abaAtual["!cols"],
      rows: abaAtual["!rows"],
      autofilter: abaAtual["!autofilter"],
      freeze: abaAtual["!freeze"],
    };
    const novaAba = XLSX.utils.json_to_sheet(itens, {
      header: COLUNAS_RESPOSTAS,
    });

    if (metadados.cols) novaAba["!cols"] = metadados.cols;
    if (metadados.rows) novaAba["!rows"] = metadados.rows;
    if (metadados.autofilter) novaAba["!autofilter"] = metadados.autofilter;
    if (metadados.freeze) novaAba["!freeze"] = metadados.freeze;

    workbook.Sheets[nomeAba] = novaAba;

    const temporario = path.join(
      path.dirname(ARQUIVO_RESPOSTAS),
      `.${path.basename(ARQUIVO_RESPOSTAS)}.${process.pid}.tmp`
    );

    try {
      XLSX.writeFile(workbook, temporario, { bookType: "xlsx" });
      fs.renameSync(temporario, ARQUIVO_RESPOSTAS);
    } finally {
      if (fs.existsSync(temporario)) fs.unlinkSync(temporario);
    }
  }

  function executarEscrita(operacao) {
    const proxima = filaEscrita.then(operacao, operacao);
    filaEscrita = proxima.catch(() => {});
    return proxima;
  }

  async function adicionarResposta(dados) {
    return executarEscrita(() => {
      const itens = carregarRespostas();
      itens.push(normalizarEntrada(dados));
      salvarRespostas(itens);
      escreverLog(`BASE RESPOSTAS ADICIONADA | ${dados.pergunta}`);
      return listarRespostas().at(-1);
    });
  }

  async function atualizarResposta(id, dados) {
    return executarEscrita(() => {
      const indice = Number(id) - 1;
      const itens = carregarRespostas();
      if (!Number.isInteger(indice) || indice < 0 || indice >= itens.length) {
        const erro = new Error("Resposta nao encontrada");
        erro.status = 404;
        throw erro;
      }

      itens[indice] = normalizarEntrada(dados, itens[indice]);
      salvarRespostas(itens);
      escreverLog(`BASE RESPOSTAS ATUALIZADA | ${id}`);
      return listarRespostas()[indice];
    });
  }

  async function removerResposta(id) {
    return executarEscrita(() => {
      const indice = Number(id) - 1;
      const itens = carregarRespostas();
      if (!Number.isInteger(indice) || indice < 0 || indice >= itens.length) {
        const erro = new Error("Resposta nao encontrada");
        erro.status = 404;
        throw erro;
      }

      const [removida] = itens.splice(indice, 1);
      salvarRespostas(itens);
      escreverLog(`BASE RESPOSTAS REMOVIDA | ${id}`);
      return { ok: true, pergunta: removida.gatilho || "" };
    });
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
          encaminharHumano: normalizarTexto(item.encaminhar_humano) === "sim",
        };
      }
    }

    return melhorResposta;
  }

  return {
    adicionarResposta,
    atualizarResposta,
    buscarResposta,
    listarRespostas,
    removerResposta,
  };
}

module.exports = {
  PERGUNTA_VIDEO,
  criarRespostasService,
};
