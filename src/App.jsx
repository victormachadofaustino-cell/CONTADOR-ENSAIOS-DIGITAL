import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  auth, db, doc, onSnapshot, collection, query, orderBy, where, onAuthStateChanged 
} from './firebase'
import { authService } from './services/authService' 
import { LOCALIDADE_PADRAO } from './config'
import toast, { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import DashPage from './pages/DashPage'
import SettingsPage from './pages/SettingsPage'
import CounterPage from './pages/CounterPage'
import EventsPage from './pages/EventsPage' 
import LoginPage from './pages/LoginPage'
import CapaEntrada from './pages/CapaEntrada'
import Header from './components/Header' 

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Instrutor', 'Secretário da Música', 'Examinadora'];

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

  // ESTADOS DE JURISDIÇÃO (O que as páginas precisam para carregar dados)
  const [activeComumId, setActiveComumId] = useState(null);
  const [activeComumName, setActiveComumName] = useState('');
  
  // ESTADO DE REGIONAL (Cérebro do Contexto Master com IDs Reais)
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId') || '492WNHeLFRRCZRDHoGwN');
  const [activeRegionalName, setActiveRegionalName] = useState(localStorage.getItem('activeRegionalName') || 'Regional Jundiaí');

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
  
  // Define qual comum o app está "olhando" agora
  const comumIdEfetivo = activeComumId || userData?.comumId;

  // REGRA DE SEGURANÇA: Nível de acesso "Cidade para cima" para extrações e relatórios
  const canAdminReport = userData?.escopoRegional || userData?.isMaster || userData?.escopoCidade;

  const ORDEM_TABS = useMemo(() => {
    const temAcessoAjustes = isMaster || userData?.escopoRegional || userData?.escopoCidade || userData?.escopoLocal;
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'];
  }, [isMaster, userData]);

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
    } else if (direction === 'prev' && currentIndex < sortedEvents.length - 1) {
      setCurrentEventId(sortedEvents[currentIndex + 1].id);
    }
  };

  // 1. MONITOR DE AUTENTICAÇÃO (Sincronização de Identidade Corrigida)
  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        unsubSnap = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // GARANTIA DE IDENTIDADE: Injeta o UID real do login nos campos de ID do estado
            const userWithId = { ...data, uid: u.uid, id: u.uid };
            setUserData(userWithId);

            // REGRA: Prioriza sempre os dados cadastrados no perfil para abrir na sua própria localidade
            const initialComumId = data.comumId || localStorage.getItem('activeComumId');
            const initialComumName = data.comum || localStorage.getItem('activeComumName');
            const initialRegionalId = data.regionalId || localStorage.getItem('activeRegionalId');

            if (data.isMaster && localStorage.getItem('activeComumId')) {
              // Se for Master, mantém a navegação livre anterior
              setActiveComumId(localStorage.getItem('activeComumId'));
              setActiveComumName(localStorage.getItem('activeComumName'));
            } else {
              // Usuário comum sempre abre no dele
              setActiveComumId(initialComumId);
              setActiveComumName(initialComumName);
              if (initialRegionalId) setActiveRegionalId(initialRegionalId);
            }

            setView(data.approved || data.isMaster ? 'lobby' : 'waiting-approval');
          } else { 
            setView('login'); 
          }
        });
      } else { 
        if (unsubSnap) unsubSnap();
        setUserData(null);
        setView('login'); 
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  // 2. MONITOR DE EVENTOS (Resiliente: Filtra no Front para garantir histórico e evitar erro de índice)
  useEffect(() => {
    if (!comumIdEfetivo) return;
    
    const q = query(
      collection(db, 'comuns', comumIdEfetivo, 'events'), 
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const todosEventos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const filtrados = todosEventos.filter(ev => {
        return ev.regionalId === activeRegionalId || 
               ev.regionalId === "JUNDIAÍ" || 
               ev.regionalId === "regional_jundiai" ||
               !ev.regionalId; 
      });

      setEvents(filtrados);
    });
  }, [comumIdEfetivo, activeRegionalId]);

  // 3. MONITOR DE CONTAGEM
  useEffect(() => {
    if (view !== 'app' || !currentEventId || !comumIdEfetivo) return;
    return onSnapshot(doc(db, 'comuns', comumIdEfetivo, 'events', currentEventId), (s) => {
      if (s.exists()) setCounts(s.data().counts || {});
    });
  }, [view, currentEventId, comumIdEfetivo]);

  // 4. MONITOR DE CARGOS E PENDÊNCIAS
  useEffect(() => {
    if (!user) return;
    const qCargos = query(collection(db, 'config_cargos'), orderBy('cargo', 'asc'));
    const unsubCargos = onSnapshot(qCargos, (s) => {
      setCargosDinamicos(s.docs.map(d => d.data().cargo));
    });

    let unsubPendentes = () => {};
    if (isMaster || userData?.escopoRegional || userData?.escopoCidade) {
      const qP = query(collection(db, 'users'), where('approved', '==', false));
      unsubPendentes = onSnapshot(qP, (s) => {
        const list = s.docs.filter(d => d.data().regionalId === activeRegionalId);
        setPendentesCount(list.length);
      });
    }
    return () => { unsubCargos(); unsubPendentes(); };
  }, [user, isMaster, userData, activeRegionalId]);

  const handleEntrar = () => {
    setShowSplash(false);
  };

  if (view === 'loading') return <div className="h-dvh flex items-center justify-center bg-[#F1F5F9] font-black italic text-slate-950 animate-pulse uppercase tracking-[0.3em]">Sincronizando...</div>;

  return (
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative text-left">
      <Toaster position="top-center" />
      
      <AnimatePresence>
        {showSplash && <CapaEntrada aoEntrar={handleEntrar} />}
      </AnimatePresence>

      {view === 'login' ? (
        <LoginPage 
          authMode={authMode} setAuthMode={setAuthMode}
          email={email} setEmail={setEmail}
          pass={pass} setPass={setPass}
          userName={userName} setUserName={setUserName}
          userRole={userRole} setUserRole={setUserRole}
          userComum={userComum} setUserComum={setUserComum}
          cargosDinamicos={cargosDinamicos}
        />
      ) : view === 'lobby' ? (
        <>
          <Header 
            userData={{
              ...userData, 
              comumId: comumIdEfetivo, 
              comum: activeComumName,
              activeRegionalId,
              activeRegionalName
            }} 
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
               toast.success(`Contexto: ${nome}`);
            }}
          />
          
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
                  {lobbyTab === 'ensaios' && (
                    <EventsPage 
                      userData={{
                        ...userData, 
                        comumId: comumIdEfetivo, 
                        comum: activeComumName, 
                        activeRegionalId,
                        activeRegionalName,
                        regionalId: activeRegionalId
                      }} 
                      isAdmin={isAdmin} 
                      onSelectEvent={(id) => { setCurrentEventId(id); setView('app'); }} 
                    />
                  )}
                  {lobbyTab === 'dash' && (
                    <DashPage userData={{
                      ...userData, 
                      comumId: comumIdEfetivo, 
                      comum: activeComumName, 
                      activeRegionalId,
                      activeRegionalName,
                      regionalId: activeRegionalId
                    }} />
                  )} 
                  {lobbyTab === 'config' && (
                    <SettingsPage 
                      userEmail={user?.email} 
                      isMaster={isMaster} 
                      userData={{
                        ...userData, 
                        activeRegionalId, 
                        activeRegionalName,
                        regionalId: activeRegionalId
                      }} 
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>

          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-950 text-white rounded-[2.2rem] flex justify-around p-1.5 z-50 shadow-2xl border border-white/5">
            {ORDEM_TABS.map(tab => (
              <button key={tab} onClick={() => mudarTab(tab)} className={`relative flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${lobbyTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>
                {tab === 'config' && pendentesCount > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] text-white border-2 border-slate-950 animate-bounce font-black">
                    {pendentesCount}
                  </span>
                )}
                <span className="text-[9px] font-black uppercase italic tracking-widest">
                  {tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'}
                </span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <CounterPage 
          currentEventId={currentEventId} 
          counts={counts} 
          onBack={() => setView('lobby')} 
          isAdmin={isAdmin} 
          isMaster={isMaster} 
          userData={{
            ...userData, 
            comumId: comumIdEfetivo, 
            comum: activeComumName, 
            activeRegionalId,
            activeRegionalName,
            regionalId: activeRegionalId,
            canAdminReport // INJEÇÃO DA REGRA DE EXTRAÇÃO (Cidade p/ cima)
          }}
          allEvents={events}
          onNavigateEvent={handleNavigateEvent}
        />
      )}
    </div>
  );
}

export default App;