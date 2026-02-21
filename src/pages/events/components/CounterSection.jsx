import React, { useState } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { ChevronDown, UserCheck, ShieldCheck, PlusCircle, Lock, User } from 'lucide-react';
import InstrumentCard from './InstrumentCard';

/**
 * Componente que agrupa instrumentos por seção (Naipe).
 * v2.5.1 - Zeladoria de TOPO: Refinamento de acessibilidade e consistência visual.
 */
const CounterSection = ({ 
  sec, 
  allInstruments, 
  localCounts, 
  myUID, 
  activeGroup, 
  handleToggleGroup, 
  handleUpdateInstrument, 
  isEditingEnabled,
  onAddExtra 
}) => {
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por dispositivo
  const [isOpen, setIsOpen] = useState(false);

  const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
  const responsibleName = localCounts?.[metaKey]?.responsibleName;
  const responsibleId = localCounts?.[metaKey]?.responsibleId;
  const isOwner = responsibleId === myUID;
  const hasResponsible = !!responsibleId;

  // JUSTIFICATIVA: Ajuste na soma para contemplar irmaos/irmas quando o campo 'total' for 0
  const sectionTotal = allInstruments
    .filter(i => (i.section || "GERAL").toUpperCase() === sec)
    .reduce((acc, inst) => {
      const c = localCounts?.[inst.id];
      const isIrm = ['irmandade', 'Coral', 'coral'].includes(inst.id.toLowerCase());
      
      if (isIrm) {
        return acc + (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0);
      }
      return acc + (parseInt(c?.total) || 0);
    }, 0);

  const isLastIrmandade = sec === 'IRMANDADE' || sec === 'CORAL';
  const isOrganistas = sec === 'ORGANISTAS';
  
  // REGRA: Seções que não permitem inserção de instrumentos extras
  const isProtectedSection = isLastIrmandade || isOrganistas;
  
  // Rótulo de liderança conforme a seção
  const labelLideranca = isOrganistas ? "Examinadora" : "Encarregado";

  const extraSpacing = isProtectedSection ? "mb-10" : "mb-3";

  // JUSTIFICATIVA: Alterna entre abrir a seção para visualização
  const handleHeaderClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing}`}>
      <div className="w-full p-5 flex justify-between items-center transition-all">
        
        {/* LADO ESQUERDO: Título e Identificação Nominal */}
        <button 
          onClick={handleHeaderClick}
          className="flex flex-col items-start text-left leading-none gap-1 flex-1 min-w-0"
        >
          <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tight truncate w-full">
            {sec}
          </span>
          {hasResponsible && (
            <div className="flex items-center gap-1">
               <div className={`w-1 h-1 rounded-full ${isOwner ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
               <span className={`text-[7px] font-black uppercase italic tracking-widest ${isOwner ? 'text-blue-600' : 'text-slate-400'}`}>
                {isOwner ? 'Sua Zeladoria' : `Resp: ${responsibleName}`}
              </span>
            </div>
          )}
        </button>

        {/* CENTRO/DIREITA: Ação de Assumir e Totais */}
        <div className="flex items-center gap-3">
          
          {/* BOTÃO DE POSSE DE TOPO (Ação prioritária e visual) */}
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleGroup(sec); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 border ${
              isOwner 
                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-100' 
                : hasResponsible 
                  ? 'bg-amber-50 text-amber-600 border-amber-100' 
                  : 'bg-slate-950 text-white border-slate-900 shadow-sm'
            }`}
          >
            {isOwner ? <UserCheck size={10} strokeWidth={3}/> : hasResponsible ? <Lock size={10}/> : <User size={10}/>}
            <span className="text-[8px] font-black uppercase italic tracking-widest leading-none">
              {isOwner ? 'Você' : hasResponsible ? 'Trocar' : 'Assumir'}
            </span>
          </button>

          {/* BADGE DE TOTALIZAÇÃO E CONTROLE DE ACCORDION */}
          <button 
            onClick={handleHeaderClick}
            className="flex items-center gap-2"
          >
            <div className="bg-slate-950 text-white min-w-[38px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-sm border border-white/10 px-2">
              {sectionTotal}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
          {allInstruments
            .filter(i => (i.section || "GERAL").toUpperCase() === sec)
            .map(inst => {
              // JUSTIFICATIVA: Injetamos a posse do Naipe em cada instrumento para garantir a tag nominal correta.
              const instrumentData = {
                ...(localCounts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}),
                responsibleId: responsibleId,
                responsibleName: responsibleName
              };

              return (
                <InstrumentCard 
                  key={inst.id} 
                  inst={inst} 
                  data={instrumentData} 
                  onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} 
                  // Edição bloqueada se não for dono do naipe (isClosed=true)
                  isClosed={!isEditingEnabled(sec)} 
                  isRegional={false} 
                  userData={{uid: myUID}}
                  sectionName={sec}
                  labelLideranca={labelLideranca}
                />
              );
            })}
          
          {/* BOTÃO ADICIONAR EXTRA (Mantido no rodapé para não poluir o cabeçalho) */}
          {isEditingEnabled(sec) && !isProtectedSection && (
            <button
              onClick={() => onAddExtra(sec)}
              className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[1.8rem] flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
            >
              <PlusCircle size={16} />
              <span className="text-[9px] font-black uppercase italic tracking-widest">Adicionar Extra em {sec}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CounterSection;