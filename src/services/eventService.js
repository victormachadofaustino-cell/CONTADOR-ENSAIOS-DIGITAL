import { db, doc, setDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot } from '../firebase';
import { deleteField, arrayUnion } from "firebase/firestore";

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * Implementa Multitenancy e Auditoria de Dados
 */
export const eventService = {

  // Escuta os eventos de uma comum específica em tempo real
  subscribeToEvents: (comumId, callback) => {
    if (!comumId) return; // Trava de segurança contra ID nulo
    const q = query(collection(db, 'comuns', comumId, 'events'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      console.error("Erro no Listener de Eventos:", error);
    });
  },

  // Cria um novo ensaio
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel } = eventData;
    return await addDoc(collection(db, 'comuns', comumId, 'events'), {
      type: type || 'Ensaio Local',
      date,
      responsavel: responsavel || 'Pendente',
      ata: { status: 'open' },
      counts: {},
      createdAt: Date.now()
    });
  },

  // Exclui um ensaio e todos os seus dados
  deleteEvent: async (comumId, eventId) => {
    if (!comumId || !eventId) return;
    return await deleteDoc(doc(db, 'comuns', comumId, 'events', eventId));
  },

  /**
   * Atualiza a contagem de um instrumento e grava log de auditoria
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    // PROTEÇÃO CRÍTICA: Impede escritas em caminhos indefinidos (resquício de troca de contexto)
    if (!comumId || !eventId || !instId) {
      console.warn("Tentativa de atualização com IDs incompletos:", { comumId, eventId, instId });
      return; 
    }

    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    const val = Math.max(0, parseInt(value) || 0);
    const timestamp = Date.now();
    
    // Objeto de Log para auditoria (Quem, O que, Valor, Quando)
    const logEntry = {
      user: userData?.name || 'Sistema',
      field: field,
      newValue: val,
      time: timestamp
    };

    // Objeto base de metadados
    const baseUpdate = {
      lastEditBy: userData?.name || 'Sistema',
      timestamp: timestamp,
      section: section || 'Outros',
      // Adiciona o log ao array sem sobrescrever o histórico anterior
      history: arrayUnion(logEntry)
    };

    if (customName) baseUpdate.name = customName;

    // Mapeamento lógico de campos de contagem
    const fieldToUpdate = field === 'total_simples' ? 'total' : field;

    try {
      // Realiza a atualização atômica no Firestore
      await setDoc(eventRef, { 
        counts: { 
          [instId]: { 
            ...baseUpdate,
            [fieldToUpdate]: val 
          } 
        } 
      }, { merge: true });
    } catch (e) {
      console.error("Erro ao atualizar contagem:", e);
      throw new Error("Falha na sincronização com o servidor.");
    }
  },

  // Remove um instrumento extra da contagem
  removeExtraInstrument: async (comumId, eventId, instId) => {
    if (!comumId || !eventId || !instId) return;
    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    return await setDoc(eventRef, { 
      counts: { [instId]: deleteField() } 
    }, { merge: true });
  },

  /**
   * Salva os dados da Ata e processa metadados de hinos
   */
  saveAtaData: async (comumId, eventId, ataData) => {
    if (!comumId || !eventId) throw new Error("Referência de evento inválida.");
    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    
    // Processamento de hinos para estatísticas rápidas
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
      await setDoc(eventRef, { ata: finalAta }, { merge: true });
    } catch (e) {
      console.error("Erro ao salvar Ata:", e);
      throw new Error("Erro ao salvar os dados da Ata.");
    }
  }
};