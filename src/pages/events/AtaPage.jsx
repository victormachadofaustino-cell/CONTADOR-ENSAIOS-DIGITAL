import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, query, where, orderBy, getDocs } from '../../config/firebase';
import { eventService } from '../../services/eventService'; 
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, ShieldCheck, Info, X, User, Music, MapPin, Phone, Calendar, Clock, Trash2, Users, ShieldAlert
} from 'lucide-react';

// Importação do Cérebro de Autenticação v2.1
import { useAuth } from '../../context/AuthContext';

// Importação dos Componentes Atômicos Refatorados
import { Accordion, Field, Modal, Select } from './components/AtaUIComponents.jsx';
import AtaLiturgia from './components/AtaLiturgia.jsx';
import AtaVisitantes from './components/AtaVisitantes.jsx';
import AtaMinisterioLocal from './components/AtaMinisterioLocal.jsx';
import AtaLacreStatus from './components/AtaLacreStatus.jsx';
// Importação do Novo Módulo de Ocorrências
import AtaOcorrencias from './components/AtaOcorrencias.jsx';
// Importação do Módulo de Palavra Pregada (v1.0 Regional)
import AtaPalavra from './components/AtaPalavra.jsx';
// Importação dos Módulos de Gestão Regional v4.0
import GuestManager from './components/GuestManager.jsx';
import MinistryAccordion from './components/MinistryAccordion.jsx';

