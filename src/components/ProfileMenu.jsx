import React, { useState, useEffect } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, updateDoc, auth, collection, onSnapshot, addDoc, deleteDoc, query, where, orderBy } from '../config/firebase';
import { 
  User, LogOut, X, Shield, Map, Home, 
  KeyRound, RefreshCcw, Building, Plus, Trash2, Edit3, ChevronDown, MessageSquare, Clock, Check, ChevronRight, CheckCircle2, Bug, Lightbulb, Mail, ArrowUpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const ProfileMenu = ({ isOpen, onClose, pendingTickets, onRegionalChange, listaRegionais }) => {
  const { userData, setContext } = useAuth();
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [isRegionalManagerOpen, setIsRegionalManagerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [resposta, setResposta] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newRegionalName, setNewRegionalName] = useState('');
  const [tempName, setTempName] = useState(userData?.name || '');

  const level = userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';

  // Monitoramento de Tickets (Master vê todos, Outros vêem os próprios)
  useEffect(() => {
    if (!isOpen || !userData?.uid) return;

    let q;
    if (isMaster) {
      q = query(collection(db, "tickets_global"), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, "tickets_global"), where("userId", "==", userData.uid), orderBy("createdAt", "desc"));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (isMaster) setTickets(data);
      else setMyTickets(data);
    });
    return () => unsub();
  }, [isOpen, isMaster, userData?.uid]);

  // Sincroniza tempName quando userData muda
  useEffect(() => {
    if (userData?.name) setTempName(userData.name);
  }, [userData?.name]);

  const handleUpdateName = async () => {
    if (!tempName.trim() || tempName === userData.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userData.uid), { name: tempName.trim() });
      toast.success("Nome atualizado!");
      setIsEditingName(false);
    } catch (e) { 
      toast.error("Erro ao atualizar."); 
      setTempName(userData.name);
      setIsEditingName(false);
    }
  };

  const handleUpdateStatus = async (ticketId, novoStatus) => {
    try {
      await updateDoc(doc(db, "tickets_global", ticketId), {
        status: novoStatus,
        respostaMaster: resposta || "Recebemos sua mensagem, obrigado!",
        resolvedAt: Date.now()
      });
      toast.success("Status atualizado!");
      setResposta('');
      setSelectedTicketId(null);
    } catch (e) { toast.error("Erro ao atualizar"); }
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

  const getLevelLabel = () => {
    if (isMaster) return "Administrador Master";
    if (isComissao) return "Comissão Regional";
    if (isRegionalCidade) return "Regional de Cidade";
    if (isGemLocal) return "GEM / Encarregado Local";
    return "Músico / Básico";
  };

  if (!userData) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute top-0 right-0 h-full w-[88%] max-w-sm bg-[#F1F5F9] shadow-2xl flex flex-col text-left overflow-hidden">
              
              {/* HEADER: CARTÃO DE IDENTIDADE */}
              <div className="p-8 bg-slate-950 text-white rounded-bl-[3rem] shadow-xl relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-2xl font-black italic text-slate-950 shadow-lg border-2 border-white/20">
                    {userData?.name?.charAt(0) || 'U'}
                  </div>
                  <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-white/40 active:scale-90 transition-all"><X size={20}/></button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3 min-h-[32px]">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 w-full bg-white/10 rounded-lg px-2 py-1 border border-amber-500/50">
                        <input 
                          autoFocus
                          className="bg-transparent outline-none text-lg font-[900] uppercase italic tracking-tighter w-full text-white"
                          value={tempName}
                          onChange={e => setTempName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdateName()}
                        />
                        <button onClick={handleUpdateName} className="text-emerald-400 active:scale-90 transition-all">
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl font-[900] uppercase italic tracking-tighter truncate max-w-[80%]">{userData?.name}</h2>
                        <button 
                          onClick={() => setIsEditingName(true)} 
                          className="p-1.5 bg-white/5 rounded-md text-amber-500 active:scale-90 transition-all border border-white/5"
                        >
                          <Edit3 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-white/50 text-[10px] font-bold mt-2">
                    <Mail size={10} />
                    <span>{userData?.email || auth.currentUser?.email || 'E-mail não vinculado'}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/5 self-start">
                    <Shield size={12} className="text-amber-500" />
                    <span className="text-[9px] font-black uppercase italic tracking-wider text-amber-500">{getLevelLabel()}</span>
                  </div>
                </div>
              </div>

              {/* CONTEÚDO DINÂMICO POR NÍVEL */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                
                {/* SEÇÃO: ORIENTAÇÃO (v8.9.4 - Sem botão de upgrade para evitar conflitos) */}
                {isBasico && (
                  <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-700">
                      <Lightbulb size={16} />
                      <span className="text-[10px] font-black uppercase italic">Orientações de Acesso</span>
                    </div>
                    <p className="text-[10px] font-medium text-amber-800/70 leading-relaxed">
                      Seu acesso permite Contar os instrumentos dos eventos criados e visualizar Atas e Dashboards da sua comum.
                    </p>
                  </div>
                )}

                {/* SEÇÃO: MURAL DE SUGESTÕES (TICKETS) */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic px-2">Colaboração</p>
                  <button onClick={() => setIsTicketsOpen(true)} className="w-full bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center active:scale-95 shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isMaster && pendingTickets > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                        <Lightbulb size={18}/>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-black text-slate-950 uppercase italic block leading-none">
                          {isMaster ? 'Zeladoria do Sistema' : 'Meu Mural de Sugestões'}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 block">
                          {isMaster ? `${pendingTickets} chamados ativos` : 'Acompanhe seus feedbacks'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300"/>
                  </button>
                </div>

                {/* SEÇÃO: GESTÃO OPERACIONAL (GEM / REGIONAL) */}
                {(isGemLocal || isRegionalCidade) && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic px-2">Operacional</p>
                    <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Home size={16}/></div>
                        <div className="text-left leading-tight">
                          <span className="text-[9px] font-black text-slate-900 uppercase block">{isGemLocal ? 'Sua Comum' : 'Sua Cidade'}</span>
                          <span className="text-[11px] font-bold text-slate-500 uppercase italic truncate block max-w-[150px]">{userData?.comum || userData?.cidadeNome}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Status do Perfil:</span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase italic">Ativo</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEÇÃO: GESTÃO MASTER */}
                {isMaster && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic px-2">Governança Global</p>
                    <button onClick={() => setIsRegionalManagerOpen(true)} className="w-full bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center active:scale-95 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building size={16}/></div>
                        <span className="text-[10px] font-black text-slate-950 uppercase italic leading-none">Gerenciar Regionais</span>
                      </div>
                      <span className="bg-blue-600 text-white text-[8px] px-2 py-1 rounded-lg font-black">{listaRegionais.length}</span>
                    </button>
                  </div>
                )}

                <div className="pt-4 flex flex-col items-center gap-1 opacity-40">
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Contador de Ensaios Digital</p>
                   <p className="text-[7px] font-black text-slate-400 uppercase">v8.9.4 - Estável</p>
                </div>
              </div>

              {/* FOOTER: LOGOUT */}
              <div className="p-6 border-t border-slate-200 bg-white">
                <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 p-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase italic active:scale-95 border border-red-100 transition-all hover:bg-red-100">
                  <LogOut size={16}/> Encerrar Sessão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUB-MODAL DE TICKETS / MURAL (UNIFICADO) */}
      <AnimatePresence>
        {isTicketsOpen && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[300] bg-[#F1F5F9] flex flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none mb-1">
                  {isMaster ? 'Zeladoria Master' : 'Interação com a Equipe'}
                </p>
                <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter">
                  {isMaster ? 'Chamados Ativos' : 'Minhas Sugestões'}
                </h3>
              </div>
              <button onClick={() => setIsTicketsOpen(false)} className="p-2 bg-white rounded-full text-slate-300 shadow-sm active:scale-90"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
              {(isMaster ? tickets : myTickets).length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-black uppercase italic text-[10px]">Nenhum registro encontrado.</div>
              ) : (isMaster ? tickets : myTickets).map(t => (
                <div key={t.id} className={`p-5 rounded-[2rem] border relative overflow-hidden transition-all bg-white ${t.status === 'pendente' ? 'border-blue-100 shadow-md' : 'border-slate-100 opacity-80'}`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${t.status === 'resolvido' || t.status === 'agradecido' ? 'bg-emerald-500' : t.status === 'rejeitado' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    
                    <div className="flex justify-between mb-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-lg">
                            {t.tipo === 'bug' ? '🐞' : t.tipo === 'elogio' ? '⭐' : t.tipo === 'upgrade' ? '🚀' : '💡'}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-950 leading-none">{t.userName}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase italic mt-1">{t.tipo} • {t.modulo}</span>
                          </div>
                        </div>
                        <span className="text-[7px] font-black text-slate-300 uppercase">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[11px] font-bold text-slate-600 italic bg-slate-50 p-3 rounded-2xl mb-4">"{t.mensagem}"</p>
                    
                    {t.respostaMaster && (
                      <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 mb-2">
                        <p className="text-[7px] font-black text-blue-600 uppercase mb-1 italic">Resposta do Responsável:</p>
                        <p className="text-[10px] font-bold text-blue-900 italic">"{t.respostaMaster}"</p>
                      </div>
                    )}

                    {isMaster && t.status === 'pendente' && (
                      <div className="mt-4 space-y-3">
                        <textarea className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-[10px] font-bold outline-none h-20 resize-none focus:border-blue-300 transition-all" placeholder="Escreva uma nota de retorno..." value={selectedTicketId === t.id ? resposta : ''} onChange={(e) => { setSelectedTicketId(t.id); setResposta(e.target.value); }} />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateStatus(t.id, 'resolvido')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[9px] font-black uppercase italic shadow-lg active:scale-95 transition-all">Concluir</button>
                          <button onClick={() => handleUpdateStatus(t.id, 'rejeitado')} className="bg-red-50 text-red-500 px-4 rounded-xl text-[9px] font-black uppercase italic border border-red-100">Recusar</button>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL GESTÃO DE REGIONAIS (MASTER) */}
      <AnimatePresence>
        {isRegionalManagerOpen && isMaster && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegionalManagerOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter">Regionais Ativas</h3>
                <button onClick={() => setIsRegionalManagerOpen(false)} className="p-2 text-slate-300"><X size={20}/></button>
              </div>
              <form onSubmit={handleCreateRegional} className="mb-6 flex gap-2 items-center">
                <input placeholder="NOME DA REGIONAL..." className="flex-1 bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-[10px] outline-none border border-slate-200 focus:border-blue-400 transition-all uppercase italic" value={newRegionalName} onChange={(e) => setNewRegionalName(e.target.value)} />
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
    </>
  );
};

export default ProfileMenu;