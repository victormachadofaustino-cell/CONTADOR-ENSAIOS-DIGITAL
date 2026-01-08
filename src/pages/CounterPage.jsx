import React, { useState, useEffect, useMemo, useRef } from 'react'; // useRef adicionado
import { db, doc, onSnapshot, collection } from '../firebase';
import { eventService } from '../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from './DashEventPage';
import toast from 'react-hot-toast';
import { ChevronLeft, LogOut, Plus, Trash2, Edit3, Lock, Users, ClipboardCheck, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Essencial para o Swipe

const CounterPage = ({ currentEventId, counts, onBack, isMaster, isAdmin, userData, allEvents, onNavigateEvent }) => {
  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');
  const [direcao, setDirecao] = useState(0); // Para animação lateral

  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [extraInstName, setExtraInstName] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [editInstId, setEditInstId] = useState(null);
  const [instToDelete, setInstToDelete] = useState(null);

  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';
  const isClosed = ataData?.status === 'closed';

  const ORDEM_TABS = ['contador', 'ata', 'dash'];

  useEffect(() => {
    // TRAVA DE SEGURANÇA: Impede execução se IDs fundamentais estiverem ausentes
    if (!comumId || !currentEventId) return;

    const unsubInst = onSnapshot(collection(db, 'config_comum', comumId, 'instrumentos_config'), (snapshot) => {
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInstrumentsConfig(lista);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar instrumentos:", error);
      setLoading(false);
    });

    const unsubEvent = onSnapshot(doc(db, 'comuns', comumId, 'events', currentEventId), (s) => {
      if (s.exists()) {
        const data = s.data();
        setAtaData(data.ata || { status: 'open' });
        setEventDateRaw(data.date || '');
      }
    }, (error) => {
      console.error("Erro ao carregar evento:", error);
    });

    return () => { unsubInst(); unsubEvent(); };
  }, [currentEventId, comumId]);

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "";
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(day)} de ${months[parseInt(month) - 1]}`;
  };

  const updateCount = async (instId, field, value, customName = null, section = null) => {
    if (isClosed) return toast.error("Ensaio Finalizado.");
    try {
      await eventService.updateInstrumentCount(comumId, currentEventId, {
        instId, field, value, userData, section, customName
      });
    } catch (e) { toast.error("Erro na sincronização"); }
  };

  const handleConfirmDelete = async () => {
    if (!instToDelete) return;
    try {
      await eventService.removeExtraInstrument(comumId, currentEventId, instToDelete.id);
      toast.success(`${instToDelete.name} removido`);
      setShowDeleteModal(false);
      setInstToDelete(null);
    } catch (e) { toast.error("Erro ao excluir"); }
  };

  const handleConfirmExtraInstrument = () => {
    if (!extraInstName.trim()) return toast.error("Digite o nome");
    const id = editInstId || `extra_${Date.now()}`;
    updateCount(id, 'total', editInstId ? (counts[id]?.total || 0) : 0, extraInstName.trim(), targetSection);
    setExtraInstName('');
    setEditInstId(null);
    setShowExtraModal(false);
  };

  const allInstruments = useMemo(() => {
    const base = [...instrumentsConfig];
    // Proteção contra counts indefinido
    const countsSafe = counts || {};
    Object.keys(countsSafe).forEach(id => {
      if (id.startsWith('extra_') && !base.find(i => i.id === id)) {
        base.push({ id, name: countsSafe[id].name || 'Extra', section: countsSafe[id].section || 'Outros', isExtra: true });
      }
    });
    return base;
  }, [instrumentsConfig, counts]);

  const sections = useMemo(() => {
    const rawSections = [...new Set(allInstruments.map(i => i.section))];
    const ordemReferencia = ['CORAL', 'VOZES', 'CANTOR', 'ÓRGÃO', 'ORGAO', 'ORGANISTA', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'SAX', 'METAIS', 'TECLAS'];
    return rawSections.sort((a, b) => {
      const indexA = ordemReferencia.findIndex(ref => a.toUpperCase().includes(ref));
      const indexB = ordemReferencia.findIndex(ref => b.toUpperCase().includes(ref));
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [allInstruments]);

  // NAVEGAÇÃO ENTRE MÓDULOS (BODY SWIPE)
  const handleBodySwipe = (event, info) => {
    const threshold = 80;
    const indexAtual = ORDEM_TABS.indexOf(activeTab);
    if (info.offset.x < -threshold && indexAtual < ORDEM_TABS.length - 1) {
      setDirecao(1);
      setActiveTab(ORDEM_TABS[indexAtual + 1]);
    } else if (info.offset.x > threshold && indexAtual > 0) {
      setDirecao(-1);
      setActiveTab(ORDEM_TABS[indexAtual - 1]);
    }
  };

  // NAVEGAÇÃO TEMPORAL (HEADER SWIPE)
  const handleTemporalSwipe = (event, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold) onNavigateEvent('next');
    if (info.offset.x > threshold) onNavigateEvent('prev');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-[900] italic text-slate-950 uppercase tracking-widest animate-pulse">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden opacity-[0.03] flex flex-wrap gap-20 p-10 rotate-[-25deg] select-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="text-slate-950 font-black uppercase text-[12px] whitespace-nowrap tracking-[0.3em]">
            Victor Faustino • {userData?.email} • Victor Faustino
          </div>
        ))}
      </div>

      <header className="bg-white pt-6 pb-8 px-6 rounded-b-[3rem] shadow-sm border-b border-slate-200 shrink-0 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-400 active:scale-90 transition-all">
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          
          <motion.div 
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleTemporalSwipe}
            className="text-center cursor-grab active:cursor-grabbing px-4"
          >
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1.5 italic leading-none">
              Ensaio Local • {userData?.comum || 'Ponte São João'}
            </p>
            <AnimatePresence mode="wait">
              <motion.h2 
                key={currentEventId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xl font-[900] text-slate-950 italic uppercase leading-none tracking-tighter"
              >
                {formatEventDate(eventDateRaw)}
              </motion.h2>
            </AnimatePresence>
            {isClosed && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Lock size={8} className="text-red-500" />
                <span className="text-[7px] font-black text-red-500 uppercase italic tracking-widest">Finalizado</span>
              </div>
            )}
          </motion.div>

          <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 shadow-sm">
            <LogOut size={18} strokeWidth={3} />
          </button>
        </div>
      </header>

      <motion.main 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleBodySwipe}
        className="flex-1 overflow-y-auto p-4 pb-44 relative z-10 no-scrollbar"
      >
        <AnimatePresence mode="wait" custom={direcao}>
          <motion.div
            key={activeTab}
            custom={direcao}
            initial={{ opacity: 0, x: direcao * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direcao * -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="max-w-md mx-auto"
          >
            {activeTab === 'contador' && (
              <div className="space-y-4 animate-premium">
                {sections.map(sec => {
                  const lowerSec = sec.toLowerCase();
                  const isCoral = lowerSec.includes('coral') || lowerSec.includes('cantores') || lowerSec.includes('vozes');
                  const isOrganista = lowerSec.includes('orgão') || lowerSec.includes('orgao') || lowerSec.includes('organista');
                  const sectionInstruments = allInstruments.filter(i => i.section === sec);
                  const sectionTotal = sectionInstruments.reduce((acc, inst) => acc + (counts?.[inst.id]?.total || 0), 0);

                  return (
                    <div key={sec} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden card-premium">
                      <button onClick={() => setActiveGroup(activeGroup === sec ? null : sec)} className="w-full p-6 flex justify-between items-center outline-none active:bg-slate-50 transition-colors">
                        <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tighter">{sec}</span>
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-950 text-white px-4 py-1.5 rounded-xl font-black italic text-[10px] shadow-lg tracking-widest">{sectionTotal}</div>
                          <span className={`text-slate-300 transition-transform duration-300 ${activeGroup === sec ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                      </button>

                      {activeGroup === sec && (
                        <div className="p-4 pt-0 space-y-3 animate-in">
                          {isCoral ? (
                            <>
                              <EditableSimpleCounter label="Irmãos" id="coral_irmaos" data={counts?.['coral_irmaos']} onUpdate={(id, field, val) => updateCount(id, field, val, null, sec)} disabled={isClosed} />
                              <EditableSimpleCounter label="Irmãs" id="coral_irmas" data={counts?.['coral_irmas']} onUpdate={(id, field, val) => updateCount(id, field, val, null, sec)} disabled={isClosed} />
                            </>
                          ) : (
                            <div className="space-y-3">
                              {sectionInstruments.map(inst => (
                                <InstrumentCard key={inst.id} inst={inst} data={counts?.[inst.id] || {total:0, comum:0, enc:0}} isOrganista={isOrganista} onUpdate={(id, field, val) => updateCount(id, field, val, null, sec)} onEdit={() => { setEditInstId(inst.id); setExtraInstName(inst.name); setTargetSection(sec); setShowExtraModal(true); }} onDelete={() => { setInstToDelete(inst); setShowDeleteModal(true); }} disabled={isClosed} />
                              ))}
                              {!isClosed && (
                                <button onClick={() => { setTargetSection(sec); setEditInstId(null); setExtraInstName(''); setShowExtraModal(true); }} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-[2rem] text-[8px] font-black text-slate-300 uppercase italic tracking-[0.2em] flex items-center justify-center gap-2">
                                  <Plus size={12} /> Incluir em {sec}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={comumId} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
            {activeTab === 'dash' && <DashEventPage counts={counts} ataData={ataData} userData={userData} isAdmin={isAdmin} />}
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {(showExtraModal || showDeleteModal) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          {showExtraModal && (
            <div className="bg-white w-full max-w-[320px] rounded-[3rem] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter">{editInstId ? 'Editar Nome' : 'Novo Registro'}</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-8 italic tracking-[0.3em]">{targetSection}</p>
              <input autoFocus type="text" className="w-full bg-slate-50 p-5 rounded-[1.5rem] font-black text-sm outline-none border border-slate-100 mb-8 text-center uppercase tracking-widest" value={extraInstName} onChange={(e) => setExtraInstName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirmExtraInstrument()} />
              <div className="flex gap-2">
                <button onClick={() => setShowExtraModal(false)} className="flex-1 py-4 font-black uppercase text-[9px] text-slate-400 tracking-widest">Sair</button>
                <button onClick={handleConfirmExtraInstrument} className="flex-1 bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl active:scale-95 transition-all">Confirmar</button>
              </div>
            </div>
          )}

          {showDeleteModal && (
            <div className="bg-white w-full max-w-[320px] rounded-[3rem] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={24} /></div>
              <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter">Remover?</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-8 leading-relaxed">Deseja remover "{instToDelete?.name}" permanentemente?</p>
              <div className="flex flex-col gap-2">
                <button onClick={handleConfirmDelete} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest active:scale-95">Sim, Remover</button>
                <button onClick={() => setShowDeleteModal(false)} className="w-full py-2 font-black uppercase text-[9px] text-slate-300 tracking-widest">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/5 p-2 rounded-[2.5rem] shadow-2xl">
          {[
            { id: 'contador', label: 'Contar', icon: <LayoutGrid size={18}/> }, 
            { id: 'ata', label: 'Ata', icon: <ClipboardCheck size={18}/> }, 
            { id: 'dash', label: 'Dash', icon: <Users size={18}/> }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setDirecao(ORDEM_TABS.indexOf(tab.id) > ORDEM_TABS.indexOf(activeTab) ? 1 : -1); setActiveTab(tab.id); }} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-slate-950 shadow-lg scale-105' : 'text-slate-500'}`}>
              {tab.icon}
              <span className="text-[8px] font-black uppercase italic mt-1.5 tracking-widest leading-none">{tab.label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
};

const InstrumentCard = ({ inst, data, isOrganista, onUpdate, onEdit, onDelete, disabled }) => {
  const visitaCalculada = Math.max(0, (data?.total || 0) - (data?.comum || 0));
  return (
    <div className={`p-5 rounded-[2.2rem] border bg-white shadow-sm space-y-4 relative transition-all card-section ${disabled ? 'opacity-40 grayscale' : ''} ${inst.section.toLowerCase().includes('cordas') ? 'border-cordas' : inst.section.toLowerCase().includes('madeiras') ? 'border-madeiras' : inst.section.toLowerCase().includes('metais') ? 'border-metais' : inst.section.toLowerCase().includes('sax') ? 'border-madeiras' : 'border-orgao'}`}>
      <div className="flex justify-between items-center text-slate-950">
        <div className="flex items-center gap-2 cursor-pointer active:opacity-50" onClick={() => inst.id.startsWith('extra_') && !disabled && onEdit()}>
          <h5 className="font-[900] text-[13px] italic tracking-tighter uppercase leading-none">{inst.name}</h5>
          {inst.id.startsWith('extra_') && !disabled && <Edit3 size={10} className="text-blue-500 ml-1 opacity-40" />}
        </div>
        <div className="flex items-center gap-3">
          {inst.id.startsWith('extra_') && !disabled && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-200 active:scale-90 active:text-red-500 transition-all leading-none"><Trash2 size={16}/></button>
          )}
          <span className="text-[10px] font-black text-slate-950 bg-slate-50 px-3 py-1.5 rounded-xl italic leading-none border border-slate-100">{data?.total || 0}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <CounterBox label="Total" color="slate" val={data?.total || 0} onChange={v => onUpdate(inst.id, 'total', v)} disabled={disabled} />
        <CounterBox label="Comum" color="white" val={data?.comum || 0} disabled={disabled} onChange={v => onUpdate(inst.id, 'comum', v)} />
        <div className="flex-1 p-2 rounded-2xl border bg-slate-50/50 border-slate-100 flex flex-col items-center justify-center">
          <p className="text-[6px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 italic leading-none">Visita</p>
          <span className="font-[900] text-lg text-slate-950 leading-none">{visitaCalculada}</span>
        </div>
      </div>
      <div className={`flex items-center justify-between pt-3 border-t border-slate-50/50`}>
        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
          <Users size={10}/> {isOrganista ? 'Examinadoras' : 'Encarregados'}
        </span>
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-slate-950">
           <button disabled={disabled} onClick={() => onUpdate(inst.id, 'enc', (data?.enc || 0) - 1)} className="font-black text-lg active:scale-125 transition-transform leading-none">-</button>
           <input disabled={disabled} type="number" inputMode="numeric" className="bg-transparent w-8 text-center font-black text-[11px] outline-none leading-none" value={data?.enc || ''} onChange={e => onUpdate(inst.id, 'enc', e.target.value)} />
           <button disabled={disabled} onClick={() => onUpdate(inst.id, 'enc', (data?.enc || 0) + 1)} className="font-black text-lg active:scale-125 transition-transform leading-none">+</button>
        </div>
      </div>
    </div>
  );
};

const EditableSimpleCounter = ({ label, id, data, onUpdate, disabled }) => {
  const total = data?.total || 0;
  return (
    <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-left ${disabled ? 'opacity-40' : ''}`}>
      <h5 className="font-[900] text-slate-950 text-[10px] italic mb-4 ml-1 tracking-widest uppercase leading-none">{label}</h5>
      <div className="flex bg-slate-50/50 p-4 rounded-[2rem] items-center justify-between border border-slate-100 shadow-inner">
        <button onClick={() => onUpdate(id, 'total_simples', total - 1)} disabled={disabled} className="text-slate-300 text-3xl font-light active:scale-150 transition-all leading-none">-</button>
        <div className="text-center flex-1 mx-4 leading-none text-slate-950">
          <p className="text-[6px] font-black text-slate-400 uppercase italic mb-2 tracking-[0.4em] leading-none">Total {label}</p>
          <input type="number" inputMode="numeric" disabled={disabled} className="bg-transparent w-full text-center font-[900] text-3xl outline-none italic leading-none" value={total || ''} placeholder="0" onChange={e => onUpdate(id, 'total_simples', e.target.value)} />
        </div>
        <button onClick={() => onUpdate(id, 'total_simples', total + 1)} disabled={disabled} className="text-slate-300 text-3xl font-light active:scale-150 transition-all leading-none">+</button>
      </div>
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange, disabled }) => (
  <div className={`flex-1 p-3 rounded-2xl border transition-all duration-300 ${disabled ? 'opacity-50' : color === 'slate' ? 'bg-slate-950 text-white shadow-xl border-slate-900' : 'bg-white border-slate-100 shadow-sm'}`}>
    <p className={`text-[6px] font-black uppercase mb-2 text-center tracking-[0.2em] leading-none ${color === 'slate' ? 'text-white/40' : 'text-slate-400'}`}>{label}</p>
    <div className="flex items-center justify-between px-1 leading-none">
      <button onClick={() => onChange(val - 1)} disabled={disabled} className="font-black text-sm active:scale-150 transition-all leading-none">-</button>
      <input type="number" inputMode="numeric" disabled={disabled} className="bg-transparent w-full text-center font-[900] text-lg outline-none italic leading-none" value={val || ''} onChange={e => onChange(e.target.value)} />
      <button onClick={() => onChange(val + 1)} disabled={disabled} className="font-black text-sm active:scale-150 transition-all leading-none">+</button>
    </div>
  </div>
);

export default CounterPage;