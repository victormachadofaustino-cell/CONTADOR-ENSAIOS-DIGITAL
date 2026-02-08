import { 
  auth, db, doc, setDoc, getDoc,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, sendEmailVerification,
  deleteUser // v2.4 - Agora importado do config centralizado
} from '../config/firebase';

/**
 * Serviço de Autenticação e Gestão de Usuários
 * v2.4 - Sincronização de Importações e Rollback de Segurança Consolidado.
 */
export const authService = {
  
  // Realiza o login do usuário com Trava de Segurança em Camadas
  login: async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // TRAVA 1: Verificação de E-mail
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user);
        await signOut(auth);
        throw new Error("ACESSO BLOQUEADO: E-mail não verificado. Verifique sua caixa de entrada e SPAM.");
      }
      
      return cred.user;
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error("E-mail ou senha incorretos.");
      }
      throw error;
    }
  },

  // Registra um novo usuário vinculado a uma ComumId e sua Hierarquia
  register: async ({ email, password, name, role, comum, comumId, cidadeId, regionalId }) => {
    // Validação de Governança
    if (!cidadeId || !regionalId || !comumId) {
      throw new Error("Falha de jurisdição: Dados geográficos obrigatórios ausentes.");
    }

    let cred;
    try {
      // 1. Cria o usuário no Auth
      cred = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Tenta criar o perfil no Firestore
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          email,
          name,
          role,
          comum,
          comumId,
          cidadeId,
          regionalId,
          accessLevel: 'basico',
          approved: false, // Inicia aguardando aprovação
          disabled: false,
          createdAt: Date.now(),
          dbVersion: "2.1-matriz"
        });

        // 3. Envia verificação e força Logout
        await sendEmailVerification(cred.user);
        await signOut(auth);

        return cred.user;

      } catch (firestoreError) {
        // ROLLBACK: Se falhar no banco, deleta o login para liberar o e-mail
        if (cred.user) {
          await deleteUser(cred.user);
        }
        console.error("Erro de Permissão/Banco:", firestoreError);
        throw new Error("ERRO DE PERMISSÃO: Falha ao registrar perfil no banco. Contate o administrador.");
      }

    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        throw new Error("Este e-mail já está em uso. Tente fazer login ou recupere sua senha.");
      }
      throw authError;
    }
  },

  // Recupera dados detalhados do usuário logado
  getUserData: async (uid) => {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) return docSnap.data();
    return null;
  },

  /**
   * Finaliza a sessão com limpeza profunda
   */
  logout: async () => {
    try {
      localStorage.clear();
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
      localStorage.clear();
      window.location.reload();
    }
  }
};