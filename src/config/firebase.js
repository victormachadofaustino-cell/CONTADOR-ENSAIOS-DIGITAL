import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, onSnapshot, 
  setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where, 
  getDocs,    // INCLUÍDO PARA A FÁBRICA
  writeBatch,  // INCLUÍDO PARA A FÁBRICA
  initializeFirestore, // NOVO: Para configuração de estabilidade
  persistentLocalCache, // NOVO: Substitui enableIndexedDbPersistence
  persistentMultipleTabManager // NOVO: Suporte para múltiplas abas
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  sendEmailVerification 
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

/**
 * CONFIGURAÇÃO ROBUSTA (Firestore v11+)
 * Resolve: ERR_QUIC_PROTOCOL_ERROR e Depreciação de Persistência
 * Mantém: Suporte para múltiplas abas abertas e conexão estável
 */
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true, // Força conexão estável em dev local
  useFetchStreams: false
});

const auth = getAuth(app);

// Nota: A ativação da persistência offline agora é gerenciada internamente 
// pelo localCache no initializeFirestore definido acima.

export { 
  auth, db, collection, doc, onSnapshot, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where,
  getDocs,    // EXPORTADO PARA A FÁBRICA
  writeBatch, // EXPORTADO PARA A FÁBRICA
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification 
};