import { 
  auth, db, doc, setDoc, getDoc,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, sendEmailVerification 
} from '../config/firebase';

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

  // Registra um novo usuário vinculado a uma ComumId e sua Hierarquia
  // Adicionado suporte para cidadeId e regionalId para escalabilidade
  register: async ({ email, password, name, role, comum, comumId, cidadeId, regionalId }) => {
    // 1. Cria o usuário no Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Cria o perfil no Firestore (Lógica Multitenancy Hierárquica)
    // O comumId define o acesso local, enquanto cidadeId e regionalId definem a visibilidade macro
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      name,
      role,
      comum,
      comumId: comumId, // Removido ID fixo para garantir integridade multi-igreja
      cidadeId: cidadeId || 'jundiai_central', // Vincula à cidade (Padrão Jundiaí se omitido)
      regionalId: regionalId || 'regional_jundiai', // Vincula à regional administrativa
      approved: false, // Inicia aguardando aprovação
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