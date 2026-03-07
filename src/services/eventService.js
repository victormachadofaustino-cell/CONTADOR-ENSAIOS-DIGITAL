import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase'; // Explicação: Conecta com as funções principais do banco de dados Firebase.
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore"; // Explicação: Importa ferramentas para apagar campos ou somar números no banco.
import { getAuth } from "firebase/auth"; // Explicação: Importa a ferramenta de identificação do usuário logado.
import { PERMISSIONS_MAP, ROLES } from '../config/permissions'; // Explicação: Importa a nossa nova "Regra de Ouro" para validar os poderes de cada usuário.

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {}; // Explicação: Evita que o sistema salve no banco a cada letra digitada, esperando o usuário parar.
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {}; // Explicação: Guarda as alterações temporariamente para enviar tudo de uma vez e economizar internet.

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v10.7 - FILTRO SOBERANO PARA MASTER E COMISSÃO
 */
export const eventService = { // Explicação: Inicia o conjunto de funções de gerenciamento de ensaios.

  /**
   * BUSCA USUÁRIOS DA REGIONAL
   */
  getUsersRegional: async (regionalId) => { // Explicação: Busca todos os usuários aprovados de uma determinada região.
    if (!regionalId) return []; // Explicação: Se não informar a região, retorna lista vazia para não dar erro.
    try {
      const q = query( // Explicação: Cria a pergunta para o banco de dados.
        collection(db, 'users'), // Explicação: Procura na pasta de usuários.
        where('regionalId', '==', regionalId), // Explicação: Onde a região for a mesma informada no crachá.
        where('approved', '==', true) // Explicação: E o usuário já estiver com o carimbo de "aprovado".
      );
      const snap = await getDocs(q); // Explicação: Executa a busca e guarda o resultado.
      return snap.docs.map(d => ({ uid: d.id, ...d.data() })); // Explicação: Transforma o resultado em uma lista organizada com nomes e IDs.
    } catch (e) {
      console.error("Erro ao buscar usuários da regional:", e); // Explicação: Avisa no console do navegador se houver erro técnico.
      return []; // Explicação: Retorna lista vazia em caso de falha para não travar a tela.
    }
  },

  // v10.7: Escuta eventos aplicando o Filtro Geográfico OBRIGATÓRIO (Master/Comissão)
  subscribeToEvents: (user, callback) => { // Explicação: Fica "ouvindo" novos ensaios respeitando o limite do seu nível de acesso.
    if (!user || !user.uid) return; // Explicação: Se o usuário não estiver identificado, não inicia a conexão.
    
    let constraints = []; // Explicação: Prepara a lista de filtros que serão aplicados no banco.

    // v10.7: Lógica de Filtro em Cascata para Master e Comissão
    // Explicação: Se o gestor escolheu uma igreja ou se o sistema iniciou com a de cadastro, foca nela.
    if (user.activeComumId || user.comumId) {
      constraints.push(where('comumId', '==', user.activeComumId || user.comumId));
    } 
    // Explicação: Se não tem igreja no Pill, mas tem cidade, foca na cidade.
    else if (user.activeCityId || user.cidadeId) {
      constraints.push(where('cidadeId', '==', user.activeCityId || user.cidadeId));
    } 
    // Explicação: Se for Master/Comissão e não escolheu nada, foca na Regional para não trazer o mundo todo.
    else if (user.activeRegionalId || user.regionalId) {
      constraints.push(where('regionalId', '==', user.activeRegionalId || user.regionalId));
    }

    // Explicação: Regra específica para GEM Local (Igreja própria + Convidados).
    if (user.accessLevel === ROLES.GEM) {
      constraints = [or(
        where('comumId', '==', user.comumId), 
        where('invitedUsers', 'array-contains', user.uid)
      )];
    }

    const q = query( // Explicação: Monta a pergunta final para o Firebase respeitando os filtros de GPS acima.
      collection(db, 'events_global'), 
      ...constraints, 
      orderBy('date', 'desc') 
    );

    return onSnapshot(q, (snapshot) => { // Explicação: Mantém a conexão aberta para atualizações automáticas.
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); 
      callback(events); 
    }, (error) => {
      console.error("Erro no Listener de Eventos Global:", error); 
    });
  },

  /**
   * Cria um novo ensaio com Estrutura de Ata e Metadados Blindados
   */
  createEvent: async (comumId, eventData) => { // Explicação: Função para abrir um novo ensaio no sistema.
    if (!comumId) throw new Error("ID da Localidade ausente."); // Explicação: Impede a criação se a igreja não for identificada.
    
    const auth = getAuth(); 
    const currentUser = auth.currentUser; 

    if (eventData.scope === 'regional' && eventData.accessLevel === ROLES.GEM) { 
      throw new Error("Seu nível de acesso não permite criar eventos regionais."); 
    }

    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData; 
    let initialCounts = {}; 

    try {
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config'); 
      const localSnap = await getDocs(localRef); 
      
      if (localSnap.empty) { 
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
      
      const payload = { // Explicação: Monta o documento com status da ata protegido.
        type: type || 'Ensaio Local', 
        scope: scope || 'local', 
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], 
        date, 
        responsavel: responsavel || 'Pendente', 
        createdById: currentUser?.uid || null, 
        createdByLevel: eventData.accessLevel || 'basico', 
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
        updatedAt: Date.now(), 
        dbVersion: "10.4-stabilized" 
      };

      return await addDoc(collection(db, 'events_global'), payload); 

    } catch (err) {
      console.error("Erro na criação do evento:", err);
      if (err.message === "CONFIG_REQUIRED") throw err;
      throw new Error("Falha ao inicializar evento.");
    }
  },

  reopenAta: async (eventId) => { // Explicação: Função para gestores abrirem a ata novamente.
    if (!eventId) return; 
    const eventRef = doc(db, 'events_global', eventId); 
    try {
      return await updateDoc(eventRef, { "ata.status": "open", updatedAt: Date.now() }); 
    } catch (e) {
      throw new Error("Sem permissão para reabrir."); 
    }
  },

  /**
   * GESTÃO DE CONVIDADOS
   */
  addGuest: async (eventId, userObjectOrId) => { // Explicação: Autoriza colaborador externo.
    if (!eventId || !userObjectOrId) return;
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, { invitedUsers: arrayUnion(uid), updatedAt: Date.now() });
    } catch (e) { console.error("Erro convidado:", e); }
  },

  removeGuest: async (eventId, userObjectOrId) => { // Explicação: Remove autorização externa.
    if (!eventId || !userObjectOrId) return;
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId;
    const eventRef = doc(db, 'events_global', eventId);
    try {
      return await updateDoc(eventRef, { invitedUsers: arrayRemove(uid), updatedAt: Date.now() });
    } catch (e) { console.error("Erro remover convidado:", e); }
  },

  // v10.5: FUNÇÃO DE EXCLUSÃO CORRIGIDA E BLINDADA
  deleteEvent: async (comumId, eventId) => { // Explicação: Tenta apagar o ensaio do banco de dados definitivamente.
    if (!eventId) throw new Error("ID do evento não fornecido."); 
    try {
      const eventRef = doc(db, 'events_global', eventId); 
      await deleteDoc(eventRef); 
      return true; 
    } catch (error) {
      console.error("ERRO_SERVICE_DELETE:", error.message); 
      throw new Error("PERMISSAO_NEGADA_OU_FALHA_REDE"); 
    }
  },

  /**
   * ATUALIZAÇÃO DE CONTAGEM (COM BLINDAGEM ANTI-PISCA)
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
      
      delete updateBuffers[timerKey]; 
      delete debounceTimers[timerKey];

      try {
        let targetId = instId; 
        const sectionKey = (section || '').toUpperCase();
        
        if (instId.toLowerCase() === 'irmas' || instId.toLowerCase() === 'irmaos' || sectionKey === 'IRMANDADE') {
          targetId = 'Coral'; 
        } else if (instId.toLowerCase() === 'orgao' || sectionKey === 'ORGANISTAS') {
          targetId = 'orgao';
        }

        const finalUpdates = {};
        const baseKey = `counts.${targetId}`;

        Object.keys(bufferCopy).forEach(f => {
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; 
        });

        finalUpdates[`${baseKey}.updatedAt`] = Date.now();
        finalUpdates[`updatedAt`] = Date.now(); 
        
        await updateDoc(eventRef, finalUpdates); 
        
      } catch (e) {
        console.error("Erro na Gravação Stabilizada:", e.message);
      }
    }, 400); 
  },

  removeExtraInstrument: async (comumId, eventId, instId) => { // Explicação: Remove instrumento extra.
    if (!eventId || !instId) return;
    try {
      return await updateDoc(doc(db, 'events_global', eventId), { [`counts.${instId}`]: deleteField(), updatedAt: Date.now() }); 
    } catch (e) {}
  },

  /**
   * Salva Ata com limpeza de dados
   */
  saveAtaData: async (comumId, eventId, ataData) => { // Explicação: Salva hinos e pregação.
    if (!eventId) throw new Error("Evento inválido.");
    const eventRef = doc(db, 'events_global', eventId);
    
    let todosHinos = [];
    (ataData.partes || []).forEach(p => { 
      if (p.hinos) todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')];
    });

    const finalAta = { 
      ...ataData,
      hinosChamados: todosHinos.length, 
      hinosLista: todosHinos, 
      lastUpdate: Date.now(),
      status: ataData.status || 'open' 
    };

    try {
      await updateDoc(eventRef, { ata: finalAta, updatedAt: Date.now() }); 
    } catch (e) {
      console.error("Erro salvar Ata:", e);
      throw new Error("Erro de salvamento.");
    }
  }
};