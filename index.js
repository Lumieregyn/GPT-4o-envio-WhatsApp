require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { create } = require('@wppconnect-team/wppconnect');

const app = express();
app.use(express.json({ limit: '10mb' }));

const GESTOR_PHONE = process.env.GESTOR_PHONE;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function analisarConteudoTexto(texto) {
  const pendencias = [];
  if (!/produto|arandela|pendente|plafon|spot/i.test(texto)) pendencias.push('Produto');
  if (!/preto|branco|dourado|cobre|cromado/i.test(texto)) pendencias.push('Cor');
  if (!/\d+\s?(peças|pçs|unidades?)/i.test(texto)) pendencias.push('Quantidade');
  if (!/127|220/i.test(texto)) pendencias.push('Tensão');
  if (!/cm|medida|altura|largura/i.test(texto)) pendencias.push('Medidas');
  if (!/prazo|dias|úteis|entrega/i.test(texto)) pendencias.push('Prazo');
  if (!/pode gerar|pode fazer|pode mandar|pode fechar/i.test(texto)) pendencias.push('Confirmação final');
  return pendencias;
}

function montarMensagemAlerta(nomeCliente, vendedor, pendencias) {
  return `⚠️ *Alerta de Checklist Incompleto*
Cliente: ${nomeCliente}
Vendedor: ${vendedor}

Itens pendentes:
` +
         pendencias.map(p => `- ${p}`).join('\n') +
         `

Por favor, confirme com o cliente antes de prosseguir.`;
}

async function enviarWhatsApp(numero, mensagem) {
  if (!global.client) return;
  await global.client.sendText(numero + '@c.us', mensagem);
}

app.post('/conversa', async (req, res) => {
  try {
    const { user, message, attendant } = req.body.payload || req.body;
    const nomeCliente = user?.Name || 'Cliente';
    const vendedor = attendant?.Name || 'Vendedor';
    const texto = message?.text || '';

    console.log('📨 Mensagem recebida:', texto);
    const pendencias = analisarConteudoTexto(texto);

    if (pendencias.length > 0) {
      const alerta = montarMensagemAlerta(nomeCliente, vendedor, pendencias);
      console.log('➡️ Enviando alerta para GESTOR:', GESTOR_PHONE);
      await enviarWhatsApp(GESTOR_PHONE, alerta);
    }

    res.json({ status: 'ok', pendencias });
  } catch (err) {
    console.error('❌ Erro geral:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

create({
  session: 'lumieregyn',
  headless: true,
  browserArgs: ['--no-sandbox'],
  waitForLogin: true,
  autoClose: 0,
}).then(client => {
  global.client = client;
  console.log('✅ WhatsApp conectado e pronto para envio.');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
