import React, { useState, useEffect, useMemo } from 'react';
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs } from '../../config/firebase';
import { eventService } from '../../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from '../dashboard/DashEventPage';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, 
  ChevronDown, Minus, Plus, ShieldCheck, Eye, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CounterPage = ({ currentEventId, counts, onBack, isMaster, isAdmin, userData, allEvents }) => {
  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]);
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');
  const [eventComumId, setEventComumId] = useState(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(null);
  
  const isClosed = ataData?.status === 'closed';
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id;

  useEffect(() => {
    if (!currentEventId) return;
    let isMounted = true;

    const loadData = async () => {
      const currentEvent = allEvents?.find(e => e.id === currentEventId);
      const targetComumId = currentEvent?.comumId || userData?.comumId;

      if (targetComumId && isMounted) {
        setEventComumId(targetComumId);
        try {
          const snapNacional = await getDocs(collection(db, 'config_instrumentos_nacional'));
          if (isMounted) setInstrumentsNacionais(snapNacional.docs.map(d => ({ id: d.id, ...d.data() })));

          const unsubInst = onSnapshot(collection(db, 'comuns', targetComumId, 'instrumentos_config'), 
            (snapshot) => { if (isMounted) setInstrumentsConfig(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); }
          );

          const unsubEvent = onSnapshot(doc(db, 'comuns', targetComumId, 'events', currentEventId), (s) => {
            if (s.exists() && isMounted) {
              const data = s.data();
              setAtaData(data.ata || { status: 'open' });
              setEventDateRaw(data.date || '');
              setLoading(false);
            }
          });

          return () => { unsubInst(); unsubEvent(); };
        } catch (err) { if (isMounted) setLoading(false); }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentEventId, allEvents, userData]);

  // --- ORDENAÇÃO LITÚRGICA SOLICITADA ---
  const allInstruments = useMemo(() => {
    const ordemOficial = [
      'irmandade', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 
      'clarone_alto', 'clarone_baixo',  'oboe', 'corne_ingles', 'fagote', 'sax_soprano', 'sax_alto', 'sax_tenor', 'sax_baritono', 
      'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon', 'orgao' 
    ];
    return instrumentsNacionais.map(instBase => {
      const override = instrumentsConfig.find(local => local.id === instBase.id);
      return override ? { ...instBase, ...override } : instBase;
    }).sort((a, b) => ordemOficial.indexOf(a.id) - ordemOficial.indexOf(b.id));
  }, [instrumentsNacionais, instrumentsConfig]);

  const sections = useMemo(() => {
    const ordemSessoes = ['IRMANDADE', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'ORGANISTAS'];
    return [...new Set(allInstruments.map(i => i.section?.toUpperCase()))]
      .sort((a, b) => {
        const idxA = ordemSessoes.indexOf(a);
        const idxB = ordemSessoes.indexOf(b);
        return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
      });
  }, [allInstruments]);

  const handleToggleGroup = (sec) => {
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = counts?.[metaKey]?.responsibleId;

    if (activeGroup === sec) {
      setActiveGroup(null);
      return;
    }

    if (responsibleId === myUID || isMaster) {
      setActiveGroup(sec);
    } else {
      setShowOwnershipModal(sec);
    }
  };

  const setOwnership = async (sec, wantsToOwn) => {
    if (!eventComumId) return;
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    if (wantsToOwn) {
      try {
        await updateDoc(doc(db, 'comuns', eventComumId, 'events', currentEventId), {
          [`counts.${metaKey}.responsibleId`]: myUID,
          [`counts.${metaKey}.responsibleName`]: userData?.name || "Colaborador",
          [`counts.${metaKey}.updatedAt`]: Date.now()
        });
      } catch (e) { toast.error("Erro ao vincular."); return; }
    }
    setActiveGroup(sec);
    setShowOwnershipModal(null);
  };

  const isEditingEnabled = (sec) => {
    if (isClosed) return false;
    if (isMaster) return true;
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    return counts?.[metaKey]?.responsibleId === myUID;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans animate-premium">
      <header className="bg-white pt-6 pb-8 px-6 rounded-b-[3rem] shadow-sm border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-400 active:scale-90 transition-transform"><ChevronLeft size={20} strokeWidth={3} /></button>
          <div className="text-center px-4">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 italic leading-none">{ataData?.comumNome || userData?.comum || "Localidade"}</p>
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
            const responsibleName = counts?.[metaKey]?.responsibleName;
            const isOwner = counts?.[metaKey]?.responsibleId === myUID;
            
            // Cálculo de total da seção incluindo a lógica de Irmandade
            const sectionTotal = allInstruments.filter(i => i.section?.toUpperCase() === sec).reduce((acc, inst) => {
                const c = counts?.[inst.id];
                if (inst.id === 'irmandade') {
                    return acc + (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0);
                }
                return acc + (parseInt(c?.total) || 0);
            }, 0);
            
            return (
              <div key={sec} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {/* Linha divisória visual para grupos específicos conforme solicitado */}
                {(sec === 'CORDAS' || sec === 'ORGANISTAS') && <div className="h-[1px] bg-slate-100 mx-6 mb-1" />}
                
                <button onClick={() => handleToggleGroup(sec)} className="w-full p-5 flex justify-between items-center active:bg-slate-50 transition-all">
                  <div className="flex flex-col items-start text-left leading-none gap-2">
                    <span className="font-[900] uppercase italic text-[11px] text-slate-950 tracking-tight">{sec}</span>
                    {responsibleName && (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isOwner ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                        {isOwner ? <UserCheck size={7} strokeWidth={4}/> : <ShieldCheck size={7}/>}
                        <span className="text-[6px] font-black uppercase tracking-widest">{isOwner ? 'Sua Contagem' : responsibleName}</span>
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
                    {allInstruments.filter(i => i.section?.toUpperCase() === sec).map(inst => (
                       <InstrumentCard 
                        key={inst.id} 
                        inst={inst} 
                        data={counts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}} 
                        onUpdate={(id, f, v) => eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field: f, value: v, userData, section: sec })} 
                        disabled={!isEditingEnabled(sec)} 
                       />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} userData={userData} isMaster={isMaster} isAdmin={isAdmin} />}
          {activeTab === 'dash' && <DashEventPage eventId={currentEventId} comumId={eventComumId} counts={counts} userData={userData} isAdmin={isAdmin} ataData={ataData} />}
        </div>
      </main>

      <AnimatePresence>
        {showOwnershipModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-[300px] rounded-[2.5rem] p-8 text-center shadow-2xl">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner"><ShieldCheck size={28} /></div>
              <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter text-lg">Assumir Naipe?</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-8 leading-relaxed">Você será o responsável pela seção <span className="text-slate-950">{showOwnershipModal}</span>.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setOwnership(showOwnershipModal, true)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2"><Plus size={14} strokeWidth={3}/> Assumir Contagem</button>
                <button onClick={() => setOwnership(showOwnershipModal, false)} className="w-full bg-slate-50 text-slate-500 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 border border-slate-100"><Eye size={14}/> Apenas visualizar</button>
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
  const isIrmandade = inst.id === 'irmandade';
  const isOrgao = inst.id === 'orgao';
  
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0;
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  const irmandadeTotal = irmaos + irmas;

  const handleUpdate = (field, value) => {
    if (disabled) return;
    let finalValue = Math.max(0, parseInt(value) || 0);
    // Validação para instrumentos comuns
    if (!isIrmandade) {
        if (field === 'comum' && finalValue > total) finalValue = total;
        if (field === 'enc' && finalValue > total) finalValue = total;
        if (field === 'total' && finalValue < comum) onUpdate(inst.id, 'comum', finalValue);
    }
    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-4 rounded-[1.8rem] border transition-all relative overflow-hidden ${disabled ? 'bg-slate-50/50 border-slate-100 opacity-80' : 'bg-white border-slate-100 shadow-sm hover:border-blue-100'}`}>
      {disabled && (
        <div className="absolute top-3 right-5 flex items-center gap-1 opacity-40">
          <Eye size={8} className="text-slate-400" />
          <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest italic">Leitura</span>
        </div>
      )}
      
      <div className="mb-3 text-left">
        <h5 className={`font-[900] text-[11px] italic tracking-tight uppercase ${disabled ? 'text-slate-400' : 'text-slate-950'}`}>
          {isIrmandade ? 'IRMANDADE' : inst.name}
        </h5>
      </div>

      {isIrmandade ? (
        // --- RESTAURAÇÃO DO CARD DE IRMANDADE (CORAL) ---
        <div className="flex gap-2">
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={disabled} />
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={disabled} />
            <div className="flex-[0.6] h-14 bg-blue-600 rounded-xl border border-blue-500 flex flex-col items-center justify-center leading-none text-white shadow-lg shadow-blue-100">
                <p className="text-[7px] font-black uppercase opacity-60 mb-1 tracking-tighter text-center">CORAL</p>
                <span className="font-[900] text-xl">{irmandadeTotal}</span>
            </div>
        </div>
      ) : (
        // --- CARD PADRÃO PARA ORQUESTRA ---
        <>
            <div className="flex gap-2">
                <CounterBox label="TOTAL" color="slate" val={total} onChange={v => handleUpdate('total', v)} disabled={disabled} />
                <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={disabled} />
                <div className="flex-[0.6] h-14 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center leading-none">
                    <p className="text-[5px] font-black uppercase text-slate-400 mb-1 tracking-tighter text-center">VISITAS</p>
                    <span className={`font-[900] text-xl ${disabled ? 'text-slate-400' : 'text-slate-950'}`}>{Math.max(0, total - comum)}</span>
                </div>
            </div>
            {!inst.section?.toUpperCase().includes('CORAL') && !isIrmandade && (
              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <p className={`text-[8px] font-black uppercase italic tracking-widest ${disabled ? 'text-slate-300' : 'text-blue-600'}`}>{isOrgao ? 'Examinadora' : 'Encarregado'}</p>
                  <div className={`flex items-center gap-3 px-2 py-1 rounded-xl border transition-all ${disabled ? 'bg-slate-100 border-slate-200' : 'bg-blue-50/50 border-blue-100'}`}>
                      <button disabled={disabled} onClick={() => handleUpdate('enc', enc - 1)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${disabled ? 'text-slate-300' : 'bg-white text-blue-600 shadow-sm active:scale-125'}`}><Minus size={12} strokeWidth={4}/></button>
                      <input disabled={disabled} type="number" className={`bg-transparent w-6 text-center font-black text-[12px] outline-none ${disabled ? 'text-slate-300' : 'text-blue-950'}`} value={enc} onChange={(e) => handleUpdate('enc', e.target.value)} />
                      <button disabled={disabled} onClick={() => handleUpdate('enc', enc + 1)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${disabled ? 'text-slate-300' : 'bg-slate-950 text-white shadow-md active:scale-125'}`}><Plus size={12} strokeWidth={4}/></button>
                  </div>
              </div>
            )}
        </>
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