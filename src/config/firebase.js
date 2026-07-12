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
  initializeFirestore,
  memoryLocalCache, // Explicação: Configura o cache em memória RAM para evitar conflitos de dados de contas recém-deletadas.
  collectionGroup,
  or,
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

/**
 * CONFIGURAÇÃO ESTABILIZADA v8.10.0
 * Limpa o cache físico local do smartphone forçando o uso de memória volátil, resolvendo erros de permissão.
 */
const db = initializeFirestore(app, {
  // Explicação: Inicializa o banco de dados Firestore aplicando regras avançadas de performance.
  localCache: memoryLocalCache(), // Explicação: Ativa o Crachá Limpo: o aplicativo ignora dados antigos salvos no disco e sempre lê a verdade do servidor.
  useFetchStreams: true, // Explicação: Ativa a tecnologia Fetch Streams que puxa e sincroniza os dados da nuvem na velocidade máxima da internet.
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
  and, // 🚀 CENTRAL EXPANDIDA: Exporta a peça "and" para que o eventService e as telas consigam usá-la sem travar o compilador!
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  deleteUser,
};
