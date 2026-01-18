import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, doc, onSnapshot, collection, query, orderBy } from '../../config/firebase';
import { eventService } from '../../services/eventService'; 
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Trash2, X, ChevronDown, Lock, ShieldCheck, 
  MapPin, Plus, RotateCcw, Info, Music, User, Briefcase
} from 'lucide-react';

const AtaPage = ({ eventId, comumId, isMaster, isAdmin, userData }) => {
  const [ataData, setAtaData] = useState({
    status: 'open',
    atendimentoNome: '', atendimentoMin: '',
    oracaoAberturaNome: '', oracaoAberturaMin: '',
    ultimaOracaoNome: '', ultimaOracaoMin: '',
    partes: [
      { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
      { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
    ],
    presencaLocal: [],
    presencaLocalFull: [],
    visitantes: []
  });
  
  const [eventMeta, setEventMeta] = useState(null);
  const [localMinisterio, setLocalMinisterio] = useState([]);
  const [referenciaMinisterio, setReferenciaMinisterio] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [showConfirmReopen, setShowConfirmReopen] = useState(false);
  const [visitaToDelete, setVisitaToDelete] = useState(null);
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  
  const [openSection, setOpenSection] = useState(null); // Iniciam fechados por padrão
  const [editIndex, setEditIndex] = useState(null);
  const saveTimeoutRef = useRef(null);

  const [newVisita, setNewVisita] = useState({ 
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  const isRegional = userData?.role === 'Encarregado Regional' || userData?.escopoRegional === true;
  const isResponsavelAta = eventMeta?.responsavel === userData?.name || isAdmin || isMaster || isRegional;
  const isClosed = ataData?.status === 'closed';
  const isInputDisabled = isClosed || !isResponsavelAta;

  const pesosMinisterio = {
    'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4,
    'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7
  };

  const ordenarLista = (lista, campoNome, campoRole) => {
    return [...lista].sort((a, b) => {
      const pesoA = pesosMinisterio[a[campoRole]] || 99;
      const pesoB = pesosMinisterio[b[campoRole]] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a[campoNome] || "").localeCompare(b[campoNome] || "");
    });
  };

  const debouncedSave = useCallback((newData) => {
    if (isInputDisabled) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      const nomeDaComum = eventMeta?.comumNome || userData?.comum || "LOCALIDADE";
      eventService.saveAtaData(comumId, eventId, {
        ...newData,
        comumNome: nomeDaComum
      });
    }, 1500);
  }, [comumId, eventId, eventMeta, userData, isInputDisabled]);

  const handleChange = (newData) => {
    setAtaData(newData);
    debouncedSave(newData);
  };

  const saveStatus = async (newStatus) => {
    const updated = { ...ataData, status: newStatus, comumNome: eventMeta?.comumNome || userData?.comum || "LOCALIDADE" };
    setAtaData(updated);
    try {
      await eventService.saveAtaData(comumId, eventId, updated);
      toast.success(newStatus === 'open' ? "Ensaio Reaberto" : "Ensaio Lacrado ✅");
    } catch (e) { toast.error("Falha ao processar status."); }
  };

  useEffect(() => {
    if (!comumId || !eventId) return;
    let isMounted = true;
    const unsubRef = onSnapshot(collection(db, 'referencia_cargos'), (s) => {
      if (!isMounted) return;
      const lista = s.docs.map(d => d.data().nome).sort((a, b) => (pesosMinisterio[a] || 99) - (pesosMinisterio[b] || 99));
      setReferenciaMinisterio(lista);
    });
    const unsubLocal = onSnapshot(collection(db, 'comuns', comumId, 'ministerio_lista'), (s) => {
      if (!isMounted) return;
      const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
      setLocalMinisterio(ordenarLista(lista, 'name', 'role'));
    });
    const unsubAta = onSnapshot(doc(db, 'comuns', comumId, 'events', eventId), (s) => {
      if (!isMounted) return;
      if (s.exists()) {
        const eventData = s.data();
        setEventMeta(eventData);
        if (eventData.ata && eventData.ata.partes?.length > 0) setAtaData(eventData.ata);
      }
      setLoading(false);
    });
    return () => { isMounted = false; unsubRef(); unsubLocal(); unsubAta(); if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [eventId, comumId]);

  const handleHinoChange = (pIdx, hIdx, val) => {
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
    const np = [...ataData.partes];
    
    if (v === '') { 
      np[pIdx].hinos[hIdx] = ''; 
      return handleChange({ ...ataData, partes: np }); 
    }
    
    // Validação Litúrgica: Coros C1-C6 ou Hinos 1-480
    if (!/^C[1-6]$/.test(v) && !/^\d{1,3}$/.test(v)) return;
    if (/^\d{1,3}$/.test(v) && parseInt(v) > 480) v = '480';
    
    np[pIdx].hinos[hIdx] = v;
    handleChange({ ...ataData, partes: np });
  };

  const handleOpenVisitaModal = (v = null, idx = null) => {
    if (isInputDisabled) return;
    if (v) { setNewVisita(v); setEditIndex(idx); } 
    else { setNewVisita({ nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' }); setEditIndex(null); }
    setShowVisitaModal(true);
  };

  const handleSaveVisita = () => {
    if (!newVisita.nome) return toast.error("Informe o nome");
    let updated = [...(ataData.visitantes || [])];
    if (editIndex !== null) updated[editIndex] = newVisita;
    else updated.push({ ...newVisita, id: Date.now() });
    handleChange({ ...ataData, visitantes: ordenarLista(updated, 'nome', 'min') });
    setShowVisitaModal(false);
  };

  const togglePresencaLocal = (m) => {
    if (isInputDisabled) return;
    const list = ataData.presencaLocal.includes(m.name) ? ataData.presencaLocal.filter(n => n !== m.name) : [...ataData.presencaLocal, m.name];
    const full = ataData.presencaLocalFull.find(x => x.nome === m.name) ? ataData.presencaLocalFull.filter(x => x.nome !== m.name) : [...ataData.presencaLocalFull, { nome: m.name, role: m.role }];
    handleChange({ ...ataData, presencaLocal: list, presencaLocalFull: full });
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] uppercase italic tracking-[0.3em]">Sincronizando Ata...</div>;

  return (
    <div className="space-y-4 pb-40 px-2 font-sans text-left bg-gray-50 pt-4 animate-premium">
      
      {/* INDICADOR DE AUTORIDADE */}
      <div className="mx-2 mb-6 flex items-center justify-between bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className={`absolute left-0 top-0 h-full w-1.5 ${isResponsavelAta ? 'bg-blue-600' : 'bg-slate-300'}`} />
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${isResponsavelAta ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
            {isClosed ? <Lock size={20} /> : isResponsavelAta ? <ShieldCheck size={20} /> : <Info size={20} />}
          </div>
          <div className="leading-tight">
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 italic">Autoridade de Edição</p>
            <p className="text-xs font-[900] text-slate-950 uppercase italic leading-none">{isClosed ? 'Ata Lacrada' : isResponsavelAta ? 'Editor Regional' : 'Apenas Leitura'}</p>
            <p className="text-[8px] font-bold text-blue-600 uppercase mt-1">Resp: {eventMeta?.responsavel || 'Não definido'}</p>
          </div>
        </div>
      </div>

      <Accordion title="Liturgia do Ensaio" isOpen={openSection === 'liturgia'} onClick={() => setOpenSection(openSection === 'liturgia' ? null : 'liturgia')} icon="🎼">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Atendimento" val={ataData.atendimentoNome} disabled={isInputDisabled} onChange={v => handleChange({...ataData, atendimentoNome: v})} />
              <Select label="Ministério / Cargo" val={ataData.atendimentoMin} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => handleChange({...ataData, atendimentoMin: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Oração Abertura" val={ataData.oracaoAberturaNome} disabled={isInputDisabled} onChange={v => handleChange({...ataData, oracaoAberturaNome: v})} />
              <Select label="Ministério / Cargo" val={ataData.oracaoAberturaMin} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => handleChange({...ataData, oracaoAberturaMin: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Oração Encerramento" val={ataData.ultimaOracaoNome} disabled={isInputDisabled} onChange={v => handleChange({...ataData, ultimaOracaoNome: v})} />
              <Select label="Ministério / Cargo" val={ataData.ultimaOracaoMin} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => handleChange({...ataData, ultimaOracaoMin: v})} />
            </div>
          </div>

          <div className="space-y-4">
            {ataData.partes.map((parte, pIdx) => (
              <div key={pIdx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black italic uppercase text-[10px] tracking-widest text-blue-600">{parte.label}</h4>
                  {!isInputDisabled && pIdx > 1 && <button onClick={() => handleRemoveParte(pIdx)} className="bg-red-50 text-red-500 p-2 rounded-xl active:scale-90 transition-transform"><Trash2 size={14}/></button>}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Field label="Condutor" val={parte.nome} disabled={isInputDisabled} onChange={v => { const np = [...ataData.partes]; np[pIdx].nome = v; handleChange({...ataData, partes: np}); }} />
                  <Select label="Ministério / Cargo" val={parte.min} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => { const np = [...ataData.partes]; np[pIdx].min = v; handleChange({...ataData, partes: np}); }} />
                </div>
                <div className="flex flex-wrap gap-3">
                  {parte.hinos.map((h, hIdx) => (
                    <div key={hIdx} className="relative">
                      <input type="text" disabled={isInputDisabled} className="w-14 h-14 bg-slate-50 rounded-2xl text-center font-black text-blue-800 text-sm outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50" value={h || ''} placeholder="-" onChange={e => handleHinoChange(pIdx, hIdx, e.target.value)} />
                      {!isInputDisabled && hIdx >= (pIdx < 2 ? 5 : 3) && (
                        <button onClick={() => { const np = [...ataData.partes]; np[pIdx].hinos.splice(hIdx, 1); handleChange({...ataData, partes: np}); }} className="absolute -top-2 -right-2 bg-slate-950 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">✕</button>
                      )}
                    </div>
                  ))}
                  {!isInputDisabled && <button onClick={() => { const np = [...ataData.partes]; np[pIdx].hinos.push(''); handleChange({...ataData, partes: np}); }} className="w-14 h-14 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 flex items-center justify-center active:scale-95 transition-all"><Plus size={20}/></button>}
                </div>
              </div>
            ))}
            {!isInputDisabled && <button onClick={() => { const np = [...ataData.partes]; np.push({ label: `${ataData.partes.length + 1}ª Parte`, nome: '', min: '', hinos: ['', '', ''] }); handleChange({ ...ataData, partes: np }); }} className="w-full py-5 bg-white border-2 border-dashed border-blue-100 rounded-[2.5rem] text-blue-600 font-black uppercase text-[9px] italic flex items-center justify-center gap-3 active:scale-95 transition-all"><Plus size={16}/> Incluir Nova Parte</button>}
          </div>
        </div>
      </Accordion>

      <Accordion title="Visitantes" isOpen={openSection === 'visitantes'} onClick={() => setOpenSection(openSection === 'visitantes' ? null : 'visitantes')} icon="🌍" badge={ataData.visitantes?.length || null}>
        <div className="space-y-4">
          {!isInputDisabled && <button onClick={() => handleOpenVisitaModal()} className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase text-[10px] italic active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"><UserPlus size={18}/> Adicionar Visitante</button>}
          <div className="space-y-3">
            {(ataData.visitantes || []).map((v, idx) => (
              <div key={idx} className="flex justify-between items-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm active:scale-95 transition-all" onClick={() => handleOpenVisitaModal(v, idx)}>
                <div className="text-left leading-tight">
                  <p className="text-sm font-[900] uppercase text-slate-950 italic leading-none">{v.nome}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase mt-1.5 italic leading-none">{v.min} • {v.inst || 'N/I'}</p>
                  <p className="text-[8px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase leading-none"><MapPin size={10} className="text-slate-300"/> {v.bairro} ({v.cidadeUf})</p>
                </div>
                {!isInputDisabled && <button onClick={(e) => { e.stopPropagation(); setVisitaToDelete(v.id); }} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}
              </div>
            ))}
          </div>
        </div>
      </Accordion>

      <Accordion title="Ministério Local" isOpen={openSection === 'ministerio'} onClick={() => setOpenSection(openSection === 'ministerio' ? null : 'ministerio')} icon="🏛️" badge={ataData.presencaLocal?.length || null}>
        <div className="grid grid-cols-1 gap-2.5">
          {localMinisterio.map((m, i) => (
            <button key={i} disabled={isInputDisabled} onClick={() => togglePresencaLocal(m)} className={`flex justify-between items-center p-5 rounded-3xl border transition-all ${ataData.presencaLocal?.includes(m.name) ? 'bg-slate-900 text-white border-slate-950 shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-700'}`}>
              <div className="text-left leading-none">
                <p className="text-xs font-black uppercase italic tracking-tight leading-none">{m.name}</p>
                <p className={`text-[9px] font-bold mt-2 uppercase tracking-widest leading-none ${ataData.presencaLocal?.includes(m.name) ? 'text-blue-400' : 'text-slate-400'}`}>{m.role}</p>
              </div>
              {ataData.presencaLocal?.includes(m.name) && <ShieldCheck size={18} className="text-blue-400" />}
            </button>
          ))}
        </div>
      </Accordion>

      <div className="pt-12 px-2 pb-10">
        {!isClosed ? (
          isResponsavelAta && <button onClick={() => setShowConfirmLock(true)} className="w-full bg-slate-950 text-white py-7 rounded-[3rem] font-black uppercase italic tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all border border-white/10 text-xs"><Lock size={22} /> Lacrar Ensaio</button>
        ) : (
          isMaster && <button onClick={() => setShowConfirmReopen(true)} className="w-full bg-blue-50 text-blue-800 py-7 rounded-[3rem] font-black uppercase italic tracking-[0.1em] flex items-center justify-center gap-4 border-2 border-blue-100 active:scale-95 transition-all shadow-md text-xs"><RotateCcw size={22} /> Reabrir Ensaio</button>
        )}
      </div>

      <AnimatePresence>
        {showConfirmLock && (
          <Modal title="Confirmar Lacre?" icon={<Lock size={40}/>} confirmLabel="Confirmar Lacre" onConfirm={() => { saveStatus('closed'); setShowConfirmLock(false); }} onCancel={() => setShowConfirmLock(false)}>
            Esta ação congela os dados para o Dashboard Regional.
          </Modal>
        )}

        {showConfirmReopen && (
          <Modal title="Reabrir Ensaio?" icon={<RotateCcw size={40}/>} confirmLabel="Sim, Reabrir" onConfirm={() => { saveStatus('open'); setShowConfirmReopen(false); }} onCancel={() => setShowConfirmReopen(false)}>
            A edição voltará a ficar disponível para os responsáveis autorizados.
          </Modal>
        )}

        {showVisitaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative">
              <button onClick={() => setShowVisitaModal(false)} className="absolute top-8 right-8 text-slate-300 active:text-slate-950"><X size={24}/></button>
              <h3 className="text-2xl font-[900] text-slate-950 uppercase italic tracking-tighter mb-8 leading-none">Dados da Visita</h3>
              <div className="space-y-5">
                <Field label="Nome Completo" val={newVisita.nome} onChange={v => setNewVisita({...newVisita, nome: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Ministério / Cargo" val={newVisita.min} options={referenciaMinisterio} onChange={v => setNewVisita({...newVisita, min: v})} />
                  <Field label="Instrumento" val={newVisita.inst} onChange={v => setNewVisita({...newVisita, inst: v})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Bairro" val={newVisita.bairro} onChange={v => setNewVisita({...newVisita, bairro: v})} />
                  <Field label="Cidade / UF" val={newVisita.cidadeUf} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} />
                </div>
                <button onClick={handleSaveVisita} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 active:scale-95 transition-all">Salvar Registro</button>
              </div>
            </motion.div>
          </div>
        )}

        {visitaToDelete && (
          <Modal title="Excluir Visita?" icon={<Trash2 size={40}/>} confirmLabel="Sim, Excluir" onConfirm={() => { const nv = ataData.visitantes.filter(x => x.id !== visitaToDelete); handleChange({...ataData, visitantes: nv}); setVisitaToDelete(null); }} onCancel={() => setVisitaToDelete(null)} danger>
            O visitante será removido permanentemente deste relatório.
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// COMPONENTES AUXILIARES
const Accordion = ({ title, icon, badge, children, isOpen, onClick }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-4">
    <button onClick={onClick} className="w-full p-7 flex justify-between items-center active:bg-slate-50 transition-all outline-none">
      <div className="flex items-center gap-4 text-slate-950">
        <span className="text-2xl">{icon}</span>
        <div className="text-left leading-none">
          <h3 className="font-[900] italic uppercase text-sm tracking-tight">{title}</h3>
          {badge && <span className="text-[8px] font-black text-blue-600 uppercase mt-2 inline-block tracking-widest">{badge} Registros</span>}
        </div>
      </div>
      <ChevronDown size={18} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="p-6 pt-0">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Modal = ({ title, children, icon, confirmLabel, onConfirm, onCancel, danger }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-6">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-[320px] rounded-[3rem] p-10 text-center shadow-2xl relative">
      <div className={`w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center ${danger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>{icon}</div>
      <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-4 tracking-tighter leading-none">{title}</h3>
      <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-10">{children}</p>
      <div className="space-y-3">
        <button onClick={onConfirm} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg ${danger ? 'bg-red-600 text-white shadow-red-100' : 'bg-slate-950 text-white'}`}>{confirmLabel}</button>
        <button onClick={onCancel} className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest">Voltar</button>
      </div>
    </motion.div>
  </div>
);

const Field = ({ label, val, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-slate-950">
    <label className="text-[8px] font-black uppercase italic mb-2 text-slate-400 tracking-widest flex items-center gap-1.5"><User size={10}/> {label}</label>
    <input type="text" disabled={disabled} className="bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent focus:bg-white focus:border-blue-500 transition-all uppercase shadow-inner italic disabled:opacity-40" value={val || ''} onChange={e => onChange(e.target.value.toUpperCase())} />
  </div>
);

const Select = ({ label, val, options, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-slate-950">
    <label className="text-[8px] font-black uppercase italic mb-2 text-slate-400 tracking-widest flex items-center gap-1.5"><Briefcase size={10}/> {label}</label>
    <select disabled={disabled} className="bg-slate-50 p-4 rounded-2xl font-black text-[10px] outline-none border-2 border-transparent focus:bg-white focus:border-blue-500 transition-all shadow-inner disabled:opacity-40 appearance-none" value={val || ''} onChange={e => onChange(e.target.value)}>
      <option value="">SELECIONAR</option>
      {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
    </select>
  </div>
);

export default AtaPage;