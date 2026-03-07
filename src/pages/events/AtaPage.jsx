import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Explicação: Importa as ferramentas básicas do React para criar a página.
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, query, where, orderBy, getDocs } from '../../config/firebase'; // Explicação: Conecta com o banco de dados Firebase para buscar os dados.
import { eventService } from '../../services/eventService'; // Explicação: Importa o serviço que envia as atualizações para o banco de dados.
import toast from 'react-hot-toast'; // Explicação: Importa as notificações de aviso que aparecem no topo da tela.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa as ferramentas de animação para deixar a tela suave.
import { 
  Lock, ShieldCheck, Info, X, User, Music, MapPin, Phone, Calendar, Clock, Trash2, Users, ShieldAlert, RotateCcw
} from 'lucide-react'; // Explicação: Importa os desenhos dos ícones usados nos botões e avisos.

// Importação do Cérebro de Autenticação v2.1
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa os dados de quem está logado no momento.

// Importação dos Componentes Atômicos Refatorados
import { Accordion, Field, Modal, Select } from './components/AtaUIComponents.jsx'; // Explicação: Importa peças visuais como campos de texto e listas.
import AtaLiturgia from './components/AtaLiturgia.jsx'; // Explicação: Importa o módulo que cuida dos hinos e orações.
import AtaVisitantes from './components/AtaVisitantes.jsx'; // Explicação: Importa o módulo que gerencia as visitas.
import AtaMinisterioLocal from './components/AtaMinisterioLocal.jsx'; // Explicação: Importa a lista de músicos da própria igreja.
import AtaLacreStatus from './components/AtaLacreStatus.jsx'; // Explicação: Importa o botão de trancar (lacrar) a ata.
import AtaOcorrencias from './components/AtaOcorrencias.jsx'; // Explicação: Importa a parte de anotações e avisos especiais.
import AtaPalavra from './components/AtaPalavra.jsx'; // Explicação: Importa a parte de registro da pregação.
import GuestManager from './components/GuestManager.jsx'; // Explicação: Importa o sistema que gerencia os convidados externos.
import MinistryAccordion from './components/MinistryAccordion.jsx'; // Explicação: Importa a lista ministerial para eventos regionais.

