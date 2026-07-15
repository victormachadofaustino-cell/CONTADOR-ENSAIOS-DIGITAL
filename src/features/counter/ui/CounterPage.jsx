import React, {
  useState,
  useEffect,
  useRef,
  /* useCallback, */
  useMemo,
} from "react"; // Explicação: Importa as ferramentas de memória e sincronização do React.
// PRESERVAÇÃO: Importações originais mantidas com a adição cirúrgica do 'where' que faltava
import {
  db,
  doc,
  onSnapshot,
  collection,
  setDoc,
  updateDoc,
  auth,
  getDocs,
  query,
  orderBy,
  where,
  /* getDoc, */
  writeBatch,
} from "../../../shared/api/firebase"; // Explicação: CONEXÃO COM O FIREBASE: Mantém a importação estável de todos os motores de dados.
import { eventService } from "../../../shared/api/eventService"; // Explicação: Importa o motor de salvamento de contagens.
import { useCounterSync } from "../model/useCounterSync"; // Explicação: 🚀 INJEÇÃO ARQUITETURAL: Importa o nosso novo motor isolado de sincronização e buffers de rede.
import AtaPage from "../../../pages/AtaPage"; // Explicação: Importa a página de preenchimento da Ata.
import DashEventPage from "../../../features/dashboard/ui/DashEventPage"; // Explicação: Importa o painel de gráficos local.
import DashEventRegionalPage from "../../../features/dashboard/ui/DashEventRegionalPage"; // Explicação: Importa o painel de gráficos regional.
import toast from "react-hot-toast"; // Explicação: Importa as notificações de aviso da tela.
import {
  ChevronLeft,
  LogOut,
  ClipboardCheck,
  LayoutGrid,
  BarChart3,
  Lock,
  Unlock,
  Trash2,
  Users,
  X,
} from "lucide-react"; // Explicação: Desenhos dos ícones dos botões importados do lucide-react.
import { motion, AnimatePresence } from "framer-motion"; // Explicação: Sistema de animations fluidas.
import { useAuth } from "../../../app/providers/AuthContext"; // Explicação: Puxa os dados e permissões do usuário logado.

// IMPORTAÇÃO DOS NOVOS COMPONENTES MODULARES
import CounterSection from "./CounterSection"; // Explicação: Componente que agrupa instrumentos (ex: Cordas).
import OwnershipModal from "../../../features/events/ui/components/OwnershipModal"; // Explicação: Janela de "Deseja assumir esta seção?".
import ExtraInstrumentModal from "./ExtraInstrumentModal"; // Explicação: Janela para adicionar instrumentos na hora.
import CounterRegional from "./CounterRegional"; // Explicação: Modo de contagem em massa para eventos regionais.
import CounterFooter from "./CounterFooter"; // Explicação: Traz o nosso novo RODAPÉ ISOLADO e fixado na base absoluta da tela.
import { useOnlineStatus } from "../../../shared/hooks/useOnlineStatus"; // Explicação: Importa o hook que verifica o status da conexão.

