import express from 'express';
import { create } from '@wppconnect-team/wppconnect';
import { config } from 'dotenv';
import axios from 'axios';
import { OpenAI } from 'openai';

config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GESTOR_PHONE = process.env.GESTOR_PHONE;

function montarConteudoConversacional(message) {
  const nomeCliente = message.user?.Name || 'Cliente';
  const texto = message.message?.text || '';
  const vendedor = message.attendant?.Name || 'Vendedor';
  return `Conversa entre ${vendedor} e ${nomeCliente}:

${texto}`;
}

function criarPromptFinal(conteudo) {
  return `A seguir está a transcrição de uma conversa no WhatsApp entre um vendedor e um cliente. Extraia as informações confirmadas pelo cliente (produto, cor, medidas, quantidade, tensão, prazo) e informe se o cliente autorizou ou não gerar o pedido. Sinalize os campos ausentes e oriente o vendedor sobre o que falta.

Conversa:
${conteudo}`;
}

async function enviarMensagem(numero, texto) {
  try {
    const session = await global.client.getSessionToken();
    const result = await global.client.sendText(numero, texto, { waitForAck: true, timeout: 15000 });
    console.log(`✅ Mensagem enviada para ${numero}`);
    return result;
  } catch (error) {
    console.error('❌ Erro no envio de alerta:', error.message);
    return null;
  }
}

app.post('/conversa', async (req, res) => {
  try {
    const message = req.body.payload || req.body;
    const conteudo = montarConteudoConversacional(message);
    const promptFinal = criarPromptFinal(conteudo);

    const resposta = await openai.chat.completions.create({
      messages: [{ role: 'user', content: promptFinal }],
      model: 'gpt-4o'
    });

    const analise = resposta.choices[0].message.content.trim();
    const cliente = message.user?.Name || 'Cliente';
    const vendedor = message.attendant?.Name || 'Vendedor';
    const foneVendedor = message.user?.Phone;

    console.log(`\n📌 Análise GPT-4o:`, analise);

    const alerta = `⚠️ Atendimento de ${vendedor} com ${cliente}

${analise}

📱 Cliente: ${foneVendedor}`;
    await enviarMensagem(GESTOR_PHONE, alerta);

    return res.json({ status: 'ok', analise });
  } catch (error) {
    console.error('Erro na análise GPT ou envio WhatsApp:', error.message);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

create({
  session: 'lumieregyn',
  headless: true,
  browserArgs: ['--no-sandbox'],
  catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
    console.log('⚠️ Escaneie o QR Code no seu WhatsApp:');
    console.log(asciiQR);
  },
  statusFind: (statusSession) => {
    console.log('Sessão:', statusSession);
  }
}).then((client) => {
  global.client = client;
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
});
