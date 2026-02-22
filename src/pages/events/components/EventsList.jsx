import React from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { ChevronDown, Lock, ShieldCheck, Trash2, Globe, MapPin } from 'lucide-react';

/**
 * Componente dedicado à listagem de ensaios agrupados por ano.
 * v1.2 - Suporte a Convidados: Destaque visual para eventos fora da jurisdição sede.
 */
const EventsList = ({ 
  groupedEvents, 
  openYears, 
  toggleYear, 
  onSelectEvent, 
  setEventToDelete, 
  temPermissaoAqui,
  userData // Necessário para identificar se o usuário é convidado
}) => {
  
  const years = Object.keys(groupedEvents).sort((a, b) => b - a);

  // Função utilitária para exibição abreviada dos meses
  const formatMonth = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return '---';
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const m = parseInt(dateStr.split('-')[1]) - 1;
    return months[m] || '---';
  };

  return (
    <div className="space-y-8 max-w-md mx-auto">
      {years.map(year => (
        <div key={year} className="space-y-4">
          {/* Cabeçalho do Ano (Accordion) */}
          <button 
            onClick={() => toggleYear(year)} 
            className="flex items-center gap-4 w-full px-2 group active:opacity-60 transition-all text-left"
          >
            <span className="text-3xl font-[900] italic text-slate-950 tracking-tighter">{year}</span>
            <div className="h-[2px] flex-1 bg-slate-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                <ChevronDown 
                  size={14} 
                  className={`text-slate-300 transition-transform duration-500 ${openYears[year] ? 'rotate-180' : ''}`} 
                />
            </div>
          </button>

          {/* Lista de Ensaios do Ano */}
          {openYears[year] && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {groupedEvents[year].map(e => {
                const isClosed = e.ata?.status === 'closed';
                const isRegional = e.scope === 'regional';
                
                // IDENTIFICAÇÃO DE CONVIDADO: Se o evento não é da minha comum mas eu fui convidado
                const isGuest = e.comumId !== userData?.comumId && e.invitedUsers?.includes(userData?.uid);
                
                // Definição dinâmica de cores e ícones baseada no escopo
                const scopeColor = isRegional ? 'text-blue-600' : 'text-amber-500';
                const sidebarColor = isRegional ? 'bg-blue-600' : (isGuest ? 'bg-blue-400' : 'bg-slate-950');

                return (
                  <div 
                    key={e.id} 
                    onClick={() => onSelectEvent(e.id)} 
                    className={`bg-white p-6 rounded-[2.5rem] border flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group text-left ${isGuest ? 'border-blue-100' : 'border-slate-100'}`}
                  >
                    {/* Barra Lateral Indicativa */}
                    <div className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? 'bg-slate-300' : sidebarColor}`} />
                    
                    <div className="flex items-center gap-5">
                      {/* Calendário do Card */}
                      <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-[1.8rem] border-2 transition-colors ${
                        isClosed ? 'bg-slate-50 border-slate-100 text-slate-300' : 
                        isRegional ? 'bg-blue-50 border-blue-600 text-blue-600' : 
                        isGuest ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-white border-slate-950 text-slate-950 shadow-md'
                      }`}>
                        <span className="text-2xl font-[900] italic">{e.date?.split('-')[2] || '--'}</span>
                        <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{formatMonth(e.date)}</span>
                      </div>

                      {/* Informações do Ensaio */}
                      <div className="text-left leading-none">
                        <div className="flex flex-col gap-1.5 mb-1.5">
                           {/* Badge de Colaboração para Convidados */}
                           {isGuest && (
                             <span className="text-[6px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full w-fit tracking-widest uppercase italic animate-pulse">
                               Colaboração Externa
                             </span>
                           )}
                           <div className="flex items-center gap-1.5">
                             {(isRegional || isGuest) && !isClosed && <Globe size={8} className="text-blue-600" />}
                             <p className={`text-[8px] font-black uppercase italic tracking-[0.2em] ${isClosed ? 'text-slate-300' : scopeColor}`}>
                               {e.type || (isRegional ? 'Ensaio Regional' : 'Ensaio Local')}
                             </p>
                           </div>
                        </div>
                        <h4 className={`text-[13px] font-[900] uppercase italic tracking-tighter ${isClosed ? 'text-slate-400' : 'text-slate-950'}`}>
                          {e.responsavel}
                        </h4>
                        {/* Exibe a Comum se o evento for externo */}
                        {(isGuest || isRegional) && (
                          <div className="flex items-center gap-1 mt-1.5 opacity-40">
                            <MapPin size={8} />
                            <p className="text-[7px] font-bold uppercase">{e.comumNome || 'Local não informado'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações e Status */}
                    <div className="flex items-center gap-2">
                      {isClosed ? (
                        <Lock size={16} className="text-slate-200" />
                      ) : (
                        <ShieldCheck size={16} className={`${(isRegional || isGuest) ? 'text-blue-500' : 'text-emerald-500'} animate-pulse`} />
                      )}
                      
                      {/* Bloqueia exclusão se for apenas convidado ou estiver lacrado */}
                      {temPermissaoAqui && !isClosed && !isGuest && (
                        <button 
                          onClick={(ex) => { 
                            ex.stopPropagation(); 
                            setEventToDelete(e.id); 
                          } } 
                          className="bg-red-50 text-red-400 p-3 rounded-2xl active:bg-red-500 active:text-white transition-all shadow-sm"
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
      ))}
    </div>
  );
};

export default EventsList;