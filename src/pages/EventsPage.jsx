import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, doc, addDoc, deleteDoc, query, orderBy } from '../firebase';
import toast from 'react-hot-toast';

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
    const q = query(collection(db, 'comuns', comumId, 'events'), orderBy('date', 'desc'));
    return onSnapshot(q, (s) => {
      const fetchedEvents = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(fetchedEvents);

      // Define o ano atual como aberto por padrão na primeira carga
      const currentYear = new Date().getFullYear().toString();
      setOpenYears(prev => ({ [currentYear]: true, ...prev }));
    });
  }, [comumId]);

  // AGRUPAMENTO POR ANO
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
      await addDoc(collection(db, 'comuns', comumId, 'events'), {
        type: newEventType,
        date: newEventDate,
        responsavel: responsavel || 'Pendente',
        ata: { status: 'open' }, 
        counts: {}
      });
      setShowModal(false);
      toast.success("Ensaio criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar ensaio.");
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, 'comuns', comumId, 'events', eventToDelete));
      toast.success("Ensaio excluído!");
      setEventToDelete(null);
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="p-4 space-y-6 font-sans">
      {/* BOTÃO VISÍVEL APENAS PARA MASTER E ADMINS */}
      {isAdmin && (
        <button 
          onClick={() => setShowModal(true)} 
          className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase shadow-xl shadow-blue-100 italic active:scale-95 transition-all"
        >
          + Novo Ensaio
        </button>
      )}

      <div className="space-y-6 mt-4 pb-32">
        {years.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-300 font-black uppercase italic text-xs tracking-widest">Nenhum ensaio agendado</p>
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="space-y-3">
              {/* ACCORDION HEADER (ANO) */}
              <button 
                onClick={() => toggleYear(year)}
                className="flex items-center gap-3 w-full px-2 active:opacity-60 transition-all"
              >
                <span className="text-2xl font-black italic text-gray-900">{year}</span>
                <div className="h-[2px] flex-1 bg-gray-100 rounded-full"></div>
                <span className={`text-[10px] font-black text-gray-400 transition-transform duration-300 ${openYears[year] ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* LISTA DE ENSAIOS DO ANO */}
              {openYears[year] && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  {groupedEvents[year].map(e => {
                    const isClosed = e.ata?.status === 'closed';
                    const day = e.date.split('-')[2];
                    const monthExtenso = formatMonth(e.date);

                    return (
                      <div 
                        key={e.id} 
                        onClick={() => onSelectEvent(e.id)} 
                        className={`bg-white p-5 rounded-[2.5rem] border flex justify-between items-center active:scale-[0.98] transition-all ${
                          isClosed ? 'opacity-80 border-gray-100' : 'border-gray-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          {/* FOLHA DE CALENDÁRIO */}
                          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-3xl leading-none shadow-inner ${isClosed ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                            <span className="text-xl font-black italic">{day}</span>
                            <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">{monthExtenso}</span>
                          </div>

                          <div className="text-left leading-none">
                            <p className={`text-[9px] font-black uppercase italic mb-2 ${isClosed ? 'text-gray-300' : 'text-blue-400'}`}>
                              {e.type || 'Ensaio Local'}
                            </p>
                            <h4 className={`font-black text-xs uppercase italic leading-none ${isClosed ? 'text-gray-400' : 'text-gray-800'}`}>
                              Resp: {e.responsavel}
                            </h4>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase italic ${
                            isClosed 
                            ? 'bg-gray-100 text-gray-400' 
                            : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {isClosed ? 'Lacre' : 'Aberto'}
                          </span>
                          
                          {/* BOTÃO DE EXCLUIR VISÍVEL APENAS PARA MASTER E ADMINS */}
                          {isAdmin && (
                            <button 
                              onClick={(ex) => { 
                                ex.stopPropagation(); 
                                setEventToDelete(e.id);
                              }} 
                              className="bg-red-50 text-red-300 p-3 rounded-2xl active:bg-red-100 transition-colors"
                            >
                              🗑️
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

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/20">
            <h3 className="font-black text-gray-800 uppercase italic border-b pb-4 mb-6 text-center tracking-widest">Novo Ensaio</h3>
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Data do Ensaio</label>
                <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl font-black text-gray-700 border-none outline-none mt-1" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Responsável</label>
                <input type="text" placeholder="Nome do encarregado" className="w-full bg-gray-50 p-4 rounded-2xl font-black text-gray-700 border-none outline-none mt-1" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 italic">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] italic shadow-lg shadow-blue-100">Criar Ensaio</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/20">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-black text-gray-800 uppercase italic mb-2 leading-none">Excluir Ensaio?</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-6 mb-6 leading-tight">
              Esta ação não pode ser desfeita e todos os dados deste evento serão apagados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setEventToDelete(null)} className="flex-1 py-3 font-black uppercase text-[10px] text-gray-400 italic">Voltar</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-black uppercase text-[10px] italic shadow-lg active:scale-95 transition-all">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;