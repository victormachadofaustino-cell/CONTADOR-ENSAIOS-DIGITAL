import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {};
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {};

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v7.9 - Protocolo de Diagnóstico e Carimbagem de Identidade
 * Adicionado console.error para visibilidade de falhas ocultas.
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
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    
    // Captura o usuário logado para carimbar a autoria (Essencial para exclusão posterior)
    const auth = getAuth();
    const currentUser = auth.currentUser;

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

      sessoesDetectadas.forEach(sec => {
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
        initialCounts[metaKey] = {
          responsibleId: null,
          responsibleName: null,
          isActive: false,
          updatedAt: Date.now()
        };
      });
      
      // 3. PERSISTÊNCIA NA COLEÇÃO GLOBAL COM CARIMBAGEM
      const payload = {
        type: type || 'Ensaio Local',
        scope: scope || 'local', 
        invitedUsers: invitedUsers || [], 
        date,
        responsavel: responsavel || 'Pendente',
        createdById: currentUser?.uid || null, // Carimbo de quem criou (Proteção GEM)
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
        dbVersion: "7.9-identity-stamped"
      };

      return await addDoc(collection(db, 'events_global'), payload);

    } catch (err) {
      console.error("Erro detalhado na criação do evento:", err); // Agora aparece no console!
      if (err.message === "CONFIG_REQUIRED") throw err;
      throw new Error("Falha ao inicializar evento.");
    }
  },

  /**
   * GESTÃO DE CONVIDADOS
   */
  addGuest: async (eventId, userId) => {
    if (!eventId || !userId) return;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, {
        invitedUsers: arrayUnion(userId)
      });
    } catch (e) {
      console.error("Erro ao adicionar convidado:", e);
      throw e;
    }
  },

  removeGuest: async (eventId, userId) => {
    if (!eventId || !userId) return;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, {
        invitedUsers: arrayRemove(userId)
      });
    } catch (e) {
      console.error("Erro ao remover convidado:", e);
      throw e;
    }
  },

  // Exclui um ensaio da coleção global
  deleteEvent: async (comumId, eventId) => {
    if (!eventId) return; 
    try {
      const docRef = doc(db, 'events_global', eventId);
      return await deleteDoc(docRef);
    } catch (error) {
      console.error("ERRO FIREBASE NA EXCLUSÃO:", error); // Crucial para o diagnóstico!
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