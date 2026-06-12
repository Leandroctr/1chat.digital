const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const contextoSistema = `
Você é um atendente de suporte de plataforma de jogos online via WhatsApp.

REGRAS:
- Responda curto.
- Português do Brasil.
- Máximo 3 linhas.
- Nunca invente saldo.
- Nunca confirme pagamento.
- Nunca confirme saque.
- Nunca invente bônus.
- Se envolver dinheiro, diga que um operador pode verificar.
- Se o cliente repetir a mesma dúvida, parecer irritado, disser que não resolveu, ou fizer várias perguntas sem avanço, ofereça atendimento humano.
- Nesses casos, diga: "Se preferir, digite operador para falar com alguém."
- Se o cliente pedir pessoa, atendente, operador, humano ou suporte, oriente a digitar "operador".
- Não fale como robô.
`;

async function perguntarIA(mensagem) {
  try {
    const prompt = `
${contextoSistema}

Cliente:
${mensagem}
`;

    const result =
      await model.generateContent(prompt);

    const resposta =
      result.response.text();

    return resposta.trim();
  } catch (error) {
    console.error(
      "ERRO IA",
      error.message
    );

    return "No momento não consegui entender sua solicitação. Se preferir, digite operador para falar com alguém.";
  }
}

module.exports = {
  perguntarIA,
};
