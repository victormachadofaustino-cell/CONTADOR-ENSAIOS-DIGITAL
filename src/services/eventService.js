import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore";

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v4.0 - Suporte a Ensaios Regionais, Colaboração Individual e Whitelist Dinâmica
 * Implementa Multitenancy e Auditoria de Dados com Herança Nacional/Local
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
      if (snapshot.metadata.hasPendingWrites) return; 
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      console.error("Erro no Listener de Eventos Global:", error);
    });
  },

  /**
   * Cria um novo ensaio na Coleção Global
   * LÓGICA BLUEPRINT: Captura um SNAPSHOT da configuração local e inicializa metadados de sessão.
   * v4.0: Inicialização de posse individual por instrumento e campos litúrgicos.
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, comumNome, cidadeId, scope, invitedUsers } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA O SNAPSHOT LOCAL
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      if (localSnap.empty) {
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados.");
        throw new Error("CONFIG_REQUIRED"); 
      }

      // 2. MONTAGEM DO MAPA DE CONTAGEM INICIAL + METADADOS DE POSSE INDIVIDUAL
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
          // v4.0: Metadados de posse por instrumento para colaboração picada
          responsibleId: null,
          responsibleName: null,
          updatedAt: Date.now()
        };
      });

      // INICIALIZAÇÃO DE SEÇÕES: Cria os metadados para controle de naipe completo
      sessoesDetectadas.forEach(sec => {
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`;
        initialCounts[metaKey] = {
          responsibleId: null,
          responsibleName: null,
          isActive: false,
          updatedAt: Date.now()
        };
      });
      
    } catch (err) {
      if (err.message === "CONFIG_REQUIRED") throw err;
      console.error("Erro ao capturar instrumentos:", err);
      throw new Error("Falha ao acessar configuração da localidade.");
    }
    
    // 3. PERSISTÊNCIA NA COLEÇÃO GLOBAL (v4.0)
    return await addDoc(collection(db, 'events_global'), {
      type: type || 'Ensaio Local',
      scope: scope || 'local', 
      invitedUsers: invitedUsers || [], 
      date,
      responsavel: responsavel || 'Pendente',
      comumNome: comumNome || '',
      comumId: comumId,
      cidadeId: cidadeId || '',
      regionalId: regionalId || '',
      ata: { 
        status: 'open',
        palavra: {
          anciao: '',
          livro: '',
          capitulo: '',
          verso: '',
          assunto: ''
        },
        ocorrencias: [] // Inicializa array de ocorrências como texto livre
      },
      counts: initialCounts, 
      createdAt: Date.now(),
      dbVersion: "4.0-global-regional-colab"
    });
  },

  /**
   * GESTÃO DE CONVIDADOS (Whitelist Dinâmica)
   * Permite adicionar ou remover colaboradores com o ensaio em andamento.
   */
  addGuest: async (eventId, userId) => {
    if (!eventId || !userId) return;
    const eventRef = doc(db, 'events_global', eventId);
    return await updateDoc(eventRef, {
      invitedUsers: arrayUnion(userId)
    });
  },

  removeGuest: async (eventId, userId) => {
    if (!eventId || !userId) return;
    const eventRef = doc(db, 'events_global', eventId);
    return await updateDoc(eventRef, {
      invitedUsers: arrayRemove(userId)
    });
  },

  // Exclui um ensaio da coleção global
  deleteEvent: async (comumId, eventId) => {
    if (!eventId) return; 
    return await deleteDoc(doc(db, 'events_global', eventId));
  },

  /**
   * Atualiza a contagem na COLEÇÃO GLOBAL
   * v4.0 - Blindagem Atômica: Implementado 'increment' para evitar perda de dados por concorrência
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    if (!eventId || !instId) {
      console.warn("Tentativa de atualização com IDs incompletos.");
      return; 
    }

    const eventRef = doc(db, 'events_global', eventId);
    const val = parseInt(value) || 0;
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
      if (!snap.exists()) return;

      const currentInstData = snap.data()?.counts?.[instId] || {};
      const oldValue = parseInt(currentInstData[fieldToUpdate]) || 0;
      const diferenca = val - oldValue; 
      
      let history = currentInstData.history || [];
      if (history.length >= 10) history = history.slice(-9);
      history.push(logEntry);

      const baseUpdate = {
        lastEditBy: userData?.name || 'Sistema',
        timestamp: timestamp,
        section: section || currentInstData.section || 'GERAL',
        history: history 
      };

      if (customName) baseUpdate.name = customName;

      await updateDoc(eventRef, { 
        [`counts.${instId}.lastEditBy`]: baseUpdate.lastEditBy,
        [`counts.${instId}.timestamp`]: baseUpdate.timestamp,
        [`counts.${instId}.section`]: baseUpdate.section,
        [`counts.${instId}.history`]: baseUpdate.history,
        [`counts.${instId}.${fieldToUpdate}`]: increment(diferenca)
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
   * AJUSTE v3.2: Proteção de Metadados da Raiz
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