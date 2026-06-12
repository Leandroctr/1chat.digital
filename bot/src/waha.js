const axios = require("axios");

function criarErroWaha(acao, error) {
  const status = error?.response?.status;
  const detalhe = error?.response?.data
    ? JSON.stringify(error.response.data).slice(0, 300)
    : error?.message;
  const erro = new Error(
    `WAHA ${acao} falhou${status ? ` | status=${status}` : ""} | ${detalhe || "sem detalhe"}`
  );

  erro.cause = error;
  erro.status = status;
  erro.code = error?.code;
  return erro;
}

function criarWahaClient({ WAHA_URL, WAHA_API_KEY, SESSION }) {
  async function enviarMensagem(numero, texto) {
    try {
      await axios.post(
        `${WAHA_URL}/api/sendText`,
        {
          session: SESSION,
          chatId: numero,
          text: texto,
        },
        {
          headers: { "X-Api-Key": WAHA_API_KEY },
        }
      );
    } catch (error) {
      throw criarErroWaha("sendText", error);
    }
  }

  async function enviarImagem(numero, imageUrl) {
    try {
      await axios.post(
        `${WAHA_URL}/api/sendImage`,
        {
          session: SESSION,
          chatId: numero,
          file: {
            url: imageUrl,
          },
          caption: "",
        },
        {
          headers: {
            "X-Api-Key": WAHA_API_KEY,
          },
        }
      );
    } catch (error) {
      throw criarErroWaha("sendImage", error);
    }
  }

  return {
    enviarMensagem,
    enviarImagem,
  };
}

module.exports = {
  criarWahaClient,
};
