// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAlkv8AVRzCZqDaweXDFEd-Xv26YnKFQpk",
    authDomain: "eduplan-sistema.firebaseapp.com",
    projectId: "eduplan-sistema",
    storageBucket: "eduplan-sistema.firebasestorage.app",
    messagingSenderId: "711061743746",
    appId: "1:711061743746:web:1d07bdd0d84433fe036c9b",
    measurementId: "G-X6L0W559DD"
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
