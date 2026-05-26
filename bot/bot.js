// ================================
// BOT WHATSAPP - IALORICHAT (BAILEYS)
// Node.js + Baileys + Firebase
// Funciona perfeitamente no Railway!
// ================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const firebase = require('firebase-admin');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ================================
// CONFIGURAÇÃO FIREBASE
// ================================

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY || '{}');

if (!serviceAccount.project_id) {
    console.error('❌ ERRO: SERVICE_ACCOUNT_KEY não configurada!');
    process.exit(1);
}

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
});

const db = firebase.firestore();

// ================================
// DIRETÓRIO DE SESSÃO
// ================================

const sessionsDir = './sessions';
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

// ================================
// INICIALIZAR BOT
// ================================

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    // ================================
    // QR CODE
    // ================================

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 GERANDO QR CODE...\n');
            
            // Exibir QR Code no terminal
            QRCode.toString(qr, { type: 'terminal' }, (err, string) => {
                if (!err) {
                    console.log(string);
                }
            });

            console.log('\n✅ Escaneie o código acima com WhatsApp');
            console.log('🔗 Menu → Aparelhos Conectados → Conectar Aparelho\n');
        }

        if (connection === 'open') {
            console.log('✅ BOT CONECTADO E PRONTO!');
            console.log('🤖 Aguardando mensagens...\n');

            // Atualiza status no Firebase
            await db.collection('config').doc('whatsapp').set({
                status: 'conectado',
                ultimaConexao: new Date(),
                bot: 'ativo'
            }, { merge: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log('⚠️ Conexão fechada:', lastDisconnect?.error);
            
            if (shouldReconnect) {
                console.log('🔄 Tentando reconectar...\n');
                setTimeout(() => conectarWhatsApp(), 3000);
            } else {
                console.log('❌ Login expirado. Escaneie QR Code novamente.\n');
                
                // Limpa sessão
                if (fs.existsSync(sessionsDir)) {
                    fs.rmSync(sessionsDir, { recursive: true });
                }
                
                setTimeout(() => conectarWhatsApp(), 3000);
            }
        }
    });

    // ================================
    // MENSAGENS
    // ================================

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];

        if (!message.message) return;
        if (message.key.fromMe) return;
        if (message.key.remoteJid.includes('g.us')) return; // Ignora grupos

        try {
            const conversaId = message.key.remoteJid;
            const textoMensagem = message.message.conversation || 
                                 message.message.extendedTextMessage?.text || '';

            console.log(`\n📨 Nova mensagem de: ${conversaId}`);
            console.log(`📝 Conteúdo: ${textoMensagem}`);

            // Registra atendimento
            await registrarAtendimento({
                whatsapp: conversaId,
                mensagem: textoMensagem,
                data: new Date()
            });

            // Busca resposta
            const resposta = await buscarResposta(textoMensagem);

            if (resposta) {
                console.log(`✅ Resposta encontrada`);
                
                // Aguarda 1 segundo (mais natural)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Responde
                await sock.sendMessage(conversaId, { text: resposta });
                console.log('✉️ Resposta enviada!\n');
            } else {
                console.log('❌ Nenhuma resposta encontrada');
                
                // Resposta padrão
                const respostaPadrao = `Olá! 👋\n\nDesculpe, não encontrei uma resposta exata para sua pergunta.\n\nTem algo mais específico que posso ajudar?`;
                await sock.sendMessage(conversaId, { text: respostaPadrao });
                console.log('📤 Resposta padrão enviada!\n');
            }

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    });

    // Salva credenciais
    sock.ev.on('creds.update', saveCreds);

    return sock;
}

// ================================
// FUNÇÕES
// ================================

async function buscarResposta(perguntaUsuario) {
    try {
        const snapshot = await db.collection('perguntas-respostas').get();
        
        if (snapshot.empty) {
            console.log('⚠️ Nenhuma pergunta cadastrada');
            return null;
        }

        const perguntaLower = perguntaUsuario.toLowerCase().trim();
        
        // Procura por correspondência exata ou parcial
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const perguntaBD = data.pergunta.toLowerCase();
            
            // Correspondência exata
            if (perguntaBD === perguntaLower) {
                return data.resposta;
            }
            
            // Correspondência parcial (palavras-chave)
            const palavrasUsuario = perguntaLower.split(' ').filter(p => p.length > 2);
            const palavrasBD = perguntaBD.split(' ');
            
            let matches = 0;
            for (const palavra of palavrasUsuario) {
                if (palavrasBD.some(p => p.includes(palavra))) {
                    matches++;
                }
            }
            
            // Se 60% das palavras correspondem
            if (palavrasUsuario.length > 0 && matches / palavrasUsuario.length >= 0.6) {
                return data.resposta;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar resposta:', error);
        return null;
    }
}

async function registrarAtendimento(dados) {
    try {
        await db.collection('atendimentos').add({
            whatsapp: dados.whatsapp,
            ultimaMensagem: dados.mensagem,
            data: dados.data,
            resolvido: false
        });
        
        console.log('✅ Atendimento registrado');
    } catch (error) {
        console.error('Erro ao registrar atendimento:', error);
    }
}

// ================================
// INICIAR
// ================================

console.log('🚀 Iniciando BOT WhatsApp...');
console.log('⏳ Aguarde o QR Code...\n');

conectarWhatsApp().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});

// ================================
// GRACEFUL SHUTDOWN
// ================================

process.on('SIGINT', async () => {
    console.log('\n\n🛑 Desconectando BOT...');
    process.exit(0);
});
