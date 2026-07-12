import React, { useState, useEffect, useMemo } from "react"; // [Funcionamento]: Traz o núcleo do React e as ferramentas de gerenciamento de memória (estados) e sensores (efeitos).
// PRESERVAÇÃO: Canais de comunicação em tempo real com o banco de dados Firebase mantidos e otimizados para corte de custos
import {
  db,
  collection,
  onSnapshot,
  query,
  where,
} from "../../config/firebase"; // [Funcionamento]: Conectores oficiais do banco Firestore para escutas macro.
import { useDashAnalytics } from "../../hooks/useDashAnalytics"; // [Funcionamento]: A calculadora matemática isolada do painel de dados.

// BLINDAGEM DE DEPENDÊNCIAS: Ícones unificados para abas, botões, localização e fechamento
import {
  MapPin,
  Building2,
  ChevronDown,
  LayoutGrid,
  BarChart3,
  Users,
  Search,
  X,
  SlidersHorizontal,
  CheckCircle,
} from "lucide-react"; // [Funcionamento]: Desenhos vetorizados de alta qualidade para a interface móvel.
import { AnimatePresence, motion } from "framer-motion"; // [Funcionamento]: Motor de animações físicas fluidas para o ambiente mobile.

// Importação dos componentes desmembrados e modulares da nossa esteira de desenvolvimento
import MetricCardsGroup from "./components/MetricCardsGroup"; // [Funcionamento]: Central dos cartões Big Numbers com Drill-down integrado.
import AnalyticsCarousel from "./components/AnalyticsCarousel"; // [Funcionamento]: Carrossel secundário com gráficos de linha e área.
import VisitsRegistry from "./components/VisitsRegistry"; // [Funcionamento]: Central de listagem nominal e rankings de visitantes.
import LocalAttendanceList from "./components/LocalAttendanceList"; // [Funcionamento]: Lista de chamadas nominais dos músicos da comum.

