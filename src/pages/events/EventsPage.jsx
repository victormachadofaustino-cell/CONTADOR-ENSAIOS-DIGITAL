import React, { useState, useEffect, useMemo } from 'react';
// Ajuste de nível: Subindo dois níveis para chegar em src/config
import { db, collection, onSnapshot, query, where, orderBy } from '../../config/firebase';
import { eventService } from '../../services/eventService';

// CORREÇÃO DE CAMINHO: AtaPage está na mesma pasta (/events)
import AtaPage from './AtaPage'; 

import toast from 'react-hot-toast';
import { 
  Calendar, User, Lock, Trash2, Plus, X, Send, ChevronDown, Clock, ShieldCheck, MapPin, Home, AlertTriangle, Settings, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Importação do Cérebro de Autenticação (GPS de Acessos v2.1)
import { useAuth } from '../../context/AuthContext';

let debounceTimers = {};

const EventsPage = ({ userData, allEvents, onSelectEvent, onNavigateToSettings, onChurchChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [showConfigError, setShowConfigError] = useState(false); // Modal de erro de conformidade
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState('Ensaio Local');
  const [responsavel, setResponsavel] = useState(userData?.name || '');
  const [eventToDelete, setEventToDelete] = useState(null);
  const [openYears, setOpenYears] = useState({});

  const [cidades, setCidades] = useState([]);
  const [comuns, setComuns] = useState([]);
  
  // --- LÓGICA DE COMPETÊNCIAS v2.1 (MATRIZ DE PODER) ---
  const { setContext } = useAuth();
  const level = userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';

  // REGRA DE OURO: Inicializa com os dados do perfil do usuário, mas permite alteração pelo contexto ativo (GPS Global)
  const selectedCityId = userData?.activeCityId || userData?.cidadeId || '';
  const selectedChurchId = userData?.activeComumId || userData?.comumId || '';

  // Lista de IDs permitidos para este usuário (Sua comum + acessos manuais)
  const permitidasIds = useMemo(() => {
    const lista = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    return [...new Set(lista.filter(id => id))];
  }, [userData]);

  // DEFINE PERMISSÃO: Baseado na jurisdição ativa e no nível de acesso
  const temPermissaoCriarAqui = useMemo(() => {
    if (isBasico) return false; 
    if (isMaster || isComissao) return true; 
    
    // Nível Regional de Cidade: Pode criar em qualquer comum que pertença à sua CIDADE
    if (level === 'regional_cidade') {
        const comumAlvo = comuns.find(c => c.id === selectedChurchId);
        return comumAlvo && (comumAlvo.cidadeId === userData?.cidadeId || permitidasIds.includes(selectedChurchId));
    }

    return permitidasIds.includes(selectedChurchId);
  }, [isMaster, isComissao, isBasico, level, selectedChurchId, userData, comuns, permitidasIds]);

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. SINCRONIZAÇÃO DE CASCATA: REGIONAL -> CIDADE
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
        // Higiene: Se a regional for vazia, reseta a cidade ativa
        if (sorted.length === 0) setContext('city', null);
      } else {
        // Regional Cidade vê apenas a sua cidade de cadastro
        const filtradas = todasCidades.filter(c => c.id === userData?.cidadeId);
        setCidades(filtradas.sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    });

    return () => { isMounted = false; unsubCid(); };
  }, [activeRegionalId, isComissao, userData?.cidadeId]); 

  // 2. SINCRONIZAÇÃO DE CASCATA: CIDADE -> COMUM (REATIVIDADE DE TROCA)
  useEffect(() => {
    if (!selectedCityId) {
      setComuns([]);
      return;
    }
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
      
      // Filtro de visualização conforme nível
      const filteredList = (isRegionalCidade) 
        ? sortedList
        : sortedList.filter(c => permitidasIds.includes(c.id));
      
      setComuns(filteredList);

      // --- CORREÇÃO DEFINITIVA (VÍDEO) ---
      if (filteredList.length === 0) {
        if (selectedChurchId !== null) {
          setContext('comum', null);
          if (onChurchChange) onChurchChange(null, '');
        }
      } else {
        const comumValidaNestaCidade = filteredList.some(c => c.id === selectedChurchId);
        if (!comumValidaNestaCidade) {
          const primeira = filteredList[0];
          setContext('comum', primeira.id);
          if (onChurchChange) onChurchChange(primeira.id, primeira.nome);
        }
      }
    });

    return () => { isMounted = false; unsub(); };
  }, [selectedCityId, isRegionalCidade, permitidasIds, selectedChurchId]);

  // 3. LÓGICA DE AGRUPAMENTO (TRAVA DE SEGURANÇA ANTIFANTASMA)
  const groupedEvents = useMemo(() => {
    const isComumValida = comuns.some(c => c.id === selectedChurchId);
    if (!selectedChurchId || comuns.length === 0 || !isComumValida) return {};

    const list = allEvents || []; 
    return list.reduce((acc, event) => {
      const year = event.date ? event.date.split('-')[0] : 'Sem Data';
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});
  }, [allEvents, selectedChurchId, comuns]);

  const years = Object.keys(groupedEvents).sort((a, b) => b - a);
  const toggleYear = (year) => setOpenYears(prev => ({ ...prev, [year]: !prev[year] }));
  
  const formatMonth = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return '---';
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const m = parseInt(dateStr.split('-')[1]) - 1;
    return months[m] || '---';
  };

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
      if (error.message === "CONFIG_REQUIRED") {
        setShowModal(false);
        setShowConfigError(true);
      } else {
        console.error("Erro na criação:", error);
        toast.error("Erro ao criar."); 
      }
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete || !selectedChurchId) return;
    const targetEvent = allEvents.find(ev => ev.id === eventToDelete);
    if (targetEvent?.ata?.status === 'closed') {
      toast.error("Ensaios lacrados não podem ser excluídos.");
      setEventToDelete(null);
      return;
    }

    try {
      await eventService.deleteEvent(selectedChurchId, eventToDelete);
      toast.success("Ensaio removido!");
      setEventToDelete(null);
    } catch (error) { 
      console.error("Erro na exclusão:", error);
      toast.error("Erro ao excluir."); 
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 pb-32 font-sans animate-premium text-left">
      
      {/* SELETORES HIERÁRQUICOS (Garantia de Jurisdição v2.1) */}
      <div className="mb-6 max-w-md mx-auto flex items-center gap-2 px-1">
        <div className={`flex-1 flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-white shadow-sm transition-all ${(!isRegionalCidade || cidades.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
          <MapPin size={10} className="text-blue-600 shrink-0" />
          <select 
            disabled={!isRegionalCidade || cidades.length === 0}
            value={selectedCityId} 
            onChange={(e) => setContext('city', e.target.value)}
            className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer"
          >
            <option value="">{cidades.length === 0 ? "NENHUMA CIDADE" : isComissao ? "CIDADE..." : (userData?.cidadeNome || "SUA CIDADE")}</option>
            {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className={`flex-1 flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl shadow-xl border border-white/10 transition-all ${(!isRegionalCidade || comuns.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
          <Home size={10} className="text-blue-600 shrink-0" />
          <select 
            disabled={!isRegionalCidade || comuns.length === 0}
            value={selectedChurchId || ''} 
            onChange={(e) => {
                const com = comuns.find(c => c.id === e.target.value);
                if (com) {
                    setContext('comum', com.id);
                    if (onChurchChange) onChurchChange(com.id, com.nome);
                }
            }}
            className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer"
          >
            <option value="" className="text-slate-900">
              {cidades.length === 0 ? "AGUARDANDO CIDADE" : comuns.length === 0 ? "VAZIO" : "LOCALIDADE..."}
            </option>
            {comuns.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.nome}</option>)}
          </select>
        </div>
      </div>

      {temPermissaoCriarAqui && selectedChurchId && comuns.length > 0 && (
        <div className="mb-8 max-w-md mx-auto">
          <button onClick={() => setShowModal(true)} className="w-full bg-slate-950 text-white py-5 rounded-[2.2rem] font-[900] uppercase italic tracking-[0.2em] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all">
            <Plus size={20} strokeWidth={3} /> Novo Ensaio
          </button>
        </div>
      )}

      <div className="space-y-8 max-w-md mx-auto">
        {(!selectedChurchId || years.length === 0) ? (
          <div className="text-center py-16 px-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center">
            {comuns.length === 0 ? (
              <>
                <Building2 className="text-blue-100 mb-4" size={56} />
                <p className="text-slate-950 font-[900] uppercase italic text-xs tracking-tight mb-2">Cidade sem Localidades</p>
                <p className="text-slate-400 font-bold uppercase text-[8px] leading-relaxed mb-8 max-w-[200px] mx-auto">Não existem comuns cadastradas para esta cidade no banco de dados.</p>
                {isComissao && (
                  <button onClick={onNavigateToSettings} className="bg-blue-50 text-blue-600 px-6 py-3 rounded-xl font-black uppercase text-[9px] italic flex items-center gap-2 active:scale-95 transition-all">
                    <Settings size={14} /> Cadastrar Comum em Ajustes
                  </button>
                )}
              </>
            ) : (
              <>
                <Calendar className="mx-auto text-slate-100 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase italic text-[10px] tracking-[0.4em]">Agenda Vazia</p>
              </>
            )}
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="space-y-4">
              <button onClick={() => toggleYear(year)} className="flex items-center gap-4 w-full px-2 group active:opacity-60 transition-all">
                <span className="text-3xl font-[900] italic text-slate-950 tracking-tighter">{year}</span>
                <div className="h-[2px] flex-1 bg-slate-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                    <ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${openYears[year] ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openYears[year] && (
                <div className="space-y-4 animate-in">
                  {groupedEvents[year].map(e => {
                    const isClosed = e.ata?.status === 'closed';
                    return (
                      <div key={e.id} onClick={() => onSelectEvent(e.id)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group">
                        <div className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? 'bg-slate-300' : 'bg-amber-50'}`} />
                        <div className="flex items-center gap-5">
                          <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-[1.8rem] border-2 ${isClosed ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-950 text-slate-950 shadow-md'}`}>
                            <span className="text-2xl font-[900] italic">{e.date?.split('-')[2] || '--'}</span>
                            <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{formatMonth(e.date)}</span>
                          </div>
                          <div className="text-left leading-none">
                            <p className={`text-[8px] font-black uppercase italic tracking-[0.2em] mb-1.5 ${isClosed ? 'text-slate-300' : 'text-amber-500'}`}>{e.type || 'Ensaio Local'}</p>
                            <h4 className={`text-[13px] font-[900] uppercase italic tracking-tighter ${isClosed ? 'text-slate-400' : 'text-slate-950'}`}>Resp: {e.responsavel}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isClosed ? <Lock size={16} className="text-slate-200" /> : <ShieldCheck size={16} className="text-emerald-500 animate-pulse" />}
                          
                          {temPermissaoCriarAqui && !isClosed && (
                            <button onClick={(ex) => { ex.stopPropagation(); setEventToDelete(e.id); }} className="bg-red-50 text-red-400 p-3 rounded-2xl active:bg-red-500 active:text-white transition-all shadow-sm">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-[340px] rounded-[3rem] p-8 shadow-2xl relative text-left overflow-hidden border border-white/20">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90"><X size={18}/></button>
              <h3 className="text-xl font-[900] uppercase italic text-slate-950 mb-8 leading-none tracking-tighter">Novo Registro</h3>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Tipo de Evento</label>
                  <select disabled className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none opacity-60" value="Ensaio Local">
                     <option value="Ensaio Local">Ensaio Local</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Data Agendada</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black outline-none" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Responsável / Encarregado</label>
                  <input type="text" placeholder="Nome completo" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black outline-none uppercase placeholder:text-slate-300 shadow-inner" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
                </div>
              </div>
              <button onClick={handleCreate} className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 active:scale-95 shadow-xl mt-10 transition-all border border-white/10"><Send size={16}/> Confirmar Agenda</button>
            </div>
          </div>
        )}

        {showConfigError && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-white w-full max-w-[320px] rounded-[3rem] p-10 text-center shadow-2xl relative border border-slate-100">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertTriangle size={40} /></div>
              <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-4 tracking-tighter leading-none">Orquestra Ausente</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-10">Esta localidade ainda não possui uma orquestra configurada. É necessário definir os instrumentos antes de agendar ensaios.</p>
              
              <div className="space-y-3">
                {isGemLocal && (
                  <button 
                    onClick={() => { setShowConfigError(false); onNavigateToSettings(); }} 
                    className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-3"
                  >
                    <Settings size={16} /> Configurar Agora
                  </button>
                )}
                <button onClick={() => setShowConfigError(false)} className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest">Entendido</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {eventToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl relative border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={24} /></div>
            <h3 className="text-lg font-[900] uppercase italic text-slate-950 tracking-tighter leading-tight">Remover Agenda?</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-8 leading-relaxed">Todos os dados e contagens deste ensaio serão permanentemente excluídos.</p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDelete} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-100">Sim, Remover Ensaio</button>
              <button onClick={() => setEventToDelete(null)} className="w-full py-2 font-black uppercase text-[9px] text-slate-300 tracking-widest">Manter Ensaio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;