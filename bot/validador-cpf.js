// Validador de CPF - Sem consultar banco de dados
// Apenas valida formato e dígitos verificadores

function limparCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

function validarDigitosIguais(cpf) {
  const digitos = cpf.split('');
  return !digitos.every(d => d === digitos[0]);
}

function calcularPrimeiroDigito(cpf) {
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function calcularSegundoDigito(cpf) {
  let soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function validarDigitosVerificadores(cpf) {
  const primeiroCalculado = calcularPrimeiroDigito(cpf);
  const primeiroReal = parseInt(cpf[9]);

  if (primeiroCalculado !== primeiroReal) return false;

  const segundoCalculado = calcularSegundoDigito(cpf);
  const segundoReal = parseInt(cpf[10]);

  return segundoCalculado === segundoReal;
}

function validarCPF(cpf) {
  const cpfLimpo = limparCPF(cpf);

  if (!/^\d+$/.test(cpfLimpo)) {
    return {
      valido: false,
      mensagem: 'CPF deve conter apenas números.'
    };
  }

  if (cpfLimpo.length !== 11) {
    return {
      valido: false,
      mensagem: 'CPF deve ter exatamente 11 dígitos.'
    };
  }

  if (!validarDigitosIguais(cpfLimpo)) {
    return {
      valido: false,
      mensagem: 'Esse número não é um CPF válido.'
    };
  }

  if (!validarDigitosVerificadores(cpfLimpo)) {
    return {
      valido: false,
      mensagem: 'Esse número não é um CPF válido.'
    };
  }

  return {
    valido: true,
    cpfFormatado: `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9)}`
  };
}

module.exports = { validarCPF };
