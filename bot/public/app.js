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
let respostasCache = [];
let imagemPreviewLocalUrl = "";
let configAtual = { plataformas: [] };
const METRICAS_GATILHO_LABELS = {
  senha: "Senha",
  saque: "Saque",
  deposito: "Deposito",
  bonus: "Bonus",
  sac: "SAC",
  operador: "Operador",
  cpf_cadastro: "CPF/Cadastro",
  plataforma: "Plataforma",
};

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linkSeguro(valor) {
  try {
    const url = new URL(String(valor || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
}

function definirCarregamento(botao, carregando) {
  if (!botao) return;

  if (carregando) {
    botao.dataset.textoOriginal = botao.textContent;
    botao.textContent = botao.dataset.loadingText || "Aguarde...";
    botao.disabled = true;
    botao.setAttribute("aria-busy", "true");
    return;
  }

  botao.textContent = botao.dataset.textoOriginal || botao.textContent;
  botao.disabled = false;
  botao.removeAttribute("aria-busy");
}

function mostrarToast(titulo, mensagem, tipo = "info") {
  const region = document.getElementById("toastRegion");
  if (!region) return;

  const toast = document.createElement("div");
  const conteudo = document.createElement("div");
  const tituloElemento = document.createElement("strong");
  const mensagemElemento = document.createElement("span");

  toast.className = `toast ${tipo}`;
  tituloElemento.textContent = titulo;
  mensagemElemento.textContent = mensagem;
  conteudo.append(tituloElemento, mensagemElemento);
  toast.append(conteudo);
  region.append(toast);

  setTimeout(() => toast.remove(), 4200);
}

function mostrarCarregamentoTabela(tbody, colunas, texto) {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colunas}" class="empty"><span class="spinner"></span>${texto}</td></tr>`;
}

async function fetchAdmin(url, options) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Login necessario");
  }

  return response;
}

function aplicarStatusWaha(status) {
  const serviceCard = document.getElementById("wahaServiceCard");
  const serviceLabel = document.getElementById("wahaStatusLabel");
  const serviceDetail = document.getElementById("wahaStatusDetail");
  const serviceAction = document.getElementById("wahaStatusAction");
  const integracaoCard = document.getElementById("integracaoStatusCard");
  const integracaoLabel = document.getElementById("integracaoStatusLabel");
  const integracaoDetail = document.getElementById("integracaoStatusDetail");

  const classe =
    status?.status === "operational"
      ? "status-ok"
      : status?.status === "auth_error"
        ? "status-warning"
        : "status-error";
  const classes = ["status-ok", "status-warning", "status-error", "status-checking"];

  serviceCard?.classList.remove(...classes);
  integracaoCard?.classList.remove(...classes);
  serviceCard?.classList.add(classe);
  integracaoCard?.classList.add(classe);

  const label = status?.label || "WAHA desconectado";
  const detail = status?.detail || "Tunnel/WAHA indisponivel";
  const action = status?.action || "Disponibilidade Offline";

  if (serviceLabel) serviceLabel.textContent = label;
  if (serviceDetail) serviceDetail.textContent = detail;
  if (serviceAction) serviceAction.textContent = action.replace("Disponibilidade ", "");
  if (integracaoLabel) {
    integracaoLabel.textContent =
      status?.status === "operational"
        ? "Online"
        : status?.status === "auth_error"
          ? "Auth"
          : "Offline";
  }
  if (integracaoDetail) {
    integracaoDetail.textContent =
      status?.status === "auth_error" ? "Verificar WAHA_API_KEY" : detail;
  }
}

async function carregarStatusWaha() {
  try {
    const response = await fetchAdmin(`${API_BASE_URL}/api/waha-status`);
    const status = await response.json().catch(() => ({}));
    aplicarStatusWaha(status);
  } catch (error) {
    aplicarStatusWaha({
      ok: false,
      status: "offline",
      label: "WAHA desconectado",
      detail: "Tunnel/WAHA indisponivel",
      action: "Disponibilidade Offline",
    });
  }
}

