import React, { useState, useEffect } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, orderBy } from '../config/firebase';
import { ChevronDown, RefreshCw } from 'lucide-react'; // Injetado RefreshCw para o Anexo 5
import { useAuth } from '../context/AuthContext';
import ProfileMenu from './ProfileMenu'; 

const Header = ({ onChurchChange, onRegionalChange }) => {
  const { userData } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [listaRegionais, setListaRegionais] = useState([]);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false); // Estado visual para o Sync

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

  // Função para simular ou disparar a sincronização (Anexo 5)
  const handleSync = () => {
    setIsSyncing(true);
    // Aqui o app já faz a reativação via onSnapshot, 
    // apenas damos o feedback visual de 1s para o usuário.
    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <>
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shadow-sm">
        
        {/* SELETOR DE REGIONAL DIRETO NO HEADER (Anexo 6) */}
        <button 
          onClick={() => setIsProfileOpen(true)} // Abre o menu onde está a troca
          className="flex flex-col items-start leading-none text-left active:opacity-60 transition-all group"
        >
          <span className="text-[10px] font-black text-blue-600 uppercase italic tracking-tighter flex items-center gap-1 leading-none">
            Regional <ChevronDown size={10} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </span>
          <h1 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight truncate max-w-[180px]">
            {regionalAtivaNome}
          </h1>
        </button>

        <div className="flex items-center gap-4">
          {/* BOTÃO SINCRONIZAR DISCRETO (Anexo 5) */}
          <button 
            onClick={handleSync}
            className={`p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all ${isSyncing ? 'animate-spin text-blue-600' : ''}`}
            title="Sincronizar Dados"
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