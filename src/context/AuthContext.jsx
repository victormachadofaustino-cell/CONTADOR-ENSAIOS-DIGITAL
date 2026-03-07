import React, { createContext, useContext, useState, useEffect } from 'react'; // Explicação: Importa as ferramentas para criar a memória global do aplicativo.
import { auth, db, doc, onSnapshot, onAuthStateChanged } from '../config/firebase'; // Explicação: Conecta com o login e o banco de dados.
import { PERMISSIONS_MAP, ROLES, hasPermission } from '../config/permissions'; // Explicação: Importa as regras de quem pode o quê.

// Criação do Contexto
const AuthContext = createContext(); // Explicação: Cria o reservatório onde guardaremos os dados do usuário logado.

export const AuthProvider = ({ children }) => { // Explicação: Componente que distribui as informações de login para todo o app.
  const [user, setUser] = useState(null); // Explicação: Guarda os dados básicos do login (e-mail, uid).
  const [userData, setUserData] = useState(null); // Explicação: Guarda o perfil completo (igreja, cargo, nível).
  const [loading, setLoading] = useState(true); // Explicação: Mantém o app em "carregando" até que a identidade seja confirmada.

  // ESTADOS DE NAVEGAÇÃO (GPS)
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId')); // Explicação: Lembra a regional selecionada.
  const [activeCityId, setActiveCityId] = useState(localStorage.getItem('activeCityId')); // Explicação: Lembra a cidade selecionada.
  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId')); // Explicação: Lembra a igreja selecionada.

  useEffect(() => { // Explicação: Monitor principal que roda ao abrir o app.
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => { // Explicação: Vigia se o usuário entrou ou saiu.
      
      if (currentUser && !currentUser.emailVerified) { // Explicação: Se não confirmou o e-mail, desconecta por segurança.
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser); // Explicação: Salva o usuário autenticado.
      
      if (currentUser) { // Explicação: Se estiver logado, busca o perfil no banco de dados.
        try {
          // --- v10.6: RENOVAÇÃO FORÇADA DE CRACHÁ ---
          // Explicação: Obriga o navegador a atualizar os tokens de segurança para evitar erro de permissão em contas recriadas.
          await currentUser.getIdToken(true);

          // Explicação: Abre um canal em tempo real com o documento do usuário na pasta /users/.
          const unsubSnap = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data(); // Explicação: Pega os dados de cargo, igreja e nível.
              
              // --- DEFINIÇÃO DE NÍVEL SOBERANA (BANCO > CLAIMS) ---
              // Explicação: O que vale é o que está no banco de dados para evitar atraso de token.
              const level = data.accessLevel || ROLES.BASICO;
              const isOwner = currentUser.email === 'victormachadofaustino@gmail.com';

              // Explicação: Calcula as bandeiras de poder para facilitar a lógica visual.
              const permissions = {
                isMaster: level === ROLES.MASTER || isOwner, 
                isComissao: level === ROLES.MASTER || isOwner || level === ROLES.COMISSAO, 
                isRegionalCidade: level === ROLES.MASTER || isOwner || level === ROLES.COMISSAO || level === ROLES.CIDADE, 
                isGemLocal: level === ROLES.MASTER || isOwner || level === ROLES.COMISSAO || level === ROLES.CIDADE || level === ROLES.GEM, 
                isBasico: level === ROLES.BASICO,
                isAdmin: level !== ROLES.BASICO 
              };

              // GPS REATIVO v10.7: Prioriza o SELETOR para gestores, permitindo visão nula (todos).
              // Explicação: Se for gestor, aceita o ID vindo do Pill (mesmo se for null). Se for usuário comum, trava na igreja dele.
              const validRegionalId = permissions.isComissao ? activeRegionalId : data.regionalId;
              const validCityId = permissions.isRegionalCidade ? activeCityId : data.cidadeId;
              const validComumId = permissions.isRegionalCidade ? activeComumId : data.comumId;

              setUserData({ 
                ...data, 
                uid: currentUser.uid, 
                ...permissions,
                accessLevel: level,
                activeRegionalId: validRegionalId, 
                activeCityId: validCityId,
                activeComumId: validComumId,
                // Explicação: Função "can" para perguntar à Regra de Ouro se o usuário pode fazer algo.
                can: (action, targetRole) => hasPermission({ ...data, ...permissions, accessLevel: level }, action, targetRole)
              });
              setLoading(false); // Explicação: Só libera o app quando o perfil real for carregado.
            } else {
              setLoading(false); // Explicação: Libera se não houver perfil, masUserData ficará null.
            }
          }, (err) => {
            console.error("AuthContext: Erro ao ler perfil:", err);
            setLoading(false);
          });

          return () => unsubSnap(); // Explicação: Fecha a conexão ao sair.
        } catch (err) {
          console.error("AuthContext: Erro na renovação de identidade:", err);
          setLoading(false);
        }
      } else {
        // --- LIMPEZA AO SAIR ---
        setUserData(null);
        localStorage.clear(); // Explicação: Limpa as memórias de GPS ao fazer logout.
        setLoading(false);
      }
    });

    return () => unsubAuth(); // Explicação: Limpa o vigia de login.
  }, [activeRegionalId, activeCityId, activeComumId]); 

  // FUNÇÕES DO GPS v10.7: Ajustado para limpeza em cascata (se mudar regional, limpa cidade e comum).
  const setContext = (type, id) => { // Explicação: Muda a igreja ou cidade que o gestor está vendo.
    if (type === 'regional') {
      setActiveRegionalId(id);
      id ? localStorage.setItem('activeRegionalId', id) : localStorage.removeItem('activeRegionalId');
      setActiveCityId(null); // Explicação: Ao trocar regional, limpa a cidade anterior.
      localStorage.removeItem('activeCityId');
      setActiveComumId(null); // Explicação: Ao trocar regional, limpa a igreja anterior.
      localStorage.removeItem('activeComumId');
    }
    if (type === 'city') {
      setActiveCityId(id);
      id ? localStorage.setItem('activeCityId', id) : localStorage.removeItem('activeCityId');
      setActiveComumId(null); // Explicação: Ao trocar de cidade, desmarca a igreja para ver a cidade toda.
      localStorage.removeItem('activeComumId');
    }
    if (type === 'comum') {
      setActiveComumId(id);
      id ? localStorage.setItem('activeComumId', id) : localStorage.removeItem('activeComumId');
    }
  };

  const value = {
    user,
    userData,
    loading,
    // Explicação: Autenticado se tiver e-mail verificado E perfil aprovado pelo gestor.
    isAuthenticated: !!user && user.emailVerified && (userData?.approved || userData?.isMaster),
    setContext,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => { // Explicação: Gancho para usar os dados em outros arquivos.
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};