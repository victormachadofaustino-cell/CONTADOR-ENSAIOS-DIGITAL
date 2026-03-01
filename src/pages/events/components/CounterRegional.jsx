import React, { useState, useMemo } from 'react'; // Ferramentas básicas para criar a tela e memorizar dados
import { motion, AnimatePresence } from 'framer-motion'; // Ferramentas para animações suaves de abrir e fechar
import { Plus, UserPlus, ChevronDown, Users } from 'lucide-react'; // Ícones visuais (mais, seta, pessoas)
import { db, doc, writeBatch } from '../../../config/firebase'; // Conexão com o banco de dados do Google
import toast from 'react-hot-toast'; // Avisos flutuantes na tela
// PRESERVAÇÃO: Importação mantida conforme estrutura do projeto
import InstrumentCard from './InstrumentCard'; // Importa o cartão individual de cada instrumento

/**
 * Módulo de Contagem para Ensaios Regionais
 * v10.0 - FIX SIMULTANEIDADE: Implementação de repasse de Focus/Blur.
 * Permite que múltiplos contadores trabalhem sem que a tela "pule" ou "zere".
 */
const CounterRegional = ({ 
  instruments, // Lista de instrumentos vindos do banco
  localCounts, // Números atuais da contagem na tela
  sections, // Famílias de instrumentos (Cordas, Madeiras, etc)
  onUpdate, // Função para salvar o número digitado
  onToggleSection, // Função para assumir a posse de uma seção
  onAddExtra, // Função para adicionar um instrumento fora da lista
  userData, // Dados do usuário logado
  isClosed, // Indica se o ensaio já acabou
  currentEventId, // ID do evento atual
  onFocus, // NOVO: Função que avisa quando o usuário começa a digitar [v10.0]
  onBlur // NOVO: Função que avisa quando o usuário termina de digitar [v10.0]
}) => {
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por usuário
  const [openSections, setOpenSections] = useState({}); // Controla quais famílias estão abertas no celular do usuário

  const toggleAccordion = (section) => { // Abre ou fecha uma família de instrumentos
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSectionColor = (section) => { // Define a cor da barrinha lateral de cada família
    const s = section.toUpperCase();
    if (s.includes('CORDAS')) return 'bg-amber-500'; // Laranja para cordas
    if (s.includes('MADEIRAS')) return 'bg-emerald-500'; // Verde para madeiras
    if (s.includes('METAIS')) return 'bg-rose-500'; // Rosa/Vermelho para metais
    if (s.includes('SAX')) return 'bg-emerald-400'; // Verde claro para saxofones
    if (s.includes('ORGANISTAS')) return 'bg-purple-500'; // Roxo para organistas
    if (s.includes('IRMANDADE')) return 'bg-blue-600'; // Azul para irmandade
    return 'bg-slate-500'; // Cinza para o restante
  };

  const getSectionTotal = (sectionName) => { // Calcula a soma total de instrumentos naquela família
    const sName = sectionName.toUpperCase();
    
    // v8.12.6: Localização agressiva do ID Mestre para soma correta do cabeçalho
    const masterInst = (instruments || []).find(i => 
      i && i.id && !i.id.startsWith('meta_') && 
      (i.section || '').toUpperCase() === sName &&
      !['irmas', 'irmaos'].includes(i.id.toLowerCase())
    );

    // Se for seção protegida (Irmandade/Órgão), o total vem de um lugar específico no banco
    if (sName === 'IRMANDADE' || sName === 'ORGANISTAS') {
      const mId = masterInst?.id || (sName === 'IRMANDADE' ? 'Coral' : 'orgao');
      return parseInt(localCounts?.[mId]?.total) || 0;
    }
    
    // Soma todos os instrumentos que pertencem a esta família
    return (instruments || [])
      .filter(i => i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === sName)
      .reduce((acc, inst) => acc + (parseInt(localCounts?.[inst.id]?.total) || 0), 0);
  };

  return ( // Inicia o desenho da lista no celular
    <div className="space-y-4 pb-32 animate-premium text-left">
      {sections.map((section) => { // Varre cada família de instrumentos (Cordas, Metais, etc)
        const isIrmandade = section.toUpperCase() === 'IRMANDADE'; // Verifica se é a seção de irmas/irmaos
        const isOrganistas = section.toUpperCase() === 'ORGANISTAS'; // Verifica se é a seção de organistas
        
        const sectionInstruments = (instruments || []).filter(i => // Filtra os instrumentos que pertencem a esta família
          i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === section.toUpperCase()
        );

        // v8.12.6: Sincronização de ID Mestre com o banco de dados
        const masterId = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase()))?.id || (isIrmandade ? 'Coral' : isOrganistas ? 'orgao' : null);
        const masterData = localCounts?.[masterId] || {}; // Pega os dados brutos do mestre (ex: quem assumiu a contagem)

        const totalNaipe = getSectionTotal(section); // Pega o número total da família para mostrar no cabeçalho
        const isOpen = openSections[section]; // Verifica se esta família está aberta na tela agora

        return (
          <div key={section} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mx-2 text-left">
            {/* HEADER DO ACORDEÃO - O botão que abre a família */}
            <button 
              onClick={() => toggleAccordion(section)}
              className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${getSectionColor(section)}`} /> {/* Barrinha colorida lateral */}
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
                /> {/* Seta que gira ao abrir/fechar */}
              </div>
            </button>

            {/* CONTEÚDO EXPANSÍVEL - Aparece quando clica na família */}
            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-6 space-y-3 pt-2">
                    
                    {/* IRMANDADE: Tratamento especial para Irmãs e Irmãos */}
                    {isIrmandade ? (
                      <div className="space-y-3">
                        <InstrumentCard
                          key="irmas_row"
                          inst={{ id: 'irmas', nome: 'IRMÃS', label: 'IRMÃS', section: 'IRMANDADE' }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection(masterId, masterData?.responsibleId_irmas === userData?.uid, 'irmas')}
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus} // REPASSE: Avisa o pai sobre o foco [v10.0]
                          onBlur={onBlur} // REPASSE: Avisa o pai sobre a saída [v10.0]
                        />
                        <InstrumentCard
                          key="irmaos_row"
                          inst={{ id: 'irmaos', nome: 'IRMÃOS', label: 'IRMÃOS', section: 'IRMANDADE' }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection(masterId, masterData?.responsibleId_irmaos === userData?.uid, 'irmaos')}
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus} // REPASSE: Avisa o pai sobre o foco [v10.0]
                          onBlur={onBlur} // REPASSE: Avisa o pai sobre a saída [v10.0]
                        />
                      </div>
                    ) : isOrganistas ? ( // Tratamento especial para Órgão
                      <div className="space-y-3">
                        <InstrumentCard
                          key="orgao_row"
                          inst={{ id: 'orgao', nome: 'ÓRGÃO', label: 'ÓRGÃO', section: 'ORGANISTAS' }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection(masterId, masterData?.responsibleId === userData?.uid)}
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus} // REPASSE: Avisa o pai sobre o foco [v10.0]
                          onBlur={onBlur} // REPASSE: Avisa o pai sobre a saída [v10.0]
                        />
                      </div>
                    ) : (
                      /* LISTAGEM PADRÃO: Todos os outros instrumentos (Violinos, Flautas, etc) */
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
                              sectionName={section}
                              onFocus={onFocus} // REPASSE: Avisa o pai sobre o foco [v10.0]
                              onBlur={onBlur} // REPASSE: Avisa o pai sobre a saída [v10.0]
                            />
                          ))
                        ) : (
                          <p className="text-center py-4 text-[8px] font-bold text-slate-300 uppercase italic">Vazio</p>
                        )}
                      </>
                    )}
                    
                    {/* BOTÃO INSTRUMENTO EXTRA: Permite adicionar algo que não estava na lista original */}
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

export default CounterRegional; // Disponibiliza o componente para o restante do App