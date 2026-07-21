import { initializeApp } from "firebase/app"; // Explicação: Inicia a conexão básica com o ecossistema do Google Firebase.
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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

// 🚀 INICIALIZAÇÃO ROBUSTA DO FIRESTORE COM PERSISTÊNCIA MULTI-ABAS
// A função `initializeFirestore` substitui a combinação de `getFirestore` e `enableIndexedDbPersistence`,
// ativando o modo offline de forma mais moderna e segura, com suporte para múltiplas abas.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  console.error(
    "Falha ao inicializar persistência multi-abas, usando cache em memória.",
    e,
  );
  db = getFirestore(app);
}

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
