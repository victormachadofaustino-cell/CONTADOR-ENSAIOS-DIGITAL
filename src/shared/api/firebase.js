import { initializeApp } from "firebase/app"; // Explicação: Inicia a conexão básica com o ecossistema do Google Firebase.
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  collectionGroup,
  enableIndexedDbPersistence,
  or,
  documentId, // 🚀 CONEXÃO DE PEÇA: Importa o documentId para consultas por ID.
  and, // 🚀 CONEXÃO DE PEÇA: Importa oficialmente o conector lógico "E" diretamente da biblioteca do Firestore da Google.
} from "firebase/firestore"; // Explicação: Captura as ferramentas estruturais para mexer nas tabelas e documentos de dados.
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  deleteUser,
} from "firebase/auth"; // Explicação: Captura as ferramentas nativas de portaria para gerenciar os logins e sessões dos usuários.

const firebaseConfig = {
  // Explicação: Estrutura o bloco contendo as suas chaves e credenciais exclusivas de conexão com o banco de dados.
  apiKey: "AIzaSyADDCI9-Dy3SXitcWwAX5yH45Cfw4-15KU",
  authDomain: "contador-digital-ccb.firebaseapp.com",
  projectId: "contador-digital-ccb",
  storageBucket: "contador-digital-ccb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig); // Explicação: Liga os motores do Firebase aplicando a fiação das suas chaves de credenciais configuradas acima.

const db = getFirestore(app); // Explicação: Inicializa o banco de dados Firestore com a configuração padrão.

// ATIVAÇÃO DO MODO OFFLINE
enableIndexedDbPersistence(db).catch((err) => {
  // Explicação: Tenta ativar o cache persistente no disco do dispositivo.
  if (err.code == "failed-precondition") {
    // Múltiplas abas abertas, o que não é um problema no celular.
    // A persistência só pode ser ativada em uma aba por vez.
  } else if (err.code == "unimplemented") {
    // O navegador não suporta o modo offline (muito raro hoje em dia).
  }
});

const auth = getAuth(app); // Explicação: Liga o vigia oficial do sistema de autenticação para saber quem está operando o app.

export {
  // Explicação: Despacha e distribui todas essas ferramentas prontas para o restante de todos os arquivos do projeto consumirem.
  auth,
  db,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  collectionGroup,
  or,
  documentId, // 🚀 CENTRAL EXPANDIDA: Exporta o documentId para uso nas páginas.
  and, // 🚀 CENTRAL EXPANDIDA: Exporta a peça "and" para que o eventService e as telas consigam usá-la sem travar o compilador!
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  deleteUser,
};