const AtaPage = ({ eventId, comumId }) => { // Explicação: Inicia a construção da página usando os IDs do ensaio e da igreja.
  const { userData, user } = useAuth(); // Explicação: Puxa os dados do perfil e a identidade única do usuário.
  
  // Explicação: Usamos a função "can" para decidir os poderes na tela de forma limpa.
  const canEditAnything = useMemo(() => userData?.can('reopen_ata'), [userData]); // Explicação: Gestores de Cidade/Comissão/Master.
  const isGemLocal = userData?.isGemLocal; // Explicação: Identifica se é zeladoria local.
  const isBasico = userData?.isBasico; // Explicação: Identifica se é músico básico.

  const [ataData, setAtaData] = useState({ // Explicação: Caixa que guarda as informações da Ata.
    status: 'open', 
    atendimentoNome: '', atendimentoMin: '', 
    hinoAbertura: '', 
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
  
  const [eventMeta, setEventMeta] = useState(null); // Explicação: Dados técnicos do ensaio vindos do banco.
  const [localMinisterio, setLocalMinisterio] = useState([]); // Explicação: Músicos da casa.
  const [referenciaMinisterio, setReferenciaMinisterio] = useState([]); // Explicação: Cargos oficiais para seleção.
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Explicação: Lista de instrumentos da CCB.
  const [loading, setLoading] = useState(true); // Explicação: Controla a tela de carregamento.
  
  const [showConfirmLock, setShowConfirmLock] = useState(false); // Explicação: Modal de confirmação de fechamento.
  const [showConfirmReopen, setShowConfirmReopen] = useState(false); // Explicação: Modal de confirmação de reabertura.
  const [visitaToDelete, setVisitaToDelete] = useState(null); // Explicação: Guarda qual visita será excluída.
  const [showVisitaModal, setShowVisitaModal] = useState(false); // Explicação: Controla a janela de cadastro de visitas.
  
  const [openSection, setOpenSection] = useState(null); // Explicação: Controla qual sanfona está aberta.
  const [editIndex, setEditIndex] = useState(null); // Explicação: Controla se estamos editando uma visita existente.
  const saveTimeoutRef = useRef(null); // Explicação: Timer para salvar no banco sem travar a digitação.

  const [newVisita, setNewVisita] = useState({ // Explicação: Modelo de dados para um novo visitante.
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  const [autoFillOracao, setAutoFillOracao] = useState(false); // Explicação: Atalho para copiar Atendimento para Oração.
  const [autoFillPalavra, setAutoFillPalavra] = useState(false); // Explicação: Atalho para copiar Atendimento para Palavra.

  const isClosed = ataData?.status === 'closed'; // Explicação: Checa se a ata está trancada.
  const isRegionalScope = eventMeta?.scope === 'regional'; // Explicação: Checa se é um ensaio regional.
  
  // v4.3: REGRA DE OURO ATUALIZADA - Liberação automática para usuários da própria comum em eventos locais
  const temPermissaoEditar = useMemo(() => { // Explicação: Cérebro que decide quem pode digitar na Ata.
    if (isBasico) return false; // Explicação: Nível básico nunca edita ata.
    if (isClosed) return false; // Explicação: Se estiver lacrada, ninguém edita.
    
    // Se o evento for LOCAL, quem é da própria igreja (comumId) pode editar sem precisar de convite.
    if (!isRegionalScope && userData?.comumId === comumId) return true;

    // Para eventos REGIONAIS, continua valendo a regra de convite ou hierarquia superior.
    const isInvited = (eventMeta?.invitedUsers || []).includes(user?.uid); 
    if (isInvited && canEditAnything) return true; 

    if (isRegionalScope && !canEditAnything) return false; 
    if (userData?.isMaster || userData?.isComissao) return true; 
    if (userData?.isRegionalCidade && eventMeta?.cidadeId === userData?.cidadeId) return true; 
    
    const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])]; 
    return permitidasIds.includes(comumId); 
  }, [isBasico, isClosed, userData, comumId, eventMeta, isRegionalScope, canEditAnything, user?.uid]);

  const isInputDisabled = !temPermissaoEditar; // Explicação: Trava os campos se o usuário não tiver permissão.

  const pesosMinisterio = { // Explicação: Ordem de cargos da CCB.
    'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4,
    'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7,
    'Secretário da Música': 8, 'Instrutor': 9, 'Músico': 10
  };

  const ordenarLista = (lista, campoNome, campoRole) => { // Explicação: Organiza listas por cargo.
    return [...lista].sort((a, b) => {
      const pesoA = pesosMinisterio[a[campoRole]] || 99;
      const pesoB = pesosMinisterio[b[campoRole]] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a[campoNome] || "").localeCompare(b[campoNome] || "");
    });
  };

  const badgeMinisterioLocal = useMemo(() => { // Explicação: Conta músicos da casa presentes.
    if (!ataData.presencaLocal || !localMinisterio.length) return null;
    const reais = ataData.presencaLocal.filter(nome => 
      localMinisterio.some(m => m.name === nome)
    );
    return reais.length || null;
  }, [ataData.presencaLocal, localMinisterio]);

  const badgeMinisterioRegional = useMemo(() => { // Explicação: Conta músicos regionais presentes.
    if (!ataData.presencaLocalFull) return null;
    const válidos = ataData.presencaLocalFull.filter(p => p.nome && p.role);
    return válidos.length || null;
  }, [ataData.presencaLocalFull]);

  const debouncedSave = useCallback((newData) => { // Explicação: Salva no banco com pequeno atraso para não pesar.
    if (isInputDisabled) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      const nomeDaComum = eventMeta?.comumNome || userData?.comum || "LOCALIDADE";
      eventService.saveAtaData(comumId, eventId, {
        ...newData,
        comumNome: nomeDaComum,
        cidadeId: eventMeta?.cidadeId || userData?.cidadeId 
      });
    }, 1500);
  }, [comumId, eventId, eventMeta, userData, isInputDisabled]);

  const handleChange = (newData) => { // Explicação: Gerencia mudanças nos textos da ata.
    if (isInputDisabled) return;
    let finalData = { ...newData };
    if (autoFillOracao) { 
      finalData.oracaoAberturaNome = newData.atendimentoNome; 
      finalData.oracaoAberturaMin = newData.atendimentoMin; 
    }
    if (autoFillPalavra && isRegionalScope) { 
      finalData.palavra = { ...newData.palavra, anciao: newData.atendimentoNome };
    }
    setAtaData(finalData);
    debouncedSave(finalData);
  };

  const handleReopen = async () => { // Explicação: Reabre a ata fechada.
    try {
      await eventService.reopenAta(eventId);
      toast.success("Ata Reaberta com Sucesso!");
      setShowConfirmReopen(false);
    } catch (e) {
      toast.error("Erro ao reabrir ata.");
    }
  };

  const saveStatus = async (newStatus) => { // Explicação: Lacra o ensaio.
    if (isBasico) return;
    const updated = { 
      ...ataData, 
      status: newStatus, 
      comumNome: eventMeta?.comumNome || userData?.comum || "LOCALIDADE",
      cidadeId: eventMeta?.cidadeId || userData?.cidadeId 
    };
    setAtaData(updated);
    try {
      await eventService.saveAtaData(comumId, eventId, updated);
      toast.success(newStatus === 'open' ? "Ensaio Reaberto" : "Ensaio Lacrado ✅");
    } catch (e) { toast.error("Falha ao processar status."); }
  };

  useEffect(() => { // Explicação: Busca informações do banco em tempo real.
    if (!comumId || !eventId) return;
    let isMounted = true;
    
    const unsubReferencia = onSnapshot(collection(db, 'referencia_cargos'), (s) => {
      if (!isMounted) return;
      const lista = s.docs.map(d => d.data().nome).sort((a, b) => (pesosMinisterio[a] || 99) - (pesosMinisterio[b] || 99));
      setReferenciaMinisterio(lista);
    });

    const unsubMin = onSnapshot(collection(db, 'comuns', comumId, 'ministerio_lista'), (s) => {
      if (!isMounted) return;
      const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
      setLocalMinisterio(ordenarLista(lista, 'name', 'role'));
    });

    if (!isBasico) {
      onSnapshot(collection(db, 'config_instrumentos_nacional'), (s) => {
        if (!isMounted) return;
        setInstrumentsNacionais(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    const unsubEvent = onSnapshot(doc(db, 'events_global', eventId), (s) => {
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
          if (!loadedAta.palavra) loadedAta.palavra = { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' };
          if (loadedAta.hinoAbertura === undefined) loadedAta.hinoAbertura = '';
          setAtaData(loadedAta);
        }
        setLoading(false);
      }
    });

    return () => { isMounted = false; unsubReferencia(); unsubMin(); unsubEvent(); if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [eventId, comumId, isBasico]);

  const handleHinoChange = (pIdx, hIdx, val) => { // Explicação: Valida entrada de hinos.
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
    if (pIdx === null) {
      if (v === '') return handleChange({ ...ataData, hinoAbertura: '' });
      if (v.startsWith('C') && /^C[1-6]?$/.test(v)) return handleChange({ ...ataData, hinoAbertura: v });
      if (/^\d+$/.test(v) && parseInt(v) <= 480) return handleChange({ ...ataData, hinoAbertura: v });
      return;
    }
    const np = [...ataData.partes];
    if (v === '') { np[pIdx].hinos[hIdx] = ''; return handleChange({ ...ataData, partes: np }); }
    if (v.startsWith('C') && /^C[1-6]?$/.test(v)) { np[pIdx].hinos[hIdx] = v; return handleChange({ ...ataData, partes: np }); }
    if (/^\d+$/.test(v) && parseInt(v) <= 480) { np[pIdx].hinos[hIdx] = v; return handleChange({ ...ataData, partes: np }); }
  };

  const handleOpenVisitaModal = (v = null, idx = null) => { // Explicação: Abre janela de visita.
    if (isInputDisabled) return; 
    if (v) { setNewVisita(v); setEditIndex(idx); } 
    else { setNewVisita({ nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' }); setEditIndex(null); }
    setShowVisitaModal(true);
  };

  const handleSaveVisita = () => { // Explicação: Salva o visitante.
    if (isInputDisabled) return;
    if (!newVisita.nome) return toast.error("Informe o nome");
    let updated = [...(ataData.visitantes || [])];
    if (editIndex !== null) updated[editIndex] = newVisita;
    else updated.push({ ...newVisita, id: Date.now() });
    handleChange({ ...ataData, visitantes: ordenarLista(updated, 'nome', 'min') });
    setShowVisitaModal(false);
  };

  const handleConfirmDeleteVisita = () => { // Explicação: Remove o visitante.
    if (!visitaToDelete || isInputDisabled) return; 
    const updated = (ataData.visitantes || []).filter((v, idx) => (v.id || idx) !== visitaToDelete); 
    handleChange({ ...ataData, visitantes: updated }); 
    setVisitaToDelete(null); 
    toast.success("Visitante removido"); 
  };

  const togglePresencaLocal = (m) => { // Explicação: Marca presença do músico local.
    if (isInputDisabled) return;
    const list = (ataData.presencaLocal || []).includes(m.name) ? ataData.presencaLocal.filter(n => n !== m.name) : [...(ataData.presencaLocal || []), m.name];
    const full = (ataData.presencaLocalFull || []).find(x => x.nome === m.name) ? ataData.presencaLocalFull.filter(x => x.nome !== m.name) : [...(ataData.presencaLocalFull || []), { nome: m.name, role: m.role }];
    handleChange({ ...ataData, presencaLocal: list, presencaLocalFull: full });
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] uppercase italic tracking-[0.3em]">Sincronizando Ata...</div>;

  return ( // Explicação: Desenha a página na tela.
    <div className="space-y-3 pb-40 px-2 font-sans text-left bg-gray-50 pt-3 animate-premium">
      
      {/* CABEÇALHO DE STATUS */}
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

        {isClosed && canEditAnything && (
          <button onClick={() => setShowConfirmReopen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full active:scale-95 transition-all">
            <RotateCcw size={12} />
            <span className="text-[8px] font-black uppercase italic tracking-tighter">Reabrir Ata</span>
          </button>
        )}
      </div>

      {/* v4.3: TRAVA DE HIERARQUIA - EQUIPE DE CONTAGEM (Apenas em Regionais) */}
      {/* Explicação: Agora o card de convidados sumiu dos eventos Locais, como solicitado. */}
      {isRegionalScope && canEditAnything && (
        <Accordion title="Equipe de Contagem" isOpen={openSection === 'guests'} onClick={() => setOpenSection(openSection === 'guests' ? null : 'guests')} icon="👥">
          <GuestManager eventId={eventId} invitedUsers={eventMeta?.invitedUsers || []} userData={userData} isClosed={isClosed || isBasico} />
        </Accordion>
      )}

      {/* LITURGIA */}
      <Accordion title="Liturgia do Ensaio" isOpen={openSection === 'liturgia'} onClick={() => setOpenSection(openSection === 'liturgia' ? null : 'liturgia')} icon="🎼">
        <div className="space-y-6">
          <AtaLiturgia ataData={ataData} handleChange={handleChange} isInputDisabled={isInputDisabled} referenciaMinisterio={referenciaMinisterio} handleHinoChange={handleHinoChange} hidePartes={true} isRegional={isRegionalScope} autoFill={autoFillOracao} setAutoFill={setAutoFillOracao} />
          {isRegionalScope && (
            <div className="pt-4 border-t border-slate-100">
              <div className="px-2 mb-4">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none mb-1">Liturgia Regional</p>
                <h4 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter">Palavra Pregada</h4>
              </div>
              <AtaPalavra ataData={ataData} handleChange={handleChange} isInputDisabled={isInputDisabled} autoFill={autoFillPalavra} setAutoFill={setAutoFillPalavra} />
            </div>
          )}
          <AtaLiturgia ataData={ataData} handleChange={handleChange} isInputDisabled={isInputDisabled} referenciaMinisterio={referenciaMinisterio} handleHinoChange={handleHinoChange} onlyPartes={true} isRegional={isRegionalScope} />
        </div>
      </Accordion>

      {/* OCORRÊNCIAS */}
      <Accordion title="Ocorrências" isOpen={openSection === 'ocorrencias'} onClick={() => setOpenSection(openSection === 'ocorrencias' ? null : 'ocorrencias')} icon="📝" badge={ataData.ocorrencias?.length || null}>
        <AtaOcorrencias ocorrencias={ataData.ocorrencias} instruments={instrumentsNacionais} onSave={(novaLista) => handleChange({ ...ataData, ocorrencias: novaLista })} isClosed={isClosed || isBasico} isRegional={isRegionalScope} canEdit={temPermissaoEditar} />
      </Accordion>

      {/* VISITANTES */}
      <Accordion title="Visitantes" isOpen={openSection === 'visitantes'} onClick={() => setOpenSection(openSection === 'visitantes' ? null : 'visitantes')} icon="🌍" badge={ataData.visitantes?.length || null}>
        <AtaVisitantes visitantes={ataData.visitantes} isInputDisabled={isInputDisabled} isClosed={isClosed || isBasico} handleOpenVisitaModal={handleOpenVisitaModal} setVisitaToDelete={setVisitaToDelete} />
      </Accordion>

      {/* MINISTÉRIO */}
      <Accordion title={isRegionalScope ? "Ministério Regional" : "Ministério Local"} isOpen={openSection === 'ministerio'} onClick={() => setOpenSection(openSection === 'ministerio' ? null : 'ministerio')} icon="🏛️" badge={isRegionalScope ? badgeMinisterioRegional : badgeMinisterioLocal}>
        {isRegionalScope ? (
          <MinistryAccordion eventId={eventId} regionalId={eventMeta?.regionalId || ""} cidadeId={eventMeta?.cidadeId || ""} comumId={comumId || ""} presencaAtual={ataData.presencaLocalFull || []} onChange={(novaLista) => handleChange({ ...ataData, presencaLocalFull: novaLista })} isInputDisabled={isInputDisabled} userData={userData} isReady={!!eventMeta} />
        ) : (
          <AtaMinisterioLocal localMinisterio={localMinisterio} presencaLocal={ataData.presencaLocal} isInputDisabled={isInputDisabled} togglePresencaLocal={togglePresencaLocal} />
        )}
      </Accordion>

      {/* BOTÃO DE FECHAMENTO */}
      {!isBasico && (
        <div className="max-w-[200px] mx-auto opacity-80 hover:opacity-100 transition-opacity">
          <AtaLacreStatus 
            isClosed={isClosed} 
            isGemLocal={isGemLocal} 
            isComissao={userData?.isComissao} 
            isRegionalScope={isRegionalScope}
            loading={loading} 
            showConfirmLock={showConfirmLock} 
            setShowConfirmLock={setShowConfirmLock} 
            showConfirmReopen={showConfirmReopen} 
            setShowConfirmReopen={setShowConfirmReopen} 
            saveStatus={saveStatus} 
          />
        </div>
      )}

      {/* Modais */}
      <AnimatePresence>
        {visitaToDelete && (
          <Modal title="Excluir Visitante" icon={<Trash2 size={32}/>} danger={true} confirmLabel="Confirmar Exclusão" onConfirm={handleConfirmDeleteVisita} onCancel={() => setVisitaToDelete(null)}>
            Tem certeza que deseja remover este visitante? 
          </Modal>
        )}
        {showConfirmReopen && (
          <Modal title="Reabrir Ensaio" icon={<RotateCcw size={32}/>} confirmLabel="Reabrir Agora" onConfirm={handleReopen} onCancel={() => setShowConfirmReopen(false)}>
            Deseja destravar este ensaio para novas edições? 
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVisitaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left relative">
              <button onClick={() => setShowVisitaModal(false)} className="absolute top-8 right-8 text-slate-300 active:scale-95 transition-all"><X size={24}/></button>
              <h3 className="text-2xl font-[900] text-slate-950 uppercase italic tracking-tighter mb-8 leading-none">Dados da Visita</h3>
              <div className="space-y-4">
                <Field label="Nome Completo *" val={newVisita.nome} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, nome: v})} />
                <Select label="Ministério / Cargo *" val={newVisita.min} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, min: v})} />
                <Field label="Instrumento" val={newVisita.inst} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, inst: v})} icon={<Music size={10}/>} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bairro" val={newVisita.bairro} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, bairro: v})} icon={<MapPin size={10}/>} />
                  <Field label="Cidade/UF" val={newVisita.cidadeUf} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} />
                </div>
                <Field label="Celular / Contato" val={newVisita.contato} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, contato: v})} icon={<Phone size={10}/>} />
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Data Ensaio" val={newVisita.dataEnsaio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, dataEnsaio: v})} icon={<Calendar size={10}/>} placeholder="3 Sábado" />
                    <Field label="Horário" val={newVisita.hora} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, hora: v})} icon={<Clock size={10}/>} placeholder="00:00" />
                </div>
                {!isInputDisabled && (
                  <button onClick={handleSaveVisita} disabled={!newVisita.nome || !newVisita.min} className={`w-full py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 active:scale-95 transition-all ${(!newVisita.nome || !newVisita.min) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-100'}`}>
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

export default AtaPage; // Explicação: Exporta a página configurada para o sistema.