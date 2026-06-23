import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas de memória e efeitos do React.
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, where, orderBy, auth, or } from '../../config/firebase'; // Explicação: Conecta ao banco de dados Firebase.
import { eventService } from '../../services/eventService'; // Explicação: Importa o motor de busca e criação de eventos.

import toast from 'react-hot-toast'; // Explicação: Ferramenta de avisos flutuantes na tela.
import { Plus, MapPin, Home, Globe } from 'lucide-react'; // Explicação: Ícones visuais para o menu e botões.
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa o crachá do usuário logado.

// IMPORTAÇÃO DOS NOVOS COMPONENTES MODULARES
import EventsList from './components/EventsList'; // Explicação: Componente que desenha a lista de ensaios.
import EventModals from './components/EventModals'; // Explicação: Componente que cuida das janelas de "Novo" e "Excluir".

// v10.13: Importação do motor de permissões oficial
import { hasPermission } from '../../config/permissions'; // Explicação: Importa a Regra de Ouro do sistema.

const EventsPage = ({ userData, onSelectEvent, onNavigateToSettings, onChurchChange }) => { // Explicação: Inicia a estrutura da página de gestão de eventos.
  const { setContext, user } = useAuth(); // Explicação: Puxa as funções de posicionamento de GPS e sessão do cérebro de autenticação.
  
  // ESTADOS DE CONTROLE DE INTERFACE
  const [events, setEvents] = useState([]); // Explicação: Guarda a lista de eventos históricos e ao vivo carregados do banco de dados.
  const [showModal, setShowModal] = useState(false); // Explicação: Controla o estado de abertura da janela flutuante de criação de novos ensaios.
  const [showConfigError, setShowConfigError] = useState(false); // Explicação: Aciona o painel de alerta caso a igreja comuns esteja sem a grade padrão de instrumentos.
  const [eventToDelete, setEventToDelete] = useState(null); // Explicação: Armazena temporariamente o identificador do ensaio enviado para a lixeira.
  const [openYears, setOpenYears] = useState({}); // Explicação: Controla de forma isolada quais anos estão abertos na sanfona vertical da tela.
  
  // ESTADOS DE DADOS GEOGRÁFICOS
  const [cidades, setCidades] = useState([]); // Explicação: Lista contendo as comarcas de cidades ligadas à regional do usuário.
  const [comuns, setComuns] = useState([]); // Explicação: Lista de igrejas comuns cadastradas sob os limites da cidade selecionada.
  
  // AUXILIAR DE DATA LOCAL
  const getLocalDate = () => { // Explicação: Função utilitária que calcula e devolve o fuso horário correto no formato YYYY-MM-DD.
    const now = new Date(); // Captura o relógio físico interno do celular.
    const offset = now.getTimezoneOffset(); // Calcula a diferença em minutos para o horário universal de Greenwich.
    const localDate = new Date(now.getTime() - (offset * 60 * 1000)); // Aplica a matemática de compensação de fuso.
    return localDate.toISOString().split('T')[0]; // Corta e devolve apenas a string pura da data atual.
  }; // Explicação: Encerra o método getLocalDate.

  const [newEventDate, setNewEventDate] = useState(getLocalDate()); // Explicação: Inicializa a variável de formulário de data com o dia de hoje corrigido.
  const [responsavel, setResponsavel] = useState(userData?.name || ''); // Explicação: Inicializa o nome do Ancião responsável com o nome do operador como sugestão.

  // --- MATRIZ DE PODER v10.13 ---
  const level = userData?.accessLevel; // Explicação: Captura a string de permissão contida no crachá eletrônico de Claims.
  const isMaster = level === 'master'; // Explicação: Verifica se o operador é o Administrador Supremo do ecossistema.
  const isComissao = level === 'comissao'; // Explicação: Verifica se o operador atua como supervisor da comissão regional.
  const isRegionalCidade = isMaster || isComissao || level === 'regional_cidade'; // Explicação: Define se o usuário administra regiões ou comarcas inteiras.
  const isGemLocal = level === 'gem_local'; // Explicação: Verifica se o cargo é estritamente o de secretário GEM de igreja local.
  const isBasico = level === 'basico'; // Explicação: Identifica se é um músico comum com permissões de apenas leitura.

  // v10.13: Normalização de IDs para evitar erro de Hook (Changed size)
  const selectedCityId = userData?.activeCityId || ''; // Explicação: Mantém uma string estável vazia em caso de carregamento nulo, blindando o React contra quebras.
  const selectedChurchId = userData?.activeComumId || ''; // Explicação: Mantém a string de controle da igreja comum selecionada estável.
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId || ''; // Explicação: Consolida o ID da regional ativa do cabeçalho móvel.

  const permitidasIds = useMemo(() => { // Explicação: Processa em memória RAM a lista de igrejas onde este obreiro possui direito de controle.
    const lista = [userData?.comumId, ...(userData?.acessosPermitidos || [])]; // Une a igreja nativa com os acessos extras de visita de auditoria.
    return [...new Set(lista.filter(id => id))]; // Remove duplicados e expulsa ponteiros vazios de segurança.
  }, [userData]); // Explicação: Só recalcula se a ficha cadastral do usuário for alterada na nuvem.

  // VALIDAÇÃO DE PERMISSÃO TERRITORIAL
  const temPermissaoAqui = useMemo(() => { // Explicação: Lógica de portaria visual que decide se o botão de "Novo Ensaio" deve aparecer na tela.
    if (isBasico) return false; // Explicação: Músicos básicos nunca criam ensaios.
    if (isMaster || isComissao) return true; // Explicação: Níveis master e comissão regional possuem passe livre para abrir eventos em qualquer nó.
    if (level === 'regional_cidade') { // Explicação: Se for gestor de cidade.
        const comumAlvo = comuns.find(c => c.id === selectedChurchId); // Localiza a igreja comum focada na barra superior.
        return comumAlvo && (comumAlvo.cidadeId === userData?.cidadeId); // Permite se a igreja comum pertencer rigorosamente à comarca dele.
    } // Fim da checagem de cidade.
    return permitidasIds.includes(selectedChurchId); // Explicação: Para GEM Local, só acende o botão se a igreja comum selecionada no topo for a dele por direito.
  }, [isMaster, isComissao, isBasico, level, selectedChurchId, userData, comuns, permitidasIds]); // Explicação: Avalia novamente as travas se mudar o foco territorial.

  // 1. MONITOR DE EVENTOS v10.13 - FIX: DEPENDÊNCIA ESTÁVEL
  useEffect(() => { // Explicação: Conecta o ouvinte reativo de banco que escuta a lista de ensaios da comum selecionada.
    if (!userData || !user?.uid) return; // Explicação: Aguarda as chaves de segurança estarem prontas na RAM antes de tocar no servidor.
    const unsubEvents = eventService.subscribeToEvents(userData, (data) => { // Explicação: Chama o serviço passando o crachá do usuário logado.
      setEvents(data); // Explicação: Alimenta a malha reativa de visualização da página principal.
    }); // Encerra o canal.
    return () => unsubEvents && unsubEvents(); // Explicação: Corta o link de rede ao desmontar a página para economizar internet.
  }, [userData, user?.uid]); // Explicação: Matriz estável contendo apenas os dados de autenticação para evitar re-conexões fantasmas.

  // 2. SINCRONIZAÇÃO: REGIONAL -> CIDADE
  useEffect(() => { // Explicação: Monitor que baixa e popula o menu seletor de Cidades baseado na Regional ativa.
    if (!activeRegionalId) return; // Explicação: Aborta se não houver regional definida no topo.
    let isMounted = true; // Explicação: Flag protetora contra vazamento de memória e tentativas de atualização em componentes desmontados.
    const qCid = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId)); // Cria a busca de comarcas na nuvem.
    const unsubCid = onSnapshot(qCid, (sCids) => { // Abre o canal de escuta em tempo real.
      if (!isMounted) return; // Aborta a colagem na tela se o usuário já tiver navegado para outra página.
      const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome })); // Transforma os dados em objetos legíveis.
      if (isComissao || isMaster) { // Explicação: Se for supervisor alto.
        const sorted = todasCidades.sort((a, b) => a.nome.localeCompare(b.nome)); // Organiza a lista de cidades por ordem alfabética de A a Z.
        setCidades(sorted); // Despeja no menu.
      } else { // Explicação: Se for gestor local ou de cidade comum.
        const filtradas = todasCidades.filter(c => c.id === userData?.cidadeId); // Tranca a visualização para exibir apenas a comarca dele.
        setCidades(filtradas.sort((a, b) => a.nome.localeCompare(b.nome))); // Alimenta o menu de forma travada e higienizada.
      } // Encerra a triagem de hierarquia.
    }); // Encerra o snapshot.
    return () => { isMounted = false; unsubCid(); }; // Limpa os listeners de fundo.
  }, [activeRegionalId, isComissao, isMaster, userData?.cidadeId]); // Explicação: Dispara se a regional mestre mudar no topo do app.

  // 3. SINCRONIZAÇÃO: CIDADE -> COMUM
  useEffect(() => { // Explicação: Monitor que puxa a lista de igrejas comuns baseando-se na cidade selecionada no primeiro menu.
    if (!selectedCityId) { setComuns([]); return; } // Explicação: Se desmarcar a cidade, esvazia o seletor de igrejas comuns na hora.
    let isMounted = true; // Flag protetora de vazamento de RAM.
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', selectedCityId)); // Monta a consulta filtrada por cidade no Firestore.
    const unsub = onSnapshot(q, (s) => { // Liga o elo reativo.
      if (!isMounted) return; // Corta se a página foi fechada.
      const list = s.docs.map(d => ({ id: d.id, nome: d.data().comum || "Sem Nome", cidadeId: d.data().cidadeId })); // Mapeia os dados denormalizados.
      const sortedList = list.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena as igrejas por ordem alfabética.
      const filteredList = isRegionalCidade ? sortedList : sortedList.filter(c => permitidasIds.includes(c.id)); // Explicação: Filtra as igrejas do GEM Local exibindo apenas a dele, ou deixa tudo visível se for comissão técnica.
      setComuns(filteredList); // Despeja no menu de pílula preta superior.
      if (filteredList.length === 0) { // Explicação: Se a cidade selecionada não possuir nenhuma igreja comum autorizada para o operador.
        if (selectedChurchId !== '') { // Se havia alguma comum marcada por resíduo de cache.
          setContext('comum', null); // Explicação: Zera o ponteiro GPS no Cérebro Central para limpar fantasmas de tela.
          if (onChurchChange) onChurchChange(null, ''); // Reporta a limpeza para a página mãe superior.
        } // Encerra a limpeza.
      } else { // Explicação: Caso existam igrejas comuns válidas na lista retornada do servidor.
        const comumValida = filteredList.some(c => c.id === selectedChurchId); // Confere se a igreja comum que estava marcada ainda é válida nesta nova lista.
        if (!comumValida && selectedChurchId) { // Explicação: Se a igreja comum anterior sumiu porque mudou a comarca da cidade.
          const primeira = filteredList[0]; // Isola a primeira igreja comum legítima da nova lista.
          setContext('comum', primeira.id); // Força o encaixe automático do GPS nela.
          if (onChurchChange) onChurchChange(primeira.id, primeira.nome); // Avisa o app superior.
        } // Encerra o reposicionamento automático.
      } // Encerra a triagem de segurança.
    }); // Encerra a escuta do Firestore.
    return () => { isMounted = false; unsub(); }; // Executa a limpeza física de hooks ao desmontar.
  }, [selectedCityId, isRegionalCidade, permitidasIds, selectedChurchId]); // Explicação: Vigia as trocas de cidades e permissões hierárquicas.

  // 4. LÓGICA DE AGRUPAMENTO POR ANO
  const groupedEvents = useMemo(() => { // Explicação: Re-organiza a sacola de ensaios transformando-a em blocos separados por ano em memória RAM (Custo Zero).
    if (events.length === 0) return {}; // Retorna objeto vazio se não houver histórico de agendas salvas.
    const combined = [...events]; // Clona a lista de ensaios viva do Firebase.
    combined.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordena as datas colocando as mais atuais na frente.
    return combined.reduce((acc, event) => { // Agrupa os registros passando de ensaio em ensaio.
      const year = event.date ? event.date.split('-')[0] : 'Sem Data'; // Recorta os 4 dígitos iniciais do ano (ex: '2026').
      if (!acc[year]) acc[year] = []; // Se for a primeira ocorrência desse ano na varredura, cria uma gaveta vazia para ele.
      acc[year].push(event); // Chuta o ensaio para dentro da gaveta correspondente do ano.
      return acc; // Devolve o acumulador evoluído.
    }, {}); // Inicializa a sacola do reduce como um objeto vazio de JavaScript.
  }, [events]); // Explicação: Só re-processa o reduce se um ensaio for inserido, editado ou removido da nuvem.

  useEffect(() => { // Explicação: Gatilho inicializado no boot que força o ano corrente (Ex: 2026) a iniciar com a sanfona aberta.
    const currentYear = new Date().getFullYear().toString(); // Captura o ano atual do relógio do smartphone.
    setOpenYears(prev => ({ ...prev, [currentYear]: true })); // Injeta a chave booleana em verdadeiro no dicionário reativo.
  }, []); // Explicação: Roda uma única vez na inicialização da página.

  const handleCreate = async (extendedData = {}) => { // Explicação: Disparada quando o obreiro preenche o formulário e clica em "Confirmar Criação".
    if (!selectedChurchId) return toast.error("Selecione uma comum"); // Impede gravações órfãs se não houver igreja comum amarrada no GPS.
    const comumSelecionada = comuns.find(c => c.id === selectedChurchId); // Localiza os metadados da igreja na memória da página.
    const finalEventData = { // Prepara o documento mestre higienizado e denormalizado (Payload).
      type: extendedData.scope === 'regional' ? 'Ensaio Regional' : 'Ensaio Local', // Define o título baseado no rádio box.
      date: newEventDate, // Vincula a data selecionada do calendário.
      responsavel: responsavel || 'Pendente', // Vincula o nome do Ancião digitado.
      regionalId: activeRegionalId, // Carimba o ID da Regional administrativa.
      comumNome: (comumSelecionada?.nome || userData?.comum || "LOCALIDADE").toUpperCase(), // Força caixa alta no nome textual da igreja comuns para economia de cota de leitura.
      comumId: selectedChurchId, // Carimba a ID estável de propriedade da agenda.
      cidadeId: selectedCityId, // Carimba a ID da comarca da cidade.
      accessLevel: level, // Injeta o nível do criador para segurança.
      ...extendedData // Acopla o escopo (local/regional) e convidados extras selecionados na interface.
    }; // Encerra a montagem do documento.
    try { // Tenta enviar a instrução para a nuvem através do service central.
      // 🚀 AMARRAÇÃO CIRÚRGICA DE ENGENHARIA NA LINHA 162: Repassamos o objeto 'userData' completo para o motor disparar a clonagem nominal em lote do Corpo Orquestral!
      await eventService.createEvent(selectedChurchId, finalEventData, userData);
      setShowModal(false); // Explicação: Fecha o modal de criação de novo ensaio e limpa o fundo escuro.
      toast.success("Ensaio criado!"); // Dispara a etiqueta verde flutuante de sucesso no topo do celular.
    } catch (error) { // Captura e reporta falhas ocorridas na transação atômica.
      setShowModal(false); // Fecha a janela do formulário.
      if (error.message === "CONFIG_REQUIRED") setShowConfigError(true); // Explicação: Se o banco disparar o aviso de erro de grade, abre a tela de reset padrão para a secretaria configurar a orquestra da casa.
      else toast.error(error.message || "Erro ao criar."); // Dispara notificação vermelha amigável de rede.
    } // Encerra o bloco de tratamento.
  }; // Explicação: Encerra a função handleCreate.

  const confirmDelete = async () => { // Explicação: Executa o comando definitivo de remoção física e deleção da agenda da coleção global.
    if (!eventToDelete || !selectedChurchId) return; // Trava contra disparos cegos.
    const targetEvent = events.find(ev => ev.id === eventToDelete); // Encontra a foto do ensaio no cache da página.
    if (targetEvent?.ata?.status === 'closed') { // Explicação: Trava Eclesiástica de Produto: Impede sumariamente a deleção de Atas encerradas e lacradas.
      toast.error("Impossível excluir ensaios lacrados."); // Emite aviso de veto de gestão.
      setEventToDelete(null); // Zera o ponteiro de exclusão.
      return; // Aborta.
    } // Encerra a trava de lacre.
    const toastId = toast.loading("Removendo agenda..."); // Injeta pílula cinza animada de progresso em background.
    try { // Tenta rodar a exclusão física.
      await eventService.deleteEvent(selectedChurchId, eventToDelete); // Aciona o service limpando o nó mestre do Firebase.
      toast.success("Agenda removida!", { id: toastId }); // Substitui a animação pela etiqueta de sucesso na mesma caixa flutuante.
      setEventToDelete(null); // Zera o ponteiro limpando a fila.
    } catch (error) { // Captura falha de rede ou barreira de portaria do Firebase Rules.
      toast.error("Acesso Negado ou Falha de Rede.", { id: toastId }); // Informa restrição de segurança.
      setEventToDelete(null); // Limpa o estado.
    } // Encerra o tratamento.
  }; // Explicação: Encerra a função confirmDelete.

  return ( // Explicação: Desenha a interface na tela.
    <div className="min-h-screen bg-[#F1F5F9] p-4 pb-32 font-sans animate-premium text-left"> {/* Explicação: Janela principal com rolagem vertical livre, fundo cinza-claro e animação premium de entrada. */}
      
      {/* SELETORES HIERÁRQUICOS (GPS) */}
      <div className="mb-6 max-w-md mx-auto flex items-center gap-2 px-1 text-left"> {/* Explicação: Alinha as duas pílulas de rolagem horizontal centralizadas para formato smartphone. */}
        {/* PÍLULA 1: MENU DE CIDADES (FUNDO BRANCO TRANSLÚCIDO) */}
        <div className={`flex-[1_1_0px] flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all text-left ${(!isRegionalCidade || cidades.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}> {/* Explicação: Estilização responsiva: se for GEM Local comum, congela em fosco bloqueando a troca de cidade por segurança territorial. */}
          <MapPin size={10} className="text-blue-600 shrink-0" /> {/* Desenha o ícone de alfinete de GPS azul real. */}
          <select disabled={!isRegionalCidade || cidades.length === 0} value={selectedCityId} onChange={(e) => setContext('city', e.target.value)} className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer text-left"> {/* Explicação: Menu de seleção nativo estilizado em letras maiúsculas micro e formato itálico prêmio. */}
            <option value="">{cidades.length === 0 ? "NENHUMA CIDADE" : isComissao || isMaster ? "CIDADE..." : (userData?.cidadeNome || "SUA CIDADE")}</option> {/* Linha base padrão informativa. */}
            {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)} {/* Mapeia as cidades disponíveis baixadas do banco de dados no menu. */}
          </select> {/* Fecha a tag do seletor. */}
        </div> {/* Fecha a pílula de cidade. */}

        {/* PÍLULA 2: MENU DE IGREJAS COMUNS (PRETO HIGHDENSITY PREMIUM) */}
        <div className={`flex-[1_1_0px] flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl shadow-xl border border-white/10 transition-all text-left ${(!isRegionalCidade || comuns.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}> {/* Explicação: Estilização sofisticada preta em alta densidade com bordas brilhantes sutis. */}
          <Home size={10} className="text-blue-600 shrink-0" /> {/* Desenha o ícone eclesiástico de casa/igreja comum. */}
          <select disabled={!isRegionalCidade || comuns.length === 0} value={selectedChurchId} onChange={(e) => { const com = comuns.find(c => c.id === e.target.value); if (com) { setContext('comum', com.id); if (onChurchChange) onChurchChange(com.id, com.nome); } }} className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer text-left"> {/* Explicação: Modifica a rota de dados do GPS reativo ao selecionar a igreja comune alvo. */}
            <option value="" className="text-slate-900">{cidades.length === 0 ? "AGUARDANDO CIDADE" : comuns.length === 0 ? "VAZIO" : "LOCALIDADE..."}</option> {/* Opção informativa de portaria. */}
            {comuns.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.nome}</option>)} {/* Mapeia as igrejas comuns autorizadas do naipe na listagem do menu. */}
          </select> {/* Fecha o select. */}
        </div> {/* Fecha a pílula de comuns. */}
      </div> {/* Fecha o bloco de cabeçalho GPS. */}

      {/* Botão de Criação de Ensaio Novo */}
      {temPermissaoAqui && selectedChurchId && comuns.length > 0 && ( // Explicação: Validação Tripla de Segurança: Só renderiza o botão se o crachá tiver direito territorial, houver comarca marcada e a lista de comuns não estiver deserta.
        <div className="mb-8 max-w-md mx-auto text-center"> {/* Centraliza o botão na largura mestre do celular. */}
          <button onClick={() => setShowModal(true)} className="w-full bg-slate-950 text-white py-5 rounded-[2.2rem] font-[900] uppercase italic tracking-[0.2em] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all cursor-pointer"> {/* Explicação: Botão largo High-Density com efeito de clique mola elástico (active:scale-95). */}
            <Plus size={20} strokeWidth={3} /> Novo Ensaio {/* Desenha o sinal de mais grosso destacado ao lado do texto. */}
          </button> {/* Encerra o botão. */}
        </div> // Encerra o bloco.
      )}

      {/* Lista de Ensaios Históricos (Componente Isolado Filtrado Cronologicamente) */}
      <EventsList // Explicação: Invocação da lista passando as variáveis e a fiação reativa de herança de estados.
        groupedEvents={groupedEvents} // Entrega os ensaios organizados por abas de anos calculated em cache RAM.
        openYears={openYears} // Passa o dicionário contendo os anos abertos ou fechados na sanfona.
        toggleYear={(y) => setOpenYears(prev => ({ ...prev, [y]: !prev[y] }))} // Passa a callback para inverter o recolhimento do ano.
        onSelectEvent={onSelectEvent} // Repassa o direcionador para abrir a página do contador do ensaio focado.
        setEventToDelete={setEventToDelete} // Repassa a caneta que joga o ensaio na fila da lixeira.
        temPermissaoAqui={temPermissaoAqui} // Informa as diretivas de poder genéricas.
        userData={userData} // Entrega o crachá eletrônico completo para os botões do cartão avaliarem permissões.
      /> {/* Encerra o EventsList. */}

      {/* Componente Modular que Agrupa as Janelas Modais Flutuantes do Lobby */}
      <EventModals // Explicação: Invoca as janelas modais injetando os estados de formulários e os salvamentos.
        showModal={showModal} setShowModal={setShowModal} // Passa o controle de abertura do formulário de novo ensaio.
        newEventDate={newEventDate} setNewEventDate={setNewEventDate} // Passa o calendário reativo.
        responsavel={responsavel} setResponsavel={setResponsavel} // Passa o input do Ancião de atendimento.
        handleCreate={handleCreate} // Entrega a subrotina que salva o ensaio na nuvem.
        showConfigError={showConfigError} setShowConfigError={setShowConfigError} // Passa o controle da janela de erro de grade instrumental.
        isGemLocal={isGemLocal} onNavigateToSettings={onNavigateToSettings} // Repassa os atalhos de portaria.
        eventToDelete={eventToDelete} setEventToDelete={setEventToDelete} // Passa o controle da lixeira de confirmação.
        confirmDelete={confirmDelete} // Entrega a subrotina que executa a remoção física no Firebase.
        isRegionalCidade={isRegionalCidade} // Passa as flags hierárquicas de cidade.
        userData={userData} // Entrega o crachá unificado de Claims.
      /> {/* Encerra as Modais. */}
    </div> // Encerra a div raiz da página.
  ); // Encerra o return.
}; // Explicação: Encerra o componente mestre EventsPage.

export default EventsPage; // Explicação: Exporta a interface mestre de listagem, totalmente acoplada e com a fiação de injeção nominal de rede ativada.