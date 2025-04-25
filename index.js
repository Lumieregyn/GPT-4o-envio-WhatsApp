const express = require("express");
const fs = require("fs");
const path = require("path");
const { create } = require("@wppconnect-team/wppconnect");

const app = express();
const port = process.env.PORT || 8080;

let qrCodeBase64 = "";

create({
  session: "lumieregyn",
  catchQR: (base64Qr, asciiQR) => {
    qrCodeBase64 = base64Qr;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>QR Code</title>
      </head>
      <body>
        <h2>Escaneie o QR Code:</h2>
        <img src="${base64Qr}" width="300" />
      </body>
      </html>
    `;
    fs.writeFileSync(path.join(__dirname, "public", "qr.html"), html);
  },
  headless: true,
  devtools: false,
  logQR: true,
}).then((client) => {
  console.log("✅ WhatsApp conectado e pronto para envio.");
});

app.use(express.static("public"));

app.get("/qr", (req, res) => {
  if (fs.existsSync(path.join(__dirname, "public", "qr.html"))) {
    res.sendFile(path.join(__dirname, "public", "qr.html"));
  } else {
    res.send("QR Code ainda não gerado.");
  }
});

app.get("/health", (req, res) => {
  res.send("✅ Server online");
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
