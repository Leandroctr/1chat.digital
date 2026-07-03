function removerEsquemaUrl(texto) {
  return String(texto || "")
    .replace(/https?:\/\//gi, "")
    .replace(/\bwww\./gi, "");
}

function normalizarTextoPlataforma(texto) {
  return removerEsquemaUrl(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[/?#].*$/g, "")
    .replace(/[^\w.\s-]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactarTextoPlataforma(texto) {
  return normalizarTextoPlataforma(texto).replace(/[^\w]/g, "");
}

function gerarPlatformKey(valor) {
  return compactarTextoPlataforma(valor).slice(0, 60);
}

function normalizarUrlPlataforma(url) {
  const texto = String(url || "").trim();
  if (!texto) return "";

  if (/^https?:\/\//i.test(texto)) return texto;
  return `https://${removerEsquemaUrl(texto)}`;
}

function dividirAliases(valor) {
  if (Array.isArray(valor)) return valor;

  return String(valor || "")
    .split(/[\n;,|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function normalizarPlataformaConfig(plataforma) {
  const name = String(plataforma?.name || "").trim();
  const url = normalizarUrlPlataforma(plataforma?.url);
  const key = gerarPlatformKey(plataforma?.key || name || url);

  if (!key || !name || !url) return null;

  return {
    key,
    name,
    url,
    aliases: dividirAliases(plataforma?.aliases),
    active: plataforma?.active !== false,
  };
}

function normalizarCatalogoPlataformas(plataformas, padrao = []) {
  const catalogo = Array.isArray(plataformas) ? plataformas : padrao;
  const porChave = new Map();

  for (const plataforma of catalogo) {
    const normalizada = normalizarPlataformaConfig(plataforma);
    if (!normalizada) continue;
    porChave.set(normalizada.key, normalizada);
  }

  return Array.from(porChave.values());
}

function termosDaPlataforma(plataforma) {
  return [
    plataforma.key,
    plataforma.name,
    plataforma.url,
    removerEsquemaUrl(plataforma.url),
    ...dividirAliases(plataforma.aliases),
  ].filter(Boolean);
}

function classificarMatchPlataforma(texto, plataforma) {
  const entrada = normalizarTextoPlataforma(texto);
  const entradaCompacta = compactarTextoPlataforma(texto);
  if (!entrada || !entradaCompacta) return null;

  let encontrouFraco = false;

  for (const termo of termosDaPlataforma(plataforma)) {
    const termoNormalizado = normalizarTextoPlataforma(termo);
    const termoCompacto = compactarTextoPlataforma(termo);
    if (!termoNormalizado || !termoCompacto) continue;

    if (entrada === termoNormalizado || entradaCompacta === termoCompacto) {
      return "forte";
    }

    const entradaPareceDominio = entrada.includes(".");
    const termoPareceDominio = termoNormalizado.includes(".");
    if (
      entradaPareceDominio &&
      termoPareceDominio &&
      (entrada === termoNormalizado || entrada.startsWith(`${termoNormalizado}/`))
    ) {
      return "forte";
    }

    if (
      entradaCompacta.length >= 4 &&
      termoCompacto.length >= 4 &&
      (entradaCompacta.includes(termoCompacto) || termoCompacto.includes(entradaCompacta))
    ) {
      encontrouFraco = true;
    }
  }

  return encontrouFraco ? "fraco" : null;
}

function identificarPlataforma(texto, plataformas) {
  const catalogoAtivo = normalizarCatalogoPlataformas(plataformas).filter(
    (plataforma) => plataforma.active !== false
  );
  const fortes = [];
  const fracos = [];

  for (const plataforma of catalogoAtivo) {
    const classificacao = classificarMatchPlataforma(texto, plataforma);
    if (classificacao === "forte") fortes.push(plataforma);
    if (classificacao === "fraco") fracos.push(plataforma);
  }

  if (fortes.length === 1 && fracos.length === 0) {
    return { status: "forte", plataforma: fortes[0] };
  }

  if (fortes.length > 0 || fracos.length > 1) {
    return { status: "multiplo" };
  }

  if (fracos.length === 1) {
    return { status: "fraco" };
  }

  return { status: "nenhum" };
}

function montarMensagemConfirmacaoPlataforma(plataforma) {
  return `Você quis dizer esta plataforma?\n\n${plataforma.name}\n${plataforma.url}\n\nResponda:\n1 - Sim\n2 - Não`;
}

function respostaSimPlataforma(mensagemNormalizada) {
  return ["1", "sim", "s", "isso", "correto", "certo"].includes(mensagemNormalizada);
}

function respostaNaoPlataforma(mensagemNormalizada) {
  return ["2", "nao", "n", "não"].includes(mensagemNormalizada);
}

module.exports = {
  gerarPlatformKey,
  identificarPlataforma,
  montarMensagemConfirmacaoPlataforma,
  normalizarCatalogoPlataformas,
  respostaNaoPlataforma,
  respostaSimPlataforma,
};
