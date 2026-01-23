import React, { useState, useEffect, useMemo } from 'react';
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs } from '../../config/firebase';
import { eventService } from '../../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from '../dashboard/DashEventPage';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, 
  ChevronDown, Minus, Plus, ShieldCheck, Eye, UserCheck, PlusCircle, X, Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Importação do Cérebro de Autenticação (GPS de Acessos)
import { useAuth } from '../../context/AuthContext';

let debounceTimers = {};

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => {
  // EXTRAÇÃO DE PODERES: O componente agora identifica o nível do usuário via Contexto
  const { userData } = useAuth();
  const isMaster = userData?.isMaster;
  const isComissao = userData?.isComissao;
  const isCidade = userData?.isCidade;
  const isAdmin = userData?.isAdmin || isMaster || isComissao || isCidade;

  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]);
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');
  const [eventComumId, setEventComumId] = useState(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(null);
  const [showExtraModal, setShowExtraModal] = useState(null); // Seção alvo do extra
  const [extraName, setExtraName] = useState('');
  const [localCounts, setLocalCounts] = useState({});

  const isClosed = ataData?.status === 'closed';
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id;

  // Sincroniza as contagens vindas do Firebase com o estado local
  useEffect(() => { if (counts) setLocalCounts(counts); }, [counts]);

  useEffect(() => {
    if (!currentEventId) return;
    let isMounted = true;

    const loadData = async () => {
      // CORREÇÃO MESTRA: O ID da comum agora vem direto do GPS global que o App.jsx atualizou no clique.
      // Isso elimina a necessidade de buscar na lista allEvents e quebra o loop de sincronização.
      const targetComumId = userData?.activeComumId || userData?.comumId;

      if (targetComumId && isMounted) {
        setEventComumId(targetComumId);
        try {
          const snapNacional = await getDocs(collection(db, 'config_instrumentos_nacional'));
          if (isMounted) setInstrumentsNacionais(snapNacional.docs.map(d => ({ id: d.id, ...d.data() })));
          
          // Carrega configuração de instrumentos da igreja ativa no GPS
          const unsubInst = onSnapshot(collection(db, 'comuns', targetComumId, 'instrumentos_config'), 
            (snapshot) => { 
              if (isMounted) {
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setInstrumentsConfig(data); 
              }
            }
          );

          // Carrega o evento específico e desliga o Loading assim que os dados chegarem
          const unsubEvent = onSnapshot(doc(db, 'comuns', targetComumId, 'events', currentEventId), (s) => {
            if (s.exists() && isMounted) {
              const data = s.data();
              // Prioriza os dados reais salvos no documento do evento
              setAtaData(data.ata || { 
                status: 'open', 
                comumNome: data.comumNome || userData?.activeComumName || userData?.comum 
              });
              setEventDateRaw(data.date || '');
              setLoading(false);
            } 
            // CORREÇÃO DE TOLERÂNCIA: Removido o setLoading(false) imediato em caso de !exists
            // Isso evita o erro "Evento não localizado" enquanto as Rules Master estão processando.
          }, (err) => {
             console.error("Erro Snapshot Counter:", err);
             // Se houver erro de permissão (comum na troca de contexto Master), mantém o loading em vez de travar
             if (err.code === 'permission-denied' && isMounted) {
               console.log("Aguardando validação de regras Master...");
             } else if (isMounted) {
               setLoading(false);
             }
          });

          return () => { unsubInst(); unsubEvent(); };
        } catch (err) { 
          console.error("Erro no carregamento CounterPage:", err);
          if (isMounted) setLoading(false); 
        }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [currentEventId, userData?.activeComumId]);

  // --- LÓGICA DE TRADUÇÃO E COMPATIBILIDADE (O ESCUDO DE DADOS) ---
  const allInstruments = useMemo(() => {
    const ordemOficial = [
      'Coral', 'irmandade', 'orgao', 'violino', 'viola', 'violoncelo', 
      'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote',
      'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono',
      'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'
    ];

    const aliases = {
      'sax_alto': 'saxalto', 'sax_tenor': 'saxtenor', 'sax_soprano': 'saxsoprano',
      'sax_baritono': 'saxbaritono', 'clarone_alto': 'claronealto', 'clarone_baixo': 'claronebaixo',
      'corne_ingles': 'corneingles', 'corneinglês': 'corneingles', 'flugel': 'flugelhorn'
    };

    const base = instrumentsNacionais.map(instBase => {
      const override = instrumentsConfig.find(local => local.id === instBase.id);
      return override ? { ...instBase, ...override } : instBase;
    });

    const extras = Object.keys(localCounts)
      .filter(key => !key.startsWith('meta_') && !ordemOficial.includes(key) && !aliases[key])
      .map(key => ({
        id: key,
        name: localCounts[key].name || key.toUpperCase(),
        section: (localCounts[key].section || 'GERAL').toUpperCase(),
        evalType: localCounts[key].evalType || 'Sem'
      }));

    return [...base, ...extras].sort((a, b) => {
      const idxA = ordemOficial.indexOf(a.id);
      const idxB = ordemOficial.indexOf(b.id);
      return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
    });
  }, [instrumentsNacionais, instrumentsConfig, localCounts]);

  const sections = useMemo(() => {
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))]
      .sort((a, b) => {
        const idxA = ordemSessoes.indexOf(a);
        const idxB = ordemSessoes.indexOf(b);
        return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
      });
  }, [allInstruments]);

  const handleUpdateInstrument = (id, field, value, section) => {
    if (isClosed) return;
    setLocalCounts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    if (debounceTimers[id + field]) clearTimeout(debounceTimers[id + field]);
    debounceTimers[id + field] = setTimeout(async () => {
      try {
        await eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field, value, userData, section });
      } catch (e) { toast.error("Falha na sincronização."); }
    }, 1000);
  };

  const confirmAddExtra = async () => {
    if (!extraName.trim()) return toast.error("Informe o nome");
    const sec = showExtraModal;
    const idExtra = extraName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    
    if (allInstruments.find(i => i.id === idExtra)) {
      toast.error("Instrumento já existe.");
      return;
    }

    try {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { 
        instId: idExtra, field: 'total', value: 0, userData, section: sec, customName: extraName.toUpperCase() 
      });
      toast.success(`${extraName.toUpperCase()} incluído!`);
      setShowExtraModal(null);
      setExtraName('');
    } catch (e) { toast.error("Erro ao incluir."); }
  };

  const handleToggleGroup = (sec) => {
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = localCounts?.[metaKey]?.responsibleId;
    if (activeGroup === sec) { setActiveGroup(null); return; }
    if (responsibleId === myUID || isMaster || isComissao || isCidade) setActiveGroup(sec);
    else setShowOwnershipModal(sec);
  };

  const setOwnership = async (sec, wantsToOwn) => {
    if (!eventComumId || isClosed) return;
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    if (wantsToOwn) {
      try {
        await updateDoc(doc(db, 'comuns', eventComumId, 'events', currentEventId), {
          [`counts.${metaKey}.responsibleId`]: myUID,
          [`counts.${metaKey}.responsibleName`]: userData?.name || "Colaborador",
          [`counts.${metaKey}.updatedAt`]: Date.now()
        });
      } catch (e) { toast.error("Erro ao assumir seção."); return; }
    }
    setActiveGroup(sec);
    setShowOwnershipModal(null);
  };

  const isEditingEnabled = (sec) => isMaster || isComissao || isCidade || (!isClosed && localCounts?.[`meta_${sec.toLowerCase().replace(/\s/g, '_')}`]?.responsibleId === myUID);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans animate-premium">
      <header className="bg-white pt-6 pb-8 px-6 rounded-b-[3rem] shadow-sm border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-400 active:scale-90 transition-transform"><ChevronLeft size={20} strokeWidth={3} /></button>
          <div className="text-center px-4">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 italic leading-none">
              {ataData?.comumNome || userData?.activeComumName || userData?.comum || "Localidade"}
            </p>
            <h2 className="text-xl font-[900] text-slate-950 italic uppercase tracking-tighter">
                {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </h2>
          </div>
          <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 shadow-sm"><LogOut size={18} strokeWidth={3} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-44 no-scrollbar">
        <div className="max-w-md mx-auto space-y-3">
          {activeTab === 'contador' && sections.map(sec => {
            const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
            const responsibleName = localCounts?.[metaKey]?.responsibleName;
            const isOwner = localCounts?.[metaKey]?.responsibleId === myUID;
            
            const sectionTotal = allInstruments.filter(i => (i.section || "GERAL").toUpperCase() === sec).reduce((acc, inst) => {
                const c = localCounts?.[inst.id];
                return acc + (['irmandade', 'Coral'].includes(inst.id) ? (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0) : (parseInt(c?.total) || 0));
            }, 0);
            
            return (
              <React.Fragment key={sec}>
                {(sec === 'ORGANISTAS' || sec === 'CORDAS') && <div className="h-[2px] bg-slate-200/50 mx-10 my-4 rounded-full" />}
                
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => handleToggleGroup(sec)} className="w-full p-5 flex justify-between items-center active:bg-slate-50 transition-all">
                    <div className="flex flex-col items-start text-left leading-none gap-2">
                      <span className="font-[900] uppercase italic text-[11px] text-slate-950 tracking-tight">{sec}</span>
                      {responsibleName && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isOwner ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                          {isOwner ? <UserCheck size={7} strokeWidth={4}/> : <ShieldCheck size={7}/>}
                          <span className="text-[6px] font-black uppercase tracking-widest">{isOwner ? 'Sua Seção' : responsibleName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-950 text-white min-w-[36px] h-7 flex items-center justify-center rounded-lg font-black italic text-[10px] shadow-md">{sectionTotal}</div>
                      <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${activeGroup === sec ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {activeGroup === sec && (
                    <div className="p-3 pt-0 space-y-2 animate-in slide-in-from-top-2 duration-300">
                      {allInstruments.filter(i => (i.section || "GERAL").toUpperCase() === sec).map(inst => (
                         <InstrumentCard 
                          key={inst.id} inst={inst} 
                          data={localCounts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}} 
                          onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} 
                          disabled={!isEditingEnabled(sec)} 
                         />
                      ))}
                      {!isClosed && isEditingEnabled(sec) && sec !== 'IRMANDADE' && sec !== 'CORAL' && sec !== 'ORGANISTAS' && (
                        <button 
                          onClick={() => setShowExtraModal(sec)} 
                          className="w-full mt-2 py-4 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-2xl text-blue-600 flex items-center justify-center gap-2 text-[9px] font-[900] uppercase italic active:scale-95 transition-all group"
                        >
                          <PlusCircle size={16} className="group-hover:rotate-90 transition-transform"/> 
                          Adicionar Instrumento em {sec}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} userData={userData} isMaster={isMaster} isAdmin={isAdmin} />}
          {activeTab === 'dash' && <DashEventPage eventId={currentEventId} comumId={eventComumId} counts={localCounts} userData={userData} isAdmin={isAdmin} ataData={ataData} />}
        </div>
      </main>

      <AnimatePresence>
        {showOwnershipModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><ShieldCheck size={32} /></div>
              <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter text-xl">Assumir Seção?</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-8 leading-relaxed px-4">Você será o único editor autorizado para a seção <span className="text-slate-950">{showOwnershipModal}</span>.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setOwnership(showOwnershipModal, true)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2 shadow-blue-100"><Plus size={16} strokeWidth={3}/> Assumir Contagem</button>
                <button onClick={() => setOwnership(showOwnershipModal, false)} className="w-full py-4 text-slate-400 font-black uppercase text-[9px] tracking-widest active:opacity-50">Apenas visualizar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showExtraModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-[340px] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"/>
              <button onClick={() => {setShowExtraModal(null); setExtraName('');}} className="absolute top-6 right-6 text-slate-300 active:text-slate-950"><X size={24}/></button>
              
              <div className="mb-8">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 italic">Novo Registro</p>
                <h3 className="text-2xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">Instrumento Extra</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-2"><Music size={10}/> Nome do Instrumento</label>
                  <input 
                    autoFocus
                    placeholder="EX: SAX BAIXO, CORNET..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-6 text-xs font-black text-slate-950 outline-none uppercase italic shadow-inner focus:bg-white focus:border-blue-200 transition-all"
                    value={extraName}
                    onChange={(e) => setExtraName(e.target.value)}
                  />
                  <p className="text-[7px] font-bold text-slate-400 uppercase ml-2">Ele será agrupado em: <span className="text-blue-600">{showExtraModal}</span></p>
                </div>

                <button 
                  onClick={confirmAddExtra}
                  className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3"
                >
                  <Plus size={18}/> Confirmar Inclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/5 p-1.5 rounded-[2.2rem] shadow-2xl">
          <TabButton active={activeTab === 'contador'} icon={<LayoutGrid size={16}/>} label="Contar" onClick={() => setActiveTab('contador')} />
          <TabButton active={activeTab === 'ata'} icon={<ClipboardCheck size={16}/>} label="Ata" onClick={() => setActiveTab('ata')} />
          <TabButton active={activeTab === 'dash'} icon={<BarChart3 size={16}/>} label="Dash" onClick={() => setActiveTab('dash')} />
        </nav>
      </footer>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-2.5 px-6 rounded-[1.8rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-400'}`}>
    {icon}<span className="text-[7px] font-black uppercase italic mt-1 tracking-widest leading-none">{label}</span>
  </button>
);

const InstrumentCard = ({ inst, data, onUpdate, disabled }) => {
  const isIrmandade = ['irmandade', 'Coral'].includes(inst.id);
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0;
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;

  const handleUpdate = (field, value) => {
    if (disabled) return;
    let finalValue = Math.max(0, parseInt(value) || 0);
    if (!isIrmandade) {
        if ((field === 'comum' || field === 'enc') && finalValue > total) finalValue = total;
        if (field === 'total' && finalValue < comum) {
          onUpdate(inst.id, 'total', finalValue);
          onUpdate(inst.id, 'comum', finalValue);
          return;
        }
    }
    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-4 rounded-[1.8rem] border transition-all relative overflow-hidden ${disabled ? 'bg-slate-50/50 border-slate-100 opacity-80' : 'bg-white border-slate-100 shadow-sm hover:border-blue-100'}`}>
      {disabled && <div className="absolute top-3 right-5 flex items-center gap-1 opacity-40"><Eye size={8}/><span className="text-[5px] font-black uppercase italic">Leitura</span></div>}
      <div className="mb-3 text-left"><h5 className={`font-[900] text-[11px] italic uppercase ${disabled ? 'text-slate-400' : 'text-slate-950'}`}>{inst.name}</h5></div>
      <div className="flex gap-2">
          {isIrmandade ? (
            <>
              <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={disabled} />
              <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={disabled} />
            </>
          ) : (
            <>
              <CounterBox label="TOTAL" color="slate" val={total} onChange={v => handleUpdate('total', v)} disabled={disabled} />
              <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={disabled} />
              <div className="flex-[0.6] h-14 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center leading-none">
                  <p className="text-[5px] font-black uppercase text-slate-400 mb-1 tracking-tighter">VISITAS</p>
                  <span className={`font-[900] text-xl ${disabled ? 'text-slate-400' : 'text-slate-950'}`}>{Math.max(0, total - comum)}</span>
              </div>
            </>
          )}
      </div>
      {!isIrmandade && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
            <p className={`text-[8px] font-black uppercase italic tracking-widest ${disabled ? 'text-slate-300' : 'text-blue-600'}`}>{inst.id === 'orgao' ? 'Examinadora' : 'Encarregado'}</p>
            <div className={`flex items-center gap-3 px-2 py-1 rounded-xl border transition-all ${disabled ? 'bg-slate-100 border-slate-200' : 'bg-blue-50/50 border-blue-100'}`}>
                <button disabled={disabled} onClick={() => handleUpdate('enc', enc - 1)} className="w-7 h-7 bg-white text-blue-600 rounded-lg flex items-center justify-center active:scale-125 disabled:bg-transparent disabled:text-slate-200"><Minus size={12} strokeWidth={4}/></button>
                <input disabled={disabled} type="number" className="bg-transparent w-6 text-center font-black text-[12px] outline-none disabled:text-slate-300" value={enc} onChange={(e) => handleUpdate('enc', e.target.value)} />
                <button disabled={disabled} onClick={() => handleUpdate('enc', enc + 1)} className="w-7 h-7 bg-slate-950 text-white rounded-lg flex items-center justify-center active:scale-125 disabled:bg-transparent disabled:text-slate-200"><Plus size={12} strokeWidth={4}/></button>
            </div>
        </div>
      )}
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange, disabled }) => (
  <div className={`flex-1 h-14 rounded-xl border transition-all flex flex-col items-center justify-center leading-none ${disabled ? 'bg-slate-100 border-slate-200 opacity-60' : color === 'slate' ? 'bg-slate-950 text-white border-slate-900 shadow-lg' : 'bg-white border-slate-200'}`}>
    <p className={`text-[5px] font-black uppercase mb-1 tracking-tighter ${color === 'slate' ? 'text-white/40' : 'text-slate-400'}`}>{label}</p>
    <div className="flex items-center gap-1.5 px-2 w-full justify-between">
        <button disabled={disabled} onClick={() => onChange(val - 1)} className="active:scale-150 transition-transform"><Minus size={10} strokeWidth={4} className={color === 'slate' ? 'text-white/30' : 'text-slate-300'}/></button>
        <input disabled={disabled} type="number" className={`bg-transparent w-full text-center font-[900] text-xl outline-none appearance-none ${disabled ? 'text-slate-400' : ''}`} value={val} onChange={(e) => onChange(e.target.value)} />
        <button disabled={disabled} onClick={() => onChange(val + 1)} className="active:scale-150 transition-transform"><Plus size={10} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/></button>
    </div>
  </div>
);

export default CounterPage;