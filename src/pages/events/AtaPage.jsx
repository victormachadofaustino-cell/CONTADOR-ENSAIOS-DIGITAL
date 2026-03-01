import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Importa as ferramentas básicas do React
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, query, where, orderBy, getDocs } from '../../config/firebase'; // Conecta com o banco de dados Firebase
import { eventService } from '../../services/eventService'; // Importa o serviço que salva os dados do evento
import toast from 'react-hot-toast'; // Importa as notificações de aviso na tela
import { motion, AnimatePresence } from 'framer-motion'; // Importa as animações suaves da tela
import { 
  Lock, ShieldCheck, Info, X, User, Music, MapPin, Phone, Calendar, Clock, Trash2, Users, ShieldAlert
} from 'lucide-react'; // Importa os ícones visuais do sistema

// Importação do Cérebro de Autenticação v2.1
import { useAuth } from '../../context/AuthContext'; // Importa os dados do usuário logado

// Importação dos Componentes Atômicos Refatorados
import { Accordion, Field, Modal, Select } from './components/AtaUIComponents.jsx'; // Importa componentes de formulário
import AtaLiturgia from './components/AtaLiturgia.jsx'; // Importa o módulo de hinos e orações
import AtaVisitantes from './components/AtaVisitantes.jsx'; // Importa o módulo de visitantes
import AtaMinisterioLocal from './components/AtaMinisterioLocal.jsx'; // Importa a lista de músicos locais
import AtaLacreStatus from './components/AtaLacreStatus.jsx'; // Importa o botão de fechar ata
// Importação do Novo Módulo de Ocorrências
import AtaOcorrencias from './components/AtaOcorrencias.jsx'; // Importa o módulo de anotações
// Importação do Módulo de Palavra Pregada (v1.0 Regional)
import AtaPalavra from './components/AtaPalavra.jsx'; // Importa o módulo da pregação
// Importação dos Módulos de Gestão Regional v4.0
import GuestManager from './components/GuestManager.jsx'; // Importa o gestor de convidados
import MinistryAccordion from './components/MinistryAccordion.jsx'; // Importa a lista ministerial regional

