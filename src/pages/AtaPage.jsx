import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, setDoc, collection } from '../firebase';
import toast from 'react-hot-toast';

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
  
  const [ministerios, setMinisterios] = useState([]);
  const [localMinisterio, setLocalMinisterio] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [editIndex, setEditIndex] = useState(null);
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [visitaToDelete, setVisitaToDelete] = useState(null);
  const [openSection, setOpenSection] = useState(null); 

  const [newVisita, setNewVisita] = useState({ 
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '' 
  });

  const isClosed = ataData?.status === 'closed';
  // Bloqueio de inputs se o ensaio estiver fechado OU se o usuário não for admin
  const isInputDisabled = isClosed || !isAdmin;

  const ordemMinisterio = [
    'Encarregado Regional', 'Encarregado Local', 'Examinadora',
    'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM'
  ];

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
    const unsubMinGlobal = onSnapshot(collection(db, 'config_ministerio'), (s) => {
      const lista = s.docs.map(d => d.data().ministerio).filter(val => val).sort();
      setMinisterios(lista);
    });

    const unsubLocal = onSnapshot(collection(db, 'config_comum', comumId, 'ministerio_lista'), (s) => {
      const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
      const ordenados = ordenarLista(lista, 'name', 'role');
      setLocalMinisterio(ordenados);
    });

    const unsubAta = onSnapshot(doc(db, 'comuns', comumId, 'events', eventId), (s) => {
      if (s.exists()) {
        const eventData = s.data();
        if (eventData.ata && eventData.ata.partes && eventData.ata.partes.length > 0) {
          const data = eventData.ata;
          if (data.visitantes) data.visitantes = ordenarLista(data.visitantes, 'nome', 'min');
          setAtaData(data);
        } else {
          const estruturaInicial = {
            status: 'open',
            atendimentoNome: eventData.ata?.atendimentoNome || '',
            atendimentoMin: eventData.ata?.atendimentoMin || '',
            oracaoAberturaNome: eventData.ata?.oracaoAberturaNome || '',
            oracaoAberturaMin: eventData.ata?.oracaoAberturaMin || '',
            ultimaOracaoNome: eventData.ata?.ultimaOracaoNome || '',
            ultimaOracaoMin: eventData.ata?.ultimaOracaoMin || '',
            partes: [
              { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
              { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
            ],
            presencaLocal: eventData.ata?.presencaLocal || [],
            presencaLocalFull: eventData.ata?.presencaLocalFull || [],
            visitantes: eventData.ata?.visitantes || []
          };
          setAtaData(estruturaInicial);
          if (isAdmin) {
             setDoc(doc(db, 'comuns', comumId, 'events', eventId), { ata: estruturaInicial }, { merge: true });
          }
        }
      }
      setLoading(false);
    });

    return () => { unsubMinGlobal(); unsubLocal(); unsubAta(); };
  }, [eventId, comumId]);

  const saveAta = async (newData) => {
    if (!isAdmin) return toast.error("Sem permissão para editar");
    if (isClosed && !isMaster) return toast.error("Ensaio fechado!");
    
    let todosHinos = [];
    (newData.partes || []).forEach(p => {
      if (p.hinos) todosHinos = [...todosHinos, ...p.hinos.filter(h => h !== '')];
    });

    if (newData.visitantes) {
      newData.visitantes = ordenarLista(newData.visitantes, 'nome', 'min');
    }

    const dataToSave = { ...newData, hinosChamados: todosHinos.length, hinosLista: todosHinos };
    try {
      await setDoc(doc(db, 'comuns', comumId, 'events', eventId), { ata: dataToSave }, { merge: true });
    } catch (error) { toast.error("Erro ao salvar"); }
  };

  const handleHinoChange = (pIdx, hIdx, val) => {
    if (isInputDisabled) return;
    let v = val.toUpperCase().replace(/[^0-9C]/g, '');
    const newPartes = JSON.parse(JSON.stringify(ataData.partes));
    newPartes[pIdx].hinos[hIdx] = v;
    saveAta({ ...ataData, partes: newPartes });
  };

  const handleAddParte = () => {
    if (isInputDisabled) return;
    const novaParteIndex = ataData.partes.length + 1;
    const novaParte = { 
      label: `${novaParteIndex}ª Parte`, 
      nome: '', 
      min: '', 
      hinos: ['', '', ''] 
    };
    saveAta({ ...ataData, partes: [...ataData.partes, novaParte] });
  };

  const handleRemoveParte = (index) => {
    if (isInputDisabled) return;
    const novasPartes = [...ataData.partes];
    novasPartes.splice(index, 1);
    const partesReindexadas = novasPartes.map((p, i) => ({...p, label: `${i + 1}ª Parte`}));
    saveAta({ ...ataData, partes: partesReindexadas });
  };

  const handleSaveVisita = () => {
    if (isInputDisabled) return;
    if (!newVisita.nome) return toast.error("Informe o nome");
    let updatedVisitas = [...(ataData.visitantes || [])];
    if (editIndex !== null) {
      updatedVisitas[editIndex] = newVisita;
      setEditIndex(null);
    } else {
      updatedVisitas.push({ ...newVisita, id: Date.now() });
    }
    saveAta({ ...ataData, visitantes: updatedVisitas });
    setNewVisita({ nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '' });
  };

  const togglePresencaLocal = (m) => {
    if (isInputDisabled) return;
    const currentList = ataData.presencaLocal || [];
    const currentFull = ataData.presencaLocalFull || [];

    let updatedList;
    let updatedFull;

    if (currentList.includes(m.name)) {
      updatedList = currentList.filter(n => n !== m.name);
      updatedFull = currentFull.filter(obj => obj.nome !== m.name);
    } else {
      updatedList = [...currentList, m.name];
      updatedFull = [...currentFull, { nome: m.name, role: m.role }];
    }

    saveAta({ ...ataData, presencaLocal: updatedList, presencaLocalFull: updatedFull });
  };

  if (loading) return <div className="p-10 text-center font-black text-blue-600 animate-pulse italic text-xs uppercase">Sincronizando...</div>;

  return (
    <div className="space-y-4 pb-40 px-2 font-sans text-left bg-gray-50 pt-4">
      
      {/* 1. SEÇÃO LITURGIA */}
      <Accordion 
        title="Liturgia do Ensaio" 
        isOpen={openSection === 'liturgia'} 
        onClick={() => setOpenSection(openSection === 'liturgia' ? null : 'liturgia')}
        icon="🎼"
        badge={ataData.hinosChamados > 0 ? `${ataData.hinosChamados} Hinos` : null}
      >
        <div className={`space-y-6 ${isInputDisabled ? 'opacity-80' : ''}`}>
          <div className="grid grid-cols-1 gap-4 bg-gray-100/50 p-4 rounded-3xl border border-gray-200 shadow-inner">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Atendimento" val={ataData.atendimentoNome} disabled={isInputDisabled} onChange={v => saveAta({...ataData, atendimentoNome: v})} />
              <Select label="Ministério" val={ataData.atendimentoMin} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => saveAta({...ataData, atendimentoMin: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Oração Abertura" val={ataData.oracaoAberturaNome} disabled={isInputDisabled} onChange={v => saveAta({...ataData, oracaoAberturaNome: v})} />
              <Select label="Ministério" val={ataData.oracaoAberturaMin} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => saveAta({...ataData, oracaoAberturaMin: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Última Oração" val={ataData.ultimaOracaoNome} disabled={isInputDisabled} onChange={v => saveAta({...ataData, ultimaOracaoNome: v})} />
              <Select label="Ministério" val={ataData.ultimaOracaoMin} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => saveAta({...ataData, ultimaOracaoMin: v})} />
            </div>
          </div>

          <div className="space-y-4">
            {(ataData.partes || []).map((parte, pIdx) => {
              const isInitialPart = pIdx < 2; 
              const minFields = isInitialPart ? 5 : 3;

              return (
                <div key={`p-${pIdx}`} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm relative">
                  <div className="flex justify-between items-center mb-4 text-gray-900">
                    <h4 className="font-black italic uppercase text-[10px] tracking-widest">{parte.label}</h4>
                    {!isInputDisabled && pIdx > 1 && (
                      <button onClick={() => handleRemoveParte(pIdx)} className="text-red-500 text-[9px] font-black uppercase">Remover</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Field label="Responsável" val={parte.nome} disabled={isInputDisabled} onChange={v => { const np = [...ataData.partes]; np[pIdx].nome = v; saveAta({...ataData, partes: np}); }} />
                    <Select label="Ministério" val={parte.min} options={ordemMinisterio} disabled={isInputDisabled} onChange={v => { const np = [...ataData.partes]; np[pIdx].min = v; saveAta({...ataData, partes: np}); }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(parte.hinos || []).map((h, hIdx) => (
                      <div key={hIdx} className="relative group">
                        <input 
                          type="text" 
                          disabled={isInputDisabled} 
                          className="w-10 h-10 bg-gray-100 rounded-xl text-center font-black text-blue-800 text-xs outline-none border-2 border-transparent focus:border-blue-400 disabled:opacity-70" 
                          value={h || ''} 
                          placeholder="00" 
                          onChange={e => handleHinoChange(pIdx, hIdx, e.target.value)} 
                        />
                        {!isInputDisabled && hIdx >= minFields && (
                          <button onClick={() => {
                            const np = [...ataData.partes];
                            np[pIdx].hinos.splice(hIdx, 1);
                            saveAta({...ataData, partes: np});
                          }} className="absolute -top-1 -right-1 bg-red-600 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center">✕</button>
                        )}
                      </div>
                    ))}
                    {!isInputDisabled && (
                      <button onClick={() => { const np = [...ataData.partes]; np[pIdx].hinos.push(''); saveAta({...ataData, partes: np}); }} className="w-10 h-10 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold">+</button>
                    )}
                  </div>
                </div>
              );
            })}

            {!isInputDisabled && (
                <button onClick={handleAddParte} className="w-full py-4 border-2 border-dashed border-blue-200 rounded-3xl text-blue-600 font-black uppercase text-[10px] italic hover:bg-blue-50 transition-all">
                  + Incluir Nova Parte
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
        badge={ataData.visitantes?.length > 0 ? `${ataData.visitantes.length}` : null}
      >
        <div className="space-y-4">
          {!isInputDisabled && (
            <div className="bg-purple-50 p-5 rounded-3xl border border-purple-200 space-y-3">
              <Field label="Nome do Visitante" val={newVisita.nome} onChange={v => setNewVisita({...newVisita, nome: v})} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Ministério" val={newVisita.min} options={ordemMinisterio} onChange={v => setNewVisita({...newVisita, min: v})} />
                <Field label="Instrumento" val={newVisita.inst} onChange={v => setNewVisita({...newVisita, inst: v})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro" val={newVisita.bairro} onChange={v => setNewVisita({...newVisita, bairro: v})} />
                <Field label="Cidade / UF" val={newVisita.cidadeUf} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dia Ensaio Comum" val={newVisita.dataEnsaio} onChange={v => setNewVisita({...newVisita, dataEnsaio: v})} />
                <Field label="Hora" val={newVisita.hora} onChange={v => setNewVisita({...newVisita, hora: v})} />
              </div>
              <button onClick={handleSaveVisita} className="w-full bg-purple-700 text-white py-4 rounded-2xl font-black uppercase text-[10px] italic shadow-lg shadow-purple-100 active:scale-95 transition-all">
                {editIndex !== null ? 'Salvar Alteração' : 'Incluir Visitante'}
              </button>
            </div>
          )}
          <div className="space-y-2">
            {(ataData?.visitantes || []).map((v, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-gray-200 shadow-sm" onClick={() => !isInputDisabled && (setNewVisita(v), setEditIndex(idx))}>
                <div className="text-left leading-tight text-gray-900">
                  <p className="text-[11px] font-black uppercase">{v.nome} <span className="text-purple-600 font-black">• {v.min}</span></p>
                  <p className="text-[9px] font-black text-gray-500 uppercase mt-1 italic">{v.inst} • {v.bairro} ({v.cidadeUf})</p>
                </div>
                {!isInputDisabled && <button onClick={(e) => { e.stopPropagation(); setVisitaToDelete(v.id); }} className="text-red-400 p-2">🗑️</button>}
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
        badge={ataData.presencaLocal?.length > 0 ? `${ataData.presencaLocal.length}` : null}
      >
        <div className="grid grid-cols-1 gap-2">
          {(localMinisterio || []).map((m, i) => (
            <button key={i} disabled={isInputDisabled} onClick={() => togglePresencaLocal(m)} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${ataData.presencaLocal?.includes(m.name) ? 'bg-green-700 text-white border-green-800 shadow-md scale-[1.01]' : 'bg-white border-gray-200 text-gray-700'}`}>
              <div className="text-left leading-none">
                <p className="text-[11px] font-black uppercase italic">{m.name}</p>
                <p className={`text-[9px] font-black mt-1 uppercase ${ataData.presencaLocal?.includes(m.name) ? 'text-white/80' : 'text-gray-400'}`}>{m.role}</p>
              </div>
              {ataData.presencaLocal?.includes(m.name) && <span className="font-bold text-xs">✓</span>}
            </button>
          ))}
        </div>
      </Accordion>

      {/* BOTÕES DE GESTÃO (VISÍVEL APENAS PARA ADMINS/MASTER) */}
      <div className="pt-10 px-2">
        {!isClosed ? (
          isAdmin && (
            <button onClick={() => setShowConfirmLock(true)} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black uppercase italic shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
              <div className="bg-white/10 p-2 rounded-full"><span className="text-xl">🔒</span></div>
              <div className="text-left leading-none">
                <p className="text-[10px] opacity-60 font-black uppercase tracking-widest leading-none">Lacre do Ensaio</p>
                <p className="text-sm mt-1">Finalizar e Gerar Ata</p>
              </div>
            </button>
          )
        ) : (
          isMaster && (
            <button onClick={() => saveAta({...ataData, status: 'open'})} className="w-full bg-blue-100 text-blue-800 py-5 rounded-[2.5rem] font-black uppercase italic flex items-center justify-center gap-3 border border-blue-200">
              <span className="text-xl">🔓</span> Reabrir Ensaio
            </button>
          )
        )}
      </div>

      {/* MODAIS DE CONFIRMAÇÃO */}
      {showConfirmLock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 text-center shadow-2xl">
            <h3 className="font-black text-gray-900 uppercase italic mb-2">Lacrar Ensaio?</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-8 leading-tight">Ao lacrar, os dados serão arquivados para geração da ata oficial.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmLock(false)} className="flex-1 py-3 font-black uppercase text-[10px] text-gray-500 italic">Voltar</button>
              <button onClick={() => { saveAta({...ataData, status: 'closed'}); setShowConfirmLock(false); }} className="flex-1 bg-black text-white py-3 rounded-2xl font-black uppercase text-[10px] italic">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {visitaToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 text-center shadow-2xl text-gray-900">
            <h3 className="font-black uppercase italic mb-6">Remover Visitante?</h3>
            <div className="flex gap-3">
              <button onClick={() => setVisitaToDelete(null)} className="flex-1 py-3 font-black uppercase text-[10px] text-gray-500 italic">Cancelar</button>
              <button onClick={() => {
                const updated = (ataData.visitantes || []).filter(item => item.id !== visitaToDelete);
                saveAta({...ataData, visitantes: updated});
                setVisitaToDelete(null);
                toast.success("Removido");
              }} className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] italic">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Accordion = ({ title, icon, badge, children, isOpen, onClick }) => (
  <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden mb-3">
    <button onClick={onClick} className="w-full p-6 flex justify-between items-center active:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 text-gray-900">
        <span className="text-xl">{icon}</span>
        <div className="text-left leading-none">
          <h3 className="font-black italic uppercase text-[11px] tracking-tight">{title}</h3>
          {badge && <span className="text-[9px] font-black text-blue-600 uppercase mt-1 inline-block">{badge}</span>}
        </div>
      </div>
      <span className={`text-[10px] text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>
    {isOpen && <div className="p-4 pt-0 animate-in slide-in-from-top-2 duration-300">{children}</div>}
  </div>
);

const Field = ({ label, val, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-gray-900">
    <label className="text-[8px] font-black uppercase italic mb-1 ml-1">{label}</label>
    <input type="text" disabled={disabled} className={`bg-gray-100 p-3 rounded-xl font-black text-xs outline-none border-2 border-transparent focus:bg-white focus:border-blue-400 ${disabled ? 'opacity-70' : ''}`} value={val || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

const Select = ({ label, val, options, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-gray-900">
    <label className="text-[8px] font-black uppercase italic mb-1 ml-1">{label}</label>
    <select disabled={disabled} className={`bg-gray-100 p-3 rounded-xl font-black text-[10px] outline-none border-2 border-transparent focus:bg-white focus:border-blue-400 ${disabled ? 'opacity-70' : ''}`} value={val || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Selecione</option>
      {(options || []).map((o, idx) => <option key={idx} value={o}>{o}</option>)}
    </select>
  </div>
);

export default AtaPage;