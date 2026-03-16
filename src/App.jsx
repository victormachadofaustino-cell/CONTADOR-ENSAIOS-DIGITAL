import { useState, useEffect, useMemo } from 'react' // Importa as ferramentas para criar estados e memórias na tela.
import { // Importa as ferramentas de conexão com o banco de dados Firebase.
  auth, db, doc, onSnapshot, collection, query, orderBy, where, onAuthStateChanged 
} from './config/firebase'
import { authService } from './services/authService' // Importa o serviço de login e logout.
import { LOCALIDADE_PADRAO } from './config/config' // Importa as configurações iniciais do sistema.
import toast, { Toaster } from 'react-hot-toast' // Ferramenta para mostrar avisos flutuantes na tela.
import { motion, AnimatePresence } from 'framer-motion' // Ferramenta para criar as animações de troca de tela.

import DashPage from './pages/dashboard/DashPage' // Página de gráficos e resumos.
import SettingsPage from './pages/SettingsPage' // Página de configurações e zeladoria.
import CounterPage from './pages/events/CounterPage' // Página do contador de presença (o coração do app).
import EventsPage from './pages/events/EventsPage' // Página que lista os ensaios e cultos.
import LoginPage from './pages/auth/LoginPage' // Página de entrada e cadastro.
import CapaEntrada from './pages/CapaEntrada' // A tela de abertura (Splash Screen).
import Header from './components/Header' // O topo do aplicativo.
import Tickets from './components/Tickets' // O sistema de chamados e suporte.

import { useAuth } from './context/AuthContext'; // Importa o "Cérebro Central" que unifica todo o sistema.

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Secretário da Música', 'Secretario da Música']; // Lista de cargos com poder administrativo.

