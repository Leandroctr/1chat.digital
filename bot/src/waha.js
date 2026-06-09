const axios = require("axios");

function criarWahaClient({ WAHA_URL, WAHA_API_KEY, SESSION }) {
  async function enviarMensagem(numero, texto) {
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
  }

  async function enviarImagem(numero, imageUrl) {
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
  }

  return {
    enviarMensagem,
    enviarImagem,
  };
}

module.exports = {
  criarWahaClient,
};
