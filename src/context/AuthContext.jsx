import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, doc, getDoc, onAuthStateChanged } from '../config/firebase';

// Criação do Contexto (O reservatório de dados)
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Usuário do Firebase Auth
  const [userData, setUserData] = useState(null); // Dados do perfil no Firestore
  const [loading, setLoading] = useState(true); // Trava o app enquanto carrega os poderes

  // ESTADOS REATIVOS DE NAVEGAÇÃO (O GPS do Master/Regional)
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId'));
  const [activeCityId, setActiveCityId] = useState(localStorage.getItem('activeCityId'));
  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId'));

  useEffect(() => {
    // Fica ouvindo se o usuário está logado ou não
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      
      // TRAVA DE SEGURANÇA v2.2: Impede a entrada reativa se o e-mail não estiver verificado
      if (currentUser && !currentUser.emailVerified) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      
      if (currentUser) {
        try {
          // --- EXTRAÇÃO DO CRACHÁ (Custom Claims) ---
          // SINCRONIZAÇÃO v5.0: Forçamos a renovação do token para que o Firebase Rules 
          // leia o nível de acesso mais atualizado do banco.
          await currentUser.getIdToken(true);
          const tokenResult = await currentUser.getIdTokenResult();
          const claims = tokenResult.claims;

          // Se o e-mail logado for o seu, garantimos Master via Token
          const isOwner = currentUser.email === 'victormachadofaustino@gmail.com';

          // ECONOMIA DE COTA v7.0: Substituído onSnapshot por getDoc (Leitura Única)
          // Isso evita que o app consuma cota de leitura a cada segundo enquanto está aberto.
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid));

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // --- CÉREBRO DE PERMISSÕES HÍBRIDO (Crachá + Banco) ---
            // Prioriza o AccessLevel do Token (Seguro) ou o do Banco (Reativo)
            const level = claims.accessLevel || data.accessLevel || 'basico';

            const permissions = {
              isMaster: level === 'master' || isOwner, 
              isComissao: level === 'master' || isOwner || level === 'comissao', 
              isRegionalCidade: level === 'master' || isOwner || level === 'comissao' || level === 'regional_cidade', 
              isGemLocal: level === 'master' || isOwner || level === 'comissao' || level === 'regional_cidade' || level === 'gem_local', 
              isBasico: level === 'basico',
              isAdmin: level !== 'basico' 
            };

            // TRAVA DE SEGURANÇA MULTITENANCY (GPS CORRIGIDO)
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
              activeComumId: validComumId,
              emailVerified: currentUser.emailVerified 
            });
          }
        } catch (err) {
          console.error("Erro ao carregar perfil do usuário:", err);
        } finally {
          setLoading(false);
        }
      } else {
        // --- LIMPEZA DE SEGURANÇA NO LOGOUT ---
        setUserData(null);
        
        setActiveRegionalId(null);
        setActiveCityId(null);
        setActiveComumId(null);

        localStorage.removeItem('activeRegionalId');
        localStorage.removeItem('activeCityId');
        localStorage.removeItem('activeComumId');

        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []); // Dependências limpas para evitar loops de leitura

  // FUNÇÕES DE COMANDO
  const setContext = (type, id) => {
    if (type === 'regional') {
      setActiveRegionalId(id);
      if (id) {
        localStorage.setItem('activeRegionalId', id);
        setUserData(prev => ({ ...prev, activeRegionalId: id, activeCityId: null, activeComumId: null }));
      } else {
        localStorage.removeItem('activeRegionalId');
      }
      
      setActiveCityId(null);
      setActiveComumId(null);
      localStorage.removeItem('activeCityId');
      localStorage.removeItem('activeComumId');
    }
    
    if (type === 'city') {
      setActiveCityId(id);
      if (id) {
        localStorage.setItem('activeCityId', id);
        setUserData(prev => ({ ...prev, activeCityId: id, activeComumId: null }));
      } else {
        localStorage.removeItem('activeCityId');
      }
      
      setActiveComumId(null);
      localStorage.removeItem('activeComumId');
    }
    
    if (type === 'comum') {
      setActiveComumId(id);
      if (id) {
        localStorage.setItem('activeComumId', id);
        setUserData(prev => ({ ...prev, activeComumId: id }));
      } else {
        localStorage.removeItem('activeComumId');
      }
    }
  };

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user && user.emailVerified === true && userData?.approved === true, 
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