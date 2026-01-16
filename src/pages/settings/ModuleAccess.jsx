import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, query, where } from '../../config/firebase';
import toast from 'react-hot-toast';
import { ShieldCheck, Globe, Map, Home, X, ChevronRight, User, ShieldAlert, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ModuleAccess = ({ isMaster, userEmail, userData, cargos }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openSections, setOpenSections] = useState({}); // Controle do Accordion

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. MONITOR DE USUÁRIOS COM FILTRAGEM DE ZELADORIA
  useEffect(() => {
    if (!activeRegionalId) return;
    let isMounted = true;

    const qUsers = query(collection(db, 'users'), where('regionalId', '==', activeRegionalId));
    const unsubUsers = onSnapshot(qUsers, (s) => {
      if (!isMounted) return;
      const allUsers = s.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const filtrados = allUsers.filter(u => {
        if (isMaster || userData?.escopoRegional || userData?.role === 'Encarregado Regional') return true; 
        if (userData?.escopoCidade) return u.cidadeId === userData.cidadeId; 
        if (userData?.escopoLocal) return u.comumId === userData.comumId;
        return u.email === userEmail; 
      });

      setUsers(filtrados);
    });

    return () => { isMounted = false; unsubUsers(); };
  }, [activeRegionalId, isMaster, userData, userEmail]);

  // 2. LÓGICA DE AGRUPAMENTO POR COMUM
  const usersGrouped = users.reduce((acc, user) => {
    const key = user.comum || 'Sem Localidade';
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {});

  const sortedGroups = Object.keys(usersGrouped).sort();

  const toggleSection = (group) => {
    setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // 3. LÓGICA DE COMANDO (HIERARQUIA ESTRITA DE APROVAÇÃO)
  const podeEditarEstePerfil = (u) => {
    if (isMaster) return true;
    if (u.email === userEmail) return false; 

    if (userData?.escopoLocal && !userData?.escopoCidade && !userData?.isComissao) {
      const eBasico = u.role === 'Músico' || u.role === 'Organista' || u.role === 'Instrutor' || u.role === 'Candidato';
      return eBasico && u.comumId === userData.comumId && !u.escopoLocal && !u.escopoCidade;
    }

    if (userData?.escopoCidade && !userData?.isComissao) {
      return u.escopoLocal === true && u.cidadeId === userData.cidadeId && !u.escopoCidade;
    }

    if (userData?.isComissao || userData?.role === 'Encarregado Regional') {
      return (u.escopoCidade === true || u.escopoLocal === true) && !u.isComissao;
    }

    return false;
  };

  const handleUpdate = async (userId, data) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, ...data }));
      toast.success("Perfil atualizado");
    } catch (e) { toast.error("Erro na sincronização"); }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      <div className="space-y-3">
        {sortedGroups.map(groupName => {
          const isOpen = openSections[groupName];
          const groupUsers = usersGrouped[groupName];
          const pendingInGroup = groupUsers.filter(u => !u.approved).length;

          return (
            <div key={groupName} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
              {/* HEADER DO ACCORDION */}
              <button 
                onClick={() => toggleSection(groupName)}
                className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? 'bg-slate-50/50' : 'bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl transition-all ${isOpen ? 'bg-blue-600 text-white shadow-lg rotate-3' : 'bg-slate-50 text-slate-400'}`}>
                    <Home size={14} />
                  </div>
                  <div className="text-left leading-none">
                    <h4 className="text-[11px] font-black uppercase italic text-slate-950 tracking-tight">{groupName}</h4>
                    <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                      {groupUsers.length} Usuários {pendingInGroup > 0 && `• ${pendingInGroup} pendentes`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pendingInGroup > 0 && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                  <ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* CONTEÚDO DO ACCORDION */}
              <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-4 pt-0 space-y-2">
                  {groupUsers
                    .sort((a, b) => (a.approved === b.approved) ? 0 : a.approved ? 1 : -1)
                    .map(u => (
                    <button 
                      key={u.id} 
                      onClick={() => setSelectedUser(u)}
                      className={`w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all ${u.disabled ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[10px] font-black uppercase italic text-slate-950 leading-none">{u.name || 'Sem Nome'}</h4>
                          {u.approved ? 
                            <span className="text-[6px] font-black text-emerald-500 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-emerald-50">Ativo</span> : 
                            <span className="text-[6px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded animate-pulse">Pendente</span>
                          }
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase italic leading-none">
                          {u.role}
                        </p>
                      </div>
                      <ChevronRight size={12} className="text-slate-200" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="py-10 text-center opacity-20">
            <User className="mx-auto mb-2" size={32} />
            <p className="text-[8px] font-black uppercase tracking-widest">Nenhum subordinado direto</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl overflow-hidden text-left border-t-4 border-blue-600">
              
              <div className="flex justify-between items-start mb-6">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Zeladoria de Acesso</p>
                  <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">{selectedUser.name}</h3>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-50 rounded-xl text-slate-300"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1 italic">Cargo Pretendido</p>
                    <p className="text-xs font-black text-slate-950 uppercase italic leading-none">{selectedUser.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1 italic text-right">Localidade</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase italic leading-none">{selectedUser.comum || '---'}</p>
                  </div>
                </div>

                {isMaster && (
                  <div className="bg-slate-950 p-5 rounded-[2.5rem] space-y-3">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                      <ShieldAlert size={10}/> Atribuição de Poder (Master)
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <ScopeToggle label="Membro da Comissão" active={selectedUser.isComissao} icon={<ShieldCheck size={12}/>} onClick={() => handleUpdate(selectedUser.id, { isComissao: !selectedUser.isComissao })} />
                      <ScopeToggle label="Gestão Regional" active={selectedUser.escopoRegional} icon={<Globe size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoRegional: !selectedUser.escopoRegional })} />
                      <ScopeToggle label="Gestão Cidade" active={selectedUser.escopoCidade} icon={<Map size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoCidade: !selectedUser.escopoCidade })} />
                      <ScopeToggle label="Gestão Local / GEM" active={selectedUser.escopoLocal} icon={<Home size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoLocal: !selectedUser.escopoLocal })} />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {podeEditarEstePerfil(selectedUser) ? (
                    <>
                      <button 
                        onClick={() => handleUpdate(selectedUser.id, { approved: !selectedUser.approved })}
                        className={`w-full py-5 rounded-2xl font-[900] text-[10px] uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all ${selectedUser.approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white shadow-xl'}`}
                      >
                        {selectedUser.approved ? 'Revogar Acesso' : 'Aprovar Cadastro'}
                      </button>
                      <button 
                        onClick={() => { if(confirm(`Confirmar bloqueio definitivo?`)) handleUpdate(selectedUser.id, { disabled: !selectedUser.disabled, approved: false }); }}
                        className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase italic transition-all ${selectedUser.disabled ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-400 border border-red-100'}`}
                      >
                        {selectedUser.disabled ? 'Desbloquear Usuário' : 'Inativar Usuário'}
                      </button>
                    </>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100">
                      <p className="text-[8px] font-black text-amber-600 uppercase italic leading-none">Hierarquia Restrita</p>
                      <p className="text-[7px] font-bold text-amber-400 uppercase mt-2">Este perfil requer aprovação de um nível superior ou master.</p>
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

const ScopeToggle = ({ label, active, onClick, icon }) => (
  <button onClick={onClick} className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all ${active ? 'bg-amber-500 border-amber-600 text-slate-950 font-black' : 'bg-white/5 border-white/10 text-slate-500 font-bold'}`}>
    <div className="flex items-center gap-3">{icon} <span className="text-[9px] uppercase italic leading-none">{label}</span></div>
    {active && <ShieldCheck size={14} />}
  </button>
);

export default ModuleAccess;