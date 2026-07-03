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

let configAtual = null;

function mostrarStatusConfig(texto, tipo = "info") {
  const status = document.getElementById("configStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

function mostrarStatusPlataforma(texto, tipo = "info") {
  const status = document.getElementById("platformStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function gerarPlatformKey(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\//g, "")
    .replace(/\bwww\./g, "")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/[_\s.-]+/g, "")
    .trim()
    .slice(0, 60);
}

function aliasesParaTexto(aliases) {
  return Array.isArray(aliases) ? aliases.join("\n") : "";
}

function textoParaAliases(texto) {
  return String(texto || "")
    .split(/[\n;,|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function limparFormularioPlataforma() {
  document.getElementById("platformKey").value = "";
  document.getElementById("platformName").value = "";
  document.getElementById("platformUrl").value = "";
  document.getElementById("platformAliases").value = "";
  document.getElementById("platformActive").checked = true;
}

function lerConfigDoFormulario() {
  return {
    mensagem_final_ativa:
      document.getElementById("mensagemFinalAtiva").checked,
    mensagem_final:
      document.getElementById("mensagemFinal").value,
    pergunta_confirmacao_final:
      document.getElementById("perguntaConfirmacaoFinal").value,
    delay_mensagem_final_segundos:
      Number(document.getElementById("delayMensagemFinal").value),
    plataformas: configAtual?.plataformas || [],
  };
}

function aplicarConfig(config) {
  configAtual = {
    ...config,
    plataformas: Array.isArray(config.plataformas) ? config.plataformas : [],
  };

  document.getElementById("mensagemFinalAtiva").checked =
    Boolean(configAtual.mensagem_final_ativa);
  document.getElementById("mensagemFinal").value =
    configAtual.mensagem_final || "";
  document.getElementById("perguntaConfirmacaoFinal").value =
    configAtual.pergunta_confirmacao_final || "Te ajudo em algo mais?";
  document.getElementById("delayMensagemFinal").value =
    configAtual.delay_mensagem_final_segundos ?? 20;

  renderizarPlataformas();
}

async function salvarConfigAtual(statusCallback) {
  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lerConfigDoFormulario()),
  });

  if (!response.ok) {
    throw new Error("Erro ao salvar configuração");
  }

  const configSalva = await response.json();
  aplicarConfig(configSalva);

  if (statusCallback) statusCallback();
}

async function carregarConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`);
    const config = await response.json();

    aplicarConfig(config);
    mostrarStatusConfig("");
    mostrarStatusPlataforma("");
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível carregar a configuração.",
      "error"
    );
    mostrarStatusPlataforma(
      "Não foi possível carregar as plataformas.",
      "error"
    );
  }
}

async function salvarConfig(event) {
  event.preventDefault();

  try {
    await salvarConfigAtual(() => {
      mostrarStatusConfig("Configuração salva.", "success");
    });
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível salvar a configuração.",
      "error"
    );
  }
}

function lerPlataformaDoFormulario() {
  const nome = document.getElementById("platformName").value.trim();
  const url = document.getElementById("platformUrl").value.trim();
  const keyInformada = document.getElementById("platformKey").value.trim();
  const key = gerarPlatformKey(keyInformada || nome || url);

  return {
    key,
    name: nome,
    url,
    aliases: textoParaAliases(document.getElementById("platformAliases").value),
    active: document.getElementById("platformActive").checked,
  };
}

async function adicionarPlataforma(event) {
  event.preventDefault();

  if (!configAtual) configAtual = { plataformas: [] };

  const plataforma = lerPlataformaDoFormulario();

  if (!plataforma.key || !plataforma.name || !plataforma.url) {
    mostrarStatusPlataforma("Informe chave, nome e link.", "error");
    return;
  }

  configAtual.plataformas = (configAtual.plataformas || []).filter(
    (item) => item.key !== plataforma.key
  );
  configAtual.plataformas.push(plataforma);

  try {
    await salvarConfigAtual(() => {
      limparFormularioPlataforma();
      mostrarStatusPlataforma("Plataforma salva.", "success");
    });
  } catch (error) {
    mostrarStatusPlataforma("Não foi possível salvar a plataforma.", "error");
  }
}

async function removerPlataforma(key) {
  if (!confirm("Remover esta plataforma do catálogo interno?")) return;

  if (!configAtual) configAtual = { plataformas: [] };

  configAtual.plataformas = (configAtual.plataformas || []).filter(
    (item) => item.key !== key
  );

  try {
    await salvarConfigAtual(() => {
      mostrarStatusPlataforma("Plataforma removida.", "success");
    });
  } catch (error) {
    mostrarStatusPlataforma("Não foi possível remover a plataforma.", "error");
  }
}

async function alternarPlataforma(key, ativo) {
  if (!configAtual) configAtual = { plataformas: [] };

  configAtual.plataformas = (configAtual.plataformas || []).map((item) =>
    item.key === key ? { ...item, active: ativo } : item
  );

  try {
    await salvarConfigAtual(() => {
      mostrarStatusPlataforma("Plataforma atualizada.", "success");
    });
  } catch (error) {
    mostrarStatusPlataforma("Não foi possível atualizar a plataforma.", "error");
  }
}

function editarPlataforma(key) {
  const plataforma = (configAtual.plataformas || []).find((item) => item.key === key);
  if (!plataforma) return;

  document.getElementById("platformKey").value = plataforma.key || "";
  document.getElementById("platformName").value = plataforma.name || "";
  document.getElementById("platformUrl").value = plataforma.url || "";
  document.getElementById("platformAliases").value = aliasesParaTexto(plataforma.aliases);
  document.getElementById("platformActive").checked = plataforma.active !== false;
  mostrarStatusPlataforma("Edite os campos e salve para atualizar.", "info");
}

function renderizarPlataformas() {
  const tbody = document.getElementById("platformsBody");
  if (!tbody) return;

  const plataformas = configAtual?.plataformas || [];

  if (!plataformas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Nenhuma plataforma cadastrada.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = plataformas
    .map((item) => {
      const aliases = aliasesParaTexto(item.aliases).replace(/\n/g, ", ");
      return `
        <tr>
          <td>
            <input
              type="checkbox"
              ${item.active !== false ? "checked" : ""}
              onchange="alternarPlataforma('${escaparHtml(item.key)}', this.checked)"
            />
          </td>
          <td>${escaparHtml(item.key)}</td>
          <td>${escaparHtml(item.name)}</td>
          <td>
            <a href="${escaparHtml(item.url)}" target="_blank" rel="noreferrer">
              ${escaparHtml(item.url)}
            </a>
          </td>
          <td>${escaparHtml(aliases || "-")}</td>
          <td class="table-actions">
            <button class="secondary" type="button" onclick="editarPlataforma('${escaparHtml(item.key)}')">
              Editar
            </button>
            <button class="danger" type="button" onclick="removerPlataforma('${escaparHtml(item.key)}')">
              Remover
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function carregarFila() {
  const tbody = document.getElementById("filaBody");
  const totalFila = document.getElementById("totalFila");
  const totalHumano = document.getElementById("totalHumano");
  const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");

  let fila = [];

  try {
    const response = await fetch(`${API_BASE_URL}/api/fila`);
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
      const numeroLimpo = formatarNumero(item.numero);

      return `
        <tr>
          <td>
            <div class="client">
              <strong>${escaparHtml(item.nome || "Cliente sem nome")}</strong>
              <span>${escaparHtml(numeroLimpo)}</span>
            </div>
          </td>
          <td>${escaparHtml(item.cpf || "-")}</td>
          <td>${escaparHtml(item.site || "-")}</td>
          <td>${escaparHtml(item.mensagem || "-")}</td>
          <td>${escaparHtml(item.horario || "-")}</td>
          <td><span class="badge">${escaparHtml(item.status || "aguardando")}</span></td>
          <td>
            <button class="danger" type="button" onclick="encerrarAtendimento('${escaparHtml(item.numero)}')">
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
    "Encerrar este atendimento? O cliente voltará para o fluxo automático."
  );

  if (!confirmar) return;

  await fetch(`${API_BASE_URL}/api/fila/encerrar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ numero }),
  });

  carregarFila();
}

carregarConfig();
carregarFila();
setInterval(carregarFila, 10000);
