import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, where, orderBy } from '../../config/firebase';
import { eventService } from '../../services/eventService';

import toast from 'react-hot-toast';
import { Plus, MapPin, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// IMPORTAÇÃO DOS NOVOS COMPONENTES MODULARES
import EventsList from './components/EventsList';
import EventModals from './components/EventModals';

const EventsPage = ({ userData, allEvents, onSelectEvent, onNavigateToSettings, onChurchChange }) => {
  const { setContext } = useAuth();
  
  // ESTADOS DE CONTROLE DE INTERFACE
  const [showModal, setShowModal] = useState(false);
  const [showConfigError, setShowConfigError] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [openYears, setOpenYears] = useState({});

  // ESTADOS DE DADOS GEOGRÁFICOS
  const [cidades, setCidades] = useState([]);
  const [comuns, setComuns] = useState([]);
  
  // AUXILIAR DE DATA LOCAL
  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [newEventDate, setNewEventDate] = useState(getLocalDate());
  const [responsavel, setResponsavel] = useState(userData?.name || '');

  // --- MATRIZ DE PODER v2.1 ---
  const level = userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  // CORREÇÃO CRÍTICA: isGemLocal definida para o componente EventModals
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';

  const selectedCityId = userData?.activeCityId || userData?.cidadeId || '';
  const selectedChurchId = userData?.activeComumId || userData?.comumId || '';
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  const permitidasIds = useMemo(() => {
    const lista = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    return [...new Set(lista.filter(id => id))];
  }, [userData]);

  // VALIDAÇÃO DE PERMISSÃO TERRITORIAL
  const temPermissaoAqui = useMemo(() => {
    if (isBasico) return false; 
    if (isMaster || isComissao) return true; 
    if (level === 'regional_cidade') {
        const comumAlvo = comuns.find(c => c.id === selectedChurchId);
        return comumAlvo && (comumAlvo.cidadeId === userData?.cidadeId);
    }
    return permitidasIds.includes(selectedChurchId);
  }, [isMaster, isComissao, isBasico, level, selectedChurchId, userData, comuns, permitidasIds]);

  // 1. SINCRONIZAÇÃO: REGIONAL -> CIDADE
  useEffect(() => {
    if (!activeRegionalId) return;
    let isMounted = true;
    const qCid = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    const unsubCid = onSnapshot(qCid, (sCids) => {
      if (!isMounted) return;
      const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome }));
      if (isComissao) {
        const sorted = todasCidades.sort((a, b) => a.nome.localeCompare(b.nome));
        setCidades(sorted);
        if (sorted.length === 0) setContext('city', null);
      } else {
        const filtradas = todasCidades.filter(c => c.id === userData?.cidadeId);
        setCidades(filtradas.sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    });
    return () => { isMounted = false; unsubCid(); };
  }, [activeRegionalId, isComissao, userData?.cidadeId]); 

  // 2. SINCRONIZAÇÃO: CIDADE -> COMUM
  useEffect(() => {
    if (!selectedCityId) { setComuns([]); return; }
    let isMounted = true;
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', selectedCityId));
    const unsub = onSnapshot(q, (s) => {
      if (!isMounted) return;
      const list = s.docs.map(d => ({ 
        id: d.id, 
        nome: d.data().comum || "Sem Nome",
        cidadeId: d.data().cidadeId 
      }));
      const sortedList = list.sort((a, b) => a.nome.localeCompare(b.nome));
      const filteredList = isRegionalCidade ? sortedList : sortedList.filter(c => permitidasIds.includes(c.id));
      setComuns(filteredList);

      if (filteredList.length === 0) {
        if (selectedChurchId !== null) {
          setContext('comum', null);
          if (onChurchChange) onChurchChange(null, '');
        }
      } else {
        const comumValida = filteredList.some(c => c.id === selectedChurchId);
        if (!comumValida) {
          const primeira = filteredList[0];
          setContext('comum', primeira.id);
          if (onChurchChange) onChurchChange(primeira.id, primeira.nome);
        }
      }
    });
    return () => { isMounted = false; unsub(); };
  }, [selectedCityId, isRegionalCidade, permitidasIds, selectedChurchId]);

  // 3. LÓGICA DE AGRUPAMENTO POR ANO
  const groupedEvents = useMemo(() => {
    const isComumValida = comuns.some(c => c.id === selectedChurchId);
    if (!selectedChurchId || comuns.length === 0 || !isComumValida) return {};
    return (allEvents || []).reduce((acc, event) => {
      const year = event.date ? event.date.split('-')[0] : 'Sem Data';
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});
  }, [allEvents, selectedChurchId, comuns]);

  useEffect(() => {
    const currentYear = new Date().getFullYear().toString();
    setOpenYears(prev => ({ ...prev, [currentYear]: true }));
  }, []);

  const handleCreate = async () => {
    if (!selectedChurchId) return toast.error("Selecione uma comum");
    const comumSelecionada = comuns.find(c => c.id === selectedChurchId);
    try {
      await eventService.createEvent(selectedChurchId, {
        type: 'Ensaio Local',
        date: newEventDate,
        responsavel: responsavel || 'Pendente',
        regionalId: activeRegionalId,
        comumNome: (comumSelecionada?.nome || userData?.comum || "LOCALIDADE").toUpperCase(),
        comumId: selectedChurchId,
        cidadeId: selectedCityId
      });
      setShowModal(false);
      toast.success("Ensaio criado!");
    } catch (error) { 
      setShowModal(false);
      if (error.message === "CONFIG_REQUIRED") setShowConfigError(true);
      else toast.error("Erro ao criar."); 
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete || !selectedChurchId) return;
    const targetEvent = allEvents.find(ev => ev.id === eventToDelete);
    if (targetEvent?.ata?.status === 'closed') {
      toast.error("Impossível excluir ensaios lacrados.");
      setEventToDelete(null);
      return;
    }
    try {
      await eventService.deleteEvent(selectedChurchId, eventToDelete);
      toast.success("Agenda removida!");
      setEventToDelete(null);
    } catch (error) { toast.error("Erro na exclusão."); }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 pb-32 font-sans animate-premium text-left">
      
      {/* SELETORES HIERÁRQUICOS (GPS) */}
      <div className="mb-6 max-w-md mx-auto flex items-center gap-2 px-1">
        <div className={`flex-1 flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all ${(!isRegionalCidade || cidades.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
          <MapPin size={10} className="text-blue-600 shrink-0" />
          <select disabled={!isRegionalCidade || cidades.length === 0} value={selectedCityId} onChange={(e) => setContext('city', e.target.value)} className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer">
            <option value="">{cidades.length === 0 ? "NENHUMA CIDADE" : isComissao ? "CIDADE..." : (userData?.cidadeNome || "SUA CIDADE")}</option>
            {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className={`flex-1 flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl shadow-xl border border-white/10 transition-all ${(!isRegionalCidade || comuns.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
          <Home size={10} className="text-blue-600 shrink-0" />
          <select disabled={!isRegionalCidade || comuns.length === 0} value={selectedChurchId || ''} onChange={(e) => { const com = comuns.find(c => c.id === e.target.value); if (com) { setContext('comum', com.id); if (onChurchChange) onChurchChange(com.id, com.nome); } }} className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer">
            <option value="" className="text-slate-900">{cidades.length === 0 ? "AGUARDANDO CIDADE" : comuns.length === 0 ? "VAZIO" : "LOCALIDADE..."}</option>
            {comuns.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.nome}</option>)}
          </select>
        </div>
      </div>

      {/* BOTÃO DE AÇÃO PRINCIPAL */}
      {temPermissaoAqui && selectedChurchId && comuns.length > 0 && (
        <div className="mb-8 max-w-md mx-auto">
          <button onClick={() => setShowModal(true)} className="w-full bg-slate-950 text-white py-5 rounded-[2.2rem] font-[900] uppercase italic tracking-[0.2em] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all">
            <Plus size={20} strokeWidth={3} /> Novo Ensaio
          </button>
        </div>
      )}

      {/* LISTAGEM MODULAR */}
      <EventsList 
        groupedEvents={groupedEvents}
        openYears={openYears}
        toggleYear={(y) => setOpenYears(prev => ({ ...prev, [y]: !prev[y] }))}
        onSelectEvent={onSelectEvent}
        setEventToDelete={setEventToDelete}
        temPermissaoAqui={temPermissaoAqui}
      />

      {/* MODAIS MODULARES */}
      <EventModals 
        showModal={showModal} setShowModal={setShowModal}
        newEventDate={newEventDate} setNewEventDate={setNewEventDate}
        responsavel={responsavel} setResponsavel={setResponsavel}
        handleCreate={handleCreate}
        showConfigError={showConfigError} setShowConfigError={setShowConfigError}
        isGemLocal={isGemLocal} onNavigateToSettings={onNavigateToSettings}
        eventToDelete={eventToDelete} setEventToDelete={setEventToDelete}
        confirmDelete={confirmDelete}
      />
    </div>
  );
};

export default EventsPage;