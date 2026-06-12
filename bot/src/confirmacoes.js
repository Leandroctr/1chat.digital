function usuarioConfirmouEncerramento(mensagemNormalizada) {
  const respostasExatas = ["nao", "n", "ok", "valeu", "tudo certo", "sim", "sim obrigado"];

  if (respostasExatas.includes(mensagemNormalizada)) {
    return true;
  }

  const respostasPorTrecho = ["obrigado", "obrigada"];
  return respostasPorTrecho.some((resposta) => mensagemNormalizada.includes(resposta));
}

function usuarioConfirmouVideo(mensagemNormalizada) {
  const respostasExatas = [
    "sim",
    "sim resolveu",
    "resolveu",
    "ok",
    "obrigado",
    "obrigada",
    "valeu",
    "tudo certo",
  ];

  if (respostasExatas.includes(mensagemNormalizada)) {
    return true;
  }

  return mensagemNormalizada.includes("obrigado") || mensagemNormalizada.includes("obrigada");
}

function usuarioNegouVideo(mensagemNormalizada) {
  const respostasNegativas = ["nao", "nao resolveu"];

  if (respostasNegativas.includes(mensagemNormalizada)) {
    return true;
  }

  return pediuOperador(mensagemNormalizada);
}

function pediuOperador(mensagemNormalizada) {
  const comandosExatos = [
    "operador",
    "atendente",
    "humano",
    "suporte",
    "mano",
    "falar com alguem",
    "falar com uma pessoa",
    "falar com pessoa",
    "quero falar com alguem",
    "quero falar com uma pessoa",
    "quero falar com o operador",
    "quero falar com operador",
    "quero falar com atendente",
    "preciso falar com alguem",
    "preciso falar com uma pessoa",
    "chamar operador",
    "chamar atendente",
  ];

  if (comandosExatos.includes(mensagemNormalizada)) {
    return true;
  }

  const padroesOperador = [
    /\boperador\b/,
    /\batendente\b/,
    /\bhumano\b/,
    /\bsuporte\b/,
    /\bfalar com alguem\b/,
    /\bfalar com uma pessoa\b/,
    /\bquero falar\b/,
    /\bpreciso falar\b/,
  ];

  return padroesOperador.some((padrao) => padrao.test(mensagemNormalizada));
}

module.exports = {
  pediuOperador,
  usuarioConfirmouEncerramento,
  usuarioConfirmouVideo,
  usuarioNegouVideo,
};
