import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import { db, collection, doc, setDoc, deleteDoc, writeBatch, getDocs, onSnapshot, query, where } from '../../config/firebase'; // Explicação: Conecta com os motores de consulta, lote e documentos específicos do Firebase.
import toast from 'react-hot-toast'; // Explicação: Importa o sistema de avisos flutuantes e alertas de sucesso ou erro na tela.
import { Activity, Plus, Trash2, X, Edit3, ChevronDown, Music, AlertTriangle } from 'lucide-react'; // Explicação: Ícones imutáveis e limpos para ilustrar as famílias de instrumentos.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Ferramenta para criar as animações físicas de abertura e fechamento de naipes.
import { useAuth } from '../../context/AuthContext'; // Explicação: Importa o sistema de identidade para ler o Crachá Eletrônico do usuário logado.

const ModuleOrchestra = ({ comumId, instrumentsData = [] }) => { // Explicação: Inicia o componente da Orquestra recebendo os instrumentos ativos injetados pelo pai.
  const { userData } = useAuth(); // Explicação: Puxa as informações do usuário logado através do contexto de autenticação.
  const level = userData?.accessLevel; // Explicação: Lê o cargo de autoridade gravado no Crachá Eletrônico do usuário.
  const isMaster = level === 'master'; // Explicação: Verifica se o usuário é o criador/administrador supremo do sistema.
  const isComissao = isMaster || level === 'comissao'; // Explicação: Define se o usuário pertence à comissão técnica regional de música.
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Explicação: Define se o usuário tem poder para gerenciar uma cidade inteira.
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Explicação: Define se o usuário é um secretário de igreja comum local.

  const [showModal, setShowModal] = useState(null); // Explicação: Caixa de memória para gerenciar a abertura das janelas de Adicionar ou Editar Instrumento.
  const [openSection, setOpenSection] = useState(null); // Explicação: Controla qual Naipe (família instrumental) está aberto na tela de visualização por extenso.
  const [formData, setFormData] = useState({ name: '', section: 'CORDAS', evalType: 'Sem', id: '' }); // Explicação: Memória temporária para armazenar os campos digitados no formulário.
  const [isEnsaioAberto, setIsEnsaioAberto] = useState(false); // Explicação: Trava de segurança automática que impede alterações se o ensaio estiver rodando ao vivo.

  useEffect(() => { // Explicação: Monitor reativo que vigia se existe uma contagem em andamento para congelar a edição.
    if (!comumId) return; // Explicação: Se o código identificador da igreja estiver ausente, interrompe a escuta reativa.
    const q = query(collection(db, 'events_global'), where('comumId', '==', comumId), where('ata.status', '==', 'open')); // Explicação: Procura se há ensaios com status "open" rodando na nuvem agora.
    const unsub = onSnapshot(q, (snapshot) => { // Explicação: Escuta reativa em tempo real para capturar fechamento ou aberturas rápidas de atas.
      setIsEnsaioAberto(!snapshot.empty); // Explicação: Se a busca trouxer atas abertas, ativa o congelamento do painel.
    }); // Explicação: Fecha o laço da escuta.
    return () => unsub(); // Explicação: Desliga a escuta ao fechar o modal autônomo.
  }, [comumId]); // Explicação: Executa novamente se o ID da igreja mudar de contexto.

  const ordemSessoes = ['CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'ORGANISTAS', 'IRMANDADE', 'GERAL']; // Explicação: Ordem padrão oficial e por extenso exigida para a separação estética das famílias musicais.

  const sectionsFound = useMemo(() => { // Explicação: Processa e agrupa quais naipes existem na lista de instrumentos atual fornecida pela nuvem.
    const secoes = [...new Set(instrumentsData.map(i => i.section?.toUpperCase()))].filter(Boolean); // Explicação: Varre o cadastro de instrumentos coletando as famílias e limpando chaves duplicadas ou nulas.
    return secoes.sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99)); // Explicação: Organiza os blocos da tela seguindo rigidamente o peso do vetor oficial.
  }, [instrumentsData]); // Explicação: Atualiza os blocos apenas se a lista de instrumentos mudar de estado físico.

  // --- 🚀 CORREÇÃO DA TRANCA VISUAL: AUTONOMIA DO GEM LOCAL AMARRADA TERRITORIALMENTE ---
  const podeGerenciar = useMemo(() => { // Explicação: Mapeamento de Privilégios: Cruza os dados do crachá eletrônico para liberar ou congelar os switches de cliques.
    if (isMaster || isComissao) return true; // Explicação: Nível master e comissão musical ganham passe livre global.
    if (level === 'regional_cidade') return userData?.cidadeId === userData?.activeCityId; // Explicação: Administradores de cidade validam se a comarca coincide com a deles.
    if (level === 'gem_local') { // Explicação: Regra de ouro da comum: Libera os botões de ligar/desligar se for a igreja do chip dele.
      const minhaComumLegitima = userData?.comumId || userData?.activeComumId; // Explicação: Descobre o ID da igreja de direito do secretário local.
      return minhaComumLegitima === comumId; // Explicação: Retorna verdadeiro apenas se corresponder à sua própria localidade de cadastro.
    }
    return false; // Explicação: Perfis de consulta básica são bloqueados de alteração por padrão.
  }, [isMaster, isComissao, level, userData, comumId]); // Explicação: Recalcula a tranca visual apenas se o crachá ou o ID da igreja ativa mudarem.

  const handleToggleActive = async (instrument) => { // Explicação: Aciona a inversão da chave magnética liga/desliga de ativação do instrumento na comum.
    if (!podeGerenciar) return toast.error("Seu crachá não possui privilégios de gestão para esta localidade."); // Explicação: Trava visual defensiva.
    if (isEnsaioAberto) return toast.error("Ação Bloqueada: Existe um ensaio ativo computando dados no momento."); // Explicação: Trava de integridade de dados.
    
    try {
      const docRef = doc(db, 'comuns', comumId, 'instrumentos_config', instrument.id); // Explicação: Localiza a vaga física do instrumento na pasta privada da igreja comuns.
      await setDoc(docRef, { 
        id: instrument.id,
        name: instrument.name,
        section: instrument.section,
        evalType: instrument.evalType || 'Sem',
        active: !instrument.active, // Explicação: Inverte o estado booleano atual de ligado para desligado e vice-versa.
        updatedAt: Date.now() 
      }, { merge: true }); // Explicação: Mescla as chaves no banco de dados sem apagar propriedades nativas vizinhas.
      toast.success(`${instrument.name} atualizado por extenso!`); // Explicação: Emite balão flutuante de sucesso.
    } catch (e) {
      toast.error("Erro ao alterar status do instrumento."); // Explicação: Avisa se houver erro de rede.
    }
  };

  const handleInsertPattern = async () => { // Explicação: Restaura em lote toda a grade oficial de instrumentos da Matriz Nacional CCB.
    if (!comumId || !podeGerenciar) return toast.error("Operação não autorizada para o seu nível de acesso."); // Explicação: Trava defensiva de portaria.
    if (isEnsaioAberto) return toast.error("Bloqueado: Feche o ensaio em andamento antes de redefinir a grade."); // Explicação: Trava de barreira operacional.
    
    if (!window.confirm("Deseja aplicar o RESET DE FÁBRICA? Isso substituirá a lista atual pelo Padrão CCB oficial por extenso.")) return; // Explicação: Caixa de auditoria manual de segurança do navegador.

    const loadingToast = toast.loading("Sincronizando instrumentos com a Matriz Nacional..."); // Explicação: Inicia indicador de carregamento fixo na tela.
    const batch = writeBatch(db); // Explicação: Cria uma esteira de execução em lote para economizar processamento.
    const localRef = collection(db, 'comuns', comumId, 'instrumentos_config'); // Explicação: Endereço do armário de instrumentos da igreja.

    try {
      const nationalSnap = await getDocs(collection(db, 'config_instrumentos_nacional')); // Explicação: Vai até a nuvem capturar o catálogo oficial nacional de fábrica da CCB.
      if (nationalSnap.empty) { // Explicação: Proteção se a coleção mestre nacional sumir por acidente do servidor.
        toast.dismiss(loadingToast); // Limpa a tela.
        return toast.error("Matriz de referência nacional não localizada."); // Aborta o processo.
      }

      const localSnap = await getDocs(localRef); // Explicação: Lê a grade local bagunçada antiga.
      localSnap.docs.forEach(d => batch.delete(doc(db, 'comuns', comumId, 'instrumentos_config', d.id))); // Explicação: Insere comandos de exclusão de todas as linhas locais na esteira do lote.

      nationalSnap.docs.forEach(docInst => { // Explicação: Passa instrumento por instrumento inserindo comandos de escrita limpa na esteira de gravação.
        const data = docInst.data(); // Captura as propriedades nacionais.
        const docRef = doc(localRef, docInst.id); // Constrói a ID extensa estável saneada.
        batch.set(docRef, { // Monta o payload de fábrica ligado por padrão.
          id: docInst.id,
          name: (data.name || docInst.id).toUpperCase(),
          section: (data.section || 'GERAL').toUpperCase(),
          evalType: data.evalType || 'Sem',
          active: true, // Explicação: Ativa a grade inteira no reset padrão de fábrica conforme o modelo original.
          updatedAt: Date.now() 
        });
      });

      await batch.commit(); // Explicação: Envia o pacote lacrado para gravação atômica instantânea na nuvem com economia de internet!
      toast.success("Grade Padrão CCB Instalada por Extenso!", { id: loadingToast }); // Alerta o sucesso.
    } catch (e) {
      toast.error("Erro ao restaurar padrão de fábrica.", { id: loadingToast }); // Trata erros.
    }
  };

  const handleSaveInstrument = async () => { // Explicação: Cria um instrumento local customizado ou grava as alterações de nomenclatura feitas pelo gestor.
    if (!formData.name.trim() || !formData.section) return toast.error("Preencha o nome por extenso e a família instrumental!"); // Trava de barreira.
    const instrumentId = formData.id || formData.name.trim().toLowerCase().replace(/\s+/g, ''); // Explicação: Gera uma ID compacta sem espaços vazios se for item inédito.

    try {
      const docRef = doc(db, 'comuns', comumId, 'instrumentos_config', instrumentId); // Localiza a vaga no banco.
      await setDoc(docRef, { // Registra ou updates a ficha cadastral do instrumento na comum.
        id: instrumentId,
        name: formData.name.trim().toUpperCase(),
        section: formData.section.toUpperCase(),
        evalType: formData.evalType,
        active: true, // Inicializa ligado.
        updatedAt: Date.now()
      }, { merge: true }); // Mescla de forma segura.

      toast.success("Instrumento gravado com sucesso!"); // Alerta sucesso.
      setShowModal(null); // Fecha a janela flutuante.
    } catch (e) {
      toast.error("Erro ao salvar instrumento customizado."); // Trata erro de rede.
    }
  };

  const handleDeleteCustom = async (id) => { // Explicação: Remove permanentemente um instrumento customizado adicionado pelo secretário local.
    if (isEnsaioAberto) return toast.error("Bloqueado: Existe uma ata de ensaio aberta."); // Trava de integridade de contagem.
    if (!window.confirm("Deseja realmente remover este instrumento da sua comum?")) return; // Pergunta de segurança.

    try {
      await deleteDoc(doc(db, 'comuns', comumId, 'instrumentos_config', id)); // Dispara o comando de lixeira no Firebase.
      toast.success("Instrumento excluído."); // Alerta o sucesso.
    } catch (e) {
      toast.error("Erro ao remover registro."); // Trata erro.
    }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      
      {/* BOTÕES ADMINISTRATIVOS SUPERIORES COMPACTOS (ÁREA DE CLIQUE DE NO MÍNIMO 44PX) */}
      {podeGerenciar && ( // Explicação: O botão de criar instrumento local e reset agora herdam a permissão reativa liberada para o GEM Local!
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <button 
            type="button" // Explicação: Garante o comportamento do elemento como gatilho comum sem reload de página.
            onClick={() => { setFormData({ name: '', section: 'CORDAS', evalType: 'Sem', id: '' }); setShowModal('add'); }} // Limpa o formulário e abre a janela flutuante de criação.
            className="flex-1 min-h-[44px] bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm shadow-indigo-100 outline-none cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} /> Criar Instrumento Local
          </button>
          <button 
            type="button"
            onClick={handleInsertPattern} // Dispara o motor de reset em lote na esteira atômica.
            className="flex-1 min-h-[44px] bg-white hover:bg-slate-50 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200 shadow-2xs outline-none cursor-pointer"
          >
            <Activity size={14} className="text-amber-500" strokeWidth={2.5} /> Reset Padrão Oficial
          </button>
        </div>
      )}

      {/* PAINEL DE ALERTA DE LOCK DE ATA */}
      {isEnsaioAberto && (
        <div className="bg-rose-50 border border-rose-100 text-rose-900 p-4 rounded-2xl flex gap-3 items-start animate-premium">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold leading-relaxed uppercase whitespace-normal text-left">
            <span className="font-black">Grade Temporariamente Congelada:</span> Existe uma ata de ensaio aberta recebendo coletas numéricas neste momento. Encerre o ensaio para liberar as chaves magnéticas.
          </p>
        </div>
      )}

      {/* EXIBIÇÃO DE NAIPES EM PAINÉIS COMPACTOS SEM RETICÊNCIAS */}
      <div className="space-y-2">
        {sectionsFound.map(sectionName => {
          const isSectionOpen = openSection === sectionName;
          const instDoNaipe = instrumentsData.filter(i => i.section?.toUpperCase() === sectionName);

          return (
            <div key={sectionName} className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs overflow-hidden">
              <button 
                type="button"
                onClick={() => setOpenSection(isSectionOpen ? null : sectionName)} // Alterna a sanfona entre recolhida ou expandida por extenso.
                className="w-full p-4 flex justify-between items-center outline-none active:bg-slate-50/50 min-h-[44px] cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-400 shrink-0"><Music size={14} /></div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider italic whitespace-normal break-words leading-none text-left">{sectionName}</h4>
                  <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">{instDoNaipe.length}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${isSectionOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSectionOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 bg-slate-50/20"
                  >
                    <div className="p-3 space-y-2">
                      {instDoNaipe.map(inst => (
                        <div key={inst.id} className="bg-white p-3.5 rounded-xl border border-slate-200/50 flex items-center justify-between shadow-3xs gap-3">
                          <div className="min-w-0 flex-1 text-left leading-tight whitespace-normal break-words"> {/* Exibição textual por extenso sem cortes */}
                            <p className="text-[11.5px] font-black text-slate-900 uppercase italic leading-snug whitespace-normal break-words text-left">{inst.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 text-left">Ficha Técnica Exame: {inst.evalType || 'Sem'}</p>
                          </div>
                          
                          <div className="flex items-center gap-2.5 shrink-0">
                            {podeGerenciar && !isEnsaioAberto && ( // Filtro reativo que acende as canetas de edições para o GEM Local legítimo.
                              <div className="flex gap-0.5 border-r border-slate-100 pr-1.5">
                                <button 
                                  type="button"
                                  onClick={() => { setFormData({ name: inst.name, section: inst.section,  evalType: inst.evalType || 'Sem', id: inst.id }); setShowModal('edit'); }} // Carrega a ficha na janela flutuante para alteração.
                                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteCustom(inst.id)} // Aciona remoção se for item adicionado avulso.
                                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-600 transition-colors rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}

                            {/* CHAVE MAGNÉTICA LIGA/DESLIGA (CONFORTO MOBILE DE 44PX TOTALMENTE DESBLOQUEADO PARA O SEU ACESSO GEM) */}
                            <button
                              type="button"
                              disabled={!podeGerenciar || isEnsaioAberto} // Chave fica cinza e inativa se for usuário de fora ou ensaio em andamento.
                              onClick={() => handleToggleActive(inst)} // Dispara a inversão magnética reativa do switch.
                              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 cursor-pointer outline-none min-h-[36px] ${inst.active ? 'bg-emerald-500 shadow-3xs' : 'bg-slate-200'}`}
                            >
                              <div className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-300 ${inst.active ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* JANELA FLUTUANTE MODAL: ADICIONAR / EDITAR INSTRUMENTO REGIONAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in navigate-fade duration-200">
            <motion.div 
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              className="bg-white rounded-[2.2rem] w-full max-w-xs p-6 shadow-2xl text-left border border-slate-100"
            >
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2.5 text-left">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider italic text-left">
                  {showModal === 'add' ? 'Adicionar Instrumento Novo' : 'Ajustar Cadastro Ficha'}
                </h3>
                <button onClick={() => setShowModal(null)} className="w-8 h-8 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center outline-none cursor-pointer">
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-indigo-600 uppercase tracking-widest pl-0.5 text-left">Nome Instrumental por Extenso</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-black text-slate-900 outline-none uppercase italic min-h-[44px]"
                    placeholder="EX: VIOLONCELO, CLARINETE..."
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-indigo-600 uppercase tracking-widest pl-0.5 text-left">Naipe / Agrupamento</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-black text-slate-900 outline-none min-h-[44px] appearance-none cursor-pointer uppercase italic"
                      value={formData.section}
                      onChange={e => setFormData(prev => ({ ...prev, section: e.target.value }))}
                    >
                      {ordemSessoes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[7.5px] font-black text-indigo-600 uppercase tracking-widest pl-0.5 text-left">Metodologia de Avaliação Coletada</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-black text-slate-900 outline-none min-h-[44px] appearance-none cursor-pointer uppercase italic"
                      value={formData.evalType}
                      onChange={e => setFormData(prev => ({ ...prev, evalType: e.target.value }))}
                    >
                      <option value="Sem">SEM EXAME COLETADO (PRESENÇA NOMINAL)</option>
                      <option value="Encarregado">ENCARREGADO MUSICAL LOCAL</option>
                      <option value="Examinadora">EXAMINADORA DE ÓRGÃO DO GRUPO</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6 border-t border-slate-100 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="flex-1 min-h-[40px] bg-slate-100 font-black text-slate-400 rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 outline-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleSaveInstrument} // Executa a gravação da ficha.
                  className="flex-1 min-h-[40px] bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-indigo-100 outline-none cursor-pointer"
                >
                  Gravar Ficha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuleOrchestra;