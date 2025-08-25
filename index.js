const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3000;

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state
  });

  sock.ev.on('connection.update', (update) => {
    const { qr } = update;
    if (qr) {
      console.log('Scan this QR:', qr);
    }
  });

  sock.ev.on('creds.update', saveCreds);
})();

app.get('/', (req, res) => {
  res.send('WhatsApp Connector is running!');
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
