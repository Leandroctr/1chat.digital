const MENSAGEM_RECUPERACAO_SENHA =
  'Para recuperar sua senha, toque no botao "Recuperar senha" na tela de login do site.\n\nUse o mesmo WhatsApp cadastrado na conta para receber o codigo. Se voce nao tem mais acesso ao telefone cadastrado, avise aqui que vou encaminhar para um atendente.';

const MENSAGEM_RECUPERACAO_SENHA_TROCA_TELEFONE =
  "Entendi. Para troca de telefone na recuperacao de senha, vou encaminhar seu atendimento para um operador verificar com seguranca.";

const PADROES_RECUPERACAO_SENHA = [
  /\besqueci\b.*\bsenha\b/,
  /\brecuperar\b.*\bsenha\b/,
  /\bperdi\b.*\bsenha\b/,
  /\btrocar\b.*\bsenha\b/,
  /\balterar\b.*\bsenha\b/,
  /\bmudar\b.*\bsenha\b/,
  /\bnao consigo\b.*\bacessar\b/,
  /\bnao consigo\b.*\bentrar\b/,
  /\bnao consigo\b.*\blogar\b/,
  /\bsenha\b.*\bsite\b/,
  /\blogin\b.*\bsenha\b/,
  /\bsenha\b.*\blogin\b/,
  /\bacesso\b.*\bconta\b/,
  /\bacessar\b.*\bconta\b/,
  /\bentrar\b.*\bconta\b/,
];

const PADROES_TROCA_TELEFONE = [
  /\btroquei\b.*\btelefone\b/,
  /\btrocar\b.*\btelefone\b/,
  /\btroca\b.*\btelefone\b/,
  /\bmudei\b.*\btelefone\b/,
  /\bmudei\b.*\bnumero\b/,
  /\btroquei\b.*\bnumero\b/,
  /\bnumero\b.*\bantigo\b/,
  /\btelefone\b.*\bantigo\b/,
  /\bcelular\b.*\bantigo\b/,
  /\bwhatsapp\b.*\bantigo\b/,
  /\bnao tenho\b.*\bacesso\b.*\btelefone\b/,
  /\bnao tenho\b.*\bacesso\b.*\bnumero\b/,
  /\bnao tenho\b.*\bacesso\b.*\bwhatsapp\b/,
  /\bsem acesso\b.*\btelefone\b/,
  /\bsem acesso\b.*\bnumero\b/,
  /\bperdi\b.*\bnumero\b/,
  /\bperdi\b.*\btelefone\b/,
  /\bperdi\b.*\bcelular\b/,
];

function corresponde(mensagemNormalizada, padroes) {
  return padroes.some((padrao) => padrao.test(mensagemNormalizada));
}

function classificarRecuperacaoSenha(mensagemNormalizada) {
  if (corresponde(mensagemNormalizada, PADROES_TROCA_TELEFONE)) {
    return "troca_telefone";
  }

  if (corresponde(mensagemNormalizada, PADROES_RECUPERACAO_SENHA)) {
    return "recuperacao_senha";
  }

  return null;
}

module.exports = {
  MENSAGEM_RECUPERACAO_SENHA,
  MENSAGEM_RECUPERACAO_SENHA_TROCA_TELEFONE,
  classificarRecuperacaoSenha,
};
