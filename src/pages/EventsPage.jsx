import React, { useState, useEffect, useMemo } from 'react';
import { eventService } from '../services/eventService';
import toast from 'react-hot-toast';
import { Calendar, User, Lock, Trash2, Plus, X, Send, ChevronDown, Clock, ShieldCheck } from 'lucide-react';

const EventsPage = ({ userData, isAdmin, onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState('Ensaio Local');
  const [responsavel, setResponsavel] = useState(userData?.name || '');
  const [eventToDelete, setEventToDelete] = useState(null);
  const [openYears, setOpenYears] = useState({});

  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';

  useEffect(() => {
    const unsubscribe = eventService.subscribeToEvents(comumId, (fetchedEvents) => {
      setEvents(fetchedEvents);
      const currentYear = new Date().getFullYear().toString();
      setOpenYears(prev => ({ [currentYear]: true, ...prev }));
    });
    return () => unsubscribe();
  }, [comumId]);

  const groupedEvents = useMemo(() => {
    return events.reduce((acc, event) => {
      const year = event.date ? event.date.split('-')[0] : 'Sem Data';
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});
  }, [events]);

  const years = Object.keys(groupedEvents).sort((a, b) => b - a);

  const toggleYear = (year) => {
    setOpenYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const formatMonth = (dateStr) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthIndex = parseInt(dateStr.split('-')[1]) - 1;
    return months[monthIndex];
  };

  const handleCreate = async () => {
    try {
      await eventService.createEvent(comumId, {
        type: newEventType,
        date: newEventDate,
        responsavel: responsavel || 'Pendente'
      });
      setShowModal(false);
      toast.success("Ensaio criado!");
    } catch (error) {
      toast.error("Erro ao criar.");
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await eventService.deleteEvent(comumId, eventToDelete);
      toast.success("Ensaio removido!");
      setEventToDelete(null);
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 pb-32 font-sans animate-premium">
      
      {/* HEADER DE AÇÃO - PADRÃO VICTOR FAUSTINO */}
      {isAdmin && (
        <div className="mb-8">
          <button 
            onClick={() => setShowModal(true)} 
            className="w-full bg-slate-950 text-white py-5 rounded-[2.2rem] font-[900] uppercase italic tracking-[0.2em] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all"
          >
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
              {/* ACCORDION HEADER (ANO) */}
              <button 
                onClick={() => toggleYear(year)}
                className="flex items-center gap-4 w-full px-2 group active:opacity-60 transition-all"
              >
                <span className="text-3xl font-[900] italic text-slate-950 tracking-tighter">{year}</span>
                <div className="h-[2px] flex-1 bg-slate-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                   <ChevronDown size={14} className={`text-slate-400 transition-transform duration-500 ${openYears[year] ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* LISTA DE ENSAIOS */}
              {openYears[year] && (
                <div className="space-y-4 animate-in">
                  {groupedEvents[year].map(e => {
                    const isClosed = e.ata?.status === 'closed';
                    const day = e.date.split('-')[2];
                    const monthExtenso = formatMonth(e.date);

                    return (
                      <div 
                        key={e.id} 
                        onClick={() => onSelectEvent(e.id)} 
                        className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group"
                      >
                        {/* INDICADOR LATERAL DE STATUS */}
                        <div className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? 'bg-slate-300' : 'bg-amber-500'}`} />

                        <div className="flex items-center gap-5">
                          {/* FOLHA DE CALENDÁRIO PREMIUM */}
                          <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-[1.8rem] leading-none border-2 ${isClosed ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-950 text-slate-950 shadow-md'}`}>
                            <span className="text-2xl font-[900] italic">{day}</span>
                            <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{monthExtenso}</span>
                          </div>

                          <div className="text-left">
                            <p className={`text-[8px] font-black uppercase italic tracking-[0.2em] mb-1 ${isClosed ? 'text-slate-300' : 'text-amber-500'}`}>
                              {e.type || 'Ensaio Local'}
                            </p>
                            <h4 className={`text-[13px] font-[900] uppercase italic tracking-tighter leading-none ${isClosed ? 'text-slate-400' : 'text-slate-950'}`}>
                              Resp: {e.responsavel}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-2">
                               <Clock size={10} className={isClosed ? 'text-slate-200' : 'text-slate-400'} />
                               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{e.createdAt ? new Date(e.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isClosed ? (
                             <div className="bg-slate-100 p-2.5 rounded-2xl text-slate-400"><Lock size={16} /></div>
                          ) : (
                             <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-500 animate-pulse"><ShieldCheck size={16} /></div>
                          )}
                          
                          {isAdmin && (
                            <button 
                              onClick={(ex) => { 
                                ex.stopPropagation(); 
                                setEventToDelete(e.id);
                              }} 
                              className="bg-red-50 text-red-200 p-3 rounded-2xl active:bg-red-500 active:text-white transition-all shadow-sm"
                            >
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

      {/* MODAL DE CRIAÇÃO (DNA CALENDÁRIO MUSICAL) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[340px] rounded-[3rem] p-8 shadow-2xl relative text-left overflow-hidden">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90"><X size={18}/></button>
            <h3 className="text-xl font-[900] uppercase italic text-slate-950 mb-8 leading-none tracking-tighter">Novo Registro</h3>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Tipo de Evento</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black uppercase outline-none" 
                  value={newEventType} 
                  onChange={e => setNewEventType(e.target.value)}
                >
                   <option value="Ensaio Local">Ensaio Local</option>
                   <option value="Ensaio Regional">Ensaio Regional</option>
                   <option value="Reunião">Reunião Musical</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Data Agendada</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black outline-none" 
                  value={newEventDate} 
                  onChange={e => setNewEventDate(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Responsável / Encarregado</label>
                <input 
                  type="text" 
                  placeholder="Nome completo" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[11px] font-black outline-none uppercase placeholder:text-slate-300 shadow-inner" 
                  value={responsavel} 
                  onChange={e => setResponsavel(e.target.value)} 
                />
              </div>
            </div>

            <button 
              onClick={handleCreate} 
              className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 active:scale-95 shadow-xl mt-10 transition-all"
            >
              <Send size={16}/> Confirmar Agenda
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl relative border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-[900] uppercase italic text-slate-950 tracking-tighter leading-tight">Remover Agenda?</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-8 leading-relaxed">
              Todos os dados e contagens deste ensaio serão permanentemente excluídos.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete} 
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-100"
              >
                Sim, Remover Ensaio
              </button>
              <button 
                onClick={() => setEventToDelete(null)} 
                className="w-full py-2 font-black uppercase text-[9px] text-slate-300 tracking-widest"
              >
                Manter Ensaio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;