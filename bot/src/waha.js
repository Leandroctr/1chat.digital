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
  async function obterStatus() {
    const checkedAt = new Date().toISOString();
    const endpoints = ["/api/server/status", "/api/version"];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${WAHA_URL}${endpoint}`, {
          headers: { "X-Api-Key": WAHA_API_KEY },
          timeout: 4000,
          validateStatus: () => true,
        });

        if (response.status === 401) {
          return {
            ok: false,
            status: "auth_error",
            label: "WAHA inacessivel",
            detail: "Erro de autenticacao",
            action: "Verificar WAHA_API_KEY",
            checkedAt,
          };
        }

        if (response.status >= 200 && response.status < 300) {
          return {
            ok: true,
            status: "operational",
            label: "WAHA conectado",
            detail: "Tunnel ativo",
            action: "Disponibilidade Operacional",
            checkedAt,
          };
        }

        if (response.status === 404 && endpoint !== endpoints[endpoints.length - 1]) {
          continue;
        }

        return {
          ok: false,
          status: "offline",
          label: "WAHA desconectado",
          detail: "Tunnel/WAHA indisponivel",
          action: "Disponibilidade Offline",
          checkedAt,
        };
      } catch (error) {
        return {
          ok: false,
          status: "offline",
          label: "WAHA desconectado",
          detail: "Tunnel/WAHA indisponivel",
          action: "Disponibilidade Offline",
          checkedAt,
        };
      }
    }

    return {
      ok: false,
      status: "error",
      label: "WAHA desconectado",
      detail: "Tunnel/WAHA indisponivel",
      action: "Disponibilidade Offline",
      checkedAt,
    };
  }

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
    obterStatus,
  };
}

module.exports = {
  criarWahaClient,
};
