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

  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId'));
  const [activeComumName, setActiveComumName] = useState(localStorage.getItem('activeComumName') || '');
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId'));
  const [activeRegionalName, setActiveRegionalName] = useState(localStorage.getItem('activeRegionalName') || 'Selecionar Regional');

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(''); 
  const [authMode, setAuthMode] = useState('login');
  const [cargosDinamicos, setCargosDinamicos] = useState([]);

  // --- PREMISSAS DE ACESSO REFINADAS ---
  const isMaster = userData?.isMaster === true;
  // Ajuste para Comissão e Cidade também navegarem livremente
  const isRegional = isMaster || userData?.escopoRegional === true || userData?.role === 'Encarregado Regional';
  const isComissao = isMaster || (userData?.escopoRegional && userData?.isComissao);
  const isCidade = isComissao || userData?.escopoCidade;
  const isLocal = isCidade || userData?.escopoLocal;
  const isBasico = userData?.role === 'Músico' || userData?.role === 'Organista';
  
  // CORREÇÃO: isAdmin agora valida corretamente o cargo e o escopo local
  const isAdmin = isMaster || CARGOS_ADMIN.includes(userData?.role) || userData?.escopoLocal === true;
  
  // CORREÇÃO MESTRA: O ID efetivo agora serve para Master, Comissão e Cidade
  const comumIdEfetivo = activeComumId || userData?.comumId;

  // Trava de abas permitidas
  const ORDEM_TABS = useMemo(() => {
    const temAcessoAjustes = isMaster || userData?.escopoRegional || userData?.escopoCidade || userData?.escopoLocal;
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'];
  }, [isMaster, userData]);

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

            // Inicialização de Contexto para Master, Comissão e Cidade
            const podeNavegar = data.isMaster || data.escopoRegional || data.escopoCidade || data.role === 'Encarregado Regional';
            
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
                setActiveRegionalName(data.regional);
              }
            } else {
              setActiveComumId(data.comumId);
              setActiveComumName(data.comum || "Vila Rui Barbosa");
              setActiveRegionalId(data.regionalId);
              setActiveRegionalName(data.regional || "Regional Jundiaí");
            }
            
            setView(data.approved || data.isMaster ? 'lobby' : 'waiting-approval');
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
    
    // Query blindada para o Multitenancy Hierárquico
    const q = query(collection(db, 'comuns', comumIdEfetivo, 'events'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const todosEventos = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        comumId: comumIdEfetivo,
        regionalId: d.data().regionalId || activeRegionalId // Garante regionalId para compatibilidade
      }));
      
      setEvents(todosEventos.filter(ev => ev.regionalId === activeRegionalId || !ev.regionalId));
      
      if (currentEventId) {
        const currentData = todosEventos.find(ev => ev.id === currentEventId);
        if (currentData) setCounts(currentData.counts || {});
      }
    }, (err) => {
      console.error("Erro ao carregar eventos:", err);
      if (err.code === 'permission-denied') {
        toast.error("Sincronizando permissões de acesso...");
      }
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
          <Header userData={{ ...userData, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, isComissao, isRegional, isCidade }} 
            onChurchChange={(id, nome) => { setActiveComumId(id); setActiveComumName(nome); localStorage.setItem('activeComumId', id); localStorage.setItem('activeComumName', nome); }}
            onRegionalChange={(id, nome) => { setActiveRegionalId(id); setActiveRegionalName(nome); localStorage.setItem('activeRegionalId', id); localStorage.setItem('activeRegionalName', nome); }}
          />
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direcao}>
              <motion.div key={lobbyTab} custom={direcao} initial={{ opacity: 0, x: direcao * 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direcao * -100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-32 px-4">
                <div className="max-w-md mx-auto">
                  {lobbyTab === 'ensaios' && (
                    <EventsPage 
                      userData={{ ...userData, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isMaster, isComissao, isCidade }} 
                      isAdmin={isAdmin} 
                      onSelectEvent={(id) => { 
                        // CORREÇÃO MESTRA: Garante a troca de igreja ANTES de mudar a tela.
                        // Isso mata o erro de "Evento não localizado" ao sincronizar o GPS com o banco.
                        const eventObj = events.find(ev => ev.id === id);
                        if (eventObj && (isMaster || isComissao || isCidade)) {
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
                  {lobbyTab === 'dash' && <DashPage userData={{ ...userData, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId }} />}
                  {lobbyTab === 'config' && <SettingsPage userEmail={user?.email} isMaster={isMaster} userData={{ ...userData, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isComissao, comumId: comumIdEfetivo, isRegional, isCidade }} />}
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
        <CounterPage currentEventId={currentEventId} counts={counts} onBack={() => setView('lobby')} isAdmin={isAdmin} isMaster={isMaster} userData={{ ...userData, comumId: comumIdEfetivo, comum: activeComumName, activeRegionalId, activeRegionalName, regionalId: activeRegionalId, isBasico, isAdmin, isRegional, isComissao, isCidade }} allEvents={events} />
      )}
    </div>
  );
}

export default App;