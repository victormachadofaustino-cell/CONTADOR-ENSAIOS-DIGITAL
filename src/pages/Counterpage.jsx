import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, setDoc } from '../firebase';
import { deleteField } from "firebase/firestore"; 
import AtaPage from './AtaPage';
import DashEventPage from './DashEventPage';
import toast from 'react-hot-toast';

const CounterPage = ({ currentEventId, counts, onBack, isMaster, isAdmin, userData }) => {
  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');

  // ESTADOS PARA OS MODAIS PERSONALIZADOS
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [extraInstName, setExtraInstName] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [editInstId, setEditInstId] = useState(null);
  const [instToDelete, setInstToDelete] = useState(null);

  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';
  const isClosed = ataData?.status === 'closed';

  useEffect(() => {
    const unsubInst = onSnapshot(doc(db, 'settings', 'instruments'), (s) => {
      if (s.exists()) setInstrumentsConfig(s.data().groups || []);
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

  // FORMATAÇÃO DA DATA PARA O HEADER DE CONTEXTO
  const formatEventDate = (dateStr) => {
    if (!dateStr) return "";
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(day)} de ${months[parseInt(month) - 1]}`;
  };

  const updateCount = async (instId, field, value, customName = null, section = null) => {
    if (isClosed) {
      toast.error("Ensaio Finalizado. Reabra para editar.");
      return;
    }

    const val = Math.max(0, parseInt(value) || 0);
    const currentData = counts[instId] || { total: 0, comum: 0, enc: 0 };
    const eventRef = doc(db, 'comuns', comumId, 'events', currentEventId);

    let finalSection = section;
    if (!finalSection) {
        const instConfig = allInstruments.find(i => i.id === instId);
        finalSection = instConfig?.section || 'Outros';
    }

    const baseUpdate = { 
      lastEditBy: userData?.name || 'Sistema',
      timestamp: Date.now(),
      section: finalSection 
    };

    if (customName) baseUpdate.name = customName;

    let newData = { ...currentData };

    try {
      if (field === 'total_simples') {
        newData.total = val;
      } 
      else if (field === 'total') {
        newData.total = val;
        if (newData.comum > val) newData.comum = val;
        if (newData.enc > val) newData.enc = val;
      } 
      else if (field === 'comum') {
        newData.comum = val;
        if (val > newData.total) newData.total = val;
      }
      else if (field === 'enc') {
        newData.enc = val;
        if (val > newData.total) newData.total = val;
      }

      await setDoc(eventRef, { 
        counts: { [instId]: { ...newData, ...baseUpdate } } 
      }, { merge: true });

    } catch (e) { toast.error("Erro na sincronização"); }
  };

  const handleConfirmDelete = async () => {
    if (!instToDelete) return;
    try {
      const eventRef = doc(db, 'comuns', comumId, 'events', currentEventId);
      await setDoc(eventRef, { 
        counts: { [instToDelete.id]: deleteField() } 
      }, { merge: true });
      toast.success(`${instToDelete.name} removido`);
      setShowDeleteModal(false);
      setInstToDelete(null);
    } catch (e) { toast.error("Erro ao excluir"); }
  };

  const handleConfirmExtraInstrument = () => {
    if (!extraInstName.trim()) return toast.error("Digite o nome do instrumento");
    
    const id = editInstId || `extra_${Date.now()}`;
    updateCount(id, 'total', editInstId ? (counts[id]?.total || 0) : 0, extraInstName.trim(), targetSection);
    
    toast.success(editInstId ? "Nome alterado!" : "Instrumento adicionado!");
    setExtraInstName('');
    setEditInstId(null);
    setShowExtraModal(false);
  };

  const allInstruments = React.useMemo(() => {
    const base = [...instrumentsConfig];
    Object.keys(counts).forEach(id => {
      if (id.startsWith('extra_') && !base.find(i => i.id === id)) {
        base.push({ 
          id, 
          name: counts[id].name || 'Extra', 
          section: counts[id].section || 'Outros', 
          isExtra: true 
        });
      }
    });
    return base;
  }, [instrumentsConfig, counts]);

  const sections = [...new Set(allInstruments.map(i => i.section))];

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-blue-600 animate-pulse uppercase">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-left font-sans relative">
      
      {/* CAMADA DE PROTEÇÃO / MARCA D'ÁGUA ANTI-PRINT */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden opacity-[0.05] flex flex-wrap gap-20 p-10 rotate-[-25deg] select-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="text-black font-black uppercase text-[15px] whitespace-nowrap">
            {userData?.email} • CÓPIA CONTROLADA • {userData?.email}
          </div>
        ))}
      </div>

      {/* HEADER DE CONTEXTO PERSISTENTE */}
      <header className="p-4 bg-white border-b z-30 shadow-sm relative">
        <div className="flex justify-between items-center">
            <button onClick={onBack} className="text-gray-400 font-bold text-sm italic py-2">‹ Voltar</button>
            
            <div className="text-center leading-tight">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5 italic leading-none">
                Ensaio Local • {userData?.comum}
              </p>
              <h2 className="text-xl font-black text-gray-900 italic uppercase leading-none">
                {formatEventDate(eventDateRaw)}
              </h2>
              {isClosed && (
                <span className="text-[8px] font-black text-red-500 uppercase italic mt-1 inline-block leading-none">🔒 Ensaio Finalizado</span>
              )}
            </div>

            <button onClick={onBack} className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-4 py-2 rounded-xl italic leading-none shadow-sm">Sair</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-44 relative z-10">
        {activeTab === 'contador' && (
          <div className="space-y-4">
            {sections.map(sec => {
              const lowerSec = sec.toLowerCase();
              const isCoral = lowerSec.includes('coral') || lowerSec.includes('cantores');
              const isOrganista = lowerSec.includes('orgão') || lowerSec.includes('orgao') || lowerSec.includes('organista');
              const sectionInstruments = allInstruments.filter(i => i.section === sec);
              const sectionTotal = sectionInstruments.reduce((acc, inst) => acc + (counts[inst.id]?.total || 0), 0);

              return (
                <div key={sec} className="card-section rounded-[2.5rem] border bg-white shadow-sm overflow-hidden">
                  <button onClick={() => setActiveGroup(activeGroup === sec ? null : sec)} className="w-full p-6 flex justify-between items-center outline-none">
                    <span className="font-black uppercase italic text-[13px] text-gray-700">{sec}</span>
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-900 text-white px-3 py-1 rounded-xl font-black italic text-xs shadow-md">{sectionTotal}</div>
                      <span className={`text-[10px] transition-transform ${activeGroup === sec ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </button>

                  {activeGroup === sec && (
                    <div className="p-4 pt-0 space-y-3 animate-in slide-in-from-top-2">
                      {isCoral ? (
                        <>
                          <EditableSimpleCounter label="Irmãos" id="coral_irmaos" data={counts['coral_irmaos']} onUpdate={(id, field, val) => updateCount(id, field, val, null, sec)} disabled={isClosed} />
                          <EditableSimpleCounter label="Irmãs" id="coral_irmas" data={counts['coral_irmas']} onUpdate={(id, field, val) => updateCount(id, field, val, null, sec)} disabled={isClosed} />
                        </>
                      ) : (
                        <>
                          {sectionInstruments.map(inst => (
                            <InstrumentCard 
                              key={inst.id} 
                              inst={inst} 
                              data={counts[inst.id] || {total:0, comum:0, enc:0}} 
                              isOrganista={isOrganista} 
                              onUpdate={(id, field, val) => updateCount(id, field, val, null, sec)} 
                              onEdit={() => { setEditInstId(inst.id); setExtraInstName(inst.name); setTargetSection(sec); setShowExtraModal(true); }}
                              onDelete={() => { setInstToDelete(inst); setShowDeleteModal(true); }}
                              disabled={isClosed} 
                            />
                          ))}
                          {!isClosed && (
                            <button 
                              onClick={() => { setTargetSection(sec); setEditInstId(null); setExtraInstName(''); setShowExtraModal(true); }} 
                              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase italic"
                            >
                              + Outro Instrumento em {sec}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* COMPONENTES FILTRADOS PELA HIERARQUIA */}
        {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={comumId} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
        {activeTab === 'dash' && <DashEventPage counts={counts} ataData={ataData} userData={userData} isAdmin={isAdmin} />}
      </main>

      {/* MODAIS */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 text-center shadow-2xl border border-gray-100">
            <h3 className="font-black text-gray-800 uppercase italic mb-2">{editInstId ? 'Editar Nome' : 'Novo Instrumento'}</h3>
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-6 italic tracking-widest">{targetSection}</p>
            <input autoFocus type="text" placeholder="Nome..." className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-blue-200 mb-6 text-center" value={extraInstName} onChange={(e) => setExtraInstName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirmExtraInstrument()} />
            <div className="flex gap-3">
              <button onClick={() => { setShowExtraModal(false); setExtraInstName(''); }} className="flex-1 py-3 font-black uppercase text-[10px] text-gray-300 italic">Cancelar</button>
              <button onClick={handleConfirmExtraInstrument} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] italic shadow-lg shadow-blue-200 active:scale-95 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 text-center shadow-2xl border border-gray-100">
            <div className="text-3xl mb-4">⚠️</div>
            <h3 className="font-black text-gray-800 uppercase italic mb-2">Remover Instrumento?</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-8 leading-tight">Deseja realmente remover "{instToDelete?.name}" deste ensaio?</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setInstToDelete(null); }} className="flex-1 py-3 font-black uppercase text-[10px] text-gray-300 italic">Voltar</button>
              <button onClick={handleConfirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-black uppercase text-[10px] italic shadow-lg shadow-red-200 active:scale-95 transition-all">Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ AJUSTADO E CENTRALIZADO */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] z-[50]">
        <nav className="flex justify-around bg-white/90 backdrop-blur-xl border border-gray-100 p-2 rounded-[2.5rem] shadow-2xl">
          {[
            { id: 'contador', label: 'Contar', icon: '🔢' }, 
            { id: 'ata', label: 'Ata', icon: '📝' }, 
            { id: 'dash', label: 'Dash', icon: '📊' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-gray-400'}`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[9px] font-black uppercase italic mt-1 leading-none">{tab.label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
};

const InstrumentCard = ({ inst, data, isOrganista, onUpdate, onEdit, onDelete, disabled }) => {
  const hasTotal = data.total > 0;
  const visitaCalculada = Math.max(0, (data.total || 0) - (data.comum || 0));

  return (
    <div className={`p-5 rounded-[2.2rem] border bg-white shadow-sm space-y-4 relative transition-all ${disabled ? 'opacity-60 grayscale-[0.3]' : ''}`}>
      <div className="flex justify-between items-center text-gray-900">
        <div className="flex items-center gap-2 cursor-pointer active:opacity-50" onClick={() => inst.id.startsWith('extra_') && !disabled && onEdit()}>
          <h5 className="font-black text-sm italic leading-none">{inst.name}</h5>
          {inst.id.startsWith('extra_') && !disabled && <span className="text-[10px] text-blue-400 italic leading-none">✎</span>}
        </div>
        <div className="flex items-center gap-3">
          {inst.id.startsWith('extra_') && !disabled && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-300 text-[14px] active:scale-90 transition-all leading-none">🗑️</button>
          )}
          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg italic leading-none">{data.total}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <CounterBox label="Total" color="blue" val={data.total} onChange={v => onUpdate(inst.id, 'total', v)} disabled={disabled} />
        <CounterBox label="Comum" color="gray" val={data.comum} disabled={!hasTotal || disabled} onChange={v => onUpdate(inst.id, 'comum', v)} />
        <div className="flex-1 p-2 rounded-2xl border bg-gray-100 border-gray-200 opacity-80 text-center text-gray-900">
          <p className="text-[7px] font-black uppercase mb-1 text-gray-400 leading-none">Visita</p>
          <span className="font-black text-lg leading-none">{visitaCalculada}</span>
        </div>
      </div>

      <div className={`flex items-center justify-between pt-3 border-t border-gray-50 ${hasTotal ? 'opacity-100' : 'opacity-20'}`}>
        <span className="text-[9px] font-black text-gray-400 uppercase italic">↳ {isOrganista ? 'Examinadoras' : 'Encarregados'}</span>
        <div className="flex items-center gap-4 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-gray-900">
           <button disabled={!hasTotal || disabled} onClick={() => onUpdate(inst.id, 'enc', (data.enc || 0) - 1)} className="font-black text-lg p-1">-</button>
           <input disabled={!hasTotal || disabled} type="number" inputMode="numeric" className="bg-transparent w-8 text-center font-black text-xs outline-none" value={data.enc || ''} onChange={e => onUpdate(inst.id, 'enc', e.target.value)} />
           <button disabled={!hasTotal || disabled} onClick={() => onUpdate(inst.id, 'enc', (data.enc || 0) + 1)} className="font-black text-lg p-1">+</button>
        </div>
      </div>
    </div>
  );
};

const EditableSimpleCounter = ({ label, id, data, onUpdate, disabled }) => {
  const total = data?.total || 0;
  return (
    <div className={`bg-white p-5 rounded-[2.2rem] border border-gray-100 shadow-sm text-left ${disabled ? 'opacity-40' : ''}`}>
      <h5 className="font-black text-gray-800 text-xs italic mb-3 ml-1 leading-none">{label}</h5>
      <div className="flex bg-gray-50 p-3 rounded-2xl items-center justify-between px-8 border border-gray-100 shadow-sm">
        <button onClick={() => onUpdate(id, 'total_simples', total - 1)} disabled={disabled} className="text-gray-400 text-3xl font-light">-</button>
        <div className="text-center flex-1 mx-4 leading-none text-gray-900">
          <p className="text-[7px] font-black text-gray-400 uppercase italic mb-1 leading-none">Total</p>
          <input type="number" inputMode="numeric" disabled={disabled} className="bg-transparent w-full text-center font-black text-2xl outline-none" value={total || ''} placeholder="0" onChange={e => onUpdate(id, 'total_simples', e.target.value)} />
        </div>
        <button onClick={() => onUpdate(id, 'total_simples', total + 1)} disabled={disabled} className="text-gray-400 text-3xl font-light">+</button>
      </div>
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange, disabled }) => (
  <div className={`flex-1 p-2 rounded-2xl border transition-all ${disabled ? 'opacity-50' : color === 'blue' ? 'bg-blue-600 text-white shadow-lg border-blue-700' : 'bg-white border-gray-200 shadow-sm'}`}>
    <p className={`text-[7px] font-black uppercase mb-1 text-center leading-none ${color === 'blue' ? 'text-white/50' : 'text-gray-400'}`}>{label}</p>
    <div className="flex items-center justify-between px-1 leading-none">
      <button onClick={() => onChange(val - 1)} disabled={disabled} className="font-bold w-4 text-center">-</button>
      <input type="number" inputMode="numeric" disabled={disabled} className="bg-transparent w-full text-center font-black text-lg outline-none" value={val || ''} onChange={e => onChange(e.target.value)} />
      <button onClick={() => onChange(val + 1)} disabled={disabled} className="font-bold w-4 text-center">+</button>
    </div>
  </div>
);

export default CounterPage;