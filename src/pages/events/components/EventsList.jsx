import React from 'react';
import { ChevronDown, Lock, ShieldCheck, Trash2, Globe } from 'lucide-react';

/**
 * Componente dedicado à listagem de ensaios agrupados por ano.
 * v1.1 - Destaque Visual para Ensaios Regionais (Cor Azul e Ícone Globe).
 */
const EventsList = ({ 
  groupedEvents, 
  openYears, 
  toggleYear, 
  onSelectEvent, 
  setEventToDelete, 
  temPermissaoAqui 
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
                
                // Definição dinâmica de cores e ícones baseada no escopo
                const scopeColor = isRegional ? 'text-blue-600' : 'text-amber-500';
                const scopeBg = isRegional ? 'bg-blue-600' : 'bg-slate-950';
                const sidebarColor = isRegional ? 'bg-blue-600' : 'bg-slate-950';

                return (
                  <div 
                    key={e.id} 
                    onClick={() => onSelectEvent(e.id)} 
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group text-left"
                  >
                    {/* Barra Lateral Indicativa de Escopo */}
                    <div className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? 'bg-slate-300' : sidebarColor}`} />
                    
                    <div className="flex items-center gap-5">
                      {/* Calendário do Card com Diferenciação de Escopo */}
                      <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-[1.8rem] border-2 transition-colors ${
                        isClosed ? 'bg-slate-50 border-slate-100 text-slate-300' : 
                        isRegional ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-white border-slate-950 text-slate-950 shadow-md'
                      }`}>
                        <span className="text-2xl font-[900] italic">{e.date?.split('-')[2] || '--'}</span>
                        <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{formatMonth(e.date)}</span>
                      </div>

                      {/* Informações do Ensaio */}
                      <div className="text-left leading-none">
                        <div className="flex items-center gap-1.5 mb-1.5">
                           {isRegional && !isClosed && <Globe size={8} className="text-blue-600 animate-pulse" />}
                           <p className={`text-[8px] font-black uppercase italic tracking-[0.2em] ${isClosed ? 'text-slate-300' : scopeColor}`}>
                             {e.type || (isRegional ? 'Ensaio Regional' : 'Ensaio Local')}
                           </p>
                        </div>
                        <h4 className={`text-[13px] font-[900] uppercase italic tracking-tighter ${isClosed ? 'text-slate-400' : 'text-slate-950'}`}>
                          Resp: {e.responsavel}
                        </h4>
                      </div>
                    </div>

                    {/* Ações e Status */}
                    <div className="flex items-center gap-2">
                      {isClosed ? (
                        <Lock size={16} className="text-slate-200" />
                      ) : (
                        <ShieldCheck size={16} className={`${isRegional ? 'text-blue-500' : 'text-emerald-500'} animate-pulse`} />
                      )}
                      
                      {/* Permite exclusão apenas se não estiver lacrado e tiver poder administrativo */}
                      {temPermissaoAqui && !isClosed && (
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