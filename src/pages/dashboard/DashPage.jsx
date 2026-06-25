import React, { useState, useEffect } from 'react'; // [Funcionamento]: Traz o núcleo do React e as ferramentas de gerenciamento de memória (estados) e sensores (efeitos).
// PRESERVAÇÃO: Canais de comunicação em tempo real com o banco de dados Firebase mantidos e otimizados para corte de custos
import { db, collection, onSnapshot, query, where } from '../../config/firebase'; // Conectores oficiais do banco Firestore para escutas macro.
import { useDashAnalytics } from '../../hooks/useDashAnalytics'; // A calculadora matemática isolada do painel de dados.

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
  CheckCircle
} from 'lucide-react'; // Desenhos vetorizados de alta qualidade para a interface móvel.
import { AnimatePresence, motion } from 'framer-motion'; // Motor de animações físicas fluidas para o ambiente mobile.

// Importação dos componentes desmembrados e modulares da nossa esteira de desenvolvimento
import MetricCardsGroup from './components/MetricCardsGroup'; // Central dos cartões Big Numbers com Drill-down integrado.
import AnalyticsCarousel from './components/AnalyticsCarousel'; // Carrossel secundário com gráficos de linha e área.
import VisitsRegistry from './components/VisitsRegistry'; // Central de listagem nominal e rankings de visitantes.
import LocalAttendanceList from './components/LocalAttendanceList'; // Lista de chamadas nominais dos músicos da comum.

