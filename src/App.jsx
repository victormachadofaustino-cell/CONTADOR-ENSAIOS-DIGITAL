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

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Secretário da Música', 'Secretario da Música'];

function App() {
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

  // --- MATRIZ DE COMPETÊNCIAS v2.1 (CONEXÃO DIRETA COM ACCESSLEVEL) ---
  const level = userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';
  
  // isAdmin aqui unifica quem pode operar funções administrativas básicas
  const isAdmin = isGemLocal;
  
  const comumIdEfetivo = activeComumId || userData?.comumId;

  // Trava de abas permitidas - CORRIGIDO PARA v2.1
  const ORDEM_TABS = useMemo(() => {
    // Agora olha para isGemLocal, garantindo que o Victor MG veja a aba 'config'
    const temAcessoAjustes = isGemLocal; 
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'];
  }, [isGemLocal]);

  // Monitor de segurança para redirecionamento de aba ilegal
  useEffect(() => {
    if (userData && !ORDEM_TABS.includes(lobbyTab)) {
      setLobbyTab('ensaios');
    }
  }, [userData, lobbyTab, ORDEM_TABS]);

  const mudarTab = (novaTab) => {
    const idxAntigo = ORDEM_TABS.indexOf(lobbyTab);
    const idxNovo = ORDEM_TABS.indexOf(novaTab);
    if (idxAntigo === idxNovo) return;
    setDirecao(idxNovo > idxAntigo ? 1 : -1);
    setLobbyTab(novaTab);
  };

  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        unsubSnap = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({ ...data, uid: u.uid, id: u.uid });

            // Inicialização de Contexto Inteligente v2.1
            const podeNavegar = data.accessLevel === 'master' || data.accessLevel === 'comissao' || data.accessLevel === 'regional_cidade';
            
            if (podeNavegar) {
              const savedComumId = localStorage.getItem('activeComumId');
              const savedComumName = localStorage.getItem('activeComumName');
              const savedRegionalId = localStorage.getItem('activeRegionalId');
              const savedRegionalName = localStorage.getItem('activeRegionalName');

              if (savedComumId) {
                setActiveComumId(savedComumId);
                setActiveComumName(savedComumName);
              } else {
                setActiveComumId(data.comumId);
                setActiveComumName(data.comum);
              }

              if (savedRegionalId) {
                setActiveRegionalId(savedRegionalId);
                setActiveRegionalName(savedRegionalName);
              } else {
                setActiveRegionalId(data.regionalId);
                setActiveRegionalName(data.regionalNome || data.regional);
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
        setView('login'); 
      }
    });
    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []);

  useEffect(() => {
    if (!comumIdEfetivo || !activeRegionalId) return;
    
    const q = query(collection(db, 'comuns', comumIdEfetivo, 'events'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const todosEventos = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        comumId: comumIdEfetivo,
        regionalId: d.data().regionalId || activeRegionalId 
      }));
      
      setEvents(todosEventos.filter(ev => ev.regionalId === activeRegionalId || !ev.regionalId));
      
      if (currentEventId) {
        const currentData = todosEventos.find(ev => ev.id === currentEventId);
        if (currentData) setCounts(currentData.counts || {});
      }
    }, (err) => {
      console.error("Erro ao carregar eventos:", err);
    });
    return () => unsub();
  }, [comumIdEfetivo, activeRegionalId, currentEventId]);

  if (view === 'loading') return <div className="h-dvh flex items-center justify-center bg-[#F1F5F9] font-black text-slate-950 animate-pulse uppercase text-[10px]">Sincronizando Jurisdição...</div>;

  return (
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative text-left">
      <Toaster position="top-center" />
      <AnimatePresence>{showSplash && <CapaEntrada aoEntrar={() => setShowSplash(false)} />}</AnimatePresence>

      {view === 'login' ? (
        <LoginPage authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} pass={pass} setPass={setPass} userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole} cargosDinamicos={cargosDinamicos} />
      ) : view === 'lobby' ? (
        <>
          <Header userData={{ ...userData, activeRegionalId, activeRegionalName, isComissao, isRegional: isComissao, isCidade: isRegionalCidade }} 
            onChurchChange={(id, nome) => { 
              setActiveComumId(id); 
              setActiveComumName(nome); 
              localStorage.setItem('activeComumId', id); 
              localStorage.setItem('activeComumName', nome); 
            }}
            onRegionalChange={(id, nome) => { 
              setActiveRegionalId(id); 
              setActiveRegionalName(nome); 
              localStorage.setItem('activeRegionalId', id); 
              localStorage.setItem('activeRegionalName', nome); 
            }}
          />
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direcao}>
              <motion.div key={lobbyTab} custom={direcao} initial={{ opacity: 0, x: direcao * 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direcao * -100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-32 px-4">
                <div className="max-w-md mx-auto">
                  {lobbyTab === 'ensaios' && (
                    <EventsPage 
                      userData={{ ...userData, activeCityId: activeComumId, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isMaster, isComissao, isCidade: isRegionalCidade }} 
                      isAdmin={isAdmin} 
                      onSelectEvent={(id) => { 
                        const eventObj = events.find(ev => ev.id === id);
                        if (eventObj && isRegionalCidade) {
                          setActiveComumId(eventObj.comumId);
                          setActiveComumName(eventObj.comum || "Localidade");
                          localStorage.setItem('activeComumId', eventObj.comumId);
                          localStorage.setItem('activeComumName', eventObj.comum || "Localidade");
                        }
                        setCurrentEventId(id); 
                        setView('app'); 
                      }} 
                    />
                  )}
                  {lobbyTab === 'dash' && <DashPage userData={{ ...userData, activeCityId: activeComumId, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId }} />}
                  {lobbyTab === 'config' && <SettingsPage userData={{ ...userData, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isComissao, comumId: comumIdEfetivo, isRegional: isComissao, isCidade: isRegionalCidade, isGemLocal }} />}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-950 text-white rounded-[2.2rem] flex justify-around p-1.5 z-50 shadow-2xl border border-white/5">
            {ORDEM_TABS.map(tab => (
              <button key={tab} onClick={() => mudarTab(tab)} className={`relative flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${lobbyTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>
                <span className="text-[9px] font-black uppercase italic tracking-widest">{tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'}</span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <CounterPage currentEventId={currentEventId} counts={counts} onBack={() => setView('lobby')} isAdmin={isAdmin} isMaster={isMaster} userData={{ ...userData, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isBasico, isAdmin, isRegional: isComissao, isComissao, isCidade: isRegionalCidade }} allEvents={events} />
      )}
    </div>
  );
}

export default App;