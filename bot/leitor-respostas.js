// Módulo para ler e buscar respostas nas planilhas Excel
const XLSX = require('xlsx');
const path = require('path');

let baseDados = {};
let ultimaAtualizacao = null;

function carregarPlanilha() {
  try {
    const caminhoArquivo = path.join(__dirname, 'data', 'respostas.xlsx');
    
    console.log(`📖 Carregando planilha: ${caminhoArquivo}`);
    
    const workbook = XLSX.readFile(caminhoArquivo);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const dados = XLSX.utils.sheet_to_json(worksheet);
    
    baseDados = {};
    
    dados.forEach((linha) => {
      if (linha.gatilho && linha.resposta && linha.ativo === 'sim') {
        const gatilho = String(linha.gatilho).toLowerCase().trim();
        const resposta = String(linha.resposta).trim();
        baseDados[gatilho] = resposta;
      }
    });
    
    ultimaAtualizacao = new Date();
    
    console.log(`✅ Planilha carregada: ${Object.keys(baseDados).length} respostas`);
    
    return true;
  } catch (erro) {
    console.error(`⚠️ Erro ao carregar planilha:`, erro.message);
    return false;
  }
}

function buscarResposta(mensagem) {
  if (!mensagem) return null;
  
  const mensagemLimpa = String(mensagem).toLowerCase().trim();
  
  // Busca exata
  if (baseDados[mensagemLimpa]) {
    return baseDados[mensagemLimpa];
  }
  
  // Busca parcial
  for (const [gatilho, resposta] of Object.entries(baseDados)) {
    if (mensagemLimpa.includes(gatilho)) {
      return resposta;
    }
  }
  
  return null;
}

module.exports = {
  carregarPlanilha,
  buscarResposta,
  obterTodosGatilhos: () => Object.keys(baseDados)
};
