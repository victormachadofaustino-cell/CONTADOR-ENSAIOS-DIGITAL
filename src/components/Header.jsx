import React, { useState, useEffect } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, orderBy } from '../config/firebase';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileMenu from './ProfileMenu'; // Conexão com o novo arquivo

const Header = ({ onChurchChange, onRegionalChange }) => {
  const { userData } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [listaRegionais, setListaRegionais] = useState([]);
  const [pendingTickets, setPendingTickets] = useState(0);

  const isMaster = userData?.accessLevel === 'master';

  // Sincronização de Regionais para exibição de nome
  useEffect(() => {
    if (!userData) return;
    const unsubReg = onSnapshot(collection(db, 'config_regional'), (s) => {
      setListaRegionais(s.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    });
    
    // Monitor de Notificações (Bolinha Laranja) para Zeladoria Master
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

  return (
    <>
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shadow-sm">
        
        <div className="flex flex-col items-start leading-none text-left">
          <span className="text-[10px] font-black text-blue-600 uppercase italic tracking-tighter flex items-center gap-1 leading-none">
            Regional
          </span>
          <h1 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight truncate max-w-[200px]">
            {regionalAtivaNome}
          </h1>
        </div>

        {/* BOTÃO DE PERFIL COM INDICADOR DE NOTIFICAÇÃO (BOLINHA LARANJA) */}
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