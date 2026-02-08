import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, updateDoc, auth, getDocs, query, orderBy, getDoc } from '../../config/firebase';
import { eventService } from '../../services/eventService';
import AtaPage from './AtaPage';
import DashEventPage from '../dashboard/DashEventPage';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, LogOut, ClipboardCheck, LayoutGrid, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

// IMPORTAÇÃO DOS COMPONENTES MODULARES
import CounterSection from './components/CounterSection';
import OwnershipModal from './components/OwnershipModal';
// Importação do novo modal de extras
import ExtraInstrumentModal from './components/ExtraInstrumentModal';

let debounceTimers = {};

const CounterPage = ({ currentEventId, counts, onBack, allEvents }) => {
  const { userData } = useAuth();
  const level = userData?.accessLevel;
  
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  
  const canEditAta = isGemLocal; 

  const [activeTab, setActiveTab] = useState('contador');
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]);
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ataData, setAtaData] = useState(null);
  const [eventDateRaw, setEventDateRaw] = useState('');
  const [eventComumId, setEventComumId] = useState(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(null);
  
  // ESTADOS PARA INSTRUMENTOS EXTRAS v5.0
  const [extraInstrumentSection, setExtraInstrumentSection] = useState(null);
  const [localCounts, setLocalCounts] = useState({});

  const isClosed = ataData?.status === 'closed';
  const myUID = auth.currentUser?.uid || userData?.uid || userData?.id;

  useEffect(() => { if (counts) setLocalCounts(counts); }, [counts]);

  useEffect(() => {
    if (!activeGroup || !currentEventId || isClosed) return;
    
    const metaKey = `meta_${activeGroup.toLowerCase().replace(/\s/g, '_')}`;
    const isOwner = localCounts?.[metaKey]?.responsibleId === myUID;

    if (isOwner) {
      const setSession = async (status) => {
        try {
          await updateDoc(doc(db, 'events_global', currentEventId), {
            [`counts.${metaKey}.isActive`]: status,
            [`counts.${metaKey}.lastHeartbeat`]: Date.now()
          });
        } catch (e) { console.error("Erro sessão:", e); }
      };

      setSession(true);
      return () => setSession(false);
    }
  }, [activeGroup, currentEventId, isClosed, myUID]);

  useEffect(() => {
    let isMounted = true;
    const loadInstruments = async () => {
      try {
        const nacSnap = await getDocs(query(collection(db, 'config_instrumentos_nacional'), orderBy('name', 'asc')));
        if (isMounted) setInstrumentsNacionais(nacSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (eventComumId) {
          const locSnap = await getDocs(collection(db, 'comuns', eventComumId, 'instrumentos_config'));
          if (isMounted) setInstrumentsConfig(locSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
    };
    loadInstruments();
    return () => { isMounted = false; };
  }, [eventComumId]);

  useEffect(() => {
    if (!currentEventId) return;
    let isMounted = true;

    const loadData = async () => {
      const eventRef = doc(db, 'events_global', currentEventId);
      
      const unsubEvent = onSnapshot(eventRef, (s) => {
        if (s.exists() && isMounted) {
          const data = s.data();
          
          const ataConsolidada = {
            ...data.ata,
            date: data.date, 
            comumId: data.comumId,
            comumNome: data.comumNome,
            status: data.ata?.status || 'open'
          };

          setAtaData(ataConsolidada);
          setEventComumId(data.comumId);
          setEventDateRaw(data.date || '');
          if (data.counts) setLocalCounts(data.counts);
          setLoading(false);
        }
      });
      return () => unsubEvent();
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentEventId]);

  const allInstruments = useMemo(() => {
    const ordemOficial = ['Coral', 'irmandade', 'orgao', 'violino', 'viola', 'violoncelo', 'flauta','clarinete', 'claronealto', 'claronebaixo', 'oboe', 'corneingles', 'fagote', 'saxsoprano', 'saxalto', 'saxtenor', 'saxbaritono', 'trompete', 'flugelhorn', 'trompa', 'trombone', 'eufonio', 'tuba', 'acordeon'];
    const base = instrumentsNacionais.map(instBase => {
      const override = instrumentsConfig.find(local => local.id === instBase.id);
      return override ? { ...instBase, ...override } : instBase;
    });
    // Herança Dinâmica: Mapeia instrumentos que existem no evento mas não no cadastro da igreja
    const extras = Object.keys(localCounts).filter(key => !key.startsWith('meta_') && !ordemOficial.includes(key)).map(key => ({ 
      id: key, 
      name: localCounts[key].name || key.toUpperCase(), 
      section: (localCounts[key].section || 'GERAL').toUpperCase() 
    }));
    return [...base, ...extras].sort((a, b) => (ordemOficial.indexOf(a.id) > -1 ? ordemOficial.indexOf(a.id) : 99) - (ordemOficial.indexOf(b.id) > -1 ? ordemOficial.indexOf(b.id) : 99));
  }, [instrumentsNacionais, instrumentsConfig, localCounts]);

  const sections = useMemo(() => {
    const ordemSessoes = ['IRMANDADE', 'CORAL', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];
    return [...new Set(allInstruments.map(i => (i.section || "GERAL").toUpperCase()))].sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99));
  }, [allInstruments]);

  const handleUpdateInstrument = (id, field, value, section) => {
    if (isClosed) return;
    // Atualização local para feedback instantâneo (UX)
    setLocalCounts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    
    if (debounceTimers[id + field]) clearTimeout(debounceTimers[id + field]);
    debounceTimers[id + field] = setTimeout(async () => {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, { instId: id, field, value, userData, section });
    }, 450);
  };

  // Função para criar o instrumento extra no banco do evento
  const handleAddExtraInstrument = async (nome) => {
    if (!nome.trim() || !extraInstrumentSection) return;
    
    const idSaneado = `extra_${nome.toLowerCase().replace(/\s/g, '')}_${Date.now()}`;
    
    try {
      await eventService.updateInstrumentCount(eventComumId, currentEventId, {
        instId: idSaneado,
        field: 'total',
        value: 0,
        userData,
        section: extraInstrumentSection,
        customName: nome.toUpperCase().trim()
      });
      setExtraInstrumentSection(null);
      toast.success("Instrumento adicionado ao ensaio!");
    } catch (e) {
      toast.error("Erro ao adicionar extra.");
    }
  };

  const handleToggleGroup = (sec) => {
    if (isClosed) return setActiveGroup(activeGroup === sec ? null : sec);
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    const responsibleId = localCounts?.[metaKey]?.responsibleId;
    
    if (activeGroup === sec) { setActiveGroup(null); return; }
    
    if (isMaster || responsibleId === myUID) {
      setActiveGroup(sec);
    } else {
      setShowOwnershipModal(sec);
    }
  };

  const setOwnership = async (sec, wantsToOwn) => {
    if (!eventComumId || isClosed) return;
    const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
    
    if (wantsToOwn) {
      try {
        await updateDoc(doc(db, 'events_global', currentEventId), {
          [`counts.${metaKey}.responsibleId`]: myUID,
          [`counts.${metaKey}.responsibleName`]: userData?.name || "Colaborador",
          [`counts.${metaKey}.isActive`]: true,
          [`counts.${metaKey}.updatedAt`]: Date.now()
        });
      } catch (e) { toast.error("Erro ao assumir seção."); return; }
    }
    setActiveGroup(sec);
    setShowOwnershipModal(null);
  };

  const isEditingEnabled = (sec) => isMaster || (!isClosed && localCounts?.[`meta_${sec.toLowerCase().replace(/\s/g, '_')}`]?.responsibleId === myUID);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-black text-slate-400 uppercase text-[10px]">Sincronizando Jurisdição...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-left relative font-sans animate-premium">
      <header className="bg-white pt-6 pb-6 px-6 rounded-b-[2.5rem] shadow-md border-b border-slate-200 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button onClick={onBack} className="bg-slate-100 p-3 rounded-2xl text-slate-500 active:scale-90 transition-all">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
          <div className="text-center px-4 overflow-hidden flex flex-col gap-0.5">
            <p className="text-[14px] font-bold text-slate-900 leading-none">
              {eventDateRaw ? `${eventDateRaw.split('-')[2]}/${eventDateRaw.split('-')[1]}/${eventDateRaw.split('-')[0]}` : '---'}
            </p>
            <h2 className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest truncate max-w-[180px]">
              {ataData?.comumNome || "Localidade"}
            </h2>
          </div>
          <button onClick={onBack} className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-90 transition-all border border-red-100">
            <LogOut size={18} strokeWidth={3} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-52 no-scrollbar">
        <div className="max-w-md mx-auto">
          {activeTab === 'contador' && sections.map((sec) => (
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
              onAddExtra={(s) => setExtraInstrumentSection(s)}
            />
          ))}
          {activeTab === 'ata' && <AtaPage eventId={currentEventId} comumId={eventComumId} userData={userData} isMaster={isMaster} isAdmin={canEditAta} />}
          {activeTab === 'dash' && <DashEventPage eventId={currentEventId} counts={localCounts} userData={userData} isAdmin={true} ataData={ataData} />}
        </div>
      </main>

      <AnimatePresence>
        {/* MODAL DE POSSE */}
        {showOwnershipModal && (
          <OwnershipModal 
            showOwnershipModal={showOwnershipModal}
            localCounts={localCounts}
            myUID={myUID}
            userData={userData}
            onConfirm={setOwnership}
            onCancel={() => setShowOwnershipModal(null)}
          />
        )}

        {/* MODAL DE INSTRUMENTO EXTRA */}
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
  <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 ${active ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-500'}`}>
    {icon}<span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">{label}</span>
  </button>
);

export default CounterPage;