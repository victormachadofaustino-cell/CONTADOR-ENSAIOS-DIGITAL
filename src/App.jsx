import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import { auth, db, doc, onSnapshot, collection, query, orderBy, where, onAuthStateChanged } from './config/firebase'; // Explicação: Importa as ferramentas de conexão em tempo real com o banco de dados Firebase.
import { authService } from './services/authService'; // Explicação: Importa o serviço responsável pelas ações de login e encerramento de sessão.
import { LOCALIDADE_PADRAO } from './config/config'; // Explicação: Importa as configurações de território iniciais e padrões do sistema.
import toast, { Toaster } from 'react-hot-toast'; // Explicação: Importa o sistema de avisos flutuantes e alertas de sucesso ou erro na tela.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa as ferramentas responsáveis por criar transições e animações suaves na tela.

import DashPage from './pages/dashboard/DashPage'; // Explicação: Importa a página de relatórios gráficos e resumos estatísticos.
import SettingsPage from './pages/SettingsPage'; // Explicação: Importa a página central de configurações e zeladoria de comuns.
import CounterPage from './pages/events/CounterPage'; // Explicação: Importa a tela do contador de presença nominal (o coração do app).
import EventsPage from './pages/events/EventsPage'; // Explicação: Importa a página que gerencia e lista as ordens de ensaios e cultos.
import LoginPage from './pages/auth/LoginPage'; // Explicação: Importa a página de entrada, autenticação e cadastro de usuários.
import CapaEntrada from './pages/CapaEntrada'; // Explicação: Importa a tela de abertura animada (Splash Screen) do sistema.
import Header from './components/Header'; // Explicação: Importa o cabeçalho superior com seletores territoriais de GPS.
import Tickets from './components/Tickets'; // Explicação: Importa o sistema integrado de chamados e suporte ao usuário.
import Footer from './components/Footer'; // Explicação: Traz o nosso novo rodapé isolado e fixado na base da tela.

import { useAuth } from './context/AuthContext'; // Explicação: Importa o Cérebro Central de Autenticação que distribui os crachás eletrônicos.

const CARGOS_ADMIN = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Secretário da Música', 'Secretario da Música']; // Explicação: Lista estática de cargos com competência administrativa de portaria.

