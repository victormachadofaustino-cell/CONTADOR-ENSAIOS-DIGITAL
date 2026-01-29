import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion } from "firebase/firestore";

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v3.0 - Arquitetura Global de Alta Performance
 * Implementa Multitenancy e Auditoria de Dados com Herança Nacional/Local
 */
export const eventService = {

  // Escuta os eventos de uma comum específica na COLEÇÃO GLOBAL
  subscribeToEvents: (comumId, callback) => {
    if (!comumId) return; 
    // MUDANÇA: Agora filtra por comumId dentro da events_global
    const q = query(
      collection(db, 'events_global'), 
      where('comumId', '==', comumId), 
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return; 
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      console.error("Erro no Listener de Eventos Global:", error);
    });
  },

  /**
   * Cria um novo ensaio na Coleção Global
   * LÓGICA BLUEPRINT: Captura um SNAPSHOT da configuração local da igreja pai.
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, comumNome, cidadeId } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA O SNAPSHOT LOCAL (A orquestra continua configurada dentro da Comum)
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      if (localSnap.empty) {
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados.");
        throw new Error("CONFIG_REQUIRED"); 
      }

      // 2. MONTAGEM DO MAPA DE CONTAGEM INICIAL
      localSnap.docs.forEach(docInst => {
        const inst = docInst.data();
        const id = docInst.id;

        initialCounts[id] = {
          total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0,  
          name: inst.name || id.toUpperCase(),
          section: inst.section?.toUpperCase() || 'GERAL',
          evalType: inst.evalType || 'Sem'
        };
      });
      
    } catch (err) {
      if (err.message === "CONFIG_REQUIRED") throw err;
      console.error("Erro ao capturar instrumentos:", err);
      throw new Error("Falha ao acessar configuração da localidade.");
    }
    
    // 3. PERSISTÊNCIA NA COLEÇÃO GLOBAL (v3.0)
    return await addDoc(collection(db, 'events_global'), {
      type: type || 'Ensaio Local',
      date,
      responsavel: responsavel || 'Pendente',
      comumNome: comumNome || '',
      comumId: comumId,
      cidadeId: cidadeId || '',
      regionalId: regionalId || '',
      ata: { status: 'open' },
      counts: initialCounts, 
      createdAt: Date.now(),
      dbVersion: "3.0-global"
    });
  },

  // Exclui um ensaio da coleção global
  deleteEvent: async (comumId, eventId) => {
    if (!eventId) return; 
    return await deleteDoc(doc(db, 'events_global', eventId));
  },

  /**
   * Atualiza a contagem na COLEÇÃO GLOBAL
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    if (!eventId || !instId) {
      console.warn("Tentativa de atualização com IDs incompletos.");
      return; 
    }

    // MUDANÇA: Referência direta à events_global
    const eventRef = doc(db, 'events_global', eventId);
    const val = Math.max(0, parseInt(value) || 0);
    const timestamp = Date.now();
    
    const logEntry = {
      user: userData?.name || 'Sistema',
      field: field,
      newValue: val,
      time: timestamp
    };

    const fieldToUpdate = field === 'total_simples' ? 'total' : field;

    try {
      const snap = await getDoc(eventRef);
      const currentInstData = snap.data()?.counts?.[instId] || {};
      let history = currentInstData.history || [];
      
      if (history.length > 10) history = history.slice(-10);
      history.push(logEntry);

      const baseUpdate = {
        lastEditBy: userData?.name || 'Sistema',
        timestamp: timestamp,
        section: section || currentInstData.section || 'Outros',
        history: history 
      };

      if (customName) baseUpdate.name = customName;

      await updateDoc(eventRef, { 
        [`counts.${instId}`]: { 
          ...currentInstData,
          ...baseUpdate,
          [fieldToUpdate]: val 
        } 
      });
    } catch (e) {
      console.error("Erro ao atualizar contagem:", e);
      throw new Error("Falha na sincronização.");
    }
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

    const finalAta = {
      ...ataData,
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