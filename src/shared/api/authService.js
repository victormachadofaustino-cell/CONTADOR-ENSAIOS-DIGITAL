import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  deleteUser, // v2.4 - Agora importado do config centralizado
} from "./firebase"; // Explicação: Importa as ferramentas essenciais de login e banco de dados.

/**
 * Serviço de Autenticação e Gestão de Usuários
 * v2.5 - Sincronização Atômica de Tokens e Estabilização de Identidade.
 */
export const authService = {
  // Explicação: Inicia o motor de serviços de usuário.

  // Realiza o login do usuário com Trava de Segurança em Camadas
  login: async (email, password) => {
    // Explicação: Função para entrar no sistema.
    try {
      // Explicação: Inicia a tentativa de login protegido.
      const cred = await signInWithEmailAndPassword(auth, email, password); // Explicação: Tenta validar e-mail e senha no Google.

      // TRAVA 1: Verificação de E-mail
      if (!cred.user.emailVerified) {
        // Explicação: Se o usuário não clicou no link do e-mail ainda...
        await sendEmailVerification(cred.user); // Explicação: Reenvia o link de verificação.
        await signOut(auth); // Explicação: Chuta o usuário para fora por segurança.
        throw new Error(
          "ACESSO BLOQUEADO: E-mail não verificado. Verifique sua caixa de entrada e SPAM.",
        ); // Explicação: Trava a execução e avisa a tela.
      } // Explicação: Encerra a trava de verificação de e-mail.

      // v2.5: Atualização forçada de Crachá ao logar
      await cred.user.getIdToken(true); // Explicação: Força o navegador a buscar as permissões mais recentes do servidor.

      return cred.user; // Explicação: Retorna o usuário logado com sucesso.
    } catch (error) {
      // Explicação: Captura falhas de digitação ou erros do Google Auth.
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        // Explicação: Se der erro de credencial inválida:
        throw new Error("E-mail ou senha incorretos."); // Explicação: Retorna uma mensagem amigável sem expor detalhes do sistema.
      } // Explicação: Encerra a checagem de erros conhecidos.
      throw error; // Explicação: Repassa qualquer outro erro desconhecido para o sistema tratar.
    } // Explicação: Encerra o bloco de captura de erros do login.
  }, // Explicação: Encerra o método de login.

  // Registra um novo usuário vinculado a uma ComumId e sua Hierarquia
  register: async ({
    email,
    password,
    name,
    role,
    comum,
    comumId,
    cidadeId,
    regionalId,
  }) => {
    // Explicação: Função que cria novos músicos.
    // Validação de Governança
    if (!cidadeId || !regionalId || !comumId) {
      // Explicação: Se faltar algum dado de localização, nem tenta criar.
      throw new Error(
        "Falha de jurisdição: Dados geográficos obrigatórios ausentes.",
      ); // Explicação: Barra o cadastro se o usuário tentar burlar a localidade.
    } // Explicação: Encerra a validação geográfica.

    let cred; // Explicação: Cria a variável que guardará os dados da conta criada no Google.
    try {
      // Explicação: Inicia a tentativa de cadastro em duas etapas.
      // 1. Cria o usuário no Auth (O "RG" do Google)
      cred = await createUserWithEmailAndPassword(auth, email, password); // Explicação: Envia e-mail e senha para criar o registro no banco de acessos do Google.

      // 2. Tenta criar o perfil no Firestore (O "Crachá" do Sistema)
      try {
        // Explicação: Inicia a tentativa de gravar a ficha cadastral associada.
        await setDoc(doc(db, "users", cred.user.uid), {
          // Explicação: Grava os dados na pasta /users/ usando o ID único do Google.
          email: email.toLowerCase().trim(), // Explicação: Garante e-mail limpo e em minúsculo.
          name: name.toUpperCase().trim(), // Explicação: Nome em maiúsculo para padrão de relatório.
          role, // Explicação: Salva a função musical informada (ex: Músico, Organista).
          comum, // Explicação: Salva o nome por extenso da igreja comum de origem.
          comumId, // Explicação: Carimba o ID fixo da igreja comum para buscas rápidas.
          cidadeId, // Explicação: Carimba o ID fixo da cidade para controle regional.
          regionalId, // Explicação: Carimba o ID fixo da regional para relatórios macros.
          accessLevel: "basico", // Explicação: Todo cadastro novo nasce no nível básico por segurança.
          approved: false, // Explicação: Inicia como falso, aguardando aprovação manual da zeladoria.
          disabled: false, // Explicação: Inicia com a conta ativa (não bloqueada).
          createdAt: Date.now(), // Explicação: Salva o momento exato da criação em formato numérico.
          dbVersion: "2.1-matriz", // Explicação: Versão do padrão de tabelas atual.
        }); // Explicação: Conclui a gravação do documento no Firestore.

        // v2.5: Sincronização e proteção de concorrência antes do deslogue
        if (cred.user) {
          // Explicação: Verifica se a sessão do usuário recém-criado está ativa no navegador.
          await cred.user.getIdToken(true); // Explicação: Carimba o token inicial básico de forma segura.
        } // Explicação: Encerra a checagem de sincronização.

        // 3. Envia verificação e força Logout
        await sendEmailVerification(cred.user); // Explicação: Envia o link oficial de confirmação para a caixa do usuário.
        await signOut(auth); // Explicação: Desconecta imediatamente para que ele só navegue após validar o e-mail e ser aprovado.

        return cred.user; // Explicação: Devolve o usuário criado com sucesso.
      } catch (firestoreError) {
        // Explicação: Bloco acionado se o Firestore barrar a gravação da ficha (ex: erro de regras).
        // ROLLBACK: Se falhar no banco, deleta o login para liberar o e-mail para nova tentativa
        if (cred.user) {
          // Explicação: Se a conta de e-mail chegou a ser criada no Google Auth:
          await deleteUser(cred.user); // Explicação: Apaga o "RG" do Google se o "Crachá" falhou, para não deixar e-mails fantasmas presos.
        } // Explicação: Conclui a checagem de rollback.
        console.error("Erro de Permissão/Banco:", firestoreError); // Explicação: Exibe no console do desenvolvedor o motivo da rejeição do banco.
        throw new Error(
          "ERRO DE PERMISSÃO: Falha ao registrar perfil no banco. Contate o administrador.",
        ); // Explicação: Retorna um aviso limpo para a tela do usuário.
      } // Explicação: Fim do bloco catch do Firestore.
    } catch (authError) {
      // Explicação: Captura falhas geradas na primeira etapa (criação da conta no Google).
      if (authError.code === "auth/email-already-in-use") {
        // Explicação: Se o Google avisar que o e-mail já possui cadastro:
        throw new Error(
          "Este e-mail já está em uso. Tente fazer login ou recupere sua senha.",
        ); // Explicação: Avisa o usuário de forma amigável.
      } // Explicação: Fim da verificação de e-mail duplicado.
      throw authError; // Explicação: Repassa outros erros do Auth (como senha fraca) para a tela tratar.
    } // Explicação: Encerra o bloco catch principal do cadastro.
  }, // Explicação: Encerra o método de registro.

  // Recupera dados detalhados do usuário logado
  getUserData: async (uid) => {
    // Explicação: Função para buscar o perfil de um usuário específico.
    const docSnap = await getDoc(doc(db, "users", uid)); // Explicação: Faz uma consulta direta na pasta de usuários buscando pelo ID.
    if (docSnap.exists()) return docSnap.data(); // Explicação: Se achar a ficha física no banco, devolve os dados dela.
    return null; // Explicação: Caso contrário, retorna nulo indicando que a ficha não existe.
  }, // Explicação: Encerra o método getUserData.

  /**
   * Finaliza a sessão com limpeza profunda
   */
  logout: async () => {
    // Explicação: Função para sair do sistema com segurança.
    try {
      // Explicação: Inicia tentativa de limpeza profunda dos dados locais.
      localStorage.clear(); // Explicação: Apaga todas as memórias temporárias e relatórios salvos no celular.
      sessionStorage.clear(); // Explicação: Limpa dados e estados de navegação da sessão atual.
      await signOut(auth); // Explicação: Avisa os servidores do Google que a sessão foi encerrada de fato.
      window.location.href = "/"; // Explicação: Redireciona de forma forçada o usuário de volta para a tela de login.
    } catch (error) {
      // Explicação: Caso aconteça alguma falha mecânica no encerramento:
      console.error("Erro ao encerrar sessão:", error); // Explicação: Registra o log do erro no console.
      localStorage.clear(); // Explicação: Limpa preventivamente as memórias do celular de qualquer forma.
      window.location.reload(); // Explicação: Atualiza a página inteira para forçar o deslogue por quebra de estado.
    } // Explicação: Encerra o bloco catch do logout.
  }, // Explicação: Encerra o método logout.
}; // Explicação: Encerra o objeto exportável mestre authService.