function App() { // Início do componente principal do aplicativo.
  const { userData: authContextData, loading: authContextLoading, setContext } = useAuth(); // Conecta o App ao Cérebro Central e pega a função de mudar o GPS (setContext).
  
  const [user, setUser] = useState(null); // Guarda se o usuário está "com a chave na mão" (autenticado).
  const [userData, setUserData] = useState(null); // Guarda os dados do perfil (nome, cargo, regional).
  const [view, setView] = useState('loading'); // Controla qual tela principal o usuário está vendo agora.
  const [showSplash, setShowSplash] = useState(true); // Controla se a tela de abertura deve aparecer.
  const [lobbyTab, setLobbyTab] = useState(localStorage.getItem('lastTab') || 'ensaios'); // Guarda em qual aba (Ensaios/Geral/Ajustes) você parou.
  const [currentEventId, setCurrentEventId] = useState(localStorage.getItem('lastEventId') || null); // Guarda qual ensaio você está contando agora.
  const [counts, setCounts] = useState({}); // Guarda os números da contagem atual.
  const [direcao, setDirecao] = useState(0); // Controla para qual lado a tela desliza na animação.
  const [events, setEvents] = useState([]); // Guarda a lista de todos os ensaios carregados do banco.

  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId') || null); // Guarda o ID da igreja que você está visualizando.
  const [activeComumName, setActiveComumName] = useState(localStorage.getItem('activeComumName') || ''); // Guarda o nome da igreja atual.
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId') || null); // Guarda o ID da região ativa.
  const [activeRegionalName, setActiveRegionalName] = useState(localStorage.getItem('activeRegionalName') || 'Navegar...'); // Nome da região no topo.

  const [email, setEmail] = useState(''); // Campo de texto para o e-mail no login.
  const [pass, setPass] = useState(''); // Campo de texto para a senha no login.
  const [userName, setUserName] = useState(''); // Campo para o nome no cadastro.
  const [userRole, setUserRole] = useState(''); // Campo para o cargo no cadastro.
  const [authMode, setAuthMode] = useState('login'); // Define se a tela de entrada é Login ou Cadastro.
  const [cargosDinamicos, setCargosDinamicos] = useState([]); // Lista de cargos que vem do banco de dados.

  const level = authContextData?.accessLevel || userData?.accessLevel; // Define o nível de poder (Master, Comissão, etc).
  const isMaster = level === 'master'; // Pergunta se é o dono.
  const isComissao = isMaster || level === 'comissao'; // Pergunta se é da diretoria.
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Pergunta se cuida de uma região.
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Pergunta se é encarregado local.
  const isBasico = level === 'basico'; // Pergunta se é um usuário comum.
  const isAdmin = isGemLocal; // Define se tem permissão de marcar presença.
  
  const comumIdEfetivo = authContextData?.activeComumId || activeComumId || userData?.comumId; // Define qual igreja o app deve focar agora.

  const currentEventData = useMemo(() => { // Busca os dados do ensaio que está aberto no momento.
    return events.find(ev => ev.id === currentEventId);
  }, [events, currentEventId]);

  const ORDEM_TABS = useMemo(() => { // Define quais abas aparecem no menu de baixo baseado no poder do usuário.
    const temAcessoAjustes = isGemLocal; 
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'];
  }, [isGemLocal]);

  useEffect(() => { // Salva a aba que você parou para não perder ao recarregar.
    localStorage.setItem('lastTab', lobbyTab);
  }, [lobbyTab]);

  useEffect(() => { // Salva o ensaio aberto para você não perder a contagem se o celular travar.
    if (currentEventId) {
      localStorage.setItem('lastEventId', currentEventId);
    } else {
      localStorage.removeItem('lastEventId');
    }
  }, [currentEventId]);

  useEffect(() => { // Se o seu poder mudar e você perder acesso a uma aba, volta para a aba de ensaios.
    if ((authContextData || userData) && !ORDEM_TABS.includes(lobbyTab)) {
      setLobbyTab('ensaios');
    }
  }, [authContextData, userData, lobbyTab, ORDEM_TABS]);

  const mudarTab = (novaTab) => { // Função que faz a troca suave entre as abas de baixo.
    const idxAntigo = ORDEM_TABS.indexOf(lobbyTab);
    const idxNovo = ORDEM_TABS.indexOf(novaTab);
    if (idxAntigo === idxNovo) return;
    setDirecao(idxNovo > idxAntigo ? 1 : -1);
    setLobbyTab(novaTab);
  };

  useEffect(() => { // SINCRONIZAÇÃO: Mantém os dados da tela em sintonia com o Cérebro Central.
    if (authContextData?.activeComumId) {
      setActiveComumId(authContextData.activeComumId);
    }
    if (authContextData?.activeRegionalId) {
      setActiveRegionalId(authContextData.activeRegionalId);
    }
  }, [authContextData]);

  useEffect(() => { // Vigia se o usuário está logado ou se saiu do sistema.
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, u => {
      if (u && !u.emailVerified) { // Se o e-mail não foi confirmado, manda para o login.
        setUser(null);
        setUserData(null);
        setView('login');
        return;
      }
      setUser(u);
      if (u) {
        unsubSnap = onSnapshot(doc(db, 'users', u.uid), (docSnap) => { // Busca os dados do perfil no banco.
          if (!auth.currentUser || !auth.currentUser.emailVerified) {
             setView('login');
             return;
          }
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({ ...data, uid: u.uid, id: u.uid });
            const podeNavegar = data.accessLevel === 'master' || data.accessLevel === 'comissao' || data.accessLevel === 'regional_cidade';
            if (podeNavegar) { // Se for Master/Regional, carrega as memórias de onde ele parou de navegar.
              const savedComumId = localStorage.getItem('activeComumId');
              const savedRegionalId = localStorage.getItem('activeRegionalId');
              if (!activeComumId && !savedComumId) {
                setActiveComumId(data.comumId);
              } else if (savedComumId && !activeComumId) {
                setActiveComumId(savedComumId);
              }
              if (!activeRegionalId && !savedRegionalId) {
                setActiveRegionalId(data.regionalId);
              } else if (savedRegionalId && !activeRegionalId) {
                setActiveRegionalId(savedRegionalId);
              }
            } else { // Se for encarregado local, fixa ele na comum dele.
              setActiveComumId(data.comumId);
              setActiveRegionalId(data.regionalId);
            }
            const savedView = localStorage.getItem('lastEventId') ? 'app' : 'lobby';
            setView(data.approved || data.accessLevel === 'master' ? savedView : 'waiting-approval');
          } else { setView('login'); }
        });
      } else { // Se deslogou, limpa tudo por segurança.
        if (unsubSnap) unsubSnap();
        setUserData(null);
        setEvents([]); 
        setActiveComumId(null);
        setActiveRegionalId(null);
        localStorage.clear();
        setView('login'); 
      }
    });
    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []); 

  useEffect(() => { // ESCUTA DE EVENTOS: Carrega todos os ensaios da igreja que está selecionada agora.
    if (!user?.uid || !user?.emailVerified || !comumIdEfetivo || !(authContextData || userData)) return;
    setEvents([]); 
    const q = query(
      collection(db, 'events_global'), 
      where('comumId', '==', comumIdEfetivo), 
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => { // Fica ouvindo se alguém criar um ensaio novo no banco.
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        comumId: d.data().comumId || comumIdEfetivo 
      }));
      setEvents(data);
    }, (err) => { console.warn("Erro ao buscar ensaios:", err.message); });
    return () => unsub();
  }, [comumIdEfetivo, user?.uid, user?.emailVerified, level]); 

  if (view === 'loading') { // Tela de "espera" enquanto o sistema liga.
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[#F1F5F9] p-8 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-950 rounded-full animate-spin" />
        <p className="font-black text-slate-950 uppercase text-[10px] tracking-widest italic">Sincronizando Jurisdição...</p>
      </div>
    );
  }

  return ( // Desenho principal da tela.
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative text-left">
      <Toaster position="top-center" /> {/* Reservatório de avisos (Toasts). */}
      <AnimatePresence>{showSplash && <CapaEntrada aoEntrar={() => setShowSplash(false)} />}</AnimatePresence>

      {(view === 'login' || view === 'waiting-approval') ? ( // Se não estiver logado, mostra a tela de login.
        <LoginPage authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} pass={pass} setPass={setPass} userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole} cargosDinamicos={cargosDinamicos} userData={authContextData || userData} />
      ) : view === 'lobby' ? ( // Se estiver logado, mostra o "Lobby" (Menu principal).
        <>
          <Header // O topo do app com o seletor Master que criamos.
            userData={authContextData || { ...userData, activeRegionalId, isComissao, isRegional: isComissao, isCidade: isRegionalCidade }} 
            onChurchChange={(id) => setContext('comum', id)} // Avisa o Cérebro para trocar a cidade.
            onRegionalChange={(id) => setContext('regional', id)} // Avisa o Cérebro para trocar a regional.
          />
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direcao}>
              <motion.div key={lobbyTab} custom={direcao} initial={{ opacity: 0, x: direcao * 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direcao * -100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-32 px-4">
                <div className="max-w-md mx-auto">
                  {lobbyTab === 'ensaios' && ( // Aba de listagem de ensaios.
                    <EventsPage 
                      key={comumIdEfetivo || 'default'} 
                      allEvents={events}
                      userData={authContextData || { ...userData, activeCityId: userData?.activeCityId || userData?.cidadeId, activeComumId: activeComumId, comumId: comumIdEfetivo, activeRegionalId, isMaster, isComissao, isCidade: isRegionalCidade }} 
                      isAdmin={isAdmin} 
                      onSelectEvent={(id) => { 
                        setCurrentEventId(id); 
                        setView('app'); 
                      }} 
                    />
                  )}
                  {lobbyTab === 'dash' && <DashPage userData={authContextData || { ...userData, activeCityId: userData?.activeCityId || userData?.cidadeId, activeComumId: activeComumId, comumId: comumIdEfetivo, activeRegionalId }} />}
                  {lobbyTab === 'config' && <SettingsPage />}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
          
          {!showSplash && <Tickets moduloAtual={lobbyTab} />} {/* Sistema de chamados. */}

          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-950 text-white rounded-[2.2rem] flex justify-around p-1.5 z-50 shadow-2xl border border-white/5">
            {ORDEM_TABS.map(tab => ( // Botões da barra de navegação inferior.
              <button key={tab} onClick={() => mudarTab(tab)} className={`relative flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${lobbyTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>
                <span className="text-[9px] font-black uppercase italic tracking-widest">{tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'}</span>
              </button>
            ))}
          </nav>
        </>
      ) : ( // Se estiver dentro de um ensaio aberto, mostra o contador.
        <>
          <CounterPage 
            currentEventId={currentEventId} 
            counts={counts} 
            onBack={() => {
              setCurrentEventId(null);
              setView('lobby');
            }} 
            isAdmin={isAdmin} 
            isMaster={isMaster} 
            userData={authContextData || { 
              ...userData, 
              comumId: currentEventData?.comumId || comumIdEfetivo, 
              activeRegionalId, 
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

export default App; // Exporta o aplicativo completo.