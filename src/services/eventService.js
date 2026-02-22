import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase';
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {};
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {};

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v8.5 - Estabilização de Listeners e Gestão de Convidados
 * Ajustado para tratar revogação de acesso reativa sem disparar exceções de permissão.
 */
export const eventService = {

  /**
   * BUSCA USUÁRIOS DA REGIONAL
   * Permite que o gestor encontre irmãos de outras cidades para convidar como contadores.
   * Baseado na permissão de leitura de perfis da mesma regional nas Rules.
   */
  getUsersByRegional: async (regionalId) => {
    if (!regionalId) return [];
    try {
      const q = query(
        collection(db, 'users'),
        where('regionalId', '==', regionalId),
        where('approved', '==', true)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (e) {
      console.error("Erro ao buscar usuários da regional:", e);
      return [];
    }
  },

  // Escuta eventos da comum OU eventos onde o usuário é convidado (via UID string)
  subscribeToEvents: (comumId, userId, callback) => {
    if (!comumId || !userId) return; 
    
    const q = query(
      collection(db, 'events_global'), 
      or(
        where('comumId', '==', comumId),
        where('invitedUsers', 'array-contains', userId)
      ),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      // TRATAMENTO REATIVO: Se o acesso for revogado (ex: remoção da lista de convidados),
      // retornamos uma lista vazia para o callback em vez de estourar erro no console.
      if (error.code === 'permission-denied') {
        console.warn("Sincronização encerrada: Acesso ao evento regional revogado ou finalizado.");
        callback([]);
      } else {
        console.error("Erro no Listener de Eventos Global:", error);
      }
    });
  },

  /**
   * Cria um novo ensaio na Coleção Global
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData;
    
    let initialCounts = {};

    try {
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      if (localSnap.empty) {
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados.");
        throw new Error("CONFIG_REQUIRED"); 
      }

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

      sessoesDetectadas.forEach(sec => {
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
        initialCounts[metaKey] = {
          responsibleId: null,
          responsibleName: null,
          isActive: false,
          updatedAt: Date.now()
        };
      });
      
      const payload = {
        type: type || 'Ensaio Local',
        scope: scope || 'local', 
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], // Garante que nasce como array de strings
        date,
        responsavel: responsavel || 'Pendente',
        createdById: currentUser?.uid || null, // Carimbo essencial para permissão de Delete
        comumNome: comumNome || '',
        comumId: comumId,
        cidadeId: cidadeId || '',
        cidadeNome: cidadeNome || '', 
        regionalId: regionalId || '',
        regionalNome: regionalNome || '', 
        ata: { 
          status: 'open',
          palavra: { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' },
          ocorrencias: [] 
        },
        counts: initialCounts, 
        createdAt: Date.now(),
        dbVersion: "8.5-listener-stability-fix"
      };

      return await addDoc(collection(db, 'events_global'), payload);

    } catch (err) {
      console.error("Erro detalhado na criação do evento:", err);
      if (err.message === "CONFIG_REQUIRED") throw err;
      throw new Error("Falha ao inicializar evento.");
    }
  },

  /**
   * GESTÃO DE CONVIDADOS (Acesso por UID String)
   */
  addGuest: async (eventId, userObjectOrId) => {
    if (!eventId || !userObjectOrId) return;
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, {
        invitedUsers: arrayUnion(uid)
      });
    } catch (e) {
      console.error("Erro ao adicionar convidado:", e);
      throw e;
    }
  },

  removeGuest: async (eventId, userObjectOrId) => {
    if (!eventId || !userObjectOrId) return;
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, {
        invitedUsers: arrayRemove(uid)
      });
    } catch (e) {
      console.error("Erro ao remover convidado:", e);
      throw e;
    }
  },

  deleteEvent: async (comumId, eventId) => {
    if (!eventId) return; 
    try {
      const docRef = doc(db, 'events_global', eventId);
      return await deleteDoc(docRef);
    } catch (error) {
      console.error("ERRO FIREBASE NA EXCLUSÃO:", error);
      throw error;
    }
  },

  /**
   * Atualiza a contagem na COLEÇÃO GLOBAL
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
        console.error("Erro ao sincronizar contagem:", e);
      }
    }, 600);
  },

  removeExtraInstrument: async (comumId, eventId, instId) => {
    if (!eventId || !instId) return;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, { 
        [`counts.${instId}`]: deleteField() 
      });
    } catch (e) {
      console.error("Erro ao remover extra:", e);
    }
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