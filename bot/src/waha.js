const axios = require("axios");

const INATIVIDADE_PRIMEIRA_RESPOSTA_MS = 30 * 60 * 1000;
const ESTADOS_HUMANIZACAO = new Map();

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numeroAleatorio(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

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

function criarWahaClient({ WAHA_URL, WAHA_API_KEY, SESSION, escreverLog = console.log }) {
  function logHumanize(mensagem) {
    escreverLog(`[HUMANIZE] ${mensagem}`);
  }

  function calcularDelayHumanizado(numero, texto, tipo) {
    const agora = Date.now();
    const estado = ESTADOS_HUMANIZACAO.get(numero);
    const primeiraResposta =
      !estado?.ultimoEnvioEm ||
      agora - estado.ultimoEnvioEm > INATIVIDADE_PRIMEIRA_RESPOSTA_MS;

    if (tipo === "operator") {
      return {
        tipo: "operator",
        log: "operator_delay",
        delayMs: numeroAleatorio(4000, 8000),
      };
    }

    if (tipo === "final") {
      return {
        tipo: "final",
        log: "final_message_delay",
        delayMs: numeroAleatorio(2000, 5000),
      };
    }

    if (tipo === "first" || primeiraResposta) {
      return {
        tipo: "first",
        log: "first_message_delay",
        delayMs: numeroAleatorio(3000, 6000),
      };
    }

    const tamanho = String(texto || "").length;

    if (tamanho <= 30) {
      return {
        tipo: "normal",
        log: "normal_delay",
        delayMs: numeroAleatorio(800, 2500),
      };
    }

    if (tamanho <= 120) {
      return {
        tipo: "normal",
        log: "normal_delay",
        delayMs: numeroAleatorio(2000, 4500),
      };
    }

    return {
      tipo: "normal",
      log: "normal_delay",
      delayMs: numeroAleatorio(3500, 6500),
    };
  }

  async function alternarTyping(numero, ativar, session = SESSION) {
    const endpoint = ativar ? "startTyping" : "stopTyping";

    try {
      await axios.post(
        `${WAHA_URL}/api/${endpoint}`,
        {
          session,
          chatId: numero,
        },
        {
          headers: { "X-Api-Key": WAHA_API_KEY },
          timeout: 4000,
        }
      );

      if (ativar) {
        logHumanize(`typing_start | numero=${numero}`);
      }
    } catch (error) {
      logHumanize(`typing_${ativar ? "start" : "stop"}_error | numero=${numero} | ${error.message}`);
    }
  }

  async function obterStatus() {
    const checkedAt = new Date().toISOString();
    const statusDesconhecido = {
      ok: false,
      session: SESSION,
      status: "UNKNOWN",
      isWorking: false,
      label: "Status desconhecido",
      detail: "Nao foi possivel consultar o WAHA",
      action: "Indisponivel",
      checkedAt,
    };

    try {
      const response = await axios.get(`${WAHA_URL}/api/sessions?all=true`, {
        headers: { "X-Api-Key": WAHA_API_KEY },
        timeout: 4000,
        validateStatus: () => true,
      });

      if (response.status === 401) {
        return {
          ...statusDesconhecido,
          status: "UNKNOWN",
          label: "WAHA inacessivel",
          detail: "Erro de autenticacao",
          action: "Verificar WAHA_API_KEY",
        };
      }

      if (response.status < 200 || response.status >= 300) {
        return statusDesconhecido;
      }

      const sessoes = Array.isArray(response.data) ? response.data : [];
      const sessao = sessoes.find((item) => item?.name === SESSION);
      const status = String(sessao?.status || "UNKNOWN").toUpperCase();
      const isWorking = status === "WORKING";
      const detalhesPorStatus = {
        WORKING: "WhatsApp conectado e pronto.",
        SCAN_QR_CODE: "Sessao precisa de QR Code.",
        STOPPED: "Sessao parada. O bot pode nao responder.",
        FAILED: "Erro na sessao.",
        STARTING: "Sessao iniciando.",
        UNKNOWN: "Nao foi possivel consultar o WAHA.",
      };

      return {
        ok: isWorking,
        session: SESSION,
        status,
        isWorking,
        label: isWorking ? "WhatsApp conectado" : "WhatsApp requer atencao",
        detail: detalhesPorStatus[status] || detalhesPorStatus.UNKNOWN,
        action: isWorking ? "Operacional" : status,
        checkedAt,
      };
    } catch (error) {
      return statusDesconhecido;
    }
  }

  async function enviarMensagem(numero, texto, opcoes = {}) {
    const session = opcoes.session || SESSION;
    const humanizacao = calcularDelayHumanizado(
      numero,
      texto,
      opcoes.humanizeType
    );

    try {
      await alternarTyping(numero, true, session);
      logHumanize(`${humanizacao.log}=${humanizacao.delayMs}ms | numero=${numero}`);
      await esperar(humanizacao.delayMs);

      await axios.post(
        `${WAHA_URL}/api/sendText`,
        {
          session,
          chatId: numero,
          text: texto,
        },
        {
          headers: { "X-Api-Key": WAHA_API_KEY },
        }
      );

      ESTADOS_HUMANIZACAO.set(numero, {
        ultimoEnvioEm: Date.now(),
        ultimoTipo: humanizacao.tipo,
      });
      logHumanize(`message_sent | numero=${numero}`);
    } catch (error) {
      throw criarErroWaha("sendText", error);
    } finally {
      await alternarTyping(numero, false, session);
    }
  }

  async function enviarImagem(numero, imageUrl, opcoes = {}) {
    const session = opcoes.session || SESSION;

    try {
      await axios.post(
        `${WAHA_URL}/api/sendImage`,
        {
          session,
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
