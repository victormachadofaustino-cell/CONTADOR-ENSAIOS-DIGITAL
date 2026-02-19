import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, ChevronDown } from 'lucide-react';
import { db, doc, writeBatch } from '../../../config/firebase';
import toast from 'react-hot-toast';
// PRESERVAÇÃO: Importação mantida conforme estrutura do projeto
import InstrumentCard from './InstrumentCard'; 

/**
 * Módulo de Contagem para Ensaios Regionais
 * v3.1 - Accordion Independente, Transparência Total e Sincronização de Soma.
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
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por usuário no modo Regional
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
    return 'bg-slate-500';
  };

  // JUSTIFICATIVA: Ajuste na soma para contemplar irmaos/irmas no badge do header regional conforme Firestore
  const getSectionTotal = (sectionName) => {
    return (instruments || [])
      .filter(i => i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === sectionName.toUpperCase())
      .reduce((acc, inst) => {
        const c = localCounts?.[inst.id];
        const isIrm = ['irmandade', 'Coral', 'coral'].includes(inst.id.toLowerCase());
        if (isIrm) {
          return acc + (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0);
        }
        return acc + (parseInt(c?.total) || 0);
      }, 0);
  };

  const handleAssumeSection = async (sectionName, instrumentsList) => {
    if (!currentEventId || isClosed) return;
    const loadingToast = toast.loading(`Assumindo contagem de ${sectionName}...`);
    const batch = writeBatch(db);
    const eventRef = doc(db, 'events_global', currentEventId);
    
    instrumentsList.forEach(inst => {
      const fieldPathId = `counts.${inst.id}`;
      batch.update(eventRef, {
        [`${fieldPathId}.responsibleId`]: userData.uid,
        [`${fieldPathId}.responsibleName`]: userData.name || userData.nome || "Colaborador",
        [`${fieldPathId}.updatedAt`]: Date.now()
      });
    });

    try {
      await batch.commit();
      toast.dismiss(loadingToast);
      toast.success(`Você assumiu o naipe ${sectionName.toUpperCase()}`);
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error("Erro ao processar posse em lote.");
    }
  };

  return (
    <div className="space-y-4 pb-32 animate-premium">
      {sections.map((section, index) => {
        const sectionInstruments = (instruments || []).filter(i => 
          i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === section.toUpperCase()
        );

        const isEspecial = ['IRMANDADE', 'CORAL', 'ORGANISTAS'].includes(section.toUpperCase());
        const totalNaipe = getSectionTotal(section);
        const isOpen = openSections[section];

        return (
          <div key={section} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mx-2">
            {/* STICKY HEADER REFINADO COM ACCORDION */}
            <button 
              onClick={() => toggleAccordion(section)}
              className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${getSectionColor(section)}`} />
                <div className="leading-none text-left">
                  <p className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter mb-1 leading-none">{section}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{sectionInstruments.length} ITENS</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-black text-slate-400 uppercase italic mb-0.5">Naipe</span>
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

            {/* LISTA EXPANSÍVEL */}
            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-6 space-y-3 pt-2">
                    {/* BOTÃO ASSUMIR LOTE (DENTRO DO ACCORDION) */}
                    {!isClosed && !isEspecial && sectionInstruments.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAssumeSection(section, sectionInstruments); }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 mb-2 active:scale-95 transition-all"
                      >
                        <UserPlus size={14} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase italic tracking-widest">Assumir Todo o Naipe</span>
                      </button>
                    )}

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
                          sectionName={section}
                        />
                      ))
                    ) : (
                      <p className="text-center py-4 text-[8px] font-bold text-slate-300 uppercase italic">Vazio</p>
                    )}
                    
                    {!isClosed && !isEspecial && (
                      <button
                        onClick={() => onAddExtra(section)}
                        className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all"
                      >
                        <Plus size={16} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase italic tracking-widest">Adicionar Extra</span>
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