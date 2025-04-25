const express = require('express');
const bodyParser = require('body-parser');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());

let qrCodeData = '';

// Initialize WPPConnect session and capture QR codes
wppconnect.create({
  session: 'lumieregyn',
  catchQR: (qrCode) => {
    qrCodeData = qrCode;
    console.log('QR code received:', qrCode);
  },
  puppeteerOptions: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
}).then((client) => {
  console.log('✅ WhatsApp conectado e pronto para envio.');

  // Additional event handlers as needed...
}).catch((err) => {
  console.error('❌ Erro na inicialização do WhatsApp:', err);
});

// Route to display QR code as an image
app.get('/qr', (req, res) => {
  if (!qrCodeData) {
    return res.status(404).send('QR code ainda não gerado.');
  }
  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><title>QR Code WhatsApp</title></head>
    <body>
      <h3>Escaneie o QR Code:</h3>
      <img src="data:image/png;base64,\${qrCodeData}" />
    </body>
    </html>
  \`;
  res.send(html);
});

// Endpoint to update QR code via POST
// Accepts JSON: { "qr": "<base64-string>" }
app.post('/qr', (req, res) => {
  const { qr } = req.body;
  if (!qr) {
    return res.status(400).json({ status: 'error', message: 'Campo qr é obrigatório.' });
  }
  qrCodeData = qr;
  res.json({ status: 'ok' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`🚀 Servidor rodando na porta \${port}\`);
});