const DashPage = ({ userData }) => {
  // [Funcionamento]: Inicia a tela principal do Dashboard recebendo o Crachá Eletrônico do usuário.
  const [events, setEvents] = useState([]); // [Funcionamento]: Caixa de memória para guardar a lista de relatórios de ensaios encontrados.
  const [subCollectionAttendance, setSubCollectionAttendance] = useState([]); // [Funcionamento]: Armazena os dados nominais das subcoleções escutadas de forma reativa.
  const [loading, setLoading] = useState(true); // [Funcionamento]: Caixa de memória para ligar ou desligar o sinal de carregamento na tela.

  // Controle da Aba Ativa de Assuntos no topo (Resumos, Gráficos, Chamada ou Visitas)
  const [activeTab, setActiveTab] = useState("resumo"); // [Funcionamento]: Define 'resumo' como a aba inicial padrão da tela.

  // Controle do Modal Centralizado da Lupa (Filtros Simultâneos)
  const [isFilterOpen, setIsFilterOpen] = useState(false); // [Funcionamento]: Controla se o pop-up de filtros está aberto ou fechado.

  // Estados de controle interno e paginação dos componentes filhos (Preservados estritamente)
  const [topLimit, setTopLimit] = useState(5); // [Funcionamento]: Limite de linhas no ranking de hinos.
  const [presencaSlide, setPresencaSlide] = useState(0); // [Funcionamento]: Controle de página do carrossel de presença.
  const [equiSlide, setEquiSlide] = useState(0); // [Funcionamento]: Controle de página do carrossel de equilíbrio.
  const [hinosSlide, setHinosSlide] = useState(0); // [Funcionamento]: Controle de página do carrossel de hinos chamados.
  const [visitaOrigemSlide, setVisitaOrigemSlide] = useState(0); // [Funcionamento]: Controle de página do carrossel de geolocalização.

  // Estados dos seletores de filtros cronológicos e de busca
  const [filterType, setFilterType] = useState("year"); // [Funcionamento]: Tipo de agrupamento de tempo (padrão Anual).
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // [Funcionamento]: Ano corrente extraído da máquina do usuário.
  const [subFilter, setSubFilter] = useState(new Date().getMonth().toString()); // [Funcionamento]: Fração menor de tempo (Mês corrente).
  const [listCityFilter, setListCityFilter] = useState("all"); // [Funcionamento]: Filtro de cidade de origem para a listagem.
  const [listMinFilter, setListMinFilter] = useState("all"); // [Funcionamento]: Filtro de ministério para a listagem.

  const [listaCidades, setListaCidades] = useState([]); // [Funcionamento]: Armazena a lista de cidades pertencentes à regional.
  const [listaIgrejas, setListaIgrejas] = useState([]); // [Funcionamento]: Armazena a lista de comuns/igrejas mapeadas.

  // MATRIZ DE PODER: Transforma os seletores estáticos em Estados Reativos controlados pelos menus da Lupa
  const [selectedCityId, setSelectedCityId] = useState(
    userData?.activeCityId || userData?.cidadeId || "all",
  ); // [Funcionamento]: Estado reativo da cidade sniper focada.
  const [activeComumId, setActiveComumId] = useState(
    userData?.activeComumId || userData?.comumId || "consolidated",
  ); // [Funcionamento]: Estado reativo da localidade selecionada.

  const level = (userData?.accessLevel || "basico").toLowerCase().trim(); // [Funcionamento]: Captura o nível de autoridade e força letras minúsculas para checagem segura.
  const isComissao =
    level === "master" || level === "comissao" || level === "regional"; // [Funcionamento]: Valida se o usuário tem poderes de gerenciamento macro ou regional.
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId; // [Funcionamento]: Captura o ID da Regional do usuário.

  // Conexão com a máquina matemática unificada (useMemo interno protegido contra loops)
  const analytics = useDashAnalytics(
    events,
    filterType,
    selectedYear,
    subFilter,
  ); // [Funcionamento]: Aciona os cálculos em segundo plano do hook matemático.

  // Sensor 1: Monitora em tempo real a lista de Igrejas e Cidades da Regional (Com higiene de memória)
  useEffect(() => {
    // [Funcionamento]: Dispara a busca reativa de dados estruturados territoriais.
    if (!activeRegionalId) return; // [Funcionamento]: Se o usuário não tiver uma regional no crachá, aborta o sensor para evitar vazamento de dados.

    const qIgr = isComissao
      ? query(
          collection(db, "comuns"),
          where("regionalId", "==", activeRegionalId),
        ) // [Funcionamento]: Administradores leem a regional inteira.
      : query(
          collection(db, "comuns"),
          where("cidadeId", "==", userData?.cidadeId),
        ); // [Funcionamento]: Músicos locais leem estritamente sua cidade.

    const unsubIgr = onSnapshot(qIgr, (sIgs) => {
      // [Funcionamento]: Escuta em tempo real a lista de igrejas comuns.
      const igs = sIgs.docs.map((d) => ({ id: d.id, ...d.data() })); // [Funcionamento]: Transforma em objetos legíveis.
      setListaIgrejas(
        igs.sort((a, b) => (a.comum || "").localeCompare(b.comum || "")),
      ); // [Funcionamento]: Ordena as comuns em ordem alfabética e guarda na memória.
    }); // [Funcionamento]: Encerra o canal.

    const qCid = query(
      collection(db, "config_cidades"),
      where("regionalId", "==", activeRegionalId),
    ); // [Funcionamento]: Prepara busca de cidades autorizadas.
    const unsubCid = onSnapshot(qCid, (sCids) => {
      // [Funcionamento]: Ouve as cidades em tempo real.
      const todasCidades = sCids.docs.map((d) => ({
        id: d.id,
        nome: d.data().nome,
      })); // [Funcionamento]: Converte em vetor simples.
      setListaCidades(
        isComissao
          ? todasCidades.sort((a, b) => a.nome.localeCompare(b.nome))
          : todasCidades.filter((c) => c.id === userData?.cidadeId),
      ); // [Funcionamento]: Filtra ou ordena conforme o crachá.
    }); // [Funcionamento]: Encerra canal de cidades.

    return () => {
      unsubIgr();
      unsubCid();
    }; // [Funcionamento]: Desliga os canais de escuta ao fechar a tela para economizar cota de leitura.
  }, [activeRegionalId, isComissao, userData?.cidadeId]); // [Funcionamento]: Recalcula se as chaves da regional mudarem.

  // Sensor 2: Motor de Busca unificado da coleção `events_global` (Filtro Severo na Origem para Corte de Custos)
  useEffect(() => {
    // [Funcionamento]: Ouve a coleção global de ensaios aplicando filtros severos na portaria para economizar internet.
    if (!activeRegionalId) return; // [Funcionamento]: Aborta se o ID de regional estiver ausente.
    setLoading(true); // [Funcionamento]: Ativa o estado de carregamento dos gráficos.

    // Constrói os critérios de consulta baseados nas restrições de poder do crachá do usuário
    let constraints = [where("regionalId", "==", activeRegionalId)]; // [Funcionamento]: Trava incondicional da regional de direito.

    if (!isComissao) {
      // [Funcionamento]: Se for usuário de secretaria de igreja local.
      constraints.push(where("comumId", "==", activeComumId)); // [Funcionamento]: Trava estritamente a igreja comum dele.
    } else {
      // [Funcionamento]: Se for membro da comissão administrativa regional.
      if (activeComumId !== "consolidated") {
        // [Funcionamento]: Se escolheu uma igreja na Lupa.
        constraints.push(where("comumId", "==", activeComumId)); // [Funcionamento]: Filtra apenas os relatórios dessa igreja.
      } else if (selectedCityId !== "all") {
        // [Funcionamento]: Se escolheu uma cidade na Lupa.
        constraints.push(where("cidadeId", "==", selectedCityId)); // [Funcionamento]: Filtra os ensaios de toda essa cidade.
      } // [Funcionamento]: Fim da triagem administrativa.
    } // [Funcionamento]: Termina montagem de filtros.

    const qEvents = query(collection(db, "events_global"), ...constraints); // [Funcionamento]: Constrói a busca final.

    const unsubEvents = onSnapshot(qEvents, (snap) => {
      // [Funcionamento]: Ouve os ensaios em tempo real da regional.
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })); // [Funcionamento]: Converte em lista JavaScript pura
      setEvents(data); // [Funcionamento]: Entrega para a caixa de memória central
      setLoading(false); // [Funcionamento]: Libera o esqueleto visual dos gráficos.
    }); // [Funcionamento]: Encerra canal de escuta.

    return () => unsubEvents(); // [Funcionamento]: Garante o encerramento do canal ao desmontar o componente.
  }, [activeRegionalId, activeComumId, selectedCityId, isComissao]); // [Funcionamento]: Roda se mudar a localidade ou filtros.

  // Sensor 3: Escuta e acopla a chamada nominal das subcoleções na RAM de forma reativa
  useEffect(() => {
    // [Funcionamento]: Carrega em lote as listas de presença nominais de portaria de todos os ensaios filtrados.
    if (events.length === 0) {
      // [Funcionamento]: Se não houver ensaios no período.
      setSubCollectionAttendance([]); // [Funcionamento]: Zera a lista nominal.
      return; // [Funcionamento]: Aborta.
    } // [Funcionamento]: Termina checagem de vetor vazio.

    const unsubs = []; // [Funcionamento]: Sacola de encerramento de canais.
    const allAttendanceData = {}; // [Funcionamento]: Gaveta temporária de dados brutos na RAM.

    events.forEach((ev) => {
      // [Funcionamento]: Varre ensaio por ensaio do período filtrado.
      const qSub = collection(db, "events_global", ev.id, "chamada_musicos"); // [Funcionamento]: Aponta para a subcoleção nominal daquele ensaio.

      const unsub = onSnapshot(
        qSub,
        (snap) => {
          // [Funcionamento]: Abre escuta em tempo real nas folhas de chamadas individuais.
          const rows = snap.docs.map((doc) => ({
            id: doc.id,
            eventId: ev.id,
            ...doc.data(),
          })); // [Funcionamento]: Converte em objetos identificados.

          allAttendanceData[ev.id] = rows; // [Funcionamento]: Agrupa as linhas na gaveta do ensaio na RAM.
          const flatList = Object.values(allAttendanceData).flat(); // [Funcionamento]: Achata as gavetas em uma lista linear única.
          setSubCollectionAttendance(flatList); // [Funcionamento]: Entrega para a esteira de BI.
        },
        (err) => {
          // [Funcionamento]: Trata ensaios sem lista nominal cadastrada.
          console.log(
            "Subcoleção vazia ou restrita para o evento:",
            ev.id,
            err,
          ); // [Funcionamento]: Emite aviso técnico seguro.
        },
      ); // [Funcionamento]: Fecha sub-ouvinte.

      unsubs.push(unsub); // [Funcionamento]: Guarda o detonador de encerramento na sacola.
    }); // [Funcionamento]: Fim da varredura de ensaios.

    return () => unsubs.forEach((fn) => fn()); // [Funcionamento]: Desliga em massa todas as sub-escutas ao sair da tela.
  }, [events]); // [Funcionamento]: Reinicia se a lista mestre de eventos mudar.

  // INTERSEÇÃO EM FILA DE MEMÓRIA (DATA INTERSECTION): Mescla os dados nominais da subcoleção na RAM antes de enviar ao Heatmap
  const eventsWithAttendanceInjected = React.useMemo(() => {
    // [Funcionamento]: Envelopa e acopla as chamadas de presença nominais dentro de cada ata na memória RAM.
    return events.map((ev) => {
      // [Funcionamento]: Varre a lista de ensaios do estado.
      const matchRows = subCollectionAttendance.filter(
        (row) => row.eventId === ev.id,
      ); // [Funcionamento]: Filtra apenas os músicos que bateram cartão neste ensaio específico.
      return {
        ...ev,
        ata: {
          ...ev.ata,
          presencaLocalFull: matchRows, // [Funcionamento]: Injeta as presenças calculadas direto na veia da ata na RAM.
        },
      }; // [Funcionamento]: Retorna o objeto híbrido montado.
    }); // [Funcionamento]: Termina varredura.
  }, [events, subCollectionAttendance]); // [Funcionamento]: Recalcula apenas se os ensaios ou presenças mudarem.

  // 🚀 EXTRAÇÃO DA IDENTIDADE DE FILTRO PROFUNDO (PROTETOR ANTI-PISCADA VITE): Localiza e envelopa os dados reais da Comum ativa de forma 100% segura.
  const payloadComumEfetivoNoFoco = useMemo(() => {
    // [Funcionamento]: Memoriza a extração cadastral da igreja ativa para blindar a velocidade da tela.
    const alvo = listaIgrejas.find((i) => i.id === activeComumId); // [Funcionamento]: Pesca o documento completo da igreja selecionada na Lupa.
    return alvo
      ? { comum: alvo.comum, cidadeNome: alvo.cidadeNome || "Jundiaí" }
      : null; // [Funcionamento]: Retorna o mapa higienizado ou nulo estável.
  }, [activeComumId, listaIgrejas]); // [Funcionamento]: Recalcula apenas se a seleção de localidade mudar no topo.

  const mesesRef = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ]; // [Funcionamento]: Dicionário linear de strings textuais de meses.

  if (loading && events.length === 0)
    return (
      <div className="h-screen flex items-center justify-center font-black text-slate-500 animate-pulse uppercase text-xs tracking-wider">
        Sincronizando Painel...
      </div>
    ); // [Funcionamento]: Desenha o esqueleto de carregamento síncrono.

  return (
    // [Funcionamento]: Palco visual mestre do painel móvel.
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-32 text-left">
      {/* CABEÇALHO COMPACTO: REESTRUTURAÇÃO EM MATRIZ FIXA 2X2 SEM SCROLL */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md p-4 border-b border-slate-100 shadow-sm rounded-b-[2.2rem]">
        <div className="flex items-center gap-3 w-full">
          {/* GRID MATRIZ 2X2: Navegação em malha estável de alta usabilidade */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            <GridTabButton
              active={activeTab === "resumo"}
              label="Resumos"
              icon={<LayoutGrid size={15} />}
              onClick={() => setActiveTab("resumo")}
            />
            <GridTabButton
              active={activeTab === "graficos"}
              label="Gráficos"
              icon={<BarChart3 size={15} />}
              onClick={() => setActiveTab("graficos")}
            />
            <GridTabButton
              active={activeTab === "chamada"}
              label="Chamada"
              icon={<CheckCircle size={15} />}
              onClick={() => setActiveTab("chamada")}
            />
            <GridTabButton
              active={activeTab === "visitas"}
              label="Visitas"
              icon={<Users size={15} />}
              onClick={() => setActiveTab("visitas")}
            />
          </div>

          {/* Botão da Lupa Expandível */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-2xl text-white shadow-md active:scale-95 transition-all shrink-0 cursor-pointer self-center"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* PALCO CENTRAL DE APRESENTAÇÃO */}
      <div className="p-4 flex-1 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === "resumo" && (
            <motion.div
              key="resumo"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              transition={{ duration: 0.12 }}
              className="w-full"
            >
              <MetricCardsGroup
                tM={analytics.tM}
                tO={analytics.tO}
                tI={analytics.tI}
                tH={analytics.tH}
                tEnc={analytics.tEnc}
                totalMeses={analytics.totalMeses}
                chartArray={analytics.chartArray}
                topHinos={analytics.topHinos}
              />
            </motion.div>
          )}

          {activeTab === "graficos" && (
            <motion.div
              key="graficos"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              transition={{ duration: 0.12 }}
              className="w-full"
            >
              <AnalyticsCarousel
                chartArray={analytics.chartArray}
                presencaSlide={presencaSlide}
                setPresencaSlide={setPresencaSlide}
                equiSlide={equiSlide}
                setEquiSlide={setEquiSlide}
              />
            </motion.div>
          )}

          {activeTab === "chamada" && (
            <motion.div
              key="chamada"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              transition={{ duration: 0.12 }}
              className="w-full"
            >
              {/* 🚀 COMBINAÇÃO DE SEGURANÇA MESTRE: Acopla os dados cronológicos e os payloads de foco estruturados para o PDF processar sem travar */}
              <LocalAttendanceList
                events={eventsWithAttendanceInjected}
                userLevel={level}
                comumDataSelected={payloadComumEfetivoNoFoco}
                anoFiltroAtivo={selectedYear}
              />
            </motion.div>
          )}

          {activeTab === "visitas" && (
            <motion.div
              key="visitas"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              transition={{ duration: 0.12 }}
              className="w-full"
            >
              <VisitsRegistry
                listMinFilter={listMinFilter}
                setListMinFilter={setListMinFilter}
                listCityFilter={listCityFilter}
                setListCityFilter={setListCityFilter}
                filterOptions={analytics.filterOptions}
                nominalFinal={analytics.nominalFinal}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DA LUPA CENTRALIZADO NA TELA (POP-UP PREMIUM) */}
      <AnimatePresence>
        {isFilterOpen && (
          /* 🚀 TIMING VISUAL ALINHADO: Trava o desfoque escuro exatamente acima da barra preta do Footer com bottom-24 */
          <div className="fixed top-0 left-0 right-0 bottom-24 sm:inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 24, stiffness: 350 }}
              /* 🚀 ESCUDO CONTRA DEGOLAMENTO: Injetado mb-16 para elevar o botão azul acima do rodapé nativo */
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative z-10 border border-slate-100 flex flex-col gap-4 text-left mb-16 sm:mb-0"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-blue-600" />
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight italic">
                    Refinar Pesquisa
                  </h3>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-pointer active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className={`w-full flex items-center h-14 gap-3 bg-slate-50 px-4 rounded-2xl border border-slate-200 ${!isComissao ? "opacity-60 pointer-events-none" : ""}`}
              >
                <MapPin size={18} className="text-blue-600 shrink-0" />
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                    Filtro por Cidade
                  </span>
                  <select
                    disabled={!isComissao}
                    value={!isComissao ? userData?.cidadeId : selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    className="bg-transparent text-slate-900 font-black text-sm uppercase outline-none w-full appearance-none cursor-pointer"
                  >
                    {!isComissao ? (
                      <option value={userData?.cidadeId}>
                        {userData?.cidadeNome || "SUA CIDADE"}
                      </option>
                    ) : (
                      <>
                        <option value="all">Todas as Cidades</option>
                        {listaCidades.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                {isComissao && (
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                )}
              </div>

              <div className="w-full flex items-center h-14 gap-3 bg-slate-950 px-4 rounded-2xl border border-slate-800 shadow-inner">
                <Building2 size={18} className="text-blue-400 shrink-0" />
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                    Filtro por Localidade
                  </span>
                  <select
                    value={activeComumId}
                    onChange={(e) => setActiveComumId(e.target.value)}
                    className="bg-transparent text-white font-black text-sm uppercase outline-none w-full appearance-none cursor-pointer"
                  >
                    {!isComissao ? (
                      <option value={userData?.comumId}>
                        {userData?.comumNome || "SUA COMUM"}
                      </option>
                    ) : (
                      <>
                        <option value="consolidated">
                          {selectedCityId === "all"
                            ? "Resumo da Regional"
                            : "Consolidado da Cidade"}
                        </option>
                        {listaIgrejas
                          .filter(
                            (i) =>
                              selectedCityId === "all" ||
                              i.cidadeId === selectedCityId,
                          )
                          .map((ig) => (
                            <option
                              key={ig.id}
                              value={ig.id}
                              className="text-slate-900 bg-white"
                            >
                              {ig.comum || ig.nome}
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                </div>
                <ChevronDown size={14} className="text-white/40 shrink-0" />
              </div>

              <div className="h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center px-4">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-0.5">
                    Período de Agrupamento
                  </span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-transparent text-blue-700 font-black text-sm uppercase outline-none appearance-none cursor-pointer"
                  >
                    <option value="year" className="text-slate-900">
                      Visão Anual Completa
                    </option>
                    <option value="semester" className="text-slate-900">
                      Visão Semestral Cronológica
                    </option>
                    <option value="quarter" className="text-slate-900">
                      Visão Trimestral Agrupada
                    </option>
                    <option value="month" className="text-slate-900">
                      Visão Mensal Individual
                    </option>
                    <option value="all" className="text-slate-900">
                      Histórico Total Acumulado
                    </option>
                  </select>
                </div>
                <ChevronDown size={14} className="text-blue-500 shrink-0" />
              </div>

              {filterType !== "all" && (
                <div className="flex gap-3 w-full">
                  <div className="h-14 bg-slate-50 border border-slate-200 rounded-2xl flex-1 flex flex-col justify-center px-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                      Ano
                    </span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-transparent font-black text-sm text-slate-800 outline-none appearance-none cursor-pointer"
                    >
                      {[2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filterType !== "year" && (
                    <div className="h-14 bg-slate-50 border border-slate-200 rounded-2xl flex-[2_2_0px] flex flex-col justify-center px-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                        Fração / Mês
                      </span>
                      <select
                        value={subFilter}
                        onChange={(e) => setSubFilter(e.target.value)}
                        className="w-full bg-transparent font-black text-sm uppercase text-slate-800 outline-none appearance-none cursor-pointer"
                      >
                        {filterType === "semester" && (
                          <>
                            <option value="0">1º Semestre</option>
                            <option value="1">2º Semestre</option>
                          </>
                        )}
                        {filterType === "quarter" && (
                          <>
                            <option value="0">1º Trimestre</option>
                            <option value="1">2º Trimestre</option>
                            <option value="2">3º Trimestre</option>
                            <option value="3">4º Trimestre</option>
                          </>
                        )}
                        {filterType === "month" &&
                          mesesRef.map((m, i) => (
                            <option key={m} value={i}>
                              {m}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full h-12 bg-blue-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest italic shadow-lg active:scale-[0.98] transition-all cursor-pointer mt-2 flex items-center justify-center"
              >
                Aplicar Filtros Simultâneos
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GridTabButton = ({ active, label, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 h-11 px-3 rounded-xl font-black text-xs uppercase tracking-tight transition-all border cursor-pointer ${
      active
        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100 opacity-100"
        : "bg-slate-50 border-slate-100 text-slate-500 opacity-80 hover:bg-slate-100"
    }`}
  >
    <div className={`shrink-0 ${active ? "text-white" : "text-slate-400"}`}>
      {icon}
    </div>
    <span className="truncate">{label}</span>
  </button>
);

export default DashPage;
