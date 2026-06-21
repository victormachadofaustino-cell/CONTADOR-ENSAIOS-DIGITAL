import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Explicação: Importa as ferramentas de memória e sincronização do React.
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, getDoc } from '../../config/firebase'; // Explicação: Conecta com o banco de dados Firebase.
import { eventService } from '../../services/eventService'; // Explicação: Importa o motor de salvamento de contagens.
import AtaPage from './AtaPage'; // Explicação: Importa a página de preenchimento da Ata.
import DashEventPage from '../dashboard/DashEventPage'; // Explicação: Importa o painel de gráficos local.
import DashEventRegionalPage from '../dashboard/DashEventRegionalPage'; // Explicação: Importa o painel de gráficos regional.
import toast from 'react-hot-toast'; // Explicação: Importa as notificações de aviso da tela.
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, Lock, Unlock, Trash2 // Explicação: Desenhos dos ícones dos botões.
} from 'lucide-react'; // Explicação: Biblioteca de ícones modernos.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Sistema de animations fluidas.
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa os dados e permissões do usuário logado.

// IMPORTAÇÃO DOS NOVOS COMPONENTES MODULARES
import CounterSection from './components/CounterSection'; // Explicação: Componente que agrupa instrumentos (ex: Cordas).
import OwnershipModal from './components/OwnershipModal'; // Explicação: Janela de "Deseja assumir esta seção?".
import ExtraInstrumentModal from './components/ExtraInstrumentModal'; // Explicação: Janela para adicionar instrumentos na hora.
import CounterRegional from './components/CounterRegional'; // Explicação: Modo de contagem em massa para eventos regionais.

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => { // Explicação: Inicia a estrutura da página de contagem.
  const { userData } = useAuth(); // Explicação: Puxa o crachá eletrônico do usuário logado.
  
  // Explicação: ADEQUAÇÃO DE CRIACAO: Vincula as checagens de poder baseando-se no campo oficial 'accessLevel' do ecossistema.
  const isMaster = userData?.accessLevel === 'master'; // Explicação: Verifica se o nível de acesso do crachá do usuário é Master.
  const isComissao = userData?.accessLevel === 'comissao' || isMaster; // Explicação: Verifica se o usuário pertence à comissão regional ou master.
  const isRegionalCidade = userData?.accessLevel === 'regional_cidade' || isComissao; // Explicação: Verifica se ele gerencia o nível de regional_cidade ou superior.
  const isGemLocal = userData?.accessLevel === 'gem_local' || isRegionalCidade; // Explicação: Verifica se possui nível de administração local ou superior.
  const isBasico = userData?.accessLevel === 'basico'; // Explicação: Identifica se o usuário possui apenas nível básico de leitura.
  
  const canEditAta = isGemLocal || isRegionalCidade || isComissao || isMaster; // Explicação: Condicional que avalia se o usuário tem cargo suficiente para mexer na Ata.

  const [activeTab, setActiveTab] = useState('contador'); // Explicação: Controla se estamos na aba de contagem, ata ou gráficos.
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Explicação: Lista nacional de instrumentos da CCB.
  const [instrumentsConfig, setInstrumentsConfig] = useState([]); // Explicação: Configurações específicas da igreja local.
  const [activeGroup, setActiveGroup] = useState(null); // Explicação: Qual naipe está aberto no momento.
  const [loading, setLoading] = useState(true); // Explicação: Tela de carregamento inicial.
  const [ataData, setAtaData] = useState(null); // Explicação: Dados da Ata do ensaio.
  const [eventDateRaw, setEventDateRaw] = useState(''); // Explicação: Data do evento no formato original.
  const [eventComumId, setEventComumId] = useState(null); // Explicação: ID da igreja onde ocorre o evento.
  const [showOwnershipModal, setShowOwnershipModal] = useState(null); // Explicação: Controla a janela de "Assumir Seção".
  
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null); // Explicação: Caixa que armazena qual naipe receberá um instrumento extra inserido dinamicamente.
  const [localCounts, setLocalCounts] = useState({}); // Explicação: O que o usuário vê na tela (espelho do banco).

  const [isCountsLocked, setIsCountsLocked] = useState(false); // Explicação: Trava de finalização da contagem.

  const lastLocalUpdateRef = useRef(0); // Explicação: Guarda o horário exato da última alteração feita neste celular.
  const [focusedField, setFocusedField] = useState(null); // Explicação: Impede o banco de apagar o campo onde o usuário está digitando.

  const isClosed = ataData?.status === 'closed'; // Explicação: Calcula em tempo real se a ata do ensaio já foi encerrada definitivamente.
  const myUID = auth.currentUser?.uid; // Explicação: Pega o código identificador único de usuário gerado no login.

  // v10.9.1: Sincronização Estabilizada Otimista
  useEffect(() => { // Explicação: Monitor que gerencia a entrada de novas contagens vindas da nuvem.
    const isFreshLocalUpdate = Date.now() - lastLocalUpdateRef.current < 3000; // Explicação: Checa se houve algum clique local nos últimos 3 segundos para ignorar o servidor temporariamente.

    if (counts && !isFreshLocalUpdate) { // Explicação: Se o banco mudou e não foi um clique recente deste celular, atualiza a tela.
      if (focusedField) { // Explicação: Se o usuário estiver com o teclado aberto digitando em um campo de input.
        const [instId, field] = focusedField.split('_'); // Explicação: Recorta o texto focado para saber o instrumento e o campo atual.
        setLocalCounts(prev => { // Explicação: Updates a tela de forma híbrida protegendo o campo que está com foco.
          const newCounts = { ...counts }; // Explicação: Clona os dados recém-chegados do banco de dados.
          if (newCounts[instId]) { // Explicação: Se o instrumento focado existir nas novas contagens.
            newCounts[instId] = { ...newCounts[instId], [field]: prev[instId]?.[field] }; // Explicação: Mantém intacto o número que o usuário está editando para não dar o efeito de sumir texto.
          }
          return newCounts; // Explicação: Retorna o novo mapa mesclado com sucesso.
        });
      } else { // Explicação: Se não houver campo focado, aceita os números novos do servidor imediatamente.
        setLocalCounts(counts); // Explicação: Despeja os valores atualizados na memória local da página.
      }
    }
  }, [counts, focusedField]); // Explicação: Dispara novamente sempre que chegarem atualizações ou o foco mudar.

  // CARREGAMENTO DE INSTRUMENTOS
  useEffect(() => { // Explicação: Carrega as tabelas mestre e as configurações locais da orquestra ao abrir.
    let isMounted = true; // Explicação: Flag de segurança para evitar vazamento de memória se o usuário sair rápido da página.
    const loadInstruments = async () => { // Explicação: Declara a função assíncrona de download de dependências.
      try {
        const nacSnap = await getDocs(query(collection(db, 'config_instrumentos_nacional'), orderBy('name', 'asc'))); // Explicação: Baixa a lista nacional mestre de instrumentos do banco.
        if (isMounted) setInstrumentsNacionais(nacSnap.docs.map(d => ({ id: d.id, ...d.data() }))); // Explicação: Se a página continuar aberta, salva a lista mestre na memória.
        if (eventComumId) { // Explicação: Se o identificador da igreja do ensaio já estiver mapeado.
          const locSnap = await getDocs(collection(db, 'comuns', eventComumId, 'instrumentos_config')); // Explicação: Baixa a configuração de orquestra exclusiva daquela igreja.
          if (isMounted) setInstrumentsConfig(locSnap.docs.map(d => ({ id: d.id, ...d.data() }))); // Explicação: Salva a configuração local de instrumentos.
        }
      } catch (e) {} // Explicação: Ignora falhas silenciosas de carregamento.
      finally { if (isMounted) setLoading(false); } // Explicação: Desativa a tela de carregamento principal liberando o app.
    };
    loadInstruments(); // Explicação: Executa a sequência de carregamento declarada acima.
    return () => { isMounted = false; }; // Explicação: Desliga a flag ao desmontar a página por segurança.
  }, [eventComumId]); // Explicação: Executa novamente se o ID da igreja mudar.

  // MONITOR DE ENSAIO
  useEffect(() => { // Explicação: Vigia o status em tempo real do ensaio ativo aberto.
    if (!currentEventId) return; // Explicação: Se não houver código de evento selecionado, aborta.
    let isMounted = true; // Explicação: Flag protetora contra vazamento de memória.
    const eventRef = doc(db, 'events_global', currentEventId); // Explicação: Localiza o documento físico deste ensaio no Firebase.
    const unsubEvent = onSnapshot(eventRef, (s) => { // Explicação: Abre um canal reativo de escuta focado no ensaio.
      if (s.exists() && isMounted) { // Explicação: Se o documento existir e a página continuar ativa.
        const data = s.data(); // Explicação: Extrai o conteúdo bruto gravado no banco de dados.
        const ataConsolidada = { // Explicação: Consolida os metadados da ata com segurança.
          ...data.ata, // Explicação: Clona as informações da ata (palavra, ocorrências).
          date: data.date, // Explicação: Insere a data do ensaio.
          comumId: data.comumId, // Explicação: Vincula o ID da igreja.
          comumNome: data.comumNome, // Explicação: Injeta o nome carimbado da igreja.
          status: data.ata?.status || 'open', // Explicação: Define se a ata está aberta ou fechada.
          scope: data.scope || 'local' // Explicação: Identifica se o ensaio é de nível local ou regional.
        };
        setAtaData(ataConsolidada); // Explicação: Atualiza os dados da ata na memória da tela.
        setEventComumId(data.comumId); // Explicação: Grava o código da igreja do ensaio na memória.
        setEventDateRaw(data.date || ''); // Explicação: Guarda a data bruta para renderização do cabeçalho.
        setIsCountsLocked(data.countsLocked || false); // Explicação: Atualiza o estado da trava de cadeado da contagem.
        
        const isFreshLocalUpdate = Date.now() - lastLocalUpdateRef.current < 3000; // Explicação: Avalia se houve digitação recente local.
        if (!isFreshLocalUpdate) { // Explicação: Se o usuário não clicou recentemente, aceita as contagens do servidor.
          setLocalCounts(data.counts || {}); // Explicação: Atualiza a tela com o mapa de contagem enxuto vindo do Firestore.
        }
      }
    });
    return () => { isMounted = false; unsubEvent(); }; // Explicação: Fecha a conexão ao sair da página para poupar dados.
  }, [currentEventId]); // Explicação: Reinicia a escuta se o ID do evento ativo for alterado.

  const allInstruments = useMemo(() => { // Explicação: Junta a matriz nacional com as edições da igreja para montar a listagem oficial organizada.
    const ordemOficial = ['Coral', 'irmandade', 'irmas', 'irmaos', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    let base = instrumentsNacionais.map(instBase => { // Explicação: Percorre a matriz de instrumentos padrão nacional.
      const override = instrumentsConfig.find(local => local.id === instBase.id); // Explicação: Tenta achar se o usuário editou este instrumento no cadastro daquela igreja.
      return override ? { ...instBase, ...override } : instBase; // Explicação: Se editou, mescla as alterações, senão mantém o padrão nacional imutável.
    });
    const extraIdsNoBanco = Object.keys(localCounts).filter(k => !k.startsWith('meta_') && !base.find(b => b.id === k)); // Explicação: Encontra IDs extras que foram criados na hora do ensaio e não estão na base padrão.
    const extras = extraIdsNoBanco.map(id => ({ // Explicação: Mapeia e gera a estrutura visual para os instrumentos extras dinâmicos.
      id: id,
      name: localCounts[id].name || id.replace('extra_', '').toUpperCase(), // Explicação: Captura o nome customizado do instrumento extra.
      section: (localCounts[id].section || 'GERAL').toUpperCase(), // Explicação: Aloca o instrumento extra na seção correta informada.
      isExtra: true // Explicação: Carimba uma flag marcando que este item foi criado na hora.
    }));
    return [...base, ...extras].sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99)); // Explicação: Une e ordena tudo baseando-se estritamente na ordem padrão oficial configurada.
  }, [instrumentsNacionais, instrumentsConfig, localCounts]); // Explicação: Recalcula se as listas de configuração ou contagens sofrerem alteração.

  const sections = useMemo(() => { // Explicação: Identifica quais seções ou naipes existem na lista total para criar os títulos na tela.
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99)); // Explicação: Agrupa os nomes de seções removendo duplicados e ordenando pelo padrão oficial.
  }, [allInstruments]); // Explicação: Recalcula se a lista unificada de instrumentos mudar.

  const handleFocus = (instId, field) => setFocusedField(`${instId}_${field}`); // Explicação: Função ativada quando o usuário clica no input, bloqueando interferências do servidor neste campo.
  const handleBlur = () => setFocusedField(null); // Explicação: Função ativada quando o usuário sai do input, liberando a sincronização normal.

  const isEditingEnabled = (sec, subInstId = null) => { // Explicação: Avalia se os botões de somar e inputs devem ficar liberados ou bloqueados para o usuário logado.
    if (isClosed || isCountsLocked) return false; // Explicação: Se a ata ou contagem estiverem trancadas, bloqueia a edição para todo mundo instantaneamente.
    if (isComissao) return true; // Explicação: Usuários de comissão regional possuem acesso liberado para editar qualquer seção a qualquer hora.
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Calcula a chave de controle de metadados daquela seção (ex: 'meta_cordas').
    if (ataData?.scope !== 'regional') return localCounts?.[metaKey]?.responsibleId === myUID; // Explicação: Se for ensaio local, checa se este usuário é quem assumiu a zeladoria da aba daquela seção.
    const sectionInstruments = allInstruments.filter(i => (i.section || '').toUpperCase() === sec.toUpperCase()); // Explicação: Filtra os instrumentos do naipe correspondente para checagem em eventos regionais.
    const mestre = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase())); // Explicação: Isola a referência principal de instrumento da seção.
    const masterData = localCounts?.[mestre?.id]; // Explicação: Puxa as contagens e assinaturas de controle daquele instrumento.
    if (subInstId === 'irmas' || subInstId === 'irmaos') return masterData?.[`responsibleId_${subInstId}`] === myUID; // Explicação: Trata permissões específicas de divisão de gênero para o caso do Coral.
    return masterData?.responsibleId === myUID; // Explicação: Retorna se o ID do responsável confere com quem está logado no aparelho.
  };

  const handleUpdateInstrument = (id, field, value, section) => { // Explicação: Executada a cada clique nos botões de + ou - ou ao digitar no input.
    if (isClosed || isCountsLocked) return; // Explicação: Aborta imediatamente se o ensaio ou contagem estiverem lacrados.
    lastLocalUpdateRef.current = Date.now(); // Explicação: Carimba o tempo do clique local para ativar a proteção anti-sobrescrita de 3 segundos.
    setLocalCounts(prev => { // Explicação: Atualiza instantaneamente o número na tela para o usuário não sentir lentidão (Otimista).
      const targetId = (section?.toUpperCase() === 'IRMANDADE') ? 'Coral' : (section?.toUpperCase() === 'ORGANISTAS') ? 'orgao' : id; // Explicação: Direciona chaves especiais ou mantém o ID por extenso.
      return { ...prev, [targetId]: { ...prev[targetId], [field]: Math.max(0, parseInt(value) || 0) } }; // Explicação: Altera o valor do campo forçando números inteiros positivos.
    });
    eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field, value, userData, section }) // Explicação: Dispara a atualização enxuta para o service enviar via pacote estabilizado de rede.
      .catch(() => toast.error("Erro na sincronização.")); // Explicação: Mostra uma notificação de falha se a internet cair.
  };

  const handleAddExtraInstrument = async (nome) => { // Explicação: Salva um instrumento customizado extra inserido na hora pelo painel.
    if (!nome.trim() || !extraInstrumentSection || !isGemLocal || isCountsLocked) return; // Explicação: Filtra parâmetros válidos e travas de segurança.
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, '')}_${Date.now()}`; // Explicação: Gera um ID dinâmico único e limpo para o instrumento extra.
    try {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: idSaneado, field: 'total', value: 0, userData, section: extraInstrumentSection, customName: nome.toUpperCase().trim() }); // Explicação: Envia a inicialização do instrumento extra para o banco de dados.
      setExtraInstrumentSection(null); // Explicação: Fecha o modal de inserção de instrumento extra.
      toast.success("Instrumento adicionado!"); // Explicação: Alerta o usuário do sucesso da criação.
    } catch (e) {} // Explicação: Abafa erros silenciosos.
  };

  const handleToggleGroup = (sec) => { // Explicação: Executada quando o usuário clica para abrir ou fechar a sanfona de um naipe (ex: clicar em CORDAS).
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec); // Explicação: Se o ensaio estiver encerrado, apenas abre para leitura sem perguntar nada.
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Constrói a chave técnica da seção correspondente.
    const responsibleId = localCounts?.[metaKey]?.responsibleId; // Explicação: Verifica se já existe um responsável assinando por aquela seção neste ensaio.
    if (activeGroup === sec) { setActiveGroup(null); return; } // Explicação: Se clicou na que já estava aberta, simplesmente fecha a sanfona (recolhe).
    if (isComissao || responsibleId === myUID) { setActiveGroup(sec); } // Explicação: Se for da comissão ou o dono legítimo da aba, abre o naipe direto.
    else { setShowOwnershipModal(sec); } // Explicação: Se estiver sem dono ou com outro usuário, abre o modal de confirmação de posse.
  };

  const setOwnership = async (id, currentOwnerStatus, subRole = null) => { // Explicação: Grava no banco que este usuário assumiu a digitação daquele naipe.
    if (!eventComumId || isClosed || !currentEventId || isCountsLocked || !myUID) return; // Explicação: Trava operações inválidas ou bloqueadas por cadeado.
    const respIdKey = subRole ? `responsibleId_${subRole}` : `responsibleId`; // Explicação: Define a propriedade de ID correta de acordo com a subdivisão de gênero.
    const nameKey = subRole ? `responsibleName_${subRole}` : `responsibleName`; // Explicação: Define a propriedade de nome de exibição.
    
    lastLocalUpdateRef.current = Date.now(); // Explicação: Ativa a proteção anti-pisca local na memória do celular.
    setLocalCounts(prev => ({ // Explicação: Injeta na tela o nome do usuário como zelador atual da seção de forma otimista.
      ...prev,
      [id]: { ...prev[id], [respIdKey]: myUID, [nameKey]: userData?.name || "Você" }
    }));
    setShowOwnershipModal(null); // Explicação: Fecha a janela de confirmação de posse de seção.
    if (id.startsWith('meta_')) setActiveGroup(id.replace('meta_', '').toUpperCase()); // Explicação: Se for uma chave de metadados, abre o naipe correspondente para edição imediata.

    try {
      await updateDoc(doc(db, 'events_global', currentEventId), { // Explicação: Envia um comando cirúrgico atualizando as chaves de assinatura na nuvem.
        [`counts.${id}.${respIdKey}`]: myUID, // Explicação: Assina o ID do usuário logado na vaga de responsável.
        [`counts.${id}.${nameKey}`]: userData?.name || "Colaborador", // Explicação: Escreve o nome do usuário na vaga correspondente.
        updatedAt: Date.now() // Explicação: Atualiza o marco de tempo de modificação geral.
      });
      toast.success("Zeladoria assumida."); // Explicação: Notifica que o usuário agora responde por aquela aba.
    } catch (e) {
      toast.error("Erro ao sincronizar."); // Explicação: Avisa em caso de erro de conexão.
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>; // Explicação: Desenha uma tela neutra de carregamento até as informações estarem na memória.

  return ( // Explicação: Inicia a montagem dos elementos de interface visual na tela do smartphone.
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans"> {/* Explicação: Janela de visualização em tela cheia com fundo cinza claro e rolagem contida. */}
      {/* AJUSTE v11.0: HEADER COM CENTRALIZAÇÃO ABSOLUTA */}
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50 relative"> {/* Explicação: Cabeçalho branco elegante com bordas inferiores super arredondadas e sombra projetada. */}
        <div className="flex justify-between items-center max-w-md mx-auto w-full relative h-12"> {/* Explicação: Container centralizador ergonômico limitado a larguras de smartphone comuns. */}
          
          {/* BOTÃO VOLTAR (Lado Esquerdo Fixo) */}
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all z-10"> {/* Explicação: Botão cinza claro com clique responsivo e efeito de escala. */}
            <ChevronLeft size={22} strokeWidth={3} /> {/* Explicação: Desenha o ícone de seta apontando para a esquerda com traço grosso destacado. */}
          </button>
          
          {/* TÍTULO CENTRALIZADO (Eixo Absoluto) */}
          <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none"> {/* Explicação: Truque de CSS de posicionamento absoluto para cravar os textos rigorosamente no ponto médio da barra. */}
            <p className="text-[14px] font-bold text-slate-900 leading-none"> {/* Explicação: Formata o texto da data com destaque e cor grafite escuro. */}
              {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'} {/* Explicação: Recorta a data americana do banco e exibe no formato brasileiro (Dia/Mês/Ano). */}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1"> {/* Explicação: Container para alinhar o ponto de pulsação regional e o nome da igreja. */}
               {ataData?.scope === 'regional' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"/>} {/* Explicação: Se o ensaio for regional, renderiza um círculo azul piscando em modo alerta. */}
               <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-[150px]"> {/* Explicação: Estiliza o nome da localidade em formato de etiqueta fosca elegante. */}
                 {ataData?.comumNome || "Localidade"} {/* Explicação: Renderiza o nome carimbado da igreja (ex: 'PARQUE 120'). */}
               </h2>
            </div>
          </div>

          {/* BOTÃO DIREITO (Cadeado/Lacre) */}
          <div className="flex items-center gap-2 z-10"> {/* Explicação: Container alinhado à direita para os botões de ação e trancas de segurança. */}
            {(ataData?.scope === 'regional' ? (isComissao || isMaster) : isRegionalCidade) && !isClosed && ( // Explicação: Se o usuário tiver cargo superior correspondente ao escopo, exibe o cadeado de trancamento.
              <button onClick={() => updateDoc(doc(db, 'events_global', currentEventId), { countsLocked: !isCountsLocked, updatedAt: Date.now() })} className={`p-3 rounded-2xl active:scale-90 transition-all border ${isCountsLocked ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}> {/* Explicação: Botão reativo que acende em azul royal quando a contagem estiver trancada. */}
                {isCountsLocked ? <Lock size={18} strokeWidth={3}/> : <Unlock size={18} strokeWidth={3}/>} {/* Explicação: Alterna dinamicamente entre o desenho de um cadeado aberto ou fechado grosso. */}
              </button>
            )}
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar"> {/* Explicação: Área central de rolagem de alta performance com barra oculta nativamente (no-scrollbar). */}
        <div className="max-w-md mx-auto"> {/* Explicação: Limita o conteúdo para ficar legível e centralizado no eixo em telas maiores. */}
          {activeTab === 'contador' && ( // Explicação: Se a aba ativa selecionada no rodapé for a de digitação de números (Contar).
            <>
              <AnimatePresence> {/* Explicação: Elemento do Framer Motion que gerencia a entrada e saída suave do banner de aviso de tranca. */}
                {isCountsLocked && ( // Explicação: Se o cadeado geral de contagem foi acionado na nuvem.
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-100"> {/* Explicação: Desenha um cartão azul flutuante informando o bloqueio de edição. */}
                    <Lock size={16} className="shrink-0" /><span className="text-[9px] font-black uppercase italic tracking-widest leading-none">Contagem Finalizada - Somente Leitura</span> {/* Explicação: Texto de aviso de bloqueio em caixa alta técnico. */}
                  </motion.div>
                )}
              </AnimatePresence>

              {ataData?.scope === 'regional' ? ( // Explicação: Bifurcação de interface: se for ensaio regional, puxa a tela de listagem de blocos em massa.
                <CounterRegional instruments={allInstruments} localCounts={localCounts} sections={sections} onUpdate={handleUpdateInstrument} onToggleSection={(id, status, role) => setOwnership(id, status, role)} userData={userData} isClosed={isClosed || isCountsLocked} currentEventId={currentEventId} onFocus={handleFocus} onBlur={handleBlur} isEditingEnabled={isEditingEnabled} /> // Explicação: Invoca a interface regional otimizada para alto tráfego.
              ) : ( // Explicação: Caso contrário, se for ensaio local comum, renderiza os naipes em formato de sanfona vertical ergonômica.
                sections.map((sec) => ( // Explicação: Varre cada naipe de instrumentos gerando um bloco sanfona na tela.
                  <CounterSection key={sec} sec={sec} allInstruments={allInstruments} localCounts={localCounts} myUID={myUID} activeGroup={activeGroup} handleToggleGroup={handleToggleGroup} handleUpdateInstrument={handleUpdateInstrument} isEditingEnabled={isEditingEnabled} onAddExtra={(s) => isGemLocal && setExtraInstrumentSection(s)} onFocus={handleFocus} onBlur={handleBlur} ataData={ataData} userData={userData} /> // Explicação: Invoca a seção sanfona individual repassando as permissões enxutas.
                ))
              )}
            </>
          )}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} />} {/* Explicação: Se clicou na segunda aba, renderiza a página interna de controle de Atas. */}
          {activeTab === 'dash' && ( // Explicação: Se clicou na terceira aba, gerencia qual painel estatístico de gráficos carregar de acordo com o escopo.
            ataData?.scope === 'regional' ? ( // Explicação: Se escopo regional.
              <DashEventRegionalPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} /> // Explicação: Carrega o painel estatístico de gráficos consolidados por cidades.
            ) : ( // Explicação: Se escopo local normal.
              <DashEventPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} /> // Explicação: Carrega os gráficos de pizza e barras locais da orquestra da casa.
            )
          )}
        </div>
      </main>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-[50]"> {/* Explicação: Barra inferior flutuante suspensa ancorada milimetricamente no meio da tela do smartphone. */}
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl"> {/* Explicação: Cápsula preta premium translúcida com efeito de desfoque de fundo de vidro (backdrop-blur-xl). */}
          <TabButton active={activeTab === 'contador'} icon={<LayoutGrid size={18}/>} label="Contar" onClick={() => setActiveTab('contador')} /> {/* Explicação: Botão da primeira aba focado nas contagens numéricas. */}
          <TabButton active={activeTab === 'ata'} icon={<ClipboardCheck size={18}/>} label="Ata" onClick={() => setActiveTab('ata')} /> {/* Explicação: Botão da segunda aba focado nos dados e hinos do ensaio. */}
          <TabButton active={activeTab === 'dash'} icon={<BarChart3 size={18}/>} label="Dash" onClick={() => setActiveTab('dash')} /> {/* Explicação: Botão da terceira aba focado nos relatórios estatísticos em gráficos. */}
        </nav>
      </footer>

      <AnimatePresence> {/* Explicação: Gerenciador de animações de transição suave de abertura de modais na tela. */}
        {showOwnershipModal && ( // Explicação: Condicional que renderiza a janela flutuante se houver intenção de assumir naipe.
          <OwnershipModal showOwnershipModal={showOwnershipModal} localCounts={localCounts} myUID={myUID} userData={userData} onConfirm={(sec) => setOwnership(`meta_${sec.toLowerCase().replace(/\s/g, '_')}`, true)} onCancel={() => setShowOwnershipModal(null)} /> // Explicação: Invoca a janela modular passando o método de assinatura de zeladoria mapeado por nós.
        )}
        {extraInstrumentSection && ( // Explicação: Condicional que renderiza o modal se o usuário quis criar um instrumento inédito na hora.
          <ExtraInstrumentModal section={extraInstrumentSection} onConfirm={handleAddExtraInstrument} onCancel={() => setExtraInstrumentSection(null)} /> // Explicação: Invoca a janela modular de cadastro instantâneo de instrumentos extras.
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }) => ( // Explicação: Componente auxiliar que draws e estiliza individualmente cada botão da barra de navegação inferior.
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-50'}`}> {/* Explicação: Se estiver ativo, se transforma em uma pílula branca com texto ultra-negrito e efeito de pulo (scale-105). */}
    {icon}<span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">{label}</span> {/* Explicação: Renderiza o ícone e o texto da etiqueta com espaçamento técnico estrito e elegante. */}
  </button>
);

export default CounterPage; // Explicação: Exporta a tela de contagem total blindada e enxuta para uso nas rotas principais do ecossistema.