const DashPage = ({ userData }) => { // Inicia a tela principal do Dashboard recebendo o Crachá Eletrônico do usuário.
  const [events, setEvents] = useState([]); // Caixa de memória para guardar a lista de relatórios de ensaios encontrados.
  const [subCollectionAttendance, setSubCollectionAttendance] = useState([]); // Armazena os dados nominais das subcoleções escutadas de forma reativa.
  const [loading, setLoading] = useState(true); // Caixa de memória para ligar ou desligar o sinal de carregamento na tela.
  
  // Controle da Aba Ativa de Assuntos no topo (Resumos, Gráficos, Chamada ou Visitas)
  const [activeTab, setActiveTab] = useState('resumo'); 
  
  // Controle do Modal Centralizado da Lupa (Filtros Simultâneos)
  const [isFilterOpen, setIsFilterOpen] = useState(false); 

  // Estados de controle interno e paginação dos componentes filhos (Preservados estritamente)
  const [topLimit, setTopLimit] = useState(5); // Limite de linhas no ranking de hinos.
  const [presencaSlide, setPresencaSlide] = useState(0); // Controle de página do carrossel de presença.
  const [equiSlide, setEquiSlide] = useState(0); // Controle de página do carrossel de equilíbrio.
  const [hinosSlide, setHinosSlide] = useState(0); // Controle de página do carrossel de hinos chamados.
  const [visitaOrigemSlide, setVisitaOrigemSlide] = useState(0); // Controle de página do carrossel de geolocalização.

  // Estados dos seletores de filtros cronológicos e de busca
  const [filterType, setFilterType] = useState('year'); // Tipo de agrupamento de tempo (padrão Anual).
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ano corrente extraído da máquina do usuário.
  const [subFilter, setSubFilter] = useState(new Date().getMonth().toString()); // Fração menor de tempo (Mês corrente).
  const [listCityFilter, setListCityFilter] = useState('all'); // Filtro de cidade de origem para a listagem.
  const [listMinFilter, setListMinFilter] = useState('all'); // Filtro de ministério para a listagem.

  const [listaCidades, setListaCidades] = useState([]); // Armazena a lista de cidades pertencentes à regional.
  const [listaIgrejas, setListaIgrejas] = useState([]); // Armazena a lista de comuns/igrejas mapeadas.
  
  // MATRIZ DE PODER: Transforma os seletores estáticos em Estados Reativos controlados pelos menus da Lupa
  const [selectedCityId, setSelectedCityId] = useState(userData?.activeCityId || userData?.cidadeId || 'all'); // Estado reativo da cidade selecionada.
  const [activeComumId, setActiveComumId] = useState(userData?.activeComumId || userData?.comumId || 'consolidated'); // Estado reativo da localidade selecionada.

  const level = (userData?.accessLevel || 'basico').toLowerCase().trim(); // Captura o nível de autoridade e força letras minúsculas para checagem segura.
  const isComissao = level === 'master' || level === 'comissao' || level === 'regional'; // Valida se o usuário tem poderes de gerenciamento macro ou regional.
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId; // Captura o ID da Regional do usuário.

  // Conexão com a máquina matemática unificada (useMemo interno protegido contra loops)
  const analytics = useDashAnalytics(events, filterType, selectedYear, subFilter); 

  // Sensor 1: Monitora em tempo real a lista de Igrejas e Cidades da Regional (Com higiene de memória)
  useEffect(() => {
    if (!activeRegionalId) return; // Se o usuário não tiver uma regional no crachá, aborta o sensor para evitar vazamento de dados.

    const qIgr = (isComissao)
      ? query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId)) // Administradores leem a regional inteira.
      : query(collection(db, 'comuns'), where('cidadeId', '==', userData?.cidadeId)); // Músicos locais leem estritamente sua cidade.
    
    const unsubIgr = onSnapshot(qIgr, (sIgs) => {
      const igs = sIgs.docs.map(d => ({ id: d.id, ...d.data() }));
      setListaIgrejas(igs.sort((a, b) => (a.comum || "").localeCompare(b.comum || ""))); // Ordena as comuns em ordem alfabética e guarda na memória.
    });

    const qCid = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    const unsubCid = onSnapshot(qCid, (sCids) => {
      const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome }));
      setListaCidades(isComissao ? todasCidades.sort((a, b) => a.nome.localeCompare(b.nome)) : todasCidades.filter(c => c.id === userData?.cidadeId));
    });

    return () => { unsubIgr(); unsubCid(); }; // Desliga os canais de escuta ao fechar a tela para economizar cota de leitura.
  }, [activeRegionalId, isComissao, userData?.cidadeId]);

  // Sensor 2: Motor de Busca unificado da coleção `events_global` (Filtro Severo na Origem para Corte de Custos)
  useEffect(() => {
    if (!activeRegionalId) return;
    setLoading(true);

    // Constrói os critérios de consulta baseados nas restrições de poder do crachá do usuário
    let constraints = [where('regionalId', '==', activeRegionalId)];

    if (!isComissao) {
      constraints.push(where('comumId', '==', activeComumId));
    } else {
      if (activeComumId !== 'consolidated') {
        constraints.push(where('comumId', '==', activeComumId));
      } else if (selectedCityId !== 'all') {
        constraints.push(where('cidadeId', '==', selectedCityId));
      }
    }

    const qEvents = query(collection(db, 'events_global'), ...constraints);

    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })); // Converte em lista JavaScript pura
      setEvents(data); // Entrega para a caixa de memória central
      setLoading(false); // Libera o esqueleto visual dos gráficos.
    });

    return () => unsubEvents(); // Garante o encerramento do canal ao desmontar o componente.
  }, [activeRegionalId, activeComumId, selectedCityId, isComissao]);

  // Sensor 3: Escuta e acopla a chamada nominal das subcoleções na RAM de forma reativa
  useEffect(() => {
    if (events.length === 0) {
      setSubCollectionAttendance([]);
      return;
    }

    const unsubs = [];
    const allAttendanceData = {};

    events.forEach(ev => {
      const qSub = collection(db, 'events_global', ev.id, 'chamada_musicos');
      
      const unsub = onSnapshot(qSub, (snap) => {
        const rows = snap.docs.map(doc => ({
          id: doc.id,
          eventId: ev.id,
          ...doc.data()
        }));

        allAttendanceData[ev.id] = rows;
        const flatList = Object.values(allAttendanceData).flat();
        setSubCollectionAttendance(flatList);
      }, (err) => {
        console.log("Subcoleção vazia ou restrita para o evento:", ev.id, err);
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach(fn => fn());
  }, [events]);

  // INTERSEÇÃO EM FILA DE MEMÓRIA (DATA INTERSECTION): Mescla os dados nominais da subcoleção na RAM antes de enviar ao Heatmap
  const eventsWithAttendanceInjected = React.useMemo(() => {
    return events.map(ev => {
      const matchRows = subCollectionAttendance.filter(row => row.eventId === ev.id);
      return {
        ...ev,
        ata: {
          ...ev.ata,
          presencaLocalFull: matchRows 
        }
      };
    });
  }, [events, subCollectionAttendance]);

  const mesesRef = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  if (loading && events.length === 0) return <div className="h-screen flex items-center justify-center font-black text-slate-500 animate-pulse uppercase text-xs tracking-wider">Sincronizando Painel...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-32 text-left">
      
      {/* CABEÇALHO COMPACTO: REESTRUTURAÇÃO EM MATRIZ FIXA 2X2 SEM SCROLL */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md p-4 border-b border-slate-100 shadow-sm rounded-b-[2.2rem]">
        <div className="flex items-center gap-3 w-full">
          
          {/* GRID MATRIZ 2X2: Navegação em malha estável de alta usabilidade */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            <GridTabButton active={activeTab === 'resumo'} label="Resumos" icon={<LayoutGrid size={15} />} onClick={() => setActiveTab('resumo')} />
            <GridTabButton active={activeTab === 'graficos'} label="Gráficos" icon={<BarChart3 size={15} />} onClick={() => setActiveTab('graficos')} />
            <GridTabButton active={activeTab === 'chamada'} label="Chamada" icon={<CheckCircle size={15} />} onClick={() => setActiveTab('chamada')} />
            <GridTabButton active={activeTab === 'visitas'} label="Visitas" icon={<Users size={15} />} onClick={() => setActiveTab('visitas')} />
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
          {activeTab === 'resumo' && (
            <motion.div key="resumo" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.12 }} className="w-full">
              <MetricCardsGroup 
                tM={analytics.tM} tO={analytics.tO} tI={analytics.tI} 
                tH={analytics.tH} tEnc={analytics.tEnc} totalMeses={analytics.totalMeses} 
                chartArray={analytics.chartArray} 
                topHinos={analytics.topHinos} 
              />
            </motion.div>
          )}

          {activeTab === 'graficos' && (
            <motion.div key="graficos" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.12 }} className="w-full">
              <AnalyticsCarousel 
                chartArray={analytics.chartArray}
                presencaSlide={presencaSlide} setPresencaSlide={setPresencaSlide}
                equiSlide={equiSlide} setEquiSlide={setEquiSlide}
              />
            </motion.div>
          )}

          {activeTab === 'chamada' && (
            <motion.div key="chamada" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.12 }} className="w-full">
              <LocalAttendanceList events={eventsWithAttendanceInjected} userLevel={level} />
            </motion.div>
          )}

          {activeTab === 'visitas' && (
            <motion.div key="visitas" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.12 }} className="w-full">
              <VisitsRegistry 
                listMinFilter={listMinFilter} setListMinFilter={setListMinFilter}
                listCityFilter={listCityFilter} setListCityFilter={setListCityFilter}
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
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} 
              onClick={() => setIsFilterOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
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
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight italic">Refinar Pesquisa</h3>
                </div>
                <button 
                  onClick={() => setIsFilterOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-pointer active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={`w-full flex items-center h-14 gap-3 bg-slate-50 px-4 rounded-2xl border border-slate-200 ${!isComissao ? 'opacity-60 pointer-events-none' : ''}`}>
                <MapPin size={18} className="text-blue-600 shrink-0" />
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Filtro por Cidade</span>
                  <select 
                    disabled={!isComissao}
                    value={!isComissao ? userData?.cidadeId : selectedCityId} 
                    onChange={(e) => setSelectedCityId(e.target.value)} 
                    className="bg-transparent text-slate-900 font-black text-sm uppercase outline-none w-full appearance-none cursor-pointer"
                  >
                    {!isComissao ? (
                      <option value={userData?.cidadeId}>{userData?.cidadeNome || "SUA CIDADE"}</option>
                    ) : (
                      <>
                        <option value="all">Todas as Cidades</option>
                        {listaCidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </>
                    )}
                  </select>
                </div>
                {isComissao && <ChevronDown size={14} className="text-slate-400 shrink-0" />}
              </div>

              <div className="w-full flex items-center h-14 gap-3 bg-slate-950 px-4 rounded-2xl border border-slate-800 shadow-inner">
                <Building2 size={18} className="text-blue-400 shrink-0" />
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Filtro por Localidade</span>
                  <select 
                    value={activeComumId} 
                    onChange={(e) => setActiveComumId(e.target.value)} 
                    className="bg-transparent text-white font-black text-sm uppercase outline-none w-full appearance-none cursor-pointer"
                  >
                    {!isComissao ? (
                      <option value={userData?.comumId}>{userData?.comumNome || "SUA COMUM"}</option>
                    ) : (
                      <>
                        <option value="consolidated">
                          {selectedCityId === 'all' ? 'Resumo da Regional' : 'Consolidado da Cidade'}
                        </option>
                        {listaIgrejas.filter(i => selectedCityId === 'all' || i.cidadeId === selectedCityId).map(ig => (
                          <option key={ig.id} value={ig.id} className="text-slate-900 bg-white">{ig.comum || ig.nome}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <ChevronDown size={14} className="text-white/40 shrink-0" />
              </div>

              <div className="h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center px-4">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-0.5">Período de Agrupamento</span>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-transparent text-blue-700 font-black text-sm uppercase outline-none appearance-none cursor-pointer">
                    <option value="year" className="text-slate-900">Visão Anual Completa</option>
                    <option value="semester" className="text-slate-900">Visão Semestral Cronológica</option>
                    <option value="quarter" className="text-slate-900">Visão Trimestral Agrupada</option>
                    <option value="month" className="text-slate-900">Visão Mensal Individual</option>
                    <option value="all" className="text-slate-900">Histórico Total Acumulado</option>
                  </select>
                </div>
                <ChevronDown size={14} className="text-blue-500 shrink-0" />
              </div>

              {filterType !== 'all' && (
                <div className="flex gap-3 w-full">
                  <div className="h-14 bg-slate-50 border border-slate-200 rounded-2xl flex-1 flex flex-col justify-center px-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Ano</span>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-transparent font-black text-sm text-slate-800 outline-none appearance-none cursor-pointer">
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  {filterType !== 'year' && (
                    <div className="h-14 bg-slate-50 border border-slate-200 rounded-2xl flex-[2_2_0px] flex flex-col justify-center px-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Fração / Mês</span>
                      <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="w-full bg-transparent font-black text-sm uppercase text-slate-800 outline-none appearance-none cursor-pointer">
                        {filterType === 'semester' && <><option value="0">1º Semestre</option><option value="1">2º Semestre</option></>}
                        {filterType === 'quarter' && <><option value="0">1º Trimestre</option><option value="1">2º Trimestre</option><option value="2">3º Trimestre</option><option value="3">4º Trimestre</option></>}
                        {filterType === 'month' && mesesRef.map((m, i) => <option key={m} value={i}>{m}</option>)}
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
        ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100 opacity-100' 
        : 'bg-slate-50 border-slate-100 text-slate-500 opacity-80 hover:bg-slate-100'
    }`}
  >
    <div className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}>
      {icon}
    </div>
    <span className="truncate">{label}</span>
  </button>
);

export default DashPage;