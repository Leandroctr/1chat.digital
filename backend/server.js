// ========================================
// 🚀 BACKEND COMPLETO - PRONTO RAILWAY
// ========================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// 🔧 MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: false
}));

// ========================================
// 🔐 FIREBASE CONFIG
// ========================================

let db = null;

try {
  // Parsear SERVICE_ACCOUNT_KEY se for string JSON
  const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    console.warn('⚠️ SERVICE_ACCOUNT_KEY não encontrada. Firebase desabilitado.');
  } else {
    let parsedKey;
    
    // Se for string, faz parse
    if (typeof serviceAccountKey === 'string') {
      parsedKey = JSON.parse(serviceAccountKey);
    } else {
      parsedKey = serviceAccountKey;
    }

    // Inicializar Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(parsedKey),
      projectId: parsedKey.project_id
    });

    db = admin.firestore();
    console.log('✅ Firebase Firestore conectado');
  }
} catch (error) {
  console.error('❌ Erro ao conectar Firebase:', error.message);
  db = null;
}

// ========================================
// 📋 VARIÁVEIS DE AMBIENTE
// ========================================

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://seu-domain.up.railway.app/webhook/messages';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seu-api-key';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'ialorichat';

console.log(`
📊 ===== CONFIGURAÇÃO =====
🔌 PORT: ${PORT}
🌐 WEBHOOK_URL: ${WEBHOOK_URL}
🔗 EVOLUTION_API: ${EVOLUTION_API_URL}
📱 INSTANCE: ${EVOLUTION_INSTANCE}
✅ Firebase: ${db ? 'Conectado' : 'Desabilitado'}
========================
`);

// ========================================
// 🏥 HEALTH CHECK
// ========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is running',
    timestamp: new Date(),
    webhook_url: WEBHOOK_URL,
    evolution_instance: EVOLUTION_INSTANCE,
    firebase: db ? 'connected' : 'disabled'
  });
});

// ========================================
// 📨 WEBHOOK - RECEBER MENSAGENS
// ========================================

app.post('/webhook/messages', async (req, res) => {
  try {
    console.log('\n📨 ========== WEBHOOK RECEBIDO ==========');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Extrai dados da mensagem
    const { data } = req.body;

    if (!data) {
      console.warn('⚠️ Dados incompletos no webhook');
      return res.status(400).json({ error: 'Dados inválidos - faltam campos obrigatórios' });
    }

    const {
      key,
      pushName,
      message,
      messageTimestamp,
      sender,
      remoteJid
    } = data;

    // Validar dados
    if (!message || !sender) {
      console.warn('⚠️ Mensagem ou sender não encontrados');
      return res.status(400).json({ error: 'Mensagem e sender são obrigatórios' });
    }

    // Extrair número (remover @s.whatsapp.com ou @g.us)
    const numero = sender.replace(/@s\.whatsapp\.com|@g\.us/g, '');
    
    // Extrair texto da mensagem (pode estar em diferentes formatos)
    let texto = '';
    if (message.conversation) {
      texto = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      texto = message.extendedTextMessage.text;
    } else if (message.imageMessage?.caption) {
      texto = message.imageMessage.caption;
    } else {
      texto = '[Mensagem de tipo não suportado]';
    }

    console.log(`\n✅ Mensagem processada:`);
    console.log(`   De: ${numero} (${pushName || 'Desconhecido'})`);
    console.log(`   Texto: "${texto}"`);

    // ========================================
    // 💾 REGISTRAR NO FIREBASE (ENTRADA)
    // ========================================

    if (db) {
      try {
        await db.collection('whatsappMessages').add({
          numero,
          nome: pushName || 'Desconhecido',
          mensagem: texto,
          timestamp: new Date(messageTimestamp * 1000),
          tipo: 'entrada',
          status: 'recebida',
          chaveOriginal: key,
          remoteJid
        });
        console.log('💾 Mensagem salva em Firebase');
      } catch (firebaseError) {
        console.error('❌ Erro ao salvar em Firebase:', firebaseError.message);
      }
    }

    // ========================================
    // 🔍 BUSCAR RESPOSTA
    // ========================================

    let resposta = await buscarResposta(texto);

    if (!resposta) {
      resposta = '👋 Olá! Recebi sua mensagem. Verificando as opções disponíveis...';
    }

    console.log(`💬 Resposta: "${resposta}"`);

    // ========================================
    // 📤 ENVIAR RESPOSTA VIA EVOLUTION
    // ========================================

    try {
      await enviarMensagemWhatsApp(numero, resposta);
      console.log('✅ Resposta enviada com sucesso');
    } catch (sendError) {
      console.error('❌ Erro ao enviar resposta:', sendError.message);
      // Não falha o webhook se enviar falhar, apenas loga
    }

    // ========================================
    // 💾 REGISTRAR RESPOSTA NO FIREBASE
    // ========================================

    if (db) {
      try {
        await db.collection('whatsappMessages').add({
          numero,
          nome: pushName || 'Desconhecido',
          mensagem: resposta,
          timestamp: new Date(),
          tipo: 'saida',
          status: 'enviada'
        });
        console.log('💾 Resposta salva em Firebase');
      } catch (firebaseError) {
        console.error('❌ Erro ao salvar resposta:', firebaseError.message);
      }
    }

    console.log('✅ ===== WEBHOOK PROCESSADO =====\n');

    // Responder ao webhook imediatamente
    res.json({
      success: true,
      message: 'Webhook processado com sucesso',
      numero,
      respostaEnviada: true
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NO WEBHOOK:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name
    });
  }
});

