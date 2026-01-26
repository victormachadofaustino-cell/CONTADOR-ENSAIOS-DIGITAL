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
      setUser(currentUser);
      
      if (currentUser) {
        // Se estiver logado, busca os "poderes" dele no banco de dados
        const unsubSnap = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
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
            // Somente quem é RegionalCidade ou superior pode navegar entre cidades/comuns.
            // O nível GEM_LOCAL (Victor MG) deve ficar preso ao data.comumId do seu próprio perfil.
            const validRegionalId = (permissions.isComissao) ? (activeRegionalId || data.regionalId) : data.regionalId;
            const validCityId = (permissions.isRegionalCidade) ? (activeCityId || data.cidadeId) : data.cidadeId;
            const validComumId = (permissions.isRegionalCidade) ? (activeComumId || data.comumId) : data.comumId;

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
        });
        return () => unsubSnap();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, [activeRegionalId, activeCityId, activeComumId]); 

  // FUNÇÕES DE COMANDO (Chamadas pelo Header para trocar o contexto)
  const setContext = (type, id) => {
    if (type === 'regional') {
      setActiveRegionalId(id);
      localStorage.setItem('activeRegionalId', id);
      setActiveCityId(null);
      setActiveComumId(null);
      localStorage.removeItem('activeCityId');
      localStorage.removeItem('activeComumId');
    }
    if (type === 'city') {
      setActiveCityId(id);
      localStorage.setItem('activeCityId', id);
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
    isAuthenticated: !!user,
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