const AtaPage = ({ eventId, comumId }) => { // Inicia a página da Ata recebendo os IDs necessários
  const { userData } = useAuth(); // Puxa as informações do usuário atual
  const level = userData?.accessLevel; // Identifica o nível de poder do usuário
  
  const isMaster = level === 'master'; // Verifica se é administrador total
  const isComissao = isMaster || level === 'comissao'; // Verifica se é da comissão
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Verifica se é gestor regional
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Verifica se é colaborador local
  const isBasico = level === 'basico'; // Verifica se é usuário comum

  const [ataData, setAtaData] = useState({ // Define a estrutura de dados da Ata
    status: 'open', // Status inicial como aberto
    atendimentoNome: '', atendimentoMin: '', // Campos de quem atende o ensaio
    hinoAbertura: '', // Campo para o hino inicial
    oracaoAberturaNome: '', oracaoAberturaMin: '', // Campos de quem faz a primeira oração
    ultimaOracaoNome: '', ultimaOracaoMin: '', // Campos de quem faz a última oração
    partes: [ // Estrutura para hinos das partes
      { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
      { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
    ],
    palavra: { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' }, // Dados da pregação
    presencaLocal: [], // Lista de nomes presentes
    presencaLocalFull: [], // Lista completa com cargos
    visitantes: [], // Lista de visitantes
    ocorrencias: [] // Lista de problemas ou notas
  });
  
  const [eventMeta, setEventMeta] = useState(null); // Guarda informações gerais do evento
  const [localMinisterio, setLocalMinisterio] = useState([]); // Guarda os músicos da igreja
  const [referenciaMinisterio, setReferenciaMinisterio] = useState([]); // Guarda a lista oficial de cargos
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Guarda a lista de instrumentos
  const [loading, setLoading] = useState(true); // Controla o aviso de "carregando"
  
  const [showConfirmLock, setShowConfirmLock] = useState(false); // Controla modal de fechar ata
  const [showConfirmReopen, setShowConfirmReopen] = useState(false); // Controla modal de reabrir ata
  const [visitaToDelete, setVisitaToDelete] = useState(null); // Guarda qual visita será apagada
  const [showVisitaModal, setShowVisitaModal] = useState(false); // Controla janela de nova visita
  
  const [openSection, setOpenSection] = useState(null); // Controla qual sanfona está aberta
  const [editIndex, setEditIndex] = useState(null); // Controla qual item está sendo editado
  const saveTimeoutRef = useRef(null); // Timer para salvar automaticamente sem travar

  const [newVisita, setNewVisita] = useState({ // Estrutura para nova visita
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  // AJUSTE v9.2: Checkboxes independentes para Oração e Palavra (Atende diretriz de discrição)
  const [autoFillOracao, setAutoFillOracao] = useState(false); // Controla a automação apenas da Oração de Abertura
  const [autoFillPalavra, setAutoFillPalavra] = useState(false); // Controla a automação apenas do Ancião da Palavra

  const isClosed = ataData?.status === 'closed'; // Checa se a ata está lacrada
  const isRegionalScope = eventMeta?.scope === 'regional'; // Checa se o evento é regional
  
  const temPermissaoEditar = useMemo(() => { // Define se o usuário pode mexer na tela
    if (isBasico || isClosed) return false; // Se for básico ou estiver fechado, ninguém edita
    if (isRegionalScope && !isRegionalCidade) return false; // Se for Regional, GEM Local não edita a Ata (Regra de Hierarquia)
    if (isMaster || isComissao) return true; // Master e Comissão sempre editam
    if (level === 'regional_cidade' && eventMeta?.cidadeId === userData?.cidadeId) return true; // Regional da cidade edita
    const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])]; // Lista igrejas autorizadas
    return permitidasIds.includes(comumId); // Permite se for a igreja dele
  }, [isBasico, isClosed, isMaster, isComissao, level, userData, comumId, eventMeta, isRegionalScope, isRegionalCidade]);

  const isInputDisabled = !temPermissaoEditar; // Bloqueia campos se não tiver permissão

  const pesosMinisterio = { // Define a ordem de importância dos cargos
    'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4,
    'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7,
    'Secretário da Música': 8, 'Instrutor': 9, 'Músico': 10
  };

  const ordenarLista = (lista, campoNome, campoRole) => { // Organiza listas por cargo e nome
    return [...lista].sort((a, b) => {
      const pesoA = pesosMinisterio[a[campoRole]] || 99;
      const pesoB = pesosMinisterio[b[campoRole]] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a[campoNome] || "").localeCompare(b[campoNome] || "");
    });
  };

  const badgeMinisterioLocal = useMemo(() => { // Calcula número de presentes na igreja
    if (!ataData.presencaLocal || !localMinisterio.length) return null;
    const reais = ataData.presencaLocal.filter(nome => 
      localMinisterio.some(m => m.name === nome)
    );
    return reais.length || null;
  }, [ataData.presencaLocal, localMinisterio]);

  const badgeMinisterioRegional = useMemo(() => { // Calcula presentes no regional
    if (!ataData.presencaLocalFull) return null;
    const válidos = ataData.presencaLocalFull.filter(p => p.nome && p.role);
    return válidos.length || null;
  }, [ataData.presencaLocalFull]);

  const debouncedSave = useCallback((newData) => { // Salva no banco com um pequeno atraso para evitar lentidão
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

  const handleChange = (newData) => { // Função que detecta qualquer mudança na tela
    if (isInputDisabled) return;
    
    let finalData = { ...newData };
    
    // LÓGICA v9.2: Aplica automações independentes se os respectivos checkboxes estiverem ativos
    if (autoFillOracao) { // Se o atalho da Oração estiver ligado
      finalData.oracaoAberturaNome = newData.atendimentoNome; // Copia o nome do atendimento
      finalData.oracaoAberturaMin = newData.atendimentoMin; // Copia o cargo do atendimento
    }
    
    if (autoFillPalavra && isRegionalScope) { // Se o atalho da Palavra estiver ligado (apenas em regionais)
      finalData.palavra = { 
        ...newData.palavra, 
        anciao: newData.atendimentoNome // Copia o nome do atendimento para o campo da pregação
      };
    }
    
    setAtaData(finalData);
    debouncedSave(finalData);
  };

  const saveStatus = async (newStatus) => { // Muda o estado da ata para aberta ou fechada
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

  useEffect(() => { // Carrega os dados assim que a página abre
    if (!comumId || !eventId) return;
    let isMounted = true;
    
    const unsubReferencia = onSnapshot(collection(db, 'referencia_cargos'), (s) => { // Busca cargos oficiais
      if (!isMounted) return;
      const lista = s.docs.map(d => d.data().nome).sort((a, b) => (pesosMinisterio[a] || 99) - (pesosMinisterio[b] || 99));
      setReferenciaMinisterio(lista);
    });

    const unsubMin = onSnapshot(collection(db, 'comuns', comumId, 'ministerio_lista'), (s) => { // Busca músicos da igreja
      if (!isMounted) return;
      const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
      setLocalMinisterio(ordenarLista(lista, 'name', 'role'));
    });

    if (!isBasico) { // Carrega instrumentos se não for usuário básico
      onSnapshot(collection(db, 'config_instrumentos_nacional'), (s) => {
        if (!isMounted) return;
        setInstrumentsNacionais(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    const unsubEvent = onSnapshot(doc(db, 'events_global', eventId), // Escuta mudanças no evento em tempo real
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
            if (loadedAta.hinoAbertura === undefined) loadedAta.hinoAbertura = '';
            
            setAtaData(loadedAta);
          }
          setLoading(false);
        }
      },
      (err) => console.warn("Erro no Listener de Evento Global.")
    );

    return () => { // Limpa as conexões quando sai da página
      isMounted = false; 
      unsubReferencia(); 
      unsubMin();
      unsubEvent(); 
      if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); 
    };
  }, [eventId, comumId, isBasico]);

  const handleHinoChange = (pIdx, hIdx, val) => { // Controla a digitação dos números dos hinos
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
    
    if (pIdx === null) { // Caso seja o hino de abertura
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

    const np = [...ataData.partes]; // Caso sejam hinos das partes
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

  const handleOpenVisitaModal = (v = null, idx = null) => { // Abre a janelinha de cadastro de visitantes
    if (isInputDisabled) return; 
    if (v) { setNewVisita(v); setEditIndex(idx); } 
    else { setNewVisita({ nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' }); setEditIndex(null); }
    setShowVisitaModal(true);
  };

  const handleSaveVisita = () => { // Salva os dados do visitante na lista
    if (isInputDisabled) return;
    if (!newVisita.nome) return toast.error("Informe o nome");
    let updated = [...(ataData.visitantes || [])];
    if (editIndex !== null) updated[editIndex] = newVisita;
    else updated.push({ ...newVisita, id: Date.now() });
    handleChange({ ...ataData, visitantes: ordenarLista(updated, 'nome', 'min') });
    setShowVisitaModal(false);
  };

  const togglePresencaLocal = (m) => { // Marca ou desmarca a presença de um músico local
    if (isInputDisabled) return;
    const list = (ataData.presencaLocal || []).includes(m.name) ? ataData.presencaLocal.filter(n => n !== m.name) : [...(ataData.presencaLocal || []), m.name];
    const full = (ataData.presencaLocalFull || []).find(x => x.nome === m.name) ? ataData.presencaLocalFull.filter(x => x.nome !== m.name) : [...(ataData.presencaLocalFull || []), { nome: m.name, role: m.role }];
    handleChange({ ...ataData, presencaLocal: list, presencaLocalFull: full });
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] uppercase italic tracking-[0.3em]">Sincronizando Ata...</div>; // Tela de espera

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

      {isRegionalScope && isGemLocal && ( // Seção para gerenciar quem ajuda na contagem
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
          <AtaLiturgia 
            ataData={ataData} 
            handleChange={handleChange} 
            isInputDisabled={isInputDisabled} 
            referenciaMinisterio={referenciaMinisterio} 
            handleHinoChange={handleHinoChange} 
            hidePartes={true} 
            isRegional={isRegionalScope}
            autoFill={autoFillOracao} // Passa o estado específico da Oração
            setAutoFill={setAutoFillOracao} // Passa a função de mudar a Oração
          />
          {isRegionalScope && ( // Se for regional, mostra o campo de pregação
            <div className="pt-4 border-t border-slate-100">
              <div className="px-2 mb-4">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none mb-1">Liturgia Regional</p>
                <h4 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter">Palavra Pregada</h4>
              </div>
              <AtaPalavra 
                ataData={ataData} 
                handleChange={handleChange} 
                isInputDisabled={isInputDisabled} 
                autoFill={autoFillPalavra} // Passa o estado específico da Palavra
                setAutoFill={setAutoFillPalavra} // Passa a função de mudar a Palavra (Resolve o Erro do Console)
              />
            </div>
          )}
          <AtaLiturgia 
            ataData={ataData} 
            handleChange={handleChange} 
            isInputDisabled={isInputDisabled} 
            referenciaMinisterio={referenciaMinisterio} 
            handleHinoChange={handleHinoChange} 
            onlyPartes={true} 
            isRegional={isRegionalScope} 
          />
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

      <Accordion 
        title={isRegionalScope ? "Ministério Regional" : "Ministério Local"} 
        isOpen={openSection === 'ministerio'} 
        onClick={() => setOpenSection(openSection === 'ministerio' ? null : 'ministerio')} 
        icon="🏛️" 
        badge={isRegionalScope ? badgeMinisterioRegional : badgeMinisterioLocal}
      >
        {isRegionalScope ? (
          <MinistryAccordion 
            eventId={eventId} 
            regionalId={eventMeta?.regionalId || ""} 
            cidadeId={eventMeta?.cidadeId || ""} 
            comumId={comumId || ""} 
            presencaAtual={ataData.presencaLocalFull || []} 
            onChange={(novaLista) => handleChange({ ...ataData, presencaLocalFull: novaLista })} 
            isInputDisabled={isInputDisabled} 
            userData={userData} 
            isReady={!!eventMeta} 
          />
        ) : (
          <AtaMinisterioLocal localMinisterio={localMinisterio} presencaLocal={ataData.presencaLocal} isInputDisabled={isInputDisabled} togglePresencaLocal={togglePresencaLocal} />
        )}
      </Accordion>

      {!isBasico && (
        <div className="max-w-[200px] mx-auto opacity-80 hover:opacity-100 transition-opacity">
          <AtaLacreStatus isClosed={isClosed} isGemLocal={isGemLocal} isComissao={isComissao} loading={loading} showConfirmLock={showConfirmLock} setShowConfirmLock={setShowConfirmLock} showConfirmReopen={showConfirmReopen} setShowConfirmReopen={setShowConfirmReopen} saveStatus={saveStatus} />
        </div>
      )}

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

export default AtaPage; // Exporta a página pronta para o sistema