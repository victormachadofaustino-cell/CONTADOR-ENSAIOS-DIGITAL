import React, { useState, useEffect, useRef } from 'react';
import { db, doc, onSnapshot, collection } from '../firebase';
import { eventService } from '../services/eventService'; 
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, X, Phone, ChevronDown, Lock, ShieldCheck, MapPin, Plus, RotateCcw, FileText } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [showConfirmReopen, setShowConfirmReopen] = useState(false);
  const [visitaToDelete, setVisitaToDelete] = useState(null);
  const [openSection, setOpenSection] = useState(null); 
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const saveTimeoutRef = useRef(null);

  const [newVisita, setNewVisita] = useState({ 
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  const isResponsavelAta = eventMeta?.responsavel === userData?.name || isMaster;
  const isClosed = ataData?.status === 'closed';
  const isInputDisabled = isClosed || !isResponsavelAta;

  const ordemMinisterio = [
    'Encarregado Regional', 'Encarregado Local', 'Examinadora',
    'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM'
  ];

  // SALVAMENTO COM DEBOUNCE PARA CAMPOS DE TEXTO
  const handleChange = (newData) => {
    setAtaData(newData);
    if (isInputDisabled) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      // INJEÇÃO DO NOME AMIGÁVEL DA COMUM (Ponte São João) NO LUGAR DO CÓDIGO
      const nomeDaComum = userData?.comum || userData?.bairro || "LOCALIDADE";
      
      eventService.saveAtaData(comumId, eventId, {
        ...newData,
        comumNome: nomeDaComum
      });
    }, 800);
  };

  // SALVAMENTO IMEDIATO PARA STATUS (IGNORA BLOQUEIO E DEBOUNCE)
  const saveStatus = async (newStatus) => {
    const nomeDaComum = userData?.comum || userData?.bairro || "LOCALIDADE";
    
    const updated = { 
      ...ataData, 
      status: newStatus,
      comumNome: nomeDaComum
    };
    
    setAtaData(updated);
    try {
      await eventService.saveAtaData(comumId, eventId, updated);
      toast.success(newStatus === 'open' ? "Ensaio Reaberto" : "Ensaio Lacrado");
    } catch (e) {
      toast.error("Erro ao atualizar status");
    }
  };

  const formatPhone = (value) => {
    if (!value) return "";
    const phoneNumber = value.replace(/\D/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 3) return phoneNumber;
    if (phoneNumberLength < 7) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const ordenarLista = (lista, campoNome, campoRole) => {
    return [...lista].sort((a, b) => {
      const indexA = ordemMinisterio.indexOf(a[campoRole]);
      const indexB = ordemMinisterio.indexOf(b[campoRole]);
      const pesoA = indexA === -1 ? 99 : indexA;
      const pesoB = indexB === -1 ? 99 : indexB;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a[campoNome] || "").localeCompare(b[campoNome] || "");
    });
  };

  useEffect(() => {
    if (!comumId || !eventId) return;
    const unsubLocal = onSnapshot(collection(db, 'config_comum', comumId, 'ministerio_lista'), (s) => {
      const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
      setLocalMinisterio(ordenarLista(lista, 'name', 'role'));
    });
    const unsubAta = onSnapshot(doc(db, 'comuns', comumId, 'events', eventId), (s) => {
      if (s.exists()) {
        const eventData = s.data();
        setEventMeta(eventData);
        if (eventData.ata && eventData.ata.partes?.length > 0) setAtaData(eventData.ata);
      }
      setLoading(false);
    });
    return () => { unsubLocal(); unsubAta(); if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [eventId, comumId]);

  const handleHinoChange = (pIdx, hIdx, val) => {
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
    if (v === '') {
        const np = [...ataData.partes];
        np[pIdx].hinos[hIdx] = '';
        return handleChange({ ...ataData, partes: np });
    }
    if (!/^C[1-6]?$/.test(v) && !/^\d{1,3}$/.test(v)) return;
    if (/^\d{1,3}$/.test(v) && parseInt(v) > 480) v = '480';
    const np = [...ataData.partes];
    np[pIdx].hinos[hIdx] = v;
    handleChange({ ...ataData, partes: np });
  };

  const handleAddParte = () => {
    if (isInputDisabled) return;
    const n = ataData.partes.length + 1;
    const nova = { label: `${n}ª Parte`, nome: '', min: '', hinos: ['', '', '', '', ''] };
    handleChange({ ...ataData, partes: [...ataData.partes, nova] });
  };

  const handleRemoveParte = (idx) => {
    if (isInputDisabled || idx < 2) return;
    const np = ataData.partes.filter((_, i) => i !== idx).map((p, i) => ({...p, label: `${i + 1}ª Parte`}));
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

  if (loading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse text-xs uppercase italic tracking-widest">Sincronizando...</div>;

  return (
    <div className="space-y-4 pb-40 px-2 font-sans text-left bg-gray-50 pt-4">
      
      {/* INDICADOR DE RESPONSABILIDADE */}
      <div className="mx-2 mb-6 flex items-center justify-between bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isResponsavelAta ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {isResponsavelAta ? <ShieldCheck size={18} /> : <Lock size={18} />}
          </div>
          <div>
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Responsável pela Ata</p>
            <p className="text-[11px] font-[900] text-slate-900 uppercase italic leading-none">{eventMeta?.responsavel || 'Não Definido'}</p>
          </div>
        </div>
        {!isResponsavelAta && <span className="text-[8px] font-black text-red-500 uppercase italic">Apenas Visualização</span>}
      </div>

      {/* 1. SEÇÃO LITURGIA */}
      <Accordion 
        title="Liturgia do Ensaio" 
        isOpen={openSection === 'liturgia'} 
        onClick={() => setOpenSection(openSection === 'liturgia' ? null : 'liturgia')}
        icon="🎼"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 bg-gray-100/50 p-4 rounded-3xl border border-gray-200 shadow-inner">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Atendimento" val={ataData.atendimentoNome} disabled={isInputDisabled} onChange={v => handleChange({...ataData, atendimentoNome: v})} />
              <Select label="Cargo" val={ataData.atendimentoMin} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => handleChange({...ataData, atendimentoMin: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Oração Abertura" val={ataData.oracaoAberturaNome} disabled={isInputDisabled} onChange={v => handleChange({...ataData, oracaoAberturaNome: v})} />
              <Select label="Ministério" val={ataData.oracaoAberturaMin} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => handleChange({...ataData, oracaoAberturaMin: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Oração Encerramento" val={ataData.ultimaOracaoNome} disabled={isInputDisabled} onChange={v => handleChange({...ataData, ultimaOracaoNome: v})} />
              <Select label="Ministério" val={ataData.ultimaOracaoMin} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => handleChange({...ataData, ultimaOracaoMin: v})} />
            </div>
          </div>

          <div className="space-y-4">
            {ataData.partes.map((parte, pIdx) => {
              const hinosMinimos = pIdx < 2 ? 5 : 3;
              return (
                <div key={pIdx} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm relative">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black italic uppercase text-[10px] tracking-widest">{parte.label}</h4>
                    {!isInputDisabled && pIdx > 1 && <button onClick={() => handleRemoveParte(pIdx)} className="text-red-500 text-[8px] font-black uppercase">Remover</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Field label="Condutor" val={parte.nome} disabled={isInputDisabled} onChange={v => { const np = [...ataData.partes]; np[pIdx].nome = v; handleChange({...ataData, partes: np}); }} />
                    <Select label="Ministério" val={parte.min} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => { const np = [...ataData.partes]; np[pIdx].min = v; handleChange({...ataData, partes: np}); }} />
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {parte.hinos.map((h, hIdx) => (
                      <div key={hIdx} className="relative group">
                        <input 
                          type="text" disabled={isInputDisabled}
                          className="w-12 h-12 bg-gray-100 rounded-xl text-center font-[900] text-blue-800 text-sm outline-none border-2 border-transparent focus:border-blue-400 focus:bg-white transition-all disabled:opacity-70"
                          value={h || ''} placeholder="-"
                          onChange={e => handleHinoChange(pIdx, hIdx, e.target.value)}
                        />
                        {!isInputDisabled && hIdx >= hinosMinimos && (
                            <button onClick={() => {
                              const np = [...ataData.partes];
                              np[pIdx].hinos.splice(hIdx, 1);
                              handleChange({...ataData, partes: np});
                            }} className="absolute -top-1 -right-1 bg-red-600 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center border border-white">✕</button>
                        )}
                      </div>
                    ))}
                    {!isInputDisabled && (
                      <button onClick={() => { const np = [...ataData.partes]; np[pIdx].hinos.push(''); handleChange({...ataData, partes: np}); }} className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold">+</button>
                    )}
                  </div>
                </div>
              );
            })}
            {!isInputDisabled && (
                <button onClick={handleAddParte} className="w-full py-4 border-2 border-dashed border-blue-200 rounded-3xl text-blue-600 font-black uppercase text-[10px] italic flex items-center justify-center gap-2">
                    <Plus size={14}/> Incluir Nova Parte
                </button>
            )}
          </div>
        </div>
      </Accordion>

      {/* 2. SEÇÃO VISITANTES */}
      <Accordion 
        title="Visitantes" 
        isOpen={openSection === 'visitantes'} 
        onClick={() => setOpenSection(openSection === 'visitantes' ? null : 'visitantes')}
        icon="🌍"
        badge={ataData.visitantes?.length || null}
      >
        <div className="space-y-4">
          {!isInputDisabled && (
            <button 
              onClick={() => handleOpenVisitaModal()} 
              className="w-full py-5 bg-white border-2 border-dashed border-purple-200 rounded-3xl text-purple-600 font-black uppercase text-[10px] italic hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16}/> Adicionar Visitante
            </button>
          )}
          <div className="space-y-2">
            {(ataData.visitantes || []).map((v, idx) => (
              <div 
                key={idx} 
                className="flex justify-between items-center p-4 bg-white rounded-2xl border border-gray-200 shadow-sm active:scale-95 transition-all"
                onClick={() => handleOpenVisitaModal(v, idx)}
              >
                <div className="text-left leading-tight">
                  <p className="text-[12px] font-black uppercase text-gray-900">{v.nome}</p>
                  <p className="text-[9px] font-black text-purple-600 uppercase mt-0.5">{v.min} • {v.inst || 'S/I'}</p>
                  <p className="text-[8px] font-bold text-gray-400 mt-1 flex items-center gap-1 uppercase tracking-tighter">
                    <MapPin size={8}/> {v.bairro} ({v.cidadeUf})
                  </p>
                </div>
                {!isInputDisabled && (
                  <button onClick={(e) => { e.stopPropagation(); setVisitaToDelete(v.id); }} className="text-red-300 p-2 hover:text-red-500">
                    <Trash2 size={18}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Accordion>

      {/* 3. SEÇÃO MINISTÉRIO LOCAL */}
      <Accordion 
        title="Ministério Local" 
        isOpen={openSection === 'ministerio'} 
        onClick={() => setOpenSection(openSection === 'ministerio' ? null : 'ministerio')}
        icon="🏛️"
        badge={ataData.presencaLocal?.length || null}
      >
        <div className="grid grid-cols-1 gap-2">
          {localMinisterio.map((m, i) => (
            <button key={i} disabled={isInputDisabled} onClick={() => togglePresencaLocal(m)} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${ataData.presencaLocal?.includes(m.name) ? 'bg-green-700 text-white border-green-800 shadow-md' : 'bg-white border-gray-200 text-gray-700'}`}>
              <div className="text-left leading-none">
                <p className="text-[11px] font-black uppercase italic">{m.name}</p>
                <p className={`text-[9px] font-black mt-1 uppercase ${ataData.presencaLocal?.includes(m.name) ? 'text-white/80' : 'text-gray-400'}`}>{m.role}</p>
              </div>
              {ataData.presencaLocal?.includes(m.name) && <Plus size={14} className="rotate-45" />}
            </button>
          ))}
        </div>
      </Accordion>

      {/* BOTÕES BI-DIRECIONAIS */}
      <div className="pt-10 px-2 space-y-3">
        {!isClosed ? (
          isResponsavelAta && (
            <button onClick={() => setShowConfirmLock(true)} className="w-full bg-slate-950 text-white py-6 rounded-[2.5rem] font-black uppercase italic shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
              <Lock size={20} /> Finalizar e Lacrar Ensaio
            </button>
          )
        ) : (
          isMaster && (
            <button onClick={() => setShowConfirmReopen(true)} className="w-full bg-blue-50 text-blue-800 py-6 rounded-[2.5rem] font-black uppercase italic flex items-center justify-center gap-4 border border-blue-200 active:scale-95 transition-all shadow-md">
              <RotateCcw size={20} /> Reabrir Ensaio
            </button>
          )
        )}
      </div>

      <AnimatePresence>
        {showVisitaModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-900 uppercase italic text-sm">Dados do Visitante</h3>
                <button onClick={() => setShowVisitaModal(false)} className="text-gray-400 text-xl font-bold">✕</button>
              </div>
              <div className="space-y-4">
                <Field label="Nome do Visitante" val={newVisita.nome} onChange={v => setNewVisita({...newVisita, nome: v})} />
                <div className="grid grid-cols-2 gap-3">
                    <Select label="Cargo" val={newVisita.min} options={ordemMinisterio} onChange={v => setNewVisita({...newVisita, min: v})} />
                    <Field label="Instrumento" val={newVisita.inst} onChange={v => setNewVisita({...newVisita, inst: v})} />
                </div>
                <Field label="Contato / Telefone" val={newVisita.contato} onChange={v => setNewVisita({...newVisita, contato: formatPhone(v)})} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bairro" val={newVisita.bairro} onChange={v => setNewVisita({...newVisita, bairro: v})} />
                  <Field label="Cidade / UF" val={newVisita.cidadeUf} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dia Ensaio Comum" val={newVisita.dataEnsaio} onChange={v => setNewVisita({...newVisita, dataEnsaio: v})} />
                  <Field label="Hora" val={newVisita.hora} onChange={v => setNewVisita({...newVisita, hora: v})} />
                </div>
                <button onClick={handleSaveVisita} className="w-full bg-purple-700 text-white py-4 rounded-2xl font-black uppercase text-[10px] italic shadow-lg mt-4">
                  {editIndex !== null ? 'Salvar Alteração' : 'Incluir Visitante'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showConfirmLock && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] p-8 shadow-2xl w-full max-w-xs">
              <h3 className="font-black uppercase italic mb-2">Lacrar Ensaio?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-8 leading-tight">Ao lacrar, os dados serão arquivados e a edição será bloqueada.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmLock(false)} className="flex-1 py-3 text-gray-500 font-black uppercase text-[10px]">Voltar</button>
                <button onClick={() => { saveStatus('closed'); setShowConfirmLock(false); }} className="flex-1 bg-black text-white py-3 rounded-2xl font-black uppercase text-[10px] italic">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showConfirmReopen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] p-8 shadow-2xl w-full max-w-xs">
              <h3 className="font-black uppercase italic mb-2 text-blue-600">Reabrir Ensaio?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-8 leading-tight">A edição das contagens e da ata será liberada novamente.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmReopen(false)} className="flex-1 py-3 text-gray-500 font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={() => { saveStatus('open'); setShowConfirmReopen(false); }} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] italic">Reabrir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL REMOÇÃO VISITANTE */}
      {visitaToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl w-full max-w-xs">
            <h3 className="font-black uppercase italic mb-6">Remover Visitante?</h3>
            <div className="flex gap-3">
              <button onClick={() => setVisitaToDelete(null)} className="flex-1 py-3 text-gray-500 font-black uppercase text-[10px]">Cancelar</button>
              <button onClick={() => { const up = ataData.visitantes.filter(x => x.id !== visitaToDelete); handleChange({...ataData, visitantes: up}); setVisitaToDelete(null); toast.success("Removido"); }} className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] italic">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// COMPONENTES AUXILIARES
const Accordion = ({ title, icon, badge, children, isOpen, onClick }) => (
  <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden mb-3">
    <button onClick={onClick} className="w-full p-6 flex justify-between items-center active:bg-gray-50 transition-colors outline-none">
      <div className="flex items-center gap-3 text-gray-900">
        <span className="text-xl">{icon}</span>
        <div className="text-left leading-none">
          <h3 className="font-black italic uppercase text-[11px] tracking-tight">{title}</h3>
          {badge && <span className="text-[9px] font-black text-blue-600 uppercase mt-1 inline-block">{badge} Registros</span>}
        </div>
      </div>
      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="p-4 pt-0 animate-in slide-in-from-top-2 duration-300">{children}</div>}
  </div>
);

const Field = ({ label, val, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-gray-900">
    <label className="text-[8px] font-black uppercase italic mb-1 text-gray-400">{label}</label>
    <input 
      type="text" 
      disabled={disabled} 
      className="bg-gray-100 p-3.5 rounded-xl font-black text-[12px] outline-none border-2 border-transparent focus:bg-white focus:border-blue-400 transition-all uppercase" 
      value={val || ''} 
      onChange={e => onChange(e.target.value.toUpperCase())} 
    />
  </div>
);

const Select = ({ label, val, options, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-gray-900">
    <label className="text-[8px] font-black uppercase italic mb-1 text-gray-400">{label}</label>
    <select 
      disabled={disabled} 
      className="bg-gray-100 p-3.5 rounded-xl font-black text-[11px] outline-none border-2 border-transparent focus:bg-white focus:border-blue-400 transition-all" 
      value={val || ''} 
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Selecione</option>
      {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
    </select>
  </div>
);

export default AtaPage;