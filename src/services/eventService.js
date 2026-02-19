import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore";

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {};
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {};

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v7.1 - Otimização Anti-Duplicidade e Carimbagem de Convidados
 * Agrupa atualizações e garante economia de cota via denormalização.
 */
export const eventService = {

  // Escuta os eventos de uma comum específica na COLEÇÃO GLOBAL
  subscribeToEvents: (comumId, callback) => {
    if (!comumId) return; 
    const q = query(
      collection(db, 'events_global'), 
      where('comumId', '==', comumId), 
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      console.error("Erro no Listener de Eventos Global:", error);
    });
  },

  /**
   * Cria um novo ensaio na Coleção Global
   * LÓGICA BLUEPRINT: Captura um SNAPSHOT da configuração local e CARIMBA nomes de Cidade/Regional.
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA O SNAPSHOT LOCAL
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      if (localSnap.empty) {
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados.");
        throw new Error("CONFIG_REQUIRED"); 
      }

      // 2. MONTAGEM DO MAPA DE CONTAGEM INICIAL
      const sessoesDetectadas = new Set();

      localSnap.docs.forEach(docInst => {
        const inst = docInst.data();
        const id = docInst.id;
        const sectionName = inst.section?.toUpperCase() || 'GERAL';
        sessoesDetectadas.add(sectionName);

        initialCounts[id] = {
          total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0,  
          name: inst.name || id.toUpperCase(),
          section: sectionName,
          evalType: inst.evalType || 'Sem',
          responsibleId: null,
          responsibleName: null,
          updatedAt: Date.now()
        };
      });

      // INICIALIZAÇÃO DE SEÇÕES
      sessoesDetectadas.forEach(sec => {
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
        initialCounts[metaKey] = {
          responsibleId: null,
          responsibleName: null,
          isActive: false,
          updatedAt: Date.now()
        };
      });
      
      // 3. PERSISTÊNCIA NA COLEÇÃO GLOBAL COM CARIMBAGEM (Denormalização)
      return await addDoc(collection(db, 'events_global'), {
        type: type || 'Ensaio Local',
        scope: scope || 'local', 
        invitedUsers: invitedUsers || [], // Pode vir como array de objetos v7.0
        date,
        responsavel: responsavel || 'Pendente',
        comumNome: comumNome || '',
        comumId: comumId,
        cidadeId: cidadeId || '',
        cidadeNome: cidadeNome || '', 
        regionalId: regionalId || '',
        regionalNome: regionalNome || '', 
        ata: { 
          status: 'open',
          palavra: {
            anciao: '',
            livro: '',
            capitulo: '',
            verso: '',
            assunto: ''
          },
          ocorrencias: [] 
        },
        counts: initialCounts, 
        createdAt: Date.now(),
        dbVersion: "7.1-global-rich-guests-antidup"
      });

    } catch (err) {
      if (err.message === "CONFIG_REQUIRED") throw err;
      console.error("Erro ao processar criação de evento:", err);
      throw new Error("Falha ao inicializar evento na localidade.");
    }
  },

  /**
   * GESTÃO DE CONVIDADOS (CARIMBAGEM RICA)
   * v7.1 - Removido timestamp interno do objeto para garantir funcionamento do arrayUnion (Anti-Duplicidade)
   */
  addGuest: async (eventId, userFullData) => {
    if (!eventId || !userFullData?.uid) return;
    const eventRef = doc(db, 'events_global', eventId);
    
    // JUSTIFICATIVA: Sem o 'timestamp' interno, o objeto é único por usuário.
    // O Firebase agora impede a inserção do mesmo Osvaldo ou Jonas duas vezes no array.
    const guestStamp = {
      uid: userFullData.uid,
      name: userFullData.name || userFullData.nome || 'Convidado',
      comum: userFullData.comumNome || userFullData.comum || 'Não informada'
    };

    return await updateDoc(eventRef, {
      invitedUsers: arrayUnion(guestStamp),
      updatedAt: Date.now() // Carimbo de tempo movido para o nível do documento
    });
  },

  removeGuest: async (eventId, userFullData) => {
    if (!eventId || !userFullData) return;
    const eventRef = doc(db, 'events_global', eventId);
    return await updateDoc(eventRef, {
      invitedUsers: arrayRemove(userFullData),
      updatedAt: Date.now()
    });
  },

  /**
   * LÓGICA DE POSSE ÚNICA (Take Ownership)
   * Substitui o responsável atual pelo novo sem deixar o campo vago.
   */
  takeOwnership: async (eventId, instId, userData) => {
    if (!eventId || !instId || !userData) return;
    const eventRef = doc(db, 'events_global', eventId);
    
    const isMeta = instId.startsWith('meta_');
    const updatePath = isMeta ? `counts.${instId}` : `counts.${instId}`;

    return await updateDoc(eventRef, {
      [`${updatePath}.responsibleId`]: userData.uid || userData.id,
      [`${updatePath}.responsibleName`]: userData.name || userData.nome,
      [`${updatePath}.updatedAt`]: Date.now(),
      [`${updatePath}.isActive`]: true
    });
  },

  // Exclui um ensaio da coleção global
  deleteEvent: async (comumId, eventId) => {
    if (!eventId) return; 
    return await deleteDoc(doc(db, 'events_global', eventId));
  },

  /**
   * Atualiza a contagem na COLEÇÃO GLOBAL
   * v6.5 - Otimização Consolidada: Agrupa múltiplos campos em uma única escrita por instrumento.
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    if (!eventId || !instId) return;

    const timerKey = `${eventId}_${instId}`;
    const fieldToUpdate = field === 'total_simples' ? 'total' : field;
    const val = Math.max(0, parseInt(value) || 0);

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {};
    
    updateBuffers[timerKey][`counts.${instId}.${fieldToUpdate}`] = val;

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]);

    debounceTimers[timerKey] = setTimeout(async () => {
      const eventRef = doc(db, 'events_global', eventId);
      
      try {
        const finalUpdates = { ...updateBuffers[timerKey] };
        
        finalUpdates[`counts.${instId}.lastEditBy`] = userData?.name || 'Sistema';
        finalUpdates[`counts.${instId}.timestamp`] = Date.now();
        
        if (section) finalUpdates[`counts.${instId}.section`] = section;
        if (customName) finalUpdates[`counts.${instId}.name`] = customName;

        await updateDoc(eventRef, finalUpdates);
        
        delete debounceTimers[timerKey];
        delete updateBuffers[timerKey];

      } catch (e) {
        console.error("Erro ao consolidar contagem:", e);
      }
    }, 600);
  },

  // Remove um instrumento extra da contagem global
  removeExtraInstrument: async (comumId, eventId, instId) => {
    if (!eventId || !instId) return;
    const eventRef = doc(db, 'events_global', eventId);
    return await updateDoc(eventRef, { 
      [`counts.${instId}`]: deleteField() 
    });
  },

  /**
   * Salva Ata na COLEÇÃO GLOBAL
   */
  saveAtaData: async (comumId, eventId, ataData) => {
    if (!eventId) throw new Error("Referência de evento inválida.");
    const eventRef = doc(db, 'events_global', eventId);
    
    let todosHinos = [];
    (ataData.partes || []).forEach(p => {
      if (p.hinos) {
        todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')];
      }
    });

    // Limpeza de campos para garantir integridade do documento
    const { date, comumId: cid, regionalId, cidadeId, ...ataLimpa } = ataData;

    const finalAta = {
      ...ataLimpa,
      hinosChamados: todosHinos.length,
      hinosLista: todosHinos,
      lastUpdate: Date.now()
    };

    try {
      await updateDoc(eventRef, { 
        ata: finalAta 
      });
    } catch (e) {
      console.error("Erro ao salvar Ata:", e);
      throw new Error("Erro ao salvar os dados da Ata.");
    }
  }
};