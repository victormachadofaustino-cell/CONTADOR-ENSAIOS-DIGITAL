import React, { useState, useEffect } from 'react';
// CORREÇÃO: Certificando o uso correto das ferramentas do Firebase
import { db, collection, onSnapshot, doc, updateDoc, query, where, getDocs } from '../../config/firebase';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, Globe, Map, Home, X, ChevronRight, 
  User, ShieldAlert, ChevronDown, Mail, CheckSquare, 
  Square, Shield, Save 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Importação do Cérebro de Autenticação para validar jurisdição
import { useAuth } from '../../context/AuthContext';

const ModuleAccess = ({ comumId, cargos }) => {
  // EXTRAÇÃO DE PODERES
  const { userData, user } = useAuth();
  const userEmail = user?.email;
  const isMaster = userData?.isMaster;
  const isRegional = userData?.isRegional;

  const [users, setUsers] = useState([]);
  const [comunsDaRegional, setComunsDaRegional] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openSections, setOpenSections] = useState({}); 

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. MONITOR DE USUÁRIOS COM FILTRO DE CONTEXTO (A chave da correção está aqui)
  useEffect(() => {
    if (!activeRegionalId) return;
    let isMounted = true;

    // LÓGICA DE QUERY ATÔMICA:
    // Se o componente recebeu um comumId (estamos dentro da gestão de uma igreja), 
    // a query DEVE ser restrita a essa igreja. Se não, traz a regional.
    const qBase = collection(db, 'users');
    let constraints = [where('regionalId', '==', activeRegionalId)];
    
    if (comumId) {
      constraints = [where('comumId', '==', comumId)];
    }

    const qUsers = query(qBase, ...constraints);
    
    const unsubUsers = onSnapshot(qUsers, (s) => {
      if (!isMounted) return;
      const allUsers = s.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // FILTRO DE SEGURANÇA (O Regional só vê quem ele tem permissão)
      const permitidas = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
      
      const filtrados = allUsers.filter(u => {
        if (isMaster || userData?.isComissao) return true; 
        
        // Se estivermos em uma comum específica, checa se o Regional tem acesso a ela
        if (comumId) return permitidas.includes(comumId);

        // Na visão geral, filtra para mostrar apenas as igrejas da jurisdição dele
        return permitidas.includes(u.comumId) || u.email === userEmail;
      });

      setUsers(filtrados);
    });

    const qComuns = query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId));
    const unsubComuns = onSnapshot(qComuns, (s) => {
      if (isMounted) setComunsDaRegional(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { isMounted = false; unsubUsers(); unsubComuns(); };
  }, [activeRegionalId, comumId, isMaster, userData]);

  // 2. LÓGICA DE AGRUPAMENTO (Corrigida para não duplicar usuários)
  const usersGrouped = users.reduce((acc, user) => {
    // Se estivermos dentro de uma comum específica, agrupamos tudo sob o nome dela
    // Caso contrário, agrupamos pelo campo 'comum' do usuário
    const key = comumId ? (user.comum || 'Esta Localidade') : (user.comum || 'Sem Localidade');
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {});

  const sortedGroups = Object.keys(usersGrouped).sort();

  const toggleSection = (group) => {
    setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // 3. LÓGICA DE COMANDO
  const podeEditarEstePerfil = (u) => {
    if (isMaster) return true;
    if (u.email === userEmail) return false; 

    const permitidas = [userData?.comumId, ...(userData?.acessosPermitidos || [])];

    if (userData?.escopoLocal || isRegional) {
      const eBasico = ['MÚSICO', 'ORGANISTA', 'INSTRUTOR', 'CANDIDATO'].includes(u.role?.toUpperCase());
      // Só edita se for cargo de base E pertencer a uma comum da jurisdição dele
      return eBasico && permitidas.includes(u.comumId);
    }

    if (userData?.isComissao || userData?.role === 'Encarregado Regional') {
      return !u.isMaster && !u.isComissao;
    }

    return false;
  };

  const handleUpdate = async (userId, data) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, ...data }));
      toast.success("Perfil atualizado");
    } catch (e) { 
      toast.error("Acesso Negado"); 
    }
  };

  const toggleAdjacencia = async (comum) => {
    const listaAtual = selectedUser.acessosPermitidos || [];
    const jaTem = listaAtual.includes(comum.id);
    const novaLista = jaTem ? listaAtual.filter(id => id !== comum.id) : [...listaAtual, comum.id];
    await handleUpdate(selectedUser.id, { acessosPermitidos: novaLista });
  };

  return (
    <div className="space-y-4 text-left font-sans animate-in fade-in duration-500">
      <div className="space-y-3">
        {sortedGroups.map(groupName => {
          // Se houver um comumId, forçamos o accordion a ficar aberto e removemos o header repetitivo
          const isOpen = comumId ? true : openSections[groupName];
          const groupUsers = usersGrouped[groupName];
          const pendingInGroup = groupUsers.filter(u => !u.approved).length;

          return (
            <div key={groupName} className={`${comumId ? '' : 'bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-3'}`}>
              {!comumId && (
                <button 
                  onClick={() => toggleSection(groupName)}
                  className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? 'bg-slate-50/50' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                      <Home size={14} />
                    </div>
                    <div className="text-left leading-none">
                      <h4 className="text-[11px] font-black uppercase italic text-slate-950">{groupName}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">
                        {groupUsers.length} Usuários {pendingInGroup > 0 && `• ${pendingInGroup} pendentes`}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className={`${comumId ? 'space-y-2' : 'p-4 pt-0 space-y-2'}`}>
                      {groupUsers
                        .sort((a, b) => (a.approved === b.approved) ? 0 : a.approved ? 1 : -1)
                        .map(u => (
                        <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all">
                          <div className="flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[10px] font-black uppercase italic text-slate-950 leading-none">{u.name}</h4>
                              {!u.approved && <span className="text-[6px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded animate-pulse">Pendente</span>}
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{u.role}</p>
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

        {users.length === 0 && (
          <div className="py-10 text-center opacity-20">
            <User className="mx-auto mb-2" size={32} />
            <p className="text-[8px] font-black uppercase tracking-widest">Nenhum usuário nesta comum</p>
          </div>
        )}
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
                  <div className="flex items-center gap-1 mt-2 text-slate-400">
                    <Mail size={10} />
                    <span className="text-[9px] font-bold lowercase">{selectedUser.email}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-50 rounded-xl text-slate-300"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1 italic">Cargo / Localidade</p>
                    <p className="text-xs font-black text-slate-950 uppercase italic">{selectedUser.role}</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase italic mt-1">{selectedUser.comum || '---'}</p>
                </div>

                {isMaster && (
                  <div className="bg-slate-950 p-5 rounded-[2.5rem] space-y-3 shadow-xl">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                      <ShieldAlert size={10}/> Atribuição de Poder (Master)
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <ScopeToggle label="Membro da Comissão" active={selectedUser.isComissao} icon={<ShieldCheck size={12}/>} onClick={() => handleUpdate(selectedUser.id, { isComissao: !selectedUser.isComissao })} />
                      <ScopeToggle label="Gestão Regional" active={selectedUser.escopoRegional} icon={<Globe size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoRegional: !selectedUser.escopoRegional, isRegional: !selectedUser.escopoRegional })} />
                      <ScopeToggle label="Gestão Local / GEM" active={selectedUser.escopoLocal} icon={<Home size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoLocal: !selectedUser.escopoLocal, isLocal: !selectedUser.escopoLocal })} />
                      
                      <div className="pt-2 border-t border-white/10">
                        <button 
                          onClick={() => { if(confirm("CUIDADO: Promover a Master?")) handleUpdate(selectedUser.id, { isMaster: !selectedUser.isMaster })}}
                          className={`w-full p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${selectedUser.isMaster ? 'bg-red-600 border-red-500 text-white' : 'border-white/10 text-white/20'}`}
                        >
                          <Shield size={12}/> <span className="text-[9px] uppercase italic">Promover a Master</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isMaster && selectedUser.escopoRegional && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Jurisdição Customizada</p>
                    <div className="bg-slate-50 p-2 rounded-[2rem] border border-slate-100 max-h-48 overflow-y-auto no-scrollbar">
                      {comunsDaRegional.map(comum => (
                        <button 
                          key={comum.id} 
                          onClick={() => toggleAdjacencia(comum)}
                          className="w-full p-3 flex justify-between items-center hover:bg-white rounded-xl transition-colors"
                        >
                          <span className="text-[10px] font-black uppercase italic text-slate-600">{comum.comum}</span>
                          {(selectedUser.acessosPermitidos || []).includes(comum.id) ? 
                            <CheckSquare size={14} className="text-blue-600" /> : 
                            <Square size={14} className="text-slate-200" />
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {podeEditarEstePerfil(selectedUser) ? (
                    <>
                      <button 
                        onClick={() => handleUpdate(selectedUser.id, { approved: !selectedUser.approved })}
                        className={`w-full py-5 rounded-2xl font-[900] text-[10px] uppercase italic transition-all ${selectedUser.approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white shadow-xl'}`}
                      >
                        {selectedUser.approved ? 'Revogar Acesso' : 'Aprovar Cadastro'}
                      </button>
                      <button 
                        onClick={() => { if(confirm(`Confirmar bloqueio?`)) handleUpdate(selectedUser.id, { disabled: !selectedUser.disabled, approved: false }); }}
                        className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase italic transition-all ${selectedUser.disabled ? 'bg-red-600 text-white' : 'bg-red-50 text-red-400 border border-red-100'}`}
                      >
                        {selectedUser.disabled ? 'Desbloquear Usuário' : 'Inativar Usuário'}
                      </button>
                    </>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100 shadow-inner">
                      <p className="text-[8px] font-black text-amber-600 uppercase italic leading-none">Hierarquia Restrita</p>
                      <p className="text-[7px] font-bold text-amber-400 uppercase mt-2 leading-relaxed">Aprovação requer nível superior.</p>
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
  <button onClick={onClick} className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all active:scale-95 ${active ? 'bg-amber-500 border-amber-600 text-slate-950 font-black' : 'bg-white/5 border-white/10 text-slate-500 font-bold'}`}>
    <div className="flex items-center gap-3">{icon} <span className="text-[9px] uppercase italic leading-none">{label}</span></div>
    {active && <ShieldCheck size={14} />}
  </button>
);

export default ModuleAccess;