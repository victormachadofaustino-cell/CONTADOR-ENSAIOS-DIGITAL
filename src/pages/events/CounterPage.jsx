import React, { useState, useEffect, useMemo } from 'react';
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, getDoc } from '../../config/firebase';
import { eventService } from '../../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from '../dashboard/DashEventPage';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, 
  ChevronDown, Minus, Plus, ShieldCheck, Eye, UserCheck, PlusCircle, X, Music, AlertCircle, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

let debounceTimers = {};

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => {
  const { userData } = useAuth();
  const level = userData?.accessLevel;
  
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  
  const canEditAta = isGemLocal; 

  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]);
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');
  const [eventComumId, setEventComumId] = useState(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(null);
  const [showExtraModal, setShowExtraModal] = useState(null); 
  const [extraName, setExtraName] = useState('');
  const [localCounts, setLocalCounts] = useState({});

  const isClosed = ataData?.status === 'closed';
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id;

  useEffect(() => { if (counts) setLocalCounts(counts); }, [counts]);

  useEffect(() => {
    if (!activeGroup || !currentEventId || isClosed) return;
    
    const metaKey = `meta_${activeGroup.toLowerCase().replace(/\s/g, '_')}`;
    const isOwner = localCounts?.[metaKey]?.responsibleId === myUID;

    if (isOwner) {
      const setSession = async (status) => {
        try {
          await updateDoc(doc(db, 'events_global', currentEventId), {
            [`counts.${metaKey}.isActive`]: status,
            [`counts.${metaKey}.lastHeartbeat`]: Date.now()
          });
        } catch (e) { console.error("Erro sessão:", e); }
      };

      setSession(true);
      return () => setSession(false);
    }
  }, [activeGroup, currentEventId, isClosed, myUID]);

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
      } catch (e) { console.error(e); }
    };
    loadInstruments();
    return () => { isMounted = false; };
  }, [eventComumId]);

  useEffect(() => {
    if (!currentEventId) return;
    let isMounted = true;

    const loadData = async () => {
      const eventRef = doc(db, 'events_global', currentEventId);
      
      const unsubEvent = onSnapshot(eventRef, (s) => {
        if (s.exists() && isMounted) {
          const data = s.data();
          
          const ataConsolidada = {
            ...data.ata,
            date: data.date, 
            comumId: data.comumId,
            comumNome: data.comumNome,
            status: data.ata?.status || 'open'
          };

          setAtaData(ataConsolidada);
          setEventComumId(data.comumId);
          setEventDateRaw(data.date || '');
          if (data.counts) setLocalCounts(data.counts);
          setLoading(false);
        }
      });
      return () => unsubEvent();
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentEventId]);

  const allInstruments = useMemo(() => {
    const ordemOficial = ['Coral', 'irmandade', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    const base = instrumentsNacionais.map(instBase => {
      const override = instrumentsConfig.find(local => local.id === instBase.id);
      return override ? { ...instBase, ...override } : instBase;
    });
    const extras = Object.keys(localCounts).filter(key => !key.startsWith('meta_') && !ordemOficial.includes(key)).map(key => ({ id: key, name: localCounts[key].name || key.toUpperCase(), section: (localCounts[key].section || 'GERAL').toUpperCase() }));
    return [...base, ...extras].sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99));
  }, [instrumentsNacionais, instrumentsConfig, localCounts]);

  const sections = useMemo(() => {
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99));
  }, [allInstruments]);

  const handleUpdateInstrument = (id, field, value, section) => {
    if (isClosed) return;
    setLocalCounts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    if (debounceTimers[id + field]) clearTimeout(debounceTimers[id + field]);
    debounceTimers[id + field] = setTimeout(async () => {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field, value, userData, section });
    }, 450);
  };

  const handleToggleGroup = (sec) => {
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = localCounts?.[metaKey]?.responsibleId;
    
    if (activeGroup === sec) { setActiveGroup(null); return; }
    
    if (isMaster || responsibleId === myUID) {
      setActiveGroup(sec);
    } else {
      setShowOwnershipModal(sec);
    }
  };

  const setOwnership = async (sec, wantsToOwn) => {
    if (!eventComumId || isClosed) return;
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    
    if (wantsToOwn) {
      try {
        await updateDoc(doc(db, 'events_global', currentEventId), {
          [`counts.${metaKey}.responsibleId`]: myUID,
          [`counts.${metaKey}.responsibleName`]: userData?.name || "Colaborador",
          [`counts.${metaKey}.isActive`]: true,
          [`counts.${metaKey}.updatedAt`]: Date.now()
        });
      } catch (e) { toast.error("Erro ao assumir seção."); return; }
    }
    setActiveGroup(sec);
    setShowOwnershipModal(null);
  };

  const isEditingEnabled = (sec) => isMaster || (!isClosed && localCounts?.[`meta_${sec.toLowerCase().replace(/\s/g, '_')}`]?.responsibleId === myUID);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando Jurisdição...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans animate-premium">
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
          <div className="text-center px-4 overflow-hidden flex flex-col gap-0.5">
            <p className="text-[14px] font-bold text-slate-900 leading-none">
              {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </p>
            <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-[180px]">
              {ataData?.comumNome || "Localidade"}
            </h2>
          </div>
          <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 transition-all border border-red-100">
            <LogOut size={18} strokeWidth={3} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar">
        <div className="max-w-md mx-auto">
          {activeTab === 'contador' && sections.map((sec, sIdx) => {
            const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
            const responsibleName = localCounts?.[metaKey]?.responsibleName;
            const isOwner = localCounts?.[metaKey]?.responsibleId === myUID;
            const inUse = localCounts?.[metaKey]?.isActive;
            
            const sectionTotal = allInstruments.filter(i => (i.section || "GERAL").toUpperCase() === sec).reduce((acc, inst) => {
                const c = localCounts?.[inst.id];
                return acc + (['irmandade', 'Coral'].includes(inst.id) ? (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0) : (parseInt(c?.total) || 0));
            }, 0);

            const isLastIrmandade = sec === 'IRMANDADE' || sec === 'CORAL';
            const isOrganistas = sec === 'ORGANISTAS';
            const extraSpacing = (isLastIrmandade || isOrganistas) ? "mb-10" : "mb-3";
            
            return (
              <div key={sec} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing}`}>
                <button onClick={() => handleToggleGroup(sec)} className="w-full p-6 flex justify-between items-center active:bg-slate-50 transition-all">
                  <div className="flex flex-col items-start text-left leading-none gap-2">
                    <span className="font-[900] uppercase italic text-[13px] text-slate-950 tracking-tight">{sec}</span>
                    {responsibleName && (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isOwner ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100' : inUse ? 'bg-amber-50 border-amber-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                        {isOwner ? <UserCheck size={8} strokeWidth={4}/> : inUse ? <AlertCircle size={8} /> : <ShieldCheck size={8}/>}
                        <span className="text-[7px] font-black uppercase tracking-widest">
                          {isOwner ? 'Sua Seção' : inUse ? `Ocupado: ${responsibleName}` : responsibleName}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-950 text-white min-w-[42px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-lg border border-white/10">{sectionTotal}</div>
                    <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 ${activeGroup === sec ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {activeGroup === sec && (
                  <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    {allInstruments.filter(i => (i.section || "GERAL").toUpperCase() === sec).map(inst => (
                       <InstrumentCard key={inst.id} inst={inst} data={localCounts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}} onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} disabled={!isEditingEnabled(sec)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} userData={userData} isMaster={isMaster} isAdmin={canEditAta} />}
          {activeTab === 'dash' && <DashEventPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} />}
        </div>
      </main>

      <AnimatePresence>
        {showOwnershipModal && (() => {
          const metaKey = `meta_${showOwnershipModal.toLowerCase().replace(/\s/g, '_')}`;
          const currentInUse = localCounts?.[metaKey]?.isActive;
          const currentOwner = localCounts?.[metaKey]?.responsibleName;

          return (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ${currentInUse ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {currentInUse ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
                </div>
                <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter text-xl">
                  {currentInUse ? 'Seção em Uso' : 'Acessar Seção'}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-8 leading-relaxed px-4 italic">
                  {currentInUse 
                    ? `O irmão ${currentOwner} está realizando a contagem neste momento. Deseja apenas visualizar os dados em tempo real?`
                    : currentOwner 
                      ? `Esta seção pertence a ${currentOwner}, mas ele não está editando agora. Deseja assumir a responsabilidade ou apenas visualizar?`
                      : "Esta seção está livre. Deseja assumir a responsabilidade da contagem?"
                  }
                </p>
                <div className="flex flex-col gap-3">
                  {!currentInUse && (
                    <button onClick={() => setOwnership(showOwnershipModal, true)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-xl flex items-center justify-center gap-2 shadow-blue-100"><UserCheck size={16}/> Assumir Seção</button>
                  )}
                  <button onClick={() => setOwnership(showOwnershipModal, false)} className="w-full bg-slate-100 text-slate-900 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 flex items-center justify-center gap-2"><Eye size={16}/> Apenas Visualizar</button>
                  <button onClick={() => setShowOwnershipModal(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[9px] tracking-widest active:opacity-50">Cancelar</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl">
          <TabButton active={activeTab === 'contador'} icon={<LayoutGrid size={18}/>} label="Contar" onClick={() => setActiveTab('contador')} />
          <TabButton active={activeTab === 'ata'} icon={<ClipboardCheck size={18}/>} label="Ata" onClick={() => setActiveTab('ata')} />
          <TabButton active={activeTab === 'dash'} icon={<BarChart3 size={18}/>} label="Dash" onClick={() => setActiveTab('dash')} />
        </nav>
      </footer>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-500'}`}>
    {icon}<span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">{label}</span>
  </button>
);

const InstrumentCard = ({ inst, data, onUpdate, disabled }) => {
  const isIrmandade = ['irmandade', 'Coral'].includes(inst.id);
  const isOrganista = ['orgao'].includes(inst.id);
  
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0;
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  const visitas = Math.max(0, total - comum);
  const encarregadoHabilitado = total > 0;

  const handleUpdate = (field, value) => {
    if (disabled) return;
    let finalValue = Math.max(0, parseInt(value) || 0);

    if (field === 'comum' && finalValue > total) {
      finalValue = total;
    }

    if (field === 'enc' && finalValue > total) {
        finalValue = total;
    }

    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-4 rounded-[2.2rem] border transition-all relative overflow-hidden ${disabled ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-100 shadow-md'}`}>
      <div className="mb-3 flex items-center justify-between">
        <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tight">{inst.name}</h5>
        {disabled && <Eye size={12} className="text-slate-300" />}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 h-24">
            {isIrmandade ? (
              <>
                <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={disabled} />
                <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={disabled} />
              </>
            ) : (
              <>
                <CounterBox label="TOTAL" color="slate" val={total} onChange={v => handleUpdate('total', v)} disabled={disabled} />
                <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={disabled} />
                
                <div className="flex-1 flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-2xl leading-none shadow-inner">
                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Visitas</span>
                  <span className="text-3xl font-[900] text-blue-600 italic leading-none">{visitas}</span>
                </div>
              </>
            )}
        </div>

        {!isIrmandade && (
          <div className={`flex items-center gap-2 pt-1 transition-all duration-300 ${!encarregadoHabilitado ? 'opacity-30 grayscale' : 'opacity-100'}`}>
            <div className={`p-2 rounded-xl shrink-0 transition-colors ${encarregadoHabilitado ? 'bg-slate-900 text-amber-500 shadow-md' : 'bg-slate-100 text-slate-400'}`}>
               {isOrganista ? <ShieldCheck size={16}/> : <UserCheck size={16}/>}
            </div>
            <div className="flex-1">
              <CounterBoxSmall 
                label={isOrganista ? "EXAMINADORAS" : "ENCARREGADOS"} 
                val={enc} 
                onChange={v => handleUpdate('enc', v)} 
                disabled={disabled || !encarregadoHabilitado} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange, disabled }) => (
  <div className={`flex-1 rounded-2xl border transition-all relative flex flex-col items-center justify-center overflow-hidden ${disabled ? 'bg-slate-100 border-slate-200' : color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-lg' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
    <p className={`absolute top-2.5 text-[7px] font-[900] uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
    
    <div className="flex items-center w-full h-full pt-4">
        <button disabled={disabled} onClick={() => onChange(val - 1)} className="w-10 h-full flex items-center justify-center active:bg-white/10 transition-colors">
          <Minus size={16} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <input 
            disabled={disabled} 
            type="number" 
            className="bg-transparent w-full text-center font-[900] text-4xl outline-none italic tracking-tighter" 
            value={val} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const newVal = e.target.value === "" ? 0 : parseInt(e.target.value);
              onChange(newVal);
            }} 
          />
        </div>

        <button disabled={disabled} onClick={() => onChange(val + 1)} className="w-10 h-full flex items-center justify-center active:bg-white/10 transition-colors">
          <Plus size={16} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
        </button>
    </div>
  </div>
);

const CounterBoxSmall = ({ label, val, onChange, disabled }) => (
  <div className={`h-12 px-4 rounded-[1.2rem] border transition-all flex items-center justify-between overflow-hidden ${disabled ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-200 shadow-sm'}`}>
    <p className="text-[8px] font-black text-slate-400 uppercase italic tracking-widest leading-none">{label}</p>
    <div className="flex items-center h-full">
      <button disabled={disabled} onClick={() => onChange(val - 1)} className="w-8 h-full flex items-center justify-center text-slate-300 active:text-red-500 transition-colors">
        <Minus size={14} strokeWidth={4}/>
      </button>
      
      <span className="font-black text-slate-950 italic text-lg w-8 text-center">{val}</span>
      
      <button 
        disabled={disabled} 
        onClick={() => onChange(val + 1)} 
        className="w-8 h-full flex items-center justify-center text-slate-950 active:text-blue-500 transition-colors"
      >
        <Plus size={14} strokeWidth={4}/>
      </button>
    </div>
  </div>
);

export default CounterPage;