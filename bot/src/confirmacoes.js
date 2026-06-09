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
  const palavrasOperador = ["operador", "humano", "atendente", "suporte"];
  return palavrasOperador.some((palavra) => mensagemNormalizada.includes(palavra));
}

module.exports = {
  pediuOperador,
  usuarioConfirmouEncerramento,
  usuarioConfirmouVideo,
  usuarioNegouVideo,
};
