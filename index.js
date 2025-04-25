const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

let qrCodeBase64 = '';

create({
  session: 'lumieregyn',
  browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
    qrCodeBase64 = base64Qr;
    console.log('🔄 QR Code capturado');
    const html = '<html><body style="display:flex;justify-content:center;align-items:center;height:100vh">' +
                 '<img src="' + base64Qr + '" />' +
                 '</body></html>';
    fs.writeFileSync(path.join(__dirname, 'public', 'qr.html'), html);
  },
  headless: true,
  logQR: false,
}).then((client) => {
  console.log('✅ WhatsApp conectado e pronto para uso.');
}).catch((err) => {
  console.error('❌ Erro ao inicializar:', err);
});

app.use(express.static('public'));

app.get('/qr', (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'public', 'qr.html'))) {
    res.sendFile(path.join(__dirname, 'public', 'qr.html'));
  } else {
    res.send('<h3>QR Code ainda não gerado...</h3>');
  }
});

app.get('/health', (_req, res) => {
  res.send('ok');
});

app.listen(port, () => {
  console.log('🚀 Servidor Express iniciado na porta ' + port);
});
