import React from 'react'; // Explicação: Importa a base do React para criar os elementos da lista.
// PRESERVAÇÃO: Importações originais mantidas
import { ChevronDown, Lock, ShieldCheck, Trash2, Globe, MapPin } from 'lucide-react'; // Explicação: Importa os ícones de cadeado, escudo, lixeira e mapas.

// v1.3.3: AJUSTE DE CAMINHO E SINCRONIA COM NÍVEL CIDADE
import { hasPermission } from '../../../config/permissions'; // Explicação: Importa a regra oficial de quem pode apagar coisas.

/**
 * Componente dedicado à listagem de ensaios agrupados por ano.
 * v1.3.3 - Lixeira habilitada para Cidade e GEM em ensaios locais.
 */
const EventsList = ({ 
  groupedEvents, // Explicação: Lista de ensaios já separados por ano.
  openYears, // Explicação: Sabe qual ano o usuário clicou para abrir.
  toggleYear, // Explicação: Função que abre ou fecha a sanfona do ano.
  onSelectEvent, // Explicação: Função que abre o ensaio.
  setEventToDelete, // Explicação: Função que prepara um ensaio para ser apagado.
  temPermissaoAqui, // Explicação: Diz se o usuário tem poder nesta localidade.
  userData // Explicação: Puxa o "crachá" do usuário.
}) => { 
  
  // Explicação: Organiza os anos do mais novo para o mais antigo.
  const years = Object.keys(groupedEvents).sort((a, b) => b - a);

  // Função utilitária para exibição abreviada dos meses
  const formatMonth = (dateStr) => { // Explicação: Transforma o número do mês em texto (ex: 01 vira Jan).
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return '---';
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const m = parseInt(dateStr.split('-')[1]) - 1;
    return months[m] || '---';
  };

  return ( // Explicação: Desenha a estrutura da lista na tela.
    <div className="space-y-8 max-w-md mx-auto">
      {years.map(year => ( // Explicação: Percorre cada ano para criar os blocos.
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
          {openYears[year] && ( // Explicação: Abre a lista de ensaios se o ano for selecionado.
            <div className="space-y-4 animate-in fade-in duration-300">
              {groupedEvents[year].map(e => { // Explicação: Começa a desenhar os cartões de cada ensaio.
                const isClosed = e.ata?.status === 'closed'; // Explicação: Verifica se o ensaio já foi encerrado.
                const isRegional = e.scope === 'regional'; // Explicação: Verifica se é um evento Regional.
                
                // IDENTIFICAÇÃO DE CONVIDADO: Se o evento não é da minha comum mas eu fui convidado
                const isGuest = e.comumId !== userData?.comumId && e.invitedUsers?.includes(userData?.uid);
                
                // v1.3.3: Checagem oficial de permissão contextual (Agora liberado para CIDADE em local)
                // Explicação: O sistema pergunta se o nível do usuário permite apagar este tipo de escopo.
                const podeApagarEsteEvento = hasPermission(userData, 'delete_event', e.scope);

                // Definição dinâmica de cores e ícones baseada no escopo
                const scopeColor = isRegional ? 'text-blue-600' : 'text-amber-500';
                const sidebarColor = isRegional ? 'bg-blue-600' : (isGuest ? 'bg-blue-400' : 'bg-slate-950');

                return ( // Explicação: Desenha o cartão do ensaio.
                  <div 
                    key={e.id} 
                    onClick={() => onSelectEvent(e.id)} 
                    className={`bg-white p-6 rounded-[2.5rem] border flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group text-left ${isGuest ? 'border-blue-100' : 'border-slate-100'}`}
                  >
                    {/* Barra Lateral Indicativa (Higiene de UI) */}
                    <div className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? 'bg-slate-300' : sidebarColor}`} />
                    
                    <div className="flex items-center gap-5">
                      {/* Calendário do Card (Data do Ensaio) */}
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
                        {(isGuest || isRegional) && (
                          <div className="flex items-center gap-1 mt-1.5 opacity-40">
                            <MapPin size={8} />
                            <p className="text-[7px] font-bold uppercase">{e.comumNome || 'Local não informado'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações e Status (Cadeado ou Escudo) */}
                    <div className="flex items-center gap-2">
                      {isClosed ? (
                        <Lock size={16} className="text-slate-200" /> // Explicação: Ícone de ensaio trancado.
                      ) : (
                        <ShieldCheck size={16} className={`${(isRegional || isGuest) ? 'text-blue-500' : 'text-emerald-500'} animate-pulse`} /> // Explicação: Ícone de ensaio ativo.
                      )}
                      
                      {/* v1.3.3: Lógica de exclusão com base na Regra de Ouro Contextual */}
                      {/* Explicação: Agora a lixeira aparece para Cidade e GEM apenas em ensaios locais. */}
                      {podeApagarEsteEvento && !isClosed && (
                        <button 
                          onClick={(ex) => { 
                            ex.stopPropagation(); // Explicação: Impede de abrir o ensaio ao clicar na lixeira.
                            setEventToDelete(e.id); // Explicação: Ativa o aviso de confirmação de exclusão.
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

export default EventsList; // Explicação: Exporta a lista com a lixeira habilitada para gestores.