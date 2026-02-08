import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion, increment } from "firebase/firestore";

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v3.2 - Arquitetura Global com Blindagem de Metadados
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
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, comumNome, cidadeId } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA O SNAPSHOT LOCAL
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      if (localSnap.empty) {
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados.");
        throw new Error("CONFIG_REQUIRED"); 
      }

      // 2. MONTAGEM DO MAPA DE CONTAGEM INICIAL + METADADOS DE SEÇÃO
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
          evalType: inst.evalType || 'Sem'
        };
      });

      // INICIALIZAÇÃO INTELIGENTE: Cria os metadados para cada seção da orquestra
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
    
    // 3. PERSISTÊNCIA NA COLEÇÃO GLOBAL (v3.1)
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
      dbVersion: "3.1-global-locking"
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
      // Capturamos o estado atual apenas para o log de histórico (Auditoria)
      const snap = await getDoc(eventRef);
      if (!snap.exists()) return;

      const currentInstData = snap.data()?.counts?.[instId] || {};
      const oldValue = parseInt(currentInstData[fieldToUpdate]) || 0;
      const diferenca = val - oldValue; // Calculamos quanto aumentou ou diminuiu
      
      // Histórico rotativo (mantém as últimas 10 alterações para auditoria)
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

      // BLINDAGEM CRÍTICA: O uso de increment() garante que a soma seja feita no servidor
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
    
    // 1. Extração de Hinos para estatística rápida
    let todosHinos = [];
    (ataData.partes || []).forEach(p => {
      if (p.hinos) {
        todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')];
      }
    });

    // 2. BLINDAGEM: Removemos campos que pertencem à RAIZ para não duplicar/conflitar dentro do objeto ATA
    // Isso evita que o PDF se confunda entre ata.date e a raiz date.
    const { date, comumId: cid, regionalId, cidadeId, ...ataLimpa } = ataData;

    const finalAta = {
      ...ataLimpa,
      hinosChamados: todosHinos.length,
      hinosLista: todosHinos,
      lastUpdate: Date.now()
    };

    try {
      // Usamos updateDoc para atualizar APENAS o mapa 'ata', preservando a raiz do documento intacta
      await updateDoc(eventRef, { 
        ata: finalAta 
      });
    } catch (e) {
      console.error("Erro ao salvar Ata:", e);
      throw new Error("Erro ao salvar os dados da Ata.");
    }
  }
};