import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, onSnapshot, 
  setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where, 
  getDocs,
  writeBatch,
  initializeFirestore,
  persistentLocalCache, // MUDANÇA: Voltando para persistência física com limite de cota
  persistentMultipleTabManager,
  collectionGroup,
  or 
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  sendEmailVerification,
  deleteUser 
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

// CONFIGURAÇÃO REPARADA v8.9.8: Ativa Offline real com limite de 50MB para evitar QuotaExceeded
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: 50 * 1024 * 1024 // Limite de 50MB para proteção do armazenamento
  }),
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
  collectionGroup, 
  or, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification,
  deleteUser 
};