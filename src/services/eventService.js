import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch } from '../config/firebase';
import { deleteField, arrayUnion } from "firebase/firestore";

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * Implementa Multitenancy e Auditoria de Dados com Herança Nacional/Local
 * Saneado para performance em escala nacional (166 comuns)
 */
export const eventService = {

  // Escuta os eventos de uma comum específica em tempo real
  subscribeToEvents: (comumId, callback) => {
    if (!comumId) return; 
    const q = query(collection(db, 'comuns', comumId, 'events'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return; // Otimização: ignora ecos locais
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(events);
    }, (error) => {
      console.error("Erro no Listener de Eventos:", error);
    });
  },

  /**
   * Cria um novo ensaio amarrado à Regional Ativa
   * LÓGICA BLUEPRINT: Captura um SNAPSHOT da configuração local da igreja.
   * DIRETRIZ: Se não houver configuração, interrompe para forçar a criação manual.
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, comumNome, cidadeId } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA O SNAPSHOT LOCAL (O que a igreja configurou como sua orquestra)
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      // 2. VALIDAÇÃO DE GOVERNANÇA: Bloqueia criação se a orquestra local não existir
      if (localSnap.empty) {
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados.");
        throw new Error("CONFIG_REQUIRED"); 
      }

      // 3. MONTAGEM DO MAPA DE CONTAGEM INICIAL (SNAPSHOT IMUTÁVEL)
      localSnap.docs.forEach(docInst => {
        const inst = docInst.data();
        const id = docInst.id;

        initialCounts[id] = {
          total: 0,
          comum: 0,
          enc: 0,
          irmaos: 0, 
          irmas: 0,  
          name: inst.name || id.toUpperCase(),
          section: inst.section?.toUpperCase() || 'GERAL',
          evalType: inst.evalType || 'Sem'
        };
      });
      
    } catch (err) {
      if (err.message === "CONFIG_REQUIRED") throw err;
      console.error("Erro ao capturar instrumentos para o novo evento:", err);
      throw new Error("Falha ao acessar configuração da localidade.");
    }
    
    // 4. PERSISTÊNCIA DO EVENTO (Multitenancy Hierárquico)
    return await addDoc(collection(db, 'comuns', comumId, 'events'), {
      type: type || 'Ensaio Local',
      date,
      responsavel: responsavel || 'Pendente',
      comumNome: comumNome || '',
      comumId: comumId, // Garante integridade para buscas Master
      cidadeId: cidadeId || '',
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
   * Implementado controle de tamanho de histórico para evitar latência.
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => {
    if (!comumId || !eventId || !instId) {
      console.warn("Tentativa de atualização com IDs incompletos.");
      return; 
    }

    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    const val = Math.max(0, parseInt(value) || 0);
    const timestamp = Date.now();
    
    // LOG DE AUDITORIA: Registra QUEM alterou O QUÊ e QUANDO
    const logEntry = {
      user: userData?.name || 'Sistema',
      field: field,
      newValue: val,
      time: timestamp
    };

    const fieldToUpdate = field === 'total_simples' ? 'total' : field;

    try {
      // Busca estado atual para limitar histórico (Performance Fix)
      const snap = await getDoc(eventRef);
      const currentInstData = snap.data()?.counts?.[instId] || {};
      let history = currentInstData.history || [];
      
      // Mantém apenas as últimas 10 alterações para não estourar o limite do documento
      history.push(logEntry);
      if (history.length > 10) history = history.slice(-10);

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
      console.error("Erro ao atualizar contagem no Firestore:", e);
      throw new Error("Falha na sincronização.");
    }
  },

  // Remove um instrumento extra da contagem (apenas deste ensaio)
  removeExtraInstrument: async (comumId, eventId, instId) => {
    if (!comumId || !eventId || !instId) return;
    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    return await updateDoc(eventRef, { 
      [`counts.${instId}`]: deleteField() 
    });
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
      await updateDoc(eventRef, { ata: finalAta });
    } catch (e) {
      console.error("Erro ao salvar Ata no Firestore:", e);
      throw new Error("Erro ao salvar os dados da Ata.");
    }
  }
};