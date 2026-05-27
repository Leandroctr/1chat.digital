const express = require('express');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const P = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeBase64 = null;
let connectionStatus = 'connecting';

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions');

const sock = makeWASocket({
  auth: state,
  logger: P({ level: 'debug' }),
  browser: ['Mac OS', 'Chrome', '122.0.0.0'],
  printQRInTerminal: false
});

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeBase64 = await QRCode.toDataURL(qr);
      connectionStatus = 'qr';
      console.log('QR Code gerado');
    }

    if (connection === 'open') {
      connectionStatus = 'connected';
      qrCodeBase64 = null;
      console.log('WhatsApp conectado');
    }

    if (connection === 'close') {
      connectionStatus = 'disconnected';

      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

     console.log(
  'Conexão fechada:',
  lastDisconnect?.error,
  'Reconectar:',
  shouldReconnect
);

      if (shouldReconnect) {
        startWhatsApp();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    console.log('Mensagem recebida:', from);

    await sock.sendMessage(from, {
      text: 'Recebi sua mensagem 🚀'
    });
  });
}

app.get('/health', (req, res) => {
  res.json({
    status: 'online'
  });
});

app.get('/status', (req, res) => {
  res.json({
    whatsapp: connectionStatus
  });
});

app.get('/qr', (req, res) => {
  if (!qrCodeBase64) {
    return res.send('QR Code ainda não disponível ou WhatsApp já conectado.');
  }

  res.send(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:#fff;font-family:Arial;flex-direction:column;">
        <h1>Escaneie o QR Code</h1>
        <img src="${qrCodeBase64}" width="300" />
      </body>
    </html>
  `);
});

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await startWhatsApp();
});