// ========================================
// 🔍 FUNÇÃO: Buscar Resposta no Firebase
// ========================================

async function buscarResposta(textoMensagem) {
  if (!db) {
    console.log('⚠️ Firebase não está conectado, retornando resposta padrão');
    return null;
  }

  try {
    const snapshot = await db
      .collection('respostas')
      .where('ativa', '==', true)
      .get();

    console.log(`🔍 Buscando resposta em ${snapshot.size} registros`);

    for (const doc of snapshot.docs) {
      const { palavrasChave, resposta } = doc.data();

      if (!palavrasChave || !Array.isArray(palavrasChave)) continue;

      // Verificar se alguma palavra-chave está na mensagem
      const match = palavrasChave.some(palavra =>
        textoMensagem.toLowerCase().includes(palavra.toLowerCase())
      );

      if (match) {
        console.log(`✅ Resposta encontrada para: ${textoMensagem}`);
        return resposta;
      }
    }

    console.log('ℹ️ Nenhuma resposta encontrada na base');
    return null;

  } catch (error) {
    console.error('❌ Erro ao buscar resposta:', error.message);
    return null;
  }
}

// ========================================
// 📤 FUNÇÃO: Enviar Mensagem WhatsApp
// ========================================

async function enviarMensagemWhatsApp(numero, mensagem) {
  try {
    console.log(`📤 Enviando para ${numero}...`);

    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        number: numero,
        text: mensagem,
        delay: 1000 // 1 segundo de delay para parecer natural
      },
      {
        headers: {
          'Authorization': `Bearer ${EVOLUTION_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    console.log(`✅ Mensagem enviada: ${response.data.key || response.status}`);
    return response.data;

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via Evolution:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    throw error;
  }
}

// ========================================
// 📝 ENDPOINT: Enviar Mensagem Manual
// ========================================

app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
    }

    await enviarMensagemWhatsApp(numero, mensagem);

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// 📋 ENDPOINT: Listar Mensagens Recebidas
// ========================================

app.get('/api/whatsapp/messages', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Firebase não está conectado' });
    }

    const snapshot = await db
      .collection('whatsappMessages')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const mensagens = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      mensagens.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate() : null
      });
    });

    res.json({ mensagens });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// 📊 ENDPOINT: Status do Sistema
// ========================================

app.get('/api/status', (req, res) => {
  res.json({
    server: 'OK',
    firebase: db ? 'connected' : 'disabled',
    evolution: {
      url: EVOLUTION_API_URL,
      instance: EVOLUTION_INSTANCE
    },
    webhook_url: WEBHOOK_URL,
    timestamp: new Date()
  });
});

// ========================================
// 404 - Rota não encontrada
// ========================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    method: req.method,
    path: req.path,
    disponivel: [
      'GET /health',
      'GET /api/status',
      'POST /webhook/messages',
      'POST /api/whatsapp/send',
      'GET /api/whatsapp/messages'
    ]
  });
});

// ========================================
// ⚠️ ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message
  });
});

// ========================================
// 🚀 INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 SERVIDOR INICIADO COM SUCESSO    ║
╚════════════════════════════════════════╝

   🔌 Porta: ${PORT}
   🌍 URL: http://localhost:${PORT}
   📋 Health: GET /health
   💬 Webhook: POST /webhook/messages
   
Aguardando mensagens do WhatsApp...
  `);
});

// ========================================
// Exportar para testes
// ========================================

module.exports = { app, enviarMensagemWhatsApp, buscarResposta };
