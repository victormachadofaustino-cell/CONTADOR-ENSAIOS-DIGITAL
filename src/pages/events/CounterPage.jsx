import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Explicação: Importa as ferramentas de memória e sincronização do React.
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, getDoc } from '../../config/firebase'; // Explicação: Conecta com o banco de dados Firebase.
import { eventService } from '../../services/eventService'; // Explicação: Importa o motor de salvamento de contagens.
import AtaPage from './AtaPage'; // Explicação: Importa a página de preenchimento da Ata.
import DashEventPage from '../dashboard/DashEventPage'; // Explicação: Importa o painel de gráficos local.
import DashEventRegionalPage from '../dashboard/DashEventRegionalPage'; // Explicação: Importa o painel de gráficos regional.
import toast from 'react-hot-toast'; // Explicação: Importa as notificações de aviso da tela.
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, Lock, Unlock, Trash2 // Explicação: Desenhos dos ícones dos botões.
} from 'lucide-react'; // Explicação: Biblioteca de ícones modernos.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Sistema de animações fluidas.
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa os dados e permissões do usuário logado.

// IMPORTAÇÃO DOS NOVOS COMPONENTES MODULARES
import CounterSection from './components/CounterSection'; // Explicação: Componente que agrupa instrumentos (ex: Cordas).
import OwnershipModal from './components/OwnershipModal'; // Explicação: Janela de "Deseja assumir esta seção?".
import ExtraInstrumentModal from './components/ExtraInstrumentModal'; // Explicação: Janela para adicionar instrumentos na hora.
import CounterRegional from './components/CounterRegional'; // Explicação: Modo de contagem em massa para eventos regionais.

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => { // Explicação: Inicia a estrutura da página de contagem.
  const { userData } = useAuth(); // Explicação: Puxa o crachá eletrônico do usuário logado.
  
  // Explicação: Define as permissões baseadas na nossa Regra de Ouro.
  const isMaster = userData?.isMaster; 
  const isComissao = userData?.isComissao;
  const isRegionalCidade = userData?.isRegionalCidade; 
  const isGemLocal = userData?.isGemLocal; 
  const isBasico = userData?.isBasico;
  
  const canEditAta = isGemLocal || isRegionalCidade || isComissao || isMaster; 

  const [activeTab, setActiveTab] = useState('contador'); // Explicação: Controla se estamos na aba de contagem, ata ou gráficos.
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Explicação: Lista nacional de instrumentos da CCB.
  const [instrumentsConfig, setInstrumentsConfig] = useState([]); // Explicação: Configurações específicas da igreja local.
  const [activeGroup, setActiveGroup] = useState(null); // Explicação: Qual naipe está aberto no momento.
  const [loading, setLoading] = useState(true); // Explicação: Tela de carregamento inicial.
  const [ataData, setAtaData] = useState(null); // Explicação: Dados da Ata do ensaio.
  const [eventDateRaw, setEventDateRaw] = useState(''); // Explicação: Data do evento no formato original.
  const [eventComumId, setEventComumId] = useState(null); // Explicação: ID da igreja onde ocorre o evento.
  const [showOwnershipModal, setShowOwnershipModal] = useState(null); // Explicação: Controla a janela de "Assumir Seção".
  
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null); 
  const [localCounts, setLocalCounts] = useState({}); // Explicação: O que o usuário vê na tela (espelho do banco).

  const [isCountsLocked, setIsCountsLocked] = useState(false); // Explicação: Trava de finalização da contagem.

  const lastLocalUpdateRef = useRef(0); // Explicação: Guarda o horário exato da última alteração feita neste celular.
  const [focusedField, setFocusedField] = useState(null); // Explicação: Impede o banco de apagar o campo onde o usuário está digitando.

  const isClosed = ataData?.status === 'closed'; 
  const myUID = auth.currentUser?.uid; 

  // v10.9.1: Sincronização Estabilizada Otimista
  useEffect(() => { 
    const isFreshLocalUpdate = Date.now() - lastLocalUpdateRef.current < 3000; 

    if (counts && !isFreshLocalUpdate) { 
      if (focusedField) { 
        const [instId, field] = focusedField.split('_'); 
        setLocalCounts(prev => { 
          const newCounts = { ...counts }; 
          if (newCounts[instId]) { 
            newCounts[instId] = { ...newCounts[instId], [field]: prev[instId]?.[field] }; 
          }
          return newCounts; 
        });
      } else { 
        setLocalCounts(counts); 
      }
    }
  }, [counts, focusedField]);

  // CARREGAMENTO DE INSTRUMENTOS
  useEffect(() => { 
    let isMounted = true; 
    const loadInstruments = async () => {
      try {
        const nacSnap = await getDocs(query(collection(db, 'config_instrumentos_nacional'), orderBy('name', 'asc'))); 
        if (isMounted) setInstrumentsNacionais(nacSnap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        if (eventComumId) { 
          const locSnap = await getDocs(collection(db, 'comuns', eventComumId, 'instrumentos_config')); 
          if (isMounted) setInstrumentsConfig(locSnap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        }
      } catch (e) {} 
      finally { if (isMounted) setLoading(false); }
    };
    loadInstruments(); 
    return () => { isMounted = false; }; 
  }, [eventComumId]);

  // MONITOR DE ENSAIO
  useEffect(() => { 
    if (!currentEventId) return; 
    let isMounted = true; 
    const eventRef = doc(db, 'events_global', currentEventId); 
    const unsubEvent = onSnapshot(eventRef, (s) => {
      if (s.exists() && isMounted) { 
        const data = s.data(); 
        const ataConsolidada = { 
          ...data.ata,
          date: data.date, 
          comumId: data.comumId,
          comumNome: data.comumNome,
          status: data.ata?.status || 'open',
          scope: data.scope || 'local'
        };
        setAtaData(ataConsolidada); 
        setEventComumId(data.comumId); 
        setEventDateRaw(data.date || ''); 
        setIsCountsLocked(data.countsLocked || false); 
        
        const isFreshLocalUpdate = Date.now() - lastLocalUpdateRef.current < 3000;
        if (!isFreshLocalUpdate) { 
          setLocalCounts(data.counts || {}); 
        }
      }
    });
    return () => { isMounted = false; unsubEvent(); }; 
  }, [currentEventId]);

  const allInstruments = useMemo(() => { 
    const ordemOficial = ['Coral', 'irmandade', 'irmas', 'irmaos', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    let base = instrumentsNacionais.map(instBase => { 
      const override = instrumentsConfig.find(local => local.id === instBase.id); 
      return override ? { ...instBase, ...override } : instBase; 
    });
    const extraIdsNoBanco = Object.keys(localCounts).filter(k => !k.startsWith('meta_') && !base.find(b => b.id === k));
    const extras = extraIdsNoBanco.map(id => ({
      id: id,
      name: localCounts[id].name || id.replace('extra_', '').toUpperCase(),
      section: (localCounts[id].section || 'GERAL').toUpperCase(),
      isExtra: true
    }));
    return [...base, ...extras].sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99));
  }, [instrumentsNacionais, instrumentsConfig, localCounts]);

  const sections = useMemo(() => { 
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99));
  }, [allInstruments]);

  const handleFocus = (instId, field) => setFocusedField(`${instId}_${field}`); 
  const handleBlur = () => setFocusedField(null); 

  const isEditingEnabled = (sec, subInstId = null) => { 
    if (isClosed || isCountsLocked) return false; 
    if (isComissao) return true; 
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; 
    if (ataData?.scope !== 'regional') return localCounts?.[metaKey]?.responsibleId === myUID; 
    const sectionInstruments = allInstruments.filter(i => (i.section || '').toUpperCase() === sec.toUpperCase());
    const mestre = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase()));
    const masterData = localCounts?.[mestre?.id];
    if (subInstId === 'irmas' || subInstId === 'irmaos') return masterData?.[`responsibleId_${subInstId}`] === myUID; 
    return masterData?.responsibleId === myUID; 
  };

  const handleUpdateInstrument = (id, field, value, section) => { 
    if (isClosed || isCountsLocked) return; 
    lastLocalUpdateRef.current = Date.now(); 
    setLocalCounts(prev => { 
      const targetId = (section?.toUpperCase() === 'IRMANDADE') ? 'Coral' : (section?.toUpperCase() === 'ORGANISTAS') ? 'orgao' : id;
      return { ...prev, [targetId]: { ...prev[targetId], [field]: Math.max(0, parseInt(value) || 0) } }; 
    });
    eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field, value, userData, section })
      .catch(() => toast.error("Erro na sincronização."));
  };

  const handleAddExtraInstrument = async (nome) => { 
    if (!nome.trim() || !extraInstrumentSection || !isGemLocal || isCountsLocked) return;
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, '')}_${Date.now()}`;
    try {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: idSaneado, field: 'total', value: 0, userData, section: extraInstrumentSection, customName: nome.toUpperCase().trim() });
      setExtraInstrumentSection(null);
      toast.success("Instrumento adicionado!");
    } catch (e) {}
  };

  const handleToggleGroup = (sec) => { 
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec); 
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; 
    const responsibleId = localCounts?.[metaKey]?.responsibleId; 
    if (activeGroup === sec) { setActiveGroup(null); return; } 
    if (isComissao || responsibleId === myUID) { setActiveGroup(sec); } 
    else { setShowOwnershipModal(sec); }
  };

  const setOwnership = async (id, currentOwnerStatus, subRole = null) => { 
    if (!eventComumId || isClosed || !currentEventId || isCountsLocked || !myUID) return; 
    const respIdKey = subRole ? `responsibleId_${subRole}` : `responsibleId`; 
    const nameKey = subRole ? `responsibleName_${subRole}` : `responsibleName`; 
    
    lastLocalUpdateRef.current = Date.now(); 
    setLocalCounts(prev => ({
      ...prev,
      [id]: { ...prev[id], [respIdKey]: myUID, [nameKey]: userData?.name || "Você" }
    }));
    setShowOwnershipModal(null);
    if (id.startsWith('meta_')) setActiveGroup(id.replace('meta_', '').toUpperCase()); 

    try {
      await updateDoc(doc(db, 'events_global', currentEventId), { 
        [`counts.${id}.${respIdKey}`]: myUID,
        [`counts.${id}.${nameKey}`]: userData?.name || "Colaborador",
        updatedAt: Date.now()
      });
      toast.success("Zeladoria assumida.");
    } catch (e) {
      toast.error("Erro ao sincronizar.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      {/* AJUSTE v11.0: HEADER COM CENTRALIZAÇÃO ABSOLUTA */}
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50 relative">
        <div className="flex justify-between items-center max-w-md mx-auto w-full relative h-12">
          
          {/* BOTÃO VOLTAR (Lado Esquerdo Fixo) */}
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all z-10">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
          
          {/* TÍTULO CENTRALIZADO (Eixo Absoluto) */}
          {/* Explicação: Usamos absolute center para garantir que a data e a comum fiquem milimetricamente no meio. */}
          <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[14px] font-bold text-slate-900 leading-none">
              {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
               {ataData?.scope === 'regional' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"/>}
               <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-[150px]">
                 {ataData?.comumNome || "Localidade"}
               </h2>
            </div>
          </div>

          {/* BOTÃO DIREITO (Cadeado/Lacre) */}
          <div className="flex items-center gap-2 z-10">
            {(ataData?.scope === 'regional' ? (isComissao || isMaster) : isRegionalCidade) && !isClosed && ( 
              <button onClick={() => updateDoc(doc(db, 'events_global', currentEventId), { countsLocked: !isCountsLocked, updatedAt: Date.now() })} className={`p-3 rounded-2xl active:scale-90 transition-all border ${isCountsLocked ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {isCountsLocked ? <Lock size={18} strokeWidth={3}/> : <Unlock size={18} strokeWidth={3}/>}
              </button>
            )}
            {/* Explicação: O botão de lixeira ou log-out foi removido daqui para evitar duplicidade com a seta de voltar. */}
            {/* Se houver necessidade de um botão específico de lixeira, ele aparecerá aqui apenas para quem pode. */}
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar">
        <div className="max-w-md mx-auto">
          {activeTab === 'contador' && (
            <>
              <AnimatePresence>
                {isCountsLocked && ( 
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-100">
                    <Lock size={16} className="shrink-0" /><span className="text-[9px] font-black uppercase italic tracking-widest leading-none">Contagem Finalizada - Somente Leitura</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {ataData?.scope === 'regional' ? (
                <CounterRegional instruments={allInstruments} localCounts={localCounts} sections={sections} onUpdate={handleUpdateInstrument} onToggleSection={(id, status, role) => setOwnership(id, status, role)} userData={userData} isClosed={isClosed || isCountsLocked} currentEventId={currentEventId} onFocus={handleFocus} onBlur={handleBlur} isEditingEnabled={isEditingEnabled} />
              ) : (
                sections.map((sec) => (
                  <CounterSection key={sec} sec={sec} allInstruments={allInstruments} localCounts={localCounts} myUID={myUID} activeGroup={activeGroup} handleToggleGroup={handleToggleGroup} handleUpdateInstrument={handleUpdateInstrument} isEditingEnabled={isEditingEnabled} onAddExtra={(s) => isGemLocal && setExtraInstrumentSection(s)} onFocus={handleFocus} onBlur={handleBlur} ataData={ataData} userData={userData} />
                ))
              )}
            </>
          )}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} />}
          {activeTab === 'dash' && (
            ataData?.scope === 'regional' ? (
              <DashEventRegionalPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} />
            ) : (
              <DashEventPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} />
            )
          )}
        </div>
      </main>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl">
          <TabButton active={activeTab === 'contador'} icon={<LayoutGrid size={18}/>} label="Contar" onClick={() => setActiveTab('contador')} />
          <TabButton active={activeTab === 'ata'} icon={<ClipboardCheck size={18}/>} label="Ata" onClick={() => setActiveTab('ata')} />
          <TabButton active={activeTab === 'dash'} icon={<BarChart3 size={18}/>} label="Dash" onClick={() => setActiveTab('dash')} />
        </nav>
      </footer>

      <AnimatePresence>
        {showOwnershipModal && (
          <OwnershipModal showOwnershipModal={showOwnershipModal} localCounts={localCounts} myUID={myUID} userData={userData} onConfirm={(sec) => setOwnership(`meta_${sec.toLowerCase().replace(/\s/g, '_')}`, true)} onCancel={() => setShowOwnershipModal(null)} />
        )}
        {extraInstrumentSection && (
          <ExtraInstrumentModal section={extraInstrumentSection} onConfirm={handleAddExtraInstrument} onCancel={() => setExtraInstrumentSection(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-50'}`}>
    {icon}<span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">{label}</span>
  </button>
);

export default CounterPage;