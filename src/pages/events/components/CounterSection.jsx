import React from 'react';
import { ChevronDown, UserCheck, AlertCircle, ShieldCheck, PlusCircle } from 'lucide-react';
import InstrumentCard from './InstrumentCard';

/**
 * Componente que agrupa instrumentos por seção (Naipe).
 * v1.5 - Correção de erro de sintaxe e estabilização de rótulos.
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
  const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
  const responsibleName = localCounts?.[metaKey]?.responsibleName;
  const isOwner = localCounts?.[metaKey]?.responsibleId === myUID;
  const inUse = localCounts?.[metaKey]?.isActive;

  // Calcula o total apenas desta seção específica
  const sectionTotal = allInstruments
    .filter(i => (i.section || "GERAL").toUpperCase() === sec)
    .reduce((acc, inst) => {
      const c = localCounts?.[inst.id];
      // Lógica de soma diferenciada para Irmandade/Coral (Irmãos + Irmãs)
      return acc + (['irmandade', 'Coral', 'coral'].includes(inst.id.toLowerCase()) 
        ? (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0) 
        : (parseInt(c?.total) || 0));
    }, 0);

  const isLastIrmandade = sec === 'IRMANDADE' || sec === 'CORAL';
  const isOrganistas = sec === 'ORGANISTAS';
  
  // REGRA: Seções que não permitem inserção de instrumentos extras
  const isProtectedSection = isLastIrmandade || isOrganistas;
  
  // Rótulo de liderança conforme a seção
  const labelLideranca = isOrganistas ? "Examinadora" : "Encarregado";

  const extraSpacing = isProtectedSection ? "mb-10" : "mb-3";

  return (
    <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing}`}>
      <button 
        onClick={() => handleToggleGroup(sec)} 
        className="w-full p-6 flex justify-between items-center active:bg-slate-50 transition-all"
      >
        <div className="flex flex-col items-start text-left leading-none gap-2">
          <span className="font-[900] uppercase italic text-[13px] text-slate-950 tracking-tight">{sec}</span>
          {responsibleName && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
              isOwner ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100' : 
              inUse ? 'bg-amber-50 border-amber-400 text-white' : 
              'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              {isOwner ? <UserCheck size={8} strokeWidth={4}/> : 
               inUse ? <AlertCircle size={8} /> : 
               <ShieldCheck size={8}/>}
              <span className="text-[7px] font-black uppercase tracking-widest">
                {isOwner ? 'Sua Seção' : inUse ? `Ocupado: ${responsibleName}` : responsibleName}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* BADGE DE TOTALIZAÇÃO DO NAIPE */}
          <div className="bg-slate-950 text-white min-w-[42px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-lg border border-white/10 px-2">
            {sectionTotal}
          </div>
          <ChevronDown 
            size={18} 
            className={`text-slate-300 transition-transform duration-500 ${activeGroup === sec ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {activeGroup === sec && (
        <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
          {allInstruments
            .filter(i => (i.section || "GERAL").toUpperCase() === sec)
            .map(inst => (
              <InstrumentCard 
                key={inst.id} 
                inst={inst} 
                data={localCounts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}} 
                onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} 
                disabled={!isEditingEnabled(sec)} 
                isRegional={false} 
                userData={{uid: myUID}}
                sectionName={sec}
                labelLideranca={labelLideranca}
              />
            ))}
          
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