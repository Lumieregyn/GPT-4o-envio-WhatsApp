
// index.js - Projeto GPT4o WhatsApp Alerta Final
const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');
const app = express();

app.use(express.json());

const SESSION_NAME = 'lumieregyn';
let clientInstance;

create({
  session: SESSION_NAME,
  catchQR: (base64Qr, asciiQR) => {
    console.log('🔄 QR Code capturado');
  },
  headless: true,
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
}).then((client) => {
  clientInstance = client;
  console.log('✅ WhatsApp conectado e pronto para uso.');
}).catch((error) => {
  console.error('Erro ao conectar no WhatsApp:', error);
});

// Rota para checar saúde do servidor
app.get('/health', (req, res) => {
  res.send('✅ Sistema online');
});

// Rota para enviar mensagem de alerta
app.post('/alerta', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;
    if (!numero || !mensagem) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    const number = numero.includes('@c.us') ? numero : `${numero}@c.us`;

    await clientInstance.sendText(number, mensagem);
    console.log('✅ Alerta enviado para:', number);
    res.json({ status: 'sucesso', number });
  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    res.status(500).json({ error: 'Erro interno ao enviar alerta.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado na porta ${PORT}`);
});
