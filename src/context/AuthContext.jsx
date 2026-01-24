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
            
            // --- CÉREBRO DE PERMISSÕES REATIVO (Briefing de Hierarquia) ---
            // AJUSTE EFETIVO: Definimos constantes de poder para facilitar a manutenção
            // Hierarquia: Master > Comissão (Regional) > Cidade (Regional/Micro) > Local > Básico
            const isMasterPower = data.isMaster === true;
            const isComissaoPower = isMasterPower || data.isComissao === true;
            
            // O nível "Regional" da CCB agora atua no escopo de Cidade/Micro-Região
            const isCidadePower = isMasterPower || isComissaoPower || data.escopoRegional === true || data.role === 'Encarregado Regional' || data.escopoCidade === true;

            const permissions = {
              isMaster: isMasterPower, // Poder total nacional/sistema
              isComissao: isComissaoPower, // Gestão da Regional Inteira (Todas as Cidades)
              isRegional: isCidadePower, // Antigo isRegional, agora focado no escopo de Cidade
              isCidade: isCidadePower, // Novo nível: Gestão de todas as comuns de uma Cidade
              // Se for Master, Comissão ou Regional de Cidade, possui poder Local automático
              isLocal: isCidadePower || data.escopoLocal === true, 
              isAdmin: isCidadePower || ['Encarregado Local', 'Examinadora', 'Secretário da Música', 'Secretario da Música'].includes(data.role) || data.escopoLocal === true // Pode criar ensaios
            };

            // TRAVA DE SEGURANÇA MULTITENANCY: 
            // Se não for Master ou Comissão, o activeRegionalId DEVE ser o regionalId do perfil para evitar acesso cruzado
            const validRegionalId = (isMasterPower || isComissaoPower) ? (activeRegionalId || data.regionalId) : data.regionalId;
            const validCityId = (isMasterPower || isComissaoPower || data.escopoCidade) ? (activeCityId || data.cidadeId) : data.cidadeId;
            const validComumId = (isMasterPower || isComissaoPower || data.escopoCidade || data.escopoLocal) ? (activeComumId || data.comumId) : data.comumId;

            // Injeta os IDs ativos no userData para que todo o app seja reativo à mudança do Header
            // CORREÇÃO MESTRA: Vinculamos os IDs de navegação ao objeto userData para forçar o re-render de componentes dependentes
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
  }, [activeRegionalId, activeCityId, activeComumId]); // Reage e recalcula permissões sempre que um ID de navegação mudar

  // FUNÇÕES DE COMANDO (Chamadas pelo Header para trocar o contexto)
  const setContext = (type, id) => {
    if (type === 'regional') {
      setActiveRegionalId(id);
      localStorage.setItem('activeRegionalId', id);
      // Ao mudar regional, resetamos os níveis abaixo para evitar conflito de dados
      setActiveCityId(null);
      setActiveComumId(null);
      localStorage.removeItem('activeCityId');
      localStorage.removeItem('activeComumId');
    }
    if (type === 'city') {
      setActiveCityId(id);
      localStorage.setItem('activeCityId', id);
      // Ao mudar de cidade, resetamos a comum ativa para forçar nova seleção
      setActiveComumId(null);
      localStorage.removeItem('activeComumId');
    }
    if (type === 'comum') {
      setActiveComumId(id);
      localStorage.setItem('activeComumId', id);
    }
  };

  // O que este "Cérebro" vai exportar para o resto do app
  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    setContext, // Permite que o Header mude a visão do Master/Regional
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

// Hook personalizado para facilitar o uso nos componentes (DX - Developer Experience)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve be used within an AuthProvider');
  return context;
};