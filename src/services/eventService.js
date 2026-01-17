import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion } from "firebase/firestore";

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * Implementa Multitenancy e Auditoria de Dados com Herança Nacional/Local
 */
export const eventService = {

  // Escuta os eventos de uma comum específica em tempo real
  subscribeToEvents: (comumId, callback) => {
    if (!comumId) return; 
    const q = query(collection(db, 'comuns', comumId, 'events'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      console.error("Erro no Listener de Eventos:", error);
    });
  },

  // Cria um novo ensaio amarrado à Regional Ativa e injeta instrumentos via Herança (Nacional + Local)
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, comumNome } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA PADRÃO NACIONAL (Base Saneada de 22 instrumentos)
      const nationalRef = collection(db, 'config_instrumentos_nacional');
      const nationalSnap = await getDocs(nationalRef);
      const instrumentosNacionais = nationalSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. BUSCA CONFIGURAÇÃO LOCAL DA COMUM
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      const instrumentosLocais = localSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. APLICA HERANÇA: Nacional como base, Local sobrescreve
      instrumentosNacionais.forEach(instBase => {
        // Verifica se existe uma sobrescrita local para este instrumento
        const override = instrumentosLocais.find(l => l.id === instBase.id);
        const finalInst = override ? { ...instBase, ...override } : instBase;

        initialCounts[finalInst.id] = {
          total: 0,
          comum: 0,
          enc: 0,
          irmas: 0,
          name: finalInst.name || finalInst.id.toUpperCase(),
          section: finalInst.section?.toUpperCase() || 'GERAL',
          evalType: finalInst.evalType || 'Sem'
        };
      });

      // 4. INCLUI INSTRUMENTOS EXCLUSIVOS DA COMUM (que não existem no nacional)
      instrumentosLocais.forEach(instLocal => {
        if (!initialCounts[instLocal.id]) {
          initialCounts[instLocal.id] = {
            total: 0,
            comum: 0,
            enc: 0,
            irmas: 0,
            name: instLocal.name.toUpperCase(),
            section: instLocal.section?.toUpperCase() || 'GERAL',
            evalType: instLocal.evalType || 'Sem'
          };
        }
      });
      
    } catch (err) {
      console.error("Erro ao processar herança de instrumentos para o novo evento:", err);
      // Mantém initialCounts vazio para permitir criação básica em caso de erro crítico de rede
    }
    
    return await addDoc(collection(db, 'comuns', comumId, 'events'), {
      type: type || 'Ensaio Local',
      date,
      responsavel: responsavel || 'Pendente',
      comumNome: comumNome || '',
      regionalId, 
      ata: { status: 'open' },
      counts: initialCounts,
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
   * Suporta campos dinâmicos (total, irmas, comum, enc)
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    if (!comumId || !eventId || !instId) {
      console.warn("Tentativa de atualização com IDs incompletos:", { comumId, eventId, instId });
      return; 
    }

    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    const val = Math.max(0, parseInt(value) || 0);
    const timestamp = Date.now();
    
    const logEntry = {
      user: userData?.name || 'Sistema',
      field: field,
      newValue: val,
      time: timestamp
    };

    const baseUpdate = {
      lastEditBy: userData?.name || 'Sistema',
      timestamp: timestamp,
      section: section || 'Outros',
      history: arrayUnion(logEntry)
    };

    if (customName) baseUpdate.name = customName;

    const fieldToUpdate = field === 'total_simples' ? 'total' : field;

    try {
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