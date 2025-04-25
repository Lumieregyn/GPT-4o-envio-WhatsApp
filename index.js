const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

let qrCodeBase64 = null;

// Simula armazenamento do QR base64
app.get('/gerar', (req, res) => {
  qrCodeBase64 = req.query.code || null;
  if (qrCodeBase64) {
    res.send('QR code armazenado com sucesso!');
  } else {
    res.send('Código base64 inválido');
  }
});

// Rota visual /qr
app.get('/qr', (req, res) => {
  if (!qrCodeBase64) {
    return res.status(404).send('QR code ainda não disponível');
  }

  const html = `
    <html>
      <head>
        <title>QRCode</title>
      </head>
      <body style="display: flex; justify-content: center; align-items: center; height: 100vh;">
        <img src="data:image/png;base64,${qrCodeBase64}" />
      </body>
    </html>
  `;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
