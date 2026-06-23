import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import { db, collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc } from '../../config/firebase'; // Explicação: Importa os motores de conexão em tempo real com o banco de dados Firebase.
import { Shield, Lock, Plus, Trash2, Edit3, X, Save, Contact, Music, ChevronDown } from 'lucide-react'; // Explicação: Importa o pacote de ícones modernos e visuais para ilustrar os botões e menus do aplicativo.
import { useAuth } from '../../context/AuthContext'; // Explicação: Importa o sistema de identidade para ler o Crachá Eletrônico do usuário logado.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Biblioteca de animações físicas para gerar transições premium de mercado.
import toast from 'react-hot-toast'; // Explicação: Importa o sistema de balões de aviso flutuantes de sucesso ou erro na tela.

const ModuleOrchestraBody = ({ comumId, instrumentsData = [] }) => { // Explicação: Inicia o componente do Corpo Orquestral recebendo a ID da igreja e os instrumentos que ela ativou.
  const { userData } = useAuth(); // Explicação: Puxa as informações de identidade de quem está logado no sistema agora.
  
  const [musicos, setMusicos] = useState([]); // Explicação: Armário de memória que guarda a lista de músicos fixos da comum.
  const [loading, setLoading] = useState(true); // Explicação: Controla o indicador de carregamento della subcoleção de pessoas.
  const [newMusico, setNewMin] = useState({ nome: '', instrumentoId: '', situacao: '' }); // Explicação: Memória temporária para o formulário de cadastro de um novo músico.
  
  // Estados para Controle de Modais Internos de Edição e Exclusão
  const [editingMusico, setEditingMusico] = useState(null); // Explicação: Armazena o músico selecionado para alteração.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Explicação: Controla a visibilidade da janela de edição.
  const [deletingMusico, setDeletingMusico] = useState(null); // Explicação: Armazena o músico que está na fila de exclusão.

  // --- MATRIZ DE PODER PRESERVADA E BLINDADA VIA CRACHÁ ELETRÔNICO ---
  const temPoderEdicao = useMemo(() => { // Explicação: Valida de forma soberana se o usuário tem o direito legal de alterar os músicos desta comum.
    const level = userData?.accessLevel;
    const isMaster = level === 'master';
    const isComissao = isMaster || level === 'comissao';
    const isRegionalCidade = level === 'regional_cidade';
    const isGemLocal = level === 'gem_local';

    if (isMaster || isComissao) return true; // Explicação: Master e Comissão alteram qualquer localidade.
    if (isRegionalCidade) return userData?.cidadeId === userData?.activeCityId; // Explicação: Administrador de cidade edita se pertencer à sua jurisdição.
    
    return isGemLocal && userData?.comumId === comumId; // Explicação: Secretário local só edita se for estritamente a igreja do crachá dele.
  }, [userData, comumId]);

  // Lista fixa de situações operacionais da CCB para triagem
  const situacoesOficiais = ['Oficializado', 'RJM (Jovens)', 'Aluno / Aprendiz']; 

  const ordemSessoesDefinidas = ['CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'ORGANISTAS', 'IRMANDADE', 'GERAL']; // Explicação: Vetor fixo de referência para ordenar as divisórias de naipes no menu suspenso.

  // Mapeia e organiza os instrumentos ativos por NAIPES no Dropdown removendo o CORAL
  const instrumentosAgrupados = useMemo(() => { // Explicação: Filtra os instrumentos ativos, expulsa o Coral e monta um dicionário dividido por famílias ordenadas.
    const filtrados = [...instrumentsData].filter(i => i.active && i.name?.toUpperCase() !== 'CORAL');
    
    const dicionario = {}; // Explicação: Cria um armário vazio para agrupar as listas de instrumentos por naipe.
    filtrados.forEach(inst => {
      const naipe = inst.section?.toUpperCase() || 'GERAL';
      if (!dicionario[naipe]) dicionario[naipe] = [];
      dicionario[naipe].push(inst);
    });

    // Ordena alfabeticamente os instrumentos dentro de cada naipe
    Object.keys(dicionario).forEach(naipe => {
      dicionario[naipe].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Retorna as chaves ordenadas com base no peso do vetor de sessões oficiais
    return Object.keys(dicionario).sort((a, b) => {
      const pesoA = ordemSessoesDefinidas.indexOf(a);
      const pesoB = ordemSessoesDefinidas.indexOf(b);
      return (pesoA === -1 ? 99 : pesoA) - (pesoB === -1 ? 99 : pesoB);
    }).map(naipe => ({
      naipe: naipe,
      itens: dicionario[naipe]
    }));
  }, [instrumentsData]);

  // Busca plana simplificada para resolver carimbos rápidos de nomes em cadastros
  const instrumentosDisponiveisPlano = useMemo(() => { // Explicação: Cria uma lista reta para agilizar buscas rápidas de IDs na hora de salvar o formulário.
    return [...instrumentsData].filter(i => i.active);
  }, [instrumentsData]);

  // Listener reativo isolado para a subcoleção de Músicos
  useEffect(() => { // Explicação: Escuta em tempo real os músicos desta comum apenas quando este modal está aberto na tela.
    if (!comumId) return;
    setLoading(true);

    const subColecaoRef = collection(db, 'comuns', comumId, 'musicos_lista'); // Explicação: Mira na subcoleção de músicos dentro da igreja ativa.
    
    const unsubMusicos = onSnapshot(subColecaoRef, (snapshot) => { // Explicação: Sincroniza adições, edições e remoções de forma instantânea.
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordenação alfabética pelo nome do músico por padrão de mercado
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
      
      setMusicos(lista); // Explicação: Salva os músicos ordenados na memória.
      setLoading(false); // Explicação: Desliga o esqueleto de carregamento.
    }, (error) => {
      setLoading(false); // Explicação: Desativa o loading em caso de falha de segurança.
    });

    return () => unsubMusicos(); // Explicação: Limpa o ouvinte ao fechar o modal, protegendo o limite de leituras do Firestore.
  }, [comumId]);

  const handleInsertMusico = async () => { // Explicação: Injeta um novo músico na base de dados da igreja atual.
    if (!newMusico.nome.trim() || !newMusico.instrumentoId || !newMusico.situacao) {
      return toast.error("Preencha o nome completo, selecione o instrumento e a situação!");
    }
    if (!temPoderEdicao) return toast.error("Seu crachá não autoriza gravações nesta localidade.");

    // Descobre o nome do instrumento para carimbagem (Denormalização Preventiva contra consultas externas)
    const instAlvo = instrumentosDisponiveisPlano.find(i => i.id === newMusico.instrumentoId);

    try {
      const subColecaoRef = collection(db, 'comuns', comumId, 'musicos_lista');
      await addDoc(subColecaoRef, { 
        nome: newMusico.nome.trim().toUpperCase(), // Explicação: Padroniza o nome do irmão em caixa alta.
        instrumentoId: newMusico.instrumentoId,
        instrumentoNome: instAlvo?.name || 'GERAL', // Explicação: Carimba o nome do instrumento no registro para evitar getDoc() no futuro.
        situacao: newMusico.situacao,
        updatedAt: Date.now() 
      });
      setNewMin({ nome: '', instrumentoId: '', situacao: '' }); // Explicação: Limpa os campos do formulário para o próximo cadastro.
      toast.success("Músico cadastrado no Corpo Orquestral!");
    } catch (err) { 
      toast.error("Falha ao salvar músico."); 
    }
  };

  const handleSaveEdit = async () => { // Explicação: Salva as alterações feitas no registro do músico.
    if (!editingMusico?.nome.trim() || !editingMusico?.instrumentoId || !editingMusico?.situacao) {
      return toast.error("Preencha todos os campos da ficha!");
    }
    const instAlvo = instrumentosDisponiveisPlano.find(i => i.id === editingMusico.instrumentoId);

    try {
      const docRef = doc(db, 'comuns', comumId, 'musicos_lista', editingMusico.id);
      await updateDoc(docRef, {
        nome: editingMusico.nome.trim().toUpperCase(),
        instrumentoId: editingMusico.instrumentoId,
        instrumentoNome: instAlvo?.name || 'GERAL', // Explicação: Atualiza a carimbagem denormalizada.
        situacao: editingMusico.situacao,
        updatedAt: Date.now()
      });
      setIsEditModalOpen(false);
      setEditingMusico(null);
      toast.success("Ficha do músico updated!");
    } catch (err) {
      toast.error("Erro ao atualizar dados do músico.");
    }
  };

  const handleConfirmDelete = async () => { // Explicação: Deleta permanentemente o músico da lista nominal.
    if (!deletingMusico || !comumId) return;
    try {
      await deleteDoc(doc(db, 'comuns', comumId, 'musicos_lista', deletingMusico.id));
      toast.success("Músico removido do Corpo Orquestral.");
      setDeletingMusico(null);
    } catch (err) {
      toast.error("Erro ao remover músico.");
    }
  };

  if (loading) return ( // Explicação: Tela de carregamento compacta em spinner.
    <div className="py-10 flex flex-col items-center justify-center gap-2">
      <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Sincronizando Lista de Músicos...</p>
    </div>
  );

  return (
    <div className="space-y-6 text-left pb-10 font-sans">
      
      {/* INDICADOR DE ACESSO GEOGRÁFICO */}
      <div className={`p-3.5 rounded-2xl flex items-center gap-3 border ${temPoderEdicao ? 'bg-blue-50/60 border-blue-100' : 'bg-amber-50/60 border-amber-100'}`}>
          {temPoderEdicao ? <Shield size={15} className="text-blue-600 shrink-0" /> : <Lock size={15} className="text-amber-600 shrink-0" />}
          <div className="leading-tight text-left">
            <p className={`text-[9px] font-black uppercase italic ${temPoderEdicao ? 'text-blue-600' : 'text-amber-600'}`}>
                {temPoderEdicao ? 'Modo de Escrita Liberado' : 'Acesso Limitado: Apenas Consulta'}
            </p>
            <p className="text-[7px] font-bold text-slate-400 uppercase">Estes nomes aparecerão na lista de chamada do ensaio</p>
          </div>
      </div>

      {/* FORMULÁRIO DE SELEÇÃO E INSERÇÃO COMPACTO (44PX) */}
      {temPoderEdicao && (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/50 space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <Contact size={13} className="text-indigo-600 shrink-0" />
            <p className="text-[9px] font-black text-slate-950 uppercase tracking-wider italic">Alistar Novo Músico Local</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Nome Completo do Músico (Exibição sem cortes)</label>
              <input type="text" placeholder="NOME COMPLETO DO IRMÃO POR EXTENSO" className="w-full bg-white p-3.5 rounded-xl font-black text-slate-950 text-xs border border-slate-200 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] whitespace-normal break-words" value={newMusico.nome} onChange={e => setNewMin({...newMusico, nome: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Dropdown de Instrumentos ativos AGRUPADOS POR NAIPES EXCLUSIVO NATIVO */}
              <div className="flex flex-col gap-1">
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Instrumento Cadastrado</label>
                <div className="relative">
                  <select className="w-full bg-white p-3.5 rounded-xl font-black text-slate-950 text-[10px] border border-slate-200 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] appearance-none cursor-pointer" value={newMusico.instrumentoId} onChange={e => setNewMin({...newMusico, instrumentoId: e.target.value})}>
                      <option value="">INSTRUMENTO...</option>
                      {instrumentosAgrupados.map(grupo => (
                        <optgroup key={grupo.naipe} label={`── ${grupo.naipe} ──`} className="text-slate-400 font-bold bg-slate-50">
                          {grupo.itens.map(i => (
                            <option key={i.id} value={i.id} className="text-slate-900 font-black">{i.name}</option>
                          ))}
                        </optgroup>
                      ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Dropdown de Situação da CCB */}
              <div className="flex flex-col gap-1">
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Categoria / Situação</label>
                <div className="relative">
                  <select className="w-full bg-white p-3.5 rounded-xl font-black text-slate-950 text-[10px] border border-slate-200 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] appearance-none cursor-pointer" value={newMusico.situacao} onChange={e => setNewMin({...newMusico, situacao: e.target.value})}>
                      <option value="">SITUAÇÃO...</option>
                      {situacoesOficiais.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <button onClick={handleInsertMusico} className="w-full h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase italic text-[10px] tracking-wider shadow-md shadow-indigo-100 active:scale-[0.98] transition-all pt-0.5 mt-1">
              <Plus size={14} strokeWidth={2.5}/> Alistar Músico ao Corpo Fixo
            </button>
          </div>
        </div>
      )}

      {/* CARDS VERTICAIS SEM CORTE TEXTUAL (...) */}
      <div className="space-y-2">
        <div className="px-1.5 flex flex-col text-left">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Corpo Orquestral Alistado ({musicos.length})</span>
        </div>

        {musicos.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Nenhum músico alistado nesta igreja comum.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {musicos.map((m) => (
              <div key={m.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-200/60 shadow-xs gap-3">
                <div className="leading-tight text-left flex-1 min-w-0 pr-1 whitespace-normal break-words"> {/* Exibição por extenso sem elipses (...) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[7.5px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md uppercase italic flex items-center gap-1"><Music size={8}/> {m.instrumentoNome || 'GERAL'}</span>
                    <span className="text-[7.5px] font-black text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase italic">{m.situacao || 'OFF'}</span>
                  </div>
                  <p className="text-[11.5px] font-black text-slate-900 uppercase italic mt-1.5 leading-snug whitespace-normal break-words">{m.nome || 'SEM NOME REGISTRADO'}</p>
                </div>
                
                {temPoderEdicao && ( // Controle ergonômico de 44px para cliques no celular
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditingMusico(m); setIsEditModalOpen(true); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all min-h-[36px]">
                        <Edit3 size={13}/>
                      </button>
                      <button onClick={() => setDeletingMusico(m)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all min-h-[36px]">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL INTERNO AUTO-SUPORTADO: EDIÇÃO DE IRMÃO */}
      <AnimatePresence>
        {isEditModalOpen && editingMusico && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 10 }} className="relative w-full max-w-xs bg-white rounded-[2.2rem] p-6 shadow-2xl border border-slate-100 text-left">
              <div className="flex justify-between items-center mb-5 border-b border-slate-50 pb-2.5">
                <h3 className="text-[10px] font-black uppercase italic text-slate-950 tracking-wider">Ajustar Ficha de Alistamento</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><X size={14}/></button>
              </div>
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Nome Completo</label>
                  <input type="text" className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px]" value={editingMusico.nome} onChange={e => setEditingMusico({...editingMusico, nome: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Instrumento</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-[10px] border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] appearance-none" value={editingMusico.instrumentoId} onChange={e => setEditingMusico({...editingMusico, instrumentoId: e.target.value})}>
                      {instrumentosAgrupados.map(grupo => (
                        <optgroup key={grupo.naipe} label={`── ${grupo.naipe} ──`} className="text-slate-500 font-bold bg-slate-100">
                          {grupo.itens.map(i => (
                            <option key={i.id} value={i.id} className="text-slate-900 font-black">{i.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Categoria / Situação</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-slate-950 text-[10px] border border-slate-100 uppercase italic outline-none focus:border-indigo-600 min-h-[44px] appearance-none" value={editingMusico.situacao} onChange={e => setEditingMusico({...editingMusico, situacao: e.target.value})}>
                      {situacoesOficiais.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <button onClick={handleSaveEdit} className="w-full h-11 bg-slate-950 text-white rounded-xl font-black uppercase italic text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 pt-0.5 mt-2">
                  <Save size={13} /> Gravar Alterações na Ficha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL INTERNO AUTO-SUPORTADO: CONFIRMAÇÃO DE EXCLUSÃO */}
      <AnimatePresence>
        {deletingMusico && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingMusico(null)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} className="relative w-full max-w-xs bg-white rounded-[2.2rem] p-8 shadow-2xl text-center border border-slate-100">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs font-black text-slate-950 uppercase italic leading-tight mb-2">Remover do Corpo Orquestral?</h3>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase leading-relaxed mb-6 whitespace-normal px-1">
                Você está prestes a descadastrar o irmão <span className="text-slate-950 italic font-black">"{deletingMusico.nome}"</span> da lista de chamada oficial desta igreja comuns. Esta operação limpará o alistamento dele.
              </p>
              <div className="space-y-2">
                <button onClick={handleConfirmDelete} className="w-full h-11 bg-red-600 text-white rounded-xl font-black uppercase italic text-[10px] shadow-md shadow-red-100 active:scale-95 transition-all pt-0.5">
                  Confirmar Remoção do Alistamento
                </button>
                <button onClick={() => setDeletingMusico(null)} className="w-full h-10 bg-slate-100 text-slate-400 rounded-xl font-black uppercase italic text-[10px] active:scale-95 transition-all">
                  Cancelar e Manter Irmão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ModuleOrchestraBody;