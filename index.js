const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('✅ Aplicação está no ar (rota /)');
});

app.get('/health', (req, res) => {
  res.status(200).send('✅ Healthcheck OK');
});

app.listen(PORT, () => {
  console.log('🚀 Servidor rodando na porta ' + PORT);
});