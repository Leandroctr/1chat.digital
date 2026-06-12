function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

function pareceNomeCliente(texto) {
  const valor = String(texto || "").trim();

  if (!valor || valor.length > 60) return false;
  if (/[0-9@/#?!=+_*()[\]{}:;]/.test(valor)) return false;

  const normalizado = normalizarTexto(valor);
  const palavrasProblema = [
    "agora",
    "ajuda",
    "bonus",
    "caiu",
    "deposito",
    "dinheiro",
    "erro",
    "nao",
    "pagamento",
    "pix",
    "plataforma",
    "problema",
    "reclamar",
    "saque",
    "saldo",
    "site",
    "suporte",
  ];

  if (palavrasProblema.some((palavra) => normalizado.includes(palavra))) {
    return false;
  }

  const partes = valor
    .split(/\s+/)
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (!partes.length || partes.length > 4) return false;

  return partes.every((parte) =>
    /^(?:[A-Za-zÀ-ÖØ-öø-ÿ]{2,}|d[aeo]s?|e)$/i.test(parte)
  );
}

function horarioAtual() {
  return new Date().toLocaleString("pt-BR");
}

function dataBanco(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

module.exports = {
  dataBanco,
  horarioAtual,
  normalizarTexto,
  pareceNomeCliente,
  primeiroNome,
};
