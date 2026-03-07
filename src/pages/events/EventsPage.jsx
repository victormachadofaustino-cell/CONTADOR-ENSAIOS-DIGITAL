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

// v10.5: Importação do motor de permissões para validar ações em tempo real
import { hasPermission } from '../../config/permissions'; // Explicação: Importa a Regra de Ouro do sistema.

const EventsPage = ({ userData, onSelectEvent, onNavigateToSettings, onChurchChange }) => { 
  const { setContext, user } = useAuth(); // Explicação: Puxa funções do cérebro de autenticação.
  
  // ESTADOS DE CONTROLE DE INTERFACE
  const [events, setEvents] = useState([]); // Explicação: Guarda os eventos carregados do banco.
  const [showModal, setShowModal] = useState(false); // Explicação: Controla a janela de novo ensaio.
  const [showConfigError, setShowConfigError] = useState(false); // Explicação: Alerta falta de configuração da igreja.
  const [eventToDelete, setEventToDelete] = useState(null); // Explicação: Guarda qual ensaio será apagado.
  const [openYears, setOpenYears] = useState({}); // Explicação: Controla a sanfona de anos.
  
  // ESTADOS DE DADOS GEOGRÁFICOS
  const [cidades, setCidades] = useState([]); // Explicação: Cidades disponíveis para o gestor.
  const [comuns, setComuns] = useState([]); // Explicação: Igrejas da cidade selecionada.
  
  // AUXILIAR DE DATA LOCAL
  const getLocalDate = () => { // Explicação: Garante que a data do novo ensaio seja a de hoje.
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [newEventDate, setNewEventDate] = useState(getLocalDate()); // Explicação: Data inicial do formulário.
  const [responsavel, setResponsavel] = useState(userData?.name || ''); // Explicação: Nome do ancião responsável.

  // --- MATRIZ DE PODER v2.2 ---
  const level = userData?.accessLevel; 
  const isMaster = level === 'master'; 
  const isComissao = level === 'comissao'; 
  const isRegionalCidade = isMaster || isComissao || level === 'regional_cidade'; 
  const isGemLocal = level === 'gem_local'; 
  const isBasico = level === 'basico'; 

  const selectedCityId = userData?.activeCityId || userData?.cidadeId || ''; 
  const selectedChurchId = userData?.activeComumId || userData?.comumId || ''; 
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId; 

  const permitidasIds = useMemo(() => { // Explicação: Igrejas onde o usuário pode gerenciar.
    const lista = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    return [...new Set(lista.filter(id => id))];
  }, [userData]);

  // VALIDAÇÃO DE PERMISSÃO TERRITORIAL (Sincronizada v10.5)
  const temPermissaoAqui = useMemo(() => { // Explicação: Decide se o usuário pode CRIAR ensaios na igreja selecionada.
    if (isBasico) return false; 
    if (isMaster || isComissao) return true; 
    if (level === 'regional_cidade') { 
        const comumAlvo = comuns.find(c => c.id === selectedChurchId);
        return comumAlvo && (comumAlvo.cidadeId === userData?.cidadeId);
    }
    return permitidasIds.includes(selectedChurchId); 
  }, [isMaster, isComissao, isBasico, level, selectedChurchId, userData, comuns, permitidasIds]);

  // 1. MONITOR DE EVENTOS OTIMIZADO
  useEffect(() => { 
    if (!userData || !user?.uid) return;
    const unsubEvents = eventService.subscribeToEvents(userData, (data) => {
      setEvents(data); 
    });
    return () => unsubEvents && unsubEvents(); 
  }, [userData, user?.uid, selectedChurchId]); 

  // 2. SINCRONIZAÇÃO: REGIONAL -> CIDADE
  useEffect(() => { 
    if (!activeRegionalId) return;
    let isMounted = true;
    const qCid = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    const unsubCid = onSnapshot(qCid, (sCids) => {
      if (!isMounted) return;
      const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome }));
      if (isComissao || isMaster) { 
        const sorted = todasCidades.sort((a, b) => a.nome.localeCompare(b.nome));
        setCidades(sorted);
      } else { 
        const filtradas = todasCidades.filter(c => c.id === userData?.cidadeId);
        setCidades(filtradas.sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    });
    return () => { isMounted = false; unsubCid(); };
  }, [activeRegionalId, isComissao, isMaster, userData?.cidadeId]); 

  // 3. SINCRONIZAÇÃO: CIDADE -> COMUM
  useEffect(() => { 
    if (!selectedCityId) { setComuns([]); return; }
    let isMounted = true;
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', selectedCityId));
    const unsub = onSnapshot(q, (s) => {
      if (!isMounted) return;
      const list = s.docs.map(d => ({ id: d.id, nome: d.data().comum || "Sem Nome", cidadeId: d.data().cidadeId }));
      const sortedList = list.sort((a, b) => a.nome.localeCompare(b.nome));
      const filteredList = isRegionalCidade ? sortedList : sortedList.filter(c => permitidasIds.includes(c.id));
      setComuns(filteredList);
      if (filteredList.length === 0) {
        if (selectedChurchId !== null && selectedChurchId !== '') {
          setContext('comum', null);
          if (onChurchChange) onChurchChange(null, '');
        }
      } else {
        const comumValida = filteredList.some(c => c.id === selectedChurchId);
        if (!comumValida && selectedChurchId) {
          const primeira = filteredList[0];
          setContext('comum', primeira.id);
          if (onChurchChange) onChurchChange(primeira.id, primeira.nome);
        }
      }
    });
    return () => { isMounted = false; unsub(); };
  }, [selectedCityId, isRegionalCidade, permitidasIds, selectedChurchId]);

  // 4. LÓGICA DE AGRUPAMENTO POR ANO
  const groupedEvents = useMemo(() => { 
    if (events.length === 0) return {};
    const combined = [...events];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    return combined.reduce((acc, event) => {
      const year = event.date ? event.date.split('-')[0] : 'Sem Data';
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});
  }, [events]);

  useEffect(() => { 
    const currentYear = new Date().getFullYear().toString();
    setOpenYears(prev => ({ ...prev, [currentYear]: true }));
  }, []);

  const handleCreate = async (extendedData = {}) => { // Explicação: Cria o ensaio no Firebase.
    if (!selectedChurchId) return toast.error("Selecione uma comum");
    const comumSelecionada = comuns.find(c => c.id === selectedChurchId);
    const finalEventData = {
      type: extendedData.scope === 'regional' ? 'Ensaio Regional' : 'Ensaio Local',
      date: newEventDate,
      responsavel: responsavel || 'Pendente',
      regionalId: activeRegionalId,
      comumNome: (comumSelecionada?.nome || userData?.comum || "LOCALIDADE").toUpperCase(),
      comumId: selectedChurchId,
      cidadeId: selectedCityId,
      accessLevel: level, 
      ...extendedData 
    };
    try {
      await eventService.createEvent(selectedChurchId, finalEventData);
      setShowModal(false);
      toast.success("Ensaio criado!");
    } catch (error) { 
      setShowModal(false);
      if (error.message === "CONFIG_REQUIRED") setShowConfigError(true);
      else toast.error(error.message || "Erro ao criar."); 
    }
  };

  // v10.5: FUNÇÃO DE EXCLUSÃO CORRIGIDA COM TRATAMENTO DE ERRO
  const confirmDelete = async () => { // Explicação: Executa o comando de apagar o ensaio.
    if (!eventToDelete || !selectedChurchId) return;
    
    const targetEvent = events.find(ev => ev.id === eventToDelete);
    if (targetEvent?.ata?.status === 'closed') { 
      toast.error("Impossível excluir ensaios lacrados.");
      setEventToDelete(null);
      return;
    }

    const toastId = toast.loading("Removendo agenda..."); // Explicação: Feedback visual de carregamento.

    try {
      // Explicação: Tenta apagar usando o motor oficial.
      await eventService.deleteEvent(selectedChurchId, eventToDelete);
      toast.success("Agenda removida!", { id: toastId }); // Explicação: Avisa que funcionou.
      setEventToDelete(null);
    } catch (error) { 
      console.error("ERRO_UI_DELETE:", error);
      // Explicação: Se o banco de dados negar (como o GEM tentando apagar um Regional), avisa agora.
      toast.error("Acesso Negado ou Falha de Rede.", { id: toastId }); 
      setEventToDelete(null);
    }
  };

  return ( // Explicação: Desenha a interface na tela.
    <div className="min-h-screen bg-[#F1F5F9] p-4 pb-32 font-sans animate-premium text-left">
      
      {/* SELETORES HIERÁRQUICOS (GPS) */}
      <div className="mb-6 max-w-md mx-auto flex items-center gap-2 px-1">
        <div className={`flex-[1_1_0px] flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all ${(!isRegionalCidade || cidades.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
          <MapPin size={10} className="text-blue-600 shrink-0" />
          <select disabled={!isRegionalCidade || cidades.length === 0} value={selectedCityId} onChange={(e) => setContext('city', e.target.value)} className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer">
            <option value="">{cidades.length === 0 ? "NENHUMA CIDADE" : isComissao || isMaster ? "CIDADE..." : (userData?.cidadeNome || "SUA CIDADE")}</option>
            {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className={`flex-[1_1_0px] flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl shadow-xl border border-white/10 transition-all ${(!isRegionalCidade || comuns.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
          <Home size={10} className="text-blue-600 shrink-0" />
          <select disabled={!isRegionalCidade || comuns.length === 0} value={selectedChurchId || ''} onChange={(e) => { const com = comuns.find(c => c.id === e.target.value); if (com) { setContext('comum', com.id); if (onChurchChange) onChurchChange(com.id, com.nome); } }} className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer">
            <option value="" className="text-slate-900">{cidades.length === 0 ? "AGUARDANDO CIDADE" : comuns.length === 0 ? "VAZIO" : "LOCALIDADE..."}</option>
            {comuns.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Botão de Criação: Só aparece se o usuário tiver permissão territorial para a igreja selecionada */}
      {temPermissaoAqui && selectedChurchId && comuns.length > 0 && (
        <div className="mb-8 max-w-md mx-auto">
          <button onClick={() => setShowModal(true)} className="w-full bg-slate-950 text-white py-5 rounded-[2.2rem] font-[900] uppercase italic tracking-[0.2em] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all">
            <Plus size={20} strokeWidth={3} /> Novo Ensaio
          </button>
        </div>
      )}

      {/* Lista de Ensaios */}
      <EventsList 
        groupedEvents={groupedEvents}
        openYears={openYears}
        toggleYear={(y) => setOpenYears(prev => ({ ...prev, [y]: !prev[y] }))}
        onSelectEvent={onSelectEvent}
        setEventToDelete={setEventToDelete}
        temPermissaoAqui={temPermissaoAqui}
        userData={userData}
      />

      {/* Janelas Modais (Novo/Excluir/Erro) */}
      <EventModals 
        showModal={showModal} setShowModal={setShowModal}
        newEventDate={newEventDate} setNewEventDate={setNewEventDate}
        responsavel={responsavel} setResponsavel={setResponsavel}
        handleCreate={handleCreate}
        showConfigError={showConfigError} setShowConfigError={setShowConfigError}
        isGemLocal={isGemLocal} onNavigateToSettings={onNavigateToSettings}
        eventToDelete={eventToDelete} setEventToDelete={setEventToDelete}
        confirmDelete={confirmDelete}
        isRegionalCidade={isRegionalCidade} 
        userData={userData}
      />
    </div>
  );
};

export default EventsPage; // Explicação: Exporta a página configurada para o sistema.