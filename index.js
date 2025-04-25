import express from "express";
import { create } from "@wppconnect-team/wppconnect";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

let clientInstance;
let lastQrBase64 = "";

create({
  session: "lumieregyn",
  catchQR: (base64Qrimg) => {
    lastQrBase64 = base64Qrimg;
  },
  headless: true,
  browserArgs: ["--no-sandbox"],
}).then((client) => {
  clientInstance = client;
  console.log("✅ WhatsApp conectado e pronto para envio.");
});

app.get("/qr", (_, res) => {
  if (!lastQrBase64) {
    return res.send("QR Code ainda não gerado. Aguarde...");
  }
  const html = \`
    <html><body>
    <h2>Escaneie o QR Code:</h2>
    <img src="\${lastQrBase64}" style="width:300px;" />
    </body></html>
  \`;
  res.send(html);
});

app.post("/conversa", async (req, res) => {
  try {
    const { user, attendant, message } = req.body.payload;
    const nomeCliente = user?.Name || "cliente";
    const telefone = user?.Phone;
    const texto = message?.text || "";

    if (!telefone || !texto) return res.status(400).send("Faltam dados.");

    const prompt = fs.readFileSync("prompt_checklist_gpt4o.txt", "utf-8");
    const openaiResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: texto },
        ],
      },
      {
        headers: {
          Authorization: \`Bearer \${process.env.OPENAI_API_KEY}\`,
          "Content-Type": "application/json",
        },
      }
    );

    const resposta = openaiResp.data.choices[0].message.content;

    const alerta = \`📌 Alerta de Checklist
👤 Cliente: \${nomeCliente}
👩‍💼 Vendedor: \${attendant?.Name || "N/A"}

📨 Última mensagem:
"\${texto}"

🧠 Análise GPT-4o:
\${resposta}
\`;

    await clientInstance.sendText("55" + process.env.GESTOR_PHONE, alerta);
    await clientInstance.sendText(telefone, "✅ Análise concluída. O vendedor foi alertado.");

    res.send({ status: "ok", analise: resposta });
  } catch (e) {
    console.error("❌ Erro:", e.message);
    res.status(500).send({ status: "erro", erro: e.message });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});