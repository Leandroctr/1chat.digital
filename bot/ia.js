const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
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

    return "No momento não consegui entender sua solicitação. Um operador pode ajudar.";
  }
}

module.exports = {
  perguntarIA,
};
