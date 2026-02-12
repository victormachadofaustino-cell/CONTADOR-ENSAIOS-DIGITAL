import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, UserPlus } from 'lucide-react';
import { db, doc, writeBatch } from '../../../config/firebase';
import toast from 'react-hot-toast';
// PRESERVAÇÃO: Importação mantida conforme estrutura do projeto
import InstrumentCard from './InstrumentCard'; 
import GovernanceCard from './GovernanceCard';

/**
 * Módulo de Contagem para Ensaios Regionais
 * v2.4 - UI Refinada: Botão Extra no Rodapé e Header Limpo
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

  const getSectionColor = (section) => {
    const s = section.toUpperCase();
    if (s.includes('CORDAS')) return 'bg-amber-500';
    if (s.includes('MADEIRAS')) return 'bg-emerald-500';
    if (s.includes('METAIS')) return 'bg-rose-500';
    if (s.includes('SAX')) return 'bg-emerald-400';
    if (s.includes('ORGANISTAS')) return 'bg-purple-500';
    return 'bg-slate-500';
  };

  const getSectionTotal = (sectionName) => {
    return (instruments || [])
      .filter(i => i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === sectionName.toUpperCase())
      .reduce((acc, inst) => acc + (parseInt(localCounts?.[inst.id]?.total) || 0), 0);
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
        [`${fieldPathId}.responsibleName`]: userData.name || "Colaborador",
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
    <div className="space-y-10 pb-32 animate-premium">
      {sections.map((section, index) => {
        const sectionInstruments = (instruments || []).filter(i => 
          i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === section.toUpperCase()
        );

        const isEspecial = ['IRMANDADE', 'CORAL', 'ORGANISTAS'].includes(section.toUpperCase());
        const totalNaipe = getSectionTotal(section);

        return (
          <React.Fragment key={section}>
            <div className="relative">
              {/* STICKY HEADER REFINADO */}
              <div className="sticky top-0 z-20 mb-4 px-2">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-12 rounded-full ${getSectionColor(section)}`} />
                    <div className="leading-none text-left">
                      <p className="text-[14px] font-[900] text-slate-950 uppercase italic tracking-tighter mb-1 leading-none">{section}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{sectionInstruments.length} ITENS</p>
                    </div>
                  </div>

                  {/* PLACAR CENTRALIZADO */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-[6px] font-black text-slate-400 uppercase italic mb-0.5">Total Naipe</span>
                    <div className="bg-slate-950 px-4 py-1.5 rounded-xl shadow-lg border border-white/10">
                      <span className="text-sm font-[900] text-white italic leading-none">{totalNaipe}</span>
                    </div>
                  </div>

                  {/* BOTÃO ASSUMIR À DIREITA (APENAS NÃO ESPECIAIS) */}
                  <div className="flex items-center gap-2">
                    {!isClosed && !isEspecial && sectionInstruments.length > 0 && (
                      <button
                        onClick={() => handleAssumeSection(section, sectionInstruments)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-all border border-blue-100 shadow-sm"
                      >
                        <UserPlus size={12} strokeWidth={3} />
                        <span className="text-[8px] font-black uppercase italic tracking-tighter">Assumir Todos</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* LISTA DE INSTRUMENTOS */}
              <div className="grid grid-cols-1 gap-3 px-2">
                {sectionInstruments.length > 0 ? (
                  <>
                    {sectionInstruments.map((inst) => (
                      <InstrumentCard
                        key={inst.id}
                        inst={inst}
                        data={localCounts?.[inst.id] || {}}
                        onUpdate={onUpdate}
                        onToggleOwnership={() => onToggleSection(inst.id, localCounts?.[inst.id]?.responsibleId === userData?.uid)}
                        userData={userData}
                        isClosed={isClosed}
                        isRegional={true}
                      />
                    ))}
                    
                    {/* BOTÃO ADICIONAR EXTRA NO RODAPÉ DO NAIPE */}
                    {!isClosed && !isEspecial && (
                      <button
                        onClick={() => onAddExtra(section)}
                        className="mt-2 mx-4 p-5 bg-white border border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all group"
                      >
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-active:bg-blue-600 group-active:text-white transition-colors">
                          <Plus size={16} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Adicionar Instrumento Extra</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] mx-4">
                    <p className="text-[9px] font-bold text-slate-300 uppercase italic">Nenhum instrumento configurado</p>
                  </div>
                )}
              </div>
            </div>

            {/* GOVERNANÇA INTEGRADA APÓS ORGANISTAS */}
            {section.toUpperCase() === 'ORGANISTAS' && (
              <div className="px-2 space-y-3 mt-4 mb-10">
                <GovernanceCard 
                  type="EXAMINADORAS"
                  val={localCounts?.meta_organistas?.enc || 0}
                  onChange={(v) => onUpdate('meta_organistas', 'enc', v)}
                  userData={userData}
                  isMyTurn={localCounts?.meta_organistas?.responsibleId === userData?.uid}
                  isOtherTurn={localCounts?.meta_organistas?.responsibleId && localCounts?.meta_organistas?.responsibleId !== userData?.uid}
                  responsibleName={localCounts?.meta_organistas?.responsibleName}
                  onToggle={() => onToggleSection('meta_organistas', localCounts?.meta_organistas?.responsibleId === userData?.uid)}
                  disabled={isClosed}
                />
                <GovernanceCard 
                  type="ENCARREGADOS LOCAIS"
                  val={localCounts?.meta_metais?.enc || 0}
                  onChange={(v) => onUpdate('meta_metais', 'enc', v)}
                  userData={userData}
                  isMyTurn={localCounts?.meta_metais?.responsibleId === userData?.uid}
                  isOtherTurn={localCounts?.meta_metais?.responsibleId && localCounts?.meta_metais?.responsibleId !== userData?.uid}
                  responsibleName={localCounts?.meta_metais?.responsibleName}
                  onToggle={() => onToggleSection('meta_metais', localCounts?.meta_metais?.responsibleId === userData?.uid)}
                  disabled={isClosed}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default CounterRegional;