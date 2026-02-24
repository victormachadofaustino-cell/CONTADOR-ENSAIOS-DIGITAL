import React, { useState, useEffect } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, orderBy } from '../config/firebase';
import { ChevronDown, RefreshCw } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext';
import ProfileMenu from './ProfileMenu'; 
import toast from 'react-hot-toast'; // Importado para feedback real da sincronização

const Header = ({ onChurchChange, onRegionalChange }) => {
  const { userData } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [listaRegionais, setListaRegionais] = useState([]);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false); 

  const isMaster = userData?.accessLevel === 'master';

  // Sincronização de Regionais para exibição de nome
  useEffect(() => {
    if (!userData) return;
    const unsubReg = onSnapshot(collection(db, 'config_regional'), (s) => {
      setListaRegionais(s.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    });
    
    let unsubTickets = () => {};
    if (isMaster) {
      const q = query(collection(db, "tickets_global"));
      unsubTickets = onSnapshot(q, (snap) => {
        setPendingTickets(snap.docs.filter(d => d.data().status === 'pendente').length);
      });
    }

    return () => { unsubReg(); unsubTickets(); };
  }, [userData, isMaster]);

  const regionalAtivaNome = listaRegionais.find(r => r.id === (userData?.activeRegionalId || userData?.regionalId))?.nome || userData?.regionalNome || userData?.regional || "Navegar...";

  // Função de Sincronização Real v8.9.6 com Restauração de Sessão
  const handleSync = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    const toastId = toast.loading("Sincronizando e salvando sessão...", {
      style: { borderRadius: '1rem', background: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: '900' }
    });

    // O reload força o Firebase a reestabelecer todos os listeners onSnapshot
    // A Memória de Navegação no App.js garantirá que voltaremos para a mesma tela.
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Dados prontos! Restaurando...", { id: toastId });
      
      // Delay estratégico para o usuário ver o sucesso antes do reload
      setTimeout(() => {
        window.location.reload();
      }, 600);
    }, 1500);
  };

  return (
    <>
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shadow-sm">
        
        {/* SELETOR DE REGIONAL DIRETO NO HEADER (Protegido v2.1) */}
        <button 
          onClick={() => isMaster && setIsProfileOpen(true)} 
          disabled={!isMaster} 
          className={`flex flex-col items-start leading-none text-left transition-all group ${isMaster ? 'active:opacity-60' : 'cursor-default'}`}
        >
          <span className="text-[10px] font-black text-blue-600 uppercase italic tracking-tighter flex items-center gap-1 leading-none">
            Regional {isMaster && <ChevronDown size={10} className="text-slate-400 group-hover:text-blue-600 transition-colors" />}
          </span>
          <h1 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight truncate max-w-[180px]">
            {regionalAtivaNome}
          </h1>
        </button>

        <div className="flex items-center gap-4">
          {/* BOTÃO SINCRONIZAR REAL (v8.9.6) */}
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all ${isSyncing ? 'animate-spin text-blue-600' : ''}`}
            title="Sincronizar e Restaurar Sessão"
          >
            <RefreshCw size={18} />
          </button>

          {/* BOTÃO DE PERFIL COM INDICADOR DE NOTIFICAÇÃO */}
          <button 
            onClick={() => setIsProfileOpen(true)} 
            className="relative w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border-2 border-white ring-1 ring-slate-100"
          >
            <span className="font-black italic text-xs uppercase">{userData?.name?.charAt(0) || 'U'}</span>
            {pendingTickets > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-bounce shadow-sm flex items-center justify-center">
                <span className="text-[7px] font-black text-slate-950">{pendingTickets}</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <ProfileMenu 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        pendingTickets={pendingTickets}
        onRegionalChange={onRegionalChange}
        listaRegionais={listaRegionais}
      />
    </>
  );
};

export default Header;