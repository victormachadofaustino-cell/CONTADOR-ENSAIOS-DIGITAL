import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas principais do React para controlar telas, memórias locais e cálculos automáticos.
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, doc, setDoc, deleteDoc, writeBatch, getDocs, onSnapshot, query, where } from '../../config/firebase'; // Explicação: Conecta o componente com os comandos de leitura, escrita, escuta e exclusão do banco de dados Firebase.
import toast from 'react-hot-toast'; // Explicação: Importa o sistema de balões de notificação (avisos de sucesso ou erro) na tela.
import { Activity, Plus, Trash2, LayoutGrid, Ban, X, Edit3, Settings2, AlertTriangle } from 'lucide-react'; // Explicação: Importa a coleção de ícones visuais elegantes para os botões e títulos.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa a biblioteca responsável pelas animações suaves de abertura e fechamento de modais.
import { useAuth } from '../../context/AuthContext'; // Explicação: Importa o cérebro de autenticação para identificar quem está logado e quais são seus poderes.

const ModuleOrchestra = ({ comumId, instrumentsData }) => { // Explicação: Define o componente da Orquestra recebendo a igreja atual e a lista de instrumentos salvos.
  const { userData } = useAuth(); // Explicação: Puxa os dados completos do usuário que está mexendo no sistema agora.
  const level = userData?.accessLevel; // Explicação: Descobre o nível exato de poder do crachá do usuário (ex: master, gem_local).
  
  const isMaster = level === 'master'; // Explicação: Cria uma bandeira que avisa se o usuário é o dono do sistema (Master).
  const isComissao = isMaster || level === 'comissao'; // Explicação: Cria uma bandeira que avisa se ele faz parte da comissão regional.
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Explicação: Cria uma bandeira que inclui o administrador da cidade inteira.
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Explicação: Cria uma bandeira de acesso para o administrador local daquela igreja.

  const [showModal, setShowModal] = useState(null); // Explicação: Caixa de memória para controlar qual janela flutuante está aberta (Naipe, Novo Instrumento ou Editar).
  const [formData, setFormData] = useState({ name: '', section: '', evalType: 'Sem', id: '' }); // Explicação: Memória temporária que guarda o que o usuário digita no formulário do modal.
  
  const [isEnsaioAberto, setIsEnsaioAberto] = useState(false); // Explicação: Trava de segurança que monitora se existe algum ensaio acontecendo ao mesmo tempo.

  useEffect(() => { // Explicação: Monitor reativo que roda toda vez que a igreja visualizada muda na tela.
    if (!comumId) return; // Explicação: Se não houver uma igreja selecionada, não faz nada e aborta.
    
    const q = query( // Explicação: Monta uma pergunta para o banco procurando ensaios globais.
      collection(db, 'events_global'), // Explicação: Vai até a pasta de ensaios globais.
      where('comumId', '==', comumId), // Explicação: Onde a igreja seja exatamente esta que estamos configurando.
      where('ata.status', '==', 'open') // Explicação: E que a ata ainda esteja com o status em aberto ("open").
    );

    const unsub = onSnapshot(q, (snapshot) => { // Explicação: Abre um canal em tempo real para vigiar se algum ensaio foi aberto ou fechado.
      setIsEnsaioAberto(!snapshot.empty); // Explicação: Se a busca trouxer resultados, activa a trava avisando que o ensaio está aberto.
    });

    return () => unsub(); // Explicação: Fecha o canal de vigia ao sair da tela para economizar processamento e internet.
  }, [comumId]); // Explicação: Indica que o monitor depende do código da igreja selecionada.

  const ordemSessoes = ['IRMANDADE', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'GERAL']; // Explicação: Lista fixa com a ordem oficial de exibição dos naipes na tela.

  const sectionsFound = useMemo(() => { // Explicação: Processa e agrupa automaticamente quais naipes existem na lista de instrumentos atual.
    return [...new Set(instrumentsData.map(i => i.section?.toUpperCase()))] // Explicação: Remove nomes duplicados e transforma o texto de seções em letras maiúsculas.
      .filter(Boolean) // Explicação: Limpa qualquer valor nulo ou inválido da lista de naipes.
      .sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99)); // Explicação: Ordena os naipes gerados seguindo estritamente a ordem oficial definida acima.
  }, [instrumentsData, ordemSessoes]); // Explicação: Recalcula isso apenas se a lista de instrumentos ou a ordem fixa mudarem.

  const podeGerenciar = useMemo(() => { // Explicação: Calcula se o usuário logado tem o direito legal de alterar a orquestra dessa igreja.
    if (isComissao) return true; // Explicação: Se for Master ou Comissão, o acesso é liberado de forma soberana em qualquer lugar.
    if (level === 'regional_cidade') { // Explicação: Se for administrador da cidade, tem permissão de gerenciar.
        return true; // Explicação: Autoriza o nível de Cidade a ajustar a orquestra das suas igrejas visíveis.
    }
    return isGemLocal && userData?.comumId === comumId; // Explicação: Se for administrador local, só libera se ele pertencer a esta mesma igreja que está aberta.
  }, [isComissao, isGemLocal, level, userData, comumId]); // Explicação: Refaz essa verificação se o usuário ou a igreja mudarem.

  const handleInsertPattern = async () => { // Explicação: Função do botão "Reset de Fábrica" para restaurar a lista oficial.
    if (!comumId) return toast.error("Localidade não identificada"); // Explicação: Se não identificar a igreja, bloqueia a ação com aviso de erro.
    if (!podeGerenciar) return toast.error("Sem privilégios de gestão"); // Explicação: Se for um usuário comum sem poder, bloqueia o clique.
    
    if (isEnsaioAberto) { // Explicação: Trava de segurança máxima: se o ensaio estiver rolando, bloqueia o reset.
      return toast.error("Ação Bloqueada: Existe um ensaio aberto nesta comum. Encerre o ensaio antes de resetar a orquestra.", { // Explicação: Mostra o aviso na tela para o usuário.
        duration: 5000, // Explicação: Mantém o aviso visível na tela por longos 5 segundos.
        icon: <AlertTriangle className="text-amber-500" /> // Explicação: Desenha um triângulo amarelo de atenção no aviso.
      });
    }

    if (!confirm("Deseja aplicar o RESET DE FÁBRICA? Isso apagará a lista atual e instalará o Padrão CCB saneado diretamente do banco.")) return; // Explicação: Exibe uma caixa de confirmação nativa no navegador do usuário.
    
    const loadingToast = toast.loading("Sincronizando com a Matriz Nacional..."); // Explicação: Mostra uma animação de "carregando" na tela enquanto faz a transação.
    const batch = writeBatch(db); // Explicação: Prepara um pacote de operações em lote para enviar todas as alterações de uma vez só.
    const localRef = collection(db, 'comuns', comumId, 'instrumentos_config'); // Explicação: Aponta para a pasta onde os instrumentos da igreja ficam guardados.
    
    try {
      const nationalSnap = await getDocs(collection(db, 'config_instrumentos_nacional')); // Explicação: Baixa diretamente a Matriz Nacional protegida do banco.
      
      if (nationalSnap.empty) { // Explicação: Valida se a matriz nacional retornou vazia por falha de internet.
        toast.dismiss(loadingToast); // Explicação: Remove o balão de carregando da tela.
        return toast.error("Matriz Nacional não encontrada."); // Explicação: Exibe um aviso de falha.
      }

      const localSnap = await getDocs(localRef); // Explicação: Lê todos os instrumentos configurados localmente na igreja atual.
      localSnap.docs.forEach(d => batch.delete(doc(db, 'comuns', comumId, 'instrumentos_config', d.id))); // Explicação: Coloca uma instrução de exclusão para cada item antigo na esteira do lote.

      nationalSnap.docs.forEach(docInst => { // Explicação: Percorre cada instrumento trazido da Matriz Nacional Padrão.
        const data = docInst.data(); // Explicação: Extrai as informações de nome e naipe originais do instrumento nacional.
        const docRef = doc(localRef, docInst.id); // Explicação: Cria o endereço de destino na igreja usando o ID por extenso imutável da matriz.
        batch.set(docRef, { // Explicação: Grava o novo instrumento dentro do lote com as informações protegidas.
          ...data, // Explicação: Copia todas as propriedades originais da matriz nacional.
          id: docInst.id, // Explicação: Garante e crava que o ID seja idêntico ao por extenso da matriz.
          updatedAt: Date.now() // Explicação: Carimba o milissegundo exato da restauração.
        });
      });

      await batch.commit(); // Explicação: Envia todo o pacote fechado para o servidor de uma só vez, aplicando o reset definitivo.
      toast.success("Padrão CCB Saneado Instalado!", { id: loadingToast }); // Explicação: Transforma o balão de carregando em uma mensagem verde de sucesso.
    } catch (e) { // Explicação: Captura qualquer falha técnica de rede ou permissão.
      console.error("Erro no Reset:", e); // Explicação: Registra o erro técnico detalhado no painel do navegador.
      toast.error("Erro ao salvar padrão.", { id: loadingToast }); // Explicação: Avisa o usuário que a sincronização falhou.
    }
  };

  const handleSave = async () => { // Explicação: Função executada ao clicar em "Confirmar e Gravar" no modal de criação ou edição.
    if (!formData.name.trim()) return toast.error("Insira um nome"); // Explicação: Impede o salvamento se o usuário deixar o nome em branco.
    
    // Explicação: Dicionário interno de segurança que intercepta abreviações e amarra o ID físico ao nome extenso do nosso plano.
    const dicionarioSegurancaIds = {
      'acd': 'acordeon', 'clt': 'clarinete', 'euf': 'eufonio', 'fgt': 'fagote', 'gt': 'fagote',
      'flt': 'flauta', 'org': 'orgao', 'tbn': 'trombone', 'tpt': 'trompete', 'trp': 'trompa',
      'tub': 'tuba', 'vcl': 'violoncelo', 'vla': 'viola', 'vln': 'violino',
      'clarinetes': 'clarinete', 'acordeons': 'acordeon', 'eufonios': 'eufonio', 'fagotes': 'fagote',
      'flautas': 'flauta', 'organistas': 'orgao', 'trombones': 'trombone', 'trompetes': 'trompete',
      'trompas': 'trompa', 'tubas': 'tuba', 'violoncelos': 'violoncelo', 'violas': 'viola', 'violinos': 'violino'
    };

    // Explicação: Gera um ID de segurança limpando acentos, espaços e caracteres especiais do texto digitado.
    const idCalculadoDinamicamente = formData.name
      .toLowerCase() // Explicação: Converte todas as letras para minúsculas.
      .trim() // Explicação: Remove espaços em branco sobrando nas pontas.
      .normalize("NFD") // Explicação: Separa os acentos das letras (ex: 'á' vira 'a' + '´').
      .replace(/[\u0300-\u036f]/g, "") // Explicação: Exclui todos os acentos gerados na linha anterior.
      .replace(/\s+/g, '') // Explicação: Deleta absolutamente todos os espaços internos do texto.
      .replace(/[^a-z0-9]/g, ''); // Explicação: Remove qualquer caractere que não seja uma letra ou número simples.

    // Explicação: Se já estiver editando um item com ID existente, usa ele; senão, passa pelo tradutor de segurança ou usa o ID calculado limpo.
    const idSaneado = formData.id || dicionarioSegurancaIds[idCalculadoDinamicamente] || idCalculadoDinamicamente;

    const ref = doc(db, 'comuns', comumId, 'instrumentos_config', idSaneado); // Explicação: Define o endereço do documento de destino cravando o ID saneado imutável.

    try {
      const dataToSave = { // Explicação: Prepara o objeto com as propriedades limpas que serão persistidas na nuvem.
        id: idSaneado, // Explicação: Grava a chave imutável por extenso correta (ex: 'clarinete').
        name: formData.name.toUpperCase().trim(), // Explicação: Mantém o nome visual bonito digitado pelo usuário em letras maiúsculas para a tela (ex: 'CLARINETE').
        section: formData.section.toUpperCase() || 'GERAL', // Explicação: Grava a seção do naipe correspondente sempre em maiúsculas.
        evalType: formData.evalType || 'Sem', // Explicação: Define o tipo de avaliação da contagem ou assume o padrão simples.
        updatedAt: Date.now() // Explicação: Registra o timestamp exato em milissegundos da gravação.
      };

      await setDoc(ref, dataToSave, { merge: true }); // Explicação: Salva na nuvem mesclando as propriedades de forma inteligente sem destruir campos vizinhos.
      toast.success("Salvo!"); // Explicação: Mostra um balão verde de confirmação na tela.
      setShowModal(null); // Explicação: Fecha o modal fechando a janela flutuante.
      setFormData({ name: '', section: '', evalType: 'Sem', id: '' }); // Explicação: Reseta o formulário da memória para ficar limpo para a próxima.
    } catch (e) { toast.error("Erro de permissão no servidor"); } // Explicação: Exibe um aviso vermelho se as regras do banco bloquearem a operação.
  };

  const handleAction = async (action, inst) => { // Explicação: Controla os cliques nos botões de ação rápida da listagem (Editar ou Lixeira).
    if (action === 'DELETE') { // Explicação: Se o usuário clicou no ícone da lixeira para remover.
      if (!isRegionalCidade) return; // Explicação: NOVA BARREIRA DE PODER: Aborta silenciosamente o comando se o usuário logado for de nível local.
      if (!confirm(`Remover ${inst.name}?`)) return; // Explicação: Pede uma confirmação visual de segurança para evitar cliques acidentais.
      try {
        await deleteDoc(doc(db, 'comuns', comumId, 'instrumentos_config', inst.id)); // Explicação: Deleta cirurgicamente o documento daquele instrumento da subcoleção.
        toast.success("Removido"); // Explicação: Mostra um aviso rápido na tela confirmando a remoção.
      } catch (e) { toast.error("Erro ao excluir"); } // Explicação: Alerta se houver falha de rede ou segurança.
    } else if (action === 'EDIT') { // Explicação: Se o usuário clicou no ícone do lápis para editar.
      setFormData({ ...inst }); // Explicação: Despeja os dados originais daquele instrumento direto na memória do formulário.
      setShowModal('EDIT'); // Explicação: Abre a janela flutuante no modo de edição.
    }
  };

  return ( // Explicação: Inicia a estrutura visual em HTML/React que será desenhada na tela do celular.
    <div className="space-y-6 pb-20 text-left font-sans"> {/* Explicação: Cria o container principal com espaçamento vertical ergonômico e alinhamento à esquerda. */}
      {/* 1. PAINEL DE COMANDO COMPACTO */}
      {podeGerenciar && ( // Explicação: Se o usuário tiver poder administrativo, renderiza o bloco de botões de controle.
        <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 shadow-inner space-y-4"> {/* Explicação: Desenha o cartão de fundo cinza claro com bordas super arredondadas prêmio. */}
          <div className="flex flex-col gap-2"> {/* Explicação: Empilha os botões de ação verticalmente com espaçamento controlado. */}
            <button 
              getAuth="" alt="" // Explicação: Propriedade invisível mantida intocada para segurança.
              onClick={handleInsertPattern} // Explicação: Liga o clique ao método de Reset de Fábrica.
              className={`w-full py-3.5 rounded-2xl font-black uppercase italic text-[10px] tracking-widest flex justify-center items-center gap-3 active:scale-95 transition-all shadow-lg border ${isEnsaioAberto ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-slate-950 text-white border-white/5'}`} // Explicação: Altera as cores visualmente para cinza fosco se o botão estiver travado pelo ensaio aberto.
            >
              <img src="" alt="" className="hidden" /> {/* Explicação: Tag invisível para manter o layout intocado. */}
              <LayoutGrid size={14} className={isEnsaioAberto ? 'text-slate-400' : 'text-amber-500'} /> {/* Explicação: Desenha o ícone de grade mudando a cor para âmbar se estiver ativo. */}
              Reset Padrão CCB {/* Explicação: Texto descritivo do botão em caixa alta. */}
            </button>
            
            {isEnsaioAberto && ( // Explicação: Se houver ensaio aberto, renderiza uma mensagem explicativa abaixo do botão.
              <p className="text-[7px] font-black text-amber-600 uppercase italic text-center px-4 leading-tight"> {/* Explicação: Estiliza o texto de aviso em letras miúdas, centralizado e na cor âmbar. */}
                O Reset de Fábrica está desabilitado enquanto houver um ensaio aberto nesta localidade. {/* Explicação: Aviso importante para o encarregado. */}
              </p>
            )}
            
            <div className="grid grid-cols-2 gap-2"> {/* Explicação: Divide o espaço horizontal perfeitamente em duas colunas de botões lado a lado. */}
              <button 
                onClick={() => { setFormData({name:'', section:'', evalType:'Sem', id:''}); setShowModal('INST'); }} // Explicação: Limpa a memória e abre a janela de adicionar novo instrumento.
                className="bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 active:scale-95 transition-all" // Explicação: Estiliza o botão ergonômico com efeito de clique afundando (active:scale-95).
              >
                <Plus size={14} className="text-blue-600"/> Instrumento {/* Explicação: Ícone de mais azul ao lado do texto. */}
              </button>
              <button 
                onClick={() => { setFormData({name:'', section:'', evalType:'Sem', id:''}); setShowModal('NAIPE'); }} // Explicação: Limpa a memória e abre a janela de adicionar novo naipe customizado.
                className="bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 active:scale-95 transition-all" // Explicação: Botão elegante com transição suave.
              >
                <Plus size={14} className="text-emerald-600"/> Naipe {/* Explicação: Ícone de mais verde ao lado do texto. */}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. LISTAGEM DENSIDADE ALTA */}
      <div className="space-y-6"> {/* Explicação: Bloco vertical que exibe os naipes e os cartões de instrumentos cadastrados. */}
        {sectionsFound.length === 0 ? ( // Explicação: Se a lista de naipes estiver vazia (orquestra zerada).
          <div className="py-10 text-center opacity-20"> {/* Explicação: Centraliza o texto e aplica um efeito de esmaecido sutil. */}
            <Ban className="mx-auto mb-2" size={32} /> {/* Explicação: Ícone grande de bloqueio centralizado. */}
            <p className="text-[8px] font-black uppercase tracking-widest">Orquestra não configurada</p> {/* Explicação: Mensagem informativa de aviso. */}
          </div>
        ) : ( // Explicação: Caso existam instrumentos cadastrados, percorre e desenha cada um deles na tela.
          sectionsFound.map(section => ( // Explicação: Loop que gera um cabeçalho e uma lista para cada naipe encontrado.
            <div key={section} className="space-y-2"> {/* Explicação: Caixa de agrupamento do naipe com identificador exclusivo. */}
              <div className="flex items-center gap-3 px-2"> {/* Explicação: Alinha o título do naipe horizontalmente com uma linha decorativa. */}
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2"> {/* Explicação: Estiliza o título do naipe em formato de etiqueta técnica espaçada. */}
                  <Activity size={10} className="text-blue-500" /> {section} {/* Explicação: Ícone azul de atividade pulsa ao lado do nome do naipe (ex: CORDAS). */}
                </h4>
                <div className="h-[1px] flex-1 bg-slate-100"></div> {/* Explicação: Linha fina cinza horizontal que preenche o resto do espaço visual da tela. */}
              </div>

              <div className="grid grid-cols-1 gap-1"> {/* Explicação: Organiza os instrumentos daquele naipe específico empilhados em uma coluna compacta. */}
                {instrumentsData // Explicação: Filtra e exibe apenas os instrumentos que pertencem a este naipe que está sendo desenhado agora.
                  .filter(i => i.section?.toUpperCase() === section) // Explicação: Faz o cruzamento estrito de igualdade textual de naipes.
                  .map(inst => ( // Explicação: Loop final que desenha o cartão físico de cada instrumento.
                  <div key={inst.id} className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all hover:border-blue-100"> {/* Explicação: Cartão branco super ergonômico com sombra suave e realce azul ao passar o dedo/mouse. */}
                    <div className="flex flex-col leading-tight"> {/* Explicação: Organiza os textos do nome e tipo de avaliação empilhados verticalmente e bem juntos. */}
                      <span className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-tighter"> {/* Explicação: Renderiza o nome visível do instrumento com escrita ultra-negrita premium. */}
                        {inst.name} {/* Explicação: Exibe o nome que o usuário cadastrou (ex: 'VIOLINO'). */}
                      </span>
                      <span className={`text-[6px] font-bold uppercase ${inst.evalType === 'Sem' ? 'text-slate-300' : 'text-blue-500'}`}> {/* Explicação: Se houver avaliação especial, pinta o texto de azul, caso contrário deixa cinza sutil. */}
                        {inst.evalType !== 'Sem' ? inst.evalType : 'Contagem'} {/* Explicação: Exibe o tipo ou apenas a indicação simples de 'Contagem'. */}
                      </span>
                    </div>
                    
                    {podeGerenciar && ( // Explicação: Se o usuário tiver poder de gestão, desenha os micro-botões de ação na ponta direita do cartão.
                      <div className="flex gap-1"> {/* Explicação: Agrupa os botões de editar e apagar horizontalmente. */}
                        <button 
                          onClick={() => handleAction('EDIT', inst)} // Explicação: Liga o botão de editar ao gerenciador de ações enviando este instrumento.
                          className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" // Explicação: Botão quadrado cinza claro que acende em azul elegante ao toque.
                        >
                          <Edit3 size={12}/> {/* Explicação: Ícone de lápis de edição. */}
                        </button>
                        {isRegionalCidade && ( // Explicação: TRAVA DE HIERARQUIA VISUAL MOBILE: Envelopa o botão de lixeira para aparecer estritamente se o usuário for de nível Cidade ou superior.
                          <button 
                            onClick={() => handleAction('DELETE', inst)} // Explicação: Liga o botão de exclusão ao gerenciador de ações.
                            className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" // Explicação: Botão quadrado cinza claro que acende em vermelho de alerta ao toque.
                          >
                            <Trash2 size={12}/> {/* Explicação: Ícone de lixeira de remoção. */}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. MODAIS DE EDIÇÃO */}
      <AnimatePresence> {/* Explicação: Componente especial que monitora e suaviza a saída dos modais quando eles são fechados. */}
        {showModal && ( // Explicação: Se a memória do modal indicar que há alguma janela aberta, inicia a renderização.
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4"> {/* Explicação: Fixa a janela flutuante travada cobrindo absolutamente 100% de toda a tela do celular. */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" /> {/* Explicação: Cortina preta de fundo com efeito de vidro fosco desfocado premium (backdrop-blur-md). */}
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl"> {/* Explicação: Caixa branca do modal que surge de baixo para cima com animação suave de aproximação. */}
              <div className="flex justify-between items-start mb-6"> {/* Explicação: Alinha o título do cabeçalho e o botão de fechar no topo do modal. */}
                <div className="text-left"> {/* Explicação: Alinha os textos à esquerda. */}
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic mb-1">Configuração</p> {/* Explicação: Mini etiqueta azul de contexto de formulário. */}
                  <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter leading-none"> {/* Explicação: Título principal dinâmico do modal baseado no modo aberto. */}
                    {showModal === 'NAIPE' ? 'Novo Naipe' : showModal === 'INST' ? 'Instrumento' : 'Editar'} {/* Explicação: Decide o título da janela dinamicamente. */}
                  </h3>
                </div>
                <button onClick={() => setShowModal(null)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={18}/></button> {/* Explicação: Botão redondo com ícone de 'X' para fechar a janela ao toque. */}
              </div>

              <div className="space-y-4 text-left"> {/* Explicação: Corpo do formulário com espaçamento vertical entre os campos de digitação. */}
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1 ml-1">Identificação</p> {/* Explicação: Etiqueta técnica em miniatura para o campo de texto. */}
                  <input className="w-full bg-slate-50 p-4 rounded-xl font-black text-slate-950 text-xs outline-none uppercase shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: VIOLINO" /> {/* Explicação: Campo de digitação em texto alto, alimentando diretamente a memória temporária em tempo real. */}
                </div>
                {(showModal === 'INST' || showModal === 'EDIT') && ( // Explicação: Exibe o seletor de naipe apenas se estiver criando instrumento ou editando, ocultando se for novo naipe.
                  <>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1 ml-1">Naipe Correspondente</p> {/* Explicação: Etiqueta técnica do menu de seleção. */}
                      <select className="w-full bg-slate-50 p-4 rounded-xl font-black text-slate-950 text-xs outline-none uppercase appearance-none shadow-inner" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}> {/* Explicação: Menu de seleção nativo customizado com escrita em caixa alta. */}
                        <option value="">Selecionar...</option> {/* Explicação: Opção padrão vazia instrutiva. */}
                        {ordemSessoes.map(s => <option key={s} value={s}>{s}</option>)} {/* Explicação: Loop que preenche as opções do menu de seleção com os naipes oficiais. */}
                      </select>
                    </div>
                  </>
                )}
                <button onClick={handleSave} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Confirmar e Gravar</button> {/* Explicação: Botão preto principal de salvamento com gatilho físico e animação premium de clique. */}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuleOrchestra; // Explicação: Exporta o componente completo da orquestra blindada para ser importado e usado na tela principal de configurações.