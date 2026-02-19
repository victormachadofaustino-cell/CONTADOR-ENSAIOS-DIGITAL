import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, where } from '../../../config/firebase';
import { eventService } from '../../../services/eventService';
import { UserPlus, UserMinus, Search, Clock, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/**
 * Painel de Gestão de Colaboradores (Convidados)
 * v2.6 - Feedback visual "Na Equipe" e correção de exibição híbrida.
 */
const GuestManager = ({ eventId, invitedUsers, userData, isClosed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allRegionalUsers, setAllRegionalUsers] = useState([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);

  // JUSTIFICATIVA: Carrega os ajudantes frequentes do dispositivo local
  useEffect(() => {
    if (isSelectorOpen && userData?.uid) {
      const saved = localStorage.getItem(`recent_guests_${userData.uid}`);
      if (saved) {
        try {
          setRecentUsers(JSON.parse(saved));
        } catch (e) {
          setRecentUsers([]);
        }
      }
    }
  }, [isSelectorOpen, userData?.uid]);

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. MONITOR DE USUÁRIOS REGIONAIS
  useEffect(() => {
    if (!activeRegionalId) return;

    const q = query(
      collection(db, 'users'),
      where('regionalId', '==', activeRegionalId),
      where('approved', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs
        .map(d => ({ 
          uid: d.id, 
          name: d.data().name, 
          comum: d.data().comum || d.data().comumNome || "Não informada",
          role: d.data().role 
        }))
        .filter(u => u.uid !== userData.uid); 
      setAllRegionalUsers(users);
    }, (err) => {
      console.error("Erro ao carregar banco de colaboradores:", err);
    });

    return () => unsub();
  }, [activeRegionalId, userData.uid]);

  // JUSTIFICATIVA: Lógica de compatibilidade para converter IDs antigos em objetos legíveis na tela.
  // Garante que Osvaldo e Jonas apareçam na listagem mesmo se o dado no banco for apenas uma string.
  const guestsInfo = useMemo(() => {
    if (!invitedUsers || !Array.isArray(invitedUsers)) return [];
    
    return invitedUsers.map(guest => {
      // Se já for objeto (novo padrão v7.0), retorna direto
      if (typeof guest === 'object' && guest.uid) return guest;
      
      // Se for string (padrão antigo), busca os dados na lista regional para "reidratar" o objeto
      const found = allRegionalUsers.find(u => u.uid === guest);
      if (found) return { uid: found.uid, name: found.name, comum: found.comum };
      
      // Fallback visual para evitar buracos na lista enquanto os dados carregam
      return { uid: guest, name: "Sincronizando...", comum: "Jurisdição" };
    });
  }, [invitedUsers, allRegionalUsers]);

  // JUSTIFICATIVA: Trava de segurança total para impedir duplicidade no banco e na UI
  const checkAlreadyInvited = (userId) => {
    if (!invitedUsers || !Array.isArray(invitedUsers)) return false;
    return invitedUsers.some(i => (typeof i === 'object' ? i.uid : i) === userId);
  };

  const handleAdd = async (user) => {
    try {
      const updatedRecents = [user, ...recentUsers]
        .filter((v, i, a) => a.findIndex(t => t.uid === v.uid) === i)
        .slice(0, 5);
      localStorage.setItem(`recent_guests_${userData?.uid}`, JSON.stringify(updatedRecents));

      await eventService.addGuest(eventId, user);
      toast.success("Colaborador adicionado");
    } catch (e) {
      toast.error("Erro ao adicionar");
    }
  };

  const handleRemove = async (user) => {
    try {
      await eventService.removeGuest(eventId, user);
      toast.success("Acesso revogado");
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-1 gap-2">
        {guestsInfo.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase italic leading-tight">
              Aguardando colaboradores <br/> convidados para este ensaio.
            </p>
          </div>
        ) : (
          guestsInfo.map(guest => (
            <div key={guest.uid} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-black italic">
                  {guest.name?.charAt(0)}
                </div>
                <div className="leading-tight">
                  <h4 className="text-[10px] font-black text-slate-950 uppercase italic leading-none">{guest.name}</h4>
                  <p className="text-[7px] font-bold text-blue-600 uppercase tracking-widest mt-1">{guest.comum}</p>
                </div>
              </div>
              {!isClosed && (
                <button onClick={() => handleRemove(guest)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors active:scale-90">
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {!isClosed && (
        <button 
          onClick={() => setIsSelectorOpen(true)}
          className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase italic flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all border border-white/5"
        >
          <UserPlus size={16} /> Convidar Colaborador
        </button>
      )}

      <AnimatePresence>
        {isSelectorOpen && (
          <div className="fixed inset-0 z-[600] flex items-end justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#F1F5F9] w-full max-w-sm rounded-t-[3rem] p-8 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">Buscar Equipe</h3>
                <button onClick={() => setIsSelectorOpen(false)} className="p-2 bg-white rounded-full text-slate-300 shadow-sm active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  autoFocus
                  placeholder="NOME OU LOCALIDADE..."
                  className="w-full bg-white p-4 pl-12 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-200 uppercase italic shadow-inner focus:border-blue-300 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pb-6">
                {/* VIEW DE RECENTES */}
                {searchTerm === '' && recentUsers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[7px] font-black text-blue-500 uppercase mb-2 ml-1 flex items-center gap-1">
                      <Clock size={8} /> Seleção Recente
                    </p>
                    {recentUsers.map(u => {
                      const invited = checkAlreadyInvited(u.uid);
                      return (
                        <div key={`recent-${u.uid}`} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center shadow-sm mb-2">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-blue-400" />
                            <div className="text-left leading-none">
                              <h4 className="text-[10px] font-black text-slate-950 uppercase leading-none">{u.name}</h4>
                              <p className="text-[7px] font-bold text-slate-400 uppercase italic mt-1">{u.comum}</p>
                            </div>
                          </div>
                          <button 
                            disabled={invited}
                            onClick={() => handleAdd(u)} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all shadow-sm ${invited ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-white text-blue-600 border border-blue-100 active:scale-90'}`}
                          >
                            {invited ? <ShieldCheck size={18} strokeWidth={3}/> : <UserPlus size={18} strokeWidth={3}/>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {allRegionalUsers
                  .filter(u => 
                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    u.comum.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(u => {
                    const invited = checkAlreadyInvited(u.uid);
                    return (
                      <div key={u.uid} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <div className="text-left leading-none">
                          <h4 className="text-[10px] font-black text-slate-950 uppercase leading-none">{u.name}</h4>
                          <p className="text-[7px] font-bold text-slate-400 uppercase italic mt-1 tracking-tighter">{u.comum}</p>
                        </div>
                        <button 
                          disabled={invited}
                          onClick={() => handleAdd(u)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${invited ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100 active:scale-90'}`}
                        >
                          {invited ? (
                            <>
                              <span className="text-[7px] font-black uppercase tracking-widest">Na Equipe</span>
                              <ShieldCheck size={16} strokeWidth={3} />
                            </>
                          ) : (
                            <>
                              <span className="text-[7px] font-black uppercase tracking-widest">Convidar</span>
                              <UserPlus size={16} strokeWidth={3} />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuestManager;