import { 
  auth, db, doc, setDoc, getDoc,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, sendEmailVerification 
} from '../firebase';

/**
 * Serviço de Autenticação e Gestão de Usuários
 */
export const authService = {
  
  // Realiza o login do usuário
  login: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
      throw new Error("E-mail não verificado. Verifique sua caixa de entrada.");
    }
    return cred.user;
  },

  // Registra um novo usuário vinculado a uma ComumId
  register: async ({ email, password, name, role, comum, comumId }) => {
    // 1. Cria o usuário no Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Cria o perfil no Firestore (Lógica Multitenancy)
    // Aqui gravamos o comumId que define qual "balde" de dados esse usuário verá
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      name,
      role,
      comum,
      comumId: comumId || 'hsfjhZ3KNx7SsCM8EFpu', // ID padrão inicial [cite: 421]
      approved: false, // Inicia aguardando aprovação [cite: 421]
      disabled: false,
      isMaster: false,
      createdAt: Date.now()
    });

    await sendEmailVerification(cred.user);
    return cred.user;
  },

  // Recupera dados detalhados do usuário logado
  getUserData: async (uid) => {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) return docSnap.data();
    return null;
  },

  // Finaliza a sessão
  logout: async () => {
    await signOut(auth);
  }
};