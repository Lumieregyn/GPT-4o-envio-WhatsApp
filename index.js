require('dotenv').config();
const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');
const { analyzeMessage } = require('./utils/analyzeGPT');
const { isBusinessHours } = require('./utils/timeUtils');
const app = express();
const PORT = process.env.PORT || 3000;
let clientInstance = null;
let qrCodeData = '';

app.use(express.json());

create({
  session: 'lumieregyn',
  catchQR: (base64Qr) => {
    qrCodeData = base64Qr;
    console.log('🔄 QR Code capturado');
  },
  puppeteerOptions: {
    args: ['--no-sandbox'],
    protocolTimeout: 120000
  }
}).then((client) => {
  clientInstance = client;
  console.log('✅ WhatsApp conectado.');
}).catch((error) => {
  console.error('Erro ao iniciar sessão:', error);
});

app.get('/health', (req, res) => res.send('Servidor ativo!'));

app.get('/qr', (req, res) => {
  if (!qrCodeData) return res.status(404).send('QR Code ainda não disponível.');
  res.send('<html><body><h2>Escaneie o QR Code:</h2><img src="' + qrCodeData + '" style="width:300px;height:300px;" /></body></html>');
});

app.post('/alerta', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;
    if (!clientInstance) return res.status(500).send('Cliente não inicializado.');
    await clientInstance.sendText(numero + '@c.us', mensagem);
    res.send({ status: 'Mensagem enviada!' });
  } catch (error) {
    console.error('Erro ao enviar:', error);
    res.status(500).send('Erro ao enviar mensagem.');
  }
});

setInterval(async () => {
  if (!clientInstance) return;
  if (!isBusinessHours()) return;
  console.log('⏰ Verificando atrasos...');
  const simulatedMessage = "Estou aguardando orçamento!";
  const analysis = await analyzeMessage(simulatedMessage);
  console.log('📊 Análise da IA:', analysis);
  const sellerNumber = "6294671766";
  await clientInstance.sendText(sellerNumber + '@c.us', '⏳ Alerta automático: cliente aguardando orçamento.');
}, 3600000);

app.listen(PORT, () => {
  console.log('🚀 Servidor rodando na porta ' + PORT);
});
