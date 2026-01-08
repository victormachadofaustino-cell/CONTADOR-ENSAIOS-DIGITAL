import React, { useState, useEffect } from 'react';
import { 
  db, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, 
  query, where, getDocs, writeBatch 
} from '../firebase'; // Importações corrigidas
import toast from 'react-hot-toast';
import { 
  Home, Music, Users, ShieldCheck, ChevronDown, Plus, 
  Trash2, Save, Lock, UserPlus, Fingerprint, Clock, Activity, Building2
} from 'lucide-react';

const SettingsPage = ({ userEmail, isMaster, userData }) => {
  const [users, setUsers] = useState([]);
  const [churchData, setChurchData] = useState({});
  const [cargos, setCargos] = useState([]);
  const [ministeriosDropdown, setMinisteriosDropdown] = useState([]);
  const [listaMinisterio, setListaMinisterio] = useState([]);
  const [instrumentsData, setInstrumentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS FÁBRICA DE IGREJAS
  const [newChurchName, setNewChurchName] = useState('');
  const [isCreatingChurch, setIsCreatingChurch] = useState(false);

  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';

  // Verifica se o usuário logado tem permissão administrativa local
  const isAdminLocal = userData?.role === 'Encarregado Local' || userData?.role === 'Secretário da Música';
  const temAcessoPortaria = isMaster || isAdminLocal;

  const [activeMenu, setActiveMenu] = useState(null);
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
    } else if (isAdminLocal) {
      const q = query(collection(db, 'users'), where('comumId', '==', comumId));
      unsubUsers = onSnapshot(q, (s) => {
        setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
    
    const unsubChurch = onSnapshot(doc(db, 'config_comum', comumId), (docSnap) => {
      if (docSnap.exists()) setChurchData(docSnap.data());
    });

    const unsubCargos = onSnapshot(collection(db, 'config_cargos'), (s) => 
      setCargos(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMinDrop = onSnapshot(collection(db, 'config_ministerio'), (s) => 
      setMinisteriosDropdown(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMinLista = onSnapshot(collection(db, 'config_comum', comumId, 'ministerio_lista'), (s) => {
      const dados = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const ordenados = dados.sort((a, b) => {
        const indexA = ordemHierarquica.indexOf(a.cargo);
        const indexB = ordemHierarquica.indexOf(b.cargo);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
      setListaMinisterio(ordenados);
    });

    const unsubInst = onSnapshot(collection(db, 'config_comum', comumId, 'instrumentos_config'), (s) => {
      setInstrumentsData(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { 
      unsubUsers(); unsubChurch(); unsubCargos(); 
      unsubMinDrop(); unsubMinLista(); unsubInst(); 
    };
  }, [comumId, isMaster, isAdminLocal]);

  // FUNÇÃO FÁBRICA DE IGREJAS (EXCLUSIVA MASTER)
  const handleCreateNewChurch = async () => {
    if (!newChurchName.trim()) return toast.error("Digite o nome da igreja");
    setIsCreatingChurch(true);
    const loadingToast = toast.loading("Gerando ambiente...");

    try {
      const churchRef = await addDoc(collection(db, 'config_comum'), {
        comum: newChurchName.trim(),
        nome: newChurchName.trim(),
        createdAt: Date.now(),
        diasSelecao: [0],
        horaCulto: "19:30"
      });

      const newId = churchRef.id;
      const templateSnapshot = await getDocs(collection(db, 'config_comum', comumId, 'instrumentos_config'));
      const batch = writeBatch(db);
      
      templateSnapshot.forEach((instDoc) => {
        const newInstRef = doc(collection(db, 'config_comum', newId, 'instrumentos_config'));
        batch.set(newInstRef, instDoc.data());
      });

      await batch.commit();
      toast.success(`${newChurchName} configurada!`, { id: loadingToast });
      setNewChurchName('');
    } catch (e) {
      toast.error("Falha ao clonar ambiente", { id: loadingToast });
    } finally {
      setIsCreatingChurch(false);
    }
  };

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

  const handleInstrumentAction = async (action, payload) => {
    const ref = collection(db, 'config_comum', comumId, 'instrumentos_config');
    if (action === 'ADD') {
      if (!payload.name || !payload.section) return toast.error("Dados incompletos");
      await addDoc(ref, { name: payload.name, section: payload.section, createdAt: Date.now() });
      setNewInstName(''); setNewInstSection('');
    } else if (action === 'DELETE') {
      await deleteDoc(doc(db, 'config_comum', comumId, 'instrumentos_config', payload.id));
    }
    toast.success("Lista da Comum Atualizada");
  };

  const addItemToList = async (coll, field, val, set) => {
    if (!val) return;
    try {
      await addDoc(collection(db, coll), { [field]: val });
      set('');
      toast.success("Adicionado");
    } catch (e) { toast.error("Erro ao adicionar"); }
  };

  const sectionsFound = [...new Set(instrumentsData.map(i => i.section))];

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-[900] italic text-slate-400 animate-pulse uppercase tracking-widest text-[10px]">Sincronizando Localidade...</div>;

  return (
    <div className="space-y-4 pb-40 px-4 pt-6 max-w-md mx-auto animate-premium text-left">
      
      {/* MÓDULO 01: GESTÃO DA IGREJA */}
      <MenuCard id="church" active={activeMenu} setActive={setActiveMenu} icon={<Home size={18}/>} module="Módulo 01" title="Igreja & Localidade">
        <div className="space-y-6">
          
          {/* FÁBRICA MASTER */}
          {isMaster && (
            <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 space-y-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={14} className="text-blue-600" />
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">Fábrica de Ambientes</p>
              </div>
              <input 
                placeholder="NOME DA NOVA COMUM..." 
                className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-blue-100 outline-none uppercase shadow-sm"
                value={newChurchName}
                onChange={(e) => setNewChurchName(e.target.value)}
              />
              <button 
                disabled={isCreatingChurch}
                onClick={handleCreateNewChurch}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest active:scale-95 transition-all shadow-lg"
              >
                {isCreatingChurch ? 'Processando...' : 'Gerar Novo Ambiente'}
              </button>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Nome da Localidade</label>
            <input className="w-full bg-white p-4 rounded-2xl font-[900] text-slate-950 text-xs border border-slate-100 outline-none uppercase italic shadow-sm" value={churchData.comum || ''} onChange={(e) => saveChurchInfo('comum', e.target.value)} />
          </div>
          
          <div className="space-y-3">
            <p className="text-[8px] font-black text-slate-400 uppercase border-b border-slate-50 pb-2 ml-2 tracking-widest italic text-left">Frequência de Culto</p>
            <div className="flex justify-between gap-1">
              {diasSemana.map((d, i) => (
                <button key={i} onClick={() => toggleDia(i)} className={`w-10 h-10 rounded-xl font-[900] text-[10px] transition-all active:scale-90 ${churchData.diasSelecao?.includes(i) ? 'bg-slate-950 text-white shadow-lg' : 'bg-white text-gray-300 border border-slate-100'}`}>{d}</button>
              ))}
            </div>
            <div className="relative mt-4">
              <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="time" className="w-full bg-white p-4 pl-11 rounded-2xl font-black text-slate-950 border border-slate-100 outline-none shadow-inner italic" value={churchData.horaCulto || ''} onChange={(e) => saveChurchInfo('horaCulto', e.target.value)} />
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl space-y-5">
            <button onClick={() => setIsMinListOpen(!isMinListOpen)} className="w-full flex justify-between items-center italic font-black text-white text-[10px] uppercase tracking-[0.2em]">Ministério Local <ChevronDown size={14} className={`transition-transform ${isMinListOpen ? 'rotate-180' : ''}`}/></button>
            <div className="space-y-3">
              <input placeholder="NOME COMPLETO" className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-xs placeholder-white/20 outline-none border border-white/5 uppercase" value={newMinNome} onChange={(e) => setNewMinNome(e.target.value)} />
              <select className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-xs outline-none border border-white/5 appearance-none" value={newMinCargo} onChange={(e) => setNewMinCargo(e.target.value)}>
                <option value="" className="text-slate-950">SELECIONAR CARGO...</option>
                {ordemHierarquica.map((m, idx) => <option key={idx} value={m} className="text-slate-950">{m}</option>)}
              </select>
              <button onClick={async () => {
                if (!newMinNome || !newMinCargo) return toast.error("Preencha tudo");
                await addDoc(collection(db, 'config_comum', comumId, 'ministerio_lista'), { nome: newMinNome, cargo: newMinCargo });
                setNewMinNome(''); setNewMinCargo('');
                toast.success("Salvo com sucesso");
              }} className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest active:scale-95 transition-all">Incluir Membro</button>
            </div>
            {isMinListOpen && (
              <div className="space-y-2 pt-4 border-t border-white/5 animate-in">
                {listaMinisterio.map(p => (
                  <div key={p.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                    <div className="text-left leading-none"><p className="text-[11px] font-[900] text-white italic uppercase tracking-tighter">{p.nome}</p><p className="text-[7px] font-black text-white/40 uppercase mt-1 tracking-widest">{p.cargo}</p></div>
                    <button onClick={() => deleteDoc(doc(db, 'config_comum', comumId, 'ministerio_lista', p.id))} className="text-white/20 hover:text-red-400 p-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MenuCard>

      {/* MÓDULO 02: ORQUESTRA */}
      <MenuCard id="orchestra" active={activeMenu} setActive={setActiveMenu} icon={<Music size={18}/>} module="Módulo 02" title="Orquestra & Instrumentos">
        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-xl space-y-4">
            <input className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-xs placeholder-white/20 outline-none border border-white/5 uppercase italic" placeholder="Instrumento..." value={newInstName} onChange={(e) => setNewInstName(e.target.value)} />
            <div className="flex gap-2">
              <input className="flex-1 bg-white/10 p-4 rounded-2xl font-black text-white text-[10px] outline-none border border-white/5 uppercase" placeholder="Naipe" value={newInstSection} onChange={(e) => setNewInstSection(e.target.value)} />
              <select className="bg-white/10 p-4 rounded-2xl font-black text-white text-[10px] outline-none border border-white/5 min-w-[100px]" onChange={(e) => setNewInstSection(e.target.value)}>
                <option value="" className="text-slate-950">Exibir...</option>
                {sectionsFound.map(s => <option key={s} value={s} className="text-slate-950">{s}</option>)}
              </select>
            </div>
            <button onClick={() => handleInstrumentAction('ADD', { name: newInstName, section: newInstSection })} className="w-full bg-white text-slate-950 py-4 rounded-2xl font-[900] text-[10px] uppercase italic tracking-widest active:scale-95 shadow-lg">Novo Instrumento</button>
          </div>
          <div className="space-y-6 text-left">
            {sectionsFound.sort().map(section => (
              <div key={section} className="space-y-2">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 italic flex items-center gap-2"><Activity size={10} className="text-blue-500" />{section}</h4>
                <div className="flex flex-wrap gap-2">
                  {instrumentsData.filter(i => i.section === section).map(inst => (
                    <div key={inst.id} className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <span className="text-[10px] font-[900] text-slate-950 uppercase italic leading-none">{inst.name}</span>
                      <button onClick={() => { if(confirm('Remover instrumento?')) handleInstrumentAction('DELETE', { id: inst.id }) }} className="text-red-300 hover:text-red-500 p-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MenuCard>

      {/* MÓDULO 03: GERAL */}
      {isMaster && (
        <MenuCard id="global" active={activeMenu} setActive={setActiveMenu} icon={<Plus size={18}/>} module="Módulo 03" title="Cargos & Ministérios">
          <div className="p-2 bg-gray-50/50 space-y-8 text-left animate-in">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase italic border-b border-slate-200 pb-1 tracking-widest">Cargos Orquestra</p>
              <div className="flex gap-2">
                <input className="flex-1 bg-white p-3 rounded-xl text-xs font-black text-slate-950 outline-none border border-slate-100 shadow-sm uppercase italic" placeholder="Novo Cargo..." value={newCargoInput} onChange={(e) => setNewCargoInput(e.target.value)} />
                <button onClick={() => addItemToList('config_cargos', 'cargo', newCargoInput, setNewCargoInput)} className="bg-slate-950 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-md">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cargos.map(c => (
                  <div key={c.id} className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 animate-in">
                    <span className="text-[10px] font-black text-slate-950 uppercase italic">{c.cargo}</span>
                    <button onClick={() => deleteDoc(doc(db, 'config_cargos', c.id))} className="text-red-400 hover:text-red-600 font-black text-xs p-1">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase italic border-b border-slate-200 pb-1 tracking-widest">Tipos de Ministério</p>
              <div className="flex gap-2">
                <input className="flex-1 bg-white p-3 rounded-xl text-xs font-black text-slate-950 outline-none border border-slate-100 shadow-sm uppercase italic" placeholder="Novo Ministério..." value={newMinisterioInput} onChange={(e) => setNewMinisterioInput(e.target.value)} />
                <button onClick={() => addItemToList('config_ministerio', 'ministerio', newMinisterioInput, setNewMinisterioInput)} className="bg-slate-950 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-md">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ministeriosDropdown.map(m => (
                  <div key={m.id} className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 animate-in">
                    <span className="text-[10px] font-black text-slate-950 uppercase italic">{m.ministerio}</span>
                    <button onClick={() => deleteDoc(doc(db, 'config_ministerio', m.id))} className="text-red-400 hover:text-red-600 font-black text-xs p-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MenuCard>
      )}

      {/* MÓDULO 04: PORTARIA */}
      {temAcessoPortaria && (
        <MenuCard id="users" active={activeMenu} setActive={setActiveMenu} icon={<ShieldCheck size={18}/>} module="Módulo 04" title="Acesso & Portaria">
          <div className="space-y-4">
            <div className="bg-slate-950 p-6 rounded-[2.5rem] flex items-center gap-5 text-white shadow-2xl mb-6 border border-white/5">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-[900] text-2xl italic border border-white/10 shadow-inner text-amber-500">{userData?.name?.charAt(0)}</div>
              <div className="text-left">
                <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40 italic leading-none">{isMaster ? 'Administrador Root' : 'Administrador Local'}</p>
                <h4 className="text-base font-[900] uppercase italic mt-1.5 leading-none tracking-tighter">{userData?.name}</h4>
                <span className="inline-block bg-amber-500 text-slate-950 text-[7px] font-black px-3 py-1 rounded-full mt-3 uppercase tracking-widest italic shadow-lg">Terminal Ativo</span>
              </div>
            </div>

            <div className="space-y-3">
              {users.filter(u => u.email?.toLowerCase().trim() !== userEmail?.toLowerCase().trim()).map(u => (
                <div key={u.id} className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-left relative overflow-hidden transition-all duration-500 ${u.disabled ? 'opacity-40 grayscale' : 'hover:border-blue-200'}`}>
                  <div className="absolute top-0 right-0 p-2 opacity-5 text-slate-950 pointer-events-none"><Fingerprint size={60}/></div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <p className="text-[7px] font-black text-slate-400 uppercase italic ml-1 tracking-widest mb-1">Nome de Exibição</p>
                        <input className="w-full bg-slate-50 p-3 rounded-xl font-black text-slate-950 text-xs border border-transparent outline-none uppercase shadow-inner" value={u.name || ''} onChange={(e) => updateDoc(doc(db, 'users', u.id), { name: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase italic ml-1 tracking-widest mb-1">Cargo Atribuído</p>
                      <select className="w-full bg-slate-50 p-3 rounded-xl font-black text-slate-950 text-[10px] outline-none uppercase shadow-inner appearance-none" value={u.role || ''} onChange={(e) => updateDoc(doc(db, 'users', u.id), { role: e.target.value })}>
                        <option value="">Indefinido</option>
                        {cargos.map(c => <option key={c.id} value={c.cargo}>{c.cargo}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => updateDoc(doc(db, 'users', u.id), { approved: !u.approved })} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase italic tracking-widest transition-all shadow-md ${u.approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white shadow-xl'}`}>
                        {u.approved ? 'Liberado' : 'Aprovar'}
                      </button>
                      {isMaster && (
                        <button onClick={() => updateDoc(doc(db, 'users', u.id), { isMaster: !u.isMaster })} className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase italic transition-all shadow-md ${u.isMaster ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-300'}`}>Master</button>
                      )}
                      <button 
                        onClick={() => { 
                          if(confirm(`Bloquear/desbloqueio para ${u.name}?`)) {
                            updateDoc(doc(db, 'users', u.id), { disabled: !u.disabled, approved: u.disabled });
                          }
                        }} 
                        className={`w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-md ${u.disabled ? 'bg-red-600 text-white' : 'bg-red-50 text-red-400 border border-red-100'}`}
                      >
                        {u.disabled ? <Lock size={16}/> : <UserPlus size={16}/>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MenuCard>
      )}
    </div>
  );
};

const MenuCard = ({ id, active, setActive, icon, module, title, children }) => {
  const isOpen = active === id;
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden card-premium animate-in">
      <button onClick={() => setActive(isOpen ? null : id)} className="w-full p-6 flex justify-between items-center transition-all active:bg-slate-50 outline-none">
        <div className="flex items-center gap-4 text-left leading-none">
          <div className={`p-3 rounded-2xl shadow-sm transition-all duration-500 ${isOpen ? 'bg-slate-950 text-white scale-110 rotate-3 shadow-slate-200' : 'bg-slate-50 text-slate-400'}`}>{icon}</div>
          <div>
            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-[0.2em] italic opacity-70 leading-none">{module}</p>
            <h3 className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">{title}</h3>
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl shadow-inner"><ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} /></div>
      </button>
      {isOpen && <div className="p-6 pt-2 bg-slate-50/30 border-t border-slate-50 animate-in slide-in-from-top-4 duration-500">{children}</div>}
    </div>
  );
};

export default SettingsPage;