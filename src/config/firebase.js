import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, onSnapshot, 
  setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where, 
  getDocs,
  writeBatch,
  initializeFirestore,
  memoryLocalCache, // MUDANÇA: Cache em memória para evitar QuotaExceededError
  persistentMultipleTabManager,
  collectionGroup // ADICIONADO: Necessário para consultas escaláveis no Dashboard
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  sendEmailVerification,
  deleteUser // ADICIONADO: Essencial para o sistema de Rollback v2.2
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyADDCI9-Dy3SXitcWwAX5yH45Cfw4-15KU",
  authDomain: "contador-digital-ccb.firebaseapp.com",
  projectId: "contador-digital-ccb",
  storageBucket: "contador-digital-ccb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);

// CONFIGURAÇÃO REPARADA: Resolve o erro "QuotaExceededError" [cite: 1361, 1913]
// Substituímos persistentLocalCache por memoryLocalCache para liberar o navegador
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(), 
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

const auth = getAuth(app);

export { 
  auth, db, collection, doc, onSnapshot, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where,
  getDocs,
  writeBatch,
  collectionGroup, // ADICIONADO: Exportação para uso no DashPage
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification,
  deleteUser // EXPORTADO: Para uso no authService no fluxo de erro de cadastro
};