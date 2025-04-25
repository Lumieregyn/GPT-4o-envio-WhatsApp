
import express from 'express';
import { create } from '@wppconnect-team/wppconnect';

const app = express();
const PORT = process.env.PORT || 8080;

let qrCodeImage = null;

create({
  session: 'lumieregyn',
  catchQR: (base64Qr, asciiQR) => {
    qrCodeImage = base64Qr; // Armazena a imagem base64 do QR
    console.log('🔁 Novo QR gerado');
  },
  headless: true,
  useChrome: false,
  browserArgs: ['--no-sandbox'],
}).then((client) => {
  console.log('✅ WhatsApp conectado e pronto para envio');
});

app.get('/qr', (req, res) => {
  if (!qrCodeImage) {
    return res.status(503).send('QR code ainda não gerado.');
  }
  const html = \`
    <html>
      <body style="text-align:center;">
        <h2>Escaneie o QR Code para conectar ao WhatsApp</h2>
        <img src="data:image/png;base64,\${qrCodeImage}" width="300"/>
      </body>
    </html>\`;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
