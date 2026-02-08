import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db, doc, onSnapshot, collection, query, where, orderBy } from '../../config/firebase';
import { eventService } from '../../services/eventService'; 
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, ShieldCheck, Info, X, User, Music, MapPin, Phone, Calendar, Clock, Trash2
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
    oracaoAberturaNome: '', oracaoAberturaMin: '',
    ultimaOracaoNome: '', ultimaOracaoMin: '',
    partes: [
      { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
      { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
    ],
    presencaLocal: [],
    presencaLocalFull: [],
    visitantes: [],
    ocorrencias: [] // Inicialização do campo de ocorrências
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

  const [newVisita, setNewVisita] = useState({ 
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  const isClosed = ataData?.status === 'closed';
  
  const temPermissaoEditar = useMemo(() => {
    if (isBasico || isClosed) return false;
    if (isMaster || isComissao) return true;
    const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    return permitidasIds.includes(comumId);
  }, [isBasico, isClosed, isMaster, isComissao, userData, comumId]);

  const isInputDisabled = !temPermissaoEditar;

  // PESOS ATUALIZADOS v4.8 - Harmonia com PDF
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
    setAtaData(newData);
    debouncedSave(newData);
  };

  const saveStatus = async (newStatus) => {
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

    onSnapshot(doc(db, 'events_global', eventId), (s) => {
      if (!isMounted) return;
      if (s.exists()) {
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
          setAtaData(loadedAta);
        }
        setLoading(false);
      }
    });

    return () => { isMounted = false; if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [eventId, comumId]);

  const handleHinoChange = (pIdx, hIdx, val) => {
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
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
    if (isInputDisabled && !isClosed) return; 
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
            {isClosed ? <Lock size={14} /> : temPermissaoEditar ? <ShieldCheck size={14} /> : <Info size={14} />}
          </div>
          <div className="leading-none text-left">
            <p className="text-[9px] font-black text-slate-950 uppercase italic tracking-tighter">
              {isClosed ? 'Ata Lacrada' : temPermissaoEditar ? 'Modo de Edição' : 'Visualização'}
            </p>
            <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{eventMeta?.comumNome || '---'}</p>
          </div>
        </div>
      </div>

      <Accordion title="Liturgia do Ensaio" isOpen={openSection === 'liturgia'} onClick={() => setOpenSection(openSection === 'liturgia' ? null : 'liturgia')} icon="🎼">
        <AtaLiturgia 
          ataData={ataData} 
          handleChange={handleChange} 
          isInputDisabled={isInputDisabled} 
          referenciaMinisterio={referenciaMinisterio} 
          handleHinoChange={handleHinoChange} 
        />
      </Accordion>

      {/* NOVO MÓDULO DE OCORRÊNCIAS */}
      <Accordion title="Ocorrências" isOpen={openSection === 'ocorrencias'} onClick={() => setOpenSection(openSection === 'ocorrencias' ? null : 'ocorrencias')} icon="📝" badge={ataData.ocorrencias?.length || null}>
        <AtaOcorrencias 
          ocorrencias={ataData.ocorrencias} 
          instruments={instrumentsNacionais}
          onSave={(novaLista) => handleChange({ ...ataData, ocorrencias: novaLista })}
          isClosed={isClosed}
        />
      </Accordion>

      <Accordion title="Visitantes" isOpen={openSection === 'visitantes'} onClick={() => setOpenSection(openSection === 'visitantes' ? null : 'visitantes')} icon="🌍" badge={ataData.visitantes?.length || null}>
        <AtaVisitantes 
          visitantes={ataData.visitantes} 
          isInputDisabled={isInputDisabled} 
          isClosed={isClosed} 
          handleOpenVisitaModal={handleOpenVisitaModal} 
          setVisitaToDelete={setVisitaToDelete} 
        />
      </Accordion>

      <Accordion title="Ministério Local" isOpen={openSection === 'ministerio'} onClick={() => setOpenSection(openSection === 'ministerio' ? null : 'ministerio')} icon="🏛️" badge={ataData.presencaLocal?.length || null}>
        <AtaMinisterioLocal 
          localMinisterio={localMinisterio} 
          presencaLocal={ataData.presencaLocal} 
          isInputDisabled={isInputDisabled} 
          togglePresencaLocal={togglePresencaLocal} 
        />
      </Accordion>

      <div className="max-w-[200px] mx-auto opacity-80 hover:opacity-100 transition-opacity">
        <AtaLacreStatus 
          isClosed={isClosed} 
          isGemLocal={isGemLocal} 
          isComissao={isComissao} 
          loading={loading} 
          showConfirmLock={showConfirmLock} 
          setShowConfirmLock={setShowConfirmLock} 
          showConfirmReopen={showConfirmReopen} 
          setShowConfirmReopen={setShowConfirmReopen} 
          saveStatus={saveStatus} 
        />
      </div>

      <AnimatePresence>
        {showVisitaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left relative">
              <button onClick={() => setShowVisitaModal(false)} className="absolute top-8 right-8 text-slate-300 active:text-slate-950"><X size={24}/></button>
              <h3 className="text-2xl font-[900] text-slate-950 uppercase italic tracking-tighter mb-8 leading-none">Dados da Visita</h3>
              <div className="space-y-5">
                <Field label="Nome Completo" val={newVisita.nome} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, nome: v})} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label="Ministério / Cargo" val={newVisita.min} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, min: v})} />
                  <Field label="Instrumento" val={newVisita.inst} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, inst: v})} icon={<Music size={10}/>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Bairro" val={newVisita.bairro} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, bairro: v})} icon={<MapPin size={10}/>} />
                  <Field label="Cidade / UF" val={newVisita.cidadeUf} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} icon={<MapPin size={10}/>} />
                </div>
                <Field label="Contato (Telefone/Cel)" val={newVisita.contato} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, contato: v})} icon={<Phone size={10}/>} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Escala (Ex: 3º Sábado)" val={newVisita.dataEnsaio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, dataEnsaio: v})} icon={<Calendar size={10}/>} />
                  <Field label="Horário Ensaio" val={newVisita.hora} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, hora: v})} icon={<Clock size={10}/>} />
                </div>
                {!isInputDisabled && <button onClick={handleSaveVisita} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 active:scale-95 transition-all">Salvar Registro</button>}
              </div>
            </motion.div>
          </div>
        )}

        {visitaToDelete && (
          <Modal title="Excluir Visita?" icon={<Trash2 size={40}/>} confirmLabel="Sim, Excluir" onConfirm={() => { const nv = ataData.visitantes.filter(x => x.id !== visitaToDelete); handleChange({...ataData, visitantes: nv}); setVisitaToDelete(null); }} onCancel={() => setVisitaToDelete(null)} danger>
            O visitante será removido permanentemente deste relatório.
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaPage;