import React, { useState, useEffect, useMemo } from "react"; // Explicação: Importa as ferramentas de estado e memória do React.
// PRESERVAÇÃO: Importações originais mantidas
import {
  db,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
} from "../../../shared/api/firebase"; // Explicação: Conecta com o Firebase para gerenciar usuários.
import toast from "react-hot-toast"; // Explicação: Avisos de sucesso/erro na tela.
import {
  ShieldCheck,
  Globe,
  Map,
  Home,
  X,
  ChevronRight,
  User,
  ShieldAlert,
  Mail,
  Shield,
  Eye,
  ChevronDown,
  Check,
  AlertTriangle,
} from "lucide-react"; // Explicação: Ícones visuais para a portaria.
import { motion, AnimatePresence } from "framer-motion";
// Importação do Cérebro de Autenticação para validar jurisdição
import { useAuth } from "../../../app/providers/AuthContext"; // Explicação: Puxa o crachá de quem está operando a portaria.
// v2.5: Importação do motor de permissões para validar promoção e rebaixamento
import { hasPermission, ROLES } from "../../../shared/config/permissions"; // Explicação: Importa a Regra de Ouro do sistema.

const ModuleAccess = ({ comumId, cargos }) => {
  // Explicação: Inicia o módulo de controle de acesso.
  const { userData, user, loading: authLoading } = useAuth(); // Explicação: Pega os dados do gestor logado.
  const userEmail = user?.email;

  // NOVA LÓGICA DE NÍVEIS (v2.2 - Estabilizada)
  const level = userData?.accessLevel;
  const isMaster = level === "master";
  const isComissao = isMaster || level === "comissao";
  const isRegionalCidade = isComissao || level === "regional_cidade";
  const isGemLocal = isRegionalCidade || level === "gem_local";

  const [users, setUsers] = useState([]); // Explicação: Lista de usuários que aparecem para aprovação.
  const [selectedUser, setSelectedUser] = useState(null); // Explicação: Usuário clicado para ver detalhes.
  const [openSections, setOpenSections] = useState({}); // Explicação: Controla quais igrejas estão abertas na lista.

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId; // Explicação: Define a região de trabalho.

  // 1. MONITOR DE USUÁRIOS COM QUERY ATÔMICA (Economia de Cota)
  useEffect(() => {
    // Explicação: Vigia a lista de usuários respeitando o limite geográfico.
    if (authLoading || !userData) return; // Explicação: Interrompe se o sistema ainda estiver carregando.

    let isMounted = true; // Explicação: Controle para evitar vazamento de memória no componente.
    const qBase = collection(db, "users"); // Explicação: Aponta para a coleção de usuários no banco.
    let qUsers; // Explicação: Inicializa a variável que guardará a consulta filtrada.

    // Matriz de visibilidade conforme Jurisdição Territorial
    if ((isMaster || isComissao) && activeRegionalId) {
      // Explicação: Master/Comissão veem todos da regional selecionada.
      qUsers = query(qBase, where("regionalId", "==", activeRegionalId)); // Explicação: Busca usuários da mesma regional administrativa.
    } else if (isRegionalCidade && userData.cidadeId) {
      // Explicação: Regional de Cidade vê os usuários de sua cidade. O filtro por comum é feito no useMemo.
      qUsers = query(
        qBase,
        where("cidadeId", "==", userData.cidadeId), // Explicação: Busca cirúrgica restringindo apenas ao ID da própria cidade do gestor.
      );
    } else if (isGemLocal && comumId) {
      // Explicação: GEM Local (Secretário) vê apenas os usuários da sua própria igreja, usando o ID da comum ativa na tela.
      qUsers = query(qBase, where("comumId", "==", comumId));
    } else {
      // Explicação: Básico não vê ninguém (apenas ele mesmo se necessário).
      qUsers = query(qBase, where("email", "==", userEmail)); // Explicação: Filtra estritamente pelo e-mail do próprio usuário básico.
    }

    if (!qUsers) {
      // Se nenhuma query pôde ser construída (ex: aguardando IDs), mostra apenas o usuário logado.
      setUsers(userData ? [{ id: user?.uid, ...userData }] : []);
      return;
    }

    const unsubUsers = onSnapshot(
      qUsers,
      (s) => {
        // Explicação: Escuta em tempo real as atualizações dessa lista no banco de dados.
        if (!isMounted) return; // Explicação: Cancela o processamento caso o usuário tenha saído da tela.
        let allUsers = s.docs.map((d) => ({ id: d.id, ...d.data() })); // Explicação: Converte os documentos brutos do banco em objetos legíveis.

        const jaNaLista = allUsers.some((u) => u.id === user?.uid); // Explicação: Confere se o próprio gestor logado já está nessa lista capturada.
        if (!jaNaLista && userData) {
          // Explicação: Se o próprio gestor não estiver na lista:
          allUsers = [{ id: user?.uid, ...userData }, ...allUsers]; // Explicação: Adiciona a ficha dele no topo para evitar inconsistências.
        } // Explicação: Fim da checagem de auto-inclusão.
        setUsers(allUsers); // Explicação: Alimenta o estado com a lista final de usuários mapeados.
      },
      (err) => {
        // Explicação: Captura falhas ou desautorizações da portaria do banco.
        console.error("Erro na portaria:", err.message); // Explicação: Registra o erro detalhado no console do navegador.
        if (isMounted) setUsers([{ id: user?.uid, ...userData }]); // Explicação: Em caso de falha, exibe apenas o próprio perfil logado por segurança.
      },
    ); // Explicação: Encerra a escuta em tempo real do Firestore.

    return () => {
      isMounted = false;
      unsubUsers();
    }; // Explicação: Limpa o monitor e desativa o canal quando a tela é fechada.
  }, [authLoading, activeRegionalId, userData, userEmail, user?.uid, comumId]); // Explicação: Dependências que reiniciam o efeito se mudarem.

  const usersGrouped = useMemo(() => {
    // Explicação: Organiza os usuários por nome da igreja na lista.
    const filteredUsers = comumId // Explicação: Checa se foi passado um filtro específico de igreja comum.
      ? users.filter((u) => u.comumId === comumId) // Explicação: Filtra os usuários mantendo apenas os da igreja selecionada.
      : users; // Explicação: Caso contrário, mantém a lista completa de usuários acessíveis.

    return filteredUsers.reduce((acc, user) => {
      // Explicação: Agrupa a lista criando gavetas para cada nome de igreja.
      const key = user.comum || "Sem Localidade"; // Explicação: Usa o nome carimbado da comum ou a etiqueta padrão de segurança.
      if (!acc[key]) acc[key] = []; // Explicação: Se a gaveta dessa igreja ainda não existir, cria uma nova.
      acc[key].push(user); // Explicação: Guarda o usuário dentro da gaveta da respectiva igreja dele.
      return acc; // Explicação: Retorna o agrupamento atualizado para o próximo item do laço.
    }, {}); // Explicação: Inicializa o acumulador como um objeto vazio.
  }, [users, comumId]); // Explicação: Recalcula a memória apenas se a lista ou o filtro mudarem.

  const sortedGroups = Object.keys(usersGrouped).sort(); // Explicação: Coloca as igrejas em ordem alfabética.

  const toggleSection = (group) => {
    // Explicação: Abre/fecha a sanfona da igreja.
    setOpenSections((prev) => ({ ...prev, [group]: !prev[group] })); // Explicação: Inverte o estado de abertura da gaveta clicada.
  }; // Explicação: Encerra a função toggleSection.

  const getNivelLabel = (u) => {
    // Explicação: Transforma o cargo técnico em nome bonito na tela.
    const l = u.accessLevel; // Explicação: Captura o nível técnico salvo no documento do usuário.
    if (l === "master") return "Master Root"; // Explicação: Se for master, exibe o rótulo de administrador supremo.
    if (l === "comissao") return "Comissão Regional"; // Explicação: Se for comissao, exibe o rótulo da comissão regional.
    if (l === "regional_cidade") return "Regional de Cidade"; // Explicação: Se for regional_cidade, exibe o encarregado municipal.
    if (l === "gem_local") return "GEM / Local"; // Explicação: Se for gem_local, exibe o secretário de igreja comum.
    return "Básico"; // Explicação: Padrão retorna o nível inicial básico de músico ou organista.
  }; // Explicação: Encerra a função getNivelLabel.

  // REGRA DE OURO: Validação de Matriz de Aprovação Territorial (Sincronizada v2.5)
  const podeEditarEstePerfil = (u) => {
    // Explicação: Decide se você tem poder para abrir a edição deste perfil.
    if (isMaster) return true; // Explicação: Master edita qualquer um.
    if (u.id === user?.uid) return false; // Explicação: Ninguém altera as próprias permissões.

    if (isComissao && u.accessLevel !== "master") return true; // Explicação: Comissão edita todos abaixo de Master.

    if (isRegionalCidade && u.cidadeId === userData.cidadeId) {
      // Explicação: Regional edita quem for da cidade dele.
      return u.accessLevel !== "master" && u.accessLevel !== "comissao"; // Explicação: Impede o regional de tocar em perfis superiores.
    }

    if (isGemLocal && u.comumId === userData.comumId) {
      // Explicação: GEM edita quem for da comum dele.
      return (
        u.accessLevel !== "master" &&
        u.accessLevel !== "comissao" &&
        u.accessLevel !== "regional_cidade"
      ); // Explicação: Impede o GEM de alterar gestores municipais ou superiores.
    }

    return false; // Explicação: Padrão é não ter permissão.
  }; // Explicação: Encerra a função podeEditarEstePerfil.

  const handleUpdate = async (userId, data) => {
    // Explicação: Envia a aprovação ou troca de nível para o banco.
    try {
      // Explicação: Inicia bloco de tentativa de gravação.
      await updateDoc(doc(db, "users", userId), data); // Explicação: Executa a atualização do documento do usuário alvo no Firestore.
      toast.success("Zeladoria updated"); // Explicação: Dispara aviso flutuante de sucesso na tela.
      if (data.accessLevel) setSelectedUser(null); // Explicação: Se trocou o cargo, fecha o painel de detalhes para atualizar os estados.
    } catch (e) {
      // Explicação: Captura qualquer barreira da portaria física do Firestore.
      console.error("FALHA PORTARIA:", e); // Explicação: Imprime a pilha de erros técnica no console do navegador.
      toast.error("Sem permissão hierárquica."); // Explicação: Informa visualmente o usuário leigo que a portaria barrou a gravação.
    } // Explicação: Encerra o bloco catch.
  }; // Explicação: Encerra a função handleUpdate.

  const ofuscarEmail = (email) => {
    // Explicação: Esconde parte do e-mail por privacidade.
    if (!email) return ""; // Explicação: Devolve texto vazio caso o e-mail não exista.
    const [user, domain] = email.split("@"); // Explicação: Divide o e-mail em nome de usuário e domínio de internet.
    return `${user.charAt(0)}******@${domain}`; // Explicação: Mantém apenas a primeira letra visível omitindo o restante do nome por segurança.
  }; // Explicação: Encerra a função ofuscarEmail.

  if (authLoading)
    return (
      <div className="p-10 text-center animate-pulse text-[10px] font-black uppercase text-slate-400 tracking-widest">
        Sincronizando Portaria...
      </div>
    ); // Explicação: Carregamento preventivo.

  return (
    // Explicação: Inicia a renderização do layout visual HTML/React.
    <div className="space-y-4 text-left font-sans animate-in fade-in duration-500">
      <div className="space-y-3">
        {sortedGroups.length === 0 ? ( // Explicação: Avalia se existem igrejas válidas mapeadas para exibição.
          <div className="p-10 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase italic">
              Nenhum cadastro encontrado.
            </p>
          </div>
        ) : (
          sortedGroups.map((groupName) => {
            // Explicação: Inicia o mapeamento vertical percorrendo cada igreja comum.
            const isForcedOpen = !!comumId; // Explicação: Se houver filtro externo por ID, força a expansão das gavetas.
            const isOpen = isForcedOpen ? true : openSections[groupName]; // Explicação: Define se a gaveta da igreja está aberta ou recolhida.
            const groupUsers = usersGrouped[groupName]; // Explicação: Captura os irmãos associados à igreja atual.

            return (
              // Explicação: Retorna o layout de cartões organizados de cada congregação.
              <div
                key={groupName}
                className={`${isForcedOpen ? "" : "bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-3"}`}
              >
                {!isForcedOpen && ( // Explicação: Renderiza o cabeçalho expansível apenas se não houver trava de filtro.
                  <button
                    onClick={() => toggleSection(groupName)}
                    className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? "bg-slate-50/50" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${isOpen ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400"}`}
                      >
                        <Home size={14} />
                      </div>
                      <div className="text-left leading-none">
                        <h4 className="text-[11px] font-black uppercase italic text-slate-950">
                          {groupName}
                        </h4>
                        <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">
                          {groupUsers.length} Colaboradores
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                )}

                <AnimatePresence>
                  {isOpen && ( // Explicação: Abre as fichas internas caso a gaveta da igreja esteja ativa.
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`${isForcedOpen ? "space-y-2" : "p-4 pt-0 space-y-2"}`}
                      >
                        {groupUsers
                          .sort((a, b) =>
                            a.approved === b.approved ? 0 : a.approved ? 1 : -1,
                          ) // Explicação: Ordena colocando os pendentes de aprovação no topo da lista.
                          .map(
                            (
                              u, // Explicação: Mapeia cada usuário transformando-o em um cartão vertical de toque de 44px.
                            ) => (
                              <button
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className="w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all text-left group"
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-[10px] font-black uppercase italic text-slate-950 leading-none">
                                      {u.name}
                                    </h4>
                                    {!u.approved && (
                                      <span className="text-[6px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded animate-pulse border border-red-100">
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none">
                                    {u.role} • {getNivelLabel(u)}
                                  </p>
                                </div>
                                <ChevronRight
                                  size={12}
                                  className="text-slate-200 group-hover:text-blue-500 transition-colors"
                                />
                              </button>
                            ),
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Janela de Detalhes do Usuário */}
      <AnimatePresence>
        {selectedUser && ( // Explicação: Renderiza o painel flutuante (Modal) de detalhes ao clicar em um irmão.
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left border-t-8 border-slate-950"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic mb-1 leading-none">
                    Gestão de Portaria
                  </p>
                  <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">
                    {selectedUser.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-slate-400 text-[9px] font-bold lowercase">
                    <Mail size={10} />{" "}
                    {podeEditarEstePerfil(selectedUser)
                      ? selectedUser.email
                      : ofuscarEmail(selectedUser.email)}
                    {selectedUser.emailVerified && (
                      <span className="text-[7px] font-black text-emerald-500 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                        Validado
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 bg-slate-100 rounded-xl text-slate-400 active:scale-90"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase italic ml-1 leading-none">
                    Nível Hierárquico
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {/* v2.5: Botões sincronizados com o motor de permissões oficial para promoção/rebaixamento com trava de segurança geográfica */}
                    <LevelButton
                      label="Básico (Músico / Organista)"
                      active={selectedUser.accessLevel === ROLES.BASICO}
                      onClick={() =>
                        handleUpdate(selectedUser.id, {
                          accessLevel: ROLES.BASICO,
                        })
                      }
                      canEdit={
                        podeEditarEstePerfil(selectedUser) &&
                        hasPermission(userData, "change_role", {
                          currentRole: selectedUser.accessLevel,
                          targetRole: ROLES.BASICO,
                        })
                      }
                    />
                    <LevelButton
                      label="GEM / Local (Admin de Igreja)"
                      active={selectedUser.accessLevel === ROLES.GEM}
                      onClick={() =>
                        handleUpdate(selectedUser.id, {
                          accessLevel: ROLES.GEM,
                        })
                      }
                      canEdit={
                        podeEditarEstePerfil(selectedUser) &&
                        hasPermission(userData, "change_role", {
                          currentRole: selectedUser.accessLevel,
                          targetRole: ROLES.GEM,
                        })
                      }
                    />
                    <LevelButton
                      label="Cidade / Regional (Admin de Cidade)"
                      active={selectedUser.accessLevel === ROLES.CIDADE}
                      onClick={() =>
                        handleUpdate(selectedUser.id, {
                          accessLevel: ROLES.CIDADE,
                        })
                      }
                      canEdit={
                        podeEditarEstePerfil(selectedUser) &&
                        hasPermission(userData, "change_role", {
                          currentRole: selectedUser.accessLevel,
                          targetRole: ROLES.CIDADE,
                        })
                      }
                    />
                    <LevelButton
                      label="Comissão Regional"
                      active={selectedUser.accessLevel === ROLES.COMISSAO}
                      onClick={() =>
                        handleUpdate(selectedUser.id, {
                          accessLevel: ROLES.COMISSAO,
                        })
                      }
                      canEdit={
                        podeEditarEstePerfil(selectedUser) &&
                        hasPermission(userData, "change_role", {
                          currentRole: selectedUser.accessLevel,
                          targetRole: ROLES.COMISSAO,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-tight">
                  <p className="text-[7px] font-black text-slate-400 uppercase mb-1 italic">
                    Dados do Cadastro
                  </p>
                  <p className="text-xs font-black text-slate-950 uppercase italic">
                    {selectedUser.role}
                  </p>
                  <p className="text-[9px] font-black text-blue-600 uppercase italic mt-1">
                    {selectedUser.comum || "---"}
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {podeEditarEstePerfil(selectedUser) ? ( // Explicação: Bloqueia visualmente o clique se o usuário alvo violar a barreira geográfica ou de poder.
                    <button
                      onClick={() =>
                        handleUpdate(selectedUser.id, {
                          approved: !selectedUser.approved,
                        })
                      }
                      className={`w-full py-5 rounded-2xl font-[900] text-[10px] uppercase italic transition-all shadow-xl flex items-center justify-center gap-2 ${selectedUser.approved ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-950 text-white"}`}
                    >
                      {selectedUser.approved ? (
                        <X size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                      {selectedUser.approved
                        ? "Revogar Acesso"
                        : "Aprovar Cadastro"}
                    </button>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100 shadow-inner">
                      <p className="text-[8px] font-black text-slate-400 uppercase italic">
                        Visualização Apenas
                      </p>
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

const LevelButton = (
  { label, active, onClick, canEdit }, // Explicação: Botão de escolha de nível hierárquico.
) => (
  <button
    disabled={!canEdit} // Explicação: Desativa nativamente a interatividade do botão caso as regras territoriais impeçam a edição.
    onClick={onClick} // Explicação: Dispara a alteração do nível do usuário ao ser clicado.
    className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all active:scale-95 ${
      active
        ? "bg-slate-950 border-slate-900 text-white font-black shadow-lg shadow-slate-100"
        : "bg-white border-slate-100 text-slate-400"
    } ${!canEdit && "opacity-40 cursor-not-allowed bg-slate-50"}`} // Explicação: Estiliza o botão esmaecido e com cursor bloqueado se canEdit for falso.
  >
    <span className="text-[9px] uppercase italic leading-none">{label}</span>
    {active && <Check size={14} className="text-amber-500" />}
  </button>
);

export default ModuleAccess; // Explicação: Exporta o módulo para ser usado no app.