// FUNÇÃO DE UTILIDADE GLOBAL PARA FEEDBACK TÁTIL
const triggerHapticFeedback = (duration = 10) => {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
  }
};

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => {
  // Explicação: Inicia a estrutura da página de contagem.
  const { userData } = useAuth(); // Explicação: Puxa o crachá eletrônico do usuário logado (Custom Claims).

  // 🚀 ACOPLAGEM SÊNIOR: Conecta a página de contagem diretamente ao barramento isolado useCounterSync limpando os códigos pesados de dentro da tela!
  const {
    localCounts,
    setLocalCounts,
    ataData,
    eventComumId,
    eventDateRaw,
    isCountsLocked,
    lastLocalUpdateRef,
    handleFocus,
    handleBlur,
    updateCount,
    setOwnership,
    MAPA_TRADUTOR_EXTENSO,
  } = useCounterSync(currentEventId, counts); // Explicação: Herda todos os estados sincronizados e represas anti-piscas prontas do Custom Hook.

  const isOnline = useOnlineStatus(); // Explicação: Verifica se o aplicativo está online.
  const [activeTab, setActiveTab] = useState("contador"); // Explicação: Controla se estamos na aba de contagem, ata ou gráficos.
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Explicação: Lista nacional de instrumentos da CCB.
  const [instrumentsConfig, setInstrumentsConfig] = useState([]); // Explicação: Configurações específicas da igreja local.
  const [activeGroup, setActiveGroup] = useState(null); // Explicação: Qual naipe está aberto no momento.
  const [loading, setLoading] = useState(true); // Explicação: Tela de carregamento inicial.
  const [showOwnershipModal, setShowOwnershipModal] = useState(null); // Explicação: Controla la janela de "Assumir Seção".
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null); // Explicação: Caixa que armazena qual naipe receberá um instrumento extra inserido dinamicamente.

  const [isInputInvalid, setIsInputInvalid] = useState(false); // Explicação: Estado para validação em tempo real do input do modal.
  // NOVOS ESTADOS PARA SUPORTE DA JANELA FLUTUANTE DE CHECKLIST NOMINAL POR INSTRUMENTO
  const [instrumentoFocadoChecklist, setInstrumentoFocadoChecklist] =
    useState(null); // Explicação: Salva qual instrumento o usuário clicou para fazer a chamada nominal (ex: viola).
  const [listaMusicosChamada, setListaMusicosChamada] = useState([]); // Explicação: Armazena as fichas de chamada dos músicos vinculadas a esse instrumento específico.
  const [valorNumeroDireto, setValorNumeroDireto] = useState(""); // Explicação: Estado temporário para capturar a digitação manual de quantidade avulsa no topo do modal.
  const lastNominalUpdateRef = useRef(0); // 🚀 ESCUDO ANTI-PISCA: Protege a chamada nominal contra atualizações do servidor que desfazem o clique do usuário.

  const isClosed = ataData?.status === "closed"; // Explicação: Calculates em tempo real se a ata do ensaio já foi encerrada definitivamente.
  const myUID = auth.currentUser?.uid; // Explicação: Pega o código identificador único de usuário gerado no login.

  // CARREGAMENTO DE INSTRUMENTOS
  useEffect(() => {
    // Explicação: Carrega as tabelas mestre e as configurações locais da orquestra ao abrir.
    let isMounted = true; // Explicação: Flag de segurança para evitar vazamento de memória se o usuário sair rápido da página.
    const loadInstruments = async () => {
      // Explicação: Declara a função assíncrona de download de dependências.
      try {
        // Explicação: Tenta fazer as requisições assíncronas no banco de dados.
        const nacSnap = await getDocs(
          query(
            collection(db, "config_instrumentos_nacional"),
            orderBy("name", "asc"),
          ),
        ); // Explicação: Baixa a lista nacional mestre de instrumentos do banco.
        if (isMounted)
          setInstrumentsNacionais(
            nacSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          ); // Explicação: Se a página continuar aberta, salva a lista mestre na memória.
        if (eventComumId) {
          // Explicação: Se o identificador da igreja do ensaio já estiver mapeado.
          const locSnap = await getDocs(
            collection(db, "comuns", eventComumId, "instrumentos_config"),
          ); // Explicação: Baixa a configuration de orquestra exclusiva dellaquela igreja.
          if (isMounted)
            setInstrumentsConfig(
              locSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            ); // Explicação: Salva a configuração local de instrumentos.
        } // Explicação: Encerra a consulta privativa local.
      } catch (e) {
        console.error("Falha no carregamento de instrumentos:", e);
      } finally {
        // Explicação: Ignora falhas silenciosas de carregamento.
        if (isMounted) setLoading(false); // Explicação: Desativa a tela de carregamento principal liberando o app.
      }
    }; // Explicação: Encerra o scope della subrotina assíncrona.
    loadInstruments(); // Explicação: Executa a sequência de carregamento declared acima.
    return () => {
      isMounted = false;
    }; // Explicação: Desliga a flag ao desmontar a página por segurança.
  }, [eventComumId]); // Explicação: Executa novamente se o ID da igreja mudar.

  // EFEITO 1: Ouve a lista de músicos para o instrumento focado (separado para evitar race condition).
  useEffect(() => {
    if (!currentEventId || !instrumentoFocadoChecklist) {
      // JUSTIFICATIVA DA REMOÇÃO: A linha `setListaMusicosChamada([])` foi removida para preservar o estado
      // da lista ao fechar e reabrir o modal, evitando que as seleções (toques azuis) se percam
      // e atendendo à necessidade do usuário de manter a posição.
      return;
    }
    setIsInputInvalid(false); // Explicação: Reseta o estado de validação ao abrir o modal.

    // 🚀 ROBUST ID LOOKUP: Garante que tanto a sigla quanto o nome por extenso sejam usados na busca,
    // tratando o mapa de tradução de forma segura para evitar inconsistências.
    const idCru = instrumentoFocadoChecklist.id.toLowerCase();
    const idParceiro = MAPA_TRADUTOR_EXTENSO[idCru] || idCru;
    const arrayFiltroValido = [...new Set([idCru, idParceiro])];

    const llamadaRef = collection(
      db,
      "events_global",
      currentEventId,
      "chamada_musicos",
    );

    const q = query(
      llamadaRef,
      where("instrumentoId", "in", arrayFiltroValido),
    );

    const unsubChamada = onSnapshot(q, (snap) => {
      // 🚀 ESCUDO ANTI-PISCA (FIX DEFINITIVO): Ignora dados do servidor por 4s após um clique local,
      // evitando que a marcação azul seja desfeita por race conditions.
      if (Date.now() - lastNominalUpdateRef.current < 4000) {
        return;
      }
      const res = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.sort((a, b) => a.nome.localeCompare(b.nome));
      setListaMusicosChamada(res);
    });

    return () => unsubChamada();
  }, [currentEventId, instrumentoFocadoChecklist, MAPA_TRADUTOR_EXTENSO]);

  // EFEITO 2: Sincroniza o input numérico com a contagem geral (separado para evitar race condition).
  useEffect(() => {
    if (!instrumentoFocadoChecklist) {
      setValorNumeroDireto("");
      return;
    }
    // 🚀 LEITURA CANÔNICA: Garante que a leitura do valor do banco de dados seja sempre feita
    // usando o ID canônico (nome por extenso) do instrumento.
    const idLimpo = instrumentoFocadoChecklist.id.toLowerCase();
    const idCanonico =
      idLimpo.length <= 3 ? MAPA_TRADUTOR_EXTENSO[idLimpo] || idLimpo : idLimpo;
    const valorAtualBanco = localCounts?.[idCanonico]?.comum || 0;
    setValorNumeroDireto(String(valorAtualBanco)); // 5. Clareza na Exibição do Valor Zero: Mostra "0" em vez de vazio.
  }, [instrumentoFocadoChecklist, localCounts]);

  const allInstruments = useMemo(() => {
    // Explicação: Junta a matriz nacional com as edições da igreja para montar a listagem oficial organizada.
    const ordemOficial = [
      "coral",
      "irmandade",
      "irmas",
      "irmaos",
      "orgao",
      "violino",
      "viola",
      "violoncelo",
      "flauta",
      "clarinete",
      "claronealto",
      "claronebaixo",
      "oboe",
      "corneingles",
      "fagote",
      "saxsoprano",
      "saxalto",
      "saxtenor",
      "saxbaritono",
      "trompete",
      "flugelhorn",
      "trompa",
      "trombone",
      "eufonio",
      "tuba",
      "acordeon",
    ];
    const siglasProibidasExtras = [
      "tub",
      "vln",
      "vla",
      "vcl",
      "flt",
      "clt",
      "tbn",
      "tpt",
      "trp",
      "org",
      "acd",
      "euf",
      "fgt",
    ]; // Explicação: Lista técnica de segurança das siglas de 3 letras que pertencem aos instrumentos nativos fixos.

    const base = instrumentsNacionais.map((instBase) => {
      // Explicação: Percorre a matriz de instrumentos padrão nacional.
      // 🚀 PACIFICAÇÃO ABSOLUTA DE CRUZAMENTO SÊNIOR: Procura as customizações locais cruzando tanto a palavra por extenso quanto a sigla curta usando o dicionário, liquidando o descompasso "tub" vs "tuba".
      const override = instrumentsConfig.find(
        (local) =>
          local.id?.toLowerCase().trim() ===
            (instBase.id?.toLowerCase().trim() || "") ||
          MAPA_TRADUTOR_EXTENSO[local.id?.toLowerCase().trim()] ===
            instBase.id?.toLowerCase().trim(),
      ); // Explicação: Tenta achar se o usuário editou este instrumento no cadastro daquela igreja de forma tolerante a abreviações.
      return override ? { ...instBase, ...override } : instBase; // Explicação: Se editou, mescla as alterações, senão mantém o padrão nacional imutável.
    }); // Explicação: Encerra a varredura da base fixa.

    // 🚀 EXTERMINADOR DE CARDS FANTASMAS (FILTRO SEGURO SÊNIOR): Varre o banco de dados e expulsa de uma vez por todas as siglas curtas de 3 letras (como 'tub') que criavam o card extra no naipe GERAL.
    const extraIdsNoBanco = Object.keys(localCounts).filter(
      (k) =>
        !k.startsWith("meta_") &&
        !base.find((b) => b.id === k) &&
        !siglasProibidasExtras.includes(k.toLowerCase().trim()),
    ); // Explicação: Encontra IDs extras que foram criados na hora do ensaio, filtrando e eliminando resquícios históricos corrompidos de siglas.

    const extras = extraIdsNoBanco.map((id) => {
      // Explicação: Mapeia e gera a estrutura visual para os instrumentos extras dinâmicos.
      const configLocalSeExistir = instrumentsConfig.find((c) => c.id === id); // 🚀 INTEGRAÇÃO DA REGRA DE HERANÇA: Busca o cadastro oficial customizado feito nos ajustes da Comum.
      return {
        id: id, // Explicação: Copia a ID do item avulso.
        name:
          // 🚀 CORREÇÃO DE NOME EXTRA: Garante que o nome do instrumento seja extraído corretamente.
          // Prioriza a configuração local, depois o campo 'name' do próprio objeto,
          // e por fim, extrai o nome da chave dinâmica (ex: 'extra_pocket_123' -> 'POCKET').
          configLocalSeExistir?.name ||
          localCounts[id].name ||
          (id.startsWith("extra_")
            ? id.substring("extra_".length, id.lastIndexOf("_")).toUpperCase()
            : id.toUpperCase()), // 🚀 HERANÇA DE PROPRIEDADE: Puxa o nome textual cadastrado na Comum.
        section: (
          configLocalSeExistir?.section ||
          localCounts[id].section ||
          "GERAL"
        ).toUpperCase(), // 🚀 BLINDAGEM DO NAIPE: Recupera a família real (ex: 'METAIS') cadastrada na Comum em vez de chutar no 'GERAL'.
        isExtra: true, // Explicação: Carimba uma flag marcando que este item foi criado na hora.
      };
    }); // Explicação: Encerra a varredura de itens extras.
    return [...base, ...extras].sort(
      (a, b) =>
        (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) -
        (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99),
    );
  }, [
    instrumentsNacionais,
    instrumentsConfig,
    localCounts,
    MAPA_TRADUTOR_EXTENSO,
  ]); // Explicação: Recalcula se as locais de configuração ou contagens sofrerem alteração.

  const sections = useMemo(() => {
    // Explicação: Identifica quais seções ou naipes existem na lista total para criar os títulos na tela.
    const ordemSessoes = [
      "IRMANDADE",
      "CORAL",
      "ORGANISTAS",
      "CORDAS",
      "MADEIRAS",
      "SAXOFONES",
      "METAIS",
      "TECLAS",
    ]; // Explicação: Ordem visual padrão de cabeçalhos.
    return [
      ...new Set(
        allInstruments.map((i) => (i.section || "GERAL").toUpperCase()),
      ),
    ].sort(
      (a, b) =>
        (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) -
        (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99),
    ); // Explicação: Agrupa os nomes de seções removendo duplicados e ordenando rigorosamente pelo padrão.
  }, [allInstruments]); // Explicação: Recalcula se la lista unificada de instrumentos mudar.

  // --- CENTRALIZAÇÃO DE PERMISSÕES (PRÁTICA PROFISSIONAL) ---
  const isEditingEnabled = useMemo(() => {
    // Explicação: Otimiza a checagem de permissões, recalculando apenas quando necessário.
    return (sec, subInstId = null) => {
      // Explicação: Descobre se o usuário tem direito de somar/subtrair nesta linha da tela.
      if (isClosed || isCountsLocked) return false; // Explicação: Trava de estado: Se a contagem ou ata geral foi lacrada, bloqueia a edição.

      // --- LÓGICA DE PERMISSÃO UNIFICADA v2.0 ---
      // A lógica foi reestruturada para ser mais clara, abrangente e espelhar o comportamento robusto da AtaPage,
      // garantindo que todos os níveis de acesso (GEM Local, Regional/Cidade, Comissão) funcionem corretamente.

      // Níveis superiores com passe livre (Master, Comissão).
      if (userData?.isMaster || userData?.isComissao) {
        return true;
      }

      // Caso 1: Evento LOCAL
      if (ataData?.scope !== "regional") {
        // O 'regional_cidade' pode editar qualquer evento local na sua cidade.
        if (
          userData?.accessLevel === "regional_cidade" &&
          ataData?.cidadeId === userData?.cidadeId
        ) {
          return true;
        }
        // O 'gem_local' (e outros da comum) pode editar o evento da sua própria igreja.
        if (ataData?.comumId === userData?.comumId) {
          return true;
        }
        // Fallback: Se alguém "assumiu" o naipe (útil para ajudantes).
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, "_")}`;
        if (localCounts?.[metaKey]?.responsibleId === myUID) {
          return true;
        }
      }

      // Caso 2: Evento REGIONAL
      if (ataData?.scope === "regional") {
        // O 'regional_cidade' pode editar eventos regionais da sua cidade.
        if (
          userData?.accessLevel === "regional_cidade" &&
          ataData?.cidadeId === userData?.cidadeId
        ) {
          return true;
        }
        // Usuários convidados para a equipe de contagem têm permissão.
        const isInvited = (ataData?.invitedUsers || []).includes(myUID);
        if (isInvited) {
          return true;
        }
        // Fallback: Checagem de posse de naipe/instrumento (quem "assumiu").
        const sectionInstruments = allInstruments.filter(
          (i) => (i.section || "").toUpperCase() === sec.toUpperCase(),
        );
        const mestre = sectionInstruments.find(
          (i) => !["irmas", "irmaos"].includes(i.id.toLowerCase()),
        );
        const masterData = localCounts?.[mestre?.id];

        if (subInstId) {
          return masterData?.[`responsibleId_${subInstId}`] === myUID;
        }
        return masterData?.responsibleId === myUID;
      }

      return false; // Explicação: Se nenhuma regra de permissão for atendida, bloqueia a edição.
    };
  }, [
    isClosed,
    isCountsLocked,
    userData,
    ataData,
    localCounts,
    myUID,
    allInstruments,
  ]);

  const handleUpdateInstrument = (id, field, value, section) => {
    // Explicação: Executada a cada clique nos botões de + ou - ou ao digitar no input.
    updateCount(id, field, value, section, userData); // 🚀 REDIRECIONAMENTO CIRÚRGICO: Repassa a batida de botão para o nosso hook useCounterSync fazer o debounce de rede de forma estável.
  }; // Explicação: Encerra a função handleUpdateInstrument.

  // INTELIGÊNCIA DIRETA COM TRAVA DE TETO VERDADEIRA: LEITURA SOBERANA DO NÓ POR EXTENSO E PROCESSO BUFFERIZADO (ANTI-PISCA)
  const handleUpdateNumeroDiretoModal = (novoValor) => {
    // 1. Feedback Visual Imediato (Validação em Tempo Real)
    // Explicação: Atualiza instantaneamente a tela local ao digitar e armazena o valor bruto para evitar quebras visuais.
    if (
      !currentEventId ||
      isCountsLocked ||
      isClosed ||
      !instrumentoFocadoChecklist
    )
      return; // Explicação: Trava defensiva sanitária de barreira.

    // Lógica de validação em tempo real
    const idCru = instrumentoFocadoChecklist.id;
    const idLimpo = idCru.toLowerCase();
    const targetId =
      idLimpo.length <= 3 ? MAPA_TRADUTOR_EXTENSO[idLimpo] || idCru : idCru;
    const totalMaximoPermitido =
      parseInt(localCounts?.[targetId]?.total) ||
      parseInt(localCounts?.[idCru]?.total) ||
      0;
    const numeroDigitado = parseInt(novoValor) || 0;

    if (totalMaximoPermitido > 0 && numeroDigitado > totalMaximoPermitido) {
      setIsInputInvalid(true);
    } else {
      setIsInputInvalid(false);
    }

    setValorNumeroDireto(novoValor); // Explicação: Atualiza instantaneamente o caractere digitado na caixinha de texto.
  }; // Explicação: Encerra o manipulador de alteração direta.

  // 🚀 DISPARO DEFINITIVO DE GRAVAÇÃO NO ONBLUR: Economiza escrita do Firestore e remove totalmente o efeito de piscar as contagens
  const handleBlurNumeroDiretoModal = async (isClearAction = false) => {
    // Explicação: Salva em definitivo no banco apenas quando o usuário encerra a digitação e remove o foco.
    if (
      !currentEventId ||
      isCountsLocked ||
      isClosed ||
      !instrumentoFocadoChecklist
    )
      return; // Explicação: Barreira de checagem operacional.

    lastLocalUpdateRef.current = Date.now(); // Explicação: Ativa o escudo anti-sobrescrita local de 3 segundos.

    const idCru = instrumentoFocadoChecklist.id; // Explicação: Captura o ID de clique (ex: "tuba" ou "vln").
    // 🚀 CORREÇÃO DO BUG DA TUBA: Garante que siglas (IDs curtos) sejam sempre traduzidas para o ID completo (ex: "tub" -> "tuba"), evitando a criação de campos incorretos no banco de dados.
    // A lógica agora verifica o comprimento do ID para traduzir apenas siglas, e não nomes completos.
    const idLimpo = idCru.toLowerCase();
    const targetId =
      idLimpo.length <= 3 ? MAPA_TRADUTOR_EXTENSO[idLimpo] || idCru : idCru;

    // 🚀 BARREIRA ANTI-ZERO PARA TUBA: Garante que se o total mestre estiver zerado ou ausente por erro de mapeamento, herda um limite alto seguro para não travar a digitação.
    const totalMaximoPermitido = // Explicação: Puxa o teto físico real do instrumento para validar a digitação.
      parseInt(localCounts?.[targetId]?.total) ||
      parseInt(localCounts?.[idCru]?.total) ||
      0; // Explicação: Se não houver total, o limite da comum é 0.

    let numeroLimpo = isClearAction
      ? 0
      : Math.max(0, parseInt(valorNumeroDireto) || 0); // Explicação: Limpa o text digitado e transforma em número inteiro positivo.

    if (numeroLimpo > totalMaximoPermitido) {
      // Explicação: Se o valor digitado passar do teto máximo permitido das setas de controle.
      numeroLimpo = totalMaximoPermitido; // Explicação: Força o rebaixamento do valor de forma amigável ao limite máximo real.
      toast(`Quantidade limitada ao total presente (${totalMaximoPermitido})`, {
        icon: "⚠️", // Explicação: Ícone de alerta.
        id: "limit-error",
      }); // Explicação: Emite aviso visual reutilizando o mesmo ID fixo para impedir empilhamentos de Toasts.
    } // Explicação: Encerra o bloco de validação de teto físico.

    setIsInputInvalid(false); // Reseta a validação ao salvar.
    setValorNumeroDireto(String(numeroLimpo)); // 5. Clareza na Exibição do Valor Zero: Mostra "0" em vez de vazio.
    const eventRef = doc(db, "events_global", currentEventId); // Explicação: Conecta com a rota física do ensaio no Firebase.

    try {
      // Explicação: Inicializa o bloco assíncrono de persistência na nuvem.
      await updateDoc(eventRef, {
        // Explicação: Envia de uma só vez o número completo finalizado para a gaveta do Firestore.
        [`counts.${targetId}.comum`]: numeroLimpo, // Explicação: Salva o valor exato dos músicos locais da igreja comum.
        [`counts.${targetId}.modoContagem`]: "numerico", // Explicação: Carimba que esta contagem foi feita por digitação direta.
        updatedAt: Date.now(), // Explicação: Atualiza o relógio de alteração do documento.
      }); // Explicação: Encerra a escrita na nuvem.

      setLocalCounts((prev) => ({
        // Explicação: Updates visual otimista da tela pai de forma estável.
        ...prev, // Explicação: Mantém os dados dos outros instrumentos intactos.
        [targetId]: {
          ...prev[targetId],
          comum: numeroLimpo,
          modoContagem: "numerico",
        }, // Explicação: 🚀 ALINHAMENTO SIMULTÂNEO: Injeta o número na chave oficial por extenso.
        // A atualização da chave de clique original ('idCru') foi removida para prevenir a criação de chaves duplicadas (ex: 'tub') no estado local, o que causava a renderização de cartões de instrumento extras. A atualização agora é feita apenas na chave canônica ('targetId').
      })); // Explicação: Conclui o update visual otimista da tela mestre.
    } catch (e) {
      console.error("Erro ao salvar quantidade avulsa:", e);
      // Explicação: Captura falhas de conexão.
      toast.error("Erro ao salvar quantidade avulsa."); // Explicação: Emite um alerta discreto em caso de pane de rede.
    } // Explicação: Termina o tratamento de erros.
  }; // Explicação: Encerra a função handleBlurNumeroDiretoModal.

  // FUNÇÃO DE SELEÇÃO E GRAVAÇÃO DE PRESENÇA NOMINAL POR MÚSICO INDIVIDUAL (PADRÃO ATA TOQUE AZUL REAL)
  const handleTogglePresencaMusico = async (musico) => {
    // Explicação: Executada quando o secretário toca no card do irmão.
    if (!currentEventId || isCountsLocked || isClosed) return; // Explicação: Trava de barreira operacional.
    triggerHapticFeedback(); // 4. Feedback Tátil

    const novoStatusPresenca = !musico.presente; // Explicação: Inverte de presente para ausente ou vice-versa.

    // 🚀 BARREIRA DE TETO FÍSICO (TOQUE AZUL): Impede que o usuário marque mais músicos do que o total geral informado.
    if (novoStatusPresenca) {
      // Explicação: Só valida a barreira se estiver tentando marcar um músico como PRESENTE.
      const idCru = instrumentoFocadoChecklist.id;
      // 🚀 CORREÇÃO DE CONSISTÊNCIA: Garante que a tradução de ID use sempre minúsculas para evitar falhas de mapeamento (ex: 'Tub' vs 'tub').
      // A lógica agora verifica o comprimento do ID para traduzir apenas siglas, e não nomes completos.
      const idLimpo = idCru.toLowerCase();
      const targetId =
        idLimpo.length <= 3 ? MAPA_TRADUTOR_EXTENSO[idLimpo] || idCru : idCru;
      const totalMaximoPermitido =
        parseInt(localCounts?.[targetId]?.total) ||
        parseInt(localCounts?.[idCru]?.total) ||
        0; // Explicação: Puxa o total do instrumento, com fallback para 0 se não houver.
      const totalPresentesAtual = listaMusicosChamada.filter(
        (m) => m.presente,
      ).length;

      if (totalPresentesAtual >= totalMaximoPermitido) {
        toast.error(
          `Limite de ${totalMaximoPermitido} músicos (total) já atingido.`,
        );
        return; // Explicação: Aborta a operação de marcação e emite o aviso de teto.
      }
    }

    lastNominalUpdateRef.current = Date.now(); // 🚀 ATIVAÇÃO DO ESCUDO: Sinaliza que uma atualização local foi feita, bloqueando dados do servidor por 4s.

    const docMusicoRef = doc(
      db,
      "events_global",
      currentEventId,
      "chamada_musicos",
      musico.id,
    ); // Explicação: Localiza o documento do músico logado na portaria.

    // 🚀 PADRÃO DE ATUALIZAÇÃO OTIMISTA: Atualiza a interface imediatamente para uma experiência fluida.
    const listaOriginal = listaMusicosChamada; // Guarda o estado original para rollback em caso de erro.
    const listaAtualizadaEspelho = listaMusicosChamada.map((m) =>
      m.id === musico.id ? { ...m, presente: novoStatusPresenca } : m,
    );
    setListaMusicosChamada(listaAtualizadaEspelho);

    try {
      // 🚀 TRANSAÇÃO ATÔMICA: Usa um writeBatch para garantir que ambas as escritas aconteçam ou nenhuma.
      const batch = writeBatch(db);

      // Operação 1: Atualizar a presença do músico
      batch.update(docMusicoRef, {
        presente: novoStatusPresenca,
        updatedAt: Date.now(),
      });

      // Operação 2: Atualizar o contador geral no evento
      const totalPresentesEfetivo = listaAtualizadaEspelho.filter(
        (m) => m.presente,
      ).length;
      const idCru = instrumentoFocadoChecklist.id;
      // 🚀 CORREÇÃO DE CONSISTÊNCIA: Garante que a tradução de ID use sempre minúsculas para evitar falhas de mapeamento.
      // A lógica agora verifica o comprimento do ID para traduzir apenas siglas, e não nomes completos.
      const idLimpoBatch = idCru.toLowerCase();
      const targetId =
        idLimpoBatch.length <= 3
          ? MAPA_TRADUTOR_EXTENSO[idLimpoBatch] || idCru
          : idCru;
      const eventRef = doc(db, "events_global", currentEventId);
      batch.update(eventRef, {
        [`counts.${targetId}.comum`]: totalPresentesEfetivo,
        [`counts.${targetId}.modoContagem`]: "nominal",
        updatedAt: Date.now(),
      });

      // Executa o lote
      await batch.commit();

      // Se o lote foi bem-sucedido, atualiza os contadores locais
      setValorNumeroDireto(String(totalPresentesEfetivo));

      setLocalCounts((prev) => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          comum: totalPresentesEfetivo,
          modoContagem: "nominal",
        },
      }));
    } catch (err) {
      // Se o lote falhar (ex: por permissão), desfaz a alteração visual.
      setListaMusicosChamada(listaOriginal); // 🚀 ROLLBACK: Desfaz a marcação visual se a gravação no banco falhar.
      console.error("Falha ao registrar presença (lote):", err);
      toast.error("Falha ao salvar. Verifique sua permissão ou conexão."); // Explicação: Notifica erro de rede ou permissão.
    }
  }; // Explicação: Encerra o método handleTogglePresencaMusico.

  // FUNÇÃO GESTÃO DE AVALIAÇÃO DE TESTE DO ALUNO NO SELETOR NOMINAL
  const handleUpdateAvaliacaoMusico = async (musico, novaAvaliacao) => {
    // Explicação: Salva a nota ou status de avaliação de teste do aprendiz no ensaio.
    if (!currentEventId || isCountsLocked || isClosed) return; // Explicação: Trava de barreira.
    const docMusicoRef = doc(
      db,
      "events_global",
      currentEventId,
      "chamada_musicos",
      musico.id,
    ); // Explicação: Mira no documento mestre do irmão dentro do lote do ensaio.
    try {
      // Explicação: Tenta salvar no Firebase.
      await updateDoc(docMusicoRef, {
        avaliacao: novaAvaliacao,
        updatedAt: Date.now(),
      }); // Explicação: Grava a classificação de teste diretamente na ata histórica deste ensaio.
      toast.success("Avaliação salva!"); // Explicação: Alerta sucesso.
    } catch (err) {
      // Explicação: Captura falha.
      toast.error("Erro ao gravar avaliação."); // Explicação: Alerta falha.
    }
  }; // Explicação: Encerra a função handleUpdateAvaliacaoMusico.

  const handleAddExtraInstrument = async (nome) => {
    // Explicação: Salva um instrumento customizado extra inserido na hora pelo painel.
    if (
      !nome.trim() ||
      !extraInstrumentSection ||
      !userData.isGemLocal ||
      isCountsLocked
    )
      return; // Explicação: Filtra parâmetros válidos e travas de segurança.
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, "")}_${Date.now()}`; // Explicação: Gera um ID dinâmico único e limpo para o instrumento extra.
    try {
      // [Funcionamento]: Tenta salvar.
      await eventService.updateInstrumentCount(eventComumId, currentEventId, {
        instId: idSaneado,
        field: "total",
        value: 0,
        userData,
        section: extraInstrumentSection,
        customName: nome.toUpperCase().trim(),
      }); // Explicação: Envia a inicialização do instrumento extra para o banco de dados.
      setExtraInstrumentSection(null); // Explicação: Fecha o modal de inserção de instrumento extra.
      toast.success("Instrumento adicionado!"); // Explicação: Alerta o usuário do sucesso della criação.
    } catch (e) {
      console.error("Erro ao adicionar instrumento extra:", e);
    } // Explicação: Abafa erros silenciosos.
  }; // Explicação: Encerra a função handleAddExtraInstrument.

  // 🚀 REFAZIMENTO CIRÚRGICA DA CONDICIONAL: SEPARA O CLIQUE DO TÍTULO VISUAL DO CLIQUE NO BOTÃO "ASSUMIR" DA PÍLULA
  const handleToggleGroup = (sec) => {
    // Explicação: Executada exclusivamente quando o usuário clica no botão de Assumir ou Trocar a zeladoria de um naipe.
    if (isClosed || isCountsLocked) return; // Explicação: Se o ensaio ou contagem geral estiverem bloqueados, impede qualquer alteração de portaria.
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, "_")}`; // Explicação: Condrói a chave técnica da seção correspondente.
    const responsibleId = localCounts?.[metaKey]?.responsibleId; // Explicação: Puxa o ID do responsável do banco de dados.

    if (activeGroup === sec && responsibleId === myUID) {
      // Explicação: Se o usuário já for o dono ativo da caneta e quiser apenas recolher a visualização.
      setActiveGroup(null); // Explicação: Fecha a sanfona de instrumentos para limpar espaço na tela.
      return; // Explicação: Aborta the fluxo para evitar que a janela flutuante surja sem necessidade.
    }
    setShowOwnershipModal(sec); // 🚀 LIBERAÇÃO TOTAL: Abre obrigatoriamente o modal de posse na tela do celular do GEM Local para registrar o nome dele no banco!
  }; // Explicação: Encerra o método handleToggleGroup.

  const handleConfirmOwnership = (sec) => {
    // Explicação: Executada quando o usuário clica em sim na janela flutuante de posse.
    setOwnership(
      `meta_${sec.toLowerCase().replace(/\s/g, "_")}`,
      myUID,
      userData?.name,
    ); // 🚀 REDIRECIONAMENTO CIRÚRGICO: Repassa a assinatura de caneta de naipe para o useCounterSync salvar no Firebase.
    setShowOwnershipModal(null); // Explicação: Fecha o modal da tela.
    setActiveGroup(sec.toUpperCase()); // Explicação: Abre imediatamente a sanfona visual do naipe assumido.
  }; // Explicação: Encerra o método handleConfirmOwnership.

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">
        Sincronizando...
      </div>
    ); // Explicação: Desenha uma tela neutra de carregamento até as informações estarem na memória.

  return (
    // Explicação: Inicia a montagem dos elementos de interface visual na tela do smartphone.
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      {/* BANNER DE STATUS OFFLINE */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-0 left-0 right-0 bg-amber-500 text-white p-2 text-center z-100 shadow-lg"
          >
            <p className="text-xs font-bold">
              Você está offline. As alterações serão salvas quando a conexão
              voltar.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER COM CENTRALIZAÇÃO ABSOLUTA */}
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50 relative">
        <div className="flex justify-between items-center max-w-md mx-auto w-full relative h-12">
          {/* BOTÃO VOLTAR */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all z-10 cursor-pointer"
          >
            <ChevronLeft size={22} strokeWidth={3} />
          </button>

          {/* TÍTULO CENTRALIZADO */}
          <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[14px] font-bold text-slate-900 leading-none">
              {eventDateRaw
                ? `${eventDateRaw.split("-")[2]}/${eventDateRaw.split("-")[1]}/${eventDateRaw.split("-")[0]}`
                : "---"}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {ataData?.scope === "regional" && (
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              )}
              <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-37.5 text-center">
                {ataData?.comumNome || "Localidade"}
              </h2>
            </div>
          </div>

          {/* BOTÃO CADEADO */}
          <div className="flex items-center gap-2 z-10">
            {userData.can("gerenciar_contagem_evento", ataData) &&
              !isClosed && (
                <button
                  type="button"
                  onClick={() => {
                    // JUSTIFICATIVA: Trocado updateDoc por setDoc com merge para criar o documento se não existir,
                    // corrigindo o erro "No document to update" na primeira utilização do cadeado.
                    setDoc(
                      doc(db, "countsLocked", currentEventId),
                      {
                        countsLocked: !isCountsLocked,
                        updatedAt: Date.now(),
                      },
                      { merge: true },
                    );
                  }}
                  aria-label={
                    isCountsLocked
                      ? "Desbloquear contagem"
                      : "Bloquear contagem"
                  }
                  className={`p-3 rounded-2xl active:scale-90 transition-all border cursor-pointer ${isCountsLocked ? "bg-blue-600 text-white border-blue-700 shadow-lg" : "bg-slate-50 text-slate-400 border-slate-100"}`}
                >
                  {isCountsLocked ? (
                    <Lock size={18} strokeWidth={3} />
                  ) : (
                    <Unlock size={18} strokeWidth={3} />
                  )}
                </button>
              )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar text-left">
        <div className="max-w-md mx-auto text-left">
          {activeTab === "contador" && (
            <>
              <AnimatePresence>
                {isCountsLocked && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-4 bg-blue-600 text-white p-4 rounded-4xl flex items-center justify-center gap-3 shadow-lg shadow-blue-100"
                  >
                    <Lock size={16} className="shrink-0" />
                    <span className="text-[9px] font-black uppercase italic tracking-widest leading-none">
                      Contagem Finalizada - Somente Leitura
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {ataData?.scope === "regional" ? (
                <CounterRegional
                  instruments={allInstruments}
                  localCounts={localCounts}
                  sections={sections}
                  onUpdate={handleUpdateInstrument}
                  onToggleSection={(id, status, subId) =>
                    setOwnership(
                      id,
                      auth.currentUser?.uid,
                      userData?.name,
                      subId,
                    )
                  }
                  userData={userData}
                  isClosed={isClosed || isCountsLocked}
                  currentEventId={currentEventId}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  isEditingEnabled={isEditingEnabled}
                  onAddExtra={(s) =>
                    userData.isGemLocal && setExtraInstrumentSection(s)
                  }
                  ataData={ataData}
                />
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
                    onAddExtra={(s) =>
                      userData.isGemLocal && setExtraInstrumentSection(s)
                    }
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    ataData={ataData}
                    userData={userData}
                    onOpenChecklistNominal={(inst) =>
                      setInstrumentoFocadoChecklist(inst)
                    }
                    comumId={eventComumId}
                    currentEventId={currentEventId}
                  />
                ))
              )}
            </>
          )}
          {activeTab === "ata" && (
            <AtaPage eventId={currentEventId} comumId={eventComumId} />
          )}
          {activeTab === "dash" &&
            (ataData?.scope === "regional" ? (
              <DashEventRegionalPage
                eventId={currentEventId}
                counts={localCounts}
                userData={userData}
                isAdmin={true}
                ataData={ataData}
              />
            ) : (
              <DashEventPage
                eventId={currentEventId}
                counts={localCounts}
                userData={userData}
                isAdmin={true}
                ataData={ataData}
                allEvents={allEvents}
                instrumentsConfig={instrumentsConfig}
              />
            ))}
        </div>
      </main>

      <CounterFooter activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* INTERFACE MODAL UNIFICADA BRANCO/AZUL COM COMENTÁRIOS VALIDADOS EM BLOCKS */}
      <AnimatePresence>
        {instrumentoFocadoChecklist && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-in navigate-fade duration-200">
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.2rem] w-full max-w-xs p-6 shadow-2xl text-left border border-slate-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0 text-left">
                <div className="text-left min-w-0 flex-1 leading-none">
                  <span className="text-[7px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md uppercase italic tracking-wider leading-none">
                    Entrada Híbrida
                  </span>
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-tight italic mt-1.5 truncate text-left leading-none">
                    Contagem:{" "}
                    {allInstruments.find(
                      (i) =>
                        i.id ===
                          MAPA_TRADUTOR_EXTENSO[
                            instrumentoFocadoChecklist.id
                          ] || i.id === instrumentoFocadoChecklist.id,
                    )?.name || instrumentoFocadoChecklist.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInstrumentoFocadoChecklist(null)}
                  className="w-8 h-8 bg-slate-50 rounded-full text-slate-400 flex items-center justify-center outline-none shrink-0 ml-2 cursor-pointer"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* PORTA 1: DIGITAÇÃO DIRETA AVULSA NO TOPO WITH EVENTO BLUR SEGURO (ANTI-PISCA) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/50 mt-3 shrink-0 flex flex-col gap-1.5 text-left relative">
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1 text-left leading-none">
                  Digitar quantidade diretamente se preferir (Avulso)
                </label>
                <div className="relative w-full flex items-center">
                  <input
                    id="hybrid-input"
                    disabled={
                      !isEditingEnabled(instrumentoFocadoChecklist.section)
                    }
                    type="number"
                    inputMode="numeric"
                    className={`w-full bg-white p-3 rounded-xl border text-xs font-black text-slate-950 uppercase italic outline-none min-h-10 text-center transition-colors ${isInputInvalid ? "border-red-500 focus:border-red-500 ring-red-500/20 ring-2" : "border-slate-200 focus:border-indigo-600"}`}
                    placeholder="0"
                    value={valorNumeroDireto}
                    onChange={(e) =>
                      handleUpdateNumeroDiretoModal(e.target.value)
                    }
                    onBlur={() => handleBlurNumeroDiretoModal(false)}
                  />
                  {/* 2. Botão para Limpar o Campo (Clear Button) */}
                  {valorNumeroDireto && valorNumeroDireto !== "0" && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        handleBlurNumeroDiretoModal(true);
                        setValorNumeroDireto("0");
                      }}
                      className="absolute right-3 bg-slate-200 text-slate-500 w-5 h-5 rounded-full flex items-center justify-center active:scale-90 transition-all"
                      aria-label="Limpar campo"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>

              {/* PORTA 2: LISTA DE TOQUE */}
              <div className="flex-1 overflow-y-auto py-3 mt-1 space-y-2 no-scrollbar text-left">
                <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1 text-left leading-none">
                  Ou selecione os músicos abaixo por extenso (Toque Azul)
                </p>
                {listaMusicosChamada.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-wider italic text-center">
                      Nenhum alistamento cadastrado para esta localidade comuns.
                    </p>
                  </div>
                ) : (
                  listaMusicosChamada.map((m) => {
                    const deEdicaoLiberada = isEditingEnabled(
                      instrumentoFocadoChecklist.section,
                    );
                    return (
                      <div
                        key={m.id}
                        onClick={() =>
                          deEdicaoLiberada && handleTogglePresencaMusico(m)
                        }
                        className={`p-3.5 rounded-xl border transition-all shadow-3xs cursor-pointer flex flex-col gap-1.5 text-left active:scale-[0.99] select-none ${m.presente ? "bg-indigo-600 border-indigo-700 text-white shadow-xs shadow-indigo-100 font-black" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50/80"}`}
                      >
                        <div className="flex justify-between items-center gap-2 w-full text-left">
                          <p className="text-[11px] font-black uppercase italic whitespace-normal break-words leading-tight flex-1 min-w-0 pr-1 text-left">
                            {m.nome}
                          </p>
                          <span
                            className={`text-[6.5px] font-black px-1.5 py-0.5 rounded-md uppercase italic border shrink-0 ${m.presente ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-400"}`}
                          >
                            {m.situacao?.includes("Oficial")
                              ? "OF"
                              : m.situacao?.includes("Jovens")
                                ? "RJM"
                                : "ALU"}
                          </span>
                        </div>

                        {/* SELETOR DE NOTAS DE TESTES */}
                        {(m.situacao?.includes("Aprendiz") ||
                          m.situacao?.includes("Aluno")) && (
                          <div
                            className="mt-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              disabled={!deEdicaoLiberada}
                              className={`border text-[8px] font-black rounded px-1 py-0.5 uppercase tracking-wide outline-none cursor-pointer w-full text-center ${m.presente ? "bg-white/20 border-white/30 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                              value={m.avaliacao || "Sem"}
                              onChange={(e) =>
                                handleUpdateAvaliacaoMusico(m, e.target.value)
                              }
                            >
                              <option
                                value="Sem"
                                className="text-slate-900 font-bold"
                              >
                                Sem Avaliação
                              </option>
                              <option
                                value="Aprovado Encarregado"
                                className="text-slate-900 font-bold"
                              >
                                Aprovado Encarregado
                              </option>
                              <option
                                value="Aprovado Examinadora"
                                className="text-slate-900 font-bold"
                              >
                                Aprovado Examinadora
                              </option>
                              <option
                                value="Necessita Treino"
                                className="text-slate-900 font-bold"
                              >
                                Necessita Treino
                              </option>
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
          <OwnershipModal
            showOwnershipModal={showOwnershipModal}
            localCounts={localCounts}
            myUID={myUID}
            userData={userData}
            onConfirm={handleConfirmOwnership}
            onCancel={() => setShowOwnershipModal(null)}
          />
        )}
        {extraInstrumentSection && (
          <ExtraInstrumentModal
            section={extraInstrumentSection}
            onConfirm={handleAddExtraInstrument}
            onCancel={() => setExtraInstrumentSection(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CounterPage;
