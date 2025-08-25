import express from "express";
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import axios from "axios";

const app = express();
app.use(express.json());

const WEBHOOK_URL = "https://YOUR-N8N-INSTANCE-WEBHOOK"; // Replace with your n8n webhook URL

let sock;
let qrCodeData = ""; // Store latest QR for display

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Debug
  });

  // Generate QR code
  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrCodeData = qr;
      console.log("Scan this QR to connect WhatsApp");
    }
    if (connection === "open") {
      console.log("✅ WhatsApp Connected!");
      qrCodeData = ""; // Clear QR after successful login
    }
    if (connection === "close") {
      console.log("❌ Connection closed. Reconnecting...");
      startWhatsApp();
    }
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async (msgUpdate) => {
    const msg = msgUpdate.messages[0];
    if (!msg.message || msg.key.fromMe) return; // Ignore system/fromMe messages

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    console.log(`📩 Message from ${from}: ${text}`);

    // Send to n8n webhook
    try {
      await axios.post(WEBHOOK_URL, {
        from,
        text,
      });
      console.log("✅ Sent to n8n workflow");
    } catch (err) {
      console.error("Error sending to n8n:", err.message);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Start WhatsApp bot
startWhatsApp();

// ✅ Route to check app status
app.get("/", (req, res) => {
  res.send("<h1>WhatsApp Connector is Running ✅</h1>");
});

// ✅ Route to get QR as image
app.get("/qr", async (req, res) => {
  if (!qrCodeData) {
    return res.send("<h3>WhatsApp is connected ✅</h3>");
  }
  try {
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.send(`<img src="${qrImage}" />`);
  } catch (err) {
    res.status(500).send("Error generating QR");
  }
});

// ✅ Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
