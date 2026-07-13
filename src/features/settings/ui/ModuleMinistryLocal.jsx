import React, { useState, useEffect, useMemo } from "react"; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import {
  db,
  collection,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
} from "../../../shared/api/firebase"; // Explicação: Importa os motores de conexão em tempo real com o banco de dados Firebase.
import {
  Shield,
  Lock,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  UserCheck,
  ChevronDown,
} from "lucide-react"; // Explicação: CORREÇÃO: Adicionado o ícone ChevronDown na lista de importações oficiais.
import { useAuth } from "../../../app/providers/AuthContext"; // Explicação: Importa o sistema de identidade para ler o Crachá Eletrônico do usuário logado.
import { motion, AnimatePresence } from "framer-motion"; // Explicação: Importa as ferramentas responsáveis por criar transições e animações suaves na tela.
import toast from "react-hot-toast"; // Explicação: Importa o sistema de avisos e alertas flutuantes de sucesso ou erro na tela.

const ModuleMinistryLocal = ({ comumId }) => {
  // Explicação: Inicia a construção do submódulo de Ministério Local recebendo a ID da igreja ativa.
  const { userData } = useAuth(); // Explicação: Puxa as informações de identidade do usuário logado através do contexto de autenticação.

  const [ministerio, setMinisterio] = useState([]); // Explicação: Estado que armazena a lista de obreiros cadastrados na comum.
  const [loading, setLoading] = useState(true); // Explicação: Controla o estado de carregamento dos dados da subcoleção.
  const [newMin, setNewMin] = useState({ nome: "", cargo: "" }); // Explicação: Memória temporária para os campos de criação de um novo obreiro.

  // 🚀 NOVOS ESTADOS ADICIONADOS PARA COMPACTAÇÃO EM MODAL PREMIUM
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Explicação: Estado booleano que controla se a janela popup de cadastro de obreiro está aberta ou fechada.

  // Estados para Controle de Modais Internos de Edição e Exclusão
  const [editingMin, setEditingMin] = useState(null); // Explicação: Armazena o obreiro que está sendo editado no momento.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Explicação: Controla a visibilidade do modal de edição.
  const [deletingMin, setDeletingMin] = useState(null); // Explicação: Armazena o obreiro que está na fila de exclusão.

  // --- MATRIZ DE PODER PRESERVADA E BLINDADA VIA CRACHÁ ELETRÔNICO ---
  const temPoderEdicao = useMemo(() => {
    // Explicação: Valida de forma soberana se o usuário tem o direito legal de alterar o ministério desta comum.
    const level = userData?.accessLevel; // Explicação: Pega o cargo de autoridade gravado no crachá.
    const isMaster = level === "master"; // Explicação: Verifica se é o criador supremo.
    const isComissao = isMaster || level === "comissao"; // Explicação: Verifica se é da comissão musical.
    const isRegionalCidade = level === "regional_cidade"; // Explicação: Verifica se é gestor regional de cidade.
    const isGemLocal = level === "gem_local"; // Explicação: Verifica se é secretário local.

    if (isMaster || isComissao) return true; // Explicação: Master e Comissão alteram qualquer localidade.
    if (isRegionalCidade) return userData?.cidadeId === userData?.activeCityId; // Explicação: Administrador de cidade edita se pertencer à sua jurisdição.

    return isGemLocal && userData?.comumId === comumId; // Explicação: Secretário local só edita se for estritamente a igreja do crachá dele.
  }, [userData, comumId]); // Explicação: Lista de dependências da memorização RAM.

  const cargosOrdem = [
    // Explicação: Ordem oficial e hierárquica por extenso exigida para a triagem e exibição do Ministério Local.
    "Ancião",
    "Diácono",
    "Cooperador do Ofício",
    "Cooperador RJM",
    "Encarregado Regional",
    "Examinadora",
    "Encarregado Local",
  ]; // Explicação: Fim da lista de hierarquia.

  // Listener reativo isolado para a subcoleção de Ministério
  useEffect(() => {
    // Explicação: Escuta em tempo real os obreiros desta igreja comuns apenas quando o modal está aberto.
    if (!comumId) return; // Explicação: Aborta se o ID da igreja comuns não estiver preenchido.
    setLoading(true); // Explicação: Ativa o indicador visual de carregamento.

    const subColecaoRef = collection(db, "comuns", comumId, "ministerio_lista"); // Explicação: Aponta para a subcoleção interna da comum no Firestore.

    const unsubMin = onSnapshot(
      subColecaoRef,
      (snapshot) => {
        // Explicação: Sincroniza em tempo real as adições, edições ou exclusões.
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })); // Explicação: Varre os documentos do banco e converte em objetos JavaScript legíveis.

        // Ordenação hierárquica baseada no peso do vetor cargosOrdem
        lista.sort((a, b) => {
          // Explicação: Compara os cargos de dois obreiros na fila.
          const pesoA = cargosOrdem.indexOf(a.cargo); // Explicação: Acha a posição da função do obreiro A na lista hierárquica.
          const pesoB = cargosOrdem.indexOf(b.cargo); // Explicação: Acha a posição da função do obreiro B na lista hierárquica.
          return (pesoA === -1 ? 99 : pesoA) - (pesoB === -1 ? 99 : pesoB); // Explicação: Retorna a subtração dos pesos jogando itens desconhecidos para trás.
        }); // Explicação: Fim do bloco ordenador.

        setMinisterio(lista); // Explicação: Salva a lista ordenada na memória do componente.
        setLoading(false); // Explicação: Desativa o indicador de carregamento.
      },
      (error) => {
        // Explicação: Captura erros da conexão em tempo real de forma segura.
        setLoading(false); // Explicação: Desativa o loading em caso de falha de permissão.
      },
    ); // Explicação: Encerra a escuta reativa do Firestore.

    return () => unsubMin(); // Explicação: Limpa o ouvinte ao fechar o modal, protegendo as cotas do Firebase.
  }, [comumId]); // Explicação: Dispara se o código da igreja for alterado no GPS superior.

  const handleInsertMinisterio = async () => {
    // Explicação: Função responsável por injetar um novo membro no Corpo Ministerial.
    if (!newMin.nome.trim() || !newMin.cargo)
      return toast.error("Preencha o nome completo e o cargo!"); // Explicação: Verifica se os campos obrigatórios estão preenchidos.
    if (!temPoderEdicao)
      return toast.error("Seu crachá não autoriza escritas nesta comum."); // Explicação: Barra a gravação se o usuário não possuir a caneta de escrita.

    try {
      // Explicação: Inicia o bloco de tentativa de conexão com o banco de dados na nuvem.
      const subColecaoRef = collection(
        db,
        "comuns",
        comumId,
        "ministerio_lista",
      ); // Explicação: Localiza a rota física da subcoleção.
      await addDoc(subColecaoRef, {
        // Explicação: Envia o comando assíncrono para incluir o documento na nuvem.
        nome: newMin.nome.trim().toUpperCase(), // Explicação: Força a gravação padronizada em caixa alta.
        cargo: newMin.cargo, // Explicação: Grava a função eclesiástica selecionada.
        updatedAt: Date.now(), // Explicação: Carimba a marca de tempo do milissegundo exato do cadastro.
      }); // Explicação: Fim da inclusão.
      setNewMin({ nome: "", cargo: "" }); // Explicação: Reseta os campos do formulário local.
      setIsAddModalOpen(false); // 🚀 FECHAMENTO ERGONÔMICO: Fecha o modal popup automaticamente após salvar o novo obreiro com sucesso.
      toast.success("Membro adicionado ao Ministério Local!"); // Explicação: Emite um alerta flutuante verde de sucesso.
    } catch (err) {
      // Explicação: Captura falhas de conexão de rede ou interrupções do banco.
      toast.error("Falha ao salvar obreiro."); // Explicação: Emite um alerta flutuante vermelho de falha.
    } // Explicação: Encerra o tratamento catch.
  }; // Explicação: Encerra a função handleInsertMinisterio.

  const handleSaveEdit = async () => {
    // Explicação: Grava as alterações feitas no obreiro que estava em edição.
    if (!editingMin?.nome.trim() || !editingMin?.cargo)
      return toast.error("Preencha todos os campos!"); // Explicação: Trava defensiva sanitária.
    try {
      // Explicação: Tenta atualizar os dados na nuvem.
      const docRef = doc(
        db,
        "comuns",
        comumId,
        "ministerio_lista",
        editingMin.id,
      ); // Explicação: Mira no documento exclusivo daquele obreiro.
      await updateDoc(docRef, {
        // Explicação: Grava os campos atualizados no Firestore.
        nome: editingMin.nome.trim().toUpperCase(), // Explicação: Limpa espaços em branco e força caixa alta.
        cargo: editingMin.cargo, // Explicação: Grava o novo cargo editado.
        updatedAt: Date.now(), // Explicação: Atualiza a marca de tempo de modificação.
      }); // Explicação: Fim do comando de update.
      setIsEditModalOpen(false); // Explicação: Fecha o modal de edição flutuante.
      setEditingMin(null); // Explicação: Esvazia o cache do obreiro que estava em edição.
      toast.success("Dados do obreiro atualizados!"); // Explicação: Alerta de sucesso.
    } catch (err) {
      // Explicação: Pega erros de internet.
      toast.error("Erro ao atualizar obreiro."); // Explicação: Alerta de erro.
    } // Explicação: Fim do catch.
  }; // Explicação: Encerra a função handleSaveEdit.

  const handleConfirmDelete = async () => {
    // Explicação: Remove em definitivo o obreiro do banco de dados após a confirmação.
    if (!deletingMin || !comumId) return; // Explicação: Barreira sanitária de validação.
    try {
      // Explicação: Tenta remover o registro do banco de dados.
      await deleteDoc(
        doc(db, "comuns", comumId, "ministerio_lista", deletingMin.id),
      ); // Explicação: Deleta permanentemente o documento físico do Firestore.
      toast.success("Membro removido do Ministério Local."); // Explicação: Emite notificação de sucesso.
      setDeletingMin(null); // Explicação: Fecha a janela de confirmação de exclusão.
    } catch (err) {
      // Explicação: Pega falhas.
      toast.error("Erro ao remover obreiro."); // Explicação: Emite aviso de erro.
    } // Fim do catch.
  }; // Explicação: Encerra a função handleConfirmDelete.

  const handleEditClick = (m) => {
    // Explicação: Função auxiliar que injeta o obreiro selecionado no estado de edição and abre o modal correspondente.
    setEditingMin({ ...m }); // Explicação: Clona os dados do irmão em cache temporário.
    setIsEditModalOpen(true); // Explicação: Abre a janela flutuante de ajustes.
  }; // Explicação: Encerra a função handleEditClick.

  if (loading)
    return (
      // Explicação: Renderiza um esqueleto de carregamento compacto e limpo.
      <div className="py-10 flex flex-col items-center justify-center gap-2">
        {" "}
        {/* Explicação: Caixa centralizada com margens confortáveis. */}
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>{" "}
        {/* Explicação: Anel azul giratório de alta performance. */}
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
          Sincronizando Ministério...
        </p>{" "}
        {/* Explicação: Rótulo explicativo do boot. */}
      </div> // Explicação: Fecha a caixinha de loading.
    ); // Explicação: Fim da barreira de loading.

  return (
    // Explicação: Inicia a renderização estrutural da interface visual.
    <div className="space-y-4 text-left pb-10 font-sans relative">
      {/* INDICADOR DE PERMISSÃO COMPACTO */}
      <div
        className={`p-3.5 rounded-2xl flex items-center gap-3 border ${temPoderEdicao ? "bg-blue-50/60 border-blue-100" : "bg-amber-50/60 border-amber-100"}`}
      >
        {temPoderEdicao ? (
          <Shield size={15} className="text-blue-600 shrink-0" />
        ) : (
          <Lock size={15} className="text-amber-600 shrink-0" />
        )}
        <div className="leading-tight text-left">
          <p
            className={`text-[9px] font-black uppercase italic ${temPoderEdicao ? "text-blue-600" : "text-amber-600"}`}
          >
            {temPoderEdicao
              ? "Modo de Gestão Ministerial Ativo"
              : "Acesso Limitado: Consulta"}
          </p>
          <p className="text-[7px] font-bold text-slate-400 uppercase">
            Alterações impactam diretamente as listagens de atas
          </p>
        </div>
      </div>

      {/* 🚀 BOTÃO ÚNICO DE INSERÇÃO COMPACTO DE MERCADO (h-11 ERGONÔMICO E LIMPO) */}
      {temPoderEdicao && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full h-11 bg-indigo-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-100 active:scale-95 transition-all cursor-pointer pt-0.5"
        >
          <Plus size={14} strokeWidth={3} /> Adicionar Novo Obreiro Local
        </button>
      )}

      {/* LISTA COMPLETA POR EXTENSO: Exibição inteira sem cortes e com foco total no Corpo Ministerial */}
      <div className="space-y-2">
        <div className="px-1.5 flex flex-col text-left">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">
            Membros Registrados ({ministerio.length})
          </span>
        </div>

        {ministerio.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">
              Nenhum obreiro cadastrado nesta comum.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ministerio.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-200/60 shadow-3xs gap-3 text-left"
              >
                <div className="leading-tight text-left flex-1 min-w-0 pr-4 whitespace-normal break-words">
                  <p className="text-[7.5px] font-black text-indigo-600 uppercase tracking-widest italic">
                    {m.cargo || "SEM CARGO DEFINIDO"}
                  </p>
                  <p className="text-[11.5px] font-black text-slate-900 uppercase italic mt-1 leading-snug whitespace-normal break-words">
                    {m.nome || "SEM NOME REGISTRADO"}
                  </p>
                </div>

                {temPoderEdicao && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditClick(m)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all min-h-[36px]"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => setDeletingMin(m)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all min-h-[36px]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 MODAL INTERNO AUTO-SUPORTADO PREMIUM: FORMULÁRIO DE CADASTRO DE NOVO OBREIRO */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 10 }}
              className="relative w-full max-w-xs bg-white rounded-[2.2rem] p-6 shadow-2xl border border-slate-100 text-left"
            >
              <div className="flex justify-between items-center mb-5 border-b border-slate-50 pb-2.5">
                <h3 className="text-[10px] font-black uppercase italic text-slate-950 tracking-wider">
                  Adicionar Novo Obreiro
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3.5 text-left">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Nome Completo do Irmão (Sem Abreviações)
                  </label>
                  <input
                    type="text"
                    placeholder="NOME DO MINISTÉRIO POR EXTENSO"
                    className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px]"
                    value={newMin.nome}
                    onChange={(e) =>
                      setNewMin({ ...newMin, nome: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Função / Ministério Eclesiástico
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-[10px] border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] appearance-none cursor-pointer"
                      value={newMin.cargo}
                      onChange={(e) =>
                        setNewMin({ ...newMin, cargo: e.target.value })
                      }
                    >
                      <option value="">SELECIONE O MINISTÉRIO...</option>
                      {cargosOrdem.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-4 top-3.5 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleInsertMinisterio}
                  className="w-full h-11 bg-indigo-600 text-white rounded-xl font-black uppercase italic text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 pt-0.5 mt-2"
                >
                  <Plus size={13} strokeWidth={3} /> Salvar no Corpo Ministerial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL INTERNO AUTO-SUPORTADO: EDIÇÃO DE MEMBRO */}
      <AnimatePresence>
        {isEditModalOpen && editingMin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 10 }}
              className="relative w-full max-w-xs bg-white rounded-[2.2rem] p-6 shadow-2xl border border-slate-100 text-left"
            >
              <div className="flex justify-between items-center mb-5 border-b border-slate-50 pb-2.5">
                <h3 className="text-[10px] font-black uppercase italic text-slate-950 tracking-wider">
                  Ajustar Cadastro de Obreiro
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3.5 text-left">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Nome por Extenso
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px]"
                    value={editingMin.nome}
                    onChange={(e) =>
                      setEditingMin({ ...editingMin, nome: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Ministério
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-[10px] border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] appearance-none"
                      value={editingMin.cargo}
                      onChange={(e) =>
                        setEditingMin({ ...editingMin, cargo: e.target.value })
                      }
                    >
                      {cargosOrdem.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-4 top-3.5 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveEdit}
                  className="w-full h-11 bg-slate-950 text-white rounded-xl font-black uppercase italic text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 pt-0.5 mt-2"
                >
                  <Save size={13} /> Gravar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL INTERNO AUTO-SUPORTADO: CONFIRMAÇÃO DE EXCLUSÃO CRISTALINA */}
      <AnimatePresence>
        {deletingMin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingMin(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl text-center border border-slate-100"
            >
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs font-black text-slate-950 uppercase italic leading-tight mb-2">
                Remover do Ministério?
              </h3>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase leading-relaxed mb-6 whitespace-normal px-1">
                Você está prestes a descadastrar o irmão{" "}
                <span className="text-slate-950 italic font-black">
                  "{deletingMin.nome}"
                </span>{" "}
                da lista oficial desta comum. Esta operação apagará os registros
                vinculados.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleConfirmDelete}
                  className="w-full h-11 bg-red-600 text-white rounded-xl font-black uppercase italic text-[10px] shadow-md shadow-red-100 active:scale-95 transition-all pt-0.5"
                >
                  Confirmar Exclusão Definitiva
                </button>
                <button
                  onClick={() => setDeletingMin(null)}
                  className="w-full h-10 bg-slate-100 text-slate-400 rounded-xl font-black uppercase italic text-[10px] active:scale-95 transition-all"
                >
                  Cancelar e Manter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuleMinistryLocal;
