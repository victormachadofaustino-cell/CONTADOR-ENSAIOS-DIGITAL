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

  /**
   * Cria um novo ensaio amarrado à Regional Ativa
   * LÓGICA BLUEPRINT: Agora ele captura um SNAPSHOT da configuração local da igreja.
   * Não há mais loops complexos de comparação com o "Nacional" no momento da criação.
   */
  createEvent: async (comumId, eventData) => {
    if (!comumId) throw new Error("ID da Localidade ausente.");
    const { type, date, responsavel, regionalId, comumNome } = eventData;
    
    let initialCounts = {};

    try {
      // 1. BUSCA O SNAPSHOT LOCAL (O que a igreja configurou como sua orquestra)
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
      const localSnap = await getDocs(localRef);
      
      // 2. MONTAGEM DO MAPA DE CONTAGEM INICIAL
      if (!localSnap.empty) {
        localSnap.docs.forEach(docInst => {
          const inst = docInst.data();
          const id = docInst.id;

          initialCounts[id] = {
            total: 0,
            comum: 0,
            enc: 0,
            irmaos: 0, // Suporte para o Card de Coral (Irmandade)
            irmas: 0,  // Suporte para o Card de Coral (Irmandade)
            name: inst.name || id.toUpperCase(),
            section: inst.section?.toUpperCase() || 'GERAL',
            evalType: inst.evalType || 'Sem'
          };
        });
      } else {
        // Fallback de Segurança: Se a igreja estiver "vazia", cria um objeto de contagem vazio
        console.warn("Aviso: Criando evento para comum sem instrumentos configurados.");
        initialCounts = {};
      }
      
    } catch (err) {
      console.error("Erro ao capturar snapshot de instrumentos para o novo evento:", err);
      // Mantém a criação do evento mesmo se a captura de instrumentos falhar (Resiliência)
    }
    
    // 3. PERSISTÊNCIA DO EVENTO (Multitenancy Hierárquico)
    return await addDoc(collection(db, 'comuns', comumId, 'events'), {
      type: type || 'Ensaio Local',
      date,
      responsavel: responsavel || 'Pendente',
      comumNome: comumNome || '',
      comumId: comumId, // Garante que o ID da comum esteja dentro do evento para referências cruzadas (Master)
      regionalId, 
      ata: { status: 'open' },
      counts: initialCounts, // Snapshot gravado: imutável para este ensaio específico
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
    
    // LOG DE AUDITORIA: Registra QUEM alterou O QUÊ e QUANDO (Padrão Enterprise)
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
      history: arrayUnion(logEntry) // Adiciona ao histórico sem sobrescrever o array anterior
    };

    if (customName) baseUpdate.name = customName; // Para instrumentos "Ad-hoc" criados na hora

    const fieldToUpdate = field === 'total_simples' ? 'total' : field;

    try {
      // Atualização atômica para não destruir outros campos do documento
      await setDoc(eventRef, { 
        counts: { 
          [instId]: { 
            ...baseUpdate,
            [fieldToUpdate]: val 
          } 
        } 
      }, { merge: true });
    } catch (e) {
      console.error("Erro ao atualizar contagem no Firestore:", e);
      throw new Error("Falha na sincronização com o servidor.");
    }
  },

  // Remove um instrumento extra da contagem (apenas deste ensaio)
  removeExtraInstrument: async (comumId, eventId, instId) => {
    if (!comumId || !eventId || !instId) return;
    const eventRef = doc(db, 'comuns', comumId, 'events', eventId);
    return await setDoc(eventRef, { 
      counts: { [instId]: deleteField() } // Remove a chave do mapa sem afetar a configuração da igreja
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
        // Filtra campos vazios para gerar uma lista limpa no banco
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
      console.error("Erro ao salvar Ata no Firestore:", e);
      throw new Error("Erro ao salvar os dados da Ata.");
    }
  }
};