function App() { // Explicação: Início da construção do componente mestre do aplicativo inteiro.
  const { userData: authContextData, loading: authContextLoading, setContext } = useAuth(); // Explicação: Conecta com o Cérebro Central para extrair o Crachá Eletrônico e o seletor territorial de GPS.
  
  const [user, setUser] = useState(null); // Explicação: Estado que controla se o usuário possui uma chave de login activa no aparelho.
  const [view, setView] = useState('loading'); // Explicação: Controla dinamicamente qual tela principal está sendo renderizada no celular.
  const [showSplash, setShowSplash] = useState(true); // Explicação: Determina se a cortina de abertura do app deve ficar visível.
  const [lobbyTab, setLobbyTab] = useState(localStorage.getItem('lastTab') || 'ensaios'); // Explicação: Guarda na memória do celular qual aba inferior o usuário parou navegando.
  const [currentEventId, setCurrentEventId] = useState(localStorage.getItem('lastEventId') || null); // Explicação: Guarda a identification do ensaio que está recebendo contagem no momento.
  const [counts, setCounts] = useState({}); // Explicação: Armazena temporariamente os números computados no contador mecânico.
  const [direcao, setDirecao] = useState(0); // Explicação: Define se a animação de troca de tela deslizará para a esquerda ou direita.
  const [events, setEvents] = useState([]); // Explicação: Caixa coletora que guarda todos os ensaios carregados daquela igreja.

  const [activeComumId, setActiveComumId] = useState(localStorage.getItem('activeComumId') || null); // Explicação: Memória de backup local para a ID da comum selecionada.
  const [activeComumName, setActiveComumName] = useState(localStorage.getItem('activeComumName') || ''); // Explicação: Memória de backup local para o nome da comum selecionada.
  const [activeRegionalId, setActiveRegionalId] = useState(localStorage.getItem('activeRegionalId') || null); // Explicação: Memória de backup local para a ID da regional selecionada.
  const [activeRegionalName, setActiveRegionalName] = useState(localStorage.getItem('activeRegionalName') || 'Navegar...'); // Explicação: Texto de exibição da regional no topo.

  const [email, setEmail] = useState(''); // Explicação: Campo de texto temporário para digitação do e-mail de login.
  const [pass, setPass] = useState(''); // Explicação: Campo de texto temporário para digitação da senha de segurança.
  const [userName, setUserName] = useState(''); // Explicação: Campo de texto temporário para digitação do nome no cadastro.
  const [userRole, setUserRole] = useState(''); // Explicação: Armazena o cargo selecionado na ficha de requisição de cadastro.
  const [authMode, setAuthMode] = useState('login'); // Explicação: Alterna a interface de entrada entre modo Login ou modo Cadastro.
  const [cargosDinamicos, setCargosDinamicos] = useState([]); // Explicação: Recebe a listagem de cargos de referência vinda do banco.

  // --- UNIFICAÇÃO DA MATRIZ DE PODER BASEADA 100% NO CRACHÁ ELETRÔNICO DO CÉREBRO CENTRAL ---
  const level = authContextData?.accessLevel; // Explicação: Extrai o nível de autoridade contido no Crachá Eletrônico unificado.
  const isMaster = level === 'master'; // Explicação: Identifica se o usuário é o administrador supremo do sistema.
  const isComissao = isMaster || level === 'comissao'; // Explicação: Identifica se pertence à comissão técnica musical regional.
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Explicação: Identifica se o usuário administra uma cidade por inteiro.
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Explicação: Identifica se o usuário tem nível mínimo de secretário local.
  const isBasico = level === 'basico'; // Explicação: Identifica se é um músico comum sem poder eclesiástico.
  const isAdmin = isGemLocal; // Explicação: Define se o usuário tem a caneta para controlar ensaios locais.
  
  const comumIdEfetivo = authContextData?.activeComumId || activeComumId || authContextData?.comumId; // Explicação: Descobre a ID da igreja alvo cruzando o GPS com o crachá do usuário.

  const currentEventData = useMemo(() => { // Explicação: Memoriza e localiza as informações do ensaio focado para evitar re-renderização.
    return events.find(ev => ev.id === currentEventId); // Explicação: Varre o vetor buscando a ID correspondente e retorna.
  }, [events, currentEventId]); // Explicação: Recalcula se o array de eventos ou a ID focada mudarem.

  const ORDEM_TABS = useMemo(() => { // Explicação: Desenha a barra de abas inferior ocultando ou exibindo o menu de Ajustes baseado no poder do crachá.
    const temAcessoAjustes = isGemLocal; // Explicação: Define a regra lógica de corte de portaria.
    return temAcessoAjustes ? ['ensaios', 'dash', 'config'] : ['ensaios', 'dash']; // Explicação: Adiciona ou remove a aba de ajustes no vetor.
  }, [isGemLocal]); // Explicação: Recalcula o menu se mudar o nível de permissão.

  useEffect(() => { // Explicação: Salva no navegador qual aba o usuário parou para manter a experiência na reabertura.
    localStorage.setItem('lastTab', lobbyTab); // Explicação: Grava a string da aba ativa na memória de armazenamento local.
  }, [lobbyTab]); // Explicação: Monitora a troca de abas.

  useEffect(() => { // Explicação: Salva a ID do ensaio aberto para blindar a contagem contra fechamentos acidentais do app.
    if (currentEventId) { // Explicação: Se houver ensaio em andamento na tela.
      localStorage.setItem('lastEventId', currentEventId); // Explicação: Registra a chave do ensaio no armazenamento local.
    } else { // Explicação: Se o ensaio foi fechado com sucesso pelo botão voltar.
      localStorage.removeItem('lastEventId'); // Explicação: Expulsa a chave antiga da memória.
    } // Explicação: Fim da condicional sanitária de chaves.
  }, [currentEventId]); // Explicação: Monitora a ID do ensaio aberto.

  useEffect(() => { // Explicação: Trava de Segurança: Se o nível do usuário mudar e ele perder o acesso, expulsa ele para a aba de ensaios.
    if (authContextData && !ORDEM_TABS.includes(lobbyTab)) { // Explicação: Se a aba atual sumiu da nova matriz de permissões.
      setLobbyTab('ensaios'); // Explicação: Redireciona obrigatoriamente para a aba de ensaios.
    } // Explicação: Fim da verificação.
  }, [authContextData, lobbyTab, ORDEM_TABS]); // Explicação: Força re-verificação nas trocas de contexto.

  const mudarTab = (novaTab) => { // Explicação: Gerencia a troca de abas calculando a direção do deslize da tela para a esquerda ou direita.
    const idxAntigo = ORDEM_TABS.indexOf(lobbyTab); // Explicação: Pega o índice numérico da aba antiga.
    const idxNovo = ORDEM_TABS.indexOf(novaTab); // Explicação: Pega o índice numérico da nova aba clicada.
    if (idxAntigo === idxNovo) return; // Explicação: Aborta se clicou na mesma aba onde já estava parado.
    setDirecao(idxNovo > idxAntigo ? 1 : -1); // Explicação: Define 1 para deslizar para frente ou -1 para deslizar para trás na animação.
    setLobbyTab(novaTab); // Explicação: Ativa a nova aba na interface.
  }; // Explicação: Encerra o método de transição.

  useEffect(() => { // Explicação: Monitor de Sincronização: Amarra os backups locais de estados às variáveis vivas do Cérebro Central.
    if (authContextData?.activeComumId) { // Explicação: Se houver uma igreja comum ativa no contexto global.
      setActiveComumId(authContextData.activeComumId); // Explicação: Atualiza o backup de ID local de controle.
    } // Explicação: Fim do bloco comum.
    if (authContextData?.activeRegionalId) { // Explicação: Se houver uma regional selecionada no contexto global.
      setActiveRegionalId(authContextData.activeRegionalId); // Explicação: Atualiza o backup de regional local.
    } // Explicação: Fim do bloco regional.
  }, [authContextData]); // Explicação: Roda a cada modificação do crachá eletrônico.

  useEffect(() => { // Explicação: Escudo de Rota e Identidade: Ouve as mudanças de autenticação do Firebase de forma ultra enxuta.
    const unsubAuth = onAuthStateChanged(auth, u => { // Explicação: Abre um canal nativo para receber o token de login do dispositivo.
      if (u && !u.emailVerified) { // Explicação: Trava de segurança: Se o e-mail não foi verificado, barra o acesso imediatamente.
        setUser(null); // Explicação: Limpa o usuário do estado interno.
        setView('login'); // Explicação: Joga a tela obrigatoriamente no formulário de login.
        return; // Explicação: Corta a execução da subrotina.
      } // Explicação: Fim da trava de e-mail.
      setUser(u); // Explicação: Registra a chave do usuário autenticado no estado do app.
      
      if (u) { // Explicação: Se o usuário estiver legitimamente logado.
        // CORREÇÃO E ECONOMIA DE COTA: O fluxo de navegação agora é decidido puramente pelas respostas reativas do authContextLoading e authContextData.
        if (!authContextLoading && authContextData) { // Explicação: Se as credenciais do crachá terminaram de baixar do contexto.
          const savedView = localStorage.getItem('lastEventId') ? 'app' : 'lobby'; // Explicação: Se caiu a conexão no meio de um ensaio, volta direto pro contador.
          setView(authContextData.approved || authContextData.accessLevel === 'master' ? savedView : 'waiting-approval'); // Explicação: Desvia usuários não aprovados para a tela de espera.
        } // Explicação: Encerra a conferência de dados.
      } else { // Explicação: Caso não haja nenhuma conta conectada no aparelho.
        setEvents([]);  // Explicação: Esvazia o cache local de ensaios da igreja por privacidade.
        setActiveComumId(null); // Explicação: Zera o ponteiro GPS da comum.
        setActiveRegionalId(null); // Explicação: Zera o ponteiro GPS da regional.
        localStorage.clear(); // Explicação: Higiene de Segurança: Limpa o armazenamento local ao deslogar do sistema.
        setView('login'); // Explicação: Joga a tela no formulário inicial.
      } // Explicação: Fim do divisor de autenticação.
    }); // Explicação: Encerra o escopo do listener nativo.
    return () => unsubAuth(); // Explicação: Desliga os observadores de sessão ao destruir o componente.
  }, [authContextLoading, authContextData]); // Explicação: Re-avalia o canal se os carregamentos mudarem.

  // Efeito auxiliar para atualizar a visualização (view) assim que o contexto terminar de carregar na inicialização
  useEffect(() => { // Explicação: Disparado na largada de boot para casar os estados visuais.
    if (!authContextLoading && user && authContextData) { // Explicação: Se o crachá baixou e o login está firme.
      const savedView = localStorage.getItem('lastEventId') ? 'app' : 'lobby'; // Explicação: Verifica se deve reabrir direto no contador.
      setView(authContextData.approved || authContextData.accessLevel === 'master' ? savedView : 'waiting-approval'); // Explicação: Executa o roteamento.
    } else if (!authContextLoading && !user) { // Explicação: Se o contexto terminou sem usuário ativo.
      setView('login'); // Força a tela de login.
    } // Explicação: Encerra a conferência auxiliar.
  }, [authContextLoading, user, authContextData]); // Explicação: Escuta as chaves de bootstrap.

  useEffect(() => { // Explicação: Buscador de Eventos por Comum: Alimenta a listagem filtrando apenas os ensaios da igreja em foco.
    if (!user?.uid || !user?.emailVerified || !comumIdEfetivo || !authContextData) return; // Explicação: Trava defensiva para não rodar buscas cegas sem chaves de segurança.
    setEvents([]); // Explicação: Limpa a gaveta de ensaios antiga antes de abrir a conexão com a nova comum.
    
    const q = query( // Explicação: Constrói a consulta filtrada indexada do Firestore.
      collection(db, 'events_global'), // Explicação: Aponta para a coleção central de eventos.
      where('comumId', '==', comumIdEfetivo), // Explicação: Filtra para trazer apenas os ensaios da igreja selecionada no cabeçalho.
      orderBy('date', 'desc') // Explicação: Ordena os ensaios colocando o mais recente sempre no topo absoluto.
    ); // Explicação: Encerra a query técnica.
    
    const unsub = onSnapshot(q, (snapshot) => { // Explicação: Abre canal em tempo real para escutar novos ensaios abertos na comum.
      const data = snapshot.docs.map(d => ({ // Explicação: Transforma os snapshots crus em objetos nativos.
        id: d.id, // Insere a ID do documento.
        ...d.data(), // Clona as propriedades internas de ata e contagens.
        comumId: d.data().comumId || comumIdEfetivo // Força a amarração contextual da comum.
      })); // Termina o mapeamento.
      setEvents(data); // Explicação: Satura o estado de ensaios com os dados atualizados.
    }, (err) => { console.warn("Erro ao buscar ensaios:", err.message); }); // Explicação: Captura e reporta avisos de rede de forma controlada.
    
    return () => unsub(); // Explicação: Desliga la escuta territorial ao mudar de foco para poupar cotas do Firestore.
  }, [comumIdEfetivo, user?.uid, user?.emailVerified, authContextData]); // Explicação: Remonta o canal se a igreja mestre de foco mudar no GPS.

  if (view === 'loading' || authContextLoading) { // Explicação: Renderiza o visual de carregamento premium de jurisdição.
    return ( // Explicação: Desenha o spinner centralizado.
      <div className="h-dvh flex flex-col items-center justify-center bg-[#F1F5F9] p-8 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /> {/* Explicação: Círculo animado com rotação contínua Tailwind CSS. */}
        <p className="font-black text-slate-950 uppercase text-[10px] tracking-widest italic">Sincronizando Jurisdição...</p> {/* Explicação: Texto de rodapé de carregamento em caixa alta micro. */}
      </div>
    ); // Explicação: Fim da renderização do carregamento.
  } // Explicação: Fim da trava de bootstrap de rede.

  return ( // Explicação: Inicia a renderização estrutural do layout do aplicativo.
    <div className="h-dvh bg-[#F1F5F9] flex flex-col font-sans overflow-hidden relative text-left"> {/* Explicação: Container raiz do aplicativo travado na altura do dispositivo móvel. */}
      <Toaster position="top-center" /> {/* Explicação: Posiciona o contêiner centralizador de alertas e toas flutuantes. */}
      <AnimatePresence>{showSplash && <CapaEntrada aoEntrar={() => setShowSplash(false)} />}</AnimatePresence> {/* Explicação: Controla a exibição e saída animada da cortina de Splash Screen. */}

      {(view === 'login' || view === 'waiting-approval') ? ( // Explicação: Se o usuário não estiver logado ou aprovado, barra e exibe a tela de credenciais.
        <LoginPage authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} pass={pass} setPass={setPass} userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole} cargosDinamicos={cargosDinamicos} userData={authContextData} /> // Explicação: Renderiza o portal eclesiástico de entrada.
      ) : view === 'lobby' ? ( // Explicação: Se a sessão for limpa e autorizada, abre o menu principal (Lobby).
        <>
          <Header // Explicação: Renderiza o cabeçalho alimentando-o com o Crachá Eletrônico unificado do contexto.
            userData={authContextData} // Explicação: Entrega a cópia do crachá de autenticação para o cabeçalho.
            onChurchChange={(id) => setContext('comum', id)} // Explicação: Dispara a atualização do GPS da comum no Cérebro Central.
            onRegionalChange={(id) => setContext('regional', id)} // Explicação: Dispara a atualização do GPS da regional no Cérebro Central.
          />
          <main className="flex-1 relative overflow-hidden"> {/* Explicação: Palco central onde as telas das abas inferiores entram e saem. */}
            <AnimatePresence mode="popLayout" custom={direcao}> {/* Explicação: Gerenciador de animações sincronizadas de entrada e saída de abas. */}
              {/* Explicação: 'pb-36' adicionado para criar uma margem de segurança na base, impedindo que os dados colidam com o novo rodapé fixo. */}
              <motion.div key={lobbyTab} custom={direcao} initial={{ opacity: 0, x: direcao * 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direcao * -100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full h-full overflow-y-auto no-scrollbar pt-4 pb-36 px-4"> {/* Explicação: Bloco móvel animado com rolagem vertical livre suave. */}
                <div className="max-w-md mx-auto"> {/* Explicação: Limitador ergonômico central de largura para smartphones comuns. */}
                  {lobbyTab === 'ensaios' && ( // Explicação: Renderiza a lista de ensaios repassando as permissões unificadas por crachá.
                    <EventsPage // Explicação: Invoca a grade de ordens e cultos.
                      key={comumIdEfetivo || 'default'} // Explicação: Recria o componente se a comum do GPS mudar para evitar vazamento de dados de cache.
                      allEvents={events} // Explicação: Entrega o array de ensaios monitorados em tempo real.
                      userData={authContextData} // Explicação: Acopla o crachá de usuário.
                      isAdmin={isAdmin} // Explicação: Repassa a flag calculada de poder administrativo de caneta.
                      onSelectEvent={(id) => { // Explicação: Executado quando o secretário seleciona um ensaio da lista.
                        setCurrentEventId(id); // Explicação: Grava a ID do ensaio na memória global.
                        setView('app'); // Explicação: Dispara a abertura imediata do painel do contador em tela cheia.
                      }} // Explicação: Encerra a callback de seleção.
                    /> // Explicação: Fecha a tag da página de ensaios.
                  )}
                  {lobbyTab === 'dash' && <DashPage userData={authContextData} />} {/* Explicação: Abre o painel estatístico consolidado histórico da comum. */}
                  {lobbyTab === 'config' && <SettingsPage />} {/* Explicação: Abre o painel de gerenciamento de alistamentos e grade da comum. */}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
          
          {!showSplash && <Tickets moduloAtual={lobbyTab} />} {/* Explicação: Exibe o botão de suporte técnico após a saída da splash screen. */}

          {/* CHAMADA DO NOVO RODAPÉ ATÔMICO ISOLADO E TOTALMENTE ASSENTADO */}
          {/* Explicação: Invocamos o Footer passando os parâmetros necessários de forma enxuta e performática. */}
          <Footer 
            tabs={ORDEM_TABS} // Explicação: Entrega as abas autorizadas baseadas na herança do crachá.
            activeTab={lobbyTab} // Explicação: Informa qual aba está ativa.
            onTabChange={mudarTab} // Explicação: Acopla o método de transição inteligente calculado por nós.
          />
        </>
      ) : ( // Explicação: Se a visualização activa for 'app', renderiza o painel do contador de presenças em tela cheia.
        <>
          <CounterPage // Explicação: Invoca a interface reativa mestre do contador digital.
            currentEventId={currentEventId} // Explicação: Passa a ID do ensaio focado ativo.
            counts={counts} // Explicação: Passa o mapa de contagens.
            onBack={() => { // Explicação: Executado quando o usuário clica na seta superior de voltar.
              setCurrentEventId(null); // Explicação: Desativa o ensaio focado.
              setView('lobby'); // Explicação: Devolve o usuário com segurança para o menu principal do Lobby.
            }} // Explicação: Encerra a callback de retorno.
            isAdmin={isAdmin} // Explicação: Repassa a flag de permissão de escrita.
            isMaster={isMaster} // Explicação: Repassa a flag de administrador supremo.
            userData={authContextData} // Explicação: Passa o crachá eletrônico para as sub-travas internas de controle de naipes.
            allEvents={events} // Explicação: Passa a lista histórica de suporte para cálculo de deltas estatísticos.
          /> {/* Explicação: Fecha a tag do contador. */}
          {!showSplash && <Tickets moduloAtual="contador" />} {/* Explicação: Carrega o suporte no contador. */}
        </>
      )}
    </div>
  );
}

export default App; // Explicação: Exporta o componente App totalmente saneado, unificado e imune a falhas de concorrência.