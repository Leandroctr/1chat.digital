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

async function fetchAdmin(url, options) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Login necessario");
  }

  return response;
}

function mostrarSecao(secao) {
  const secoes = {
    atendimentos: document.getElementById("sectionAtendimentos"),
    mensagemFinal: document.getElementById("sectionMensagemFinal"),
  };

  Object.entries(secoes).forEach(([nome, elemento]) => {
    if (elemento) {
      elemento.classList.toggle("active", nome === secao);
    }
  });

  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === secao);
  });
}

function mostrarStatusConfig(texto, tipo = "info") {
  const status = document.getElementById("configStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

function mostrarStatusImagem(texto, tipo = "info") {
  const status = document.getElementById("imageStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

function atualizarPreviewImagem(config) {
  const preview = document.getElementById("mensagemFinalImagePreview");
  const vazio = document.getElementById("mensagemFinalImageEmpty");

  if (!preview || !vazio) return;

  if (config?.final_message_image_url) {
    preview.src = config.final_message_image_url;
    preview.hidden = false;
    vazio.hidden = true;
    return;
  }

  preview.removeAttribute("src");
  preview.hidden = true;
  vazio.hidden = false;
}

async function carregarConfig() {
  try {
    const response = await fetchAdmin(`${API_BASE_URL}/api/config`);
    const config = await response.json();

    document.getElementById("mensagemFinalAtiva").checked =
      Boolean(config.mensagem_final_ativa);
    document.getElementById("mensagemFinal").value =
      config.mensagem_final || "";
    document.getElementById("perguntaConfirmacaoFinal").value =
      config.pergunta_confirmacao_final || "Te ajudo em algo mais?";
    document.getElementById("delayMensagemFinal").value =
      config.delay_mensagem_final_segundos ?? 20;

    atualizarPreviewImagem(config);
    mostrarStatusConfig("");
    mostrarStatusImagem("");
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
    const response = await fetchAdmin(`${API_BASE_URL}/api/config`, {
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
    atualizarPreviewImagem(configSalva);

    mostrarStatusConfig("Configuração salva.", "success");
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível salvar a configuração.",
      "error"
    );
  }
}

async function enviarImagemMensagemFinal() {
  const input = document.getElementById("mensagemFinalImage");

  if (!input?.files?.length) {
    mostrarStatusImagem("Selecione uma imagem.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("image", input.files[0]);

  try {
    mostrarStatusImagem("Enviando imagem...");

    const response = await fetchAdmin(`${API_BASE_URL}/api/config/final-message-image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Erro ao enviar imagem");
    }

    const config = await response.json();
    atualizarPreviewImagem(config);
    input.value = "";
    mostrarStatusImagem("Imagem salva.", "success");
  } catch (error) {
    mostrarStatusImagem("Não foi possível enviar a imagem.", "error");
  }
}

async function removerImagemMensagemFinal() {
  try {
    mostrarStatusImagem("Removendo imagem...");

    const response = await fetchAdmin(`${API_BASE_URL}/api/config/final-message-image`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Erro ao remover imagem");
    }

    const config = await response.json();
    atualizarPreviewImagem(config);
    mostrarStatusImagem("Imagem removida.", "success");
  } catch (error) {
    mostrarStatusImagem("Não foi possível remover a imagem.", "error");
  }
}

async function carregarFila() {
  const tbody = document.getElementById("filaBody");
  const totalFila = document.getElementById("totalFila");
  const totalHumano = document.getElementById("totalHumano");
  const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");

  let fila = [];

  try {
    const response = await fetchAdmin(`${API_BASE_URL}/api/fila`);
    fila = await response.json();
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Não foi possível carregar a fila.
        </td>
      </tr>
    `;
    return;
  }

  totalFila.textContent = fila.length;
  totalHumano.textContent = fila.length;
  ultimaAtualizacao.textContent = agora();

  if (!fila.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Nenhum cliente aguardando atendimento humano.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = fila
    .map((item) => {
      formatarNumero(item.numero);

      return `
        <tr>
          <td>
           <div class="client">
  <strong>${item.nome || "Cliente sem nome"}</strong>
  <span>CPF: ${item.cpf || "-"}</span>
</div>
          </td>
          <td>${item.cpf || "-"}</td>
          <td>${item.site || "-"}</td>
          <td>${item.mensagem || "-"}</td>
          <td>${item.horario || "-"}</td>
          <td><span class="badge">${item.status || "aguardando"}</span></td>
          <td>
            <button class="danger" onclick="encerrarAtendimento('${item.numero}')">
              Encerrar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function encerrarAtendimento(numero) {
  const confirmar = confirm(
    "Encerrar este atendimento? O bot perguntará se o cliente precisa de algo mais antes de finalizar."
  );

  if (!confirmar) return;

  await fetchAdmin(`${API_BASE_URL}/api/fila/encerrar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ numero }),
  });

  carregarFila();
}

mostrarSecao("atendimentos");
carregarConfig();
carregarFila();
setInterval(carregarFila, 10000);
