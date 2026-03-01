import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Explicação: Importa as ferramentas básicas do React para criar a página.
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, onSnapshot, collection, query, where, orderBy, getDocs } from '../../config/firebase'; // Explicação: Conecta com o banco de dados Firebase para buscar os dados.
import { eventService } from '../../services/eventService'; // Explicação: Importa o serviço que envia as atualizações para o banco de dados.
import toast from 'react-hot-toast'; // Explicação: Importa as notificações de aviso que aparecem no topo da tela.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa as ferramentas de animação para deixar a tela suave.
import { 
  Lock, ShieldCheck, Info, X, User, Music, MapPin, Phone, Calendar, Clock, Trash2, Users, ShieldAlert
} from 'lucide-react'; // Explicação: Importa os desenhos dos ícones usados nos botões e avisos.

// Importação do Cérebro de Autenticação v2.1
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa os dados de quem está logado no momento.

// Importação dos Componentes Atômicos Refatorados
import { Accordion, Field, Modal, Select } from './components/AtaUIComponents.jsx'; // Explicação: Importa peças visuais como campos de texto e listas.
import AtaLiturgia from './components/AtaLiturgia.jsx'; // Explicação: Importa o módulo que cuida dos hinos e orações.
import AtaVisitantes from './components/AtaVisitantes.jsx'; // Explicação: Importa o módulo que gerencia as visitas.
import AtaMinisterioLocal from './components/AtaMinisterioLocal.jsx'; // Explicação: Importa a lista de músicos da própria igreja.
import AtaLacreStatus from './components/AtaLacreStatus.jsx'; // Explicação: Importa o botão de trancar (lacrar) a ata.
// Importação do Novo Módulo de Ocorrências
import AtaOcorrencias from './components/AtaOcorrencias.jsx'; // Explicação: Importa a parte de anotações e avisos especiais.
// Importação do Módulo de Palavra Pregada (v1.0 Regional)
import AtaPalavra from './components/AtaPalavra.jsx'; // Explicação: Importa a parte de registro da pregação.
// Importação dos Módulos de Gestão Regional v4.0
import GuestManager from './components/GuestManager.jsx'; // Explicação: Importa o sistema que gerencia os convidados externos.
import MinistryAccordion from './components/MinistryAccordion.jsx'; // Explicação: Importa a lista ministerial para eventos regionais.

