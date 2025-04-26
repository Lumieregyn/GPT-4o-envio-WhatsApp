const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

let clientGlobal = null;
let atendimentos = {}; // Mapeamento de atendimentos ativos

const horarioInicio = 8; // 8h
const horarioFim = 19; // 19h

function horarioUtilAgora() {
  const agora = new Date();
  const hora = agora.getHours();
  const dia = agora.getDay(); // 0 = domingo, 6 = sábado
  return hora >= horarioInicio && hora < horarioFim && dia >= 1 && dia <= 5;
}

function analisarMensagem(mensagem) {
  const texto = mensagem.toLowerCase();
  if (texto.includes('preço') || texto.includes('valor')) {
    return 'consulta_preco';
  }
  if (texto.includes('pode gerar') || texto.includes('fechar pedido') || texto.includes('pode fazer')) {
    return 'intencao_fechar';
  }
  if (texto.includes('orçamento') || texto.includes('orcamento')) {
    return 'pedido_orcamento';
  }
  return 'conversa';
}

function agendarMonitoramento(clienteId, vendedor, horarioPedido) {
  atendimentos[clienteId] = { vendedor, horarioPedido, alertasEnviados: 0 };
  console.log(`⏳ Monitorando ${clienteId} atendido por ${vendedor}`);
}

// Simula checklist
function checklistFaltando() {
  return ['Produto', 'Medidas', 'Tensão']; // Exemplo
}

setInterval(() => {
  const agora = new Date();
  Object.keys(atendimentos).forEach(clienteId => {
    const atendimento = atendimentos[clienteId];
    if (!horarioUtilAgora()) return;

    const horasDecorridas = (agora - atendimento.horarioPedido) / 1000 / 60 / 60;

    if (atendimento.alertasEnviados === 0 && horasDecorridas >= 6) {
      console.log(`⚠️ Primeiro alerta para ${atendimento.vendedor}`);
      atendimento.alertasEnviados++;
    } else if (atendimento.alertasEnviados === 1 && horasDecorridas >= 12) {
      console.log(`⚠️ Segundo alerta para ${atendimento.vendedor}`);
      atendimento.alertasEnviados++;
    } else if (atendimento.alertasEnviados === 2 && horasDecorridas >= 18) {
      console.log(`🚨 Último alerta para Grupo Gerente Comercial IA`);
      atendimento.alertasEnviados++;
    }
  });
}, 60000);

create({
  session: 'lumieregyn',
  browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  catchQR: (base64Qr) => {
    const html = '<html><body style="display:flex;justify-content:center;align-items:center;height:100vh">' +
                 '<img src="' + base64Qr + '" />' +
                 '</body></html>';
    fs.writeFileSync(path.join(__dirname, 'public', 'qr.html'), html);
  },
  headless: true,
  logQR: false,
}).then((client) => {
  console.log('✅ WhatsApp conectado e pronto para uso.');
  clientGlobal = client;

  client.onMessage(message => {
    if (message.isGroupMsg) return;
    const clienteId = message.from;
    const texto = message.body || '';

    const analise = analisarMensagem(texto);

    if (analise === 'pedido_orcamento' || analise === 'consulta_preco' || analise === 'intencao_fechar') {
      if (!atendimentos[clienteId]) {
        agendarMonitoramento(clienteId, message.sender?.pushname || 'Vendedor Desconhecido', new Date());
      }
      if (analise === 'intencao_fechar') {
        const pendencias = checklistFaltando();
        if (pendencias.length > 0) {
          console.log(`⚠️ Pendências no pedido detectadas:`);
          pendencias.forEach(item => console.log(`- ${item} não confirmado`));
        }
      }
    }
  });

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

app.get('/listar-grupos', async (_req, res) => {
  if (!clientGlobal) {
    return res.status(400).json({ error: 'Cliente não conectado ainda' });
  }
  const chats = await clientGlobal.listChats();
  const grupos = chats.filter(chat => chat.isGroup).map(g => ({
    name: g.name,
    id: g.id._serialized
  }));
  res.json(grupos);
});

app.listen(port, () => {
  console.log('🚀 Servidor Express rodando na porta ' + port);
});
