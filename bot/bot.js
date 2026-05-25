// ================================
// BOT WHATSAPP - IALORICHAT
// Node.js + whatsapp-web.js + Firebase
// ================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const firebase = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ================================
// CONFIGURAÇÃO FIREBASE
// ================================

const serviceAccount = require('./serviceAccountKey.json'); // Arquivo que você vai criar

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    projectId: 'ialorichat'
});

const db = firebase.firestore();

// ================================
// CLIENTE WHATSAPP
// ================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ================================
// EVENTOS
// ================================

client.on('qr', (qr) => {
    console.log('\n📱 ESCANEIE O QR CODE COM WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n✅ QR Code gerado! Escaneie com seu WhatsApp\n');
});

client.on('ready', async () => {
    console.log('✅ BOT CONECTADO E PRONTO!');
    console.log('🤖 Aguardando mensagens...\n');
    
    // Atualiza status no Firebase
    await db.collection('config').doc('whatsapp').set({
        status: 'conectado',
        ultimaConexao: new Date(),
        bot: 'ativo'
    }, { merge: true });
});

client.on('message', async (message) => {
    try {
        // Ignora mensagens do bot e grupos
        if (message.from === client.info.wid.user || message.isGroupMsg) {
            return;
        }

        console.log(`\n📨 Nova mensagem de: ${message.from}`);
        console.log(`📝 Conteúdo: ${message.body}`);

        // Registra atendimento
        const contactName = (await message.getContact()).pushname || 'Desconhecido';
        
        await registrarAtendimento({
            whatsapp: message.from,
            nome: contactName,
            mensagem: message.body,
            data: new Date()
        });

        // Busca resposta no Firestore
        const resposta = await buscarResposta(message.body);

        if (resposta) {
            console.log(`✅ Resposta encontrada: ${resposta.substring(0, 50)}...`);
            
            // Aguarda 1 segundo antes de responder (mais natural)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Responde
            await message.reply(resposta);
            console.log('✉️ Resposta enviada!\n');
        } else {
            console.log('❌ Nenhuma resposta encontrada');
            console.log('📤 Enviando mensagem padrão...\n');
            
            // Resposta padrão
            const respostaPadrao = `Oi ${contactName}! 👋\n\nDesculpe, não encontrei uma resposta exata para sua pergunta.\n\nTem algo mais específico que posso ajudar?`;
            await message.reply(respostaPadrao);
        }

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
    }
});

client.on('disconnected', async (reason) => {
    console.log('⚠️ BOT DESCONECTADO:', reason);
    
    await db.collection('config').doc('whatsapp').set({
        status: 'desconectado',
        ultimaDesconexao: new Date(),
        motivo: reason
    }, { merge: true });
});

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
            const palavrasUsuario = perguntaLower.split(' ');
            const palavrasBD = perguntaBD.split(' ');
            
            let matches = 0;
            for (const palavra of palavrasUsuario) {
                if (palavra.length > 2 && palavrasBD.some(p => p.includes(palavra))) {
                    matches++;
                }
            }
            
            // Se 60% das palavras correspondem
            if (matches / palavrasUsuario.length >= 0.6) {
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
            nome: dados.nome,
            ultimaMensagem: dados.mensagem,
            data: dados.data,
            resolvido: false
        });
        
        console.log('✅ Atendimento registrado no Firebase');
    } catch (error) {
        console.error('Erro ao registrar atendimento:', error);
    }
}

// ================================
// INICIALIZAR BOT
// ================================

console.log('🚀 Iniciando BOT WhatsApp...');
console.log('⏳ Aguarde o QR Code aparecer...\n');

client.initialize().catch((error) => {
    console.error('❌ Erro ao inicializar:', error);
    process.exit(1);
});

// ================================
// GRACEFUL SHUTDOWN
// ================================

process.on('SIGINT', async () => {
    console.log('\n\n🛑 Desconectando BOT...');
    await client.destroy();
    console.log('✅ BOT desconectado');
    process.exit(0);
});

// ================================
// EXPORT (para Railway)
// ================================

module.exports = { client };

