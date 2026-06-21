import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import { auth, db, doc, onSnapshot, collection, query, orderBy, where, onAuthStateChanged } from './config/firebase'; // Explicação: Importa as ferramentas de conexão em tempo real com o banco de dados Firebase.
import { authService } from './services/authService'; // Explicação: Importa o serviço responsável pelas ações de login e encerramento de sessão.
import { LOCALIDADE_PADRAO } from './config/config'; // Explicação: Importa as configurações de território iniciais e padrões do sistema[cite: 1].
import toast, { Toaster } from 'react-hot-toast'; // Explicação: Importa o sistema de avisos flutuantes e alertas de sucesso ou erro na tela[cite: 1].
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa as ferramentas responsáveis por criar transições e animações suaves na tela[cite: 1].

import DashPage from './pages/dashboard/DashPage'; // Explicação: Importa a página de relatórios gráficos e resumos estatísticos[cite: 1].
import SettingsPage from './pages/SettingsPage'; // Explicação: Importa a página central de configurações e zeladoria de comuns[cite: 1].
import CounterPage from './pages/events/CounterPage'; // Explicação: Importa a tela do contador de presença nominal (o coração do app)[cite: 1].
import EventsPage from './pages/events/EventsPage'; // Explicação: Importa a página que gerencia e lista as ordens de ensaios e cultos[cite: 1].
import LoginPage from './pages/auth/LoginPage'; // Explicação: Importa a página de entrada, autenticação e cadastro de usuários[cite: 1].
import CapaEntrada from './pages/CapaEntrada'; // Explicação: Importa a tela de abertura animada (Splash Screen) do sistema[cite: 1].
import Header from './components/Header'; // Explicação: Importa o cabeçalho superior com seletores territoriais de GPS[cite: 1].
import Tickets from './components/Tickets'; // Explicação: Importa o sistema integrado de chamados e suporte ao usuário[cite: 1].

import { useAuth } from './context/AuthContext'; // Explicação: Importa o Cérebro Central de Autenticação que distribui os crachás eletrônicos[cite: 1].

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Secretário da Música', 'Secretario da Música']; // Explicação: Lista estática de cargos com competência administrativa de portaria[cite: 1].

