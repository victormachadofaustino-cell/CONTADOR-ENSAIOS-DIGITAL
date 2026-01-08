import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  auth, db, doc, onSnapshot, collection, query, orderBy, where, onAuthStateChanged 
} from './firebase'
import { authService } from './services/authService' 
import { LOCALIDADE_PADRAO } from './config'
import toast, { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MapPin, Check } from 'lucide-react' // Ícones para o seletor

import DashPage from './pages/DashPage'
import SettingsPage from './pages/SettingsPage'
import CounterPage from './pages/CounterPage'
import EventsPage from './pages/EventsPage' 
import LoginPage from './pages/LoginPage'

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Instrutor', 'Secretário da Música', 'Examinadora'];

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('loading');
  const [lobbyTab, setLobbyTab] = useState('ensaios');
  const [currentEventId, setCurrentEventId] = useState(null);
  const [counts, setCounts] = useState({});
  const [direcao, setDirecao] = useState(0);
  const [events, setEvents] = useState([]); 

  // ESTADOS PARA MULTI-IGREJA
  const [showIgrejaSelector, setShowIgrejaSelector] = useState(false);
  const [listaIgrejas, setListaIgrejas] = useState([]);
  const [activeComumId, setActiveComumId] = useState(null);
  const [activeComumName, setActiveComumName] = useState('');

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(''); 
  const [userComum, setUserComum] = useState(LOCALIDADE_PADRAO); 
  const [authMode, setAuthMode] = useState('login');

  const [cargosDinamicos, setCargosDinamicos] = useState([]);
  const [pendentesCount, setPendentesCount] = useState(0);

  const isMaster = userData?.isMaster === true;
  const isAdmin = isMaster || CARGOS_ADMIN.includes(userData?.role);
  
  // A Comum ID agora é dinâmica para o Master
  const comumId = isMaster ? (activeComumId || userData?.comumId) : userData?.comumId;

  const ORDEM_TABS = useMemo(() => isMaster ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'], [isMaster]);

  const mudarTab = (novaTab) => {
    const idxAntigo = ORDEM_TABS.indexOf(lobbyTab);
    const idxNovo = ORDEM_TABS.indexOf(novaTab);
    if (idxAntigo === idxNovo) return;
    setDirecao(idxNovo > idxAntigo ? 1 : -1);
    setLobbyTab(novaTab);
  };

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    const indexAtual = ORDEM_TABS.indexOf(lobbyTab);
    if (info.offset.x < -threshold && indexAtual < ORDEM_TABS.length - 1) {
      mudarTab(ORDEM_TABS[indexAtual + 1]);
    } else if (info.offset.x > threshold && indexAtual > 0) {
      mudarTab(ORDEM_TABS[indexAtual - 1]);
    }
  };

  const handleNavigateEvent = (direction) => {
    const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));
    const currentIndex = sortedEvents.findIndex(ev => ev.id === currentEventId);
    if (direction === 'next' && currentIndex > 0) {
      setCurrentEventId(sortedEvents[currentIndex - 1].id);
      toast.success("Próximo Ensaio");
    } else if (direction === 'prev' && currentIndex < sortedEvents.length - 1) {
      setCurrentEventId(sortedEvents[currentIndex + 1].id);
      toast.success("Ensaio Anterior");
    }
  };

  // 1. MONITOR DE AUTENTICAÇÃO COM TRAVA DE LOOPING E PERSISTÊNCIA DE CONTEXTO
  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        // Monitora o documento do usuário com tratamento de erro
        unsubSnap = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);

            // Persistência Inteligente de Localidade para o Master
            const savedId = localStorage.getItem('activeComumId');
            const savedName = localStorage.getItem('activeComumName');

            if (data.isMaster && savedId) {
              setActiveComumId(savedId);
              setActiveComumName(savedName);
            } else {
              setActiveComumId(data.comumId);
              setActiveComumName(data.comum);
            }

            setView(data.approved || data.isMaster ? 'lobby' : 'waiting-approval');
          } else { 
            setView('login'); 
            console.warn("Usuário sem documento no Firestore.");
          }
        }, (err) => {
          console.error("Erro de permissão ou snapshot:", err);
          setView('login');
        });
      } else { 
        if (unsubSnap) unsubSnap();
        setUserData(null);
        setView('login'); 
      }
    });

    // Safety Timeout: Se em 8 segundos não carregar, força login para quebrar o loop
    const timer = setTimeout(() => {
      if (view === 'loading') {
        setView('login');
        toast.error("Sincronização lenta. Tente novamente.");
      }
    }, 8000);

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
      clearTimeout(timer);
    };
  }, []);

  // 2. MONITOR GLOBAL DE IGREJAS (EXCLUSIVO MASTER)
  useEffect(() => {
    if (!isMaster) return;
    const q = query(collection(db, 'config_comum'));
    return onSnapshot(q, (s) => {
      setListaIgrejas(s.docs.map(d => ({ id: d.id, nome: d.data().nome || d.data().comum || d.id })));
    }, (err) => console.log("Aguardando permissão Master para igrejas..."));
  }, [isMaster]);

  // 3. MONITOR DE EVENTOS (DINÂMICO POR COMUM)
  useEffect(() => {
    if (!comumId) return;
    const q = query(collection(db, 'comuns', comumId, 'events'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.log("Aguardando sincronização de eventos..."));
  }, [comumId]);

  // 4. MONITOR DE CONTAGEM (DINÂMICO POR COMUM)
  useEffect(() => {
    if (view !== 'app' || !currentEventId || !comumId) return;
    return onSnapshot(doc(db, 'comuns', comumId, 'events', currentEventId), (s) => {
      if (s.exists()) setCounts(s.data().counts || {});
    }, (err) => console.log("Erro ao carregar contagem tempo real."));
  }, [view, currentEventId, comumId]);

  useEffect(() => {
    if (!user) return;
    const qCargos = query(collection(db, 'config_cargos'), orderBy('cargo', 'asc'));
    const unsubCargos = onSnapshot(qCargos, (s) => {
      const lista = s.docs.map(d => d.data().cargo);
      setCargosDinamicos(lista);
    });

    let unsubPendentes = () => {};
    if (isMaster) {
      const qP = query(collection(db, 'users'), where('approved', '==', false));
      unsubPendentes = onSnapshot(qP, (s) => setPendentesCount(s.docs.length));
    }
    return () => { unsubCargos(); unsubPendentes(); };
  }, [user, isMaster]);

  if (view === 'loading') return <div className="h-dvh flex items-center justify-center bg-[#F1F5F9] font-black italic text-slate-950 animate-pulse uppercase">Sincronizando...</div>;

  if (view === 'login') return (
    <LoginPage 
      authMode={authMode} setAuthMode={setAuthMode}
      email={email} setEmail={setEmail}
      pass={pass} setPass={setPass}
      userName={userName} setUserName={setUserName}
      userRole={userRole} setUserRole={setUserRole}
      userComum={userComum} setUserComum={setUserComum}
      cargosDinamicos={cargosDinamicos}
    />
  );

  return (
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative">
      <Toaster position="top-center" />
      
      {view === 'lobby' ? (
        <>
          <header className="bg-white pt-6 pb-6 px-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-200 z-50">
            <div className="flex justify-between items-center max-w-md mx-auto w-full">
              <div 
                className={`text-left leading-none ${isMaster ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
                onClick={() => isMaster && setShowIgrejaSelector(true)}
              >
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 flex items-center gap-1">
                  Localidade Ativa {isMaster && <ChevronDown size={8} />}
                </p>
                <h1 className="text-lg font-[900] text-slate-950 uppercase italic tracking-tighter">
                  {isMaster ? activeComumName : (userData?.comum || LOCALIDADE_PADRAO)}
                </h1>
              </div>
              <button onClick={() => authService.logout()} className="bg-red-50 text-red-500 p-2.5 rounded-xl text-[8px] font-black uppercase italic tracking-widest">Sair</button>
            </div>
          </header>
          
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direcao}>
              <motion.div 
                key={lobbyTab}
                custom={direcao}
                initial={{ opacity: 0, x: direcao * 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direcao * -100 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-32 px-4"
              >
                <div className="max-w-md mx-auto">
                  {lobbyTab === 'ensaios' && <EventsPage userData={{...userData, comumId, comum: activeComumName}} isAdmin={isAdmin} onSelectEvent={(id) => { setCurrentEventId(id); setView('app'); }} />}
                  {lobbyTab === 'dash' && <DashPage userData={{...userData, comumId, comum: activeComumName}} />} 
                  {lobbyTab === 'config' && <SettingsPage userEmail={user?.email} isMaster={isMaster} userData={userData} />}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>

          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-950 text-white rounded-[2.2rem] flex justify-around p-1.5 z-50 shadow-2xl border border-white/5">
            {ORDEM_TABS.map(tab => (
              <button key={tab} onClick={() => mudarTab(tab)} className={`flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${lobbyTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>
                {tab === 'config' && pendentesCount > 0 && <span className="absolute top-1 right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] text-white border-2 border-slate-950 animate-bounce font-black">{pendentesCount}</span>}
                <span className="text-[9px] font-black uppercase italic tracking-widest">{tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'}</span>
              </button>
            ))}
          </nav>

          {/* MODAL SELETOR DE IGREJAS (MASTER ONLY) */}
          <AnimatePresence>
            {showIgrejaSelector && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-end justify-center"
                onClick={() => setShowIgrejaSelector(false)}
              >
                <motion.div 
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                  <h3 className="text-sm font-black text-slate-950 uppercase italic mb-6 text-center tracking-widest">Alternar Ambiente</h3>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {listaIgrejas.map((igreja) => (
                      <button 
                        key={igreja.id}
                        onClick={() => {
                          setActiveComumId(igreja.id);
                          setActiveComumName(igreja.nome);
                          localStorage.setItem('activeComumId', igreja.id);
                          localStorage.setItem('activeComumName', igreja.nome);
                          setShowIgrejaSelector(false);
                          toast.success(`Ambiente: ${igreja.nome}`);
                        }}
                        className={`w-full p-5 rounded-[1.8rem] flex justify-between items-center transition-all ${comumId === igreja.id ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin size={14} className={comumId === igreja.id ? 'text-blue-400' : 'text-slate-300'} />
                          <span className="text-[10px] font-black uppercase italic">{igreja.nome}</span>
                        </div>
                        {comumId === igreja.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <CounterPage 
          currentEventId={currentEventId} 
          counts={counts} 
          onBack={() => setView('lobby')} 
          isAdmin={isAdmin} 
          isMaster={isMaster} 
          userData={{...userData, comumId, comum: activeComumName}}
          allEvents={events}
          onNavigateEvent={handleNavigateEvent}
        />
      )}
    </div>
  );
}

export default App;