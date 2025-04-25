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

// Health check
app.get('/health', (_, res) => res.status(200).send('OK'));

app.get('/qr', (_, res) => {
  const htmlPath = path.join(__dirname, 'public', 'qr.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send('QR Code ainda não gerado. Aguarde...');
  }
});

async function enviarAlertas(whatsappClient, vendedor, cliente, mensagemGPT) {
  const numeroGestor = GESTOR_PHONE;
  const numeroCliente = cliente.Phone;
  const nomeCliente = cliente.Name;
  const nomeVendedor = vendedor.Name;

  const alerta = `📌 Análise do Checklist GPT-4o:

Cliente: ${nomeCliente}
Vendedor: ${nomeVendedor}

${mensagemGPT}

❗ Confirme todas as informações com o cliente antes de gerar o pedido.
`;

  try {
    if (numeroGestor) {
      console.log('➡️ Enviando alerta para GESTOR:', numeroGestor);
      await whatsappClient.sendText(`${numeroGestor}@c.us`, alerta);
      console.log('✅ Alerta enviado ao GESTOR');
    }
    if (numeroCliente) {
      console.log('➡️ Enviando alerta para CLIENTE/VENDEDOR:', numeroCliente);
      await whatsappClient.sendText(`${numeroCliente}@c.us`, alerta);
      console.log('✅ Alerta enviado ao CLIENTE/VENDEDOR');
    }
  } catch (err) {
    console.error('❌ Erro no envio de alerta:', err);
  }
}

create({
  session: 'lumieregyn',
  catchQR: (base64Qrimg, asciiQR, attempt, urlCode) => {
    const qrImageBase64 = base64Qrimg.split(',')[1];
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
  headless: true,
  useChrome: true,
  logQR: false,
  protocolTimeout: 60000, // ← aumenta o timeout para 60 segundos
  browserArgs: ['--no-sandbox']
}).then((wpp) => {
  client = wpp;
  console.log('✅ WhatsApp conectado e pronto para envio.');
});


app.post('/conversa', async (req, res) => {
  console.log('📥 Requisição recebida em /conversa');
  if (!client) {
    console.error('❌ WhatsApp ainda não conectado');
    return res.status(503).json({ error: 'WhatsApp não conectado ainda' });
  }

  const p = req.body.payload || {};
  const user = p.user || {};
  const message = p.Message || {};
  const attendant = p.attendant || {};

  console.log('🧾 Dados recebidos:', { user, message, attendant });

  const hasContent = message.text || (Array.isArray(message.attachments) && message.attachments.length > 0);
  if (!hasContent) {
    console.error('❌ Mensagem vazia');
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  const conteudo = message.text || '[anexo]';
  const prompt = `Você é um supervisor de atendimento comercial. Verifique se nesta conversa o cliente confirmou: produto, cor, medidas, quantidade, tensão, prazo e disse "pode gerar". Mensagem:\n${conteudo}`;

  try {
    console.log('🎯 Enviando prompt para GPT...');
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
    console.log('🧠 Resposta do GPT:', resultado);

    if (resultado.includes('⚠️') || resultado.toLowerCase().includes('faltando')) {
      console.log('🚨 Alerta será disparado');
      await enviarAlertas(client, attendant, user, resultado);
    } else {
      console.log('✅ Mensagem completa, sem alerta.');
    }

    res.status(200).json({ status: 'ok', analise: resultado });
  } catch (err) {
    console.error('❌ Erro na análise ou envio:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
