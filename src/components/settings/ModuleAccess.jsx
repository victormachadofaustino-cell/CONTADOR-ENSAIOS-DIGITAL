import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, query, where } from '../../firebase';
import toast from 'react-hot-toast';
import { Lock, UserPlus, Fingerprint, Globe, Map, Home, ShieldCheck, X, ChevronRight, ShieldAlert, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ModuleAccess = ({ isMaster, userEmail, userData, cargos }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [listaCidades, setListaCidades] = useState([]);
  const [listaComuns, setListaComuns] = useState([]);

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  useEffect(() => {
    const qC = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    const unsubC = onSnapshot(qC, (s) => setListaCidades(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qUsers = query(collection(db, 'users'), where('regionalId', '==', activeRegionalId));
    const unsubUsers = onSnapshot(qUsers, (s) => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubC(); unsubUsers(); };
  }, [activeRegionalId]);

  useEffect(() => {
    if (!selectedUser?.cidadeId) return;
    const qCom = query(collection(db, 'config_comum'), where('cidadeId', '==', selectedUser.cidadeId));
    const unsubCom = onSnapshot(qCom, (s) => setListaComuns(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubCom();
  }, [selectedUser?.cidadeId]);

  // --- LÓGICA DE COMANDO (HIERARQUIA ESTRITA) ---
  const podeEditarEstePerfil = (u) => {
    // 1. Master edita tudo de todos
    if (isMaster) return true;

    // 2. Regional edita o seu, todos da Cidade e todos do GEM
    if (userData?.escopoRegional) {
      if (u.email === userEmail) return true; // O seu próprio
      if (!u.isMaster && !u.escopoRegional) return true; // Abaixo dele
    }

    // 3. Cidade edita o seu e todos do GEM
    if (userData?.escopoCidade) {
      if (u.email === userEmail) return true; // O seu próprio
      if (!u.isMaster && !u.escopoRegional && !u.escopoCidade) return true; // Apenas GEM
    }

    // 4. GEM edita apenas o seu
    if (userData?.escopoLocal) {
      if (u.email === userEmail) return true;
    }

    return false;
  };

  const handleUpdate = async (userId, data) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, ...data }));
      toast.success("Atualizado!");
    } catch (e) { toast.error("Erro na atualização"); }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      <div className="space-y-3">
        {users
          .sort((a, b) => (a.approved === b.approved) ? 0 : a.approved ? 1 : -1) 
          .map(u => (
          <button 
            key={u.id} 
            onClick={() => setSelectedUser(u)}
            className={`w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all ${u.disabled ? 'opacity-50 grayscale' : ''}`}
          >
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-2">
                <h4 className="text-[11px] font-black uppercase italic text-slate-950">{u.name || 'Sem Nome'}</h4>
                {u.approved ? 
                  <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span> : 
                  <span className="text-[7px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md animate-bounce">Pendente</span>
                }
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase italic leading-none">
                {u.role || 'Usuário'} • {u.comum || 'Localidade não definida'}
              </p>
            </div>
            <ChevronRight size={14} className="text-slate-200" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl overflow-hidden text-left border-t-4 border-blue-600">
              
              <div className="flex justify-between items-start mb-6">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Gestão de Identidade</p>
                  <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter">{selectedUser.name}</h3>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-50 rounded-xl text-slate-300"><X size={20}/></button>
              </div>

              <div className="space-y-5 max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
                
                {/* EDIÇÃO DE NOME */}
                <div className="space-y-1">
                  <p className="text-[7px] font-black text-slate-400 uppercase italic ml-1">Nome Completo</p>
                  <div className="relative flex items-center">
                    <User size={12} className="absolute left-4 text-slate-400" />
                    <input 
                      disabled={!podeEditarEstePerfil(selectedUser)}
                      className="w-full bg-slate-50 p-4 pl-10 rounded-2xl font-black text-slate-950 text-xs border border-transparent outline-none uppercase shadow-inner italic" 
                      value={selectedUser.name || ''} 
                      onChange={(e) => handleUpdate(selectedUser.id, { name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[7px] font-black text-slate-400 uppercase italic ml-1">Função / Cargo</p>
                  <select 
                    disabled={!podeEditarEstePerfil(selectedUser)}
                    className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-xs outline-none uppercase shadow-inner appearance-none italic" 
                    value={selectedUser.role || ''} 
                    onChange={(e) => handleUpdate(selectedUser.id, { role: e.target.value })}
                  >
                    <option value="">Indefinido</option>
                    {cargos?.map((c, index) => (
                      <option key={index} value={typeof c === 'object' ? c.cargo : c}>{typeof c === 'object' ? c.cargo : c}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 p-5 rounded-[2.5rem] space-y-4 border border-slate-100">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Vínculo de Localidade</p>
                  
                  <div className="flex items-center gap-3 px-1 opacity-60">
                    <Globe size={14} className="text-slate-400" />
                    <div>
                      <p className="text-[6px] font-black text-slate-400 uppercase">Regional (Origem)</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase italic">{userData?.activeRegionalName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Map size={14} className="text-blue-600" />
                    <div className="flex-1">
                      <p className="text-[6px] font-black text-slate-400 uppercase">Cidade</p>
                      <select 
                        disabled={!podeEditarEstePerfil(selectedUser) || (userData?.escopoCidade && !isMaster)}
                        value={selectedUser.cidadeId || ''}
                        onChange={(e) => handleUpdate(selectedUser.id, { cidadeId: e.target.value, comumId: '' })}
                        className="w-full bg-transparent font-black text-slate-950 text-[10px] uppercase outline-none italic appearance-none"
                      >
                        <option value="">Selecionar Cidade...</option>
                        {listaCidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Home size={14} className="text-blue-600" />
                    <div className="flex-1">
                      <p className="text-[6px] font-black text-slate-400 uppercase">Comum / Localidade</p>
                      <select 
                        disabled={!podeEditarEstePerfil(selectedUser)}
                        value={selectedUser.comumId || ''}
                        onChange={(e) => {
                          const nome = e.target.options[e.target.selectedIndex].text;
                          handleUpdate(selectedUser.id, { comumId: e.target.value, comum: nome });
                        }}
                        className="w-full bg-transparent font-black text-slate-950 text-[10px] uppercase outline-none italic appearance-none"
                      >
                        <option value="">Selecionar Comum...</option>
                        {listaComuns.map(c => (
                          <option key={c.id} value={c.id}>{c.comum || c.bairro || c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {isMaster && (
                  <div className="bg-slate-950 p-5 rounded-[2.5rem] space-y-3">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                      <ShieldAlert size={10}/> Jurisdição de Comando
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <ScopeToggle label="Gestão Regional" active={selectedUser.escopoRegional} icon={<Globe size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoRegional: !selectedUser.escopoRegional })} />
                      <ScopeToggle label="Gestão Cidade" active={selectedUser.escopoCidade} icon={<Map size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoCidade: !selectedUser.escopoCidade })} />
                      <ScopeToggle label="Gestão GEM / Local" active={selectedUser.escopoLocal} icon={<Home size={12}/>} onClick={() => handleUpdate(selectedUser.id, { escopoLocal: !selectedUser.escopoLocal })} />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {podeEditarEstePerfil(selectedUser) ? (
                    <>
                      <button 
                        onClick={() => handleUpdate(selectedUser.id, { approved: !selectedUser.approved })}
                        className={`w-full py-5 rounded-2xl font-[900] text-[10px] uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all ${selectedUser.approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white shadow-xl'}`}
                      >
                        {selectedUser.approved ? 'Revogar Acesso' : 'Aprovar Acesso'}
                      </button>

                      <div className="flex gap-2">
                        {isMaster && (
                          <button 
                            onClick={() => handleUpdate(selectedUser.id, { isMaster: !selectedUser.isMaster })}
                            className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase italic transition-all ${selectedUser.isMaster ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}
                          >
                            Tornar Master
                          </button>
                        )}
                        <button 
                          onClick={() => { if(confirm(`Confirmar bloqueio?`)) handleUpdate(selectedUser.id, { disabled: !selectedUser.disabled, approved: false }); }}
                          className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase italic transition-all ${selectedUser.disabled ? 'bg-red-600 text-white' : 'bg-red-50 text-red-400 border border-red-100'}`}
                        >
                          {selectedUser.disabled ? 'Desbloquear' : 'Inativar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100">
                      <p className="text-[8px] font-black text-amber-600 uppercase italic leading-none">Hierarquia Restrita</p>
                      <p className="text-[7px] font-bold text-amber-400 uppercase mt-2">Você não tem permissão para alterar este perfil.</p>
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