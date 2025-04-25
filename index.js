import express from 'express';
import { create } from '@wppconnect-team/wppconnect';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 8080;

let qrcodeBase64 = null;

create({
  session: 'lumieregyn',
  catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
    qrcodeBase64 = base64Qr;
    console.log('🔑 QR Code atualizado');
  },
  headless: true,
  browserArgs: ['--no-sandbox']
})
.then((client) => {
  console.log('✅ WhatsApp conectado e pronto para envio.');
})
.catch((error) => {
  console.error('❌ Erro ao iniciar o WPPConnect:', error);
});

app.get('/qr', (req, res) => {
  if (!qrcodeBase64) {
    return res.send('<h3>QR Code ainda não gerado. Aguarde...</h3>');
  }

  const html = `
    <html>
      <body>
        <h2>Escaneie o QR Code no WhatsApp:</h2>
        <img src="${qrcodeBase64}" />
      </body>
    </html>
  `;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});