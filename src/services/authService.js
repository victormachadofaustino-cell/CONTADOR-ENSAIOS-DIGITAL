import { 
  auth, db, doc, setDoc, getDoc,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, sendEmailVerification 
} from '../config/firebase';

/**
 * Serviço de Autenticação e Gestão de Usuários
 * Saneado para Escalabilidade Nacional (Removido Resquícios de Jundiaí)
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
  // Sistema agnóstico: exige IDs reais vindos do banco de dados
  register: async ({ email, password, name, role, comum, comumId, cidadeId, regionalId }) => {
    // Validação de Governança: impede registros sem jurisdição definida
    if (!cidadeId || !regionalId || !comumId) {
      throw new Error("Falha de jurisdição: Dados geográficos obrigatórios ausentes.");
    }

    // 1. Cria o usuário no Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Cria o perfil no Firestore (Lógica Multitenancy Hierárquica)
    // Registro 100% dinâmico baseado na seleção real do usuário
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      name,
      role,
      comum,
      comumId, 
      cidadeId, 
      regionalId,
      approved: false, // Inicia aguardando aprovação da zeladoria local/regional
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