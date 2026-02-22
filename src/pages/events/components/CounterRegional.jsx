import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, ChevronDown, Users } from 'lucide-react';
import { db, doc, writeBatch } from '../../../config/firebase';
import toast from 'react-hot-toast';
// PRESERVAÇÃO: Importação mantida conforme estrutura do projeto
import InstrumentCard from './InstrumentCard'; 

/**
 * Módulo de Contagem para Ensaios Regionais
 * v3.5 - Correção Definitiva de Rótulos e Ativação de Posse Individual
 * Resolve os erros dos Anexos 1 e 2, garantindo labels diretos e botões de assumir por linha.
 */
const CounterRegional = ({ 
  instruments, 
  localCounts, 
  sections, 
  onUpdate, 
  onToggleSection, 
  onAddExtra, 
  userData, 
  isClosed,
  currentEventId 
}) => {
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por usuário
  const [openSections, setOpenSections] = useState({});

  const toggleAccordion = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSectionColor = (section) => {
    const s = section.toUpperCase();
    if (s.includes('CORDAS')) return 'bg-amber-500';
    if (s.includes('MADEIRAS')) return 'bg-emerald-500';
    if (s.includes('METAIS')) return 'bg-rose-500';
    if (s.includes('SAX')) return 'bg-emerald-400';
    if (s.includes('ORGANISTAS')) return 'bg-purple-500';
    if (s.includes('IRMANDADE')) return 'bg-blue-600';
    return 'bg-slate-500';
  };

  const getSectionTotal = (sectionName) => {
    if (sectionName.toUpperCase() === 'IRMANDADE') {
      return (parseInt(localCounts?.irmas?.total) || 0) + (parseInt(localCounts?.irmaos?.total) || 0);
    }
    
    return (instruments || [])
      .filter(i => i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === sectionName.toUpperCase())
      .reduce((acc, inst) => acc + (parseInt(localCounts?.[inst.id]?.total) || 0), 0);
  };

  return (
    <div className="space-y-4 pb-32 animate-premium text-left">
      {sections.map((section) => {
        const isIrmandade = section.toUpperCase() === 'IRMANDADE';
        const isOrganistas = section.toUpperCase() === 'ORGANISTAS';
        
        const sectionInstruments = (instruments || []).filter(i => 
          i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === section.toUpperCase()
        );

        const totalNaipe = getSectionTotal(section);
        const isOpen = openSections[section];

        return (
          <div key={section} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mx-2 text-left">
            {/* HEADER DO ACORDEÃO */}
            <button 
              onClick={() => toggleAccordion(section)}
              className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${getSectionColor(section)}`} />
                <div className="leading-none">
                  <p className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter mb-1 leading-none">{section}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                    {isIrmandade ? 'PÚBLICO GERAL' : `${sectionInstruments.length} INSTRUMENTOS`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-black text-slate-400 uppercase italic mb-0.5">Total</span>
                  <div className="bg-slate-950 px-3 py-1 rounded-xl shadow-lg border border-white/10">
                    <span className="text-xs font-[900] text-white italic leading-none">{totalNaipe}</span>
                  </div>
                </div>
                <ChevronDown 
                  size={18} 
                  className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
                />
              </div>
            </button>

            {/* CONTEÚDO EXPANSÍVEL */}
            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-6 space-y-3 pt-2">
                    
                    {/* CORREÇÃO ANEXO 1: IRMANDADE (Labels IRMÃS e IRMÃOS + Botão Assumir) */}
                    {isIrmandade ? (
                      <div className="space-y-3">
                        <InstrumentCard
                          key="irmas_row"
                          inst={{ id: 'irmas', nome: 'IRMÃS', label: 'IRMÃS', type: 'simple' }}
                          data={localCounts?.irmas || {}}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection('irmas', localCounts?.irmas?.responsibleId === userData?.uid)}
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          showOwnership={true}
                        />
                        <InstrumentCard
                          key="irmaos_row"
                          inst={{ id: 'irmaos', nome: 'IRMÃOS', label: 'IRMÃOS', type: 'simple' }}
                          data={localCounts?.irmaos || {}}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection('irmaos', localCounts?.irmaos?.responsibleId === userData?.uid)}
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          showOwnership={true}
                        />
                      </div>
                    ) : isOrganistas ? (
                      /* CORREÇÃO ANEXO 2: ORGANISTAS (Label ÓRGÃO + Botão Assumir) */
                      <div className="space-y-3">
                        <InstrumentCard
                          key="orgao_row"
                          inst={{ id: 'orgao', nome: 'ÓRGÃO', label: 'ÓRGÃO', type: 'simple' }}
                          data={localCounts?.orgao || {}}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection('orgao', localCounts?.orgao?.responsibleId === userData?.uid)}
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          showOwnership={true}
                        />
                      </div>
                    ) : (
                      /* LISTAGEM PADRÃO DE INSTRUMENTOS (Ativando Posse Individual) */
                      <>
                        {sectionInstruments.length > 0 ? (
                          sectionInstruments.map((inst) => (
                            <InstrumentCard
                              key={inst.id}
                              inst={inst}
                              data={localCounts?.[inst.id] || {}}
                              onUpdate={onUpdate}
                              onToggleOwnership={() => onToggleSection(inst.id, localCounts?.[inst.id]?.responsibleId === userData?.uid)}
                              userData={userData}
                              isClosed={isClosed}
                              isRegional={true}
                              showOwnership={true}
                              sectionName={section}
                            />
                          ))
                        ) : (
                          <p className="text-center py-4 text-[8px] font-bold text-slate-300 uppercase italic">Vazio</p>
                        )}
                      </>
                    )}
                    
                    {/* BOTÃO INSTRUMENTO EXTRA */}
                    {!isClosed && !isIrmandade && !isOrganistas && (
                      <button
                        onClick={() => onAddExtra(section)}
                        className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all"
                      >
                        <Plus size={16} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase italic tracking-widest">Incluir Instrumento Extra</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default CounterRegional;