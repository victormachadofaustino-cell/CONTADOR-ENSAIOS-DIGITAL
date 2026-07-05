import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Explicação: Importa as ferramentas de memória e sincronização do React.
// PRESERVAÇÃO: Importações originais mantidas com a adição cirúrgica do 'where' que faltava
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, where, getDoc } from '../../config/firebase'; // Explicação: CONEXÃO COM O FIREBASE: Mantém a importação estável de todos os motores de dados.
import { eventService } from '../../services/eventService'; // Explicação: Importa o motor de salvamento de contagens.
import { useCounterSync } from '../../hooks/useCounterSync'; // Explicação: 🚀 INJEÇÃO ARQUITETURAL: Importa o nosso novo motor isolado de sincronização e buffers de rede.
import AtaPage from './AtaPage'; // Explicação: Importa a página de preenchimento da Ata.
import DashEventPage from '../dashboard/DashEventPage'; // Explicação: Importa o painel de gráficos local.
import DashEventRegionalPage from '../dashboard/DashEventRegionalPage'; // Explicação: Importa o painel de gráficos regional.
import toast from 'react-hot-toast'; // Explicação: Importa as notificações de aviso da tela.
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, Lock, Unlock, Trash2, Users, X // Explicação: Desenhos dos ícones dos botões importados do lucide-react.
} from 'lucide-react'; // Explicação: Biblioteca de ícones modernos.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Sistema de animations fluidas.
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa os dados e permissões do usuário logado.

