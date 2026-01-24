import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, doc, updateDoc, query, where } from '../../config/firebase';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, Globe, Map, Home, X, ChevronRight, 
  User, ShieldAlert, Mail, Shield, Eye, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Importação do Cérebro de Autenticação para validar jurisdição
import { useAuth } from '../../context/AuthContext';

const ModuleAccess = ({ comumId, cargos }) => {
  const { userData, user, loading: authLoading } = useAuth();
  const userEmail = user?.email;
  
  const isMaster = userData?.isMaster;
  const isComissao = userData?.isComissao;
  const isRegional = userData?.isRegional || userData?.escopoRegional;
  const isLocal = userData?.escopoLocal || userData?.isLocal;

  const [users, setUsers] = useState([]);
  const [comunsDaRegional, setComunsDaRegional] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openSections, setOpenSections] = useState({}); 

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. MONITOR DE USUÁRIOS COM QUERY ATÔMICA E FALLBACK
  useEffect(() => {
    if (authLoading || !userData) return;
    
    let isMounted = true;
    const qBase = collection(db, 'users');
    let qUsers;
    
    // LÓGICA DE JURISDIÇÃO PARA QUERY:
    // Se for Local, a regra de segurança EXIGE que o filtro seja por comumId
    if (isLocal && !isMaster && !isComissao) {
      qUsers = query(qBase, where('comumId', '==', userData.comumId));
    } else if (comumId) {
      qUsers = query(qBase, where('comumId', '==', comumId));
    } else {
      qUsers = query(qBase, where('regionalId', '==', activeRegionalId));
    }
    
    const unsubUsers = onSnapshot(qUsers, (s) => {
      if (!isMounted) return;
      let allUsers = s.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // GARANTIA: Se o snapshot falhar ou não trouxer o próprio usuário (por delay), 
      // injetamos o userData atual para garantir visibilidade mínima.
      const jaNaLista = allUsers.some(u => u.email === userEmail);
      if (!jaNaLista && userData) {
        allUsers = [{ id: user?.uid, ...userData }, ...allUsers];
      }

      setUsers(allUsers);
    }, (err) => {
      console.warn("Snapshot restrito. Aplicando fallback de perfil próprio:", err.message);
      if (isMounted) setUsers([{ id: user?.uid, ...userData }]);
    });

    // Lista de comuns liberada apenas para gestão superior
    let unsubComuns = () => {};
    if (isMaster || isRegional || isComissao) {
      const qComuns = query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId));
      unsubComuns = onSnapshot(qComuns, (s) => {
        if (isMounted) setComunsDaRegional(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => { isMounted = false; unsubUsers(); unsubComuns(); };
  }, [authLoading, activeRegionalId, comumId, isMaster, isComissao, isRegional, isLocal, userData, userEmail]);

  // 2. LÓGICA DE AGRUPAMENTO
  const usersGrouped = useMemo(() => {
    return users.reduce((acc, user) => {
      const key = (comumId || isLocal) ? (user.comum || 'Minha Localidade') : (user.comum || 'Sem Localidade');
      if (!acc[key]) acc[key] = [];
      acc[key].push(user);
      return acc;
    }, {});
  }, [users, comumId, isLocal]);

  const sortedGroups = Object.keys(usersGrouped).sort();

  const toggleSection = (group) => {
    setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const getNivelLabel = (u) => {
    if (u.isMaster) return "Master / Admin";
    if (u.isComissao) return "Comissão Regional";
    if (u.escopoRegional || u.isRegional) return "Regional";
    if (u.escopoLocal || u.isLocal) return "GEM / Local";
    return "Básico";
  };

  const podeEditarEstePerfil = (u) => {
    if (isMaster) return true;
    if (u.email === userEmail) return false; 
    const permitidas = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    if (isLocal || isRegional) {
      const eBasico = ['MÚSICO', 'ORGANISTAS', 'ORGANISTA', 'INSTRUTOR', 'CANDIDATO'].includes(u.role?.toUpperCase());
      return eBasico && permitidas.includes(u.comumId);
    }
    return false;
  };

  const handleUpdate = async (userId, data) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
      toast.success("Perfil atualizado");
    } catch (e) { toast.error("Acesso Negado"); }
  };

  if (authLoading) return <div className="p-10 text-center animate-pulse text-[10px] font-black uppercase text-slate-400">Carregando Jurisdição...</div>;

  return (
    <div className="space-y-4 text-left font-sans animate-in fade-in duration-500">
      <div className="space-y-3">
        {sortedGroups.map(groupName => {
          const isForcedOpen = comumId || isLocal;
          const isOpen = isForcedOpen ? true : openSections[groupName];
          const groupUsers = usersGrouped[groupName];

          return (
            <div key={groupName} className={`${isForcedOpen ? '' : 'bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-3'}`}>
              {!isForcedOpen && (
                <button onClick={() => toggleSection(groupName)} className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? 'bg-slate-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}><Home size={14} /></div>
                    <div className="text-left leading-none">
                      <h4 className="text-[11px] font-black uppercase italic text-slate-950">{groupName}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">{groupUsers.length} Usuários</p>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className={`${isForcedOpen ? 'space-y-2' : 'p-4 pt-0 space-y-2'}`}>
                      {groupUsers
                        .sort((a, b) => (a.approved === b.approved) ? 0 : a.approved ? 1 : -1)
                        .map(u => (
                        <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all text-left">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[10px] font-black uppercase italic text-slate-950 leading-none">{u.name}</h4>
                              {!u.approved && <span className="text-[6px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded animate-pulse">Pendente</span>}
                              {u.email === userEmail && <span className="text-[6px] font-black text-blue-500 uppercase bg-blue-50 px-1.5 py-0.5 rounded italic">Você</span>}
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{u.role} • {getNivelLabel(u)}</p>
                          </div>
                          <ChevronRight size={12} className="text-slate-200" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left border-t-4 border-blue-600">
              <div className="flex justify-between items-start mb-6">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 italic leading-none">Zeladoria de Acesso</p>
                  <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">{selectedUser.name}</h3>
                  <div className="flex items-center gap-1 mt-2 text-slate-400 text-[9px] font-bold lowercase"><Mail size={10} /> {selectedUser.email}</div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-50 rounded-xl text-slate-300"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div className="leading-tight">
                    <p className="text-[7px] font-black text-blue-400 uppercase mb-1 italic">Nível de Privilégio</p>
                    <p className="text-xs font-black text-blue-900 uppercase italic flex items-center gap-2"><Shield size={12}/> {getNivelLabel(selectedUser)}</p>
                  </div>
                  <Eye size={18} className="text-blue-200" />
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-tight">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1 italic">Cargo / Localidade</p>
                    <p className="text-xs font-black text-slate-950 uppercase italic">{selectedUser.role}</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase italic mt-1">{selectedUser.comum || '---'}</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {podeEditarEstePerfil(selectedUser) ? (
                    <button onClick={() => handleUpdate(selectedUser.id, { approved: !selectedUser.approved })} className={`w-full py-5 rounded-2xl font-[900] text-[10px] uppercase italic transition-all ${selectedUser.approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white shadow-xl'}`}>
                      {selectedUser.approved ? 'Revogar Acesso' : 'Aprovar Cadastro'}
                    </button>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100 shadow-inner leading-tight">
                      <p className="text-[8px] font-black text-amber-600 uppercase italic leading-none">Hierarquia Restrita</p>
                      <p className="text-[7px] font-bold text-amber-400 uppercase mt-2">Alterações permitidas apenas ao nível superior.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ScopeToggle = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all active:scale-95 ${active ? 'bg-amber-500 border-amber-600 text-slate-950 font-black' : 'bg-white/5 border-white/10 text-slate-500 font-bold'}`}>
    <span className="text-[9px] uppercase italic leading-none">{label}</span>
    {active && <ShieldCheck size={14} />}
  </button>
);

export default ModuleAccess;