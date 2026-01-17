import React, { useState, useEffect, useMemo } from 'react';
// Ajuste de nível: Subindo dois níveis para chegar em src/config
import { db, collection, onSnapshot, query, where, orderBy } from '../../config/firebase';
import { eventService } from '../../services/eventService';

// CORREÇÃO DE CAMINHO: AtaPage está na mesma pasta (/events)
import AtaPage from './AtaPage'; 

import toast from 'react-hot-toast';
import { 
  Calendar, User, Lock, Trash2, Plus, X, Send, ChevronDown, Clock, ShieldCheck, MapPin, Home 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EventsPage = ({ userData, isAdmin, onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState('Ensaio Local');
  const [responsavel, setResponsavel] = useState(userData?.name || '');
  const [eventToDelete, setEventToDelete] = useState(null);
  const [openYears, setOpenYears] = useState({});

  const [cidades, setCidades] = useState([]);
  const [comuns, setComuns] = useState([]);
  
  // REGRA DE OURO: Inicializa com os dados do perfil do usuário
  const [selectedCityId, setSelectedCityId] = useState(userData?.cidadeId || '');
  const [selectedChurchId, setSelectedChurchId] = useState(userData?.comumId || '');

  const isMaster = userData?.isMaster === true;
  // DEFINIÇÕES DE ESCOPO REFINADAS
  const isComissao = isMaster || (userData?.escopoRegional && userData?.membroComissao);
  const isRegionalEnc = userData?.role === 'Encarregado Regional' || userData?.escopoRegional === true;
  const isBasico = userData?.role === 'Músico' || userData?.role === 'Organista';
  
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. SINCRONIZAÇÃO DE CASCATA: REGIONAL -> CIDADE
  useEffect(() => {
    if (!activeRegionalId) return;
    
    // Busca a lista completa de cidades da regional no banco para obter os nomes reais
    const q = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    const unsub = onSnapshot(q, (s) => {
      const list = s.docs.map(d => ({ id: d.id, nome: d.data().nome }));
      
      if (isBasico) {
        // CORREÇÃO: Filtra para encontrar o objeto da cidade do usuário e pegar o nome real do BD
        const minhaCidade = list.find(c => c.id === userData?.cidadeId);
        setCidades([minhaCidade || { id: userData?.cidadeId, nome: userData?.cidadeNome || 'LOCALIDADE' }]);
        setSelectedCityId(userData?.cidadeId);
      } else {
        // REGRA: Somente Comissão vê todas as cidades. Regional Enc vê apenas a sua cidade.
        const listaFiltrada = isComissao ? list : list.filter(c => c.id === userData?.cidadeId);
        setCidades(listaFiltrada);

        if (!selectedCityId && userData?.cidadeId) {
          setSelectedCityId(userData.cidadeId);
        }
      }
    });
    return () => unsub();
  }, [activeRegionalId, isComissao, isBasico, userData]); 

  // 2. SINCRONIZAÇÃO DE CASCATA: CIDADE -> COMUM
  useEffect(() => {
    if (!selectedCityId) {
      setComuns([]);
      setSelectedChurchId(''); 
      return;
    }

    if (isBasico) {
      setComuns([{ id: userData?.comumId, nome: userData?.comum || "LOCALIDADE" }]);
      setSelectedChurchId(userData?.comumId);
      return;
    }

    const q = query(collection(db, 'comuns'), where('cidadeId', '==', selectedCityId));
    const unsub = onSnapshot(q, (s) => {
      const list = s.docs.map(d => ({ 
        id: d.id, 
        nome: d.data().comum || d.data().bairro || d.data().nome || "Sem Nome" 
      }));
      
      const listaFiltrada = (isComissao || isRegionalEnc || userData?.escopoCidade) ? list : list.filter(c => c.id === userData?.comumId);
      setComuns(listaFiltrada);

      if (!selectedChurchId && userData?.comumId && selectedCityId === userData.cidadeId) {
        setSelectedChurchId(userData.comumId);
      }
    });
    return () => unsub();
  }, [selectedCityId, isComissao, isRegionalEnc, isBasico, userData]);

  // 3. BUSCA PROFUNDA DE ENSAIOS
  useEffect(() => {
    if (!selectedChurchId) {
      setEvents([]);
      return;
    }

    const eventsRef = collection(db, 'comuns', selectedChurchId, 'events');
    const q = query(eventsRef, orderBy('date', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const evs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = evs.filter(ev => ev.regionalId === activeRegionalId || !ev.regionalId);

      setEvents(filtered);
      const currentYear = new Date().getFullYear().toString();
      setOpenYears(prev => ({ [currentYear]: true, ...prev }));
    }, (error) => {
      console.error("Erro ao carregar ensaios:", error);
      setEvents([]);
    });

    return () => unsub();
  }, [selectedChurchId, activeRegionalId]);

  const groupedEvents = useMemo(() => {
    return events.reduce((acc, event) => {
      const year = event.date ? event.date.split('-')[0] : 'Sem Data';
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});
  }, [events]);

  const years = Object.keys(groupedEvents).sort((a, b) => b - a);
  const toggleYear = (year) => setOpenYears(prev => ({ ...prev, [year]: !prev[year] }));
  
  const formatMonth = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return '---';
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const parts = dateStr.split('-');
    const m = parseInt(parts[1]) - 1;
    return months[m] || '---';
  };

  const handleCreate = async () => {
    if (!selectedChurchId) return toast.error("Selecione uma comum");
    const comumSelecionada = comuns.find(c => c.id === selectedChurchId);
    const nomeRealDaComum = comumSelecionada?.nome || userData?.comum || "LOCALIDADE";

    try {
      await eventService.createEvent(selectedChurchId, {
        type: newEventType,
        date: newEventDate,
        responsavel: responsavel || 'Pendente',
        regionalId: activeRegionalId,
        comumNome: nomeRealDaComum.toUpperCase(),
        comumId: selectedChurchId 
      });
      setShowModal(false);
      toast.success("Ensaio criado!");
    } catch (error) { toast.error("Erro ao criar."); }
  };

  const confirmDelete = async () => {
    if (!eventToDelete || !selectedChurchId) return;
    const targetEvent = events.find(ev => ev.id === eventToDelete);
    if (targetEvent?.ata?.status === 'closed') {
      toast.error("Ensaios lacrados não podem ser excluídos.");
      setEventToDelete(null);
      return;
    }

    try {
      await eventService.deleteEvent(selectedChurchId, eventToDelete);
      toast.success("Ensaio removido!");
      setEventToDelete(null);
    } catch (error) { toast.error("Erro ao excluir."); }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 pb-32 font-sans animate-premium text-left">
      
      {/* SELETORES HIERÁRQUICOS */}
      <div className="mb-6 max-w-md mx-auto flex items-center gap-2 px-1">
        <div className={`flex-1 flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-white shadow-sm transition-all ${((!isComissao && !isRegionalEnc) || isBasico) ? 'opacity-50 pointer-events-none' : ''}`}>
          <MapPin size={10} className="text-blue-600 shrink-0" />
          <select 
            disabled={(!isComissao && !isRegionalEnc) || isBasico}
            value={selectedCityId} 
            onChange={(e) => { setSelectedCityId(e.target.value); setSelectedChurchId(''); }}
            className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer"
          >
            {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className={`flex-1 flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-white shadow-sm transition-all ${(!(isComissao || isRegionalEnc || userData?.escopoCidade) || isBasico) ? 'opacity-50 pointer-events-none' : ''}`}>
          <Home size={10} className="text-blue-600 shrink-0" />
          <select 
            disabled={!(isComissao || isRegionalEnc || userData?.escopoCidade) || isBasico}
            value={selectedChurchId} 
            onChange={(e) => setSelectedChurchId(e.target.value)}
            className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer"
          >
            {comuns.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            {comuns.length === 0 && <option value="">Sem Comuns</option>}
          </select>
        </div>
      </div>

      {(isAdmin || isMaster) && selectedChurchId && (
        <div className="mb-8 max-w-md mx-auto">
          <button onClick={() => setShowModal(true)} className="w-full bg-slate-950 text-white py-5 rounded-[2.2rem] font-[900] uppercase italic tracking-[0.2em] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all">
            <Plus size={20} strokeWidth={3} /> Novo Ensaio
          </button>
        </div>
      )}

      <div className="space-y-8 max-w-md mx-auto">
        {years.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-black uppercase italic text-[10px] tracking-[0.4em]">Agenda Vazia</p>
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="space-y-4">
              <button onClick={() => toggleYear(year)} className="flex items-center gap-4 w-full px-2 group active:opacity-60 transition-all">
                <span className="text-3xl font-[900] italic text-slate-950 tracking-tighter">{year}</span>
                <div className="h-[2px] flex-1 bg-slate-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-500 ${openYears[year] ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openYears[year] && (
                <div className="space-y-4 animate-in">
                  {groupedEvents[year].map(e => {
                    const isClosed = e.ata?.status === 'closed';
                    return (
                      <div key={e.id} onClick={() => onSelectEvent(e.id)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group">
                        <div className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? 'bg-slate-300' : 'bg-amber-500'}`} />
                        <div className="flex items-center gap-5">
                          <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-[1.8rem] border-2 ${isClosed ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-950 text-slate-950 shadow-md'}`}>
                            <span className="text-2xl font-[900] italic">{e.date?.split('-')[2] || '--'}</span>
                            <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{formatMonth(e.date)}</span>
                          </div>
                          <div className="text-left leading-none">
                            <p className={`text-[8px] font-black uppercase italic tracking-[0.2em] mb-1.5 ${isClosed ? 'text-slate-300' : 'text-amber-500'}`}>{e.type || 'Ensaio Local'}</p>
                            <h4 className={`text-[13px] font-[900] uppercase italic tracking-tighter ${isClosed ? 'text-slate-400' : 'text-slate-950'}`}>Resp: {e.responsavel}</h4>
                            {/* REMOVIDO: Seção do Clock e Hora de Criação */}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isClosed ? <Lock size={16} className="text-slate-200" /> : <ShieldCheck size={16} className="text-emerald-500 animate-pulse" />}
                          {isAdmin && !isClosed && (
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
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none" value={newEventType} onChange={e => setNewEventType(e.target.value)}>
                     <option value="Ensaio Local">Ensaio Local</option>
                     <option value="Ensaio Regional">Ensaio Regional</option>
                     <option value="Reunião">Reunião Musical</option>
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