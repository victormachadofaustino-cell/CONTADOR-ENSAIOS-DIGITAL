import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais de estado, monitoramento e cache do ecossistema React.
// PRESERVAÇÃO: Importações originais mantidas
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa os motores de animação fluida para abertura e fechamento de janelas.
import { X, Send, AlertTriangle, Settings, Trash2, Globe, UserPlus, Check, Search, Clock, Map } from 'lucide-react'; // Explicação: Importa o pacote de vetores visuais modernos do Lucide.
import { db, collection, query, where, onSnapshot } from '../../../config/firebase'; // Explicação: Importa os conectores de escuta em tempo real do banco Firebase.

/**
 * Componente que agrupa todos os modais da página de eventos.
 * v2.6 - PRECISION ÁREA ÚTIL EDITION: Centralização limpa com elevação via margem protetora.
 */
const EventModals = ({
  showModal, // Explicação: Estado booleano que dita se o modal de criação está aberto ou fechado.
  setShowModal, // Explicação: Função gatilho para ligar ou desligar a janela de cadastro.
  newEventDate, // Explicação: Data capturada do calendário local do formulário.
  setNewEventDate, // Explicação: Função para atualizar a data agendada.
  responsavel, // Explicação: Nome do Ancião ou encarregado responsável pelo ensaio.
  setResponsavel, // Explicação: Função para gravar o texto do responsável.
  handleCreate, // Explicação: Subrotina mestre para salvar o evento na nuvem do Firestore.
  showConfigError, // Explicação: Estado booleano que abre o alerta de orquestra ausente.
  setShowConfigError, // Explicação: Função para fechar o alerta de configuração de instrumentos.
  isGemLocal, // Explicação: Flag que identifica se o operador logado é secretário de igreja local.
  isRegionalCidade, // Explicação: Propriedade necessária para travar ou liberar os privilégios de cidade.
  userData, // Explicação: Crachá eletrônico territorial completo contendo o ID e regional do usuário.
  onNavigateToSettings, // Explicação: Rota de fuga para redirecionar o GEM Local à tela de configuração da orquestra.
  eventToDelete, // Explicação: Armazena o ID do ensaio enviado para a fila de exclusão.
  setEventToDelete, // Explicação: Função para esvaziar a fila da lixeira.
  confirmDelete, // Explicação: Subrotina que apaga fisicamente os registros e chamadas nominais do banco.
  selectedChurchId // 🚀 INJEÇÃO DE FLUXO SÊNIOR: Recebe o ID da igreja comum selecionado no cabeçalho do GPS para blindar o contador itinerante de comarcas.
}) => {
  // ESTADOS PARA CONTROLE DO ENSAIO REGIONAL
  const [scope, setScope] = useState('local'); // Explicação: Controla se o tipo de evento gerado será de escopo local ou regional.
  const [availableUsers, setAvailableUsers] = useState([]); // Explicação: Lista de obreiros aprovados da regional aptos a receber convites.
  const [invitedUsers, setInvitedUsers] = useState([]); // Explicação: Array contendo os objetos de usuários convidados de forma denormalizada.
  const [searchTerm, setSearchTerm] = useState(''); // Explicação: Texto digitado na barra de lupa de busca rápida.
  const [recentUsers, setRecentUsers] = useState([]); // Explicação: Cache local contendo as últimas cinco pílulas de convites efetuados.

  // v2.1 - Filtro de opções de escopo baseado no "Crachá" do usuário
  const optionsScope = useMemo(() => {
    const options = []; // Explicação: Inicializa um vetor vazio de opções.
    if (isGemLocal || isRegionalCidade) { // Explicação: GEM Local ou administradores de comarca podem abrir relatórios locais.
      options.push({ id: 'local', name: 'Ensaio Local (Comum)' }); // Explicação: Injeta a opção de ensaio de igreja comum.
    }
    if (isRegionalCidade) { // Explicação: Somente autoridade de nível de cidade para cima abre pílula regional.
      options.push({ id: 'regional', name: 'Ensaio Regional (Cidade/Regional)' }); // Explicação: Injeta a opção regional abrangente.
    }
    return options; // Explicação: Retorna a grade filtrada e higienizada.
  }, [isGemLocal, isRegionalCidade]); // Explicação: Recalcula se o nível de privilégio do crachá mudar.

  // JUSTIFICATIVA: Carrega os últimos convidados salvos no dispositivo para agilizar a seleção
  useEffect(() => {
    if (showModal && userData?.uid) { // Explicação: Se a janela estiver aberta e o login do usuário for válido.
      const saved = localStorage.getItem(`recent_guests_${userData.uid}`); // Explicação: Lê a memória física interna persistida no aparelho.
      if (saved) setRecentUsers(JSON.parse(saved)); // Explicação: Converte a string JSON de volta para array e joga na RAM.
    }
  }, [showModal, userData?.uid]); // Explicação: Dispara nas trocas de abertura de sessão da janela.

  // MONITOR DE USUÁRIOS DA REGIONAL PARA CONVITES (Expandido v2.2)
  useEffect(() => {
    if (!showModal || scope !== 'regional' || !userData?.regionalId) return; // Explicação: Aborta o listener se o escopo for local para economizar cota de rede.

    const q = query(
      collection(db, 'users'), // Explicação: Aponta para a coleção mestre de usuários do sistema.
      where('regionalId', '==', userData.regionalId), // Explicação: Filtra apenas os obreiros pertencentes à mesma regional.
      where('approved', '==', true) // Explicação: Exige que a conta do colaborador esteja aprovada e ativa pela comissão.
    );

    const unsub = onSnapshot(q, (snap) => { // Explicação: Abre o canal de escuta contínuo e reativo na nuvem.
      const users = snap.docs
        .map(d => ({ 
          uid: d.id, 
          name: d.data().name, 
          comum: d.data().comum,
          cidade: d.data().cidadeNome || 'Cidade não inf.',
          role: d.data().role 
        }))
        .filter(u => u.uid !== userData.uid); // Explicação: Expulsa o próprio criador da lista para ele não se convidar por erro.
      setAvailableUsers(users); // Explicação: Alimenta a esteira de busca.
    });

    return () => unsub(); // Explicação: Fecha a conexão ao fechar o modal para mitigar custos de Firestore.
  }, [showModal, scope, userData]);

  // Lógica de filtragem em tempo real (Nome ou Comum)
  const filteredUsers = availableUsers.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.comum?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // RESET DE ESTADOS AO FECHAR O MODAL
  const closeModal = () => {
    setShowModal(false); // Explicação: Fecha a cortina visual da tela.
    setScope('local'); // Explicação: Reseta o escopo padrão para o formato local seguro.
    setInvitedUsers([]); // Explicação: Esvazia o balde de convites pendentes da RAM.
    setSearchTerm(''); // Explicação: Limpa a caixa de texto da lupa.
  };

  // JUSTIFICATIVA: Implementation de Carimbagem Rica - salva objeto em vez de apenas ID
  const toggleInvitedUser = (user) => {
    setInvitedUsers(prev => {
      const isAlreadyInvited = prev.find(u => u.uid === user.uid); // Explicação: Confere se o irmão já estava marcado no balde.
      if (isAlreadyInvited) return prev.filter(u => u.uid !== user.uid); // Explicação: Se já estava marcado, remove do lote (Desmarcar).
      return [...prev, { uid: user.uid, name: user.name, comum: user.comum }]; // Explicação: Se estava ausente, anexa o objeto denormalizado com sucesso.
    });
  };

  const onConfirmAction = () => {
    if (invitedUsers.length > 0) { // Explicação: Se o lote de convites regionais possuir registros selecionados.
      const updatedRecents = [...invitedUsers, ...recentUsers] // Mescla os novos convidados com as memórias de cliques passados do aparelho.
        .filter((v, i, a) => a.findIndex(t => t.uid === v.uid) === i) // Executa uma varredura rigorosa para eliminar IDs duplicados.
        .slice(0, 5); // Separa apenas as cinco cabeças mais frescas de portaria.
      localStorage.setItem(`recent_guests_${userData?.uid}`, JSON.stringify(updatedRecents)); // Salva na memória do chip do celular.
    }

    const invitedIds = scope === 'regional' ? invitedUsers.map(u => u.uid) : []; // Explicação: Converte a malha de objetos em array simples de strings para as Security Rules lerem.

    // 🚀 BLINDAGEM DE JURISDIÇÃO ABSOLUTA: Substituído o 'userData.comumId' pelo 'selectedChurchId' dinâmico do GPS de cabeçalho, garantindo rotas preenchidas para gestores itinerantes!
    handleCreate({
      scope,
      comumId: selectedChurchId || userData?.comumId || '', // Explicação: Vincula a Comum ativa no topo do app para anular strings vazias na linha 235 do service.
      cidadeId: userData?.cidadeId || userData?.activeCityId || '', // Explicação: Garante o preenchimento absoluto do código da cidade.
      regionalId: userData?.regionalId || userData?.activeRegionalId || '', // Explicação: Garante o preenchimento absoluto do código da regional.
      invitedUsers: invitedIds // Explicação: Despacha o array limpo de IDs para gravação atômica no banco mestre.
    });

    setScope('local'); // Reseta a chave de escopo do formulário.
    setInvitedUsers([]); // Esvazia a RAM de convites.
    setSearchTerm(''); // Limpa a lupa.
  };

  return (
    <>
      <AnimatePresence>
        {/* MODAL 1: NOVO REGISTRO */}
        {showModal && (
          /* 🚀 RESTAURAÇÃO DE SEGURANÇA: Retornado rigidamente para flex items-center justify-center p-4 para cravar a cortina perfeitamente centralizada */
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto no-scrollbar text-left">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0 }} // Explicação: Abre expandindo levemente a partir do centro do visor.
              animate={{ scale: 1, opacity: 1 }} // Explicação: Estabiliza com foco perfeito de leitura.
              exit={{ scale: 0.94, opacity: 0 }} // Explicação: Encolhe suavemente ao fechar.
              /* 🚀 ELEVAÇÃO DO CENTRO UTIL: Adicionado 'mb-16 sm:mb-0' para chutar reativamente a caixa branca para cima apenas no mobile, escapando do rodapé */
              className="bg-white w-full max-w-sm rounded-[3rem] p-6 sm:p-8 shadow-2xl relative flex flex-col h-fit max-h-[75vh] sm:max-h-[85vh] border border-white/20 mb-200 sm:mb-0"
            >
              {/* Botão de Fechar com área de clique confortável */}
              <button onClick={closeModal} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all cursor-pointer">
                <X size={18}/>
              </button>
              
              <h3 className="text-xl font-[900] uppercase italic text-slate-950 mb-6 shrink-0 leading-none tracking-tighter">Novo Registro</h3>
              
              {/* Contêiner de Rolagem Interna da Ficha Técnica de Cadastro */}
              <div className="space-y-5 overflow-y-auto no-scrollbar pr-1 flex-1 min-h-0">
                {optionsScope.length > 1 && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[8px] font-black text-blue-600 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
                      <Globe size={10} /> Escopo do Evento
                    </label>
                    <select 
                      value={scope} 
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl py-4 px-4 text-xs font-black outline-none appearance-none italic uppercase shadow-sm cursor-pointer"
                    >
                      {optionsScope.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Data Agendada</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-base font-black outline-none cursor-pointer" 
                    value={newEventDate} 
                    onChange={e => setNewEventDate(e.target.value)} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Responsável / Encarregado</label>
                  <input 
                    type="text" 
                    placeholder="Nome completo" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-base font-black outline-none uppercase placeholder:text-slate-300 shadow-inner" 
                    value={responsavel} 
                    onChange={e => setResponsavel(e.target.value)} 
                  />
                </div>

                <AnimatePresence>
                  {scope === 'regional' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 pt-4 border-t border-slate-100 overflow-hidden"
                    >
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
                          <UserPlus size={10} /> Convidados (Regional)
                        </label>
                        <span className="text-[7px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Filtro Amplo</span>
                      </div>

                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                        <input 
                          type="text"
                          placeholder="BUSCAR POR NOME, CIDADE OU COMUM..."
                          className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-9 pr-4 text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-blue-200 transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                        {searchTerm === '' && recentUsers.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[7px] font-black text-blue-500 uppercase mb-2 ml-1 flex items-center gap-1">
                              <Clock size={8} /> Seleção Recente
                            </p>
                            {recentUsers.map(u => (
                              <button 
                                type="button"
                                key={`recent-${u.uid}`} 
                                onClick={() => toggleInvitedUser(u)}
                                className={`w-full p-3 rounded-xl border flex items-center justify-between mb-1 transition-all cursor-pointer ${invitedUsers.find(i => i.uid === u.uid) ? 'bg-slate-950 border-slate-900 text-white shadow-md' : 'bg-blue-50/50 border-blue-100 text-slate-500'}`}
                              >
                                <div className="text-left leading-none">
                                  <p className="text-[10px] font-black uppercase italic">{u.name}</p>
                                  <p className="text-[6px] font-bold uppercase mt-1 opacity-60">{u.comum}</p>
                                </div>
                                {invitedUsers.find(i => i.uid === u.uid) && <Check size={14} className="text-amber-500" />}
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredUsers.length === 0 && searchTerm !== '' ? (
                          <p className="text-[9px] font-bold text-slate-300 uppercase italic p-4 text-center">Nenhum resultado encontrado</p>
                        ) : filteredUsers.map(user => (
                          <button 
                            type="button"
                            key={user.uid} 
                            onClick={() => toggleInvitedUser(user)}
                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${invitedUsers.find(i => i.uid === user.uid) ? 'bg-slate-950 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}
                          >
                            <div className="text-left leading-none">
                              <p className="text-[10px] font-black uppercase italic">{user.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Map size={6} className={invitedUsers.find(i => i.uid === user.uid) ? 'text-blue-400' : 'text-slate-300'} />
                                <p className={`text-[7px] font-bold uppercase ${invitedUsers.find(i => i.uid === user.uid) ? 'text-blue-400' : 'text-slate-300'}`}>
                                  {user.cidade} • {user.comum}
                                </p>
                              </div>
                            </div>
                            {invitedUsers.find(i => i.uid === user.uid) && <Check size={14} className="text-amber-500" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Botão de Rodapé fixado e travado contra esmagamentos */}
              <button 
                onClick={onConfirmAction} 
                className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 active:scale-95 shadow-xl mt-4 transition-all border border-white/10 shrink-0 cursor-pointer"
              >
                <Send size={16}/> Confirmar Agenda
              </button>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: ORQUESTRA AUSENTE */}
        {showConfigError && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto no-scrollbar text-center">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.94, opacity: 0 }}
              /* 🚀 FIX: Injetado mb-16 para elevar o modal de erro acima do menu preto do rodapé */
              className="bg-white w-full max-w-[320px] rounded-[3rem] p-8 sm:p-10 shadow-2xl relative border border-slate-100 my-auto mb-200 sm:mb-0"
            >
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-4 tracking-tighter leading-none">Orquestra Ausente</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-8">Esta localidade ainda não possui uma orquestra configurada. É necessário definir os instrumentos antes de agendar ensaios.</p>
              
              <div className="space-y-3 shrink-0">
                {isGemLocal && (
                  <button 
                    onClick={() => { setShowConfigError(false); onNavigateToSettings(); }} 
                    className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Settings size={16} /> Configurar Agora
                  </button>
                )}
                <button onClick={() => setShowConfigError(false)} className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest cursor-pointer">Entendido</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO */}
        {eventToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto no-scrollbar text-center">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.94, opacity: 0 }}
              /* 🚀 FIX DE EXCLUSÃO: Injetado mb-200 para empurrar o botão vermelho 'Sim, Remover Agora' inteiramente para fora da zona morta da barra de navegação */
              className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative border border-slate-100 my-auto mb-200 sm:mb-0"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-[900] uppercase italic text-slate-950 tracking-tighter leading-tight">Remover Agenda?</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-6 leading-relaxed">Todos os dados e contagens deste ensaio serão permanentemente excluídos da jurisdição.</p>
              
              <div className="flex flex-col gap-2 shrink-0">
                <button 
                  onClick={confirmDelete} 
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-100 cursor-pointer"
                >
                  Sim, Remover Agora
                </button>
                <button 
                  onClick={() => setEventToDelete(null)} 
                  className="w-full py-3 font-black uppercase text-[9px] text-slate-300 tracking-widest cursor-pointer"
                >
                  Manter Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EventModals; // Explicação: Exporta o painel modular de modais com alinhamento e centralização elástica ancorados estritamente na janela física visível.