// IMPORTAÇÃO DOS NOVOS COMPONENTES MODULARES
import CounterSection from './components/CounterSection'; // Explicação: Componente que agrupa instrumentos (ex: Cordas).
import OwnershipModal from './components/OwnershipModal'; // Explicação: Janela de "Deseja assumir esta seção?".
import ExtraInstrumentModal from './components/ExtraInstrumentModal'; // Explicação: Janela para adicionar instrumentos na hora.
import CounterRegional from './components/CounterRegional'; // Explicação: Modo de contagem em massa para eventos regionais.
import CounterFooter from './components/CounterFooter'; // Explicação: Traz o nosso RODAPÉ ISOLADO e fixado na base absoluta da tela.

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => { // Explicação: Inicia a estrutura da página de contagem.
  const { userData } = useAuth(); // Explicação: Puxa o crachá eletrônico do usuário logado (Custom Claims).
  
  // 🚀 ACOPLAGEM SÊNIOR: Conecta a página de contagem diretamente ao barramento isolado useCounterSync limpando os códigos pesados de dentro da tela!
  const {
    localCounts, setLocalCounts, ataData, eventComumId, eventDateRaw, isCountsLocked,
    focusedField, setFocusedField, lastLocalUpdateRef,
    handleFocus, handleBlur, updateCount, setOwnership, MAPA_TRADUTOR_EXTENSO
  } = useCounterSync(currentEventId, counts); // Explicação: Herda todos os estados sincronizados e represas anti-piscas prontas do Custom Hook.

  // Explicação: REFACTOR DE HIERARQUIA: Vincula as checagens de poder baseando-se estritamente no campo oficial 'accessLevel' do token.
  const level = userData?.accessLevel; // Explicação: Captura a string pura do cargo gravada no crachá eletrônico.
  const isMaster = level === 'master'; // Explicação: Verifica se o nível de acesso do crachá do usuário é Master.
  const isComissao = level === 'comissao' || isMaster; // Explicação: Verifica se o usuário pertence à comissão regional ou master.
  const isRegionalCidade = level === 'regional_cidade' || isComissao; // Explicação: Verifica se ele gerencia o nível de regional_cidade ou superior.
  const isGemLocal = level === 'gem_local' || isRegionalCidade; // Explicação: Verifica se possui nível de administração local ou superior.
  const isBasico = level === 'basico'; // Explicação: Identifica se o usuário possui apenas nível básico de leitura.
  
  const canEditAta = isGemLocal || isRegionalCidade || isComissao || isMaster; // Explicação: Condicional que avalia se o usuário tempo cargo suficiente para mexer na Ata.

  const [activeTab, setActiveTab] = useState('contador'); // Explicação: Controla se estamos na aba de contagem, ata ou gráficos.
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Explicação: Lista nacional de instrumentos da CCB.
  const [instrumentsConfig, setInstrumentsConfig] = useState([]); // Explicação: Configurações específicas da igreja local.
  const [activeGroup, setActiveGroup] = useState(null); // Explicação: Qual naipe está aberto no momento.
  const [loading, setLoading] = useState(true); // Explicação: Tela de carregamento inicial.
  const [showOwnershipModal, setShowOwnershipModal] = useState(null); // Explicação: Controla la janela de "Assumir Seção".
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null); // Explicação: Caixa que armazena qual naipe receberá um instrumento extra inserido dinamicamente.

  // NOVOS ESTADOS PARA SUPORTE DA JANELA FLUTUANTE DE CHECKLIST NOMINAL POR INSTRUMENTO
  const [instrumentoFocadoChecklist, setInstrumentoFocadoChecklist] = useState(null); // Explicação: Salva qual instrumento o usuário clicou para fazer a chamada nominal (ex: viola).
  const [listaMusicosChamada, setListaMusicosChamada] = useState([]); // Explicação: Armazena as fichas de chamada dos músicos vinculadas a esse instrumento específico.
  const [valorNumeroDireto, setValorNumeroDireto] = useState(''); // Explicação: Estado temporário para capturar a digitação manual de quantidade avulsa no topo do modal.

  const isClosed = ataData?.status === 'closed'; // Explicação: Calculates em tempo real se a ata do ensaio já foi encerrada definitivamente.
  const myUID = auth.currentUser?.uid; // Explicação: Pega o código identificador único de usuário gerado no login.

  // CARREGAMENTO DE INSTRUMENTOS
  useEffect(() => { // Explicação: Carrega as tabelas mestre e as configurações locais da orquestra ao abrir.
    let isMounted = true; // Explicação: Flag de segurança para evitar vazamento de memória se o usuário sair rápido da página.
    const loadInstruments = async () => { // Explicação: Declara a função assíncrona de download de dependências.
      try { // Explicação: Tenta fazer as requisições assíncronas no banco de dados.
        const nacSnap = await getDocs(query(collection(db, 'config_instrumentos_nacional'), orderBy('name', 'asc'))); // Explicação: Baixa a lista nacional mestre de instrumentos do banco.
        if (isMounted) setInstrumentsNacionais(nacSnap.docs.map(d => ({ id: d.id, ...d.data() }))); // Explicação: Se a página continuar aberta, salva a lista mestre na memória.
        if (eventComumId) { // Explicação: Se o identificador da igreja do ensaio já estiver mapeado.
          const locSnap = await getDocs(collection(db, 'comuns', eventComumId, 'instrumentos_config')); // Explicação: Baixa a configuração de orquestra exclusiva dellaquela igreja.
          if (isMounted) setInstrumentsConfig(locSnap.docs.map(d => ({ id: d.id, ...d.data() }))); // Explicação: Salva a configuração local de instrumentos.
        } // Explicação: Encerra a consulta privativa local.
      } catch (e) {} // Explicação: Ignora falhas silenciosas de carregamento.
      finally { if (isMounted) setLoading(false); } // Explicação: Desativa a tela de carregamento principal liberando o app.
    }; // Explicação: Encerra o scope della subrotina assíncrona.
    loadInstruments(); // Explicação: Executa a sequência de carregamento declarada acima.
    return () => { isMounted = false; }; // Explicação: Desliga a flag ao desmontar a página por segurança.
  }, [eventComumId]); // Explicação: Executa novamente se o ID da igreja mudar.

  // OUVINTE REATIVO PARA O MODEL DE CHECKLIST NOMINAL (BUSCA TOLERANTE COM BLINDAGEM ANTI-UNDEFINED)
  useEffect(() => { // Explicação: Monitor inteligente que carrega a subcoleção de chamada nominal do instrumento focado sem tocar na raiz da comum.
    if (!currentEventId || !instrumentoFocadoChecklist) { // Explicação: Se o código do ensaio ou o instrumento selecionado estiverem ausentes.
      setListaMusicosChamada([]); // Explicação: Esvazia o vetor de músicos na tela.
      setValorNumeroDireto(''); // Explicação: Limpa o input numérico auxiliar.
      return; // Explicação: Aborta.
    } // [Funcionamento]: Encerra barreira de verificação.
    
    const idCru = instrumentoFocadoChecklist.id; // Explicação: Captura a ID de clique (pode ser "vln" ou "violino").
    const idSiglaReal = (idCru.length > 4) ? MAPA_TRADUTOR_EXTENSO[idCru] : idCru; // Explicação: Traduz o ID longo para sigla curta de conferência.
    const idExtensoReal = (idCru.length <= 4) ? MAPA_TRADUTOR_EXTENSO[idCru] : idCru; // Explicação: Traduz a sigla para o nome por extenso de salvamento.

    const valorAtualBanco = localCounts?.[idExtensoReal || idCru]?.comum || 0; // Explicação: Puxa os presentes antigos salvos no mapa mestre.
    setValorNumeroDireto(valorAtualBanco > 0 ? String(valorAtualBanco) : ''); // Explicação: Alimenta a memória temporária do input.

    const llamadaRef = collection(db, 'events_global', currentEventId, 'chamada_musicos'); // Explicação: Prepara a rota da ficha de presença de portaria.

    // 🚀 BLINDAGEM ABSOLUTA (ANTI-UNDEFINED CRASH): Filtra a lista removendo qualquer valor nulo ou inexistente antes de passar para o 'in'.
    const arrayFiltroValido = [idExtensoReal, idSiglaReal, idCru].filter(v => v !== undefined && v !== null && v !== ''); // Explicação: Saneia e expulsa ponteiros em branco para não crashar a consulta.

    const q = query(llamadaRef, where('instrumentoId', 'in', arrayFiltroValido)); // Explicação: Une as chaves filtradas e seguras na mesma consulta do Firestore.
    
    const unsubChamada = onSnapshot(q, (snap) => { // Explicação: Ouve em tempo real as presenças daquele naipe específico.
      const res = snap.docs.map(d => ({ id: d.id, ...d.data() })); // Explicação: Monta os objetos legíveis em memória do JavaScript.
      res.sort((a, b) => a.nome.localeCompare(b.nome)); // Explicação: Ordena os irmãos por ordem alfabética na janelinha.
      setListaMusicosChamada(res); // Explicação: Salva as fichas nominais na memória da listagem.
    }); // Explicação: Encerra a conexão.

    return () => unsubChamada(); // Explicação: Fecha a escuta imediatamente ao fechar a janela para economizar dados.
  }, [currentEventId, instrumentoFocadoChecklist, localCounts, MAPA_TRADUTOR_EXTENSO]); // Explicação: Reinicia se mudar o instrumento focado ou o ensaio.

  const allInstruments = useMemo(() => { // Explicação: Junta a matriz nacional com as edições da igreja para montar a listagem oficial organizada.
    const ordemOficial = ['coral', 'irmandade', 'irmas', 'irmaos', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    let base = instrumentsNacionais.map(instBase => { // Explicação: Percorre a matriz de instrumentos padrão nacional.
      const override = instrumentsConfig.find(local => local.id === instBase.id); // Explicação: Tenta achar se o usuário editou este instrumento no cadastro daquela igreja.
      return override ? { ...instBase, ...override } : instBase; // Explicação: Se editou, mescla as alterações, senão mantém o padrão nacional imutável.
    }); // Explicação: Encerra a varredura da base fixa.
    const extraIdsNoBanco = Object.keys(localCounts).filter(k => !k.startsWith('meta_') && !base.find(b => b.id === k)); // Explicação: Encontra IDs extras que foram criados na hora do ensaio e não estão na base padrão.
    const extras = extraIdsNoBanco.map(id => { // Explicação: Mapeia e gera a estrutura visual para os instrumentos extras dinâmicos.
      const configLocalSeExistir = instrumentsConfig.find(c => c.id === id); // 🚀 INTEGRAÇÃO DA REGRA DE HERANÇA: Busca o cadastro oficial customizado feito nos ajustes da Comum.
      return {
        id: id, // Explicação: Copia a ID do item avulso.
        name: configLocalSeExistir?.name || localCounts[id].name || id.replace('extra_', '').toUpperCase(), // 🚀 HERANÇA DE PROPRIEDADE: Puxa o nome textual cadastrado na Comum.
        section: (configLocalSeExistir?.section || localCounts[id].section || 'GERAL').toUpperCase(), // 🚀 BLINDAGEM DO NAIPE: Recupera a família real (ex: 'METAIS') cadastrada na Comum em vez de chutar no 'GERAL'.
        isExtra: true // Explicação: Carimba uma flag marcando que este item foi criado na hora.
      };
    }); // Explicação: Encerra a varredura de itens extras.
    return [...base, ...extras].sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99)); 
  }, [instrumentsNacionais, instrumentsConfig, localCounts]); // Explicação: Recalcula se as locais de configuração ou contagens sofrerem alteração.

  const sections = useMemo(() => { // Explicação: Identifica quais seções ou naipes existem na lista total para criar os títulos na tela.
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS']; // Explicação: Ordem visual padrão de cabeçalhos.
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99)); // Explicação: Agrupa os nomes de seções removendo duplicados e ordenando rigorosamente pelo padrão.
  }, [allInstruments]); // Explicação: Recalcula se la lista unificada de instrumentos mudar.

  // --- 🚀 REMODELAGEM CIRÚRGICA DA TRAVA VISUAL: LIBERAÇÃO DO ACESSO BÁSICO DA PRÓPRIA COMUM ---
  const isEditingEnabled = (sec, subInstId = null) => { // Explicação: Descobre se o seu crachá eletrônico territorial te dá direito de somar/subtrair nesta linha da tela.
    if (isClosed || isCountsLocked) return false; // Explicação: Se a contagem ou ata geral do ensaio foi lacrada, bloqueia o app inteiro para edição.
    if (isComissao) return true; // Explicação: Nível master e comissão regional ganham permissão global automática em qualquer naipe.
    
    const minhaComumLegitima = userData?.comumId || userData?.activeComumId; // Explicação: Puxa a igreja mãe de direito gravada no chip do seu login.
    const ehEnsaioDaMinhaCasa = minhaComumLegitima === eventComumId; // Explicação: Compara se o ensaio aberto na tela pertence à igreja dele.
    const ehEventoLocal = ataData?.scope !== 'regional'; // Explicação: Verifica se o escopo não é uma reunião regional centralizada de comarca.
    
    // 🚀 AJUSTE DE LIBERAÇÃO DA INTERFACE: Permite cliques se o usuário for cadastrado nesta igreja (Básico ou GEM Local) em ensaio local comum.
    if ((level === 'gem_local' || level === 'basico') && ehEnsaioDaMinhaCasa && ehEventoLocal) { // Explicação: Se for da mesma igreja comuns e ensaio local, abre os botões para clique na hora!
      return true; // Explicação: Destrava a opacidade e liga as ações de presença nominal de custo zero de cota!
    }

    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Calculates a chave técnica de metadados da seção (ex: 'meta_cordas').
    if (ehEventoLocal) return localCounts?.[metaKey]?.responsibleId === myUID; // Explicação: Fallback para ensaios locais comuns caso haja divisão de secretários auxiliares.
    const sectionInstruments = allInstruments.filter(i => (i.section || '').toUpperCase() === sec.toUpperCase()); // Explicação: Tratamento complexo para divisão de naipes regionais em massa.
    const mestre = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase())); // Explicação: Isola a referência principal de instrumento da seção.
    const masterData = localCounts?.[mestre?.id]; // Explicação: Puxa as contagens e assinaturas de controle daquele instrumento.
    if (subInstId === 'irmas' || subInstId === 'irmaos') return masterData?.[`responsibleId_${subInstId}`] === myUID; // Explicação: Trata permissões específicas de divisão de gênero para o caso do Coral.
    return masterData?.responsibleId === myUID; // Explicação: Retorna se o ID do responsible confere com whom está logado no aparelho.
  }; // Explicação: Encerra o método de checagem isEditingEnabled.

  const handleUpdateInstrument = (id, field, value, section, payloadExtra = {}) => { // Explicação: Executada a cada clique nos botões de + ou - ou ao digitar no input.
    updateCount(id, field, value, section, userData); // 🚀 REDIRECIONAMENTO CIRÚRGICO: Repassa a batida de botão para o nosso hook useCounterSync fazer o debounce de rede de forma estável.
  }; // Explicação: Encerra a função handleUpdateInstrument.

  // INTELIGÊNCIA DIRETA COM TRAVA DE TETO VERDADEIRA: LEITURA SOBERANA DO NÓ POR EXTENSO
  const handleUpdateNumeroDiretoModal = async (novoValor) => { // Explicação: Salva a quantidade avulsa digitada na pílula do topo do modal, ativando o modo numérico e limpando presenças.
    if (!currentEventId || isCountsLocked || isClosed || !instrumentoFocadoChecklist) return; // Explicação: Trava defensiva sanitária de barreira.
    
    lastLocalUpdateRef.current = Date.now(); // Explicação: Ativa o escudo anti-sobrescrita local de 3 segundos.

    const idCru = instrumentoFocadoChecklist.id; // Explicação: Captura a ID de clique (pode ser "vln" ou "violino").
    const targetId = (idCru.length <= 4) ? MAPA_TRADUTOR_EXTENSO[idCru] : idCru; // Explicação: 🚀 BLINDAGEM DE SINAL: Traduz a sigla ("vln") para o nome extenso ("violino") para ler o Total correto e não travar in zero!
    const totalMaximoPermitido = parseInt(localCounts?.[targetId || idCru]?.total) || 0; // Explicação: Captura em tempo real o limite físico das setas.

    let numeroLimpo = Math.max(0, parseInt(novoValor) || 0); // Explicação: Limpa e força número inteiro positivo.
    
    // 🚀 TRAVA DO TETO ATIVADA: Se tentar digitar uma quantidade maior que o total físico, barra na hora e iguala ao limite.
    if (numeroLimpo > totalMaximoPermitido) {
      numeroLimpo = totalMaximoPermitido; // Explicação: Força a trava teto rebaixando para o teto real.
      toast(`Quantidade limitada ao total presente (${totalMaximoPermitido})`, { icon: '⚠️' }); // Explicação: Emite notificação visual de bloqueio.
    }

    setValorNumeroDireto(numeroLimpo > 0 ? String(numeroLimpo) : ''); // Explicação: Atualiza a memória de digitação da caixa de texto do modal.
    const eventRef = doc(db, 'events_global', currentEventId); // Explicação: Localiza o endereço físico do ensaio no Firebase.

    try { // Explicação: Tenta gravar a alteração manual no Firebase.
      // Explicação: Grava o número digitado na gaveta Comum mestre por extenso e carimba 'modoContagem: numerico'.
      await updateDoc(eventRef, {
        [`counts.${targetId || idCru}.comum`]: numeroLimpo,
        [`counts.${targetId || idCru}.modoContagem`]: 'numerico',
        updatedAt: Date.now()
      }); 

      setLocalCounts(prev => ({
        ...prev,
        [targetId || idCru]: { ...prev[targetId || idCru], comum: numeroLimpo, modoContagem: 'numerico' }
      })); // Explicação: Updates visual otimista da tela mestre.
    } catch (e) { 
      toast.error("Erro ao salvar quantidade avulsa."); // Explicação: Avisa em caso de erro de rede.
    } 
  }; 

  // FUNÇÃO DE SELEÇÃO E GRAVAÇÃO DE PRESENÇA NOMINAL POR MÚSICO INDIVIDUAL (PADRÃO ATA TOQUE AZUL REAL)
  const handleTogglePresencaMusico = async (musico) => { // Explicação: Executada quando o secretário toca no card do irmão.
    if (!currentEventId || isCountsLocked || isClosed) return; // Explicação: Trava de barreira operacional.
    
    lastLocalUpdateRef.current = Date.now(); // Explicação: Ativa a proteção anti-pisca local para o Toque Azul fixar os números na tela na hora, sem cache reverso!
    
    const docMusicoRef = doc(db, 'events_global', currentEventId, 'chamada_musicos', musico.id); // Explicação: Localiza o documento do músico logado na portaria.
    const novoStatusPresenca = !musico.presente; // Explicação: Inverte de presente para ausente ou vice-versa.

    try { // Explicação: Tenta rodar a transação.
      await updateDoc(docMusicoRef, { presente: novoStatusPresenca, updatedAt: Date.now() }); // Explicação: Grava a presença do músico isolado no banco.
      
      const listaAtualizadaEspelho = listaMusicosChamada.map(m => m.id === musico.id ? { ...m, presente: novoStatusPresenca } : m); // Explicação: Clona e updates a portaria na RAM.
      let totalPresentesEfetivo = listaAtualizadaEspelho.filter(m => m.presente).length; // Explicação: Conta as cabeças marcadas em verdadeiro.

      const idCru = instrumentoFocadoChecklist.id; // Explicação: Resgata a ID de foco.
      const targetId = (idCru.length <= 4) ? MAPA_TRADUTOR_EXTENSO[idCru] : idCru; // Explicação: Traduz para a chave por extenso para checar o teto físico real do painel.
      const totalMaximoPermitido = parseInt(localCounts?.[targetId || idCru]?.total) || 0; // Explicação: Resgata o limite absoluto das setas.

      // 🚀 TRAVA NOMINAL DE TETO: Se as chamadas em lote superarem o total das setas, segura o valor no limite máximo.
      if (totalPresentesEfetivo > totalMaximoPermitido) {
        totalPresentesEfetivo = totalMaximoPermitido; // Explicação: Iguala ao teto físico mestre.
      }

      setValorNumeroDireto(totalPresentesEfetivo > 0 ? String(totalPresentesEfetivo) : ''); // Explicação: Despeja o totalizador no input numérico do modal.

      const eventRef = doc(db, 'events_global', currentEventId); // Explicação: Localiza o documento técnico do ensaio.
      
      await updateDoc(eventRef, {
        [`counts.${targetId || idCru}.comum`]: totalPresentesEfetivo,
        [`counts.${targetId || idCru}.modoContagem`]: 'nominal',
        updatedAt: Date.now()
      }); 

      setLocalCounts(prev => ({
        ...prev,
        [targetId || idCru]: { ...prev[targetId || idCru], comum: totalPresentesEfetivo, modoContagem: 'nominal' }
      })); // Explicação: Updates visual otimista da tela mestre.
    } catch (err) { 
      toast.error("Erro ao registrar presença."); // Explicação: Notifica erro de rede.
    } 
  }; 

  // FUNÇÃO DE GESTÃO DE AVALIAÇÃO DE TESTE DO ALUNO NO SELETOR NOMINAL
  const handleUpdateAvaliacaoMusico = async (musico, novaAvaliacao) => { // Explicação: Salva a nota ou status de avaliação de teste do aprendiz no ensaio.
    if (!currentEventId || isCountsLocked || isClosed) return; // Explicação: Trava de barreira.
    const docMusicoRef = doc(db, 'events_global', currentEventId, 'chamada_musicos', musico.id); // Explicação: Mira no documento mestre do irmão dentro do lote do ensaio.
    try { // Explicação: Tenta salvar no Firebase.
      await updateDoc(docMusicoRef, { avaliacao: novaAvaliacao, updatedAt: Date.now() }); // Explicação: Grava a nota de teste diretamente na ata histórica deste ensaio.
      toast.success("Avaliação salva!"); // Explicação: Alerta sucesso.
    } catch (err) { // Explicação: Captura falha.
      toast.error("Erro ao gravar avaliação."); // Explicação: Alerta falha.
    } // Termina o catch.
  }; // Explicação: Encerra a função handleUpdateAvaliacaoMusico.

  const handleAddExtraInstrument = async (nome) => { // Explicação: Salva um instrumento customizado extra inserido na hora pelo painel.
    if (!nome.trim() || !extraInstrumentSection || !isGemLocal || isCountsLocked) return; // Explicação: Filtra parâmetros válidos e travas de segurança.
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, '')}_${Date.now()}`; // Explicação: Gera um ID dinâmico único e limpo para o instrumento extra.
    try { // Explicação: Tenta salvar.
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: idSaneado, field: 'total', value: 0, userData, section: extraInstrumentSection, customName: nome.toUpperCase().trim() }); // Explicação: Envia a inicialização do instrumento extra para o banco de dados.
      setExtraInstrumentSection(null); // Explicação: Fecha o modal de inserção de instrumento extra.
      toast.success("Instrumento adicionado!"); // Explicação: Alerta o usuário do sucesso della criação.
    } catch (e) {} // Explicação: Abafa erros silenciosos.
  }; // Explicação: Encerra a função handleAddExtraInstrument.

  // 🚀 REFAZIMENTO CIRÚRGICA DA CONDICIONAL: SEPARA O CLIQUE DO TÍTULO VISUAL DO CLIQUE NO BOTÃO "ASSUMIR" DA PÍLULA
  const handleToggleGroup = (sec) => { // Explicação: Executada exclusivamente quando o usuário clica no botão de Assumir ou Trocar a zeladoria de um naipe.
    if (isClosed || isCountsLocked) return; // Explicação: Se o ensaio ou contagem geral estiverem bloqueados, impede qualquer alteração de portaria.
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Condrói a chave técnica da seção correspondente.
    const responsibleId = localCounts?.[metaKey]?.responsibleId; // Explicação: Puxa o ID do responsável do banco de dados.
    
    if (activeGroup === sec && responsibleId === myUID) { // Explicação: Se o usuário já for o dono ativo da caneta e quiser apenas recolher a visualização.
      setActiveGroup(null); // Explicação: Fecha a sanfona de instrumentos para limpar espaço na tela.
      return; // Explicação: Aborta o fluxo para evitar que a janela flutuante surja sem necessidade.
    }
    
    setShowOwnershipModal(sec); // 🚀 LIBERAÇÃO TOTAL: Abre obrigatoriamente o modal de posse na tela do celular do GEM Local para registrar o nome dele no banco!
  }; // Explicação: Encerra o método handleToggleGroup.

  const handleConfirmOwnership = (sec) => { // Explicação: Executada quando o usuário clica em sim na janela flutuante de posse.
    setOwnership(`meta_${sec.toLowerCase().replace(/\s/g, '_')}`, myUID, userData?.name); // 🚀 REDIRECIONAMENTO CIRÚRGICO: Repassa a assinatura de caneta de naipe para o useCounterSync salvar no Firebase.
    setShowOwnershipModal(null); // Explicação: Fecha o modal da tela.
    setActiveGroup(sec.toUpperCase()); // Explicação: Abre imediatamente a sanfona visual do naipe assumido.
  }; // Explicação: Encerra o método handleConfirmOwnership.

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>; // Explicação: Desenha uma tela neutra de carregamento até as informações estarem na memória.

  return ( // Explicação: Inicia a montagem dos elementos de interface visual na tela do smartphone.
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      {/* HEADER COM CENTRALIZAÇÃO ABSOLUTA */}
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50 relative">
        <div className="flex justify-between items-center max-w-md mx-auto w-full relative h-12">
          
          {/* BOTÃO VOLTAR */}
          <button type="button" onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all z-10 cursor-pointer">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
          
          {/* TÍTULO CENTRALIZADO */}
          <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[14px] font-bold text-slate-900 leading-none">
              {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
               {ataData?.scope === 'regional' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"/>}
               <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-[150px] text-center">
                 {ataData?.comumNome || "Localidade"}
               </h2>
            </div>
          </div>

          {/* BOTÃO CADEADO */}
          <div className="flex items-center gap-2 z-10">
            {(ataData?.scope === 'regional' ? (isComissao || isMaster) : isRegionalCidade) && !isClosed && (
              <button type="button" onClick={() => updateDoc(doc(db, 'events_global', currentEventId), { countsLocked: !isCountsLocked, updatedAt: Date.now() })} className={`p-3 rounded-2xl active:scale-90 transition-all border cursor-pointer ${isCountsLocked ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {isCountsLocked ? <Lock size={18} strokeWidth={3}/> : <Unlock size={18} strokeWidth={3}/>}
              </button>
            )}
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar text-left">
        <div className="max-w-md mx-auto text-left">
          {activeTab === 'contador' && (
            <>
              <AnimatePresence>
                {isCountsLocked && (
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-100">
                    <Lock size={16} className="shrink-0" /><span className="text-[9px] font-black uppercase italic tracking-widest leading-none">Contagem Finalizada - Somente Leitura</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {ataData?.scope === 'regional' ? (
                <CounterRegional instruments={allInstruments} localCounts={localCounts} sections={sections} onUpdate={handleUpdateInstrument} onToggleSection={(id, status, role) => setOwnership(id, auth.currentUser?.uid, userData?.name)} userData={userData} isClosed={isClosed || isCountsLocked} currentEventId={currentEventId} onFocus={handleFocus} onBlur={handleBlur} isEditingEnabled={isEditingEnabled} />
              ) : (
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
                    onFocus={handleFocus} 
                    onBlur={handleBlur} 
                    ataData={ataData} 
                    userData={userData}
                    onOpenChecklistNominal={(inst) => setInstrumentoFocadoChecklist(inst)}
                    comumId={eventComumId}
                  />
                ))
              )}
            </>
          )}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} />}
          {activeTab === 'dash' && (
            ataData?.scope === 'regional' ? (
              <DashEventRegionalPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} />
            ) : (
              <DashEventPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} allEvents={allEvents} />
            )
          )}
        </div>
      </main>

      <CounterFooter 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* INTERFACE MODAL UNIFICADA BRANCO/AZUL COM COMENTÁRIOS VALIDADOS EM BLOCKS */}
      <AnimatePresence>
        {instrumentoFocadoChecklist && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in navigate-fade duration-200">
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }} className="bg-white rounded-t-[2.5rem] sm:rounded-[2.2rem] w-full max-w-xs p-6 shadow-2xl text-left border border-slate-100 flex flex-col max-h-[85vh]">
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0 text-left">
                <div className="text-left min-w-0 flex-1 leading-none">
                  <span className="text-[7px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md uppercase italic tracking-wider leading-none">Entrada Híbrida</span>
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-tight italic mt-1.5 truncate text-left leading-none">
                    Contagem: {allInstruments.find(i => i.id === MAPA_TRADUTOR_EXTENSO[instrumentoFocadoChecklist.id] || i.id === instrumentoFocadoChecklist.id)?.name || instrumentoFocadoChecklist.name}
                  </h3>
                </div>
                <button type="button" onClick={() => setInstrumentoFocadoChecklist(null)} className="w-8 h-8 bg-slate-50 rounded-full text-slate-400 flex items-center justify-center outline-none shrink-0 ml-2 cursor-pointer">
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* PORTA 1: DIGITAÇÃO DIRETA AVULSA NO TOPO */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/50 mt-3 shrink-0 flex flex-col gap-1.5 text-left">
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1 text-left leading-none">Digitar quantidade diretamente se preferir (Avulso)</label>
                <input 
                  disabled={!isEditingEnabled(instrumentoFocadoChecklist.section)}
                  type="number" 
                  inputMode="numeric" 
                  className="w-full bg-white p-3 rounded-xl border border-slate-200 text-xs font-black text-slate-950 uppercase italic outline-none focus:border-indigo-600 min-h-[40px] text-center"
                  placeholder="EX: 0, 5, 12..."
                  value={valorNumeroDireto}
                  onChange={(e) => handleUpdateNumeroDiretoModal(e.target.value)}
                />
              </div>

              {/* PORTA 2: LISTA DE TOQUE */}
              <div className="flex-1 overflow-y-auto py-3 mt-1 space-y-2 no-scrollbar text-left">
                <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1 text-left leading-none">Ou selecione os músicos abaixo por extenso (Toque Azul)</p>
                {listaMusicosChamada.length === 0 ? ( // 🚀 CORREÇÃO DO BUG OCULTO: Substituída a variável inexistente 'allCounts' pela volumetria legítima das fichas!
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-wider italic text-center">Nenhum alistamento cadastrado para esta localidade comuns.</p>
                  </div>
                ) : (
                  listaMusicosChamada.map(m => {
                    const deEdicaoLiberada = isEditingEnabled(instrumentoFocadoChecklist.section);
                    return (
                      <div 
                        key={m.id} 
                        onClick={() => deEdicaoLiberada && handleTogglePresencaMusico(m)}
                        className={`p-3.5 rounded-xl border transition-all shadow-3xs cursor-pointer flex flex-col gap-1.5 text-left active:scale-[0.99] select-none ${
                          m.presente 
                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs shadow-indigo-100 font-black' 
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50/80' 
                        }`} 
                      >
                        <div className="flex justify-between items-center gap-2 w-full text-left">
                          <p className="text-[11px] font-black uppercase italic whitespace-normal break-words leading-tight flex-1 min-w-0 pr-1 text-left">
                            {m.nome}
                          </p>
                          <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded-md uppercase italic border shrink-0 ${
                            m.presente ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            {m.situacao?.includes('Oficial') ? 'OF' : m.situacao?.includes('Jovens') ? 'RJM' : 'ALU'}
                          </span>
                        </div>

                        {/* SELETOR DE NOTAS DE TESTES */}
                        {(m.situacao?.includes('Aprendiz') || m.situacao?.includes('Aluno')) && (
                          <div 
                            className="mt-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()} 
                          >
                            <select 
                              disabled={!deEdicaoLiberada}
                              className={`border text-[8px] font-black rounded px-1 py-0.5 uppercase tracking-wide outline-none cursor-pointer w-full text-center ${
                                m.presente ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                              value={m.avaliacao || 'Sem'}
                              onChange={(e) => handleUpdateAvaliacaoMusico(m, e.target.value)}
                            >
                              <option value="Sem" className="text-slate-900 font-bold">Sem Avaliação</option>
                              <option value="Aprovado Encarregado" className="text-slate-900 font-bold">Aprovado Encarregado</option>
                              <option value="Aprovado Examinadora" className="text-slate-900 font-bold">Aprovado Examinadora</option>
                              <option value="Necessita Treino" className="text-slate-900 font-bold">Necessita Treino</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 shrink-0">
                <button 
                  type="button"
                  onClick={() => setInstrumentoFocadoChecklist(null)}
                  className="w-full h-10 bg-slate-950 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 outline-none cursor-pointer"
                >
                  Concluir e Fechar Painel
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOwnershipModal && (
          <OwnershipModal showOwnershipModal={showOwnershipModal} localCounts={localCounts} myUID={myUID} userData={userData} onConfirm={handleConfirmOwnership} onCancel={() => setShowOwnershipModal(null)} />
        )}
        {extraInstrumentSection && (
          <ExtraInstrumentModal section={extraInstrumentSection} onConfirm={handleAddExtraInstrument} onCancel={() => setExtraInstrumentSection(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CounterPage;