import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log('\n🚀 Backend ialorichat iniciado!');
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}\n`);
});
