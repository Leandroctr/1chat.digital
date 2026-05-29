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
          Nao foi possivel carregar a fila.
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
    "Encerrar este atendimento? O cliente voltará para o fluxo inicial e terá que informar CPF e site novamente."
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

carregarFila();
setInterval(carregarFila, 10000);
