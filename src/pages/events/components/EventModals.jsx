import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertTriangle, Settings, Trash2, Globe, UserPlus, Check, Search, Clock } from 'lucide-react';
import { db, collection, query, where, onSnapshot } from '../../../config/firebase';

/**
 * Componente que agrupa todos os modais da página de eventos.
 * v2.0 - Adicionado View de Recentes e Carimbagem Rica de Convidados.
 */
const EventModals = ({
  showModal,
  setShowModal,
  newEventDate,
  setNewEventDate,
  responsavel,
  setResponsavel,
  handleCreate,
  showConfigError,
  setShowConfigError,
  isGemLocal,
  isRegionalCidade, // Prop necessária para trava de hierarquia
  userData, // Necessário para filtrar usuários da mesma cidade
  onNavigateToSettings,
  eventToDelete,
  setEventToDelete,
  confirmDelete
}) => {
  // ESTADOS PARA CONTROLE DO ENSAIO REGIONAL
  const [scope, setScope] = useState('local');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [invitedUsers, setInvitedUsers] = useState([]); // Agora armazena objetos completos v2.0
  const [searchTerm, setSearchTerm] = useState('');
  const [recentUsers, setRecentUsers] = useState([]);

  // JUSTIFICATIVA: Carrega os últimos convidados salvos no dispositivo para agilizar a seleção
  useEffect(() => {
    if (showModal && userData?.uid) {
      const saved = localStorage.getItem(`recent_guests_${userData.uid}`);
      if (saved) setRecentUsers(JSON.parse(saved));
    }
  }, [showModal, userData?.uid]);

  // MONITOR DE USUÁRIOS DA CIDADE PARA CONVITES
  useEffect(() => {
    if (!showModal || scope !== 'regional' || !userData?.activeCityId) return;

    const q = query(
      collection(db, 'users'),
      where('cidadeId', '==', userData.activeCityId),
      where('approved', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs
        .map(d => ({ 
          uid: d.id, 
          name: d.data().name, 
          comum: d.data().comum,
          role: d.data().role 
        }))
        .filter(u => u.uid !== userData.uid); // Remove o próprio criador
      setAvailableUsers(users);
    });

    return () => unsub();
  }, [showModal, scope, userData]);

  // Lógica de filtragem em tempo real (Nome ou Comum)
  const filteredUsers = availableUsers.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.comum?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // RESET DE ESTADOS AO FECHAR O MODAL
  const closeModal = () => {
    setShowModal(false);
    setScope('local');
    setInvitedUsers([]);
    setSearchTerm('');
  };

  // JUSTIFICATIVA: Implementação de Carimbagem Rica - salva objeto em vez de apenas ID
  const toggleInvitedUser = (user) => {
    setInvitedUsers(prev => {
      const isAlreadyInvited = prev.find(u => u.uid === user.uid);
      if (isAlreadyInvited) return prev.filter(u => u.uid !== user.uid);
      return [...prev, { uid: user.uid, name: user.name, comum: user.comum }];
    });
  };

  const onConfirmAction = () => {
    // JUSTIFICATIVA: Atualiza a lista de recentes no localStorage antes de criar
    if (invitedUsers.length > 0) {
      const updatedRecents = [...invitedUsers, ...recentUsers]
        .filter((v, i, a) => a.findIndex(t => t.uid === v.uid) === i)
        .slice(0, 5);
      localStorage.setItem(`recent_guests_${userData?.uid}`, JSON.stringify(updatedRecents));
    }

    // Encaminha os novos metadados de escopo para a função de criação global
    handleCreate({
      scope,
      invitedUsers: scope === 'regional' ? invitedUsers : []
    });
    setScope('local');
    setInvitedUsers([]);
    setSearchTerm('');
  };

  return (
    <>
      <AnimatePresence>
        {/* MODAL 1: NOVO REGISTRO (ADAPTADO PARA REGIONAL) */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-left">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative flex flex-col max-h-[90vh] border border-white/20"
            >
              <button onClick={closeModal} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all">
                <X size={18}/>
              </button>
              
              <h3 className="text-xl font-[900] uppercase italic text-slate-950 mb-8 leading-none tracking-tighter">Novo Registro</h3>
              
              <div className="space-y-5 overflow-y-auto no-scrollbar pr-1">
                {/* SELETOR DE ESCOPO - RESTRITO A HIERARQUIA CIDADE/REGIONAL+ */}
                {isRegionalCidade && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[8px] font-black text-blue-600 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
                      <Globe size={10} /> Tipo de Evento
                    </label>
                    <select 
                      value={scope} 
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl py-4 px-4 text-xs font-black outline-none appearance-none italic uppercase shadow-sm"
                    >
                      <option value="local">Ensaio Local (Comum)</option>
                      <option value="regional">Ensaio Regional (Cidade)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Data Agendada</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-base font-black outline-none" 
                    value={newEventDate} 
                    onChange={e => setNewEventDate(e.target.value)} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Responsável / Encarregado</label>
                  <input 
                    type="text" 
                    placeholder="Nome completo" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-base font-black outline-none uppercase placeholder:text-slate-300 shadow-inner" 
                    value={responsavel} 
                    onChange={e => setResponsavel(e.target.value)} 
                  />
                </div>

                {/* WHITELIST DE CONVIDADOS - EXCLUSIVO PARA MODO REGIONAL */}
                <AnimatePresence>
                  {scope === 'regional' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 pt-4 border-t border-slate-100 overflow-hidden"
                    >
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
                        <UserPlus size={10} /> Convidados da Cidade
                      </label>

                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                        <input 
                          type="text"
                          placeholder="PESQUISAR POR NOME OU LOCALIDADE..."
                          className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-9 pr-4 text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-blue-200 transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                        {/* VIEW DE RECENTES */}
                        {searchTerm === '' && recentUsers.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[7px] font-black text-blue-500 uppercase mb-2 ml-1 flex items-center gap-1">
                              <Clock size={8} /> Seleção Recente
                            </p>
                            {recentUsers.map(u => (
                              <button 
                                key={`recent-${u.uid}`} 
                                onClick={() => toggleInvitedUser(u)}
                                className={`w-full p-3 rounded-xl border flex items-center justify-between mb-1 transition-all ${invitedUsers.find(i => i.uid === u.uid) ? 'bg-slate-950 border-slate-900 text-white shadow-md' : 'bg-blue-50/50 border-blue-100 text-slate-500'}`}
                              >
                                <div className="text-left leading-none">
                                  <p className="text-[10px] font-black uppercase italic">{u.name}</p>
                                  <p className="text-[6px] font-bold uppercase mt-1 opacity-60">{u.comum}</p>
                                </div>
                                {invitedUsers.find(i => i.uid === u.uid) && <Check size={14} className="text-amber-500" />}
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredUsers.length === 0 && searchTerm !== '' ? (
                          <p className="text-[9px] font-bold text-slate-300 uppercase italic p-4 text-center">Nenhum resultado encontrado</p>
                        ) : filteredUsers.map(user => (
                          <button 
                            key={user.uid} 
                            onClick={() => toggleInvitedUser(user)}
                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${invitedUsers.find(i => i.uid === user.uid) ? 'bg-slate-950 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}
                          >
                            <div className="text-left leading-none">
                              <p className="text-[10px] font-black uppercase italic">{user.name}</p>
                              <p className={`text-[7px] font-bold uppercase mt-1 ${invitedUsers.find(i => i.uid === user.uid) ? 'text-blue-400' : 'text-slate-300'}`}>{user.role} • {user.comum}</p>
                            </div>
                            {invitedUsers.find(i => i.uid === user.uid) && <Check size={14} className="text-amber-500" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={onConfirmAction} 
                className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 active:scale-95 shadow-xl mt-8 transition-all border border-white/10 shrink-0"
              >
                <Send size={16}/> Confirmar Agenda
              </button>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: ORQUESTRA AUSENTE (ERRO DE CONFIGURAÇÃO) */}
        {showConfigError && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[320px] rounded-[3rem] p-10 shadow-2xl relative border border-slate-100"
            >
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-4 tracking-tighter leading-none">Orquestra Ausente</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-10">Esta localidade ainda não possui uma orquestra configurada. É necessário definir os instrumentos antes de agendar ensaios.</p>
              
              <div className="space-y-3">
                {isGemLocal && (
                  <button 
                    onClick={() => { setShowConfigError(false); onNavigateToSettings(); }} 
                    className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-3"
                  >
                    <Settings size={16} /> Configurar Agora
                  </button>
                )}
                <button onClick={() => setShowConfigError(false)} className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest">Entendido</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO */}
        {eventToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-[900] uppercase italic text-slate-950 tracking-tighter leading-tight">Remover Agenda?</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-8 leading-relaxed">Todos os dados e contagens deste ensaio serão permanentemente excluídos da jurisdição.</p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete} 
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-100"
                >
                  Sim, Remover Agora
                </button>
                <button 
                  onClick={() => setEventToDelete(null)} 
                  className="w-full py-3 font-black uppercase text-[9px] text-slate-300 tracking-widest"
                >
                  Manter Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EventModals;