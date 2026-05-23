# 🤖 ChatBot Admin - Painel de Controle

Sistema completo de administração para chatbot de WhatsApp com suporte técnico.

## 📋 O que Funciona

✅ **Login com Email/Senha**  
✅ **CRUD Completo** - Adicionar, editar, deletar perguntas/respostas  
✅ **Perguntas Obrigatórias** - Configure quais dados coletar antes de responder  
✅ **Histórico de Atendimentos** - Acompanhe todas as conversas  
✅ **Gerenciamento de Usuários** - 1 Admin + 3 Operadores  
✅ **Estatísticas** - Dashboard com métricas  
✅ **Firestore** - Banco de dados gratuito  

---

## 🚀 Como Fazer Deploy

### **Passo 1: Preparar Arquivo**

O arquivo `chatbot-admin.html` é **totalmente autossuficiente**.

- Renomeia pra `index.html`
- Ele já contém: HTML + CSS + JavaScript + Credenciais Firebase

### **Passo 2: Clonar ou Criar Repositório no GitHub**

```bash
# Cria uma pasta local
mkdir chatbot-admin
cd chatbot-admin

# Inicializa Git
git init

# Cria o arquivo
# (copia o chatbot-admin.html e renomeia pra index.html)

# Adiciona ao Git
git add .
git commit -m "Initial commit - ChatBot Admin Panel"

# Push para GitHub
git remote add origin https://github.com/SEU_USER/chatbot-admin.git
git branch -M main
git push -u origin main
```

### **Passo 3: Deploy no Firebase Hosting**

#### **Opção A: CLI do Firebase (Recomendado)**

```bash
# Instala Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializa o projeto
firebase init hosting

# Quando perguntar:
# - Public directory? → "." (current)
# - Single page app? → "Yes"
# - Overwrite index.html? → "No"

# Deploy
firebase deploy
```

#### **Opção B: Console Firebase (Mais fácil)**

1. Va em **Firebase Console** → seu projeto
2. Clique em **"Hosting"**
3. Clique em **"Começar"**
4. Siga os passos do CLI acima
5. Seu site vai estar em: `https://ialorichat.firebaseapp.com`

---

## 🔐 Configurar Firestore (IMPORTANTE!)

### **Passo 1: Criar Estrutura do Banco**

No **Firebase Console**, va em **Firestore Database** e crie manualmente (ou use o script abaixo):

**Collections a criar:**

```
usuarios/
├── admin@email.com (documento)
│   ├── nome: "Seu Nome"
│   ├── role: "admin"
│   ├── ativo: true
│   └── email: "admin@email.com"
│
├── operador1@email.com
│   ├── nome: "Operador 1"
│   ├── role: "operador"
│   ├── ativo: true
│   └── email: "operador1@email.com"
│
├── operador2@email.com
│   ├── nome: "Operador 2"
│   ├── role: "operador"
│   ├── ativo: true
│   └── email: "operador2@email.com"
│
└── operador3@email.com
    ├── nome: "Operador 3"
    ├── role: "operador"
    ├── ativo: true
    └── email: "operador3@email.com"

perguntas-respostas/ (vazia inicialmente)
perguntas-obrigatorias/ (vazia inicialmente)
atendimentos/ (vazia inicialmente)
```

### **Passo 2: Configurar Firestore Rules (Segurança)**

No Firestore, va em **"Rules"** e cole isso:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuários - apenas admin pode ler/editar
    match /usuarios/{email} {
      allow read, write: if request.auth.uid != null && 
                            get(/databases/$(database)/documents/usuarios/$(request.auth.token.email)).data.role == 'admin';
      allow read: if request.auth.token.email == email;
    }
    
    // Perguntas/Respostas - admin edita, operadores leem
    match /perguntas-respostas/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid != null && 
                      get(/databases/$(database)/documents/usuarios/$(request.auth.token.email)).data.role == 'admin';
    }
    
    // Perguntas Obrigatórias
    match /perguntas-obrigatorias/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid != null && 
                      get(/databases/$(database)/documents/usuarios/$(request.auth.token.email)).data.role == 'admin';
    }
    
    // Atendimentos - todos podem ler, bot escreve
    match /atendimentos/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid != null;
    }
  }
}
```

**Publique as rules!**

---

## 👤 Adicionar Usuários

### **Adicionar no Firebase Authentication:**

1. Firebase Console → **Authentication** → **Usuários**
2. Clique **"Adicionar usuário"**
3. Email: `seu@email.com`
4. Senha: Temporária (muda no primeiro login)
5. **Criar**

### **Registrar no Firestore:**

1. Firestore → **Collection: usuarios** → **Add Document**
2. Document ID: `seu@email.com` (EXATAMENTE o email)
3. Campos:
   ```
   nome: "Seu Nome"
   email: "seu@email.com"
   role: "admin" ou "operador"
   ativo: true
   ```

---

## 🔄 Fluxo de Uso

1. **Admin loga** → Adiciona perguntas/respostas
2. **Operadores logam** → Veem as respostas, acompanham atendimentos
3. **Bot (Node.js)** → Busca perguntas da API e responde no WhatsApp
4. **Histórico** → Tudo registrado no Firestore

---

## 📱 Bot (Próxima Etapa)

O bot vai fazer requisições assim:

```javascript
// Buscar perguntas
fetch('https://ialorichat.firebaseapp.com/api/perguntas')
  .then(r => r.json())
  .then(data => console.log(data))

// Registrar atendimento
fetch('https://ialorichat.firebaseapp.com/api/atendimentos', {
  method: 'POST',
  body: JSON.stringify({ cpf, whatsapp, mensagem })
})
```

(Isso será desenvolvido na próxima fase)

---

## 🐛 Troubleshooting

**"Erro: usuário não existe"**
- Certifique-se que criou o document no Firestore com o email exato
- Role deve ser "admin" ou "operador"

**"Firestore Rules denied"**
- Copie e publique as rules acima
- Aguarde uns segundos pra aplicar

**"Botão não funciona"**
- Abra Console (F12) → veja mensagens de erro
- Verifique se Firestore está ativo

---

## 📧 Dados do Firebase

Se precisar acessar via API depois:

```
Project ID: ialorichat
API Key: AIzaSyDLf_6eM_4W45v7FsHiFJDwOO-umvu7B8U
Auth Domain: ialorichat.firebaseapp.com
Storage Bucket: ialorichat.firebasestorage.app
```

---

## ✅ Checklist Final

- [ ] Firebase Firestore criado
- [ ] 4 usuários adicionados em Authentication
- [ ] 4 documentos criados em `usuarios/` no Firestore
- [ ] Firestore Rules publicadas
- [ ] `index.html` commitado no GitHub
- [ ] Deploy feito no Firebase Hosting
- [ ] Consegue fazer login ✅
- [ ] Consegue adicionar perguntas ✅

Depois disso, a gente integra o **Bot no Railway**!

---

## 🎯 Próximos Passos

1. ✅ Painel Admin (feito)
2. Bot WhatsApp (próximo)
3. Recuperação de Senha (depois)
4. Estatísticas avançadas (final)

Bora fazer deploy? 🚀
