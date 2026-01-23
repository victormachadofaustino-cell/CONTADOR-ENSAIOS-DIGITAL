import React, { useState, useEffect } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, updateDoc, auth, collection, onSnapshot, addDoc, deleteDoc, query, where } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { 
  User, Settings, LogOut, ChevronRight, Check, 
  X, Shield, Globe, Map, Home, 
  KeyRound, RefreshCcw, Building, Plus, Trash2, Edit3, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
// IMPORTANTE: Importação do hook de contexto para habilitar a reatividade
import { useAuth } from '../context/AuthContext';

const Header = ({ onChurchChange, onRegionalChange }) => {
  // INTEGRAÇÃO: setContext agora permite que o Header mude o "GPS" do sistema
  const { userData, setContext } = useAuth(); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isRegionalManagerOpen, setIsRegionalManagerOpen] = useState(false);
  const [isRegionalSelectorOpen, setIsRegionalSelectorOpen] = useState(false);
  
  const [listaRegionais, setListaRegionais] = useState([]);
  const [newRegionalName, setNewRegionalName] = useState('');
  const [tempName, setTempName] = useState(userData?.name || '');
  const [tempRole, setTempRole] = useState(userData?.role || '');

  const isMaster = userData?.isMaster === true;
  const isLocalOnly = !isMaster && !userData?.escopoRegional && !userData?.escopoCidade && userData?.escopoLocal;

  // LÓGICA DE EXIBIÇÃO DINÂMICA: 
  // Encontra o nome da regional ativa dentro da lista carregada, para atualizar o visual do Header
  // CORREÇÃO: Prioriza o ID ativo do contexto para Master/Regional
  const regionalAtivaNome = listaRegionais.find(r => r.id === (userData?.activeRegionalId || userData?.regionalId))?.nome || userData?.regional || "Selecionar...";

  // BLOQUEIO DE SEGURANÇA: Monitor de Regionais (Sempre ativo para Master ver a lista)
  useEffect(() => {
    if (!auth.currentUser) return;

    // Mesmo que não seja master, carregamos a lista de regionais (apenas nomes) para o Header saber exibir o nome correto
    const unsub = onSnapshot(collection(db, 'config_regional'), 
      (s) => {
        setListaRegionais(s.docs.map(d => ({ id: d.id, nome: d.data().nome, ...d.data() })));
      },
      (error) => {
        console.log("Aguardando validação de nível Master...");
      }
    );
    return () => unsub();
  }, []);

  const handleLogout = async () => { 
    try {
      await signOut(auth); 
      toast.success("Sessão encerrada"); 
    } catch (e) {
      toast.error("Erro ao sair");
    }
  };

  const handleUpdateUserData = async () => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: tempName,
        role: tempRole
      });
      setIsEditUserModalOpen(false);
      toast.success("Perfil atualizado");
    } catch (e) { toast.error("Erro na atualização"); }
  };

  const toggleFlag = async (field, current) => {
    if (!isMaster) return; 
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { [field]: !current });
    } catch (e) { toast.error("Acesso negado"); }
  };

  const handleCreateRegional = async (e) => {
    e.preventDefault();
    if (!isMaster) return toast.error("Acesso restrito");
    if (!newRegionalName.trim()) return toast.error("Digite o nome");
    try {
      await addDoc(collection(db, 'config_regional'), { 
        nome: newRegionalName.toUpperCase().trim(), 
        createdAt: Date.now() 
      });
      setNewRegionalName('');
      toast.success("Regional Ativada!");
    } catch (e) { toast.error("Erro ao criar"); }
  };

  const confirmDelete = (id, nome) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1 text-left">
        <p className="text-[10px] font-black text-slate-950 uppercase italic leading-tight">Excluir <span className="text-red-600">{nome}</span>?</p>
        <div className="flex gap-2">
          <button onClick={async () => { toast.dismiss(t.id); await deleteDoc(doc(db, 'config_regional', id)); toast.success("Removida"); }} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase italic">Confirmar</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-[8px] font-black uppercase italic">Cancelar</button>
        </div>
      </div>
    ), { duration: 5000, position: 'bottom-center' });
  };

  return (
    <>
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shadow-sm">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
            <img 
              src="/assets/Logo_oficial_CCB.png" 
              alt="CCB" 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span class="text-[10px] font-black text-slate-400 italic">CCB</span>';
              }}
            />
          </div>

          <div 
            onClick={() => isMaster && setIsRegionalSelectorOpen(true)}
            className={`flex flex-col items-start leading-none text-left ${isMaster ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
          >
            <span className="text-[10px] font-black text-blue-600 uppercase italic tracking-tighter flex items-center gap-1 leading-none">
              {isLocalOnly ? 'Localidade' : 'Regional'}
              {isMaster && <ChevronDown size={10} strokeWidth={4} />}
            </span>
            <h1 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight truncate max-w-[180px]">
              {/* CORREÇÃO: Agora exibe o nome dinâmico da regional selecionada */}
              {isLocalOnly ? (userData?.comum || "Localidade") : regionalAtivaNome}
            </h1>
          </div>
        </div>

        <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border-2 border-white ring-1 ring-slate-100">
          <span className="font-black italic text-xs uppercase">{userData?.name?.charAt(0) || 'U'}</span>
        </button>
      </div>

      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[200]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-[#F1F5F9] shadow-2xl flex flex-col overflow-hidden text-left">
              
              <div className="p-8 bg-slate-950 text-white rounded-bl-[3rem] shadow-xl relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-2xl font-black italic border border-white/10 text-amber-500 shadow-inner">
                    {userData?.name?.charAt(0) || 'U'}
                  </div>
                  <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-white/5 rounded-xl text-white/40"><X size={20}/></button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-[900] uppercase italic tracking-tighter truncate">{userData?.name}</h2>
                    {isMaster && <span className="bg-amber-500 text-slate-950 text-[7px] font-black px-2 py-0.5 rounded-md uppercase italic tracking-widest border border-amber-400">Master</span>}
                  </div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic opacity-80">{userData?.role}</p>
                </div>
              </div>

              <div className="flex-1 p-6 space-y-4 overflow-y-auto no-scrollbar">
                <button onClick={() => { setTempName(userData?.name); setTempRole(userData?.role); setIsEditUserModalOpen(true); }} className="w-full bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center active:scale-95 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-950 rounded-xl"><User size={16}/></div>
                    <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">Meu Perfil</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300"/>
                </button>

                {isMaster && (
                  <button onClick={() => setIsRegionalManagerOpen(true)} className="w-full bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center active:scale-95 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building size={16}/></div>
                      <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">Config. Regionais</span>
                    </div>
                    <span className="bg-blue-600 text-white text-[8px] px-2 py-1 rounded-lg font-black">{listaRegionais.length}</span>
                  </button>
                )}

                <div className="space-y-1 pt-4 border-t border-slate-200">
                  <MenuButton icon={<KeyRound size={16}/>} label="Trocar Senha" onClick={() => toast.success("Verifique seu e-mail")} />
                  <MenuButton icon={<RefreshCcw size={16}/>} label="Sincronizar Dados" onClick={() => window.location.reload()} />
                </div>
              </div>

              <div className="p-8 border-t border-slate-200 bg-white">
                <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 p-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase italic active:scale-95 border border-red-100">
                  <LogOut size={16}/> Encerrar Sessão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRegionalSelectorOpen && (
          <div className="fixed inset-0 z-[600] flex items-start justify-center p-4 pt-20">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegionalSelectorOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl overflow-hidden text-left border-t-4 border-blue-600">
              <div className="mb-4 px-2 leading-none">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 italic leading-none">Ambiente Global</p>
                <h3 className="text-lg font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">Selecionar Regional</h3>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                {listaRegionais.map(reg => (
                  <button 
                    key={reg.id}
                    onClick={() => {
                      setContext('regional', reg.id);
                      onRegionalChange(reg.id, reg.nome); // Notifica a mudança de regional
                      setIsRegionalSelectorOpen(false);
                      toast.success(`Navegando para: ${reg.nome}`);
                    }}
                    className={`w-full p-4 rounded-2xl flex justify-between items-center transition-all active:scale-95 ${userData?.activeRegionalId === reg.id ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                  >
                    <span className="text-[10px] font-black uppercase italic leading-none">{reg.nome}</span>
                    {userData?.activeRegionalId === reg.id && <Check size={14} className="text-blue-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditUserModalOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditUserModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic ml-1 leading-none">Nome</p>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-xs border border-transparent outline-none uppercase italic" value={tempName} onChange={e => setTempName(e.target.value)} />
                </div>
                
                {isMaster && (
                  <>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase italic ml-1 leading-none">Cargo</p>
                      <select className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-xs border border-transparent outline-none uppercase" value={tempRole} onChange={e => setTempRole(e.target.value)}>
                        {['Secretário da Música', 'Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Instrutor'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <p className="text-[8px] font-black text-blue-600 uppercase italic ml-1 tracking-widest leading-none">Controle de Hierarquia</p>
                      <JurisdictionItem label="Master Root" active={userData?.isMaster} icon={<Shield size={16}/>} onClick={() => toggleFlag('isMaster', userData?.isMaster)} canEdit={true} isAmber />
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <JurisdictionItem label="Regional" active={userData?.escopoRegional} icon={<Globe size={16}/>} onClick={() => toggleFlag('escopoRegional', userData?.escopoRegional)} canEdit={true} />
                        <JurisdictionItem label="Cidade" active={userData?.escopoCidade} icon={<Map size={16}/>} onClick={() => toggleFlag('escopoCidade', userData?.escopoCidade)} canEdit={true} />
                        <JurisdictionItem label="GEM / Local" active={userData?.escopoLocal} icon={<Home size={16}/>} onClick={() => toggleFlag('escopoLocal', userData?.escopoLocal)} canEdit={true} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleUpdateUserData} className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl active:scale-95 transition-all">Salvar Perfil</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRegionalManagerOpen && isMaster && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegionalManagerOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[3.5rem] p-8 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-start mb-6 leading-none">
                <div className="leading-none">
                  <p className="text-[8px] font-black text-blue-600 uppercase italic mb-1 tracking-widest leading-none">Root Control</p>
                  <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">Regionais Ativas</h3>
                </div>
                <button onClick={() => setIsRegionalManagerOpen(false)} className="p-2 text-slate-300 hover:text-slate-950"><X size={24}/></button>
              </div>

              <form onSubmit={handleCreateRegional} className="mb-6 flex gap-2">
                <input placeholder="NOVA REGIONAL..." className="flex-1 bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-[10px] outline-none border border-slate-100 uppercase italic" value={newRegionalName} onChange={(e) => setNewRegionalName(e.target.value)} />
                <button type="submit" className="bg-blue-600 text-white px-5 rounded-2xl active:scale-90 transition-all shadow-lg"><Plus size={20}/></button>
              </form>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                {listaRegionais.map(reg => (
                  <div key={reg.id} className="p-4 bg-slate-50 rounded-[1.8rem] flex justify-between items-center border border-slate-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl text-blue-600 shadow-sm"><Building size={16}/></div>
                      <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">{reg.nome}</span>
                    </div>
                    <button onClick={() => confirmDelete(reg.id, reg.nome)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const JurisdictionItem = ({ label, active, icon, onClick, canEdit, isAmber }) => (
  <button disabled={!canEdit} onClick={onClick} className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.98] ${active ? (isAmber ? 'bg-amber-500 border-amber-600 text-slate-950 font-black' : 'bg-blue-600 border-blue-700 text-white font-black shadow-lg shadow-blue-100') : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
    <div className="flex items-center gap-3 leading-none">{icon}<span className="text-[9px] font-black uppercase italic leading-none">{label}</span></div>
    {active && <Check size={14} />}
  </button>
);

const MenuButton = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full p-4 flex items-center gap-3 text-slate-400 hover:text-slate-950 transition-all active:bg-slate-100 rounded-xl leading-none">
    {icon}<span className="text-[10px] font-black uppercase italic leading-none">{label}</span>
  </button>
);

export default Header;