const AtaPage = ({ eventId, comumId }) => {
  const { userData } = useAuth();
  const level = userData?.accessLevel;
  
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';

  const [ataData, setAtaData] = useState({
    status: 'open',
    atendimentoNome: '', atendimentoMin: '',
    hinoAbertura: '', // NOVO CAMPO v8.7
    oracaoAberturaNome: '', oracaoAberturaMin: '',
    ultimaOracaoNome: '', ultimaOracaoMin: '',
    partes: [
      { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
      { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
    ],
    palavra: { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' },
    presencaLocal: [],
    presencaLocalFull: [],
    visitantes: [],
    ocorrencias: [] 
  });
  
  const [eventMeta, setEventMeta] = useState(null);
  const [localMinisterio, setLocalMinisterio] = useState([]);
  const [referenciaMinisterio, setReferenciaMinisterio] = useState([]);
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [showConfirmReopen, setShowConfirmReopen] = useState(false);
  const [visitaToDelete, setVisitaToDelete] = useState(null);
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  
  const [openSection, setOpenSection] = useState(null); 
  const [editIndex, setEditIndex] = useState(null);
  const saveTimeoutRef = useRef(null);

  // v1.1: Expandido com os campos solicitados no Anexo 2
  const [newVisita, setNewVisita] = useState({ 
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  const isClosed = ataData?.status === 'closed';
  const isRegionalScope = eventMeta?.scope === 'regional';
  
  const temPermissaoEditar = useMemo(() => {
    if (isBasico || isClosed) return false;
    if (isMaster || isComissao) return true;
    if (level === 'regional_cidade' && eventMeta?.cidadeId === userData?.cidadeId) return true;
    const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    return permitidasIds.includes(comumId);
  }, [isBasico, isClosed, isMaster, isComissao, level, userData, comumId, eventMeta]);

  const isInputDisabled = !temPermissaoEditar;

  const pesosMinisterio = {
    'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4,
    'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7,
    'Secretário da Música': 8, 'Instrutor': 9, 'Músico': 10
  };

  const ordenarLista = (lista, campoNome, campoRole) => {
    return [...lista].sort((a, b) => {
      const pesoA = pesosMinisterio[a[campoRole]] || 99;
      const pesoB = pesosMinisterio[b[campoRole]] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a[campoNome] || "").localeCompare(b[campoNome] || "");
    });
  };

  const debouncedSave = useCallback((newData) => {
    if (isInputDisabled) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      const nomeDaComum = eventMeta?.comumNome || userData?.comum || "LOCALIDADE";
      eventService.saveAtaData(comumId, eventId, {
        ...newData,
        comumNome: nomeDaComum
      });
    }, 1500);
  }, [comumId, eventId, eventMeta, userData, isInputDisabled]);

  const handleChange = (newData) => {
    if (isInputDisabled) return;
    setAtaData(newData);
    debouncedSave(newData);
  };

  const saveStatus = async (newStatus) => {
    if (isBasico) return;
    const updated = { ...ataData, status: newStatus, comumNome: eventMeta?.comumNome || userData?.comum || "LOCALIDADE" };
    setAtaData(updated);
    try {
      await eventService.saveAtaData(comumId, eventId, updated);
      toast.success(newStatus === 'open' ? "Ensaio Reaberto" : "Ensaio Lacrado ✅");
    } catch (e) { toast.error("Falha ao processar status."); }
  };

  useEffect(() => {
    if (!comumId || !eventId) return;
    let isMounted = true;
    
    if (!isBasico) {
      onSnapshot(collection(db, 'config_instrumentos_nacional'), (s) => {
        if (!isMounted) return;
        setInstrumentsNacionais(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      onSnapshot(collection(db, 'referencia_cargos'), (s) => {
        if (!isMounted) return;
        const lista = s.docs.map(d => d.data().nome).sort((a, b) => (pesosMinisterio[a] || 99) - (pesosMinisterio[b] || 99));
        setReferenciaMinisterio(lista);
      });

      onSnapshot(collection(db, 'comuns', comumId, 'ministerio_lista'), (s) => {
        if (!isMounted) return;
        const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
        setLocalMinisterio(ordenarLista(lista, 'name', 'role'));
      });
    }

    const unsubEvent = onSnapshot(doc(db, 'events_global', eventId), 
      (s) => {
        if (s.exists() && isMounted) {
          const eventData = s.data();
          setEventMeta(eventData);
          if (eventData.ata) {
            const loadedAta = { ...eventData.ata };
            if (!loadedAta.partes || loadedAta.partes.length === 0) {
              loadedAta.partes = [
                { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
                { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
              ];
            }
            if (!loadedAta.palavra) {
              loadedAta.palavra = { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' };
            }
            // Garantia de campo v8.7
            if (loadedAta.hinoAbertura === undefined) loadedAta.hinoAbertura = '';
            
            setAtaData(loadedAta);
          }
          setLoading(false);
        }
      },
      (err) => console.warn("Listener de Ata restrito.")
    );

    return () => { isMounted = false; unsubEvent(); if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [eventId, comumId, isBasico]);

  const handleHinoChange = (pIdx, hIdx, val) => {
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
    
    // Tratamento para campo especial 'Abertura' (pIdx null)
    if (pIdx === null) {
      if (v === '') return handleChange({ ...ataData, hinoAbertura: '' });
      if (v.startsWith('C')) {
        if (/^C[1-6]?$/.test(v)) return handleChange({ ...ataData, hinoAbertura: v });
        return;
      }
      if (/^\d+$/.test(v)) {
        if (parseInt(v) > 480) return;
        return handleChange({ ...ataData, hinoAbertura: v });
      }
      return;
    }

    // Lógica padrão para hinos das partes
    const np = [...ataData.partes];
    if (v === '') { 
      np[pIdx].hinos[hIdx] = ''; 
      return handleChange({ ...ataData, partes: np }); 
    }
    if (v.startsWith('C')) {
      if (/^C[1-6]?$/.test(v)) {
        np[pIdx].hinos[hIdx] = v;
        return handleChange({ ...ataData, partes: np });
      }
      return;
    }
    if (/^\d+$/.test(v)) {
      if (parseInt(v) > 480) return;
      np[pIdx].hinos[hIdx] = v;
      return handleChange({ ...ataData, partes: np });
    }
  };

  const handleOpenVisitaModal = (v = null, idx = null) => {
    if (isInputDisabled) return; 
    if (v) { setNewVisita(v); setEditIndex(idx); } 
    else { setNewVisita({ nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' }); setEditIndex(null); }
    setShowVisitaModal(true);
  };

  const handleSaveVisita = () => {
    if (isInputDisabled) return;
    if (!newVisita.nome) return toast.error("Informe o nome");
    let updated = [...(ataData.visitantes || [])];
    if (editIndex !== null) updated[editIndex] = newVisita;
    else updated.push({ ...newVisita, id: Date.now() });
    handleChange({ ...ataData, visitantes: ordenarLista(updated, 'nome', 'min') });
    setShowVisitaModal(false);
  };

  const togglePresencaLocal = (m) => {
    if (isInputDisabled) return;
    const list = (ataData.presencaLocal || []).includes(m.name) ? ataData.presencaLocal.filter(n => n !== m.name) : [...(ataData.presencaLocal || []), m.name];
    const full = (ataData.presencaLocalFull || []).find(x => x.nome === m.name) ? ataData.presencaLocalFull.filter(x => x.nome !== m.name) : [...(ataData.presencaLocalFull || []), { nome: m.name, role: m.role }];
    handleChange({ ...ataData, presencaLocal: list, presencaLocalFull: full });
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] uppercase italic tracking-[0.3em]">Sincronizando Ata...</div>;

  return (
    <div className="space-y-3 pb-40 px-2 font-sans text-left bg-gray-50 pt-3 animate-premium">
      
      <div className="mx-2 mb-4 flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden text-left">
        <div className={`absolute left-0 top-0 h-full w-1 ${temPermissaoEditar ? 'bg-blue-600' : 'bg-slate-300'}`} />
        <div className="flex items-center gap-3">
          <div className={`${temPermissaoEditar ? 'text-blue-600' : 'text-slate-400'}`}>
            {isClosed ? <Lock size={14} /> : temPermissaoEditar ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          </div>
          <div className="leading-none text-left">
            <p className="text-[9px] font-black text-slate-950 uppercase italic tracking-tighter">
              {isClosed ? 'Ata Lacrada' : isBasico ? 'Modo de Leitura' : temPermissaoEditar ? 'Modo de Edição' : 'Visualização'}
            </p>
            <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{eventMeta?.comumNome || '---'}</p>
          </div>
        </div>
      </div>

      {isRegionalScope && isGemLocal && (
        <Accordion title="Equipe de Contagem" isOpen={openSection === 'guests'} onClick={() => setOpenSection(openSection === 'guests' ? null : 'guests')} icon="👥">
          <GuestManager 
            eventId={eventId} 
            invitedUsers={eventMeta?.invitedUsers || []} 
            userData={userData} 
            isClosed={isClosed || isBasico} 
          />
        </Accordion>
      )}

      <Accordion title="Liturgia do Ensaio" isOpen={openSection === 'liturgia'} onClick={() => setOpenSection(openSection === 'liturgia' ? null : 'liturgia')} icon="🎼">
        <div className="space-y-6">
          <AtaLiturgia ataData={ataData} handleChange={handleChange} isInputDisabled={isInputDisabled} referenciaMinisterio={referenciaMinisterio} handleHinoChange={handleHinoChange} hidePartes={true} />
          {isRegionalScope && (
            <div className="pt-4 border-t border-slate-100">
              <div className="px-2 mb-4">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none mb-1">Liturgia Regional</p>
                <h4 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter">Palavra Pregada</h4>
              </div>
              <AtaPalavra ataData={ataData} handleChange={handleChange} isInputDisabled={isInputDisabled} />
            </div>
          )}
          <AtaLiturgia ataData={ataData} handleChange={handleChange} isInputDisabled={isInputDisabled} referenciaMinisterio={referenciaMinisterio} handleHinoChange={handleHinoChange} onlyPartes={true} />
        </div>
      </Accordion>

      <Accordion title="Ocorrências" isOpen={openSection === 'ocorrencias'} onClick={() => setOpenSection(openSection === 'ocorrencias' ? null : 'ocorrencias')} icon="📝" badge={ataData.ocorrencias?.length || null}>
        <AtaOcorrencias 
          ocorrencias={ataData.ocorrencias} 
          instruments={instrumentsNacionais} 
          onSave={(novaLista) => handleChange({ ...ataData, ocorrencias: novaLista })} 
          isClosed={isClosed || isBasico} 
          isRegional={isRegionalScope} 
          canEdit={temPermissaoEditar} 
        />
      </Accordion>

      <Accordion title="Visitantes" isOpen={openSection === 'visitantes'} onClick={() => setOpenSection(openSection === 'visitantes' ? null : 'visitantes')} icon="🌍" badge={ataData.visitantes?.length || null}>
        <AtaVisitantes visitantes={ataData.visitantes} isInputDisabled={isInputDisabled} isClosed={isClosed || isBasico} handleOpenVisitaModal={handleOpenVisitaModal} setVisitaToDelete={setVisitaToDelete} />
      </Accordion>

      <Accordion title={isRegionalScope ? "Ministério Regional" : "Ministério Local"} isOpen={openSection === 'ministerio'} onClick={() => setOpenSection(openSection === 'ministerio' ? null : 'ministerio')} icon="🏛️" badge={isRegionalScope ? (ataData.presencaLocalFull?.length || null) : (ataData.presencaLocal?.length || null)}>
        {isRegionalScope ? (
          <MinistryAccordion eventId={eventId} regionalId={eventMeta?.regionalId} presencaAtual={ataData.presencaLocalFull || []} onChange={(novaLista) => handleChange({ ...ataData, presencaLocalFull: novaLista })} isInputDisabled={isInputDisabled} userData={userData} />
        ) : (
          <AtaMinisterioLocal localMinisterio={localMinisterio} presencaLocal={ataData.presencaLocal} isInputDisabled={isInputDisabled} togglePresencaLocal={togglePresencaLocal} />
        )}
      </Accordion>

      {!isBasico && (
        <div className="max-w-[200px] mx-auto opacity-80 hover:opacity-100 transition-opacity">
          <AtaLacreStatus isClosed={isClosed} isGemLocal={isGemLocal} isComissao={isComissao} loading={loading} showConfirmLock={showConfirmLock} setShowConfirmLock={setShowConfirmLock} showConfirmReopen={showConfirmReopen} setShowConfirmReopen={setShowConfirmReopen} saveStatus={saveStatus} />
        </div>
      )}

      {/* MODAL DE VISITA REESTRUTURADO (Anexo 2) */}
      <AnimatePresence>
        {showVisitaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left relative">
              <button onClick={() => setShowVisitaModal(false)} className="absolute top-8 right-8 text-slate-300 active:scale-95 transition-all"><X size={24}/></button>
              <h3 className="text-2xl font-[900] text-slate-950 uppercase italic tracking-tighter mb-8 leading-none">Dados da Visita</h3>
              
              <div className="space-y-4">
                <Field label="Nome Completo" val={newVisita.nome} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, nome: v})} />
                
                <div className="grid grid-cols-1 gap-4">
                  <Select label="Ministério / Cargo" val={newVisita.min} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, min: v})} />
                  <Field label="Instrumento" val={newVisita.inst} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, inst: v})} icon={<Music size={10}/>} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bairro" val={newVisita.bairro} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, bairro: v})} icon={<MapPin size={10}/>} />
                  <Field label="Cidade/UF" val={newVisita.cidadeUf} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} />
                </div>

                <Field label="Celular / Contato" val={newVisita.contato} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, contato: v})} icon={<Phone size={10}/>} />

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Data Ensaio" val={newVisita.dataEnsaio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, dataEnsaio: v})} icon={<Calendar size={10}/>} placeholder="00/00/00" />
                    <Field label="Horário" val={newVisita.hora} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, hora: v})} icon={<Clock size={10}/>} placeholder="00:00" />
                </div>

                {!isInputDisabled && (
                  <button onClick={handleSaveVisita} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 active:scale-95 transition-all">
                    Salvar Registro
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaPage;