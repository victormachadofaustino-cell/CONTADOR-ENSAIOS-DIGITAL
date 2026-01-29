import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../config/firebase'; // Caminho confirmado conforme sua instrução
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Lightbulb, Send, X, Clock, Bug, MessageSquare, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Tickets = ({ moduloAtual }) => {
  const { user, userData } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [abaFeedback, setAbaFeedback] = useState('novo');
  const [tipoFeedback, setTipoFeedback] = useState('sugestao');
  const [textoFeedback, setTextoFeedback] = useState('');
  const [meusFeedbacks, setMeusFeedbacks] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Monitora o histórico de tickets do próprio usuário logado
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "tickets_global"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMeusFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const enviarTicket = async (e) => {
    e.preventDefault();
    if (!textoFeedback.trim() || enviando) return;
    
    setEnviando(true);
    try {
      await addDoc(collection(db, "tickets_global"), {
        userId: user.uid,
        userName: userData?.name || "Usuário",
        userRole: userData?.role || "Básico",
        email: user.email,
        mensagem: textoFeedback.trim(),
        tipo: tipoFeedback,
        modulo: moduloAtual || 'Lobby',
        // Rastreabilidade Geográfica v3.0
        cidadeId: userData?.cidadeId || '',
        regionalId: userData?.regionalId || '',
        comumId: userData?.comumId || '',
        status: 'pendente',
        dbVersion: '3.0-global',
        createdAt: Date.now()
      });

      toast.success("Ticket enviado ao Master!");
      setTextoFeedback('');
      setAbaFeedback('historico');
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar ticket.");
    } finally {
      setEnviando(false);
    }
  };

  // Lógica de Cores inspirada no Calendário Regional 
  const getStatusStyle = (status) => {
    switch (status) {
      case 'resolvido':
      case 'agradecido': 
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' };
      case 'rejeitado':
      case 'não reproduzido':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' };
      case 'analise':
        return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' };
      default:
        return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500' };
    }
  };

  // Glossário de Status 
  const traduzirStatus = (s) => {
    const mapa = {
      'pendente': 'Enviado',
      'analise': 'Em Análise',
      'resolvido': '✅ Resolvido',
      'rejeitado': 'Recusado',
      'não reproduzido': 'Não Reproduzido',
      'agradecido': '🙏 Gratidão'
    };
    return mapa[s] || s;
  };

  if (!user) return null;

  return (
    <>
      {/* Botão Flutuante (FAB) */}
      <button 
        onClick={() => setShowFeedback(!showFeedback)} 
        className={`fixed bottom-24 right-6 z-[1000] p-4 rounded-full shadow-2xl transition-all active:scale-90 border border-white/20 ${showFeedback ? 'bg-slate-950 text-white rotate-12' : 'bg-white/40 text-slate-600 backdrop-blur-md'}`}
      >
        <Lightbulb size={24} fill={showFeedback ? "currentColor" : "none"} />
      </button>

      {showFeedback && createPortal(
        <div onClick={() => setShowFeedback(false)} className="fixed inset-0 z-[2000] bg-slate-950/20 backdrop-blur-[2px] flex items-end justify-center p-4 pb-24">
          <motion.div 
            onClick={e => e.stopPropagation()} 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-slate-100"
          >
            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setAbaFeedback('novo')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${abaFeedback === 'novo' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400'}`}>Novo</button>
                <button onClick={() => setAbaFeedback('historico')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${abaFeedback === 'historico' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400'}`}>Histórico</button>
              </div>
              <button onClick={() => setShowFeedback(false)} className="p-2 bg-slate-50 text-slate-300 rounded-full active:scale-90 transition-all"><X size={16}/></button>
            </div>

            {abaFeedback === 'novo' ? (
              <form onSubmit={enviarTicket} className="space-y-4 animate-premium">
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 uppercase border border-slate-100 italic">
                  Contexto: {moduloAtual || 'Lobby'}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <TypeButton active={tipoFeedback === 'bug'} onClick={() => setTipoFeedback('bug')} icon={<Bug size={12}/>} label="Bug" />
                  <TypeButton active={tipoFeedback === 'sugestao'} onClick={() => setTipoFeedback('sugestao')} icon={<MessageSquare size={12}/>} label="Idéia" />
                  <TypeButton active={tipoFeedback === 'elogio'} onClick={() => setTipoFeedback('elogio')} icon={<Star size={12}/>} label="Elogio" />
                </div>

                <textarea 
                  required 
                  maxLength={300} 
                  value={textoFeedback} 
                  onChange={(e) => setTextoFeedback(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-bold outline-none h-32 resize-none placeholder:text-slate-300 focus:bg-white focus:border-blue-200 transition-all shadow-inner" 
                  placeholder="No que podemos melhorar o sistema?" 
                />

                <button 
                  disabled={enviando} 
                  type="submit" 
                  className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex justify-center items-center gap-2 active:scale-95 shadow-xl transition-all disabled:opacity-50"
                >
                  <Send size={14}/> {enviando ? 'Enviando...' : 'Enviar Chamado'}
                </button>
              </form>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pb-2 animate-premium">
                {meusFeedbacks.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 text-[10px] font-black uppercase italic">Nenhum chamado enviado.</div>
                ) : (
                  meusFeedbacks.map(f => {
                    const style = getStatusStyle(f.status);
                    return (
                      <div key={f.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left relative overflow-hidden transition-all">
                        {/* Borda lateral colorida idêntica ao modelo regional  */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${style.border.replace('border-', 'bg-')}`} />
                        
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 bg-white border border-slate-200 text-slate-400 rounded-full">
                            {f.tipo === 'bug' ? '🐞 Bug' : f.tipo === 'elogio' ? '⭐ Elogio' : '💡 Idéia'}
                          </span>
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>
                            {traduzirStatus(f.status)}
                          </span>
                        </div>
                        
                        <p className="text-[10px] font-bold text-slate-600 leading-tight italic">"{f.mensagem}"</p>
                        
                        {f.respostaMaster && (
                          <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2 animate-in fade-in">
                             <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                             <p className="text-[9px] font-black text-slate-900 uppercase leading-tight">Retorno Master: <span className="font-bold text-slate-500 normal-case italic">{f.respostaMaster}</span></p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        </div>, document.body
      )}
    </>
  );
};

const TypeButton = ({ active, onClick, icon, label }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className={`py-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all active:scale-90 ${active ? 'bg-amber-500 border-amber-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
  >
    {icon}
    <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default Tickets;