// Configuração do Firebase
const firebaseConfig = {
    // VOCÊ PRECISA SUBSTITUIR ESTAS INFORMAÇÕES PELAS SUAS DO FIREBASE
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "sua-app-id"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar serviços
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configurações do Firestore
db.settings({
    timestampsInSnapshots: true
});

console.log('Firebase inicializado com sucesso!');
