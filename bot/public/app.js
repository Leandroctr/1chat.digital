function formatarNumero(numero) {
  if (!numero) return "-";
  return numero.replace("@c.us", "").replace("@lid", "");
}

function agora() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const API_BASE_URL =
  window.API_BASE_URL ||
  localStorage.getItem("API_BASE_URL") ||
  "";

function mostrarStatusConfig(texto, tipo = "info") {
  const status = document.getElementById("configStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

async function carregarConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`);
    const config = await response.json();

    document.getElementById("mensagemFinalAtiva").checked =
      Boolean(config.mensagem_final_ativa);
    document.getElementById("mensagemFinal").value =
      config.mensagem_final || "";
    document.getElementById("perguntaConfirmacaoFinal").value =
      config.pergunta_confirmacao_final || "Te ajudo em algo mais?";
    document.getElementById("delayMensagemFinal").value =
      config.delay_mensagem_final_segundos ?? 20;

    mostrarStatusConfig("");
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível carregar a configuração.",
      "error"
    );
  }
}

async function salvarConfig(event) {
  event.preventDefault();

  const config = {
    mensagem_final_ativa:
      document.getElementById("mensagemFinalAtiva").checked,
    mensagem_final:
      document.getElementById("mensagemFinal").value,
    pergunta_confirmacao_final:
      document.getElementById("perguntaConfirmacaoFinal").value,
    delay_mensagem_final_segundos:
      Number(document.getElementById("delayMensagemFinal").value),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar configuração");
    }

    const configSalva = await response.json();

    document.getElementById("mensagemFinalAtiva").checked =
      Boolean(configSalva.mensagem_final_ativa);
    document.getElementById("mensagemFinal").value =
      configSalva.mensagem_final || "";
    document.getElementById("perguntaConfirmacaoFinal").value =
      configSalva.pergunta_confirmacao_final || "Te ajudo em algo mais?";
    document.getElementById("delayMensagemFinal").value =
      configSalva.delay_mensagem_final_segundos ?? 20;

    mostrarStatusConfig("Configuração salva.", "success");
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível salvar a configuração.",
      "error"
    );
  }
}

async function carregarFila() {
  const tbody = document.getElementById("filaBody");
  const totalFila = document.getElementById("totalFila");
  const totalHumano = document.getElementById("totalHumano");