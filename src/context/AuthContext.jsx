import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, doc, onSnapshot, onAuthStateChanged } from '../config/firebase';

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
    // Monitor de autenticação
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      
      // TRAVA DE SEGURANÇA v2.2: Impede a entrada se o e-mail não estiver verificado
      if (currentUser && !currentUser.emailVerified) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      
      if (currentUser) {
        try {
          // --- SINCRONIZAÇÃO DE CRACHÁ v8.6 (ESTABILIZAÇÃO DE REGRAS) ---
          // Forçamos a renovação para garantir que as Rules v10.3 reconheçam o usuário
          const tokenResult = await currentUser.getIdTokenResult(true);
          const claims = tokenResult.claims;

          const isOwner = currentUser.email === 'victormachadofaustino@gmail.com';

          // REATIVIDADE TOTAL v8.6: Ouvinte do perfil com tratamento de latência de permissão
          const unsubSnap = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              // --- CÉREBRO DE PERMISSÕES HÍBRIDO (Crachá + Banco) ---
              const level = claims.accessLevel || data.accessLevel || 'basico';

              const permissions = {
                isMaster: level === 'master' || isOwner, 
                isComissao: level === 'master' || isOwner || level === 'comissao', 
                isRegionalCidade: level === 'master' || isOwner || level === 'comissao' || level === 'regional_cidade', 
                isGemLocal: level === 'master' || isOwner || level === 'comissao' || level === 'regional_cidade' || level === 'gem_local', 
                isBasico: level === 'basico',
                isAdmin: level !== 'basico' 
              };

              // GPS REATIVO: Sincroniza o que está no banco com o que está selecionado no menu
              const storedReg = localStorage.getItem('activeRegionalId');
              const storedCity = localStorage.getItem('activeCityId');
              const storedComum = localStorage.getItem('activeComumId');

              const validRegionalId = (permissions.isComissao) ? (activeRegionalId || storedReg || data.regionalId) : data.regionalId;
              const validCityId = (permissions.isRegionalCidade) ? (activeCityId || storedCity || data.cidadeId) : data.cidadeId;
              const validComumId = (permissions.isRegionalCidade) ? (activeComumId || storedComum || data.comumId) : data.comumId;

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
            setLoading(false);
          }, (err) => {
            // CORREÇÃO v8.6: Tratamento silencioso para evitar erro fatal no console
            // Se o Firebase Rules barrar temporariamente (latência de propagação), 
            // liberamos um perfil básico seguro para evitar a tela branca.
            if (err.code === 'permission-denied') {
               console.warn("AuthContext: Sincronizando permissões de segurança v10.3...");
               setUserData(prev => prev || { 
                 uid: currentUser.uid, 
                 email: currentUser.email,
                 isBasico: true,
                 pendingSync: true 
               });
            } else {
               console.error("Erro crítico no Snapshot de Perfil:", err);
            }
            setLoading(false);
          });

          return () => unsubSnap();
        } catch (err) {
          console.error("Erro ao processar Claims:", err);
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
  }, [activeRegionalId, activeCityId, activeComumId]); // Adicionado dependências para manter o GPS vivo

  // FUNÇÕES DE COMANDO PARA O GPS (ATUALIZAÇÃO ATÔMICA)
  const setContext = (type, id) => {
    if (type === 'regional') {
      setActiveRegionalId(id);
      if (id) localStorage.setItem('activeRegionalId', id);
      else localStorage.removeItem('activeRegionalId');
      
      setActiveCityId(null);
      setActiveComumId(null);
      localStorage.removeItem('activeCityId');
      localStorage.removeItem('activeComumId');
      setUserData(prev => prev ? { ...prev, activeRegionalId: id, activeCityId: null, activeComumId: null } : null);
    }
    
    if (type === 'city') {
      setActiveCityId(id);
      if (id) localStorage.setItem('activeCityId', id);
      else localStorage.removeItem('activeCityId');
      
      setActiveComumId(null);
      localStorage.removeItem('activeComumId');
      setUserData(prev => prev ? { ...prev, activeCityId: id, activeComumId: null } : null);
    }
    
    if (type === 'comum') {
      setActiveComumId(id);
      if (id) localStorage.setItem('activeComumId', id);
      else localStorage.removeItem('activeComumId');
      setUserData(prev => prev ? { ...prev, activeComumId: id } : null);
    }
  };

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user && user.emailVerified === true && (userData?.approved === true || userData?.isMaster), 
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