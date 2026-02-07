import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, doc, onSnapshot, onAuthStateChanged } from '../config/firebase';

// Criação do Contexto (O reservatório de dados)
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Usuário do Firebase Auth
  const [userData, setUserData] = useState(null); // Dados do perfil no Firestore
  const [loading, setLoading] = useState(true); // Trava o app enquanto carrega os poderes

  // ESTADOS REATIVOS DE NAVEGAÇÃO (O GPS do Master/Regional)
  // Eles inicializam com o que estiver no localStorage para manter a sessão ao dar F5
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId'));
  const [activeCityId, setActiveCityId] = useState(localStorage.getItem('activeCityId'));
  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId'));

  useEffect(() => {
    // Fica ouvindo se o usuário está logado ou não
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      
      // TRAVA DE SEGURANÇA v2.2: Impede a entrada reativa se o e-mail não estiver verificado
      // Isso evita que a aprovação manual do Master "pule" a validação do e-mail.
      // Se o e-mail não for verificado, forçamos o estado para null imediatamente.
      if (currentUser && !currentUser.emailVerified) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      
      if (currentUser) {
        // Se estiver logado e verificado, busca os "poderes" dele no banco de dados
        const unsubSnap = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          // Proteção contra processamento de snapshot em estado de logout iminente ou e-mail não verificado
          if (!auth.currentUser || !auth.currentUser.emailVerified) {
            setLoading(false);
            return;
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // --- CÉREBRO DE PERMISSÕES REATIVO (Briefing de Hierarquia v2.1) ---
            // AJUSTE EFETIVO: Unificamos a lógica no accessLevel vindo do banco saneado.
            const level = data.accessLevel || 'basico';

            const permissions = {
              isMaster: level === 'master', 
              isComissao: level === 'master' || level === 'comissao', 
              isRegionalCidade: level === 'master' || level === 'comissao' || level === 'regional_cidade', 
              isGemLocal: level === 'master' || level === 'comissao' || level === 'regional_cidade' || level === 'gem_local', 
              isBasico: level === 'basico',
              isAdmin: level !== 'basico' 
            };

            // TRAVA DE SEGURANÇA MULTITENANCY (GPS CORRIGIDO)
            // Alterado para respeitar a persistência da última visita antes do cadastro original
            const storedReg = localStorage.getItem('activeRegionalId');
            const storedCity = localStorage.getItem('activeCityId');
            const storedComum = localStorage.getItem('activeComumId');

            const validRegionalId = (permissions.isComissao) ? (activeRegionalId || storedReg || data.regionalId) : data.regionalId;
            const validCityId = (permissions.isRegionalCidade) ? (activeCityId || storedCity || data.cidadeId) : data.cidadeId;
            const validComumId = (permissions.isRegionalCidade) ? (activeComumId || storedComum || data.comumId) : data.comumId;

            // Injeta os IDs ativos no userData para que todo o app seja reativo
            setUserData({ 
              ...data, 
              uid: currentUser.uid, 
              ...permissions,
              activeRegionalId: validRegionalId, 
              activeCityId: validCityId,
              activeComumId: validComumId
            });
          }
          setLoading(false);
        }, (err) => {
          console.error("Erro no Listener de Perfil:", err);
          setLoading(false);
        });
        return () => unsubSnap();
      } else {
        // --- LIMPEZA DE SEGURANÇA NO LOGOUT ---
        setUserData(null);
        
        // Reseta estados de navegação
        setActiveRegionalId(null);
        setActiveCityId(null);
        setActiveComumId(null);

        // Limpa cache de localização para o próximo login
        localStorage.removeItem('activeRegionalId');
        localStorage.removeItem('activeCityId');
        localStorage.removeItem('activeComumId');

        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, [activeRegionalId, activeCityId, activeComumId]); 

  // FUNÇÕES DE COMANDO (Chamadas pelos seletores para trocar o contexto)
  const setContext = (type, id) => {
    if (type === 'regional') {
      setActiveRegionalId(id);
      localStorage.setItem('activeRegionalId', id);
      
      // Reset em cascata reativo
      setActiveCityId(null);
      setActiveComumId(null);
      localStorage.removeItem('activeCityId');
      localStorage.removeItem('activeComumId');
    }
    
    if (type === 'city') {
      setActiveCityId(id);
      localStorage.setItem('activeCityId', id);
      
      // CRÍTICO PARA NÍVEL COMISSÃO: Limpa a comum ativa no estado reativo
      // Isso força o App.jsx a resetar a lista de eventos
      setActiveComumId(null);
      localStorage.removeItem('activeComumId');
    }
    
    if (type === 'comum') {
      setActiveComumId(id);
      localStorage.setItem('activeComumId', id);
    }
  };

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user && user.emailVerified === true, // Só é autenticado se validou e-mail explicitamente
    setContext, 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve be used within an AuthProvider');
  return context;
};