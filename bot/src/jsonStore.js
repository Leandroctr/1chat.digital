const fs = require("fs");
const path = require("path");

function garantirPasta(caminho) {
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
}

function garantirArquivoJson(caminho, padrao) {
  garantirPasta(path.dirname(caminho));

  if (!fs.existsSync(caminho)) {
    fs.writeFileSync(caminho, JSON.stringify(padrao, null, 2), "utf8");
  }
}

function carregarJson(caminho, padrao) {
  if (!fs.existsSync(caminho)) return padrao;

  const conteudo = fs.readFileSync(caminho, "utf8");
  if (!conteudo.trim()) return padrao;

  return JSON.parse(conteudo);
}

function salvarJson(caminho, dados) {
  garantirPasta(path.dirname(caminho));
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), "utf8");
}

module.exports = {
  garantirPasta,
  garantirArquivoJson,
  carregarJson,
  salvarJson,
};
