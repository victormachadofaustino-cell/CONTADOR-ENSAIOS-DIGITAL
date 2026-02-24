import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase';
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {};
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {};

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v8.12.0 - FIX: Posse Individualizada e Soma Atômica no Objeto Mestre (Coral)
 * Resolve conflitos de concorrência entre contagem de irmãs e irmãos.
 */
export const eventService = {

  /**
   * BUSCA USUÁRIOS DA REGIONAL
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
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], 
        date,
        responsavel: responsavel || 'Pendente',
        createdById: currentUser?.uid || null,
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
        dbVersion: "8.12.0-atomic-master"
      };

      return await addDoc(collection(db, 'events_global'), payload);

    } catch (err) {
      console.error("Erro detalhado na criação do evento:", err);
      if (err.message === "CONFIG_REQUIRED") throw err;
      throw new Error("Falha ao inicializar evento.");
    }
  },

  /**
   * GESTÃO DE CONVIDADOS
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
   * v8.12.0 - ATUALIZAÇÃO RESILIENTE COM SOMA ATÔMICA
   * Garante que contagens de irmãs e irmãos não se sobreponham no Coral.
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    if (!eventId || !instId) return;

    const timerKey = `${eventId}_${instId}`;
    const fieldToUpdate = field === 'total_simples' ? 'total' : field;
    const val = Math.max(0, parseInt(value) || 0);

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {};
    updateBuffers[timerKey][fieldToUpdate] = val;

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]);

    debounceTimers[timerKey] = setTimeout(async () => {
      const eventRef = doc(db, 'events_global', eventId);
      const bufferCopy = { ...updateBuffers[timerKey] };
      
      try {
        const snap = await getDoc(eventRef);
        if (!snap.exists()) throw new Error("EVENT_NOT_FOUND");
        
        const counts = snap.data().counts || {};
        let targetId = instId;

        // --- AMARRAÇÃO COMPULSÓRIA DA SEÇÃO MESTRE ---
        const sectionKey = (section || counts[instId]?.section || '').toUpperCase();
        const isIrmandade = instId.toLowerCase() === 'irmas' || instId.toLowerCase() === 'irmaos' || sectionKey === 'IRMANDADE';
        const isOrganistas = instId.toLowerCase() === 'orgao' || sectionKey === 'ORGANISTAS';
        
        if (isIrmandade || isOrganistas) {
          const mestreId = Object.keys(counts).find(key => 
            counts[key].section?.toUpperCase() === sectionKey && !key.startsWith('meta_')
          ) || (isIrmandade ? 'Coral' : 'orgao');
          
          targetId = mestreId;
        }

        const currentInstData = counts[targetId] || {};
        const finalUpdates = {};
        const baseKey = `counts.${targetId}`;

        // Aplica o buffer ao objeto mestre
        Object.keys(bufferCopy).forEach(f => {
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f];
        });

        // RECALCULO ATÔMICO DE TOTAL (Dash/PDF)
        if (isIrmandade) {
          // Usa o valor do banco como base se o campo não estiver no buffer atual
          const vIrmaos = fieldToUpdate === 'irmaos' ? val : (currentInstData.irmaos || 0);
          const vIrmas = fieldToUpdate === 'irmas' ? val : (currentInstData.irmas || 0);
          finalUpdates[`${baseKey}.total`] = vIrmaos + vIrmas;
        }

        finalUpdates[`${baseKey}.lastEditBy`] = userData?.name || 'Sistema';
        finalUpdates[`${baseKey}.timestamp`] = Date.now();
        finalUpdates[`${baseKey}.updatedAt`] = Date.now();
        
        if (section) finalUpdates[`${baseKey}.section`] = section;
        if (customName) finalUpdates[`${baseKey}.name`] = customName;

        await updateDoc(eventRef, finalUpdates);
        
      } catch (e) {
        console.error("Falha na atualização atômica v8.12.0:", e.message);
      } finally {
        delete debounceTimers[timerKey];
        delete updateBuffers[timerKey];
      }
    }, 300); 
  },

  removeExtraInstrument: async (comumId, eventId, instId) => {
    if (!eventId || !instId) return;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, { [`counts.${instId}`]: deleteField() });
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
      await updateDoc(eventRef, { ata: finalAta });
    } catch (e) {
      console.error("Erro ao salvar Ata:", e);
      throw new Error("Erro ao salvar os dados da Ata.");
    }
  }
};