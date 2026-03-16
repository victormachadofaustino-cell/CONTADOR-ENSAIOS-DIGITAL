import React, { useState, useEffect } from 'react'; // Ferramenta para criar a tela e controlar o que aparece ou some.
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, orderBy } from '../config/firebase'; // Conecta ao banco de dados para ler as regionais.
import { ChevronDown, RefreshCw, MapPin } from 'lucide-react'; // Ícones para as setas e botões.
import { useAuth } from '../context/AuthContext'; // Puxa o "Cérebro" do app para saber quem você é.
import ProfileMenu from './ProfileMenu'; // Importa o menu de perfil para outras funções.
import toast from 'react-hot-toast'; // Ferramenta para mostrar os balões de aviso.

const Header = ({ onChurchChange, onRegionalChange }) => { // Início do componente do cabeçalho.
  const { userData, setContext } = useAuth(); // Pega seus dados e a função de mudar o "GPS" (Contexto).
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Controla se o menu de perfil está aberto.
  const [listaRegionais, setListaRegionais] = useState([]); // Guarda a lista de regionais que vêm do banco.
  const [pendingTickets, setPendingTickets] = useState(0); // Conta os chamados pendentes.
  const [isSyncing, setIsSyncing] = useState(false); // Faz o ícone de atualizar girar.

  const isMaster = userData?.accessLevel === 'master'; // Verifica se você tem o poder total de Master.

  // Sincronização de Regionais para o seletor
  useEffect(() => { // Roda quando o app abre para carregar as opções de troca.
    if (!userData) return; // Se não estiver logado, não faz nada.
    const unsubReg = onSnapshot(collection(db, 'config_regional'), (s) => { // Escuta o banco de dados de regionais.
      setListaRegionais(s.docs.map(d => ({ id: d.id, nome: d.data().nome }))); // Salva os nomes das regionais na lista.
    });
    
    let unsubTickets = () => {}; // Preparação para os chamados.
    if (isMaster) { // Se for Master, começa a vigiar os chamados.
      const q = query(collection(db, "tickets_global")); // Pergunta ao banco sobre os chamados.
      unsubTickets = onSnapshot(q, (snap) => { // Escuta se chegar chamado novo.
        setPendingTickets(snap.docs.filter(d => d.data().status === 'pendente').length); // Conta os pendentes.
      });
    }

    return () => { unsubReg(); unsubTickets(); }; // Desliga tudo ao fechar para economizar bateria.
  }, [userData, isMaster]); // Monitora mudanças de usuário ou poder.

  // Acha o nome da regional que está ativa agora no seu GPS.
  const regionalAtivaId = userData?.activeRegionalId || userData?.regionalId; // Pega o ID da região atual.
  const regionalAtivaNome = listaRegionais.find(r => r.id === regionalAtivaId)?.nome || userData?.regionalNome || "SELECIONAR..."; // Acha o nome correspondente.

  // Função para o Master trocar a Regional diretamente no Header
  const handleTrocaRegional = (id) => { // Função disparada ao escolher uma nova regional no menu.
    if (!id) return; // Se não escolher nada, ignora.
    setContext('regional', id); // Comando para o "Cérebro" mudar todo o app para essa nova Regional.
    toast.success("Jurisdição Alterada", { // Mostra o aviso de sucesso.
      style: { borderRadius: '1rem', background: '#020617', color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }
    });
  };

  // Função de Sincronização (Reload)
  const handleSync = () => { // Função para atualizar os dados na marra.
    if (isSyncing) return; // Se já estiver girando, não faz nada.
    setIsSyncing(true); // Começa a girar.
    const toastId = toast.loading("Sincronizando...", { style: { borderRadius: '1rem', background: '#0f172a', color: '#fff', fontSize: '12px' } }); // Aviso.
    setTimeout(() => { // Simula o tempo de conversa com o banco.
      setIsSyncing(false); // Para de girar.
      toast.success("Dados Atualizados!", { id: toastId }); // Aviso de pronto.
      setTimeout(() => { window.location.reload(); }, 600); // Recarrega a página.
    }, 1500);
  };

  return ( // Início do desenho do Header.
    <>
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shadow-sm">
        
        {/* NOVO SELETOR DE JURISDIÇÃO MASTER (DROPDOWN DIRETO) */}
        <div className="flex flex-col items-start leading-none text-left min-w-0 flex-1">
          <span className="text-[10px] font-black text-blue-600 uppercase italic tracking-tighter mb-1">
            {isMaster ? 'Jurisdição Master' : 'Sua Regional'}
          </span>
          
          <div className="relative group w-full max-w-[200px]">
            <select // Transformamos o texto em um seletor real para o Master.
              disabled={!isMaster} // Só o Master pode mexer aqui.
              value={regionalAtivaId || ''} // Mostra a regional que está selecionada agora.
              onChange={(e) => handleTrocaRegional(e.target.value)} // Quando você clica em outra, ele troca o ambiente.
              className={`appearance-none bg-transparent pr-8 w-full text-sm font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight outline-none truncate cursor-pointer ${!isMaster ? 'pointer-events-none' : ''}`}
            >
              <option value="" disabled>Selecione...</option>
              {listaRegionais.map(reg => ( // Cria uma opção para cada regional cadastrada.
                <option key={reg.id} value={reg.id} className="text-slate-950 font-sans not-italic font-bold text-xs uppercase">
                  {reg.nome}
                </option>
              ))}
            </select>
            {isMaster && ( // Coloca a setinha indicando que é um menu de escolher.
              <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-600 transition-colors" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* BOTÃO SINCRONIZAR */}
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all ${isSyncing ? 'animate-spin text-blue-600' : ''}`}
          >
            <RefreshCw size={18} />
          </button>

          {/* BOTÃO DE PERFIL */}
          <button 
            onClick={() => setIsProfileOpen(true)} 
            className="relative w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border-2 border-white ring-1 ring-slate-100"
          >
            <span className="font-black italic text-xs uppercase">{userData?.name?.charAt(0) || 'U'}</span>
            {pendingTickets > 0 && ( // Mostra a bolinha se houver chamados.
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-bounce shadow-sm flex items-center justify-center">
                <span className="text-[7px] font-black text-slate-950">{pendingTickets}</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <ProfileMenu // Menu lateral de apoio.
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        pendingTickets={pendingTickets}
        onRegionalChange={onRegionalChange}
        listaRegionais={listaRegionais}
      />
    </>
  );
};

export default Header; // Entrega o componente pronto.