function App() { // Explicação: Início da construção do componente mestre do aplicativo inteiro[cite: 1].
  const { userData: authContextData, loading: authContextLoading, setContext } = useAuth(); // Explicação: Conecta com o Cérebro Central para extrair o Crachá Eletrônico e o seletor territorial de GPS[cite: 1].
  
  const [user, setUser] = useState(null); // Explicação: Estado que controla se o usuário possui uma chave de login ativa no aparelho[cite: 1].
  const [view, setView] = useState('loading'); // Explicação: Controla dinamicamente qual tela principal está sendo renderizada no celular[cite: 1].
  const [showSplash, setShowSplash] = useState(true); // Explicação: Determina se a cortina de abertura do app deve ficar visível[cite: 1].
  const [lobbyTab, setLobbyTab] = useState(localStorage.getItem('lastTab') || 'ensaios'); // Explicação: Guarda na memória do celular qual aba inferior o usuário parou navegando[cite: 1].
  const [currentEventId, setCurrentEventId] = useState(localStorage.getItem('lastEventId') || null); // Explicação: Guarda a identificação do ensaio que está recebendo contagem no momento[cite: 1].
  const [counts, setCounts] = useState({}); // Explicação: Armazena temporariamente os números computados no contador mecânico[cite: 1].
  const [direcao, setDirecao] = useState(0); // Explicação: Define se a animação de troca de tela deslizará para a esquerda ou direita[cite: 1].
  const [events, setEvents] = useState([]); // Explicação: Caixa coletora que guarda todos os ensaios carregados daquela igreja[cite: 1].

  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId') || null); // Explicação: Memória de backup local para a ID da comum selecionada[cite: 1].
  const [activeComumName, setActiveComumName] = useState(localStorage.getItem('activeComumName') || ''); // Explicação: Memória de backup local para o nome da comum selecionada[cite: 1].
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId') || null); // Explicação: Memória de backup local para a ID da regional selecionada[cite: 1].
  const [activeRegionalName, setActiveRegionalName] = useState(localStorage.getItem('activeRegionalName') || 'Navegar...'); // Explicação: Texto de exibição da regional no topo[cite: 1].

  const [email, setEmail] = useState(''); // Explicação: Campo de texto temporário para digitação do e-mail de login[cite: 1].
  const [pass, setPass] = useState(''); // Explicação: Campo de texto temporário para digitação da senha de segurança[cite: 1].
  const [userName, setUserName] = useState(''); // Explicação: Campo de texto temporário para digitação do nome no cadastro[cite: 1].
  const [userRole, setUserRole] = useState(''); // Explicação: Armazena o cargo selecionado na ficha de requisição de cadastro[cite: 1].
  const [authMode, setAuthMode] = useState('login'); // Explicação: Alterna a interface de entrada entre modo Login ou modo Cadastro[cite: 1].
  const [cargosDinamicos, setCargosDinamicos] = useState([]); // Explicação: Recebe a listagem de cargos de referência vinda do banco[cite: 1].

  // --- UNIFICAÇÃO DA MATRIZ DE PODER BASEADA 100% NO CRACHÁ ELETRÔNICO DO CÉREBRO CENTRAL ---
  const level = authContextData?.accessLevel; // Explicação: Extrai o nível de autoridade contido no Crachá Eletrônico unificado[cite: 1].
  const isMaster = level === 'master'; // Explicação: Identifica se o usuário é o administrador supremo do sistema[cite: 1].
  const isComissao = isMaster || level === 'comissao'; // Explicação: Identifica se pertence à comissão técnica musical regional[cite: 1].
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Explicação: Identifica se o usuário administra uma cidade por inteiro[cite: 1].
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Explicação: Identifica se o usuário tem nível mínimo de secretário local[cite: 1].
  const isBasico = level === 'basico'; // Explicação: Identifica se é um músico comum sem poder eclesiástico[cite: 1].
  const isAdmin = isGemLocal; // Explicação: Define se o usuário tem a caneta para controlar ensaios locais[cite: 1].
  
  const comumIdEfetivo = authContextData?.activeComumId || activeComumId || authContextData?.comumId; // Explicação: Descobre a ID da igreja alvo cruzando o GPS com o crachá do usuário[cite: 1].

  const currentEventData = useMemo(() => { // Explicação: Memoriza e localiza as informações do ensaio focado para evitar re-renderização[cite: 1].
    return events.find(ev => ev.id === currentEventId);
  }, [events, currentEventId]);

  const ORDEM_TABS = useMemo(() => { // Explicação: Desenha a barra de abas inferior ocultando ou exibindo o menu de Ajustes baseado no poder do crachá[cite: 1].
    const temAcessoAjustes = isGemLocal; 
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash'];
  }, [isGemLocal]);

  useEffect(() => { // Explicação: Salva no navegador qual aba o usuário parou para manter a experiência na reabertura[cite: 1].
    localStorage.setItem('lastTab', lobbyTab);
  }, [lobbyTab]);

  useEffect(() => { // Explicação: Salva a ID do ensaio aberto para blindar a contagem contra fechamentos acidentais do app[cite: 1].
    if (currentEventId) {
      localStorage.setItem('lastEventId', currentEventId);
    } else {
      localStorage.removeItem('lastEventId');
    }
  }, [currentEventId]);

  useEffect(() => { // Explicação: Trava de Segurança: Se o nível do usuário mudar e ele perder o acesso, expulsa ele para a aba de ensaios[cite: 1].
    if (authContextData && !ORDEM_TABS.includes(lobbyTab)) {
      setLobbyTab('ensaios');
    }
  }, [authContextData, lobbyTab, ORDEM_TABS]);

  const mudarTab = (novaTab) => { // Explicação: Gerencia a troca de abas calculando a direção do deslize da tela para a esquerda ou direita[cite: 1].
    const idxAntigo = ORDEM_TABS.indexOf(lobbyTab);
    const idxNovo = ORDEM_TABS.indexOf(novaTab);
    if (idxAntigo === idxNovo) return;
    setDirecao(idxNovo > idxAntigo ? 1 : -1);
    setLobbyTab(novaTab);
  };

  useEffect(() => { // Explicação: Monitor de Sincronização: Amarra os backups locais de estados às variáveis vivas do Cérebro Central[cite: 1].
    if (authContextData?.activeComumId) {
      setActiveComumId(authContextData.activeComumId);
    }
    if (authContextData?.activeRegionalId) {
      setActiveRegionalId(authContextData.activeRegionalId);
    }
  }, [authContextData]);

  useEffect(() => { // Explicação: Escudo de Rota e Identidade: Ouve as mudanças de autenticação do Firebase de forma ultra enxuta[cite: 1].
    const unsubAuth = onAuthStateChanged(auth, u => {
      if (u && !u.emailVerified) { // Explicação: Trava de segurança: Se o e-mail não foi verificado, barra o acesso imediatamente[cite: 1].
        setUser(null);
        setView('login');
        return;
      }
      setUser(u); // Explicação: Registra a chave do usuário autenticado no estado do app[cite: 1].
      
      if (u) {
        // CORREÇÃO E ECONOMIA DE COTA: Removemos o onSnapshot redundante da coleção 'users'[cite: 1].
        // O fluxo de navegação agora é decidido puramente pelas respostas reativas do authContextLoading e authContextData[cite: 1].
        if (!authContextLoading && authContextData) {
          const savedView = localStorage.getItem('lastEventId') ? 'app' : 'lobby'; // Explicação: Se caiu a conexão no meio de um ensaio, volta direto pro contador[cite: 1].
          setView(authContextData.approved || authContextData.accessLevel === 'master' ? savedView : 'waiting-approval'); // Explicação: Desvia usuários não aprovados para a tela de espera[cite: 1].
        }
      } else {
        setEvents([]); 
        setActiveComumId(null);
        setActiveRegionalId(null);
        localStorage.clear(); // Explicação: Higiene de Segurança: Limpa o armazenamento local ao deslogar do sistema[cite: 1].
        setView('login'); 
      }
    });
    return () => unsubAuth(); // Explicação: Desliga os observadores de sessão ao destruir o componente[cite: 1].
  }, [authContextLoading, authContextData]); 

  // Efeito auxiliar para atualizar a visualização (view) assim que o contexto terminar de carregar na inicialização
  useEffect(() => {
    if (!authContextLoading && user && authContextData) {
      const savedView = localStorage.getItem('lastEventId') ? 'app' : 'lobby';
      setView(authContextData.approved || authContextData.accessLevel === 'master' ? savedView : 'waiting-approval');
    } else if (!authContextLoading && !user) {
      setView('login');
    }
  }, [authContextLoading, user, authContextData]);

  useEffect(() => { // Explicação: Buscador de Eventos por Comum: Alimenta a listagem filtrando apenas os ensaios da igreja em foco[cite: 1].
    if (!user?.uid || !user?.emailVerified || !comumIdEfetivo || !authContextData) return;
    setEvents([]); // Explicação: Limpa a gaveta de ensaios antiga antes de abrir a conexão com a nova comum[cite: 1].
    
    const q = query(
      collection(db, 'events_global'), 
      where('comumId', '==', comumIdEfetivo), 
      orderBy('date', 'desc') // Explicação: Ordena os ensaios colocando o mais recente sempre no topo absoluto[cite: 1].
    );
    
    const unsub = onSnapshot(q, (snapshot) => { // Explicação: Abre canal em tempo real para escutar novos ensaios abertos na comum[cite: 1].
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        comumId: d.data().comumId || comumIdEfetivo 
      }));
      setEvents(data); // Explicação: Satura o estado de ensaios com os dados atualizados[cite: 1].
    }, (err) => { console.warn("Erro ao buscar ensaios:", err.message); });
    
    return () => unsub(); // Explicação: Desliga a escuta territorial ao mudar de foco para poupar cotas do Firestore[cite: 1].
  }, [comumIdEfetivo, user?.uid, user?.emailVerified, authContextData]); 

  if (view === 'loading' || authContextLoading) { // Explicação: Renderiza o visual de carregamento premium de jurisdição[cite: 1].
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[#F1F5F9] p-8 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="font-black text-slate-950 uppercase text-[10px] tracking-widest italic">Sincronizando Jurisdição...</p>
      </div>
    );
  }

  return ( // Explicação: Inicia a renderização estrutural do layout do aplicativo[cite: 1].
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative text-left">
      <Toaster position="top-center" /> {/* Explicação: Posiciona o contêiner centralizador de alertas e toas flutuantes[cite: 1]. */}
      <AnimatePresence>{showSplash && <CapaEntrada aoEntrar={() => setShowSplash(false)} />}</AnimatePresence>

      {(view === 'login' || view === 'waiting-approval') ? ( // Explicação: Se o usuário não estiver logado ou aprovado, barra e exibe a tela de credenciais[cite: 1].
        <LoginPage authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} pass={pass} setPass={setPass} userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole} cargosDinamicos={cargosDinamicos} userData={authContextData} />
      ) : view === 'lobby' ? ( // Explicação: Se a sessão for limpa e autorizada, abre o menu principal (Lobby)[cite: 1].
        <>
          <Header // Explicação: Renderiza o cabeçalho alimentando-o com o Crachá Eletrônico unificado do contexto[cite: 1].
            userData={authContextData} 
            onChurchChange={(id) => setContext('comum', id)} // Explicação: Dispara a atualização do GPS da comum no Cérebro Central[cite: 1].
            onRegionalChange={(id) => setContext('regional', id)} // Explicação: Dispara a atualização do GPS da regional no Cérebro Central[cite: 1].
          />
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direcao}>
              <motion.div key={lobbyTab} custom={direcao} initial={{ opacity: 0, x: direcao * 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direcao * -100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-32 px-4">
                <div className="max-w-md mx-auto">
                  {lobbyTab === 'ensaios' && ( // Explicação: Renderiza a lista de ensaios repassando as permissões unificadas por crachá[cite: 1].
                    <EventsPage 
                      key={comumIdEfetivo || 'default'} 
                      allEvents={events}
                      userData={authContextData} 
                      isAdmin={isAdmin} 
                      onSelectEvent={(id) => { 
                        setCurrentEventId(id); 
                        setView('app'); // Explicação: Dispara a abertura imediata do painel do contador[cite: 1].
                      }} 
                    />
                  )}
                  {lobbyTab === 'dash' && <DashPage userData={authContextData} />}
                  {lobbyTab === 'config' && <SettingsPage />}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
          
          {!showSplash && <Tickets moduloAtual={lobbyTab} />} {/* Explicação: Exibe o botão de suporte técnico após a saída da splash screen[cite: 1]. */}

          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-950 text-white rounded-[2.2rem] flex justify-around p-1.5 z-50 shadow-2xl border border-white/5">
            {ORDEM_TABS.map(tab => ( // Explicação: Varre o vetor dinâmico de abas permitidas e desenha as pílulas inferiores de clique[cite: 1].
              <button key={tab} onClick={() => mudarTab(tab)} className={`relative flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${lobbyTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>
                <span className="text-[9px] font-black uppercase italic tracking-widest">{tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'}</span>
              </button>
            ))}
          </nav>
        </>
      ) : ( // Explicação: Se a visualização ativa for 'app', renderiza o painel do contador de presenças em tela cheia[cite: 1].
        <>
          <CounterPage 
            currentEventId={currentEventId} 
            counts={counts} 
            onBack={() => {
              setCurrentEventId(null); // Explicação: Desativa o ensaio focado[cite: 1].
              setView('lobby'); // Explicação: Devolve o usuário com segurança para o menu principal[cite: 1].
            }} 
            isAdmin={isAdmin} 
            isMaster={isMaster} 
            userData={authContextData} 
            allEvents={events} 
          />
          {!showSplash && <Tickets moduloAtual="contador" />}
        </>
      )}
    </div>
  );
}

export default App; // Explicação: Exporta o componente App totalmente saneado, unificado e imune a falhas de concorrência[cite: 1].