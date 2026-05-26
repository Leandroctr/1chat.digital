import express from 'express';
import axios from 'axios';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

// ================================
// CONFIGURAÇÃO EXPRESS
// ================================

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// ================================
// CONFIGURAÇÃO FIREBASE
// ================================

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY || '{}');

if (!serviceAccount.project_id) {
    console.error('❌ ERRO: SERVICE_ACCOUNT_KEY não configurada!');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
});

const db = admin.firestore();

// ================================
// CONFIGURAÇÃO EVOLUTION API
// ================================

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'ialorichat';

if (!EVOLUTION_API_KEY) {
    console.error('❌ ERRO: EVOLUTION_API_KEY não configurada!');
    process.exit(1);
}

// ================================
// CLIENTE EVOLUTION API
// ================================

const evolutionClient = axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EVOLUTION_API_KEY}`
    }
});

// ================================
// HEALTH CHECK
// ================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ================================
// WEBHOOK: Receber mensagens
// ================================

app.post('/webhook/messages', async (req, res) => {
    try {
        const { data } = req.body;

        if (!data || !data.message) {
            return res.status(200).json({ received: true });
        }

        const mensagem = data.message;
        const remetente = data.sender;
        const textoMensagem = mensagem.text || mensagem.body || '';

        if (!textoMensagem.trim()) {
            return res.status(200).json({ received: true });
        }

        console.log(`\n📨 Mensagem recebida de: ${remetente}`);
        console.log(`📝 Conteúdo: ${textoMensagem}`);

        // Registra atendimento
        await registrarAtendimento({
            whatsapp: remetente,
            mensagem: textoMensagem,
            data: new Date()
        });

        // Busca resposta
        const resposta = await buscarResposta(textoMensagem);

        if (resposta) {
            console.log(`✅ Resposta encontrada`);
            
            // Aguarda 1 segundo (mais natural)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Envia resposta
            await enviarMensagemWhatsApp(remetente, resposta);
            console.log('✉️ Resposta enviada!\n');
        } else {
            console.log('❌ Nenhuma resposta encontrada');
            
            // Resposta padrão
            const respostaPadrao = `Olá! 👋\n\nDesculpe, não encontrei uma resposta exata para sua pergunta.\n\nTem algo mais específico que posso ajudar?`;
            await enviarMensagemWhatsApp(remetente, respostaPadrao);
            console.log('📤 Resposta padrão enviada!\n');
        }

        res.json({ received: true, processed: true });

    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.status(200).json({ received: true, error: error.message });
    }
});

// ================================
// ENDPOINT: Conectar WhatsApp
// ================================

app.post('/api/whatsapp/connect', async (req, res) => {
    try {
        console.log('🔄 Iniciando conexão WhatsApp...');

        const response = await evolutionClient.post(`/instance/create`, {
            instanceName: EVOLUTION_INSTANCE,
            token: EVOLUTION_API_KEY,
            webhook_url: `${process.env.WEBHOOK_URL || 'http://localhost:3000'}/webhook/messages`,
            webhook_by_events: true
        });

        console.log('✅ Instância criada/conectada');

        await db.collection('config').doc('whatsapp').set({
            status: 'conectando',
            ultimaAtualizacao: new Date(),
            bot: 'ativo'
        }, { merge: true });

        res.json({ success: true, instance: EVOLUTION_INSTANCE });

    } catch (error) {
        console.error('❌ Erro ao conectar:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// ENDPOINT: Obter QR Code
// ================================

app.get('/api/whatsapp/qr', async (req, res) => {
    try {
        const response = await evolutionClient.get(`/instance/fetchInstances/${EVOLUTION_INSTANCE}`);

        const instance = response.data;
        const qrCode = instance?.qrCode?.base64;

        if (qrCode) {
            res.json({ 
                hasQR: true, 
                qrCode: qrCode,
                status: 'scanning'
            });
        } else {
            res.json({ 
                hasQR: false, 
                status: 'connected',
                message: 'WhatsApp já está conectado'
            });
        }

    } catch (error) {
        console.error('❌ Erro ao obter QR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// ENDPOINT: Status da conexão
// ================================

app.get('/api/whatsapp/status', async (req, res) => {
    try {
        const response = await evolutionClient.get(`/instance/fetchInstances/${EVOLUTION_INSTANCE}`);
        
        const instance = response.data;
        const status = instance?.instanceStatus || 'unknown';
        const conectado = status === 'open' || status === 'connected';

        await db.collection('config').doc('whatsapp').set({
            status: conectado ? 'conectado' : 'desconectado',
            ultimaAtualizacao: new Date(),
            bot: conectado ? 'ativo' : 'inativo'
        }, { merge: true });

        res.json({ 
            connected: conectado,
            status: status,
            instance: EVOLUTION_INSTANCE
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// ENDPOINT: Desconectar
// ================================

app.post('/api/whatsapp/disconnect', async (req, res) => {
    try {
        console.log('🛑 Desconectando WhatsApp...');

        await evolutionClient.delete(`/instance/delete/${EVOLUTION_INSTANCE}`);

        await db.collection('config').doc('whatsapp').set({
            status: 'desconectado',
            ultimaAtualizacao: new Date(),
            bot: 'inativo'
        }, { merge: true });

        res.json({ success: true, message: 'Desconectado' });

    } catch (error) {
        console.error('❌ Erro ao desconectar:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// ENDPOINT: Enviar mensagem (teste)
// ================================

app.post('/api/whatsapp/send', async (req, res) => {
    try {
        const { numero, mensagem } = req.body;

        if (!numero || !mensagem) {
            return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
        }

        await enviarMensagemWhatsApp(numero, mensagem);

        res.json({ success: true, message: 'Mensagem enviada' });

    } catch (error) {
        console.error('❌ Erro ao enviar:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// FUNÇÕES AUXILIARES
// ================================

async function enviarMensagemWhatsApp(numero, texto) {
    try {
        const response = await evolutionClient.post(`/message/sendText/${EVOLUTION_INSTANCE}`, {
            number: numero,
            text: texto
        });

        console.log('📤 Mensagem enviada para WhatsApp');
        return response.data;

    } catch (error) {
        console.error('❌ Erro ao enviar para WhatsApp:', error.message);
        throw error;
    }
}

async function buscarResposta(perguntaUsuario) {
    try {
        const snapshot = await db.collection('perguntas-respostas').get();
        
        if (snapshot.empty) {
            console.log('⚠️ Nenhuma pergunta cadastrada');
            return null;
        }

        const perguntaLower = perguntaUsuario.toLowerCase().trim();
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const perguntaBD = data.pergunta.toLowerCase();
            
            // Correspondência exata
            if (perguntaBD === perguntaLower) {
                return data.resposta;
            }
            
            // Correspondência parcial
            const palavrasUsuario = perguntaLower.split(' ').filter(p => p.length > 2);
            const palavrasBD = perguntaBD.split(' ');
            
            let matches = 0;
            for (const palavra of palavrasUsuario) {
                if (palavrasBD.some(p => p.includes(palavra))) {
                    matches++;
                }
            }
            
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
// INICIAR SERVIDOR
// ================================

app.listen(PORT, () => {
    console.log('\n🚀 Backend ialorichat iniciado!');
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📍 Webhook em: /webhook/messages`);
    console.log(`⚙️ Evolution API: ${EVOLUTION_API_URL}`);
    console.log(`🔑 Instância: ${EVOLUTION_INSTANCE}\n`);
});

export default app;
