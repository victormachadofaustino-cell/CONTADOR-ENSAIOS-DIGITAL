import React, { useState } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { ChevronDown, UserCheck, ShieldCheck, PlusCircle } from 'lucide-react';
import InstrumentCard from './InstrumentCard';

/**
 * Componente que agrupa instrumentos por seção (Naipe).
 * v2.1 - Correção da soma de Irmandade e estabilização de Accordion independente.
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
  const isOwner = localCounts?.[metaKey]?.responsibleId === myUID;
  const hasResponsible = !!localCounts?.[metaKey]?.responsibleId;

  // JUSTIFICATIVA: Ajuste na soma para contemplar irmaos/irmas quando o campo 'total' for 0 (caso do Coral no Firestore)
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

  // JUSTIFICATIVA: Alterna entre abrir a seção para visualização ou pedir para assumir
  const handleHeaderClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing}`}>
      <button 
        onClick={handleHeaderClick} 
        className="w-full p-6 flex justify-between items-center active:bg-slate-50 transition-all"
      >
        <div className="flex flex-col items-start text-left leading-none gap-2">
          <span className="font-[900] uppercase italic text-[13px] text-slate-950 tracking-tight">{sec}</span>
          
          {hasResponsible && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
              isOwner ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100' : 
              'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {isOwner ? <UserCheck size={8} strokeWidth={4}/> : <ShieldCheck size={8}/>}
              <span className="text-[7px] font-black uppercase tracking-widest">
                {isOwner ? 'Sua Seção' : `Responsável: ${responsibleName}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* BADGE DE TOTALIZAÇÃO DO NAIPE - Sempre visível v2.1 corrigindo soma de Irmandade */}
          <div className="bg-slate-950 text-white min-w-[42px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-lg border border-white/10 px-2">
            {sectionTotal}
          </div>
          <ChevronDown 
            size={18} 
            className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
          {allInstruments
            .filter(i => (i.section || "GERAL").toUpperCase() === sec)
            .map(inst => (
              <InstrumentCard 
                key={inst.id} 
                inst={inst} 
                data={localCounts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}} 
                onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} 
                onToggleOwnership={() => handleToggleGroup(sec)}
                // JUSTIFICATIVA: A edição só é permitida se o usuário for o dono da seção
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

          {!isEditingEnabled(sec) && (
            <button
              onClick={() => handleToggleGroup(sec)}
              className="w-full py-3 mt-2 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center gap-2 border border-slate-100 active:scale-95 transition-all"
            >
              <UserCheck size={14} />
              <span className="text-[8px] font-black uppercase italic tracking-widest">Assumir Edição deste Naipe</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CounterSection;