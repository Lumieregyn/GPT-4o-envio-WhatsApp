const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

let qrCodeBase64 = '';

app.use(express.json({ limit: '10mb' }));

app.get('/qr', (req, res) => {
  if (!qrCodeBase64) {
    return res.send('QR code ainda não gerado.');
  }
  const html = '<html><body style="display:flex;justify-content:center;align-items:center;height:100vh">' +
               '<img src="data:image/png;base64,' + qrCodeBase64 + '" />' +
               '</body></html>';
  res.send(html);
});

app.post('/qr', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Código base64 não fornecido' });
  }
  qrCodeBase64 = code.replace(/^data:image\/png;base64,/, '');
  res.json({ status: 'QR code armazenado com sucesso' });
});

app.get('/health', (req, res) => {
  res.send('ok');
});

app.listen(port, () => {
  console.log('🚀 Servidor rodando na porta ' + port);
});
