import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from '../firebase';
import toast from 'react-hot-toast';

const SettingsPage = ({ userEmail, isMaster, userData }) => {
  const [users, setUsers] = useState([]);
  const [churchData, setChurchData] = useState({});
  const [cargos, setCargos] = useState([]);
  const [ministeriosDropdown, setMinisteriosDropdown] = useState([]);
  const [listaMinisterio, setListaMinisterio] = useState([]);
  const [instrumentsData, setInstrumentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';

  const [isChurchMenuOpen, setIsChurchMenuOpen] = useState(false);
  const [isInstMenuOpen, setIsInstMenuOpen] = useState(false);
  const [isListsMenuOpen, setIsListsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [isMinListOpen, setIsMinListOpen] = useState(false);
  const [newMinNome, setNewMinNome] = useState('');
  const [newMinCargo, setNewMinCargo] = useState('');
  const [newCargoInput, setNewCargoInput] = useState('');
  const [newMinisterioInput, setNewMinisterioInput] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newInstSection, setNewInstSection] = useState('');

  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const ordemHierarquica = [
    'Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM',
    'Encarregado Regional', 'Examinadora', 'Encarregado Local'
  ];

  useEffect(() => {
    let unsubUsers = () => {};
    if (isMaster) {
      unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
        setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
    
    const unsubChurch = onSnapshot(doc(db, 'config_comum', comumId), (docSnap) => {
      if (docSnap.exists()) setChurchData(docSnap.data());
    });

    const unsubCargos = onSnapshot(collection(db, 'config_cargos'), (s) => setCargos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubMinDrop = onSnapshot(collection(db, 'config_ministerio'), (s) => setMinisteriosDropdown(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubMinLista = onSnapshot(collection(db, 'config_comum', comumId, 'ministerio_lista'), (s) => {
      const dados = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const ordenados = dados.sort((a, b) => {
        const indexA = ordemHierarquica.indexOf(a.cargo);
        const indexB = ordemHierarquica.indexOf(b.cargo);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
      setListaMinisterio(ordenados);
    });

    const unsubInst = onSnapshot(doc(db, 'settings', 'instruments'), (docSnap) => {
      if (docSnap.exists()) setInstrumentsData(docSnap.data().groups || []);
      setLoading(false);
    });

    return () => { 
      unsubUsers(); unsubChurch(); unsubCargos(); 
      unsubMinDrop(); unsubMinLista(); unsubInst(); 
    };
  }, [comumId, isMaster]);

  const saveChurchInfo = async (field, value) => {
    try {
      await updateDoc(doc(db, 'config_comum', comumId), { [field]: value });
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  const toggleDia = async (diaIndex) => {
    let selecionados = Array.isArray(churchData.diasSelecao) ? [...churchData.diasSelecao] : [];
    selecionados = selecionados.includes(diaIndex) ? selecionados.filter(i => i !== diaIndex) : [...selecionados, diaIndex];
    await saveChurchInfo('diasSelecao', selecionados);
  };

  const addItemToList = async (coll, field, val, set) => {
    if (!val) return;
    try {
      await addDoc(collection(db, coll), { [field]: val });
      set('');
      toast.success("Item adicionado");
    } catch (e) { toast.error("Erro ao adicionar"); }
  };

  const handleInstrumentAction = async (action, payload) => {
    const instRef = doc(db, 'settings', 'instruments');
    let updatedGroups = [...instrumentsData];
    if (action === 'ADD') {
      if (!payload.name || !payload.section) return toast.error("Preencha todos os campos");
      updatedGroups.push({ id: `inst-${Date.now()}`, name: payload.name, section: payload.section });
    } else if (action === 'DELETE') {
      updatedGroups = updatedGroups.filter(item => item.id !== payload.id);
    }
    try {
      await updateDoc(instRef, { groups: updatedGroups });
      setNewInstName(''); setNewInstSection('');
      toast.success("Lista atualizada");
    } catch (e) { toast.error("Erro na atualização"); }
  };

  const addMinisterioPessoa = async () => {
    if (!newMinNome || !newMinCargo) return toast.error("Preencha nome e cargo");
    try {
      const ref = collection(db, 'config_comum', comumId, 'ministerio_lista');
      await addDoc(ref, { nome: newMinNome, cargo: newMinCargo });
      setNewMinNome(''); setNewMinCargo('');
      toast.success("Membro cadastrado");
    } catch (e) { toast.error("Erro ao cadastrar"); }
  };

  const sectionsFound = [...new Set(instrumentsData.map(i => i.section))];

  if (loading) return <div className="py-20 text-center font-black text-blue-600 animate-pulse uppercase italic tracking-widest text-xs">Carregando configurações...</div>;

  return (
    <div className="space-y-4 pb-40 text-left font-sans animate-in fade-in duration-500 px-2 pt-4">
      
      {/* MÓDULO 01: GESTÃO DA IGREJA */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
        <button onClick={() => setIsChurchMenuOpen(!isChurchMenuOpen)} className="w-full p-6 flex justify-between items-center transition-colors hover:bg-gray-50">
          <div className="text-left leading-none"><p className="text-[9px] font-black text-blue-600 uppercase mb-1 tracking-widest italic">Módulo 01</p><h3 className="text-sm font-black text-gray-900 uppercase italic">Igreja & Localidade</h3></div>
          <span className={`text-gray-400 transition-transform duration-300 ${isChurchMenuOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {isChurchMenuOpen && (
          <div className="p-6 bg-gray-50/50 space-y-6 border-t border-gray-100 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Nome da Comum</label>
              <input className="w-full bg-white p-3.5 rounded-2xl font-black text-gray-900 text-xs border border-gray-100 shadow-sm outline-none focus:border-blue-400" value={churchData.comum || ''} onChange={(e) => saveChurchInfo('comum', e.target.value)} />
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black text-gray-400 uppercase border-b border-gray-200 pb-1 italic">Dias de Culto e Horário</p>
              <div className="flex justify-between gap-1">
                {diasSemana.map((d, i) => (
                  <button key={i} onClick={() => toggleDia(i)} className={`w-9 h-9 rounded-xl font-black text-[10px] transition-all ${churchData.diasSelecao?.includes(i) ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-300 border border-gray-100'}`}>{d}</button>
                ))}
              </div>
              <input type="time" className="w-full bg-white p-3 rounded-xl font-black text-gray-900 border border-gray-100 shadow-sm outline-none" value={churchData.horaCulto || ''} onChange={(e) => saveChurchInfo('horaCulto', e.target.value)} />
            </div>
            <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl shadow-blue-100 space-y-5">
              <button onClick={() => setIsMinListOpen(!isMinListOpen)} className="w-full flex justify-between items-center italic font-black text-white text-[10px] uppercase tracking-widest">Ministério Local <span>{isMinListOpen ? '▲' : '▼'}</span></button>
              <div className="space-y-3">
                <input placeholder="Nome completo" className="w-full bg-white/20 p-4 rounded-2xl font-black text-white text-xs placeholder-white/60 outline-none border border-white/10" value={newMinNome} onChange={(e) => setNewMinNome(e.target.value)} />
                <select className="w-full bg-white/20 p-4 rounded-2xl font-black text-white text-xs outline-none border border-white/10 appearance-none" value={newMinCargo} onChange={(e) => setNewMinCargo(e.target.value)}>
                  <option value="" className="text-gray-900">Selecionar Cargo...</option>
                  {ordemHierarquica.map((m, idx) => <option key={idx} value={m} className="text-gray-900">{m}</option>)}
                </select>
                <button onClick={addMinisterioPessoa} className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-lg active:scale-95 transition-all">Salvar Membro</button>
              </div>
              {isMinListOpen && (
                <div className="space-y-2 pt-4 border-t border-white/10 animate-in slide-in-from-top-2">
                  {listaMinisterio.map(p => (
                    <div key={p.id} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                      <div className="text-left leading-none"><p className="text-xs font-black text-white italic uppercase tracking-tight">{p.nome}</p><p className="text-[8px] font-black text-white/60 uppercase mt-1">{p.cargo}</p></div>
                      <button onClick={() => { if(confirm('Excluir?')) deleteDoc(doc(db, 'config_comum', comumId, 'ministerio_lista', p.id)) }} className="bg-white/10 text-white w-8 h-8 rounded-full flex items-center justify-center text-[10px]">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MÓDULO 02: ORQUESTRA & INSTRUMENTOS */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
        <button onClick={() => setIsInstMenuOpen(!isInstMenuOpen)} className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
          <div className="text-left leading-none"><p className="text-[9px] font-black text-blue-600 uppercase mb-1 tracking-widest italic">Módulo 02</p><h3 className="text-sm font-black text-gray-900 uppercase italic">Orquestra & Instrumentos</h3></div>
          <span className={`text-gray-400 transition-transform duration-300 ${isInstMenuOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {isInstMenuOpen && (
          <div className="p-6 bg-gray-50/50 space-y-6 border-t border-gray-100 text-left">
            <div className="bg-gray-900 p-6 rounded-[2.5rem] shadow-xl space-y-4">
              <input className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-xs placeholder-white/40 outline-none border border-white/5" placeholder="Nome do Instrumento..." value={newInstName} onChange={(e) => setNewInstName(e.target.value)} />
              <div className="flex gap-2">
                <input className="flex-1 bg-white/10 p-4 rounded-2xl font-black text-white text-[10px] placeholder-white/40 outline-none border border-white/5" placeholder="Naipe (ex: Metais)" value={newInstSection} onChange={(e) => setNewInstSection(e.target.value)} />
                <select className="bg-white/10 p-4 rounded-2xl font-black text-white text-[10px] outline-none border border-white/5 max-w-[120px]" onChange={(e) => setNewInstSection(e.target.value)}>
                  <option value="" className="text-gray-900">Ver Naipes</option>
                  {sectionsFound.map(s => <option key={s} value={s} className="text-gray-900">{s}</option>)}
                </select>
              </div>
              <button onClick={() => handleInstrumentAction('ADD', { name: newInstName, section: newInstSection })} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg italic active:scale-95 transition-all">Novo Instrumento</button>
            </div>
            <div className="space-y-6">
              {sectionsFound.sort().map(section => (
                <div key={section} className="space-y-2">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest ml-2 flex items-center gap-2 italic"><span className="w-2 h-2 bg-blue-600 rounded-full"></span>{section || 'Sem Naipe'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {instrumentsData.filter(i => i.section === section).map(inst => (
                      <div key={inst.id} className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                        <span className="text-[11px] font-black text-gray-900 uppercase italic leading-none">{inst.name}</span>
                        <button onClick={() => { if(confirm('Excluir?')) handleInstrumentAction('DELETE', { id: inst.id }) }} className="w-5 h-5 rounded-full bg-red-50 text-red-500 text-[10px] flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MÓDULO 03: CARGOS & LISTAS GLOBAIS */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
        <button onClick={() => setIsListsMenuOpen(!isListsMenuOpen)} className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
          <div className="text-left leading-none"><p className="text-[9px] font-black text-blue-600 uppercase mb-1 tracking-widest italic">Módulo 03</p><h3 className="text-sm font-black text-gray-900 uppercase italic">Cargos & Ministérios</h3></div>
          <span className={`text-gray-400 transition-transform duration-300 ${isListsMenuOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {isListsMenuOpen && (
          <div className="p-6 bg-gray-50/50 space-y-8 border-t border-gray-100 text-left animate-in slide-in-from-top-2">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase italic border-b border-gray-200 pb-1">Cargos Orquestra (Geral)</p>
              <div className="flex gap-2">
                <input className="flex-1 bg-white p-3 rounded-xl text-xs font-black text-gray-900 outline-none border border-gray-100 shadow-sm" placeholder="Novo Cargo..." value={newCargoInput} onChange={(e) => setNewCargoInput(e.target.value)} />
                <button onClick={() => addItemToList('config_cargos', 'cargo', newCargoInput, setNewCargoInput)} className="bg-gray-900 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 transition-all">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cargos.map(c => (
                  <div key={c.id} className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-900 uppercase italic">{c.cargo}</span>
                    <button onClick={() => deleteDoc(doc(db, 'config_cargos', c.id))} className="text-red-400 font-black text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase italic border-b border-gray-200 pb-1">Tipos de Ministério (Dropdown Global)</p>
              <div className="flex gap-2">
                <input className="flex-1 bg-white p-3 rounded-xl text-xs font-black text-gray-900 outline-none border border-gray-100 shadow-sm" placeholder="Novo Ministério..." value={newMinisterioInput} onChange={(e) => setNewMinisterioInput(e.target.value)} />
                <button onClick={() => addItemToList('config_ministerio', 'ministerio', newMinisterioInput, setNewMinisterioInput)} className="bg-gray-900 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 transition-all">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ministeriosDropdown.map(m => (
                  <div key={m.id} className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-900 uppercase italic">{m.ministerio}</span>
                    <button onClick={() => deleteDoc(doc(db, 'config_ministerio', m.id))} className="text-red-400 font-black text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MÓDULO 04: GESTÃO DE USUÁRIOS (CONTROLE DE PORTARIA) */}
      {isMaster && (
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
            <div className="text-left leading-none"><p className="text-[9px] font-black text-blue-600 uppercase mb-1 tracking-widest italic">Módulo 04</p><h3 className="text-sm font-black text-gray-900 uppercase italic">Acesso & Usuários</h3></div>
            <span className={`text-gray-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {isUserMenuOpen && (
            <div className="p-4 bg-gray-50/50 space-y-4 border-t border-gray-100 animate-in slide-in-from-top-2">
              <div className="bg-blue-700 p-6 rounded-[2.5rem] flex items-center gap-5 text-white shadow-2xl border border-blue-600">
                <div className="w-14 h-14 bg-white/20 rounded-[1.2rem] flex items-center justify-center font-black text-2xl italic shadow-inner">{userData?.name?.charAt(0)}</div>
                <div className="text-left leading-none">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 italic leading-none">Administrador Sistema</p>
                  <h4 className="text-base font-black uppercase italic mt-1 leading-none">{userData?.name}</h4>
                  <span className="inline-block bg-white text-blue-700 text-[8px] font-black px-3 py-1 rounded-full mt-3 uppercase tracking-widest">Master Ativo</span>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <p className="text-[9px] font-black text-gray-400 uppercase italic ml-4 mb-2 tracking-widest leading-none">Controle de Portaria</p>
                {users.filter(u => u.email?.toLowerCase().trim() !== userEmail?.toLowerCase().trim()).map(u => (
                  <div key={u.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-5 text-left transition-all ${u.disabled ? 'opacity-60 grayscale border-red-100' : 'border-gray-200 hover:border-blue-100'}`}>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="leading-none mb-1 text-gray-900">
                        <p className="text-[9px] font-black text-gray-400 uppercase italic ml-1 mb-1">Identificação</p>
                        <input className="w-full bg-gray-50 p-3 rounded-xl font-black text-xs border border-transparent focus:border-blue-400 outline-none" value={u.name || ''} onChange={(e) => updateDoc(doc(db, 'users', u.id), { name: e.target.value })} />
                      </div>
                      <div className="leading-none text-gray-900">
                        <p className="text-[9px] font-black text-gray-400 uppercase italic ml-1 mb-1">Cargo no Sistema</p>
                        <select className="w-full bg-gray-50 p-3 rounded-xl font-black text-[10px] border border-transparent focus:border-blue-400 outline-none uppercase" value={u.role || ''} onChange={(e) => updateDoc(doc(db, 'users', u.id), { role: e.target.value })}>
                          <option value="">Indefinido</option>
                          {/* LISTA DINÂMICA DO MODULO 03 */}
                          {cargos.map(c => <option key={c.id} value={c.cargo}>{c.cargo}</option>)}
                          {/* BACKUP CASO A LISTA DINAMICA NAO TENHA O CARGO SELECIONADO */}
                          {u.role && !cargos.some(c => c.cargo === u.role) && <option value={u.role}>{u.role}</option>}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 pt-4 border-t border-gray-50">
                      <button onClick={() => updateDoc(doc(db, 'users', u.id), { approved: !u.approved })} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase italic tracking-widest transition-all ${u.approved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-900 text-white shadow-lg'}`}>
                        {u.approved ? 'Ativo' : 'Aprovar'}
                      </button>
                      <button onClick={() => updateDoc(doc(db, 'users', u.id), { isMaster: !u.isMaster })} className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase italic tracking-widest transition-all ${u.isMaster ? 'bg-amber-400 text-white shadow-md' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                        Master
                      </button>
                      <button 
                        onClick={() => { 
                          const acao = u.disabled ? 'Reativar' : 'Bloquear';
                          if(confirm(`Deseja ${acao} este acesso permanentemente?`)) {
                            updateDoc(doc(db, 'users', u.id), { 
                              disabled: !u.disabled,
                              approved: u.disabled 
                            });
                            toast.success(`Usuário ${acao === 'Bloquear' ? 'Bloqueado' : 'Reativado'}`);
                          }
                        }} 
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all ${u.disabled ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500'}`}
                      >
                        {u.disabled ? '🔓' : '🚫'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;