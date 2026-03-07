import { initializeApp } from "firebase/app"; // Explicação: Inicia a conexão básica com o Google Firebase.
import { 
  getFirestore, collection, doc, onSnapshot, 
  setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where, 
  getDocs,
  writeBatch,
  initializeFirestore,
  memoryLocalCache, // v8.9.9: Mudança para cache em memória para evitar dados fantasmas de contas deletadas.
  collectionGroup,
  or 
} from "firebase/firestore"; // Explicação: Importa as ferramentas para mexer nas tabelas de dados.
import { 
  getAuth, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  sendEmailVerification,
  deleteUser 
} from "firebase/auth"; // Explicação: Importa as ferramentas para gerenciar os logins dos usuários.

const firebaseConfig = { // Explicação: Suas chaves de segurança para conectar ao seu banco de dados específico.
  apiKey: "AIzaSyADDCI9-Dy3SXitcWwAX5yH45Cfw4-15KU",
  authDomain: "contador-digital-ccb.firebaseapp.com",
  projectId: "contador-digital-ccb",
  storageBucket: "contador-digital-ccb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig); // Explicação: Liga o motor do Firebase com as suas chaves acima.

/**
 * CONFIGURAÇÃO ESTABILIZADA v8.9.9
 * Resolve o erro de "permissão negada" em contas recriadas limpando o cache físico.
 */
const db = initializeFirestore(app, { // Explicação: Prepara o banco de dados com ajustes de performance.
  localCache: memoryLocalCache(), // Explicação: Agora o app não guarda "lixo" no celular; ele sempre lê a verdade do servidor.
  useFetchStreams: true // Explicação: Ativa a tecnologia de recebimento de dados mais rápida do Google.
});

const auth = getAuth(app); // Explicação: Ativa o sistema de controle de quem está logado.

export { // Explicação: Disponibiliza todas essas ferramentas para o restante do seu projeto.
  auth, db, collection, doc, onSnapshot, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where,
  getDocs,
  writeBatch,
  collectionGroup, 
  or, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification,
  deleteUser 
};