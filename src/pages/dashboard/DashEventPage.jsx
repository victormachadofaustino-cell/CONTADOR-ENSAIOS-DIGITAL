import React, { useMemo, useState } from 'react'; // Explicação: Ferramenta base do React que gerencia os estados das abas e evita cálculos repetidos na memória.
import toast from 'react-hot-toast'; // Explicação: Sistema de avisos que faz aparecer pequenos balões flutuantes de sucesso ou erro na tela.
import { 
  TrendingUp, Music, Star, 
  Share2, Activity, PieChart, 
  CheckCircle2, Info, ShieldCheck, Users, FileText, Briefcase, Menu, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react'; // Explicação: Biblioteca que fornece os desenhos dos ícones usados nos botões e nos títulos dos cartões.
import { pdfEventService } from '../../services/pdfEventService'; // Explicação: Serviço interno responsável por desenhar e gerar o arquivo PDF oficial da Ata.
import { whatsappService } from '../../services/whatsappService'; // Explicação: Serviço interno que formata as mensagens de texto com os números para enviar ao WhatsApp.
import { useAuth } from '../../context/AuthContext'; // Explicação: Conecta com o sistema de login para ler o "Crachá Eletrônico" (Custom Claims) do usuário logado.
import { db, doc, getDoc } from '../../config/firebase'; // Explicação: Componentes oficiais de conexão que fazem a ponte com o banco de dados central Firebase.

// v8.9.3: Importação da Regra de Ouro para travar exportação (PDF/Compartilhar)
import { hasPermission } from '../../config/permissions'; // Explicação: Importa o gerenciador oficial que decide se o usuário pode ou não exportar os dados.

// IMPORTAÇÃO DOS MÓDULOS ATÔMICOS v8.9.1
import DashStatsHeader from './components/DashStatsHeader.jsx'; // Explicação: Importa o componente visual do cabeçalho de alimentação (lanches).
import DashEquilibriumSection from './components/DashEquilibriumSection.jsx'; // Explicação: Importa o componente visual que exibe o equilíbrio e divisão de naipes da orquestra.
import DashFinalSummary from './components/DashFinalSummary.jsx'; // Explicação: Importa o componente dos botões finais de compartilhamento e relatórios.

const DashEventPage = ({ counts, ataData, isAdmin, eventId, allEvents = [] }) => { // Explicação: Início do componente principal que constrói a página do painel do ensaio, recebendo a lista histórica para comparação.
  const { userData } = useAuth(); // Explicação: Extrai as informações de perfil do usuário que está visualizando a página através do AuthContext.
  const level = userData?.accessLevel; // Explicação: Armazena o nível de poder (Master, GEM, etc.) extraído diretamente do crachá do usuário logado.
  
  // Explicação: Estados locais para monitorar qual aba está selecionada e se o menu de 3 barras do topo está aberto.
  const [activeTab, setActiveTab] = useState('geral'); // Explicação: Define por padrão que a aba inicial exibida é a de 'Visão Geral'.
  const [dropdownOpen, setDropdownOpen] = useState(false); // Explicação: Define que o menu suspenso de 3 barras inicia fechado.
  const [expandedCard, setExpandedCard] = useState(null); // Explicação: Estado controlado que sabe qual cartão mestre de Big Number está expandido mostrando o Drilldown.

  // Explicação: Cria travas de segurança booleanas (verdadeiro/falso) baseadas no nível de poder do crachá eletrônico.
  const isMaster = userData?.isMaster; // Explicação: Verifica se o usuário é Administrador Master.
  const isComissao = userData?.isComissao; // Explicação: Verifica se o usuário faz parte da Comissão Musical.
  const isRegionalCidade = userData?.isRegionalCidade; // Explicação: Verifica se o usuário é um Encarregado Regional ou de Cidade.
  const isGemLocal = userData?.isGemLocal; // Explicação: Verifica se o usuário é um Examinador ou Encarregado de nível Local.
  const isBasico = userData?.isBasico; // Explicação: Verifica se o usuário possui acesso básico apenas para consulta.

  // v8.9.2: CÁLCULO DE ESTATÍSTICAS COM PROTEÇÃO DE PROCESSAMENTO
  const stats = useMemo(() => { // Explicação: Inicia o agrupador inteligente de cálculos pesados para evitar que o celular processe somas repetidas.
    const totals = { // Explicação: Objeto limpo que servirá de gaveta para acumular os totais de cada categoria.
      geral: 0, orquestra: 0, musicos: 0, organistas: 0, irmandade: 0, 
      irmaos: 0, irmas: 0, hinos: 0, visitas_total: 0, ministerio_oficio: 0,
      cordas: 0, madeiras: 0, metais: 0, saxofones: 0, teclas: 0,
      encRegional: 0, encLocal: 0, examinadoras: 0,
      musicosComum: 0, musicosVisita: 0,
      organistasComum: 0, organistasVisita: 0,
      orquestraTotalComum: 0, orquestraTotalVisita: 0,
      irmandadeComum: 0, irmandadeVisita: 0,
      examinadorasComum: 0, examinadorasVisita: 0,
      ministerioCasa: 0, ministerioVisita: 0,
      hinosP1: 0, // Explicação: Nova gaveta para guardar o total de hinos cantados especificamente na primeira parte do ensaio.
      hinosP2: 0,  // Explicação: Nova gaveta para guardar o total de hinos cantados especificamente na segunda parte do ensaio.
      hinosListaP1: [], // Explicação: Guarda a lista nominal de hinos executados na primeira parte para o Drilldown.
      hinosListaP2: [], // Explicação: Guarda a lista nominal de hinos executados na segunda parte para o Drilldown.
      deltaGeral: 0, // Explicação: Diferença matemática de público total contra o ensaio passado.
      deltaOrquestra: 0, // Explicação: Diferença matemática de instrumentistas contra o ensaio passado.
      deltaHinos: 0, // Explicação: Diferença matemática de hinos cantados contra o ensaio passado.
      deltaCorpoTecnico: 0, // Explicação: Diferença matemática de corpo técnico contra o ensaio passado.
      musicosPresentesLista: [] // Explicação: GAVETA EXCLUSIVA: Armazena estritamente os alistados locais que responderam com presente VERDADEIRO.
    };

    if (counts) { // Explicação: Proteção de código. Se os dados de contagem existirem no documento, inicia a varredura naipe por naipe.
      Object.entries(counts).forEach(([id, data]) => { // Explicação: Transforma o mapa de instrumentos em uma lista iterável para fazer as somas.
        if (id.startsWith('meta_')) return; // Explicação: Ignora propriedades de controle do banco de dados que começam com o prefixo 'meta_'.
        
        const valTotal = parseInt(data.total) || 0; // Explicação: Converte o texto do total de instrumentos em um número inteiro seguro.
        const valComum = parseInt(data.comum) || 0; // Explicação: Converte o texto de músicos locais (da comum) em um número inteiro seguro.
        const valIrmaos = parseInt(data.irmaos) || 0; // Explicação: Converte o número de irmãos cadastrados na seção em valor numérico.
        const valIrmas = parseInt(data.irmas) || 0; // Explicação: Converte o número de irmãs cadastradas na seção em valor numérico.
        const section = (data.section || "GERAL").toUpperCase(); // Explicação: Lê a família do instrumento e padroniza em letras maiúsculas (ex: CORDAS).
        const saneId = id.toLowerCase(); // Explicação: Padroniza o identificador único do instrumento em letras minúsculas.
        const visitasCalc = Math.max(0, valTotal - valComum); // Explicação: Descobre o número de visitas subtraindo os músicos da casa do total geral, impedindo números negativos.

        if (section === 'CORAL' || section === 'IRMANDADE' || saneId === 'coral' || saneId === 'irmandade') { // Explicação: Identifica se a linha atual pertence ao grupo de vozes ou público.
          totals.irmaos += valIrmaos || (saneId === 'irmandade' ? valTotal : 0); // Explicação: Acumula o total de homens na bancada da irmandade ou coro.
          totals.irmas += valIrmas; // Explicação: Acumula o total de mulheres na bancada da irmandade ou coro.
          totals.irmandadeComum += valComum; // Explicação: Soma os membros locais da irmandade.
          totals.irmandadeVisita += visitasCalc; // Explicação: Soma os membros visitantes da irmandade.
        } 
        else if (section === 'ORGANISTAS' || saneId === 'orgao' || saneId === 'org') { // Explicação: Identifica se a linha avaliada se refere às organistas.
          totals.organistas += valTotal; // Explicação: Adiciona as organistas ao totalizador específico delas.
          totals.organistasComum += valComum; // Explicação: Acumula o total de organistas locais dellaquela igreja.
          totals.organistasVisita += visitasCalc; // Explicação: Acumula o total de organistas que vieram visitar de fora.
        } 
        else { // Explicação: Se não for coro nem organista, o systema sabe que se trata de um músico de instrumento de sopro ou cordas.
          totals.musicos += valTotal; // Explicação: Acumula o total de músicos de orquestra na gaveta geral.
          totals.musicosComum += valComum; // Explicação: Acumula os músicos que são membros oficiais della localidade.
          totals.musicosVisita += visitasCalc; // Explicação: Acumula os músicos que vieram apoiar o ensaio vindos de outras igrejas.
          if (section === 'CORDAS' || ['vln', 'vla', 'vcl', 'violino', 'viola', 'violoncelo'].includes(saneId)) totals.cordas += valTotal; // Explicação: Agrupa especificamente a soma da família das Cordas.
          else if (section.includes('SAX')) totals.saxofones += valTotal; // Explicação: Agrupa especificamente a soma da família dos Saxofones.
          else if (section.includes('MADEIRA') || ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'fagote', 'claronealto', 'claronebaixo', 'corneingles'].includes(saneId)) totals.madeiras += valTotal; // Explicação: Agrupa especificamente a soma da família das Madeiras.
          else if (section.includes('METAI') || ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufonio', 'tuba', 'flugelhorn'].includes(saneId)) totals.metais += valTotal; // Explicação: Agrupa especificamente a soma da família dos Metais.
          else if (section === 'TECLAS' || saneId === 'acordeon' || saneId === 'acd') totals.teclas += valTotal; // Explicação: Agrupa a soma de instrumentos de teclas adicionais como acordeons.
        }
      });
    }

    const oficio = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM']; // Explicação: Vetor de controle que lista as strings exatas correspondentes ao ministério de altar.
    const processarPessoasAta = (lista, isVisitante = false) => { // Explicação: Função interna reutilizável para ler as assinaturas inseridas na ata e catalogar os cargos.
      if (!lista || !Array.isArray(lista)) return; // Explicação: Proteção de barreira. Se a lista de nomes virem vazia ou corrompida, cancela o processamento da linha.
      lista.forEach(p => { // Explicação: Inicia a varredura de cada pessoa registrada na ata de presença do evento.
        const cargo = (p.min || p.role || ""); // Explicação: Captura o cargo ministerial digitado (pode estar em min ou role dependendo della versão do documento).
        if (isVisitante) totals.visitas_total++; // Explicação: Se o indicador de visitante for verdadeiro, incrementa o contador geral de visitas na ata.
        if (cargo === 'Encarregado Regional') totals.encRegional++; // Explicação: Incrementa especificamente a quantidade de Encarregados Regionais presentes.
        if (cargo === 'Encarregado Local') totals.encLocal++; // Explicação: Incrementa especificamente a quantidade de Encarregados Locais presentes.
        if (cargo === 'Examinadora') { // Executa o cálculo técnico.
          totals.examinadoras++; 
          if (isVisitante) totals.examinadorasVisita++; 
          else totals.examinadorasComum++; 
        }
        if (oficio.includes(cargo)) { // Executa o agrupamento espiritual.
          totals.ministerio_oficio++; 
          if (isVisitante) totals.ministerioVisita++; 
          else totals.ministerioCasa++; 
        }
      });
    };

    processarPessoasAta(ataData?.visitantes, true); // Explicação: Executa o processador passando a lista de pessoas que assinaram como visitantes da reunião.
    processarPessoasAta(ataData?.presencaLocalFull, false); // Explicação: Executa o processador passando a lista de ministério local que assinou a presença.

    totals.orquestraTotalComum = totals.musicosComum + totals.organistasComum; // Explicação: Consolida a soma de todos os instrumentistas e organistas que são da casa.
    totals.orquestraTotalVisita = totals.musicosVisita + totals.organistasVisita; // Explicação: Consolida a soma de todos os instrumentistas e organistas que vieram de fora.
    totals.irmandade = totals.irmaos + totals.irmas; // Explicação: Consolida a soma total de pessoas sentadas na irmandade (Homens + Mulheres).
    totals.orquestra = totals.musicos + totals.organistas; // Explicação: Consolida a soma musical da orquestra juntando músicos e organistas.
    totals.geral = totals.orquestra + totals.irmandade; // Explicação: Consolida o número máximo de cabeças do evento (Orquestra somada com a Irmandade).

    // Extração e fatiamento avançado de hinos para o Drilldown
    if (ataData?.partes) { // Explicação: Proteção de segurança. Se o documento contiver a lista de partes musicais, calcula os hinos.
      totals.hinos = ataData.partes.reduce((acc, p) => acc + (p.hinos?.filter(h => h && h.trim() !== '').length || 0), 0); // Explicação: Puxa o totalizador mestre de hinos.
      
      const p1Obj = ataData.partes.find(p => p.label?.includes('1ª') || p.id === 'parte_1'); // Explicação: Filtra as informações da primeira metade do ensaio.
      if (p1Obj) {
        totals.hinosListaP1 = p1Obj.hinos?.filter(h => h && h.trim() !== '') || []; // Explicação: Constrói a lista nominal de hinos para o Drilldown expansível.
        totals.hinosP1 = totals.hinosListaP1.length;
      }
      
      const p2Obj = ataData.partes.find(p => p.label?.includes('2ª') || p.id === 'parte_2'); // Explicação: Filtra as informações da segunda metade do ensaio.
      if (p2Obj) {
        totals.hinosListaP2 = p2Obj.hinos?.filter(h => h && h.trim() !== '') || []; // Explicação: Constrói a lista nominal de hinos para o Drilldown expansível.
        totals.hinosP2 = totals.hinosListaP2.length;
      }
    }

    // --- FILTRAGEM RIGOROSA DE MÚSICOS E ORGANISTAS PRESENTES [SÓ ENTRA QUEM FOR TRUE] ---
    if (ataData?.presencaLocalFull && Array.isArray(ataData.presencaLocalFull)) { // Explicação: Se a lista de chamadas nominais residir na memória da ata.
      // Explicação Abaixo: Captura e salva estritamente quem está com a flag presente ligada, ocultando totalmente os faltantes.
      totals.musicosPresentesLista = ataData.presencaLocalFull.filter(membro => membro.presente === true); 
    }

    // --- CUSTO ZERO DE FIRESTORE: MÓDULO DE INTELIGÊNCIA HISTÓRICA E EQUIVALÊNCIA DE ESCOPO ---
    if (allEvents && allEvents.length > 0 && ataData?.comumId && ataData?.scope) { // Explicação: Inteligência de Delta: Varre os dados locais.
      const eventosFiltradosMesmaIgreja = allEvents
        .filter(ev => ev.comumId === ataData.comumId && (ev.scope || 'local') === ataData.scope && ev.id !== eventId) // CORREÇÃO DO MOTOR: Filtra por Comum E obrigatoriamente pelo mesmo tipo de Escopo (Local com Local, Regional com Regional).
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); // Explicação: Ordena por data colocando o ensaio anterior correspondente na frente.

      const eventoPassado = eventosFiltradosMesmaIgreja[0]; // Explicação: Resgata a cópia do documento do mês passado guardada na memória.
      if (eventoPassado) { // Explicação: Se encontrou o evento anterior fidedigno, faz os batimentos matemáticos.
        let musPassado = 0; let orgPassado = 0; let irmPassado = 0; let hinPassado = 0; let tecnicoPassado = 0;
        
        if (eventoPassado.counts) { // Explicação: Processa as somas do mês passado localmente na memória de forma gratuita.
          Object.entries(eventoPassado.counts).forEach(([id, data]) => {
            if (id.startsWith('meta_')) return;
            const val = parseInt(data.total) || 0;
            const sec = (data.section || "GERAL").toUpperCase();
            const sId = id.toLowerCase();
            if (sec === 'CORAL' || sec === 'IRMANDADE' || sId === 'coral' || sId === 'irmandade') irmPassado += val;
            else if (sec === 'ORGANISTAS' || sId === 'orgao' || sId === 'org') orgPassado += val;
            else musPassado += val;
          });
        }
        if (eventoPassado.ata?.partes) { // Explicação: Resgata a soma de hinos do ensaio anterior.
          hinPassado = eventoPassado.ata.partes.reduce((acc, p) => acc + (p.hinos?.filter(h => h && h.trim() !== '').length || 0), 0);
        }
        
        const contarTecnicoAntigo = (lista) => { // Explicação: Processa a liderança técnica do mês passado.
          if (!lista || !Array.isArray(lista)) return;
          lista.forEach(p => {
            if (['Encarregado Regional', 'Encarregado Local', 'Examinadora'].includes(p.min || p.role)) tecnicoPassado++;
          });
        };
        contarTecnicoAntigo(eventoPassado.ata?.visitantes);
        contarTecnicoAntigo(eventoPassado.ata?.presencaLocalFull);

        totals.deltaGeral = totals.geral - (musPassado + orgPassado + irmPassado); // Explicação: Armazena o saldo real de público total.
        totals.deltaOrquestra = totals.orquestra - (musPassado + orgPassado); // Explicação: Armazena o saldo real de instrumentistas.
        totals.deltaHinos = totals.hinos - hinPassado; // Explicação: Armazena o saldo real de hinos.
        totals.deltaCorpoTecnico = (totals.encRegional + totals.encLocal + totals.examinadoras) - tecnicoPassado; // Explicação: Armazena o saldo real técnico.
      }
    }

    return totals; // Explicação: Retorna o objeto contendo as somas agregadas e a inteligência de tendências históricas.
  }, [counts, ataData, allEvents, eventId]); // Explicação: O useMemo protege o processador remontando as contas apenas se houver novos dados físicos.

  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"; // Explicação: Função matemática que extrai a porcentagem de participação de um naipe, evitando divisão por zero.
  
  // v8.9.3: LIBERAÇÃO CONTEXTUAL DA EXPORTAÇÃO
  const canExport = hasPermission(userData, 'generate_report', ataData?.scope); // Explicação: Valida no arquivo de permissões se o escopo atual do usuário permite disparar relatórios.

  const handleShareLanche = async () => { // Explicação: Função disparada ao clicar no botão de compartilhar dados de copa/cozinha.
    const msg = whatsappService.obterTextoAlimentacao(ataData, stats); // Explicação: Solicita ao formatador a mensagem padrão de alimentação montada com os dados locais.
    if (navigator.share) { // Explicação: Se o celular do usuário der suporte ao menu nativo de compartilhamento do sistema operacional.
      try { await navigator.share({ text: msg }); } catch (err) { } // Explicação: Abre o menu nativo do celular (WhatsApp, Telegram, etc.) para repassar o texto.
    } else { // Caso seja um navegador antigo sem suporte a compartilhamento nativo.
      navigator.clipboard.writeText(msg); // Injeta o texto automaticamente na área de transferência.
      toast.success("Resumo Alimentação Copiado!"); // Dispara um aviso visual flutuante.
    }
  };

  const handleShareEstatistico = async () => { // Explicação: Função disparada ao clicar no botão de compartilhar dados estatísticos e totais de naipes.
    const msg = whatsappService.obterTextoEstatistico({ ...ataData, counts }, stats); // Explicação: Solicita ao gerador de texto do WhatsApp o relatório completo estruturado por naipes.
    if (navigator.share) { // Valida se o smartphone possui suporte a API nativa.
      try { await navigator.share({ text: msg }); } catch (err) { } // Invoca a janela nativa.
    } else { // Fallback para computadores tradicionais.
      navigator.clipboard.writeText(msg); // Salva o texto automaticamente na memória.
      toast.success("Resumo Estatístico Copiado!"); // Emite o balão de aviso.
    }
  };

  const handleGeneratePDF = async () => { // Explicação: Função responsável por unificar as informações e acionar o construtor do arquivo PDF della Ata.
    const loadingToast = toast.loading("Gerando PDF..."); // Explicação: Trava a tela com um indicador visual de carregamento contínuo.
    try { 
      const comumId = ataData?.comumId || counts?.comumId || userData?.activeComumId || userData?.comumId; // Explicação: Tenta recuperar o identificador único della localidade igreja.
      if (!comumId) throw new Error("ID da localidade ausente."); // Aborta se falhar na ID.
      let comumFullData = (userData?.comumId === comumId && userData?.comumDados) ? userData.comumDados : null; // Otimização de cota.
      if (!comumFullData) { 
        const comumSnap = await getDoc(doc(db, 'comuns', comumId)); // Faz a leitura cirúrgica.
        comumFullData = comumSnap.exists() ? comumSnap.data() : null; 
      }
      pdfEventService.generateAtaEnsaio(stats, ataData, userData, counts, comumFullData); // Passa os dados para o construtor da impressão.
      toast.dismiss(loadingToast); // Limpa a tela.
      toast.success("Documento gerado!"); // Confirma sucesso.
    } catch (error) { 
      toast.dismiss(loadingToast); 
      toast.error(error.message || "Erro ao processar PDF."); 
    }
  };

  const toggleCard = (cardId) => { // Explicação: Chaveia a abertura ou fechamento da gaveta interna de Drilldown ao clicar em um cartão.
    setExpandedCard(expandedCard === cardId ? null : cardId); // Explicação: Se clicou no mesmo, recolhe; senão abre o novo bloco correspondente.
  };

  const renderDelta = (delta) => { // CORREÇÃO INSPIRADA TOTALMENTE NO ANEXO: Remove caixas coloridas, exibe apenas pontas de setas limpas e números diretos.
    if (delta === 0 || isNaN(delta)) return <span className="text-slate-300 font-black text-sm select-none">―</span>; // Explicação: Exibe apenas um traço horizontal elegante se o valor for idêntico ao mês passado.
    const isUp = delta > 0; // Explicação: Identifica se a tendência é de alta ou de baixa.
    return ( // Explicação: Renderiza unicamente a ponta de seta sólida triangular e o número limpo da diferença matemática.
      <span className={`text-[11px] font-black flex items-center select-none ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isUp ? '▲' : '▼'} {isUp ? `+${delta}` : delta}
      </span>
    );
  };

  // Explicação: Dicionário estático que mapeia as visões para exibição textual no topo do painel.
  const views = {
    geral: 'Painel Executivo',
    orquestra: 'Equilíbrio da Orquestra',
    acoes: 'Exportação & Atas'
  };

  return ( // Explicação: Inicia a renderização do esqueleto HTML que monta a interface visual adaptada para smartphones.
    <div className="flex flex-col h-full bg-[#F1F5F9] text-left max-w-md mx-auto animate-premium pt-4 relative">
      
      {/* COMPONENTE DA ALIMENTAÇÃO CRÍTICO: FIXADO NO TOPO EM TODAS AS VIEWS */}
      <div className="px-4 shrink-0 z-20">
        <DashStatsHeader stats={stats} isBasico={isBasico} handleShareLanche={handleShareLanche} canExport={canExport} />
      </div>

      {/* SEÇÃO DE SELEÇÃO: MENU SUSPENSO DE 3 BARRAS FIXO NO CANTO DIREITO */}
      <div className="px-4 my-3 shrink-0 flex items-center justify-between relative z-30">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Painel Ativo: <span className="text-blue-600 font-extrabold">{views[activeTab]}</span>
        </span>
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all min-h-[44px]" aria-label="Abrir menu de visualizações">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 animate-fadeIn">
                {Object.entries(views).map(([key, label]) => (
                  <button key={key} onClick={() => { setActiveTab(key); setDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-xs font-semibold block min-h-[44px] transition-colors ${activeTab === key ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* JANELA DE EXIBIÇÃO: CONTEÚDO LIMITADO COM ROLAGEM VERTICAL COMPORTADA */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        
        {/* VIEW REORGANIZADA: PAINEL INTELIGENTE CONTÍNUO COM BIG NUMBERS E DELTAS CLEAN */}
        {activeTab === 'geral' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* CARD 1: INDEX LITÚRGICO DE HINOS */}
            <div onClick={() => toggleCard('hinos')} className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-sm space-y-3 cursor-pointer select-none transition-all active:bg-slate-50/50 min-h-[88px] flex flex-col justify-center">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0"><BookOpen size={18} /></div>
                  <div className="min-w-0"><span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Hinos Chamados</span><span className="text-[28px] font-black text-slate-900 tracking-tighter block mt-1 leading-none">{stats.hinos}</span></div>
                </div>
                {/* Lado Direito: Exibição limpa da ponta de seta e do valor de diferença e o chevron */}
                <div className="flex items-center space-x-1.5 shrink-0">{renderDelta(stats.deltaHinos)}{expandedCard === 'hinos' ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}</div>
              </div>
              {/* DRILLDOWN SANEADO: DETALHES DE HINOS LANÇADOS POR EXTENSO */}
              {expandedCard === 'hinos' && (
                <div onClick={(e) => e.stopPropagation()} className="pt-4 border-t border-slate-100 grid grid-cols-1 gap-3 animate-slideDown text-left">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2"><span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider block">1ª Parte ({stats.hinosP1})</span>{stats.hinosListaP1.length === 0 ? <p className="text-[10px] font-bold text-slate-400 italic">Nenhum hino</p> : <div className="flex flex-wrap gap-1.5">{stats.hinosListaP1.map((h, i) => <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 text-[11px] font-black rounded-lg shadow-3xs">{h}</span>)}</div>}</div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2"><span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider block">2ª Parte ({stats.hinosP2})</span>{stats.hinosListaP2.length === 0 ? <p className="text-[10px] font-bold text-slate-400 italic">Nenhum hino</p> : <div className="flex flex-wrap gap-1.5">{stats.hinosListaP2.map((h, i) => <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 text-[11px] font-black rounded-lg shadow-3xs">{h}</span>)}</div>}</div>
                </div>
              )}
            </div>

            {/* CARD 2: CORPO MUSICAL (TOTAL QUANTITATIVO DA ORQUESTRA) */}
            <div onClick={() => toggleCard('orquestra')} className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-sm space-y-3 cursor-pointer select-none transition-all active:bg-slate-50/50 min-h-[88px] flex flex-col justify-center">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0"><Music size={18} /></div>
                  <div className="min-w-0"><span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Corpo Musical</span><span className="text-[28px] font-black text-slate-900 tracking-tighter block mt-1 leading-none">{stats.orquestra}</span></div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">{renderDelta(stats.deltaOrquestra)}{expandedCard === 'orquestra' ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}</div>
              </div>
              {/* DRILLDOWN QUANTITATIVO: SEPARAÇÃO DE SOLISTAS, ORGANISTAS E QUANTIDADE DE VISITAS */}
              {expandedCard === 'orquestra' && (
                <div onClick={(e) => e.stopPropagation()} className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5 animate-slideDown text-left">
                  <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Músicos Solistas</span><p className="text-xs font-black text-slate-800 mt-1">{stats.musicos} <span className="text-[9px] text-slate-400 font-bold">({stats.musicosComum} / {stats.musicosVisita})</span></p></div>
                  <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Organistas</span><p className="text-xs font-black text-slate-800 mt-1">{stats.organistas} <span className="text-[9px] text-slate-400 font-bold">({stats.organistasComum} / {stats.organistasVisita})</span></p></div>
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl col-span-2 flex justify-between items-center"><span className="text-[9px] font-black text-blue-700 uppercase tracking-wider">Apoio Logístico Total</span><span className="text-xs font-black text-blue-800">{stats.orquestraTotalVisita} Visitantes</span></div>
                </div>
              )}
            </div>

            {/* CARD 3: CARD DEDICADO - LISTA NOMINAL EXCLUSIVA DE PRESENTES [PRESENTE === TRUE] */}
            <div onClick={() => toggleCard('chamada_nominal')} className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-sm space-y-3 cursor-pointer select-none transition-all active:bg-slate-50/50 min-h-[88px] flex flex-col justify-center">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0"><CheckCircle2 size={18} /></div>
                  <div className="min-w-0"><span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Chamada da Comum</span><span className="text-[28px] font-black text-slate-900 tracking-tighter block mt-1 leading-none">{stats.musicosPresentesLista.length}</span></div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0"><span className="text-[9px] font-black text-purple-500 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md">Ativos</span>{expandedCard === 'chamada_nominal' ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}</div>
              </div>
              {/* CAMADA DE RAIO-X EXCLUSIVA: OCULTA COMPLETAMENTE QUEM ESTÁ COM FALSO E ROLA EM CAIXA FECHADA CONFORME DIRETRIZ 4 */}
              {expandedCard === 'chamada_nominal' && (
                <div onClick={(e) => e.stopPropagation()} className="pt-4 border-t border-slate-100 grid grid-cols-1 gap-2.5 animate-slideDown text-left">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-wider block">Lista de Alistados Confirmados [Presentes]</span>
                  {stats.musicosPresentesLista.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-400 italic">Nenhum irmão marcado como presente neste ensaio.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1 no-scrollbar">
                      {stats.musicosPresentesLista.map((membro) => (
                        <div key={membro.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl text-xs">
                          <span className="font-black text-slate-800 uppercase italic truncate max-w-[180px]">{membro.nome}</span>
                          <span className="text-[8px] font-black px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-md uppercase tracking-wider italic shrink-0">{membro.instrumentoNome || "Coral"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CARD 4: PRESENÇA GERAL (PÚBLICO TOTAL) */}
            <div onClick={() => toggleCard('coral')} className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-sm space-y-3 cursor-pointer select-none transition-all active:bg-slate-50/50 min-h-[88px] flex flex-col justify-center">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0"><Users size={18} /></div>
                  <div className="min-w-0"><span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Presença Geral</span><span className="text-[28px] font-black text-slate-900 tracking-tighter block mt-1 leading-none">{stats.geral}</span></div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">{renderDelta(stats.deltaGeral)}{expandedCard === 'coral' ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}</div>
              </div>
              {/* DRILLDOWN: DIVISÃO POR GÊNERO NA BANCADA */}
              {expandedCard === 'coral' && (
                <div onClick={(e) => e.stopPropagation()} className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5 animate-slideDown text-left">
                  <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Irmãos</span><p className="text-xs font-black text-slate-800 mt-1">{stats.irmaos}</p></div>
                  <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Irmãs</span><p className="text-xs font-black text-slate-800 mt-1">{stats.irmas}</p></div>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl col-span-2 flex justify-between items-center"><span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Vozes do Coral</span><span className="text-xs font-black text-emerald-800">{stats.irmandade}</span></div>
                </div>
              )}
            </div>

            {/* CARD 5: CORPO TÉCNICO REGIONAL */}
            <div onClick={() => toggleCard('tecnico')} className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-sm space-y-3 cursor-pointer select-none transition-all active:bg-slate-50/50 min-h-[88px] flex flex-col justify-center">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Star size={18} /></div>
                  <div className="min-w-0"><span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Corpo Técnico</span><span className="text-[28px] font-black text-slate-900 tracking-tighter block mt-1 leading-none">{stats.encRegional + stats.encLocal + stats.examinadoras}</span></div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">{renderDelta(stats.deltaCorpoTecnico)}{expandedCard === 'tecnico' ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}</div>
              </div>
              {/* DRILLDOWN SANEADO: COMPACTO E EXECUTIVO */}
              {expandedCard === 'tecnico' && (
                <div onClick={(e) => e.stopPropagation()} className="pt-4 border-t border-slate-100 grid grid-cols-1 gap-2.5 animate-slideDown text-left">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 text-center rounded-xl"><span className="block text-[7px] font-black text-slate-400 uppercase">Regional</span><p className="text-xs font-black text-slate-800 mt-0.5">{stats.encRegional}</p></div>
                    <div className="bg-slate-50 p-2 text-center rounded-xl"><span className="block text-[7px] font-black text-slate-400 uppercase">Local</span><p className="text-xs font-black text-slate-800 mt-0.5">{stats.encLocal}</p></div>
                    <div className="bg-slate-50 p-2 text-center rounded-xl"><span className="block text-[7px] font-black text-slate-400 uppercase">Examinadoras</span><p className="text-xs font-black text-slate-800 mt-0.5">{stats.examinadoras}</p></div>
                  </div>
                  <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl flex justify-between items-center">
                    <span className="text-[8px] font-black text-purple-700 uppercase tracking-wider">Ministério Geral</span>
                    <span className="text-xs font-black text-purple-800">{stats.ministerio_oficio}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* FILTRO VISUAL: EQUILÍBRIO NAIPES ORQUESTRA */}
        {activeTab === 'orquestra' && (
          <div className="space-y-3 animate-fadeIn">
            <DashEquilibriumSection stats={stats} getPerc={getPerc} />
          </div>
        )}

        {/* FILTRO VISUAL: EXPORTAÇÃO E CONCLUSÃO OPERACIONAL */}
        {activeTab === 'acoes' && (
          <div className="space-y-3 animate-fadeIn">
            <DashFinalSummary stats={stats} canExport={canExport} handleShareEstatistico={handleShareEstatistico} handleGeneratePDF={handleGeneratePDF} />
          </div>
        )}

      </div>
    </div>
  );
};

export default DashEventPage;