function mostrarSecao(secao) {
  const secoes = {
    atendimentos: document.getElementById("sectionAtendimentos"),
    mensagemFinal: document.getElementById("sectionMensagemFinal"),
    horarioAtendimento: document.getElementById("sectionHorarioAtendimento"),
    plataformas: document.getElementById("sectionPlataformas"),
    metricas: document.getElementById("sectionMetricas"),
    respostas: document.getElementById("sectionRespostas"),
  };

  Object.entries(secoes).forEach(([nome, elemento]) => {
    if (elemento) {
      elemento.classList.toggle("active", nome === secao);
    }
  });

  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === secao);
  });

  if (secao === "metricas") {
    carregarMetricas();
  }

  if (secao === "respostas") {
    carregarRespostas();
  }
}

function mostrarStatusConfig(texto, tipo = "info") {
  const status = document.getElementById("configStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

function mostrarStatusHorario(texto, tipo = "info") {
  const status = document.getElementById("horarioStatus");

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

function mostrarStatusPlataforma(texto, tipo = "info") {
  const status = document.getElementById("platformStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
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

function textoParaAliases(texto) {
  return String(texto || "")
    .split(/[\n;,|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function aliasesParaTexto(aliases) {
  return Array.isArray(aliases) ? aliases.join("\n") : "";
}

function limparFormularioPlataforma() {
  const campos = ["platformKey", "platformName", "platformUrl", "platformAliases"];
  campos.forEach((id) => {
    const campo = document.getElementById(id);
    if (campo) campo.value = "";
  });

  const ativo = document.getElementById("platformActive");
  if (ativo) ativo.checked = true;
}

function atualizarPreviewImagemConversa(imageUrl) {
  const placeholder = document.getElementById("previewImagePlaceholder");

  if (!placeholder) return;

  if (imageUrl) {
    placeholder.textContent = "";
    placeholder.classList.add("has-image");
    placeholder.style.backgroundImage = `url("${String(imageUrl).replaceAll('"', "%22")}")`;
    return;
  }

  placeholder.classList.remove("has-image");
  placeholder.style.removeProperty("background-image");
  placeholder.textContent = "Imagem opcional";
}

function atualizarPreviewImagem(config) {
  const preview = document.getElementById("mensagemFinalImagePreview");
  const vazio = document.getElementById("mensagemFinalImageEmpty");

  if (!preview || !vazio) return;

  if (config?.final_message_image_url) {
    preview.src = config.final_message_image_url;
    preview.hidden = false;
    vazio.hidden = true;
    atualizarPreviewImagemConversa(config.final_message_image_url);
    return;
  }

  preview.removeAttribute("src");
  preview.hidden = true;
  vazio.hidden = false;
  atualizarPreviewImagemConversa("");
}

function atualizarPreviewConversa() {
  const pergunta = document.getElementById("perguntaConfirmacaoFinal")?.value;
  const mensagem = document.getElementById("mensagemFinal")?.value;
  const previewPergunta = document.getElementById("previewPergunta");
  const previewMensagem = document.getElementById("previewMensagem");
  const contador = document.getElementById("messageCounter");

  if (previewPergunta) {
    const horario = previewPergunta.querySelector("small")?.outerHTML || "";
    previewPergunta.innerHTML = `${pergunta || "Te ajudo em algo mais?"}${horario}`;
  }
  if (previewMensagem) {
    previewMensagem.textContent =
      mensagem || "Obrigado pelo contato. Conte com a nossa equipe!";
  }
  if (contador) contador.textContent = `${(mensagem || "").length} caracteres`;
}

async function carregarConfig() {
  try {
    const response = await fetchAdmin(`${API_BASE_URL}/api/config`);
    const config = await response.json();
    configAtual = {
      ...config,
      plataformas: Array.isArray(config.plataformas) ? config.plataformas : [],
    };

    document.getElementById("mensagemFinalAtiva").checked =
      Boolean(config.mensagem_final_ativa);
    document.getElementById("mensagemFinal").value =
      config.mensagem_final || "";
    document.getElementById("perguntaConfirmacaoFinal").value =
      config.pergunta_confirmacao_final || "Te ajudo em algo mais?";
    document.getElementById("delayMensagemFinal").value =
      config.delay_mensagem_final_segundos ?? 20;
    document.getElementById("horarioHumanoSegundaSabadoInicio").value =
      config.horario_humano_segunda_sabado_inicio || "09:00";
    document.getElementById("horarioHumanoSegundaSabadoFim").value =
      config.horario_humano_segunda_sabado_fim || "22:00";
    document.getElementById("horarioHumanoDomingoInicio").value =
      config.horario_humano_domingo_inicio || "09:00";
    document.getElementById("horarioHumanoDomingoFim").value =
      config.horario_humano_domingo_fim || "20:00";

    atualizarPreviewImagem(config);
    atualizarPreviewConversa();
    renderizarPlataformas();
    mostrarStatusConfig("");
    mostrarStatusHorario("");
    mostrarStatusImagem("");
    mostrarStatusPlataforma("");
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível carregar a configuração.",
      "error"
    );
    mostrarStatusHorario("Nao foi possivel carregar o horario.", "error");
    mostrarStatusPlataforma("Nao foi possivel carregar as plataformas.", "error");
  }
}

async function salvarConfig(event) {
  event.preventDefault();
  const botao = event.submitter;

  const config = {
    mensagem_final_ativa:
      document.getElementById("mensagemFinalAtiva").checked,
    mensagem_final:
      document.getElementById("mensagemFinal").value,
    pergunta_confirmacao_final:
      document.getElementById("perguntaConfirmacaoFinal").value,
    delay_mensagem_final_segundos:
      Number(document.getElementById("delayMensagemFinal").value),
    horario_humano_segunda_sabado_inicio:
      document.getElementById("horarioHumanoSegundaSabadoInicio").value,
    horario_humano_segunda_sabado_fim:
      document.getElementById("horarioHumanoSegundaSabadoFim").value,
    horario_humano_domingo_inicio:
      document.getElementById("horarioHumanoDomingoInicio").value,
    horario_humano_domingo_fim:
      document.getElementById("horarioHumanoDomingoFim").value,
    plataformas: configAtual.plataformas || [],
  };

  try {
    definirCarregamento(botao, true);
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
    configAtual = {
      ...configSalva,
      plataformas: Array.isArray(configSalva.plataformas) ? configSalva.plataformas : [],
    };

    document.getElementById("mensagemFinalAtiva").checked =
      Boolean(configSalva.mensagem_final_ativa);
    document.getElementById("mensagemFinal").value =
      configSalva.mensagem_final || "";
    document.getElementById("perguntaConfirmacaoFinal").value =
      configSalva.pergunta_confirmacao_final || "Te ajudo em algo mais?";
    document.getElementById("delayMensagemFinal").value =
      configSalva.delay_mensagem_final_segundos ?? 20;
    document.getElementById("horarioHumanoSegundaSabadoInicio").value =
      configSalva.horario_humano_segunda_sabado_inicio || "09:00";
    document.getElementById("horarioHumanoSegundaSabadoFim").value =
      configSalva.horario_humano_segunda_sabado_fim || "22:00";
    document.getElementById("horarioHumanoDomingoInicio").value =
      configSalva.horario_humano_domingo_inicio || "09:00";
    document.getElementById("horarioHumanoDomingoFim").value =
      configSalva.horario_humano_domingo_fim || "20:00";
    atualizarPreviewImagem(configSalva);
    atualizarPreviewConversa();

    mostrarStatusConfig("Configuração salva.", "success");
    mostrarStatusHorario("Horario salvo.", "success");
    mostrarToast("Configuração salva", "As alterações já estão ativas.", "success");
  } catch (error) {
    mostrarStatusConfig(
      "Não foi possível salvar a configuração.",
      "error"
    );
    mostrarStatusHorario("Nao foi possivel salvar o horario.", "error");
    mostrarToast("Erro ao salvar", "Revise os dados e tente novamente.", "error");
  } finally {
    definirCarregamento(botao, false);
  }
}

async function salvarConfigComPlataformas(callbackSucesso) {
  const response = await fetchAdmin(`${API_BASE_URL}/api/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mensagem_final_ativa:
        document.getElementById("mensagemFinalAtiva").checked,
      mensagem_final:
        document.getElementById("mensagemFinal").value,
      pergunta_confirmacao_final:
        document.getElementById("perguntaConfirmacaoFinal").value,
      delay_mensagem_final_segundos:
        Number(document.getElementById("delayMensagemFinal").value),
      horario_humano_segunda_sabado_inicio:
        document.getElementById("horarioHumanoSegundaSabadoInicio").value,
      horario_humano_segunda_sabado_fim:
        document.getElementById("horarioHumanoSegundaSabadoFim").value,
      horario_humano_domingo_inicio:
        document.getElementById("horarioHumanoDomingoInicio").value,
      horario_humano_domingo_fim:
        document.getElementById("horarioHumanoDomingoFim").value,
      plataformas: configAtual.plataformas || [],
    }),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel salvar plataformas.");
  }

  const configSalva = await response.json();
  configAtual = {
    ...configSalva,
    plataformas: Array.isArray(configSalva.plataformas) ? configSalva.plataformas : [],
  };
  renderizarPlataformas();
  if (callbackSucesso) callbackSucesso();
}

function lerPlataformaDoFormulario() {
  const nome = document.getElementById("platformName")?.value.trim() || "";
  const url = document.getElementById("platformUrl")?.value.trim() || "";
  const keyInformada = document.getElementById("platformKey")?.value.trim() || "";
  const key = gerarPlatformKey(keyInformada || nome || url);

  return {
    key,
    name: nome,
    url,
    aliases: textoParaAliases(document.getElementById("platformAliases")?.value || ""),
    active: document.getElementById("platformActive")?.checked !== false,
  };
}

async function adicionarPlataforma(event) {
  event.preventDefault();
  const botao = event.submitter;
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
    definirCarregamento(botao, true);
    await salvarConfigComPlataformas(() => {
      limparFormularioPlataforma();
      mostrarStatusPlataforma("Plataforma salva.", "success");
      mostrarToast("Plataforma salva", "O catalogo interno foi atualizado.", "success");
    });
  } catch (error) {
    mostrarStatusPlataforma("Nao foi possivel salvar a plataforma.", "error");
    mostrarToast("Erro ao salvar", "Nao foi possivel atualizar o catalogo.", "error");
  } finally {
    definirCarregamento(botao, false);
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

async function removerPlataforma(key) {
  if (!confirm("Remover esta plataforma do catalogo interno?")) return;

  configAtual.plataformas = (configAtual.plataformas || []).filter(
    (item) => item.key !== key
  );

  try {
    await salvarConfigComPlataformas(() => {
      mostrarStatusPlataforma("Plataforma removida.", "success");
      mostrarToast("Plataforma removida", "O catalogo interno foi atualizado.", "success");
    });
  } catch (error) {
    mostrarStatusPlataforma("Nao foi possivel remover a plataforma.", "error");
  }
}

async function alternarPlataforma(key, ativo) {
  configAtual.plataformas = (configAtual.plataformas || []).map((item) =>
    item.key === key ? { ...item, active: ativo } : item
  );

  try {
    await salvarConfigComPlataformas(() => {
      mostrarStatusPlataforma("Plataforma atualizada.", "success");
    });
  } catch (error) {
    mostrarStatusPlataforma("Nao foi possivel atualizar a plataforma.", "error");
  }
}

function renderizarPlataformas() {
  const tbody = document.getElementById("platformsBody");
  if (!tbody) return;

  const plataformas = configAtual.plataformas || [];

  if (!plataformas.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhuma plataforma cadastrada.</td></tr>';
    return;
  }

  tbody.innerHTML = plataformas.map((item) => {
    const aliases = aliasesParaTexto(item.aliases).replace(/\n/g, ", ");
    const url = linkSeguro(item.url);
    return `
      <tr>
        <td><input type="checkbox" ${item.active !== false ? "checked" : ""} onchange="alternarPlataforma('${escaparHtml(item.key)}', this.checked)" /></td>
        <td>${escaparHtml(item.key)}</td>
        <td>${escaparHtml(item.name)}</td>
        <td>${url ? `<a class="video-link" href="${escaparHtml(url)}" target="_blank" rel="noopener">${escaparHtml(item.url)}</a>` : escaparHtml(item.url || "-")}</td>
        <td>${escaparHtml(aliases || "-")}</td>
        <td><div class="response-actions"><button class="icon-button" type="button" onclick="editarPlataforma('${escaparHtml(item.key)}')">Editar</button><button class="icon-button remove" type="button" onclick="removerPlataforma('${escaparHtml(item.key)}')">Remover</button></div></td>
      </tr>
    `;
  }).join("");
}

async function enviarImagemMensagemFinal(botao) {
  const input = document.getElementById("mensagemFinalImage");

  if (!input?.files?.length) {
    mostrarStatusImagem("Selecione uma imagem.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("image", input.files[0]);

  try {
    definirCarregamento(botao, true);
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
    mostrarToast("Imagem atualizada", "A imagem da mensagem final foi salva.", "success");
  } catch (error) {
    mostrarStatusImagem("Não foi possível enviar a imagem.", "error");
    mostrarToast("Falha no envio", "Não foi possível salvar a imagem.", "error");
  } finally {
    definirCarregamento(botao, false);
  }
}

async function removerImagemMensagemFinal(botao) {
  try {
    definirCarregamento(botao, true);
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
    mostrarToast("Imagem removida", "A mensagem final continuará somente com texto.", "success");
  } catch (error) {
    mostrarStatusImagem("Não foi possível remover a imagem.", "error");
    mostrarToast("Erro ao remover", "Tente novamente em alguns instantes.", "error");
  } finally {
    definirCarregamento(botao, false);
  }
}

async function carregarFila(botao) {
  const tbody = document.getElementById("filaBody");
  const totalFila = document.getElementById("totalFila");
  const totalHumano = document.getElementById("totalHumano");
  const navFilaCount = document.getElementById("navFilaCount");
  const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");

  let fila = [];

  try {
    definirCarregamento(botao, true);
    if (botao) mostrarCarregamentoTabela(tbody, 6, "Atualizando fila...");
    const response = await fetchAdmin(`${API_BASE_URL}/api/fila`);
    if (!response.ok) throw new Error("Erro ao carregar fila");
    fila = await response.json();
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Não foi possível carregar a fila.
        </td>
      </tr>
    `;
    mostrarToast("Fila indisponível", "Não foi possível buscar os atendimentos.", "error");
    return;
  } finally {
    definirCarregamento(botao, false);
  }

  totalFila.textContent = fila.length;
  totalHumano.textContent = fila.length;
  if (navFilaCount) navFilaCount.textContent = fila.length;
  ultimaAtualizacao.textContent = agora();

  if (!fila.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
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
          <td>${item.site || "-"}</td>
          <td>${item.mensagem || "-"}</td>
          <td>${item.horario || "-"}</td>
          <td><span class="badge">${item.status || "aguardando"}</span></td>
          <td>
            <button class="button secondary" onclick="encerrarAtendimento('${item.numero}')">
              Encerrar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderizarTabelaMetricas(tbody, itens, colunaNome, vazioTexto) {
  if (!tbody) return;

  if (!itens?.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="empty">${vazioTexto}</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = itens
    .map((item) => `
      <tr>
        <td>${METRICAS_GATILHO_LABELS[item[colunaNome]] || item[colunaNome] || "desconhecido"}</td>
        <td><strong>${item.total || 0}</strong></td>
      </tr>
    `)
    .join("");
}

async function carregarMetricas(botao) {
  const totalHumanoHoje = document.getElementById("totalHumanoHoje");
  const metricasStatus = document.getElementById("metricasStatus");
  const metricasEmpty = document.getElementById("metricasEmpty");
  const siteBody = document.getElementById("metricasSiteBody");
  const motivoBody = document.getElementById("metricasMotivoBody");

  try {
    definirCarregamento(botao, true);
    if (botao) {
      mostrarCarregamentoTabela(siteBody, 2, "Atualizando métricas...");
      mostrarCarregamentoTabela(motivoBody, 2, "Atualizando métricas...");
    }
    const response = await fetchAdmin(`${API_BASE_URL}/api/metrics/today`);

    if (!response.ok) {
      throw new Error("Erro ao carregar metricas");
    }

    const metricas = await response.json();
    const total = metricas.total_humano_hoje || 0;

    totalHumanoHoje.textContent = total;
    metricasStatus.textContent = `Atualizado às ${agora()}`;
    metricasEmpty.hidden = total > 0;

    renderizarTabelaMetricas(
      siteBody,
      metricas.por_site,
      "site",
      "Nenhum atendimento humano registrado hoje."
    );
    renderizarTabelaMetricas(
      motivoBody,
      metricas.por_gatilho || metricas.por_motivo,
      "motivo",
      "Nenhum gatilho registrado hoje."
    );
  } catch (error) {
    totalHumanoHoje.textContent = "0";
    metricasStatus.textContent = "Não foi possível carregar as métricas.";
    metricasEmpty.hidden = false;
    metricasEmpty.textContent = "Nenhum atendimento humano registrado hoje.";

    renderizarTabelaMetricas(siteBody, [], "site", "Não foi possível carregar as métricas.");
    renderizarTabelaMetricas(motivoBody, [], "motivo", "Não foi possível carregar as métricas.");
    mostrarToast("Métricas indisponíveis", "Não foi possível atualizar os indicadores.", "error");
  } finally {
    definirCarregamento(botao, false);
  }
}

function atualizarResumoRespostas() {
  const total = document.getElementById("respostasTotal");
  const ativas = document.getElementById("respostasAtivas");
  if (total) total.textContent = respostasCache.length;
  if (ativas) {
    ativas.textContent = respostasCache.filter((item) => item.ativo).length;
  }
}

function renderizarRespostas(itens) {
  const tbody = document.getElementById("respostasBody");
  if (!tbody) return;

  if (!itens.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhuma resposta encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = itens.map((item) => {
    const video = linkSeguro(item.video);
    return `
    <tr>
      <td><div class="response-question"><strong>${escaparHtml(item.pergunta)}</strong><span>${escaparHtml(item.categoria || "Sem categoria")}</span></div></td>
      <td><div class="response-copy">${escaparHtml(item.resposta)}</div></td>
      <td>${video ? `<a class="video-link" href="${escaparHtml(video)}" target="_blank" rel="noopener">Abrir</a>` : "-"}</td>
      <td><div class="status-stack"><span class="boolean-status ${item.ativo ? "active" : ""}">${item.ativo ? "Ativo" : "Inativo"}</span>${item.encaminhar_humano === "sim" ? '<span class="human-status">Operador</span>' : ""}</div></td>
      <td><div class="response-actions"><button class="icon-button" type="button" onclick="abrirEditorResposta(${item.id})">Editar</button><button class="icon-button remove" type="button" onclick="excluirResposta(${item.id})">Remover</button></div></td>
    </tr>`;
  }).join("");
}

function filtrarRespostas() {
  const termo = normalizarBusca(
    document.getElementById("respostasBusca")?.value || ""
  );
  const filtradas = termo
    ? respostasCache.filter((item) => normalizarBusca(
        `${item.pergunta} ${item.resposta} ${item.categoria} ${item.sinonimos}`
      ).includes(termo))
    : respostasCache;
  renderizarRespostas(filtradas);
}

function normalizarBusca(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function carregarRespostas(botao) {
  const tbody = document.getElementById("respostasBody");
  try {
    definirCarregamento(botao, true);
    mostrarCarregamentoTabela(tbody, 5, "Carregando base...");
    const response = await fetchAdmin(`${API_BASE_URL}/api/respostas`);
    if (!response.ok) throw new Error("Nao foi possivel carregar a base.");
    respostasCache = await response.json();
    atualizarResumoRespostas();
    filtrarRespostas();
  } catch (error) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="empty">${escaparHtml(error.message)}</td></tr>`;
    mostrarToast("Base indisponivel", error.message, "error");
  } finally {
    definirCarregamento(botao, false);
  }
}

function preencherCampo(id, valor) {
  const campo = document.getElementById(id);
  if (campo) campo.value = valor ?? "";
}

function abrirEditorResposta(id) {
  const item = respostasCache.find((resposta) => resposta.id === Number(id));
  preencherCampo("respostaId", item?.id || "");
  preencherCampo("respostaPergunta", item?.pergunta || "");
  preencherCampo("respostaTexto", item?.resposta || "");
  preencherCampo("respostaVideo", item?.video || "");
  preencherCampo("respostaCategoria", item?.categoria || "");
  preencherCampo("respostaPrioridade", item?.prioridade ?? 0);
  preencherCampo("respostaSinonimos", item?.sinonimos || "");
  preencherCampo("respostaObservacao", item?.observacao || "");
  document.getElementById("respostaAtiva").checked = item?.ativo ?? true;
  document.getElementById("respostaEncaminharHumano").checked =
    item?.encaminhar_humano === "sim";
  document.getElementById("respostaDialogTitulo").textContent =
    item ? "Editar resposta" : "Nova resposta";
  document.getElementById("respostaStatus").textContent = "";
  document.getElementById("respostaDialog").showModal();
  setTimeout(() => document.getElementById("respostaPergunta")?.focus(), 50);
}

function fecharEditorResposta() {
  document.getElementById("respostaDialog")?.close();
}

async function salvarResposta(event) {
  event.preventDefault();
  const id = document.getElementById("respostaId").value;
  const botao = document.getElementById("respostaSalvarButton");
  const dados = {
    pergunta: document.getElementById("respostaPergunta").value,
    resposta: document.getElementById("respostaTexto").value,
    video: document.getElementById("respostaVideo").value,
    ativo: document.getElementById("respostaAtiva").checked,
    categoria: document.getElementById("respostaCategoria").value,
    prioridade: Number(document.getElementById("respostaPrioridade").value),
    encaminhar_humano: document.getElementById("respostaEncaminharHumano").checked
      ? "sim"
      : "nao",
    sinonimos: document.getElementById("respostaSinonimos").value,
    observacao: document.getElementById("respostaObservacao").value,
  };

  try {
    definirCarregamento(botao, true);
    const response = await fetchAdmin(
      id ? `${API_BASE_URL}/api/respostas/${id}` : `${API_BASE_URL}/api/respostas`,
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }
    );
    const resultado = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resultado.erro || "Nao foi possivel salvar.");
    fecharEditorResposta();
    await carregarRespostas();
    mostrarToast("Resposta salva", "A base respostas.xlsx foi atualizada.", "success");
  } catch (error) {
    const status = document.getElementById("respostaStatus");
    status.textContent = error.message;
    status.className = "status-message error";
  } finally {
    definirCarregamento(botao, false);
  }
}

async function excluirResposta(id) {
  const item = respostasCache.find((resposta) => resposta.id === Number(id));
  if (!confirm(`Remover a resposta "${item?.pergunta || id}"?`)) return;

  try {
    const response = await fetchAdmin(`${API_BASE_URL}/api/respostas/${id}`, {
      method: "DELETE",
    });
    const resultado = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resultado.erro || "Nao foi possivel remover.");
    await carregarRespostas();
    mostrarToast("Resposta removida", "A planilha foi atualizada.", "success");
  } catch (error) {
    mostrarToast("Erro ao remover", error.message, "error");
  }
}

async function testarResposta(botao) {
  const campo = document.getElementById("respostasTesteMensagem");
  const status = document.getElementById("respostasTesteStatus");
  const mensagem = campo?.value.trim();

  if (!mensagem) {
    if (status) {
      status.textContent = "Digite uma mensagem para testar.";
      status.className = "status-message error";
    }
    return;
  }

  try {
    definirCarregamento(botao, true);
    if (status) {
      status.textContent = "Consultando base publicada...";
      status.className = "status-message";
    }

    const response = await fetchAdmin(`${API_BASE_URL}/api/respostas/testar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem }),
    });
    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(resultado.erro || "Nao foi possivel testar.");
    }

    if (!resultado.encontrou) {
      status.textContent = "Nenhuma resposta publicada encontrada para esse texto.";
      status.className = "status-message error";
      return;
    }

    status.textContent = resultado.encaminhar_humano
      ? `Encontrou resposta e encaminha para operador: ${resultado.resposta}`
      : `Encontrou resposta: ${resultado.resposta}`;
    status.className = "status-message success";
  } catch (error) {
    if (status) {
      status.textContent = error.message;
      status.className = "status-message error";
    }
  } finally {
    definirCarregamento(botao, false);
  }
}

function mostrarStatusResetOperacional(texto, tipo = "info") {
  const status = document.getElementById("resetOperacionalStatus");

  if (!status) return;

  status.textContent = texto;
  status.className = `status-message ${tipo}`;
}

function abrirResetOperacional() {
  const dialog = document.getElementById("resetDialog");
  const password = document.getElementById("resetPassword");
  if (!dialog) return;
  if (password) password.value = "";
  dialog.showModal();
  setTimeout(() => password?.focus(), 50);
}

function fecharResetOperacional() {
  document.getElementById("resetDialog")?.close();
}

async function confirmarResetOperacional(event) {
  event.preventDefault();
  const botao = document.getElementById("resetConfirmButton");
  const password = document.getElementById("resetPassword")?.value;
  if (!password) return;

  try {
    definirCarregamento(botao, true);
    mostrarStatusResetOperacional("Executando reset operacional...");

    const response = await fetchAdmin(
      `${API_BASE_URL}/api/admin/reset-operacional`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );

    if (!response.ok) {
      const erro = await response.json().catch(() => ({}));
      throw new Error(
        erro.erro || "Nao foi possivel executar o reset operacional."
      );
    }

    mostrarStatusResetOperacional(
      "Reset operacional executado com sucesso.",
      "success"
    );
    mostrarToast("Reset concluído", "O estado operacional foi limpo com sucesso.", "success");
    fecharResetOperacional();
    await carregarFila();
    await carregarMetricas();
  } catch (error) {
    mostrarStatusResetOperacional(error.message, "error");
    mostrarToast("Reset não executado", error.message, "error");
  } finally {
    definirCarregamento(botao, false);
  }
}

async function encerrarAtendimento(numero) {
  const confirmar = confirm(
    "Encerrar este atendimento? O bot perguntará se o cliente precisa de algo mais antes de finalizar."
  );

  if (!confirmar) return;

  try {
    const response = await fetchAdmin(`${API_BASE_URL}/api/fila/encerrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numero }),
    });

    if (!response.ok) throw new Error("Não foi possível encerrar o atendimento.");
    mostrarToast("Atendimento encerrado", "O fluxo de confirmação foi iniciado no WhatsApp.", "success");
    await carregarFila();
  } catch (error) {
    mostrarToast("Erro ao encerrar", error.message, "error");
  }
}

mostrarSecao("atendimentos");
carregarStatusWaha();
carregarConfig();
carregarFila();
document
  .getElementById("perguntaConfirmacaoFinal")
  ?.addEventListener("input", atualizarPreviewConversa);
document
  .getElementById("mensagemFinal")
  ?.addEventListener("input", atualizarPreviewConversa);
document
  .getElementById("mensagemFinalImage")
  ?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (imagemPreviewLocalUrl) {
      URL.revokeObjectURL(imagemPreviewLocalUrl);
      imagemPreviewLocalUrl = "";
    }

    if (!file) {
      carregarConfig();
      return;
    }

    imagemPreviewLocalUrl = URL.createObjectURL(file);
    const preview = document.getElementById("mensagemFinalImagePreview");
    const vazio = document.getElementById("mensagemFinalImageEmpty");

    if (preview && vazio) {
      preview.src = imagemPreviewLocalUrl;
      preview.hidden = false;
      vazio.hidden = true;
    }

    atualizarPreviewImagemConversa(imagemPreviewLocalUrl);
  });
setInterval(carregarFila, 10000);
setInterval(carregarStatusWaha, 30000);
