import React, { useState, useMemo } from 'react'; // Explicação: Ferramentas básicas para criar a tela e memorizar cálculos.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Ferramentas para animações suaves de abrir e fechar as famílias.
import { Plus, UserPlus, ChevronDown, Users } from 'lucide-react'; // Explicação: Ícones visuais (mais, seta, pessoas).
import { db, doc, writeBatch } from '../../../config/firebase'; // Explicação: Conexão com o banco de dados do Google.
import toast from 'react-hot-toast'; // Explicação: Avisos flutuantes na tela.
// PRESERVAÇÃO: Importação mantida conforme estrutura do projeto
import InstrumentCard from './InstrumentCard'; // Explicação: Importa o cartão individual de cada instrumento.

/**
 * Módulo de Contagem para Ensaios Regionais
 * v10.1 - FIX SIMULTANEIDADE & REGRA DE OURO
 * Permite que múltiplos contadores trabalhem sem que a tela "pule" ou "zere".
 */
const CounterRegional = ({ 
  instruments, // Explicação: Lista de instrumentos vindos do banco.
  localCounts, // Explicação: Números atuais da contagem na tela.
  sections, // Explicação: Famílias de instrumentos (Cordas, Madeiras, etc).
  onUpdate, // Explicação: Função para salvar o número digitado.
  onToggleSection, // Explicação: Função para assumir a posse de uma seção.
  onAddExtra, // Explicação: Função para adicionar um instrumento fora da lista.
  userData, // Explicação: Dados do usuário logado (Crachá).
  isClosed, // Explicação: Indica se o ensaio já acabou (Bloqueio total).
  currentEventId, // Explicação: ID do evento atual.
  onFocus, // Explicação: Função que avisa quando o usuário começa a digitar [v10.0].
  onBlur // Explicação: Função que avisa quando o usuário termina de digitar [v10.0].
}) => {
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por usuário.
  const [openSections, setOpenSections] = useState({}); // Explicação: Controla quais famílias estão abertas no celular do usuário.

  const toggleAccordion = (section) => { // Explicação: Abre ou fecha uma família de instrumentos (ex: abre Cordas).
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSectionColor = (section) => { // Explicação: Define a cor da barrinha lateral de cada família para facilitar a identificação.
    const s = section.toUpperCase();
    if (s.includes('CORDAS')) return 'bg-amber-500'; // Explicação: Laranja para cordas.
    if (s.includes('MADEIRAS')) return 'bg-emerald-500'; // Explicação: Verde para madeiras.
    if (s.includes('METAIS')) return 'bg-rose-500'; // Explicação: Rosa/Vermelho para metais.
    if (s.includes('SAX')) return 'bg-emerald-400'; // Explicação: Verde claro para saxofones.
    if (s.includes('ORGANISTAS')) return 'bg-purple-500'; // Explicação: Roxo para organistas.
    if (s.includes('IRMANDADE')) return 'bg-blue-600'; // Explicação: Azul para irmandade.
    return 'bg-slate-500'; // Explicação: Cinza para o restante.
  };

  const getSectionTotal = (sectionName) => { // Explicação: Calculates a soma de todos os instrumentos de uma família para mostrar no cabeçalho.
    const sName = sectionName.toUpperCase();
    
    // Explicação: Localiza o ID principal para soma correta do cabeçalho.
    const masterInst = (instruments || []).find(i => 
      i && i.id && !i.id.startsWith('meta_') && 
      (i.section || '').toUpperCase() === sName &&
      !['irmas', 'irmaos'].includes(i.id.toLowerCase())
    );

    // Explicação: Se for Irmandade ou Órgão, busca o total consolidado.
    if (sName === 'IRMANDADE' || sName === 'ORGANISTAS') {
      const mId = masterInst?.id || (sName === 'IRMANDADE' ? 'coral' : 'orgao'); // Explicação: Modificado de 'Coral' para 'coral' minúsculo para casar com a malha unificada do Firestore.
      return parseInt(localCounts?.[mId]?.total) || 0; // Explicação: Extrai o total numérico do nó de dados correspondente.
    }
    
    // Explicação: Soma todos os instrumentos que pertencem a esta família.
    return (instruments || [])
      .filter(i => i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === sName)
      .reduce((acc, inst) => acc + (parseInt(localCounts?.[inst.id]?.total) || 0), 0); // Explicação: Acumula a soma dos subcampos.
  };

  return ( // Explicação: Inicia o desenho da lista de famílias no celular.
    <div className="space-y-4 pb-32 animate-premium text-left">
      {sections.map((section) => { // Explicação: Percorre cada grupo (Cordas, Metais, etc).
        const isIrmandade = section.toUpperCase() === 'IRMANDADE'; // Explicação: Identifica se o naipe varrido corresponde à Irmandade geral.
        const isOrganistas = section.toUpperCase() === 'ORGANISTAS'; // Explicação: Identifica se o naipe varrido corresponde às organistas.
        
        // 🚀 ORDENAÇÃO DINÂMICA REGIONAL (CAMINHO 2): Alinha e filtra as pílulas organizadas pelo peso numérico da propriedade .ordem da Comum!
        const sectionInstruments = (instruments || [])
          .filter(i => i && i.id && !i.id.startsWith('meta_') && (i.section || '').toUpperCase() === section.toUpperCase())
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)); // Explicação: Organiza de forma crescente o array pelos pesos numéricos do Firebase, casando com o Front.

        // Explicação: Sincroniza o ID Mestre para controle de posse em caixa baixa.
        const masterId = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase()))?.id || (isIrmandade ? 'coral' : isOrganistas ? 'orgao' : null); // Explicação: Sincroniza o ID Mestre para controle de posse em caixa baixa.
        const masterData = localCounts?.[masterId] || {}; // Explicação: Resgata o mapa de dados e assinaturas do instrumento mestre da RAM.

        const totalNaipe = getSectionTotal(section); // Explicação: Pega o total do grupo.
        const isOpen = openSections[section]; // Explicação: Checa se a sanfona está aberta.

        return (
          <div key={section} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mx-2 text-left">
            {/* HEADER - Botão de abertura da família */}
            <button 
              onClick={() => toggleAccordion(section)} // Explicação: Abre ou fecha o colapsável correspondente.
              className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-all text-left" // Explicação: Layout Tailwind expansível.
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${getSectionColor(section)}`} /> 
                <div className="leading-none text-left">
                  <p className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter mb-1 leading-none">{section}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
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
              {isOpen && ( // Explicação: Se a sanfona estiver marcada como aberta, renderiza o bloco interno com animação.
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} // Explicação: Estado inicial encolhido e transparente.
                  animate={{ height: 'auto', opacity: 1 }} // Explicação: Expande automaticamente a altura de forma fluida.
                  exit={{ height: 0, opacity: 0 }} // Explicação: Encolhe suavemente na saída.
                  transition={{ duration: 0.3, ease: "easeInOut" }} // Explicação: Define o tempo de transição de 300 milissegundos.
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-6 space-y-3 pt-2 text-left">
                    
                    {isIrmandade ? ( // Explicação: Layout para Irmãs e Irmãos.
                      <div className="space-y-3 text-left">
                        <InstrumentCard
                          key="irmas_row"
                          inst={{ id: 'irmas', nome: 'IRMÃS', label: 'IRMÃS', section: 'IRMANDADE' }} // Explicação: Entrega o objeto fixo de mapeamento.
                          data={masterData} // Explicação: Passa o mapa de dados e responsáveis do Coral.
                          onUpdate={onUpdate} // Explicação: Vincula a ação de alteração numérica.
                          onToggleOwnership={() => onToggleSection(masterId, masterData?.responsibleId_irmas === userData?.uid, 'irmas')} // Explicação: Dispara a posse individual da ala feminina.
                          userData={userData} // Explicação: Repassa o crachá do secretário ativo.
                          isClosed={isClosed} // Explicação: Trava de encerramento de ata.
                          isRegional={true} // Explicação: Força a flag de comportamento regional.
                          sectionName={section} // Explicação: Repassa o nome do naipe.
                          onFocus={onFocus} // Explicação: Protege o campo contra zeragem externa.
                          onBlur={onBlur} // Explicação: Desativa a trava de foco.
                        />
                        <InstrumentCard
                          key="irmaos_row"
                          inst={{ id: 'irmaos', nome: 'IRMÃOS', label: 'IRMÃOS', section: 'IRMANDADE' }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection(masterId, masterData?.responsibleId_irmaos === userData?.uid, 'irmaos')} // Explicação: Dispara a posse individual da ala masculina.
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    ) : isOrganistas ? ( // Explicação: Layout para Órgão.
                      <div className="space-y-3 text-left">
                        <InstrumentCard
                          key="orgao_row"
                          inst={{ id: 'orgao', nome: 'ÓRGÃO', label: 'ÓRGÃO', section: 'ORGANISTAS' }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() => onToggleSection(masterId, masterData?.responsibleId === userData?.uid)} // Explicação: Dispara a posse do teclado do órgão.
                          userData={userData}
                          isClosed={isClosed}
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    ) : (
                      /* LISTAGEM PADRÃO SEGUIDO POR CADEIRAS DINÂMICAS: Violinos, Flautas, etc */
                      <div className="space-y-3 text-left">
                        {sectionInstruments.length > 0 ? (
                          sectionInstruments.map((inst) => (
                            <InstrumentCard
                              key={inst.id}
                              inst={inst}
                              data={localCounts?.[inst.id] || {}}
                              onUpdate={onUpdate}
                              onToggleOwnership={() => onToggleSection(inst.id, localCounts?.[inst.id]?.responsibleId === userData?.uid)} // Explicação: Posse individualizada por instrumento linear da orquestra.
                              userData={userData}
                              isClosed={isClosed}
                              isRegional={true}
                              sectionName={section}
                              onFocus={onFocus}
                              onBlur={onBlur}
                            />
                          ))
                        ) : (
                          <p className="text-center py-4 text-[8px] font-bold text-slate-300 uppercase italic">Vazio</p>
                        )}
                      </div>
                    )}
                    
                    {/* BOTÃO INSTRUMENTO EXTRA */}
                    {!isClosed && !isIrmandade && !isOrganistas && (
                      <button
                        onClick={() => onAddExtra(section)} // Explicação: Abre o modal para cadastrar novos itens dinâmicos.
                        className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all cursor-pointer"
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

export default CounterRegional; // Explicação: Exporta o componente pronto para o regional.