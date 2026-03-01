import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Importa ferramentas básicas do React
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, getDoc } from '../../config/firebase'; // Conecta com o banco de dados do Google
import { eventService } from '../../services/eventService'; // Importa o motor de salvamento de contagens
import AtaPage from './AtaPage'; // Importa a página de preenchimento da Ata
import DashEventPage from '../dashboard/DashEventPage'; // Importa o painel de gráficos local
import DashEventRegionalPage from '../dashboard/DashEventRegionalPage'; // Importa o painel de gráficos regional
import toast from 'react-hot-toast'; // Importa os avisos de sucesso ou erro na tela
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, Lock, Unlock // Importa ícones visuais para botões
} from 'lucide-react'; // Biblioteca de ícones modernos
import { motion, AnimatePresence } from 'framer-motion'; // Importa sistema de animações e transições
import { useAuth } from '../../context/AuthContext'; // Puxa os dados do usuário que está logado

// IMPORTAÇÃO DOS COMPONENTES MODULARES
import CounterSection from './components/CounterSection'; // Componente que agrupa instrumentos por seção
import OwnershipModal from './components/OwnershipModal'; // Janela para confirmar quem vai contar a seção
import ExtraInstrumentModal from './components/ExtraInstrumentModal'; // Janela para adicionar novos instrumentos
import CounterRegional from './components/CounterRegional'; // Componente especial para contagem em massa regional

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => { // Inicia a estrutura principal da página
  const { userData } = useAuth(); // Puxa o "crachá" do usuário logado
  const level = userData?.accessLevel; // Identifica se é Master, Comissão, Regional ou GEM
  
  const isMaster = level === 'master'; // Checa se é o administrador supremo
  const isComissao = isMaster || level === 'comissao'; // Checa se faz parte da comissão nacional
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Checa se é gestor de regional ou cidade
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Checa se é colaborador local (GEM)
  
  // Conforme Matriz: Básico visualiza Dash/Ata, mas GEM+ edita a Ata
  const canEditAta = isGemLocal; // Define que apenas GEM ou superior pode mexer na ata

  const [activeTab, setActiveTab] = useState('contador'); // Controla se estamos na aba Contar, Ata ou Gráficos
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Guarda a lista oficial de todos os instrumentos
  const [instrumentsConfig, setInstrumentsConfig] = useState([]); // Guarda as adaptações feitas pela igreja local
  const [activeGroup, setActiveGroup] = useState(null); // Indica qual família de instrumentos está aberta agora
  const [loading, setLoading] = useState(true); // Controla a tela de espera enquanto os dados chegam
  const [ataData, setAtaData] = useState(null); // Guarda todas as informações da Ata do ensaio
  const [eventDateRaw, setEventDateRaw] = useState(''); // Guarda a data original do evento
  const [eventComumId, setEventComumId] = useState(null); // Guarda o ID único da igreja do evento
  const [showOwnershipModal, setShowOwnershipModal] = useState(null); // Controla se o aviso de "assumir posse" aparece
  
  // ESTADOS PARA INSTRUMENTOS EXTRAS v5.0
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null); // Define em qual seção o extra será criado
  const [localCounts, setLocalCounts] = useState({}); // É o espelho dos números que o usuário vê na tela

  // NOVO v9.6: Estado para Lacre de Contagem (Tarja Visual)
  const [isCountsLocked, setIsCountsLocked] = useState(false); // Bloqueia edições se o gestor lacrar os números

  // JUSTIFICATIVA: Ref para controlar se há uma atualização local em curso
  const isUpdatingRef = useRef(null); // Evita que o sistema sobrescreva a tela enquanto o usuário digita
  
  // v10.0: MECANISMO DE ISOLAMENTO DE FOCO PARA EVITAR ZERAGEM EM SIMULTANEIDADE
  const [focusedField, setFocusedField] = useState(null); // NOVO: Guarda qual campo o usuário está editando agora (ex: 'violino_total')

  const isClosed = ataData?.status === 'closed'; // Verifica se a Ata já foi encerrada definitivamente
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id; // Pega o ID único do contador atual

  useEffect(() => { // Sincroniza os números do banco com a tela do celular
    if (counts && !isUpdatingRef.current) { // Só atualiza se o usuário não estiver no meio de um salvamento
      if (focusedField) { // Se o usuário estiver digitando em um campo... [v10.0]
        const [instId, field] = focusedField.split('_'); // Descobre qual instrumento e campo ele está mexendo [v10.0]
        setLocalCounts(prev => { // Atualiza todos os outros números, menos o que ele está digitando [v10.0]
          const newCounts = { ...counts }; // Pega os dados novos do banco [v10.0]
          if (newCounts[instId]) { // Se o instrumento focado existir nos dados novos... [v10.0]
            newCounts[instId] = { ...newCounts[instId], [field]: prev[instId]?.[field] }; // Preserva o que o usuário está digitando [v10.0]
          }
          return newCounts; // Aplica a sincronização protegida [v10.0]
        });
      } else { // Se ninguém estiver digitando nada...
        setLocalCounts(counts); // Atualiza tudo normalmente conforme o banco de dados
      }
    }
  }, [counts, focusedField]); // Monitora mudanças no banco e no foco do teclado

  // HEARTBEAT DE SESSÃO: Blindado para evitar crash
  useEffect(() => { // Mantém o sinal de "contando" ativo para o sistema saber quem está online
    if (!activeGroup || !currentEventId || isClosed) return; // Não faz nada se o grupo estiver fechado ou evento encerrado
    
    const metaKey = `meta_${activeGroup.toLowerCase().replace(/\s/g, '_')}`; // Formata o nome técnico da seção
    const isOwner = localCounts?.[metaKey]?.responsibleId === myUID; // Checa se este usuário é o responsável oficial

    if (isOwner) { // Se for o dono, envia um sinal de vida a cada batida do relógio
      const setSession = async (status) => {
        try {
          await updateDoc(doc(db, 'events_global', currentEventId), { // Atualiza o banco com o sinal de atividade
            [`counts.${metaKey}.isActive`]: status,
            [`counts.${metaKey}.lastHeartbeat`]: Date.now()
          });
        } catch (e) {
          // Silent catch - ignora erros de permissão se o usuário perder o acesso subitamente
        }
      };

      setSession(true); // Liga o sinal de "estou online"
      return () => setSession(false); // Desliga o sinal ao fechar a seção ou sair
    }
  }, [activeGroup, currentEventId, isClosed, myUID, localCounts]);

  // CARREGAMENTO DE INSTRUMENTOS
  useEffect(() => { // Carrega as listas de instrumentos permitidos para este evento
    let isMounted = true; // Controle para evitar atualizar a tela se o usuário sair da página
    const loadInstruments = async () => {
      try {
        const nacSnap = await getDocs(query(collection(db, 'config_instrumentos_nacional'), orderBy('name', 'asc'))); // Puxa lista da CCB
        if (isMounted) setInstrumentsNacionais(nacSnap.docs.map(d => ({ id: d.id, ...d.data() }))); // Salva na memória do app

        if (eventComumId) { // Se o evento já tiver uma igreja definida...
          const locSnap = await getDocs(collection(db, 'comuns', eventComumId, 'instrumentos_config')); // Puxa ajustes locais
          if (isMounted) setInstrumentsConfig(locSnap.docs.map(d => ({ id: d.id, ...d.data() }))); // Salva ajustes locais
        }
      } catch (e) { 
        console.warn("Jurisdição: Configurações não carregadas."); // Aviso técnico se o banco recusar a leitura
      } finally {
        if (isMounted) setLoading(false); // Remove o aviso de carregando da tela
      }
    };
    loadInstruments(); // Executa a busca
    return () => { isMounted = false; }; // Limpa o controle ao sair
  }, [eventComumId]);

  // MONITOR REATIVO DO EVENTO
  useEffect(() => { // Fica de olho em qualquer mudança no ensaio (Ata, Lacre, Data)
    if (!currentEventId) return; // Se não houver evento, não faz nada
    let isMounted = true; // Controle de segurança

    const eventRef = doc(db, 'events_global', currentEventId); // Aponta para o documento do ensaio no banco
    
    const unsubEvent = onSnapshot(eventRef, // Inicia a escuta em tempo real
      (s) => {
        if (s.exists() && isMounted) { // Se o ensaio existir e o usuário ainda estiver na página...
          const data = s.data(); // Pega os dados vindos do Google
          const ataConsolidada = { // Organiza as informações para o formulário da Ata
            ...data.ata,
            date: data.date, 
            comumId: data.comumId,
            comumNome: data.comumNome,
            status: data.ata?.status || 'open',
            scope: data.scope || 'local'
          };

          setAtaData(ataConsolidada); // Atualiza os dados da Ata na tela
          setEventComumId(data.comumId); // Sincroniza o ID da igreja
          setEventDateRaw(data.date || ''); // Sincroniza a data do evento
          setIsCountsLocked(data.countsLocked || false); // Sincroniza se o gestor trancou os números [v9.6]
          
          if (!isUpdatingRef.current) { // Se o usuário não estiver salvando nada agora...
            if (focusedField) { // E se ele estiver com um campo focado... [v10.0]
              const [instId, field] = focusedField.split('_'); // Identifica o campo focado [v10.0]
              setLocalCounts(prev => { // Faz o merge inteligente [v10.0]
                const newC = { ...data.counts }; // Pega os números novos do banco [v10.0]
                if (newC[instId]) { // Se o campo focado existir no banco... [v10.0]
                  newC[instId] = { ...newC[instId], [field]: prev[instId]?.[field] }; // Protege o valor que o usuário está digitando [v10.0]
                }
                return newC; // Atualiza a tela sem apagar o que ele está escrevendo [v10.0]
              });
            } else {
              setLocalCounts(data.counts || {}); // Caso contrário, atualiza tudo normalmente
            }
          }
        }
      },
      (err) => {
        console.error("Sync Error:", err); // Log de erro se a internet oscilar
      }
    );
    return () => { isMounted = false; unsubEvent(); }; // Encerra a escuta ao fechar a página
  }, [currentEventId, focusedField]); // Reage ao ID do evento e ao campo focado

  // v5.5: FILTRAGEM PARA O DASHBOARD
  const filteredCountsForDash = useMemo(() => { // Prepara os dados para os gráficos de pizza e barras
    const cleanCounts = { ...localCounts }; // Copia os dados atuais
    Object.keys(cleanCounts).forEach(key => { // Varre instrumento por instrumento
      const item = cleanCounts[key];
      const isIrmandade = item?.section?.toUpperCase() === 'IRMANDADE' || key.toLowerCase().includes('coral') || key === 'irmas' || key === 'irmaos';
      
      if (isIrmandade) {
        cleanCounts[key] = { ...item, _isIrmandade: true }; // Marca o que não é orquestra para soma correta
      }
    });
    return cleanCounts; // Retorna os dados prontos para o gráfico
  }, [localCounts]);

  const allInstruments = useMemo(() => { // Define a ordem visual dos instrumentos na tela (Ordem da Ficha)
    const ordemOficial = ['Coral', 'irmandade', 'irmas', 'irmaos', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    
    let base = instrumentsNacionais.map(instBase => { // Começa com a lista nacional
      const override = instrumentsConfig.find(local => local.id === instBase.id); // Aplica personalizações da igreja
      return override ? { ...instBase, ...override } : instBase; // Prioriza o local sobre o nacional
    });

    const extraIdsNoBanco = Object.keys(localCounts).filter(k => // Procura por instrumentos que foram adicionados na hora
      !k.startsWith('meta_') && 
      !base.find(b => b.id === k)
    );
    
    const extras = extraIdsNoBanco.map(id => { // Monta o objeto para instrumentos extras (ex: Violão em ensaio pequeno)
      const isSisters = id === 'irmas';
      const isBrothers = id === 'irmaos';
      const isOrgan = id === 'orgao';

      return {
        id: id,
        name: localCounts[id].name || (isSisters ? 'IRMÃS' : isBrothers ? 'IRMÃOS' : isOrgan ? 'ÓRGÃO' : id.replace('extra_', '').toUpperCase()),
        section: (localCounts[id].section || (isSisters || isBrothers ? 'IRMANDADE' : isOrgan ? 'ORGANISTAS' : 'GERAL')).toUpperCase(),
        isExtra: !isSisters && !isBrothers && !isOrgan
      };
    });

    const final = [...base, ...extras]; // Junta a lista oficial com os extras

    return final.sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99)); // Ordena tudo
  }, [instrumentsNacionais, instrumentsConfig, localCounts]);

  const sections = useMemo(() => { // Cria os cabeçalhos das famílias (Cordas, Madeiras, etc)
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99));
  }, [allInstruments]);

  // v10.0: NOVO - Funções para controlar o foco do usuário e evitar zeragem
  const handleFocus = (instId, field) => setFocusedField(`${instId}_${field}`); // Avisa o sistema: "Estou escrevendo aqui, não mexe!"
  const handleBlur = () => setFocusedField(null); // Avisa o sistema: "Terminei de escrever, pode atualizar."

  // v8.15.2: ATUALIZAÇÃO OTIMISTA HÍBRIDA
  const handleUpdateInstrument = (id, field, value, section) => { // Processa a mudança de um número quando o usuário digita
    if (isClosed || isCountsLocked) return; // Se estiver trancado, não deixa fazer nada

    if (isUpdatingRef.current) clearTimeout(isUpdatingRef.current); // Reinicia o cronômetro de proteção
    isUpdatingRef.current = setTimeout(() => { isUpdatingRef.current = null; }, 1200); // Trava o banco por 1.2 segundos para estabilidade

    setLocalCounts(prev => { // Atualiza a tela do usuário instantaneamente (antes de ir pro banco)
      const sectionKey = section?.toUpperCase(); // Identifica a seção em letras maiúsculas
      
      let targetId = id; // Define qual ID de instrumento vamos atualizar
      if (sectionKey === 'IRMANDADE') targetId = 'Coral'; // Ajuste técnico para agrupar irmandade no Coral
      if (sectionKey === 'ORGANISTAS') targetId = 'orgao'; // Ajuste técnico para organistas

      const currentData = prev[targetId] || {}; // Pega os números atuais deste instrumento
      const newVal = Math.max(0, parseInt(value) || 0); // Garante que o número não seja negativo nem vazio

      // LÓGICA DE PROTEÇÃO: Não deixa o número de 'Comum' ser maior que o 'Total'
      if ((field === 'comum' || field === 'enc') && newVal > (currentData.total || 0)) {
        return prev; // Se for maior, ignora a mudança (bloqueio de segurança)
      }

      const updatedObj = { ...currentData, [field]: newVal }; // Cria o novo objeto com o número atualizado

      // REGRA DE CASCATA: Se o usuário abaixar o Total, o sistema abaixa Comum e Enc automaticamente
      if (field === 'total') {
        if ((currentData.comum || 0) > newVal) updatedObj.comum = newVal;
        if ((currentData.enc || 0) > newVal) updatedObj.enc = newVal;
        
        updatedObj.total = (id === 'irmas' || id === 'irmaos') ? 
          ((field === 'irmas' ? newVal : (currentData.irmas || 0)) + 
           (field === 'irmaos' ? newVal : (currentData.irmaos || 0))) : newVal;
      } else if (field === 'irmas' || field === 'irmaos') { // Soma especial para contagem de irmandade separada
          updatedObj.total = (field === 'irmas' ? newVal : (currentData.irmas || 0)) + 
                             (field === 'irmaos' ? newVal : (currentData.irmaos || 0));
      }

      return { ...prev, [targetId]: updatedObj }; // Aplica a mudança na tela do celular
    });
    
    eventService.updateInstrumentCount(eventComumId, currentEventId, { // Envia a mudança para o banco de dados
       instId: id, field, value, userData, section 
    }).catch(() => {
       toast.error("Erro na sincronização."); // Avisa se a gravação falhar
    });
  };

  // NOVO v9.6: Função para Lacre de Contagem
  const handleToggleCountsLock = async () => { // Função do "Botão do Cadeado"
    if (!isRegionalCidade || isClosed) return; // Somente gestores regionais podem trancar a contagem
    try {
      const newStatus = !isCountsLocked; // Inverte o estado atual (se tá aberto, fecha; se tá fechado, abre)
      await updateDoc(doc(db, 'events_global', currentEventId), { // Grava no banco a decisão
        countsLocked: newStatus 
      });
      toast.success(newStatus ? "Contagem Lacrada 🔒" : "Contagem Reaberta 🔓"); // Aviso visual
    } catch (e) {
      toast.error("Erro ao alterar lacre."); // Erro se não tiver permissão
    }
  };

  const handleAddExtraInstrument = async (nome) => { // Cria um instrumento novo na hora
    if (!nome.trim() || !extraInstrumentSection || !isGemLocal || isCountsLocked) return; // Valida nome e permissão
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, '')}_${Date.now()}`; // Cria um ID único e limpo
    try {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { // Salva o novo instrumento no banco
        instId: idSaneado, field: 'total', value: 0, userData, section: extraInstrumentSection, customName: nome.toUpperCase().trim()
      });
      setExtraInstrumentSection(null); // Fecha a janelinha
      toast.success("Instrumento adicionado!"); // Aviso de sucesso
    } catch (e) {
      toast.error("Erro ao adicionar extra."); // Aviso de erro
    }
  };

  const handleToggleGroup = (sec) => { // Abre ou fecha uma família de instrumentos para digitar
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec); // Se encerrado, apenas abre/fecha visualmente
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Nome técnico da família
    const responsibleId = localCounts?.[metaKey]?.responsibleId; // Quem é o dono dessa família agora?
    
    if (activeGroup === sec) { setActiveGroup(null); return; } // Se clicar no que já está aberto, fecha
    
    if (isComissao || responsibleId === myUID) { // Se for gestor ou o próprio dono...
      setActiveGroup(sec); // Abre direto para digitar
      setShowOwnershipModal(null); // Garante que não apareça o pedido de posse
    } else {
      setShowOwnershipModal(sec); // Se for outra pessoa, pergunta: "Quer assumir esta contagem?"
    }
  };

  const setOwnership = async (id, currentOwnerStatus, subRole = null) => { // Registra que este usuário é o responsável pela seção
    if (!eventComumId || isClosed || !currentEventId || isCountsLocked) return; // Trava se estiver lacrado
    
    try {
      setShowOwnershipModal(null); // Fecha o aviso de posse

      const respIdKey = subRole ? `responsibleId_${subRole}` : `responsibleId`; // Define a chave do ID (Regional ou Local)
      const nameKey = subRole ? `responsibleName_${subRole}` : `responsibleName`; // Define a chave do Nome

      await updateDoc(doc(db, 'events_global', currentEventId), { // Grava no Google quem assumiu a caneta
        [`counts.${id}.${respIdKey}`]: myUID,
        [`counts.${id}.${nameKey}`]: userData?.name || userData?.nome || "Colaborador",
        [`counts.${id}.updatedAt`]: Date.now()
      });
      
      if (id.startsWith('meta_')) { // Se for uma família inteira...
        const sectionTag = id.replace('meta_', '').toUpperCase(); // Limpa o nome
        setActiveGroup(sectionTag); // Já abre a seção para o usuário começar a contar
      }
      
      toast.success("Responsabilidade assumida."); // Aviso de sucesso
    } catch (e) { 
      console.error("Erro de Posse:", e);
      toast.error("Falha ao assumir responsabilidade."); // Aviso se o Firebase negar
    }
  };

  // v8.15.2: CORREÇÃO DEFINITIVA DE PERMISSÃO HÍBRIDA
  const isEditingEnabled = (sec, subInstId = null) => { // A regra de ouro: "Eu posso mexer neste botão agora?"
    if (isClosed || isCountsLocked) return false; // Se lacrado ou encerrado, NINGUÉM mexe
    if (isComissao) return true; // Comissão Nacional sempre pode ajudar a corrigir
    
    // MODO LOCAL: Checa se o usuário logado é o dono do Naipe (metaKey)
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    if (ataData?.scope !== 'regional') { // Se for ensaio comum...
      return localCounts?.[metaKey]?.responsibleId === myUID; // Só edita se for o dono oficial
    }

    // MODO REGIONAL: Regras para múltiplos contadores na mesma seção
    const sectionInstruments = allInstruments.filter(i => (i.section || '').toUpperCase() === sec.toUpperCase());
    const mestre = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase()));
    const masterData = localCounts?.[mestre?.id];
    
    if (subInstId === 'irmas' || subInstId === 'irmaos') { // Se for contagem de irmandade...
      return masterData?.[`responsibleId_${subInstId}`] === myUID; // Edita apenas se assumiu essa sub-tarefa
    }

    return masterData?.responsibleId === myUID; // Caso contrário, checa a posse padrão
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>; // Tela de espera

  return ( // Inicia o desenho da página no celular
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all">
            <ChevronLeft size={22} strokeWidth={3} /> {/* Botão de voltar */}
          </button>
          <div className="text-center px-4 overflow-hidden flex flex-col gap-0.5">
            <p className="text-[14px] font-bold text-slate-900 leading-none">
              {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
               {ataData?.scope === 'regional' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"/>}
               <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-[180px]">
                 {ataData?.comumNome || "Localidade"}
               </h2>
            </div>
          </div>
          {/* BOTÃO v9.6: Chave de Lacre para Gestores - O cadeado azul que tranca tudo */}
          {isRegionalCidade && !isClosed && (
            <button onClick={handleToggleCountsLock} className={`p-3 rounded-2xl active:scale-90 transition-all border ${isCountsLocked ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
              {isCountsLocked ? <Lock size={18} strokeWidth={3}/> : <Unlock size={18} strokeWidth={3}/>}
            </button>
          )}
          {!isRegionalCidade && (
            <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 transition-all border border-red-100">
              <LogOut size={18} strokeWidth={3} /> {/* Botão de sair para usuários comuns */}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar">
        <div className="max-w-md mx-auto">
          {activeTab === 'contador' && ( // Se estivermos na aba de contagem...
            <>
              {/* TARJA v9.6: Aviso visual que aparece quando o gestor lacra os números */}
              <AnimatePresence>
                {isCountsLocked && (
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-100">
                    <Lock size={16} className="shrink-0" />
                    <span className="text-[9px] font-black uppercase italic tracking-widest leading-none">Contagem Finalizada - Somente Leitura</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {ataData?.scope === 'regional' ? ( // Se for regional, usa o layout de lista rápida
                <CounterRegional 
                  instruments={allInstruments}
                  localCounts={localCounts}
                  sections={sections}
                  onUpdate={handleUpdateInstrument}
                  onToggleSection={(id, status, role) => setOwnership(id, status, role)} 
                  onAddExtra={(s) => isGemLocal && setExtraInstrumentSection(s)} 
                  userData={userData}
                  isClosed={isClosed || isCountsLocked} // Repassa o estado de bloqueio
                  currentEventId={currentEventId}
                  onFocus={handleFocus} // NOVO: Passa a função de foco [v10.0]
                  onBlur={handleBlur} // NOVO: Passa a função de saída [v10.0]
                />
              ) : ( // Se for local, usa o layout de sanfona (Accordion)
                sections.map((sec) => (
                  <CounterSection 
                    key={sec}
                    sec={sec}
                    allInstruments={allInstruments}
                    localCounts={localCounts}
                    myUID={myUID}
                    activeGroup={activeGroup}
                    handleToggleGroup={handleToggleGroup}
                    handleUpdateInstrument={handleUpdateInstrument}
                    isEditingEnabled={isEditingEnabled}
                    onAddExtra={(s) => isGemLocal && setExtraInstrumentSection(s)}
                    onFocus={handleFocus} // NOVO: Passa a função de foco [v10.0]
                    onBlur={handleBlur} // NOVO: Passa a função de saída [v10.0]
                  />
                ))
              )}
            </>
          )}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} userData={userData} isMaster={isMaster} isAdmin={canEditAta} />}
          {activeTab === 'dash' && (
            ataData?.scope === 'regional' ? (
              <DashEventRegionalPage 
                eventId={currentEventId} 
                counts={filteredCountsForDash} 
                userData={userData} 
                isAdmin={true} 
                ataData={ataData} 
              />
            ) : (
              <DashEventPage 
                eventId={currentEventId} 
                counts={filteredCountsForDash} 
                userData={userData} 
                isAdmin={true} 
                ataData={ataData} 
              />
            )
          )}
        </div>
      </main>

      <AnimatePresence>
        {showOwnershipModal && ( // Janela que pergunta se o usuário quer assumir a contagem
          <OwnershipModal 
            showOwnershipModal={showOwnershipModal}
            localCounts={localCounts}
            myUID={myUID}
            userData={userData}
            onConfirm={(sec) => setOwnership(`meta_${sec.toLowerCase().replace(/\s/g, '_')}`, true)}
            onCancel={() => setShowOwnershipModal(null)}
          />
        )}
        {extraInstrumentSection && ( // Janela para digitar o nome de um instrumento extra
          <ExtraInstrumentModal 
            section={extraInstrumentSection}
            onConfirm={handleAddExtraInstrument}
            onCancel={() => setExtraInstrumentSection(null)}
          />
        )}
      </AnimatePresence>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-[50]">
        <nav className="flex justify-around bg-slate-950/95 backdrop-blur-xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl">
          <TabButton active={activeTab === 'contador'} icon={<LayoutGrid size={18}/>} label="Contar" onClick={() => setActiveTab('contador')} />
          <TabButton active={activeTab === 'ata'} icon={<ClipboardCheck size={18}/>} label="Ata" onClick={() => setActiveTab('ata')} />
          <TabButton active={activeTab === 'dash'} icon={<BarChart3 size={18}/>} label="Dash" onClick={() => setActiveTab('dash')} />
        </nav>
      </footer>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }) => ( // Componente visual do botão da barra de navegação
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-50'}`}>
    {icon}<span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">{label}</span>
  </button>
);

export default CounterPage; // Exporta a página pronta para o sistema usar