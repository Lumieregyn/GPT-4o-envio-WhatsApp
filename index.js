
import express from 'express';
import { create } from '@wppconnect-team/wppconnect';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

let clientWpp;
let qrCodeBase64 = '';

const alerts = [];

create({
  session: 'lumieregyn',
  catchQR: (base64Qr) => {
    qrCodeBase64 = base64Qr;
    const html = `
      <html>
        <body style="text-align:center;">
          <h1>Escaneie o QR Code</h1>
          <img src="\${base64Qr}" style="width:300px;height:300px;"/>
        </body>
      </html>
    `;
    if (!fs.existsSync('./public')) {
      fs.mkdirSync('./public');
    }
    fs.writeFileSync('./public/qr.html', html);
    console.log('🔄 QR Code atualizado e salvo.');
  },
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
  headless: true,
  logQR: false,
}).then((client) => {
  clientWpp = client;
  console.log('✅ WhatsApp conectado e pronto para uso.');

  app.post('/conversa', express.json(), async (req, res) => {
    const payload = req.body.payload;
    if (!payload) {
      return res.status(400).send('Payload ausente.');
    }

    const { user, attendant, message } = payload;

    if (!user?.Phone || !attendant?.Name || !message?.text) {
      return res.status(400).send('Informações insuficientes no payload.');
    }

    console.log('🔍 Analisando conversa...');

    const textoAnalise = \`Cliente \${user.Name} enviou: "\${message.text}"\nVendedor: \${attendant.Name}\`;

    const alerta = {
      id: Date.now(),
      cliente: user.Name,
      vendedor: attendant.Name,
      telefone: user.Phone,
      texto: textoAnalise,
      status: 'pendente'
    };

    alerts.push(alerta);

    try {
      await clientWpp.sendText(\`\${user.Phone}@c.us\`, \`📢 Atenção!\n\${textoAnalise}\`);
      console.log(\`✅ Mensagem enviada para vendedor: \${attendant.Name}\`);
      alerta.status = 'enviado';
    } catch (error) {
      console.error('❌ Falha ao enviar mensagem:', error);
      alerta.status = 'erro';
    }

    res.json({ status: 'ok', alerta });
  });
});

app.get('/qr', (req, res) => {
  if (qrCodeBase64) {
    res.send(\`
      <html>
        <body style="text-align:center;">
          <h1>Escaneie para conectar</h1>
          <img src="\${qrCodeBase64}" style="width:300px;height:300px;"/>
        </body>
      </html>
    \`);
  } else {
    res.send('QR Code ainda não gerado. Aguarde...');
  }
});

app.get('/painel', (req, res) => {
  res.send(\`
    <html>
      <body style="font-family:sans-serif;">
        <h1>📈 Painel de Alertas Enviados</h1>
        <ul>
          \${alerts.map(alert => \`<li>[\${alert.status}] Cliente: \${alert.cliente} | Vendedor: \${alert.vendedor} | Texto: \${alert.texto}</li>\`).join('')}
        </ul>
      </body>
    </html>
  \`);
});

app.get('/health', (req, res) => res.send('Servidor ativo 🚀'));

app.listen(PORT, () => {
  console.log(\`🚀 Servidor Express iniciado na porta \${PORT}\`);
});
