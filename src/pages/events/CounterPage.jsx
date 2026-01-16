import React, { useState, useEffect, useMemo } from 'react';
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs } from '../../config/firebase';
import { eventService } from '../../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from '../dashboard/DashEventPage';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, 
  ChevronDown, Minus, Plus, ShieldCheck, Eye 
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
          if (isMounted) {
            setInstrumentsNacionais(snapNacional.docs.map(d => ({ id: d.id, ...d.data() })));
          }

          const unsubInst = onSnapshot(collection(db, 'comuns', targetComumId, 'instrumentos_config'), 
            (snapshot) => {
              if (isMounted) setInstrumentsConfig(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            },
            () => console.warn("Aguardando configuração de instrumentos...")
          );

          const unsubEvent = onSnapshot(doc(db, 'comuns', targetComumId, 'events', currentEventId), (s) => {
            if (s.exists() && isMounted) {
              const data = s.data();
              setAtaData(data.ata || { status: 'open' });
              setEventDateRaw(data.date || '');
              setLoading(false);
            }
          });

          return () => { 
            unsubInst(); 
            unsubEvent(); 
          };
        } catch (err) {
          console.error("Erro no carregamento:", err);
          if (isMounted) setLoading(false);
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentEventId, allEvents, userData]);

  const allInstruments = useMemo(() => {
    const ordemOficial = [
      'irmandade', 'violino', 'viola', 'violoncelo', 
      'flauta', 'clarinete', 'clarone_alto', 'clarone_baixo', 'oboe', 'corne_ingles', 'fagote', 
      'sax_soprano', 'sax_alto', 'sax_tenor', 'sax_baritono', 
      'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 
      'acordeon', 'orgao' 
    ];
    const base = instrumentsNacionais.map(instBase => {
      const override = instrumentsConfig.find(local => local.id === instBase.id);
      return override ? { ...instBase, ...override } : instBase;
    });
    return base.sort((a, b) => ordemOficial.indexOf(a.id) - ordemOficial.indexOf(b.id));
  }, [instrumentsNacionais, instrumentsConfig]);

  const sections = useMemo(() => {
    const ordemSessoes = ['CORAL', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'ÓRGÃO'];
    const raw = [...new Set(allInstruments.map(i => i.section?.toUpperCase()))];
    return raw.sort((a, b) => {
      const idxA = ordemSessoes.indexOf(a);
      const idxB = ordemSessoes.indexOf(b);
      return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
    });
  }, [allInstruments]);

  // LÓGICA DE PROPRIEDADE UNIVERSAL: Qualquer acesso passa pelo modal se não for o dono
  const handleToggleGroup = (sec) => {
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = counts?.[metaKey]?.responsibleId;

    if (activeGroup !== sec) {
      // Se já sou o dono, abre direto. Se não, pergunta se quer assumir ou apenas ver.
      if (responsibleId === myUID) {
        setActiveGroup(sec);
      } else {
        setShowOwnershipModal(sec);
      }
    } else {
      setActiveGroup(null);
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
        toast.success(`Você assumiu: ${sec}`);
      } catch (e) { 
        toast.error("Erro ao vincular."); 
        return; 
      }
    }
    
    setActiveGroup(sec);
    setShowOwnershipModal(null);
  };

  const canEditInst = (sec) => {
    if (isClosed) return false;
    // Administradores e Master podem editar qualquer naipe, mas o Básico precisa assumir a posse
    if (isMaster || isAdmin) return true;
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    return counts?.[metaKey]?.responsibleId === myUID;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans animate-premium">
      <header className="bg-white pt-6 pb-8 px-6 rounded-b-[3rem] shadow-sm border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-400 active:scale-90"><ChevronLeft size={20} strokeWidth={3} /></button>
          <div className="text-center px-4">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 italic leading-none">
              {ataData?.comumNome || userData?.comum || "Localidade"}
            </p>
            <h2 className="text-xl font-[900] text-slate-950 italic uppercase tracking-tighter">
                {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </h2>
          </div>
          <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 shadow-sm"><LogOut size={18} strokeWidth={3} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-44 no-scrollbar">
        <div className="max-w-md mx-auto space-y-4">
          {activeTab === 'contador' && sections.map(sec => {
            const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
            const responsibleName = counts?.[metaKey]?.responsibleName;
            const isOwner = counts?.[metaKey]?.responsibleId === myUID;
            const sectionTotal = allInstruments.filter(i => i.section?.toUpperCase() === sec).reduce((acc, inst) => acc + (parseInt(counts?.[inst.id]?.total) || 0), 0);
            
            return (
              <div key={sec} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => handleToggleGroup(sec)} className="w-full p-6 flex justify-between items-center active:bg-slate-50 transition-all">
                  <div className="flex flex-col items-start text-left leading-none">
                    <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tighter">{sec}</span>
                    {responsibleName && (
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-lg mt-2 ${isOwner ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                        {isOwner ? 'Sua Contagem' : `Resp: ${responsibleName}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-950 text-white px-4 py-1.5 rounded-xl font-black italic text-[10px] shadow-lg">{sectionTotal}</div>
                    <ChevronDown size={14} className={`text-slate-300 transition-transform ${activeGroup === sec ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {activeGroup === sec && (
                  <div className="p-4 pt-0 space-y-3 animate-in">
                    {allInstruments.filter(i => i.section?.toUpperCase() === sec).map(inst => (
                       <InstrumentCard 
                        key={inst.id} 
                        inst={inst} 
                        data={counts?.[inst.id] || {total:0, comum:0, enc:0}} 
                        onUpdate={(id, f, v) => eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field: f, value: v, userData, section: sec })} 
                        disabled={!canEditInst(sec)} 
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
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-[320px] rounded-[3rem] p-8 text-center shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={32} /></div>
              <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter">Assumir Contagem?</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-8 leading-relaxed">Você será o responsável pelo naipe {showOwnershipModal}.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setOwnership(showOwnershipModal, true)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg">Sim, eu conto</button>
                <button onClick={() => setOwnership(showOwnershipModal, false)} className="w-full bg-white text-slate-400 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2"><Eye size={14}/> Apenas visualizar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/5 p-2 rounded-[2.5rem] shadow-2xl">
          <TabButton active={activeTab === 'contador'} icon={<LayoutGrid size={18}/>} label="Contar" onClick={() => setActiveTab('contador')} />
          <TabButton active={activeTab === 'ata'} icon={<ClipboardCheck size={18}/>} label="Ata" onClick={() => setActiveTab('ata')} />
          <TabButton active={activeTab === 'dash'} icon={<BarChart3 size={18}/>} label="Dash" onClick={() => setActiveTab('dash')} />
        </nav>
      </footer>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-400'}`}>
    {icon}<span className="text-[8px] font-black uppercase italic mt-1.5 tracking-widest leading-none">{label}</span>
  </button>
);

const InstrumentCard = ({ inst, data, onUpdate, disabled }) => {
  const isCoral = inst.section?.toUpperCase().includes('CORAL');
  const isOrgao = inst.id === 'orgao';
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0;
  const visitas = Math.max(0, total - comum);

  const handleUpdate = (field, value) => {
    let finalValue = Math.max(0, parseInt(value) || 0);
    if (field === 'comum' && finalValue > total) finalValue = total;
    if (field === 'enc' && finalValue > total) finalValue = total;
    if (field === 'total' && finalValue < comum) onUpdate(inst.id, 'comum', finalValue);
    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-5 rounded-[2.2rem] border bg-white shadow-sm transition-all ${disabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
      <div className="flex justify-between items-center text-slate-950 mb-4">
        <h5 className="font-[900] text-[13px] italic tracking-tighter uppercase">{inst.name}</h5>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <CounterBox label="Total" color="slate" val={total} onChange={v => handleUpdate('total', v)} />
        <CounterBox label="Comum" color="white" val={comum} onChange={v => handleUpdate('comum', v)} />
        <div className="flex-1 p-2 rounded-2xl border bg-slate-50 border-slate-100 flex flex-col items-center justify-center">
            <p className="text-[6px] font-[900] uppercase text-slate-400 mb-1 italic">Visitas</p>
            <span className="font-[900] text-xl text-slate-950 leading-none">{visitas}</span>
        </div>
      </div>
      {!isCoral && (
        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[9px] font-[900] text-blue-600 uppercase italic tracking-widest leading-none">
            {isOrgao ? 'Examinadora' : 'Encarregado'}
          </p>
          <div className="flex items-center gap-4 bg-blue-50 p-1.5 rounded-2xl border border-blue-100">
             <button onClick={() => handleUpdate('enc', enc - 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm active:scale-125 transition-all"><Minus size={14} strokeWidth={4}/></button>
             <input type="number" className="bg-transparent w-8 text-center font-[900] text-[14px] text-blue-950 outline-none" value={enc} onChange={(e) => handleUpdate('enc', e.target.value)} />
             <button onClick={() => handleUpdate('enc', enc + 1)} className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-white shadow-md active:scale-125 transition-all"><Plus size={14} strokeWidth={4}/></button>
          </div>
        </div>
      )}
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange }) => (
  <div className={`flex-1 p-2 rounded-2xl border ${color === 'slate' ? 'bg-slate-950 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-200 shadow-inner'}`}>
    <p className={`text-[6px] font-[900] uppercase mb-2 text-center tracking-widest ${color === 'slate' ? 'text-white/50' : 'text-slate-400'}`}>{label}</p>
    <div className="flex items-center justify-center mb-2">
        <input type="number" className="bg-transparent w-full text-center font-[900] text-xl outline-none italic leading-none appearance-none" value={val} onChange={(e) => onChange(e.target.value)} />
    </div>
    <div className="flex justify-between gap-1">
        <button onClick={() => onChange(val - 1)} className={`flex-1 h-8 rounded-lg flex items-center justify-center active:scale-150 transition-all ${color === 'slate' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}><Minus size={12} strokeWidth={4}/></button>
        <button onClick={() => onChange(val + 1)} className={`flex-1 h-8 rounded-lg flex items-center justify-center active:scale-150 transition-all ${color === 'slate' ? 'bg-white text-slate-950 shadow-lg' : 'bg-slate-950 text-white'}`}><Plus size={12} strokeWidth={4}/></button>
    </div>
  </div>
);

export default CounterPage;