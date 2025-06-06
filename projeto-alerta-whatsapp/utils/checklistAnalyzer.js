const axios = require('axios');

async function analyzeMessage(messageText) {
  const prompt = `
Analise a mensagem: "${messageText}".
1. O cliente demonstra intenção de fechar pedido? (Sim/Não)
2. Existem informações faltando como produto, cor, quantidade, medidas, tensão ou prazo?
3. Há menção de orçamento pendente?

Responda em JSON.
  `;
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }]
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  });
  return response.data;
}

module.exports = { analyzeMessage };
