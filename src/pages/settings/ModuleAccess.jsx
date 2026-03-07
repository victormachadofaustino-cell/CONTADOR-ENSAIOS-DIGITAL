import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas de estado e memória do React.
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, doc, updateDoc, query, where } from '../../config/firebase'; // Explicação: Conecta com o Firebase para gerenciar usuários.
import toast from 'react-hot-toast'; // Explicação: Avisos de sucesso/erro na tela.
import { 
  ShieldCheck, Globe, Map, Home, X, ChevronRight, 
  User, ShieldAlert, Mail, Shield, Eye, ChevronDown, Check, AlertTriangle
} from 'lucide-react'; // Explicação: Ícones visuais para a portaria.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Animações suaves.
// Importação do Cérebro de Autenticação para validar jurisdição
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa o crachá de quem está operando a portaria.
// v2.5: Importação do motor de permissões para validar promoção e rebaixamento
import { hasPermission, ROLES } from '../../config/permissions'; // Explicação: Importa a Regra de Ouro do sistema.

const ModuleAccess = ({ comumId, cargos }) => { // Explicação: Inicia o módulo de controle de acesso.
  const { userData, user, loading: authLoading } = useAuth(); // Explicação: Pega os dados do gestor logado.
  const userEmail = user?.email;
  
  // NOVA LÓGICA DE NÍVEIS (v2.2 - Estabilizada)
  const level = userData?.accessLevel;
  const isMaster = userData?.isMaster;
  const isComissao = userData?.isComissao;
  const isRegionalCidade = userData?.isRegionalCidade;
  const isGemLocal = userData?.isGemLocal;

  const [users, setUsers] = useState([]); // Explicação: Lista de usuários que aparecem para aprovação.
  const [selectedUser, setSelectedUser] = useState(null); // Explicação: Usuário clicado para ver detalhes.
  const [openSections, setOpenSections] = useState({}); // Explicação: Controla quais igrejas estão abertas na lista.

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId; // Explicação: Define a região de trabalho.

  // 1. MONITOR DE USUÁRIOS COM QUERY ATÔMICA (Economia de Cota)
  useEffect(() => { // Explicação: Vigia a lista de usuários respeitando o limite geográfico.
    if (authLoading || !userData || !activeRegionalId) return;
    
    let isMounted = true;
    const qBase = collection(db, 'users');
    let qUsers;
    
    // Matriz de visibilidade conforme Jurisdição Territorial
    if (isMaster || isComissao) { // Explicação: Master/Comissão veem todos da regional selecionada.
      qUsers = query(qBase, where('regionalId', '==', activeRegionalId));
    } else if (isRegionalCidade) { // Explicação: Regional de Cidade vê apenas sua cidade.
        qUsers = query(qBase, 
          where('cidadeId', '==', userData.cidadeId)
        );
    } else if (isGemLocal) { // Explicação: GEM vê apenas os músicos da sua própria igreja.
      qUsers = query(qBase, 
        where('comumId', '==', userData.comumId)
      );
    } else { // Explicação: Básico não vê ninguém (apenas ele mesmo se necessário).
      qUsers = query(qBase, where('email', '==', userEmail));
    }
    
    const unsubUsers = onSnapshot(qUsers, (s) => {
      if (!isMounted) return;
      let allUsers = s.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const jaNaLista = allUsers.some(u => u.id === user?.uid);
      if (!jaNaLista && userData) {
        allUsers = [{ id: user?.uid, ...userData }, ...allUsers];
      }
      setUsers(allUsers);
    }, (err) => {
      console.error("Erro na portaria:", err.message);
      if (isMounted) setUsers([{ id: user?.uid, ...userData }]);
    });

    return () => { isMounted = false; unsubUsers(); };
  }, [authLoading, activeRegionalId, userData, userEmail, user?.uid]);

  const usersGrouped = useMemo(() => { // Explicação: Organiza os usuários por nome da igreja na lista.
    const filteredUsers = comumId 
      ? users.filter(u => u.comumId === comumId) 
      : users;

    return filteredUsers.reduce((acc, user) => {
      const key = user.comum || 'Sem Localidade';
      if (!acc[key]) acc[key] = [];
      acc[key].push(user);
      return acc;
    }, {});
  }, [users, comumId]);

  const sortedGroups = Object.keys(usersGrouped).sort(); // Explicação: Coloca as igrejas em ordem alfabética.

  const toggleSection = (group) => { // Explicação: Abre/fecha a sanfona da igreja.
    setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const getNivelLabel = (u) => { // Explicação: Transforma o cargo técnico em nome bonito na tela.
    const l = u.accessLevel;
    if (l === 'master') return "Master Root";
    if (l === 'comissao') return "Comissão Regional";
    if (l === 'regional_cidade') return "Regional de Cidade";
    if (l === 'gem_local') return "GEM / Local";
    return "Básico";
  };

  // REGRA DE OURO: Validação de Matriz de Aprovação Territorial (Sincronizada v2.5)
  const podeEditarEstePerfil = (u) => { // Explicação: Decide se você tem poder para abrir a edição deste perfil.
    if (isMaster) return true; // Explicação: Master edita qualquer um.
    if (u.id === user?.uid) return false; // Explicação: Ninguém altera as próprias permissões.
    
    if (isComissao && u.accessLevel !== 'master') return true; // Explicação: Comissão edita todos abaixo de Master.
    
    if (isRegionalCidade && u.cidadeId === userData.cidadeId) { // Explicação: Regional edita quem for da cidade dele.
      return u.accessLevel !== 'master' && u.accessLevel !== 'comissao';
    }

    if (isGemLocal && u.comumId === userData.comumId) { // Explicação: GEM edita quem for da comum dele.
      return true; // Explicação: Agora liberado para abrir, os botões internos dirão o que ele pode mudar.
    }

    return false; // Explicação: Padrão é não ter permissão.
  };

  const handleUpdate = async (userId, data) => { // Explicação: Envia a aprovação ou troca de nível para o banco.
    try {
      await updateDoc(doc(db, 'users', userId), data);
      toast.success("Zeladoria atualizada");
      if (data.accessLevel) setSelectedUser(null);
    } catch (e) { 
      console.error("FALHA PORTARIA:", e); 
      toast.error("Sem permissão hierárquica."); 
    }
  };

  const ofuscarEmail = (email) => { // Explicação: Esconde parte do e-mail por privacidade.
    if (!email) return "";
    const [user, domain] = email.split('@');
    return `${user.charAt(0)}******@${domain}`;
  };

  if (authLoading) return <div className="p-10 text-center animate-pulse text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Portaria...</div>;

  return (
    <div className="space-y-4 text-left font-sans animate-in fade-in duration-500">
      <div className="space-y-3">
        {sortedGroups.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase italic">Nenhum cadastro encontrado.</p>
          </div>
        ) : sortedGroups.map(groupName => {
          const isForcedOpen = !!comumId;
          const isOpen = isForcedOpen ? true : openSections[groupName];
          const groupUsers = usersGrouped[groupName];

          return (
            <div key={groupName} className={`${isForcedOpen ? '' : 'bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-3'}`}>
              {!isForcedOpen && (
                <button onClick={() => toggleSection(groupName)} className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? 'bg-slate-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}><Home size={14} /></div>
                    <div className="text-left leading-none">
                      <h4 className="text-[11px] font-black uppercase italic text-slate-950">{groupName}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">{groupUsers.length} Colaboradores</p>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className={`${isForcedOpen ? 'space-y-2' : 'p-4 pt-0 space-y-2'}`}>
                      {groupUsers
                        .sort((a, b) => (a.approved === b.approved) ? 0 : a.approved ? 1 : -1)
                        .map(u => (
                        <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all text-left group">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[10px] font-black uppercase italic text-slate-950 leading-none">{u.name}</h4>
                              {!u.approved && <span className="text-[6px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded animate-pulse border border-red-100">Pendente</span>}
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{u.role} • {getNivelLabel(u)}</p>
                          </div>
                          <ChevronRight size={12} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Janela de Detalhes do Usuário */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left border-t-8 border-slate-950">
              
              <div className="flex justify-between items-start mb-6">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic mb-1 leading-none">Gestão de Portaria</p>
                  <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">{selectedUser.name}</h3>
                  <div className="flex items-center gap-2 mt-2 text-slate-400 text-[9px] font-bold lowercase">
                    <Mail size={10} /> {podeEditarEstePerfil(selectedUser) ? selectedUser.email : ofuscarEmail(selectedUser.email)}
                    {selectedUser.emailVerified && <span className="text-[7px] font-black text-emerald-500 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">Validado</span>}
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 rounded-xl text-slate-400 active:scale-90"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                   <p className="text-[8px] font-black text-slate-400 uppercase italic ml-1 leading-none">Nível Hierárquico</p>
                   <div className="grid grid-cols-1 gap-2">
                      {/* v2.5: Botões sincronizados com o motor de permissões oficial para promoção/rebaixamento */}
                      <LevelButton 
                        label="Básico (Músico / Organista)" 
                        active={selectedUser.accessLevel === ROLES.BASICO} 
                        onClick={() => handleUpdate(selectedUser.id, { accessLevel: ROLES.BASICO })} 
                        canEdit={hasPermission(userData, 'change_role', { currentRole: selectedUser.accessLevel, targetRole: ROLES.BASICO })} 
                      />
                      <LevelButton 
                        label="GEM / Local (Admin de Igreja)" 
                        active={selectedUser.accessLevel === ROLES.GEM} 
                        onClick={() => handleUpdate(selectedUser.id, { accessLevel: ROLES.GEM })} 
                        canEdit={hasPermission(userData, 'change_role', { currentRole: selectedUser.accessLevel, targetRole: ROLES.GEM })} 
                      />
                      <LevelButton 
                        label="Cidade / Regional (Admin de Cidade)" 
                        active={selectedUser.accessLevel === ROLES.CIDADE} 
                        onClick={() => handleUpdate(selectedUser.id, { accessLevel: ROLES.CIDADE })} 
                        canEdit={hasPermission(userData, 'change_role', { currentRole: selectedUser.accessLevel, targetRole: ROLES.CIDADE })} 
                      />
                      <LevelButton 
                        label="Comissão Regional" 
                        active={selectedUser.accessLevel === ROLES.COMISSAO} 
                        onClick={() => handleUpdate(selectedUser.id, { accessLevel: ROLES.COMISSAO })} 
                        canEdit={hasPermission(userData, 'change_role', { currentRole: selectedUser.accessLevel, targetRole: ROLES.COMISSAO })} 
                      />
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-tight">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1 italic">Dados do Cadastro</p>
                    <p className="text-xs font-black text-slate-950 uppercase italic">{selectedUser.role}</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase italic mt-1">{selectedUser.comum || '---'}</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {podeEditarEstePerfil(selectedUser) ? (
                    <button 
                      onClick={() => handleUpdate(selectedUser.id, { approved: !selectedUser.approved })} 
                      className={`w-full py-5 rounded-2xl font-[900] text-[10px] uppercase italic transition-all shadow-xl flex items-center justify-center gap-2 ${selectedUser.approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white'}`}
                    >
                      {selectedUser.approved ? <X size={16}/> : <Check size={16}/>}
                      {selectedUser.approved ? 'Revogar Acesso' : 'Aprovar Cadastro'}
                    </button>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100 shadow-inner">
                      <p className="text-[8px] font-black text-slate-400 uppercase italic">Visualização Apenas</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LevelButton = ({ label, active, onClick, canEdit }) => ( // Explicação: Botão de escolha de nível hierárquico.
  <button 
    disabled={!canEdit}
    onClick={onClick} 
    className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all active:scale-95 ${
      active 
      ? 'bg-slate-950 border-slate-900 text-white font-black shadow-lg shadow-slate-100' 
      : 'bg-white border-slate-100 text-slate-400'
    } ${!canEdit && 'opacity-40 cursor-not-allowed bg-slate-50'}`}
  >
    <span className="text-[9px] uppercase italic leading-none">{label}</span>
    {active && <Check size={14} className="text-amber-500" />}
  </button>
);

export default ModuleAccess; // Explicação: Exporta o módulo para ser usado no app.