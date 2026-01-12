import React, { useState, useEffect, useMemo } from 'react';
import { db, doc, onSnapshot, collection, updateDoc, auth } from '../firebase';
import { eventService } from '../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from './DashEventPage';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, LogOut, Lock, Users, 
  ClipboardCheck, LayoutGrid, ShieldCheck, Eye, 
  ChevronDown, Minus, Plus as PlusIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CounterPage = ({ currentEventId, counts, onBack, isMaster, isAdmin, userData, allEvents, onNavigateEvent }) => {
  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');
  const [showOwnershipModal, setShowOwnershipModal] = useState(null);
  
  const comumId = userData?.comumId;
  const isClosed = ataData?.status === 'closed'; 
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id;

  useEffect(() => {
    if (!comumId || !currentEventId) return;

    const unsubInst = onSnapshot(collection(db, 'config_comum', comumId, 'instrumentos_config'), (snapshot) => {
      setInstrumentsConfig(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubEvent = onSnapshot(doc(db, 'comuns', comumId, 'events', currentEventId), (s) => {
      if (s.exists()) {
        const data = s.data();
        setAtaData(data.ata || { status: 'open' });
        setEventDateRaw(data.date || '');
      }
    });

    return () => { unsubInst(); unsubEvent(); };
  }, [currentEventId, comumId]);

  const updateCount = async (instId, field, value, section, evalType = "Sem") => {
    if (isClosed) return toast.error("Ensaio Lacrado.");
    const metaKey = `meta_${section?.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = counts?.[metaKey]?.responsibleId;

    if (!isMaster && responsibleId !== myUID) return toast.error("Você não é o responsável por este naipe");

    const instData = counts?.[instId] || { total: 0, comum: 0, enc: 0 };
    let finalValue = Math.max(0, parseInt(value) || 0);

    if (field === 'comum' && finalValue > instData.total) return toast.error("Comum não pode ser maior que o Total");
    if (field === 'enc' && finalValue > instData.total) return toast.error("Avaliação não pode exceder o Total");

    try {
      await eventService.updateInstrumentCount(comumId, currentEventId, {
        instId, field, value: finalValue, userData, section
      });
    } catch (e) { toast.error("Erro na sincronização"); }
  };

  const handleToggleGroup = (sec) => {
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = counts?.[metaKey]?.responsibleId;
    if (activeGroup !== sec) {
        if (responsibleId === myUID) setActiveGroup(sec);
        else setShowOwnershipModal(sec);
    } else setActiveGroup(null);
  };

  const setOwnership = async (sec, wantsToOwn) => {
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    if (wantsToOwn) {
        try {
            await updateDoc(doc(db, 'comuns', comumId, 'events', currentEventId), {
                [`counts.${metaKey}.responsibleId`]: myUID,
                [`counts.${metaKey}.responsibleName`]: userData?.name || "Colaborador",
                [`counts.${metaKey}.updatedAt`]: Date.now()
            });
            toast.success(`Você assumiu o naipe ${sec}`);
        } catch (e) { toast.error("Erro ao vincular"); return; }
    }
    setActiveGroup(sec);
    setShowOwnershipModal(null);
  };

  const allInstruments = useMemo(() => {
    const base = [...instrumentsConfig];
    const pesosInst = {
      // CORDAS
      'VIOLINO': 1, 'VIOLA': 2, 'VIOLONCELO': 3,
      // MADEIRAS (Sequência Corrigida)
      'FLAUTA': 10, 'CLARINETE': 11, 'CLARONE ALTO': 12, 'CLARONE BAIXO': 13, 'OBOÉ': 14, 'CORNE INGLES': 15, 'FAGOTE': 16,
      // SAXOFONES
      'SAXOFONE SOPRANO': 20, 'SAXOFONE ALTO': 21, 'SAXOFONE TENOR': 22, 'SAXOFONE BARÍTONO': 23,
      // METAIS
      'TROMPETE': 30, 'FLUGEL': 31, 'TROMPA': 32, 'TROMBONE': 33, 'EUFÔNIO': 34, 'BOMBARDINO': 35, 'TUBA': 36,
      // TECLAS / ÓRGÃO
      'ACORDEON': 40, 'ÓRGÃO': 50
    };

    return base.sort((a, b) => {
      const nomeA = a.name.toUpperCase();
      const nomeB = b.name.toUpperCase();
      const pesoA = Object.keys(pesosInst).find(k => nomeA.includes(k)) ? pesosInst[Object.keys(pesosInst).find(k => nomeA.includes(k))] : 99;
      const pesoB = Object.keys(pesosInst).find(k => nomeB.includes(k)) ? pesosInst[Object.keys(pesosInst).find(k => nomeB.includes(k))] : 99;
      return pesoA - pesoB;
    });
  }, [instrumentsConfig]);

  const sections = useMemo(() => {
    const rawSections = [...new Set(allInstruments.map(i => i.section))];
    const pesosSessoes = { 
      'CORAL': 1, 'VOZES': 1, 
      'CORDAS': 2, 
      'MADEIRAS': 3, 
      'SAXOFONES': 4, 
      'METAIS': 5, 
      'TECLAS': 6, 
      'ÓRGÃO': 7, 'ORGAO': 7 
    };
    return rawSections.sort((a, b) => (pesosSessoes[a.toUpperCase()] || 99) - (pesosSessoes[b.toUpperCase()] || 99));
  }, [allInstruments]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-[900] italic animate-pulse tracking-widest text-slate-400 uppercase text-xs">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      <header className="bg-white pt-6 pb-8 px-6 rounded-b-[3rem] shadow-sm border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-400 active:scale-90 transition-all"><ChevronLeft size={20} strokeWidth={3} /></button>
          <div className="text-center px-4">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1.5 italic leading-none">Ensaio • {userData?.comum}</p>
            <h2 className="text-xl font-[900] text-slate-950 italic uppercase tracking-tighter">
                {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}` : '---'}
            </h2>
          </div>
          <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 shadow-sm"><LogOut size={18} strokeWidth={3} /></button>
        </div>
      </header>

      <motion.main className="flex-1 overflow-y-auto p-4 pb-44 no-scrollbar">
        <div className="max-w-md mx-auto space-y-4">
          {activeTab === 'contador' && sections.map(sec => {
            const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
            const isOwner = counts?.[metaKey]?.responsibleId === myUID;
            const responsibleName = counts?.[metaKey]?.responsibleName;
            const sectionTotal = allInstruments.filter(i => i.section === sec).reduce((acc, inst) => {
              const d = counts?.[inst.id] || {};
              return acc + (parseInt(d.total) || 0) + (parseInt(d.irmas) || 0);
            }, 0);

            return (
              <div key={sec} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => handleToggleGroup(sec)} className="w-full p-6 flex justify-between items-center outline-none active:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-start">
                    <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tighter">{sec}</span>
                    {responsibleName && (
                        <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-lg mt-1.5 ${isOwner ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {isOwner ? 'Você está contando' : `Resp: ${responsibleName}`}
                        </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-950 text-white px-4 py-1.5 rounded-xl font-black italic text-[10px] shadow-lg tracking-widest">{sectionTotal}</div>
                    <ChevronDown size={14} className={`text-slate-300 transition-transform ${activeGroup === sec ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {activeGroup === sec && (
                  <div className="p-4 pt-0 space-y-3 animate-in">
                    {allInstruments.filter(i => i.section === sec).map(inst => (
                       sec.toUpperCase().includes('VOZES') || sec.toUpperCase().includes('CORAL') ? (
                        <CoralCard key={inst.id} inst={inst} data={counts?.[inst.id] || {total:0, irmas:0}} onUpdate={(id, f, v) => updateCount(id, f, v, sec)} disabled={!(!isClosed && (isOwner || isMaster))} />
                      ) : (
                        <InstrumentCard key={inst.id} inst={inst} data={counts?.[inst.id] || {total:0, comum:0, enc:0}} onUpdate={(id, f, v) => updateCount(id, f, v, sec, inst.evalType)} disabled={!(!isClosed && (isOwner || isMaster))} />
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={comumId} userData={userData} isMaster={isMaster} isAdmin={isAdmin} />}
          {activeTab === 'dash' && <DashEventPage counts={counts} ataData={ataData} userData={userData} isAdmin={isAdmin} />}
        </div>
      </motion.main>

      <AnimatePresence>
        {showOwnershipModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-[320px] rounded-[3rem] p-8 text-center shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={32} /></div>
              <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter">Assumir Contagem?</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-8 leading-relaxed">Deseja ser o responsável pelo naipe {showOwnershipModal}?</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setOwnership(showOwnershipModal, true)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg">Sim, eu conto</button>
                <button onClick={() => setOwnership(showOwnershipModal, false)} className="w-full bg-white text-slate-400 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2"><Eye size={14}/> Apenas visualizar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/5 p-2 rounded-[2.5rem] shadow-2xl">
          {[{ id: 'contador', label: 'Contar', icon: <LayoutGrid size={18}/> }, { id: 'ata', label: 'Ata', icon: <ClipboardCheck size={18}/> }, { id: 'dash', label: 'Dash', icon: <Users size={18}/> }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}>{tab.icon}<span className="text-[8px] font-black uppercase italic mt-1.5 tracking-widest leading-none">{tab.label}</span></button>
          ))}
        </nav>
      </footer>
    </div>
  );
};

const CoralCard = ({ inst, data, onUpdate, disabled }) => (
  <div className={`p-5 rounded-[2.2rem] border bg-white shadow-sm space-y-4 transition-all ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
    <div className="flex justify-between items-center text-slate-950"><h5 className="font-[900] text-[13px] italic tracking-tighter uppercase leading-none">Contagem de Vozes</h5><span className="text-[10px] font-black text-slate-950 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">{(parseInt(data?.total) || 0) + (parseInt(data?.irmas) || 0)}</span></div>
    <div className="flex gap-2"><CounterBox label="Irmãos" color="slate" val={data?.total || 0} onChange={v => onUpdate(inst.id, 'total', v)} /><CounterBox label="Irmãs" color="white" val={data?.irmas || 0} onChange={v => onUpdate(inst.id, 'irmas', v)} /></div>
  </div>
);

const InstrumentCard = ({ inst, data, onUpdate, disabled }) => {
  const visita = Math.max(0, (data?.total || 0) - (data?.comum || 0));
  const showEval = inst.evalType && inst.evalType !== "Sem";
  const evalLabel = inst.evalType === "Encarregado" ? "Encarregado" : "Examinadora";

  return (
    <div className={`p-5 rounded-[2.2rem] border bg-white shadow-sm transition-all ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center text-slate-950 mb-3">
        <h5 className="font-[900] text-[12px] italic tracking-tighter uppercase">{inst.name}</h5>
        <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[10px] font-black italic">Total: {data?.total || 0}</div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <CounterBox label="Total" color="slate" val={data?.total || 0} onChange={v => onUpdate(inst.id, 'total', v)} />
        <CounterBox label="Comum" color="white" val={data?.comum || 0} onChange={v => onUpdate(inst.id, 'comum', v)} />
        <div className="flex-1 p-2 rounded-2xl border bg-slate-50 border-slate-100 flex flex-col items-center justify-center">
            <p className="text-[6px] font-black uppercase text-slate-400 mb-1 italic leading-none">Visitas</p>
            <span className="font-[900] text-lg text-slate-950 leading-none">{visita}</span>
        </div>
      </div>

      {showEval && (
        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[7px] font-black text-blue-600 uppercase italic tracking-widest">{evalLabel}</p>
          <div className="flex items-center gap-3 bg-blue-50/30 px-3 py-1 rounded-xl border border-blue-100/50">
            <button onClick={() => onUpdate(inst.id, 'enc', (data?.enc || 0) - 1)} className="text-blue-600"><Minus size={10} strokeWidth={4}/></button>
            <input 
              type="number" 
              className="bg-transparent w-6 text-center font-black text-blue-600 outline-none text-[11px]" 
              value={data?.enc || 0} 
              onChange={(e) => onUpdate(inst.id, 'enc', e.target.value)} 
            />
            <button onClick={() => onUpdate(inst.id, 'enc', (data?.enc || 0) + 1)} className="text-blue-600"><PlusIcon size={10} strokeWidth={4}/></button>
          </div>
        </div>
      )}
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange }) => (
  <div className={`flex-1 p-2 rounded-2xl border ${color === 'slate' ? 'bg-slate-950 text-white border-slate-900' : 'bg-white border-slate-100'}`}>
    <p className={`text-[6px] font-black uppercase mb-1 text-center tracking-widest ${color === 'slate' ? 'text-white/40' : 'text-slate-400'}`}>{label}</p>
    <div className="flex items-center justify-center">
      <input 
        type="number" 
        className="bg-transparent w-full text-center font-[900] text-lg outline-none italic uppercase leading-none" 
        value={val || 0} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
    <div className="flex justify-around mt-1">
        <button onClick={() => onChange(Number(val) - 1)} className={`active:scale-150 transition-all ${color === 'slate' ? 'text-white' : 'text-slate-300'}`}><Minus size={10} strokeWidth={4}/></button>
        <button onClick={() => onChange(Number(val) + 1)} className={`active:scale-150 transition-all ${color === 'slate' ? 'text-white' : 'text-slate-300'}`}><PlusIcon size={10} strokeWidth={4}/></button>
    </div>
  </div>
);

export default CounterPage;