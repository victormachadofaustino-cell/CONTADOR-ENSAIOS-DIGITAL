import { useState, useEffect, useMemo } from 'react'
import { 
  auth, db, doc, onSnapshot, collection, query, orderBy, where, onAuthStateChanged 
} from './config/firebase'
import { authService } from './services/authService' 
import { LOCALIDADE_PADRAO } from './config/config'
import toast, { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import DashPage from './pages/dashboard/DashPage'
import SettingsPage from './pages/SettingsPage'
import CounterPage from './pages/events/CounterPage'
import EventsPage from './pages/events/EventsPage' 
import LoginPage from './pages/auth/LoginPage'
import CapaEntrada from './pages/CapaEntrada'
import Header from './components/Header' 
import Tickets from './components/Tickets' 

// Importação do Contexto para unificar a fonte de verdade
import { useAuth } from './context/AuthContext';

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Secretário da Música', 'Secretario da Música'];

function App() {
  // INTEGRAÇÃO: Consumindo o GPS Global diretamente no App
  const { userData: authContextData } = useAuth();
  
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('loading');
  const [showSplash, setShowSplash] = useState(true); 
  const [lobbyTab, setLobbyTab] = useState('ensaios');
  const [currentEventId, setCurrentEventId] = useState(null);
  const [counts, setCounts] = useState({});
  const [direcao, setDirecao] = useState(0);
  const [events, setEvents] = useState([]);

  // Inicialização robusta via localStorage
  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId') || null);
  const [activeComumName, setActiveComumName] = useState(localStorage.getItem('activeComumName') || '');
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId') || null);
  const [activeRegionalName, setActiveRegionalName] = useState(localStorage.getItem('activeRegionalName') || 'Navegar...');

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(''); 
  const [authMode, setAuthMode] = useState('login');
  const [cargosDinamicos, setCargosDinamicos] = useState([]);

  // --- MATRIZ DE COMPETÊNCIAS v2.1 ---
  const level = authContextData?.accessLevel || userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';
  
  const isAdmin = isGemLocal;
  
  const comumIdEfetivo = authContextData?.activeComumId || activeComumId || userData?.comumId;

  const currentEventData = useMemo(() => {
    return events.find(ev => ev.id === currentEventId);
  }, [events, currentEventId]);

  const ORDEM_TABS = useMemo(() => {
    const temAcessoAjustes = isGemLocal; 
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'];
  }, [isGemLocal]);

  useEffect(() => {
    if ((authContextData || userData) && !ORDEM_TABS.includes(lobbyTab)) {
      setLobbyTab('ensaios');
    }
  }, [authContextData, userData, lobbyTab, ORDEM_TABS]);

  const mudarTab = (novaTab) => {
    const idxAntigo = ORDEM_TABS.indexOf(lobbyTab);
    const idxNovo = ORDEM_TABS.indexOf(novaTab);
    if (idxAntigo === idxNovo) return;
    setDirecao(idxNovo > idxAntigo ? 1 : -1);
    setLobbyTab(novaTab);
  };

  // SINCRONIZAÇÃO DE ESTADO COM CONTEXTO (GPS GLOBAL)
  useEffect(() => {
    if (authContextData?.activeComumId) {
      setActiveComumId(authContextData.activeComumId);
      localStorage.setItem('activeComumId', authContextData.activeComumId);
    }
    if (authContextData?.activeComumName) {
      setActiveComumName(authContextData.activeComumName);
      localStorage.setItem('activeComumName', authContextData.activeComumName);
    }
    if (authContextData?.activeRegionalId) {
      setActiveRegionalId(authContextData.activeRegionalId);
      localStorage.setItem('activeRegionalId', authContextData.activeRegionalId);
    }
    if (authContextData?.activeRegionalName) {
      setActiveRegionalName(authContextData.activeRegionalName);
      localStorage.setItem('activeRegionalName', authContextData.activeRegionalName);
    }
  }, [authContextData]);

  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        unsubSnap = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({ ...data, uid: u.uid, id: u.uid });

            const podeNavegar = data.accessLevel === 'master' || data.accessLevel === 'comissao' || data.accessLevel === 'regional_cidade';
            
            if (podeNavegar) {
              const savedComumId = localStorage.getItem('activeComumId');
              const savedComumName = localStorage.getItem('activeComumName');
              const savedRegionalId = localStorage.getItem('activeRegionalId');
              const savedRegionalName = localStorage.getItem('activeRegionalName');

              if (!activeComumId && !savedComumId) {
                setActiveComumId(data.comumId);
                setActiveComumName(data.comum);
              } else if (savedComumId && !activeComumId) {
                setActiveComumId(savedComumId);
                setActiveComumName(savedComumName);
              }

              if (!activeRegionalId && !savedRegionalId) {
                setActiveRegionalId(data.regionalId);
                setActiveRegionalName(data.regionalNome || data.regional);
              } else if (savedRegionalId && !activeRegionalId) {
                setActiveRegionalId(savedRegionalId);
                setActiveRegionalName(savedRegionalName);
              }
            } else {
              setActiveComumId(data.comumId);
              setActiveComumName(data.comum || "Localidade");
              setActiveRegionalId(data.regionalId);
              setActiveRegionalName(data.regionalNome || data.regional || "Regional");
            }
            
            setView(data.approved || data.accessLevel === 'master' ? 'lobby' : 'waiting-approval');
          } else { 
            setView('login'); 
          }
        }, (err) => { 
          console.error("Erro no Snapshot de Usuário:", err);
          setView('login'); 
        });
      } else { 
        if (unsubSnap) unsubSnap();
        setUserData(null);
        setEvents([]); 
        setActiveComumId(null);
        setActiveComumName('');
        setActiveRegionalId(null);
        setActiveRegionalName('Navegar...');
        localStorage.clear();
        setView('login'); 
      }
    });
    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []); 

  useEffect(() => {
    if (!user?.uid || !comumIdEfetivo || !(authContextData || userData)) return;

    setEvents([]); 

    const q = query(
      collection(db, 'events_global'), 
      where('comumId', '==', comumIdEfetivo), 
      orderBy('date', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        comumId: d.data().comumId || comumIdEfetivo 
      }));
      setEvents(data);
    }, (err) => {
      console.warn("Snapshot de eventos finalizado:", err.message);
    });

    return () => unsub();
  }, [comumIdEfetivo, user?.uid, level]); 

  if (view === 'loading') return <div className="h-dvh flex items-center justify-center bg-[#F1F5F9] font-black text-slate-950 animate-pulse uppercase text-[10px]">Sincronizando Jurisdição...</div>;

  return (
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative text-left">
      <Toaster position="top-center" />
      <AnimatePresence>{showSplash && <CapaEntrada aoEntrar={() => setShowSplash(false)} />}</AnimatePresence>

      {view === 'login' ? (
        <LoginPage authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} pass={pass} setPass={setPass} userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole} cargosDinamicos={cargosDinamicos} userData={authContextData || userData} />
      ) : view === 'lobby' ? (
        <>
          <Header userData={authContextData || { ...userData, activeRegionalId, activeRegionalName, isComissao, isRegional: isComissao, isCidade: isRegionalCidade }} 
            onChurchChange={(id, nome) => { 
              setActiveComumId(id); setActiveComumName(nome); 
              localStorage.setItem('activeComumId', id); localStorage.setItem('activeComumName', nome); 
            }}
            onRegionalChange={(id, nome) => { 
              setActiveRegionalId(id); setActiveRegionalName(nome); 
              localStorage.setItem('activeRegionalId', id); localStorage.setItem('activeRegionalName', nome); 
            }}
          />
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direcao}>
              <motion.div key={lobbyTab} custom={direcao} initial={{ opacity: 0, x: direcao * 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direcao * -100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-32 px-4">
                <div className="max-w-md mx-auto">
                  {lobbyTab === 'ensaios' && (
                    <EventsPage 
                      key={comumIdEfetivo || 'default'} 
                      allEvents={events}
                      userData={authContextData || { ...userData, activeCityId: userData?.activeCityId || userData?.cidadeId, activeComumId: activeComumId, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isMaster, isComissao, isCidade: isRegionalCidade }} 
                      isAdmin={isAdmin} 
                      onSelectEvent={(id) => { 
                        setCurrentEventId(id); 
                        setView('app'); 
                      }} 
                      onChurchChange={(id, nome) => {
                        setActiveComumId(id);
                        setActiveComumName(nome);
                        localStorage.setItem('activeComumId', id);
                        localStorage.setItem('activeComumName', nome);
                      }}
                    />
                  )}
                  {lobbyTab === 'dash' && <DashPage userData={authContextData || { ...userData, activeCityId: userData?.activeCityId || userData?.cidadeId, activeComumId: activeComumId, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId }} />}
                  {lobbyTab === 'config' && <SettingsPage />}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
          
          {!showSplash && <Tickets moduloAtual={lobbyTab} />}

          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-950 text-white rounded-[2.2rem] flex justify-around p-1.5 z-50 shadow-2xl border border-white/5">
            {ORDEM_TABS.map(tab => (
              <button key={tab} onClick={() => mudarTab(tab)} className={`relative flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${lobbyTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>
                <span className="text-[9px] font-black uppercase italic tracking-widest">{tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'}</span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <>
          <CounterPage 
            currentEventId={currentEventId} 
            counts={counts} 
            onBack={() => setView('lobby')} 
            isAdmin={isAdmin} 
            isMaster={isMaster} 
            userData={authContextData || { 
              ...userData, 
              comumId: currentEventData?.comumId || comumIdEfetivo, 
              comum: activeComumName, 
              activeRegionalId, 
              activeRegionalName, 
              regionalId: activeRegionalId, 
              isBasico, isAdmin, isRegional: isComissao, isComissao, isCidade: isRegionalCidade 
            }} 
            allEvents={events} 
          />
          {!showSplash && <Tickets moduloAtual="contador" />}
        </>
      )}
    </div>
  );
}

export default App;