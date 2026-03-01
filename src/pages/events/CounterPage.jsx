import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Importa ferramentas básicas do React
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, getDoc } from '../../config/firebase'; // Conecta com o banco de dados
import { eventService } from '../../services/eventService'; // Importa o serviço de salvamento de eventos
import AtaPage from './AtaPage'; // Importa a página da Ata
import DashEventPage from '../dashboard/DashEventPage'; // Importa o painel de controle local
import DashEventRegionalPage from '../dashboard/DashEventRegionalPage'; // Importa o painel de controle regional
import toast from 'react-hot-toast'; // Importa os avisos flutuantes na tela
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3, Lock, Unlock // Importa ícones visuais incluindo Cadeados
} from 'lucide-react'; // Biblioteca de ícones
import { motion, AnimatePresence } from 'framer-motion'; // Importa animações suaves
import { useAuth } from '../../context/AuthContext'; // Puxa dados do usuário logado

// IMPORTAÇÃO DOS COMPONENTES MODULARES
import CounterSection from './components/CounterSection'; // Componente de seções de instrumentos
import OwnershipModal from './components/OwnershipModal'; // Janela para assumir responsabilidade
import ExtraInstrumentModal from './components/ExtraInstrumentModal'; // Janela para adicionar instrumentos extras
import CounterRegional from './components/CounterRegional'; // Componente de contagem regional

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => { // Inicia a página de contagem
  const { userData } = useAuth(); // Puxa os dados de quem está usando o app
  const level = userData?.accessLevel; // Identifica o nível de poder (Master, Cidade, GEM, etc)
  
  const isMaster = level === 'master'; // Define se é administrador total
  const isComissao = isMaster || level === 'comissao'; // Define se é da comissão nacional
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Define se é gestor regional ou de cidade
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Define se é colaborador local (GEM)
  
  // Conforme Matriz: Básico visualiza Dash/Ata, mas GEM+ edita a Ata
  const canEditAta = isGemLocal; // Define quem pode preencher a ata

  const [activeTab, setActiveTab] = useState('contador'); // Controla qual aba está aberta (Contar, Ata ou Dash)
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Lista oficial de instrumentos da CCB
  const [instrumentsConfig, setInstrumentsConfig] = useState([]); // Configurações específicas da igreja local
  const [activeGroup, setActiveGroup] = useState(null); // Controla qual grupo de instrumentos está aberto para contar
  const [loading, setLoading] = useState(true); // Controla o aviso de "carregando"
  const [ataData, setAtaData] = useState(null); // Guarda os dados da ata
  const [eventDateRaw, setEventDateRaw] = useState(''); // Guarda a data do evento sem formatação
  const [eventComumId, setEventComumId] = useState(null); // Guarda o ID da igreja local
  const [showOwnershipModal, setShowOwnershipModal] = useState(null); // Controla a janela de "Assumir Seção"
  
  // ESTADOS PARA INSTRUMENTOS EXTRAS v5.0
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null); // Guarda qual seção receberá um instrumento extra
  const [localCounts, setLocalCounts] = useState({}); // Guarda os números da contagem em tempo real

  // NOVO v9.6: Estado para Lacre de Contagem (Tarja Visual)
  const [isCountsLocked, setIsCountsLocked] = useState(false); // Indica se a contagem de números está trancada

  // JUSTIFICATIVA: Ref para controlar se há uma atualização local em curso
  const isUpdatingRef = useRef(null); // Evita conflitos quando duas pessoas salvam ao mesmo tempo

  const isClosed = ataData?.status === 'closed'; // Verifica se o evento todo já foi encerrado
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id; // Identifica o ID único do usuário atual

  useEffect(() => { // Sincroniza os números locais com os números que vem do banco
    if (counts && !isUpdatingRef.current) {
      setLocalCounts(counts); 
    }
  }, [counts]);

  // HEARTBEAT DE SESSÃO: Blindado para evitar crash por permission-denied
  useEffect(() => { // Avisa ao banco que o usuário ainda está logado e contando
    if (!activeGroup || !currentEventId || isClosed) return;
    
    const metaKey = `meta_${activeGroup.toLowerCase().replace(/\s/g, '_')}`; // Cria a chave técnica da seção
    const isOwner = localCounts?.[metaKey]?.responsibleId === myUID; // Verifica se o usuário é o dono desta seção

    if (isOwner) { // Se for o dono, envia o sinal de "estou ativo" a cada segundo
      const setSession = async (status) => {
        try {
          await updateDoc(doc(db, 'events_global', currentEventId), {
            [`counts.${metaKey}.isActive`]: status,
            [`counts.${metaKey}.lastHeartbeat`]: Date.now()
          });
        } catch (e) {
          // Silent catch - ignora erros de permissão temporários
        }
      };

      setSession(true); // Liga o sinal
      return () => setSession(false); // Desliga o sinal ao sair
    }
  }, [activeGroup, currentEventId, isClosed, myUID, localCounts]);

  // CARREGAMENTO DE INSTRUMENTOS
  useEffect(() => { // Busca as listas de instrumentos assim que a página abre
    let isMounted = true;
    const loadInstruments = async () => {
      try {
        const nacSnap = await getDocs(query(collection(db, 'config_instrumentos_nacional'), orderBy('name', 'asc'))); // Busca lista nacional
        if (isMounted) setInstrumentsNacionais(nacSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (eventComumId) { // Se tiver a igreja, busca quais instrumentos ela usa
          const locSnap = await getDocs(collection(db, 'comuns', eventComumId, 'instrumentos_config'));
          if (isMounted) setInstrumentsConfig(locSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { 
        console.warn("Jurisdição: Configurações não carregadas."); // Avisa se houver erro de acesso
      } finally {
        if (isMounted) setLoading(false); // Tira o aviso de carregando
      }
    };
    loadInstruments();
    return () => { isMounted = false; };
  }, [eventComumId]);

  // MONITOR REATIVO DO EVENTO
  useEffect(() => { // Fica "ouvindo" qualquer mudança no ensaio em tempo real
    if (!currentEventId) return;
    let isMounted = true;

    const eventRef = doc(db, 'events_global', currentEventId); // Caminho do ensaio no banco
    
    const unsubEvent = onSnapshot(eventRef, 
      (s) => {
        if (s.exists() && isMounted) {
          const data = s.data(); // Pega os dados brutos do banco
          const ataConsolidada = { // Organiza as informações da Ata
            ...data.ata,
            date: data.date, 
            comumId: data.comumId,
            comumNome: data.comumNome,
            status: data.ata?.status || 'open',
            scope: data.scope || 'local'
          };

          setAtaData(ataConsolidada); // Atualiza os dados da Ata na tela
          setEventComumId(data.comumId); // Salva o ID da igreja
          setEventDateRaw(data.date || ''); // Salva a data do ensaio
          setIsCountsLocked(data.countsLocked || false); // Sincroniza se a contagem está lacrada [v9.6]
          
          if (!isUpdatingRef.current) { // Se não estivermos salvando nada agora, atualiza os números da tela
              setLocalCounts(data.counts || {});
          }
        }
      },
      (err) => {
        console.error("Sync Error:", err); // Avisa se a conexão cair
      }
    );
    return () => { isMounted = false; unsubEvent(); }; // Corta a conexão ao sair da página
  }, [currentEventId]);

  // v5.5: FILTRAGEM DE DADOS PARA O DASHBOARD (Fix Definitivo da Soma)
  const filteredCountsForDash = useMemo(() => { // Limpa os dados para mostrar no gráfico
    const cleanCounts = { ...localCounts };
    Object.keys(cleanCounts).forEach(key => {
      const item = cleanCounts[key];
      const isIrmandade = item?.section?.toUpperCase() === 'IRMANDADE' || key.toLowerCase().includes('coral') || key === 'irmas' || key === 'irmaos';
      
      if (isIrmandade) {
        cleanCounts[key] = { ...item, _isIrmandade: true }; // Marca o que é irmandade/coral
      }
    });
    return cleanCounts;
  }, [localCounts]);

  const allInstruments = useMemo(() => { // Organiza a ordem que os instrumentos aparecem na tela
    const ordemOficial = ['Coral', 'irmandade', 'irmas', 'irmaos', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    
    let base = instrumentsNacionais.map(instBase => {
      const override = instrumentsConfig.find(local => local.id === instBase.id);
      return override ? { ...instBase, ...override } : instBase;
    });

    const extraIdsNoBanco = Object.keys(localCounts).filter(k => 
      !k.startsWith('meta_') && 
      !base.find(b => b.id === k)
    );
    
    const extras = extraIdsNoBanco.map(id => {
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

    const final = [...base, ...extras];

    return final.sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99));
  }, [instrumentsNacionais, instrumentsConfig, localCounts]);

  const sections = useMemo(() => { // Separa os instrumentos por famílias (Cordas, Madeiras, etc)
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99));
  }, [allInstruments]);

  // v8.15.2: ATUALIZAÇÃO OTIMISTA HÍBRIDA (TOTAL COMO TETO)
  const handleUpdateInstrument = (id, field, value, section) => { // Altera os números de um instrumento
    if (isClosed || isCountsLocked) return; // BLOQUEIO v9.6: Não deixa alterar se estiver lacrado

    if (isUpdatingRef.current) clearTimeout(isUpdatingRef.current);
    isUpdatingRef.current = setTimeout(() => { isUpdatingRef.current = null; }, 1000);

    setLocalCounts(prev => {
      const sectionKey = section?.toUpperCase();
      
      let targetId = id;
      if (sectionKey === 'IRMANDADE') targetId = 'Coral';
      if (sectionKey === 'ORGANISTAS') targetId = 'orgao';

      const currentData = prev[targetId] || {};
      const newVal = Math.max(0, parseInt(value) || 0);

      // LÓGICA DE PROTEÇÃO: Se estiver alterando Comum ou Enc, limita ao Total
      if ((field === 'comum' || field === 'enc') && newVal > (currentData.total || 0)) {
        return prev; 
      }

      const updatedObj = { ...currentData, [field]: newVal };

      // REGRA DE CASCATA: Se baixar o Total, reduz Comum e Enc
      if (field === 'total') {
        if ((currentData.comum || 0) > newVal) updatedObj.comum = newVal;
        if ((currentData.enc || 0) > newVal) updatedObj.enc = newVal;
        
        updatedObj.total = (id === 'irmas' || id === 'irmaos') ? 
          ((field === 'irmas' ? newVal : (currentData.irmas || 0)) + 
           (field === 'irmaos' ? newVal : (currentData.irmaos || 0))) : newVal;
      } else if (field === 'irmas' || field === 'irmaos') {
          updatedObj.total = (field === 'irmas' ? newVal : (currentData.irmas || 0)) + 
                             (field === 'irmaos' ? newVal : (currentData.irmaos || 0));
      }

      return { ...prev, [targetId]: updatedObj };
    });
    
    eventService.updateInstrumentCount(eventComumId, currentEventId, { 
       instId: id, field, value, userData, section 
    }).catch(() => {
       toast.error("Erro na sincronização.");
    });
  };

  // NOVO v9.6: Função para Lacre de Contagem (Botão da Chave Mestra)
  const handleToggleCountsLock = async () => { // Liga ou desliga o lacre dos números
    if (!isRegionalCidade || isClosed) return; // Só gestores podem usar e se o ensaio não estiver encerrado de vez
    try {
      const newStatus = !isCountsLocked; // Inverte o estado atual
      await updateDoc(doc(db, 'events_global', currentEventId), {
        countsLocked: newStatus // Salva o novo estado no banco de dados
      });
      toast.success(newStatus ? "Contagem Lacrada 🔒" : "Contagem Reaberta 🔓"); // Mostra aviso na tela
    } catch (e) {
      toast.error("Erro ao alterar lacre."); // Avisa se falhar
    }
  };

  const handleAddExtraInstrument = async (nome) => { // Adiciona um instrumento que não estava na lista inicial
    if (!nome.trim() || !extraInstrumentSection || !isGemLocal || isCountsLocked) return;
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, '')}_${Date.now()}`;
    try {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, {
        instId: idSaneado, field: 'total', value: 0, userData, section: extraInstrumentSection, customName: nome.toUpperCase().trim()
      });
      setExtraInstrumentSection(null);
      toast.success("Instrumento adicionado!");
    } catch (e) {
      toast.error("Erro ao adicionar extra.");
    }
  };

  const handleToggleGroup = (sec) => { // Abre ou fecha um grupo de instrumentos (ex: Cordas)
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = localCounts?.[metaKey]?.responsibleId;
    
    if (activeGroup === sec) { setActiveGroup(null); return; }
    
    if (isComissao || responsibleId === myUID) {
      setActiveGroup(sec);
      setShowOwnershipModal(null);
    } else {
      setShowOwnershipModal(sec);
    }
  };

  const setOwnership = async (id, currentOwnerStatus, subRole = null) => { // Define quem é o responsável pela seção
    if (!eventComumId || isClosed || !currentEventId || isCountsLocked) return;
    
    try {
      setShowOwnershipModal(null);

      const respKey = subRole ? `responsibleId_${subRole}` : `responsibleId`;
      const nameKey = subRole ? `responsibleName_${subRole}` : `responsibleName`;

      await updateDoc(doc(db, 'events_global', currentEventId), {
        [`counts.${id}.${respKey}`]: myUID,
        [`counts.${id}.${nameKey}`]: userData?.name || userData?.nome || "Colaborador",
        [`counts.${id}.updatedAt`]: Date.now()
      });
      
      if (id.startsWith('meta_')) {
        const sectionTag = id.replace('meta_', '').toUpperCase();
        setActiveGroup(sectionTag);
      }
      
      toast.success("Responsabilidade assumida.");
    } catch (e) { 
      console.error("Erro de Posse:", e);
      toast.error("Falha ao assumir responsabilidade."); 
    }
  };

  // v8.15.2: CORREÇÃO DEFINITIVA DE PERMISSÃO HÍBRIDA
  const isEditingEnabled = (sec, subInstId = null) => { // Verifica se o usuário tem permissão para editar um número agora
    if (isClosed || isCountsLocked) return false; // Bloqueia se o ensaio ou a contagem estiverem trancados
    if (isComissao) return true; // Comissão sempre edita
    
    // MODO LOCAL: Valida se é dono do Naipe (metaKey)
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    if (ataData?.scope !== 'regional') {
      return localCounts?.[metaKey]?.responsibleId === myUID;
    }

    // MODO REGIONAL: Valida sub-posse (Irmãs/Irmãos/Órgão)
    const sectionInstruments = allInstruments.filter(i => (i.section || '').toUpperCase() === sec.toUpperCase());
    const mestre = sectionInstruments.find(i => !['irmas', 'irmaos'].includes(i.id.toLowerCase()));
    const masterData = localCounts?.[mestre?.id];
    
    if (subInstId === 'irmas' || subInstId === 'irmaos') {
      return masterData?.[`responsibleId_${subInstId}`] === myUID;
    }

    return masterData?.responsibleId === myUID;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans">
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all">
            <ChevronLeft size={22} strokeWidth={3} />
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
          {/* BOTÃO v9.6: Chave de Lacre para Gestores */}
          {isRegionalCidade && !isClosed && (
            <button onClick={handleToggleCountsLock} className={`p-3 rounded-2xl active:scale-90 transition-all border ${isCountsLocked ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
              {isCountsLocked ? <Lock size={18} strokeWidth={3}/> : <Unlock size={18} strokeWidth={3}/>}
            </button>
          )}
          {!isRegionalCidade && (
            <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 transition-all border border-red-100">
              <LogOut size={18} strokeWidth={3} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar">
        <div className="max-w-md mx-auto">
          {activeTab === 'contador' && (
            <>
              {/* TARJA v9.6: Aviso visual de Lacre de Contagem */}
              <AnimatePresence>
                {isCountsLocked && (
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 bg-blue-600 text-white p-4 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-100">
                    <Lock size={16} className="shrink-0" />
                    <span className="text-[9px] font-black uppercase italic tracking-widest leading-none">Contagem Finalizada - Somente Leitura</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {ataData?.scope === 'regional' ? (
                <CounterRegional 
                  instruments={allInstruments}
                  localCounts={localCounts}
                  sections={sections}
                  onUpdate={handleUpdateInstrument}
                  onToggleSection={(id, status, role) => setOwnership(id, status, role)} 
                  onAddExtra={(s) => isGemLocal && setExtraInstrumentSection(s)} 
                  userData={userData}
                  isClosed={isClosed || isCountsLocked} // Repassa o bloqueio para os componentes internos
                  currentEventId={currentEventId}
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
                    onAddExtra={(s) => isGemLocal && setExtraInstrumentSection(s)}
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
        {showOwnershipModal && (
          <OwnershipModal 
            showOwnershipModal={showOwnershipModal}
            localCounts={localCounts}
            myUID={myUID}
            userData={userData}
            onConfirm={(sec) => setOwnership(`meta_${sec.toLowerCase().replace(/\s/g, '_')}`, true)}
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

const TabButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-50'}`}>
    {icon}<span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">{label}</span>
  </button>
);

export default CounterPage;