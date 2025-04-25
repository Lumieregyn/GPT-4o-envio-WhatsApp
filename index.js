
require('dotenv').config();
const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GESTOR_PHONE = process.env.GESTOR_PHONE;

let client = null;
let qrImageBase64 = null;

// Health check
app.get('/health', (_, res) => res.status(200).send('OK'));

create({
  session: 'lumieregyn',
  catchQR: (base64Qrimg, asciiQR, attempt, urlCode) => {
    qrImageBase64 = base64Qrimg.split(',')[1];
    fs.writeFileSync('./public/qr.html', `
      <html>
        <body style="text-align:center;margin-top:40px;">
          <h2>Escaneie o QR Code abaixo:</h2>
          <img src="data:image/png;base64,${qrImageBase64}" />
        </body>
      </html>
    `);
    console.log('📸 QR Code atualizado. Acesse /qr para escanear.');
  },
  logQR: false,
  headless: true,
  useChrome: true,
  browserArgs: ['--no-sandbox']
}).then((wpp) => {
  client = wpp;
  console.log('✅ WhatsApp conectado e pronto para envio.');
}).catch((err) => {
  console.error('❌ Erro ao iniciar sessão do WhatsApp:', err.message);
});

app.get('/qr', (_, res) => {
  const htmlPath = path.join(__dirname, 'public', 'qr.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send('QR Code ainda não gerado. Aguarde...');
  }
});

app.post('/conversa', async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: 'WhatsApp não conectado ainda' });
  }

  const p = req.body.payload || {};
  const user = p.user || {};
  const message = p.Message || {};
  const attendant = p.attendant || {};

  const hasContent = message.text || (Array.isArray(message.attachments) && message.attachments.length > 0);
  if (!hasContent) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  const conteudo = message.text || '[anexo]';

  const prompt = `Você é um supervisor de atendimento comercial. Verifique se nesta conversa o cliente confirmou: produto, cor, medidas, quantidade, tensão, prazo e disse "pode gerar". Mensagem:\n${conteudo}`;

  try {
    const gpt = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    }, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const resultado = gpt.data.choices[0].message.content;
    console.log('📌 Análise do checklist:', resultado);

    if (resultado.includes('⚠️')) {
      const alerta = `🚨 *ATENÇÃO*\nO cliente *${user.Name || 'Cliente'}* ainda não confirmou tudo:\n\n${resultado}\n\nResponsável: *${attendant.Name || 'vendedor'}*`;

      if (GESTOR_PHONE) await client.sendText(`${GESTOR_PHONE}@c.us`, alerta);
      if (user.Phone) await client.sendText(`${user.Phone}@c.us`, alerta);
      console.log('✅ Alerta enviado com sucesso.');
    }

    res.status(200).json({ status: 'ok', analise: resultado });
  } catch (err) {
    console.error('❌ Erro na análise GPT ou envio SURI:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
