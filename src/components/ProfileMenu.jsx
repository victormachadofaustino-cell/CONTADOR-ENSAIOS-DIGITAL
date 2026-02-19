import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, auth, collection, onSnapshot, addDoc, deleteDoc, query, where, orderBy } from '../config/firebase';
import { 
  User, LogOut, X, Shield, Map, Home, 
  KeyRound, RefreshCcw, Building, Plus, Trash2, Edit3, ChevronDown, MessageSquare, Clock, Check, ChevronRight, CheckCircle2, Bug, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const ProfileMenu = ({ isOpen, onClose, pendingTickets, onRegionalChange, listaRegionais }) => {
  const { userData, setContext } = useAuth();
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isRegionalManagerOpen, setIsRegionalManagerOpen] = useState(false);
  const [isRegionalSelectorOpen, setIsRegionalSelectorOpen] = useState(false);
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [resposta, setResposta] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newRegionalName, setNewRegionalName] = useState('');
  const [tempName, setTempName] = useState(userData?.name || '');
  const [tempRole, setTempRole] = useState(userData?.role || '');

  const isMaster = userData?.accessLevel === 'master';

  // Monitor de Tickets com Auto-limpeza
  useEffect(() => {
    if (!isOpen || !isMaster) return;

    const limiteDias = Date.now() - (10 * 24 * 60 * 60 * 1000);

    const q = query(collection(db, "tickets_global"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const filtrados = todos.filter(t => {
        if (t.status === 'resolvido' || t.status === 'rejeitado' || t.status === 'agradecido') {
           const dataAcao = t.resolvedAt || t.createdAt;
           return dataAcao > limiteDias;
        }
        return true;
      });
      setTickets(filtrados);
    });
    return () => unsub();
  }, [isOpen, isMaster]);

  const handleUpdateStatus = async (ticketId, novoStatus) => {
    const ticketOriginal = tickets.find(t => t.id === ticketId);
    if (!resposta.trim() && novoStatus !== 'pendente' && ticketOriginal?.tipo !== 'elogio') {
      return toast.error("Escreva uma breve nota de retorno");
    }

    try {
      await updateDoc(doc(db, "tickets_global", ticketId), {
        status: novoStatus,
        respostaMaster: resposta || "Agradecemos o seu feedback!",
        resolvedAt: Date.now()
      });
      toast.success("Feedback enviado ao usuário!");
      setResposta('');
      setSelectedTicketId(null);
    } catch (e) { toast.error("Erro ao atualizar status"); }
  };

  const handleLogout = async () => { 
    onClose();
    await authService.logout(); 
    toast.success("Sessão encerrada"); 
  };

  const handleCreateRegional = async (e) => {
    e.preventDefault();
    if (!newRegionalName.trim()) return;
    try {
      await addDoc(collection(db, 'config_regional'), { nome: newRegionalName.toUpperCase().trim(), createdAt: Date.now() });
      setNewRegionalName('');
      toast.success("Regional Ativada!");
    } catch (e) { toast.error("Erro ao criar"); }
  };

  if (!userData) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-[#F1F5F9] shadow-2xl flex flex-col text-left">
              
              <div className="p-8 bg-slate-950 text-white rounded-bl-[3rem] shadow-xl relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-2xl font-black italic border border-white/10 text-amber-500 shadow-inner">
                    {userData?.name?.charAt(0) || 'U'}
                  </div>
                  <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-white/40"><X size={20}/></button>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-[900] uppercase italic tracking-tighter truncate max-w-[200px]">{userData?.name}</h2>
                  {isMaster && <span className="bg-amber-500 text-slate-950 text-[7px] font-black px-2 py-0.5 rounded-md uppercase italic border border-amber-400">Master</span>}
                </div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic opacity-80">{userData?.role}</p>
              </div>

              <div className="flex-1 p-6 space-y-3 overflow-y-auto no-scrollbar">
                {/* ÁREA DE GESTÃO - Prioridade Visual */}
                <div className="space-y-3 mb-6">
                   <p className="text-[9px] font-black text-slate-400 uppercase italic px-4">Administrativo</p>
                    
                    <button onClick={() => setIsRegionalSelectorOpen(true)} className="w-full bg-white p-5 rounded-[2rem] border border-blue-100 flex justify-between items-center active:scale-95 shadow-sm group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Map size={16}/></div>
                        <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">Trocar Regional Ativa</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors"/>
                    </button>

                    {isMaster && (
                      <>
                        <button onClick={() => setIsTicketsOpen(true)} className="w-full bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center active:scale-95 shadow-sm relative overflow-hidden group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all ${pendingTickets > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-blue-50 text-blue-600'}`}><MessageSquare size={16}/></div>
                            <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">Central de Chamados</span>
                          </div>
                          <div className="flex items-center gap-2">
                             {pendingTickets > 0 && <span className="bg-amber-500 text-slate-950 text-[8px] px-2 py-1 rounded-lg font-black">{pendingTickets}</span>}
                             <ChevronRight size={14} className="text-slate-300"/>
                          </div>
                        </button>

                        <button onClick={() => setIsRegionalManagerOpen(true)} className="w-full bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center active:scale-95 shadow-sm group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building size={16}/></div>
                            <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">Gerenciar Regionais</span>
                          </div>
                          <span className="bg-blue-600 text-white text-[8px] px-2 py-1 rounded-lg font-black group-hover:scale-110 transition-transform">{listaRegionais.length}</span>
                        </button>
                      </>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-200">
                   <p className="text-[8px] font-bold text-slate-300 text-center uppercase tracking-widest italic">Contador de Ensaios Digital v4.5</p>
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

      {/* SUB-MODAL DE TICKETS */}
      <AnimatePresence>
        {isTicketsOpen && isMaster && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[300] bg-[#F1F5F9] flex flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none mb-1">Zeladoria do Master</p>
                <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter">Chamados Ativos</h3>
              </div>
              <button onClick={() => setIsTicketsOpen(false)} className="p-2 bg-white rounded-full text-slate-300 shadow-sm"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
              {tickets.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-black uppercase italic text-[10px]">Tudo em ordem na Regional.</div>
              ) : tickets.map(t => (
                <div key={t.id} className={`p-5 rounded-[2rem] border relative overflow-hidden transition-all ${t.status === 'pendente' ? 'bg-white border-blue-100 shadow-md' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${t.status === 'resolvido' || t.status === 'agradecido' ? 'bg-emerald-500' : t.status === 'rejeitado' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    
                    <div className="flex justify-between mb-2">
                       <div className="flex gap-2 items-center">
                          <span className="text-lg">{t.tipo === 'bug' ? '🐞' : t.tipo === 'elogio' ? '⭐' : '💡'}</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-950 leading-none">{t.userName}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase italic mt-1">Tela: {t.modulo}</span>
                          </div>
                       </div>
                       <span className="text-[7px] font-black text-slate-300 uppercase">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[11px] font-bold text-slate-600 italic bg-slate-50 p-3 rounded-2xl mb-4 border border-slate-100">"{t.mensagem}"</p>
                    
                    {t.status === 'pendente' ? (
                      <div className="mt-4 space-y-3">
                        <textarea className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-[10px] font-bold outline-none h-20 resize-none focus:border-blue-300 transition-all" placeholder="Nota de retorno ao usuário..." value={selectedTicketId === t.id ? resposta : ''} onChange={(e) => { setSelectedTicketId(t.id); setResposta(e.target.value); }} />
                        <div className="flex gap-2">
                          {t.tipo === 'elogio' ? (
                            <button onClick={() => handleUpdateStatus(t.id, 'agradecido')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[9px] font-black uppercase italic shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={14}/> Gratidão</button>
                          ) : (
                            <>
                              <button onClick={() => handleUpdateStatus(t.id, 'resolvido')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[9px] font-black uppercase italic shadow-lg active:scale-95 transition-all">Resolvido</button>
                              <button onClick={() => handleUpdateStatus(t.id, 'rejeitado')} className="bg-red-50 text-red-500 px-4 rounded-xl text-[9px] font-black uppercase italic active:scale-95 transition-all border border-red-100">Recusar</button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[8px] font-black uppercase text-slate-400">Status: {t.status}</span>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                    )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL GESTÃO DE REGIONAIS */}
      <AnimatePresence>
        {isRegionalManagerOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegionalManagerOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[85vh]">
              <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-6">Regionais Ativas</h3>
              <form onSubmit={handleCreateRegional} className="mb-6 flex gap-2 items-center">
                <input placeholder="NOVA REGIONAL..." className="flex-1 bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-[10px] outline-none border border-slate-200 focus:border-blue-400 transition-all uppercase italic truncate" value={newRegionalName} onChange={(e) => setNewRegionalName(e.target.value)} />
                <button type="submit" className="bg-blue-600 text-white h-12 w-12 flex items-center justify-center rounded-2xl shadow-lg active:scale-90 transition-transform"><Plus size={20}/></button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {listaRegionais.map(reg => (
                  <div key={reg.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100 group">
                    <span className="text-[10px] font-black uppercase italic truncate max-w-[180px]">{reg.nome}</span>
                    <button onClick={() => deleteDoc(doc(db, 'config_regional', reg.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SELETOR DE REGIONAL */}
      <AnimatePresence>
        {isRegionalSelectorOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegionalSelectorOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-6 shadow-2xl text-left border-t-4 border-blue-600">
              <h3 className="text-lg font-[900] text-slate-950 uppercase italic mb-4 px-2 tracking-tighter">Selecionar Regional</h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                {listaRegionais.map(reg => (
                  <button key={reg.id} onClick={() => { setContext('regional', reg.id); if (onRegionalChange) onRegionalChange(reg.id, reg.nome); setIsRegionalSelectorOpen(false); toast.success(`Navegando para: ${reg.nome}`); }} className={`w-full p-4 rounded-2xl flex justify-between items-center transition-all ${userData?.activeRegionalId === reg.id ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}>
                    <span className="text-[10px] font-black uppercase italic leading-none truncate max-w-[200px]">{reg.nome}</span>
                    {userData?.activeRegionalId === reg.id && <Check size={14} className="text-blue-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileMenu;