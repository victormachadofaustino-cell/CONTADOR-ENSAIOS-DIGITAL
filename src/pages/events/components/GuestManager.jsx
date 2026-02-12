import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where } from '../../../config/firebase';
import { eventService } from '../../../services/eventService';
import { UserPlus, UserMinus, Search, Users, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/**
 * Painel de Gestão de Colaboradores (Convidados)
 * v1.1 - Sincronização Automática de Whitelist e Monitoramento Regional
 */
const GuestManager = ({ eventId, invitedUsersIds, userData, isClosed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allRegionalUsers, setAllRegionalUsers] = useState([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. MONITOR DE USUÁRIOS REGIONAIS: Busca constante para garantir exibição imediata da equipe
  useEffect(() => {
    if (!activeRegionalId) return;

    // Busca todos os usuários aprovados da mesma regional
    const q = query(
      collection(db, 'users'),
      where('regionalId', '==', activeRegionalId),
      where('approved', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== userData.uid); // Segurança: Remove a si mesmo da busca de convites
      setAllRegionalUsers(users);
    }, (err) => {
      console.error("Erro ao carregar banco de colaboradores:", err);
    });

    return () => unsub();
  }, [activeRegionalId, userData.uid]);

  // Lógica Reativa: Identifica os dados dos colaboradores presentes na Whitelist do evento
  const guestsInfo = allRegionalUsers.filter(u => invitedUsersIds?.includes(u.id));

  const handleAdd = async (userId) => {
    try {
      await eventService.addGuest(eventId, userId);
      toast.success("Colaborador adicionado");
    } catch (e) {
      toast.error("Erro ao adicionar");
    }
  };

  const handleRemove = async (userId) => {
    try {
      await eventService.removeGuest(eventId, userId);
      toast.success("Acesso revogado");
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* LISTA DE EQUIPE ATUAL: Sincronizada com o banco de dados */}
      <div className="grid grid-cols-1 gap-2">
        {guestsInfo.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase italic leading-tight">
              Aguardando colaboradores <br/> convidados para este ensaio.
            </p>
          </div>
        ) : (
          guestsInfo.map(guest => (
            <div key={guest.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-black italic">
                  {guest.name.charAt(0)}
                </div>
                <div className="leading-tight">
                  <h4 className="text-[10px] font-black text-slate-950 uppercase italic leading-none">{guest.name}</h4>
                  <p className="text-[7px] font-bold text-blue-600 uppercase tracking-widest mt-1">{guest.role}</p>
                </div>
              </div>
              {!isClosed && (
                <button onClick={() => handleRemove(guest.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors active:scale-90">
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* BOTÃO PARA ABRIR SELETOR */}
      {!isClosed && (
        <button 
          onClick={() => setIsSelectorOpen(true)}
          className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase italic flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all border border-white/5"
        >
          <UserPlus size={16} /> Convidar Colaborador
        </button>
      )}

      {/* MODAL SELETOR DE USUÁRIOS */}
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
                  placeholder="NOME OU CARGO..."
                  className="w-full bg-white p-4 pl-12 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-200 uppercase italic shadow-inner focus:border-blue-300 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pb-6">
                {allRegionalUsers
                  .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.role.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(u => {
                    const isInvited = invitedUsersIds?.includes(u.id);
                    return (
                      <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <div className="text-left leading-none">
                          <h4 className="text-[10px] font-black text-slate-950 uppercase leading-none">{u.name}</h4>
                          <p className="text-[7px] font-bold text-slate-400 uppercase italic mt-1 tracking-tighter">{u.role} • {u.comum}</p>
                        </div>
                        <button 
                          disabled={isInvited}
                          onClick={() => handleAdd(u.id)}
                          className={`p-2 rounded-xl transition-all ${isInvited ? 'text-emerald-500 bg-emerald-50' : 'text-blue-600 bg-blue-50 active:scale-90'}`}
                        >
                          {isInvited ? <ShieldCheck size={18}/> : <UserPlus size={18}/>}
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