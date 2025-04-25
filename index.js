require('dotenv').config();
const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');

const app = express();
const PORT = process.env.PORT || 8080;

let client = null;
let qrCodeBase64 = null;

app.use(express.json());

app.get('/qr', (_, res) => {
  if (!qrCodeBase64) {
    return res.send('<h3>Aguardando geração do QR Code...</h3>');
  }
  const html = `
    <html>
      <body style="text-align:center; padding-top: 40px;">
        <h2>Escaneie o QR Code abaixo:</h2>
        <img src="` + qrCodeBase64 + `" width="300" />
      </body>
    </html>`;
  res.send(html);
});

app.post('/conversa', async (req, res) => {
  try {
    const { user, message, attendant } = req.body.payload || {};
    const nomeCliente = user?.Name || 'Cliente';
    const foneCliente = user?.Phone || '';
    const vendedor = attendant?.Name || 'Vendedor';
    const texto = message?.text || '';

    if (!texto) return res.status(400).json({ error: 'Texto não encontrado' });

    const pendencias = [];
    if (!/produto|arandela|plafon|pendente/i.test(texto)) pendencias.push('Produto');
    if (!/preto|branco|dourado|cobre|cromado/i.test(texto)) pendencias.push('Cor');
    if (!/\d+\s?(pç|peç|unidade)/i.test(texto)) pendencias.push('Quantidade');
    if (!/127|220/i.test(texto)) pendencias.push('Tensão');
    if (!/cm|altura|largura|medidas/i.test(texto)) pendencias.push('Medidas');
    if (!/prazo|dias|entrega/i.test(texto)) pendencias.push('Prazo');
    if (!/pode gerar|pode mandar|pode fazer/i.test(texto)) pendencias.push('Confirmação final');

    const alerta = "📌 Alerta de Checklist\n\n" +
      "Cliente: " + nomeCliente + "\n" +
      "Vendedor: " + vendedor + "\n" +
      "Telefone: " + foneCliente + "\n\n" +
      "Itens pendentes:\n" +
      pendencias.map(p => "- " + p).join("\n") + "\n\n" +
      "⚠️ Por favor, confirme com o cliente antes de gerar o pedido.";

    if (pendencias.length > 0 && client) {
      await client.sendText(process.env.GESTOR_PHONE + '@c.us', alerta);
      console.log('✅ Alerta enviado ao gestor!');
    } else {
      console.log('✅ Mensagem completa, sem alerta.');
    }

    res.json({ status: 'ok', pendencias });
  } catch (err) {
    console.error('❌ Erro ao processar /conversa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

create({
  session: 'lumieregyn',
  catchQR: (base64) => {
    qrCodeBase64 = base64;
    console.log('🔁 QR Code atualizado.');
  },
  headless: true,
  browserArgs: ['--no-sandbox'],
}).then((clientInstance) => {
  client = clientInstance;
  console.log('✅ WhatsApp conectado e pronto para envio.');
});

app.listen(PORT, () => {
  console.log('🚀 Servidor rodando na porta ' + PORT);
});