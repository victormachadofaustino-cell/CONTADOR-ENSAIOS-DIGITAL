import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, onSnapshot, 
  setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where, enableIndexedDbPersistence,
  getDocs,    // INCLUÍDO PARA A FÁBRICA
  writeBatch  // INCLUÍDO PARA A FÁBRICA
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
const db = getFirestore(app);
const auth = getAuth(app);

// ATIVAÇÃO DA PERSISTÊNCIA OFFLINE
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Múltiplas abas abertas: persistência limitada.");
    } else if (err.code === 'unimplemented-state') {
        console.warn("Navegador sem suporte a persistência offline.");
    }
});

export { 
  auth, db, collection, doc, onSnapshot, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where,
  getDocs,    // EXPORTADO PARA A FÁBRICA
  writeBatch, // EXPORTADO PARA A FÁBRICA
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification 
};