const AtaPage = ({ eventId, comumId }) => { // Explicação: Inicia a construção da página usando os IDs do ensaio e da igreja.
  const { userData, user } = useAuth(); // Explicação: Pega os dados do perfil (userData) e a identidade única (user) do usuário.
  const level = userData?.accessLevel; // Explicação: Identifica qual o nível de poder do usuário (ex: master, regional).
  
  const isMaster = level === 'master'; // Explicação: Verifica se o usuário é o administrador geral.
  const isComissao = isMaster || level === 'comissao'; // Explicação: Verifica se o usuário é da Comissão Regional.
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Explicação: Verifica se o usuário é gestor de cidade ou regional.
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Explicação: Verifica se o usuário é um colaborador local (GEM).
  const isBasico = level === 'basico'; // Explicação: Verifica se é um usuário sem cargos administrativos.

  const [ataData, setAtaData] = useState({ // Explicação: Cria a "caixa" que guarda todas as informações digitadas na Ata.
    status: 'open', // Explicação: Define que o ensaio começa com a ata aberta.
    atendimentoNome: '', atendimentoMin: '', // Explicação: Guarda nome e cargo de quem atende o ensaio.
    hinoAbertura: '', // Explicação: Guarda o número do hino de abertura.
    oracaoAberturaNome: '', oracaoAberturaMin: '', // Explicação: Guarda quem fez a oração inicial.
    ultimaOracaoNome: '', ultimaOracaoMin: '', // Explicação: Guarda quem fez a oração final.
    partes: [ // Explicação: Estrutura para os hinos da 1ª e 2ª parte.
      { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
      { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
    ],
    palavra: { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' }, // Explicação: Dados da pregação.
    presencaLocal: [], // Explicação: Lista simples de nomes presentes.
    presencaLocalFull: [], // Explicação: Lista completa com cargos dos presentes.
    visitantes: [], // Explicação: Lista de pessoas de fora que vieram visitar.
    ocorrencias: [] // Explicação: Notas sobre qualquer problema no ensaio.
  });
  
  const [eventMeta, setEventMeta] = useState(null); // Explicação: Guarda informações vindas do banco sobre o evento.
  const [localMinisterio, setLocalMinisterio] = useState([]); // Explicação: Guarda a lista de músicos cadastrados na igreja.
  const [referenciaMinisterio, setReferenciaMinisterio] = useState([]); // Explicação: Lista oficial de nomes de cargos.
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]); // Explicação: Lista de todos os instrumentos do sistema.
  const [loading, setLoading] = useState(true); // Explicação: Controla se a tela exibe o aviso de "Carregando".
  
  const [showConfirmLock, setShowConfirmLock] = useState(false); // Explicação: Abre o aviso de confirmação para fechar a ata.
  const [showConfirmReopen, setShowConfirmReopen] = useState(false); // Explicação: Abre o aviso de confirmação para reabrir a ata.
  const [visitaToDelete, setVisitaToDelete] = useState(null); // Explicação: Identifica qual visitante será excluído.
  const [showVisitaModal, setShowVisitaModal] = useState(false); // Explicação: Controla a janelinha de preencher nova visita.
  
  const [openSection, setOpenSection] = useState(null); // Explicação: Sabe qual "sanfona" de informações está aberta.
  const [editIndex, setEditIndex] = useState(null); // Explicação: Sabe qual linha da lista está sendo editada.
  const saveTimeoutRef = useRef(null); // Explicação: Cronômetro invisível para salvar os dados sozinho.

  const [newVisita, setNewVisita] = useState({ // Explicação: Estrutura temporária para criar um novo visitante.
    nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' 
  });

  const [autoFillOracao, setAutoFillOracao] = useState(false); // Explicação: Ativa a cópia automática do Atendimento para Oração.
  const [autoFillPalavra, setAutoFillPalavra] = useState(false); // Explicação: Ativa a cópia automática do Atendimento para Palavra.

  const isClosed = ataData?.status === 'closed'; // Explicação: Verifica se a ata está lacrada (trancada).
  const isRegionalScope = eventMeta?.scope === 'regional'; // Explicação: Verifica se o ensaio é do tipo Regional.
  
  const temPermissaoEditar = useMemo(() => { // Explicação: CÉREBRO DE PERMISSÃO: Decide se o usuário pode escrever na tela.
    if (isBasico || isClosed) return false; // Explicação: Usuário básico ou ata lacrada nunca podem editar.
    
    // NOVIDADE v4.2: Liberação para Convidados (Caso Louveira/Jundiaí)
    const isInvited = (eventMeta?.invitedUsers || []).includes(user?.uid); // Explicação: Checa se o ID único do usuário está na lista de convidados do evento.
    if (isInvited && isRegionalCidade) return true; // Explicação: Se for convidado e tiver nível de gestão (Cidade pra cima), libera a edição.

    if (isRegionalScope && !isRegionalCidade) return false; // Explicação: Em regional, quem é apenas GEM Local de outra igreja não edita.
    if (isMaster || isComissao) return true; // Explicação: Master e Comissão sempre têm passe livre.
    if (level === 'regional_cidade' && eventMeta?.cidadeId === userData?.cidadeId) return true; // Explicação: Gestor da mesma cidade do evento pode editar.
    const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])]; // Explicação: Lista de igrejas autorizadas no perfil do usuário.
    return permitidasIds.includes(comumId); // Explicação: Libera se o ensaio for na igreja do usuário.
  }, [isBasico, isClosed, isMaster, isComissao, level, userData, comumId, eventMeta, isRegionalScope, isRegionalCidade, user?.uid]);

  const isInputDisabled = !temPermissaoEditar; // Explicação: Desativa todos os campos se o usuário não tiver permissão.

  const pesosMinisterio = { // Explicação: Define a ordem de importância dos cargos para organizar as listas.
    'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4,
    'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7,
    'Secretário da Música': 8, 'Instrutor': 9, 'Músico': 10
  };

  const ordenarLista = (lista, campoNome, campoRole) => { // Explicação: Função que coloca os nomes em ordem de cargo e depois alfabética.
    return [...lista].sort((a, b) => {
      const pesoA = pesosMinisterio[a[campoRole]] || 99;
      const pesoB = pesosMinisterio[b[campoRole]] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a[campoNome] || "").localeCompare(b[campoNome] || "");
    });
  };

  const badgeMinisterioLocal = useMemo(() => { // Explicação: Conta quantos músicos da igreja local estão presentes.
    if (!ataData.presencaLocal || !localMinisterio.length) return null;
    const reais = ataData.presencaLocal.filter(nome => 
      localMinisterio.some(m => m.name === nome)
    );
    return reais.length || null;
  }, [ataData.presencaLocal, localMinisterio]);

  const badgeMinisterioRegional = useMemo(() => { // Explicação: Conta quantos músicos externos estão presentes no regional.
    if (!ataData.presencaLocalFull) return null;
    const válidos = ataData.presencaLocalFull.filter(p => p.nome && p.role);
    return válidos.length || null;
  }, [ataData.presencaLocalFull]);

  const debouncedSave = useCallback((newData) => { // Explicação: Salva os dados no banco após 1,5 segundos sem digitação.
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

  const handleChange = (newData) => { // Explicação: Captura qualquer tecla ou clique nos formulários da página.
    if (isInputDisabled) return;
    
    let finalData = { ...newData };
    
    if (autoFillOracao) { // Explicação: Se o atalho estiver ligado, preenche a Oração sozinho.
      finalData.oracaoAberturaNome = newData.atendimentoNome; 
      finalData.oracaoAberturaMin = newData.atendimentoMin; 
    }
    
    if (autoFillPalavra && isRegionalScope) { // Explicação: Se o atalho da Palavra estiver ligado, preenche o Ancião.
      finalData.palavra = { 
        ...newData.palavra, 
        anciao: newData.atendimentoNome 
      };
    }
    
    setAtaData(finalData); // Explicação: Atualiza a tela imediatamente.
    debouncedSave(finalData); // Explicação: Agenda o salvamento no banco de dados.
  };

  const saveStatus = async (newStatus) => { // Explicação: Função que altera o estado da Ata (Aberto ou Lacrado).
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

  useEffect(() => { // Explicação: Carrega as informações do banco assim que você entra na página.
    if (!comumId || !eventId) return;
    let isMounted = true;
    
    const unsubReferencia = onSnapshot(collection(db, 'referencia_cargos'), (s) => { // Explicação: Busca a lista oficial de cargos (Ancião, Diácono, etc).
      if (!isMounted) return;
      const lista = s.docs.map(d => d.data().nome).sort((a, b) => (pesosMinisterio[a] || 99) - (pesosMinisterio[b] || 99));
      setReferenciaMinisterio(lista);
    });

    const unsubMin = onSnapshot(collection(db, 'comuns', comumId, 'ministerio_lista'), (s) => { // Explicação: Busca os músicos cadastrados nesta igreja.
      if (!isMounted) return;
      const lista = s.docs.map(d => ({ id: d.id, name: d.data().nome, role: d.data().cargo }));
      setLocalMinisterio(ordenarLista(lista, 'name', 'role'));
    });

    if (!isBasico) { // Explicação: Carrega a lista nacional de instrumentos.
      onSnapshot(collection(db, 'config_instrumentos_nacional'), (s) => {
        if (!isMounted) return;
        setInstrumentsNacionais(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    const unsubEvent = onSnapshot(doc(db, 'events_global', eventId), // Explicação: Fica vigiando o ensaio em tempo real.
      (s) => {
        if (s.exists() && isMounted) {
          const eventData = s.data();
          setEventMeta(eventData);
          if (eventData.ata) {
            const loadedAta = { ...eventData.ata };
            if (!loadedAta.partes || loadedAta.partes.length === 0) { // Explicação: Cria o modelo das partes se a ata for nova.
              loadedAta.partes = [
                { label: '1ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] },
                { label: '2ª Parte', nome: '', min: '', hinos: ['', '', '', '', ''] }
              ];
            }
            if (!loadedAta.palavra) { // Explicação: Cria o modelo da palavra se a ata for nova.
              loadedAta.palavra = { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' };
            }
            if (loadedAta.hinoAbertura === undefined) loadedAta.hinoAbertura = ''; // Explicação: Garante que o campo de hino não dê erro se estiver vazio.
            
            setAtaData(loadedAta);
          }
          setLoading(false);
        }
      },
      (err) => console.warn("Erro no Listener de Evento Global.")
    );

    return () => { // Explicação: Desliga todas as conexões ao sair da página para economizar internet.
      isMounted = false; 
      unsubReferencia(); 
      unsubMin();
      unsubEvent(); 
      if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); 
    };
  }, [eventId, comumId, isBasico]);

  const handleHinoChange = (pIdx, hIdx, val) => { // Explicação: Valida a digitação dos hinos (apenas números até 480 ou Coros).
    if (isInputDisabled) return;
    let v = val.toUpperCase().trim();
    
    if (pIdx === null) { // Explicação: Regras para o hino de abertura.
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

    const np = [...ataData.partes]; // Explicação: Regras para os hinos das partes.
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

  const handleOpenVisitaModal = (v = null, idx = null) => { // Explicação: Abre o quadro para preencher dados de um novo visitante.
    if (isInputDisabled) return; 
    if (v) { setNewVisita(v); setEditIndex(idx); } 
    else { setNewVisita({ nome: '', min: '', inst: '', bairro: '', cidadeUf: '', dataEnsaio: '', hora: '', contato: '' }); setEditIndex(null); }
    setShowVisitaModal(true);
  };

  const handleSaveVisita = () => { // Explicação: Grava o visitante preenchido na lista oficial da Ata.
    if (isInputDisabled) return;
    if (!newVisita.nome) return toast.error("Informe o nome");
    let updated = [...(ataData.visitantes || [])];
    if (editIndex !== null) updated[editIndex] = newVisita;
    else updated.push({ ...newVisita, id: Date.now() });
    handleChange({ ...ataData, visitantes: ordenarLista(updated, 'nome', 'min') });
    setShowVisitaModal(false);
  };

  const handleConfirmDeleteVisita = () => { // Explicação: Deleta definitivamente um visitante da lista.
    if (!visitaToDelete || isInputDisabled) return; 
    const updated = (ataData.visitantes || []).filter((v, idx) => (v.id || idx) !== visitaToDelete); 
    handleChange({ ...ataData, visitantes: updated }); 
    setVisitaToDelete(null); 
    toast.success("Visitante removido"); 
  };

  const togglePresencaLocal = (m) => { // Explicação: Clica no nome do músico para marcar que ele chegou no ensaio.
    if (isInputDisabled) return;
    const list = (ataData.presencaLocal || []).includes(m.name) ? ataData.presencaLocal.filter(n => n !== m.name) : [...(ataData.presencaLocal || []), m.name];
    const full = (ataData.presencaLocalFull || []).find(x => x.nome === m.name) ? ataData.presencaLocalFull.filter(x => x.nome !== m.name) : [...(ataData.presencaLocalFull || []), { nome: m.name, role: m.role }];
    handleChange({ ...ataData, presencaLocal: list, presencaLocalFull: full });
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] uppercase italic tracking-[0.3em]">Sincronizando Ata...</div>; // Explicação: Tela que aparece enquanto os dados viajam pela internet.

  return ( // Explicação: Início da parte visual que o usuário vê na tela do celular.
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

      {isRegionalScope && isGemLocal && ( // Explicação: Sanfona que abre a gestão de quem ajuda a contar o ensaio.
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
            autoFill={autoFillOracao} 
            setAutoFill={setAutoFillOracao} 
          />
          {isRegionalScope && ( // Explicação: Mostra a parte de registro da pregação apenas em ensaios regionais.
            <div className="pt-4 border-t border-slate-100">
              <div className="px-2 mb-4">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none mb-1">Liturgia Regional</p>
                <h4 className="text-sm font-[900] text-slate-950 uppercase italic tracking-tighter">Palavra Pregada</h4>
              </div>
              <AtaPalavra 
                ataData={ataData} 
                handleChange={handleChange} 
                isInputDisabled={isInputDisabled} 
                autoFill={autoFillPalavra} 
                setAutoFill={setAutoFillPalavra} 
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
        {isRegionalScope ? ( // Explicação: Mostra a lista regional se o ensaio for regional.
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
        ) : ( // Explicação: Mostra a lista local se o ensaio for local.
          <AtaMinisterioLocal localMinisterio={localMinisterio} presencaLocal={ataData.presencaLocal} isInputDisabled={isInputDisabled} togglePresencaLocal={togglePresencaLocal} />
        )}
      </Accordion>

      {!isBasico && ( // Explicação: Mostra o botão de lacrar para quem não é básico.
        <div className="max-w-[200px] mx-auto opacity-80 hover:opacity-100 transition-opacity">
          <AtaLacreStatus isClosed={isClosed} isGemLocal={isGemLocal} isComissao={isComissao} loading={loading} showConfirmLock={showConfirmLock} setShowConfirmLock={setShowConfirmLock} showConfirmReopen={showConfirmReopen} setShowConfirmReopen={setShowConfirmReopen} saveStatus={saveStatus} />
        </div>
      )}

      <AnimatePresence>
        {visitaToDelete && ( // Explicação: Janela de confirmação para não apagar um visitante sem querer.
          <Modal 
            title="Excluir Visitante" 
            icon={<Trash2 size={32}/>} 
            danger={true} 
            confirmLabel="Confirmar Exclusão" 
            onConfirm={handleConfirmDeleteVisita} 
            onCancel={() => setVisitaToDelete(null)} 
          >
            Tem certeza que deseja remover este visitante da lista? Esta ação não pode ser desfeita. 
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVisitaModal && ( // Explicação: Quadro para digitar as informações do visitante.
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-left">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left relative">
              <button onClick={() => setShowVisitaModal(false)} className="absolute top-8 right-8 text-slate-300 active:scale-95 transition-all"><X size={24}/></button>
              <h3 className="text-2xl font-[900] text-slate-950 uppercase italic tracking-tighter mb-8 leading-none">Dados da Visita</h3>
              
              <div className="space-y-4">
                <Field label="Nome Completo *" val={newVisita.nome} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, nome: v})} />
                
                <div className="grid grid-cols-1 gap-4">
                  <Select label="Ministério / Cargo *" val={newVisita.min} options={referenciaMinisterio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, min: v})} />
                  <Field label="Instrumento" val={newVisita.inst} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, inst: v})} icon={<Music size={10}/>} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bairro" val={newVisita.bairro} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, bairro: v})} icon={<MapPin size={10}/>} />
                  <Field label="Cidade/UF" val={newVisita.cidadeUf} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, cidadeUf: v})} />
                </div>

                <Field label="Celular / Contato" val={newVisita.contato} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, contato: v})} icon={<Phone size={10}/>} />

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Data Ensaio" val={newVisita.dataEnsaio} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, dataEnsaio: v})} icon={<Calendar size={10}/>} placeholder="3 Sábado" />
                    <Field label="Horário" val={newVisita.hora} disabled={isInputDisabled} onChange={v => setNewVisita({...newVisita, hora: v})} icon={<Clock size={10}/>} placeholder="00:00" />
                </div>

                {!isInputDisabled && ( // Explicação: Só mostra o botão de salvar se o usuário puder editar.
                  <button 
                    onClick={handleSaveVisita} 
                    disabled={!newVisita.nome || !newVisita.min}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 active:scale-95 transition-all ${
                      (!newVisita.nome || !newVisita.min) 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white shadow-blue-100'
                    }`}
                  >
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

export default AtaPage; // Explicação: Exporta a página configurada para ser usada no aplicativo.