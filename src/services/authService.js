import { 
  auth, db, doc, setDoc, getDoc,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, sendEmailVerification,
  deleteUser // v2.4 - Agora importado do config centralizado
} from '../config/firebase'; // Explicação: Importa as ferramentas essenciais de login e banco de dados.

/**
 * Serviço de Autenticação e Gestão de Usuários
 * v2.5 - Sincronização Atômica de Tokens e Estabilização de Identidade.
 */
export const authService = { // Explicação: Inicia o motor de serviços de usuário.
  
  // Realiza o login do usuário com Trava de Segurança em Camadas
  login: async (email, password) => { // Explicação: Função para entrar no sistema.
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password); // Explicação: Tenta validar e-mail e senha no Google.
      
      // TRAVA 1: Verificação de E-mail
      if (!cred.user.emailVerified) { // Explicação: Se o usuário não clicou no link do e-mail ainda...
        await sendEmailVerification(cred.user); // Explicação: Reenvia o link de verificação.
        await signOut(auth); // Explicação: Chuta o usuário para fora por segurança.
        throw new Error("ACESSO BLOQUEADO: E-mail não verificado. Verifique sua caixa de entrada e SPAM.");
      }
      
      // v2.5: Atualização forçada de Crachá ao logar
      await cred.user.getIdToken(true); // Explicação: Força o navegador a buscar as permissões mais recentes do servidor.

      return cred.user; // Explicação: Retorna o usuário logado com sucesso.
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error("E-mail ou senha incorretos.");
      }
      throw error;
    }
  },

  // Registra um novo usuário vinculado a uma ComumId e sua Hierarquia
  register: async ({ email, password, name, role, comum, comumId, cidadeId, regionalId }) => { // Explicação: Função que cria novos músicos.
    // Validação de Governança
    if (!cidadeId || !regionalId || !comumId) { // Explicação: Se faltar algum dado de localização, nem tenta criar.
      throw new Error("Falha de jurisdição: Dados geográficos obrigatórios ausentes.");
    }

    let cred;
    try {
      // 1. Cria o usuário no Auth (O "RG" do Google)
      cred = await createUserWithEmailAndPassword(auth, email, password); 
      
      // 2. Tenta criar o perfil no Firestore (O "Crachá" do Sistema)
      try {
        await setDoc(doc(db, 'users', cred.user.uid), { // Explicação: Grava os dados na pasta /users/.
          email: email.toLowerCase().trim(), // Explicação: Garante e-mail limpo e em minúsculo.
          name: name.toUpperCase().trim(), // Explicação: Nome em maiúsculo para padrão de relatório.
          role,
          comum,
          comumId,
          cidadeId,
          regionalId,
          accessLevel: 'basico', // Explicação: Todo cadastro novo nasce no nível básico por segurança.
          approved: false, // Inicia aguardando aprovação da zeladoria.
          disabled: false, // Inicia com a conta ativa.
          createdAt: Date.now(), // Explicação: Salva o momento exato da criação.
          dbVersion: "2.1-matriz" // Explicação: Versão do banco de dados.
        });

        // v2.5: Sincronização imediata após registro
        await cred.user.getIdToken(true); // Explicação: Carimba o crachá novo com os dados que acabamos de salvar.

        // 3. Envia verificação e força Logout
        await sendEmailVerification(cred.user); // Explicação: Envia o link para o e-mail do usuário.
        await signOut(auth); // Explicação: Desconecta para que ele só entre após validar o e-mail.

        return cred.user;

      } catch (firestoreError) {
        // ROLLBACK: Se falhar no banco, deleta o login para liberar o e-mail para nova tentativa
        if (cred.user) {
          await deleteUser(cred.user); // Explicação: Apaga o "RG" se o "Crachá" falhou, para não sujar o sistema.
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
  getUserData: async (uid) => { // Explicação: Função para buscar o perfil de um usuário específico.
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) return docSnap.data();
    return null;
  },

  /**
   * Finaliza a sessão com limpeza profunda
   */
  logout: async () => { // Explicação: Função para sair do sistema com segurança.
    try {
      localStorage.clear(); // Explicação: Apaga todas as memórias temporárias do celular.
      sessionStorage.clear(); // Explicação: Limpa dados de navegação da sessão atual.
      await signOut(auth); // Explicação: Avisa o Google que a sessão acabou.
      window.location.href = "/"; // Explicação: Manda o usuário de volta para a tela inicial.
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
      localStorage.clear();
      window.location.reload();
    }
  }
};