import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, onSnapshot, 
  setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where // ADICIONADO AQUI
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

export { 
  auth, db, collection, doc, onSnapshot, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc,
  query, orderBy, where, // EXPORTADO AQUI
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification 
};