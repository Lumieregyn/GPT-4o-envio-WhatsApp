const express = require('express');

const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory storage of the QR code
let qrBase64 = '';

// POST /qr → receive the Base64-encoded QR code
app.post('/qr', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ status: 'error', message: 'code is required' });
  }
  // Clean possible data URI prefix
  qrBase64 = code.replace(/^data:image\/png;base64,/, '');
  return res.json({ status: 'ok' });
});

// GET /qr → display the QR code as an image in HTML
app.get('/qr', (_req, res) => {
  if (!qrBase64) {
    return res.status(404).send('QR code not generated yet. POST /qr first.');
  }
  const html = \`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>QR Code</title></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
  <img src="data:image/png;base64,\${qrBase64}" alt="QR Code" />
</body>
</html>\`;
  res.send(html);
});

// Healthcheck endpoint
app.get('/health', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(\`🚀 Servidor rodando na porta \${PORT}\`);
});
