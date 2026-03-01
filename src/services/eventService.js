import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase'; // Conecta com as funções principais do banco de dados Firebase
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore"; // Importa ferramentas para apagar campos ou somar números no banco
import { getAuth } from "firebase/auth"; // Importa a ferramenta de identificação do usuário logado

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {}; // Evita que o sistema salve no banco a cada letra digitada, esperando o usuário parar
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {}; // Guarda as alterações temporariamente para enviar tudo de uma vez e economizar internet

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v8.12.0 - FIX: Posse Individualizada e Soma Atômica no Objeto Mestre (Coral)
 * Resolve conflitos de concorrência entre contagem de irmãs e irmãos.
 */
export const eventService = { // Inicia o conjunto de funções de gerenciamento de ensaios

  /**
   * BUSCA USUÁRIOS DA REGIONAL
   */
  getUsersByRegional: async (regionalId) => { // Busca todos os usuários aprovados de uma determinada região
    if (!regionalId) return []; // Se não informar a região, retorna lista vazia
    try {
      const q = query( // Cria a pergunta para o banco de dados
        collection(db, 'users'), // Procura na pasta de usuários
        where('regionalId', '==', regionalId), // Onde a região for a mesma informada
        where('approved', '==', true) // E o usuário já estiver aprovado pelo administrador
      );
      const snap = await getDocs(q); // Executa a busca e guarda o resultado
      return snap.docs.map(d => ({ uid: d.id, ...d.data() })); // Transforma o resultado em uma lista legível
    } catch (e) {
      console.error("Erro ao buscar usuários da regional:", e); // Avisa no console se houver erro
      return []; // Retorna lista vazia em caso de falha
    }
  },

  // Escuta eventos da comum OU eventos onde o usuário é convidado (via UID string)
  subscribeToEvents: (comumId, userId, callback) => { // Fica "ouvindo" novos ensaios da igreja ou convites
    if (!comumId || !userId) return; // Se faltar informações, não inicia a escuta
    
    const q = query( // Cria a pergunta dinâmica para o banco
      collection(db, 'events_global'), // Procura na pasta global de eventos
      or( // Procura por uma coisa OU outra
        where('comumId', '==', comumId), // Ensaios da igreja do usuário
        where('invitedUsers', 'array-contains', userId) // Ou ensaios onde ele foi convidado para ajudar
      ),
      orderBy('date', 'desc') // Organiza pelos mais recentes primeiro
    );

    return onSnapshot(q, (snapshot) => { // Inicia a conexão em tempo real
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); // Transforma os dados do banco em lista
      callback(events); // Envia a lista para quem pediu (a tela de ensaios)
    }, (error) => {
      if (error.code === 'permission-denied') { // Se o acesso for retirado (ex: o ensaio acabou)
        console.warn("Sincronização encerrada: Acesso ao evento regional revogado ou finalizado."); // Avisa no sistema
        callback([]); // Limpa a lista na tela do usuário
      } else {
        console.error("Erro no Listener de Eventos Global:", error); // Avisa outros tipos de erro
      }
    });
  },

  /**
   * Cria um novo ensaio na Coleção Global
   */
  createEvent: async (comumId, eventData) => { // Função para abrir um novo ensaio no sistema
    if (!comumId) throw new Error("ID da Localidade ausente."); // Erro se não souber em qual igreja criar
    
    const auth = getAuth(); // Puxa as ferramentas de login
    const currentUser = auth.currentUser; // Identifica quem está criando o ensaio agora

    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData; // Extrai os dados enviados pela tela
    
    let initialCounts = {}; // Prepara o mapa inicial de contagem de instrumentos

    try {
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config'); // Referência da configuração da igreja
      const localSnap = await getDocs(localRef); // Busca quais instrumentos essa igreja costuma contar
      
      if (localSnap.empty) { // Se a igreja não tiver nenhum instrumento configurado
        console.warn("Bloqueio de conformidade: Comum sem instrumentos configurados."); // Avisa o erro
        throw new Error("CONFIG_REQUIRED"); // Pede para configurar os instrumentos antes
      }

      const sessoesDetectadas = new Set(); // Guarda os nomes das seções (ex: Cordas, Madeiras) sem repetir

      localSnap.docs.forEach(docInst => { // Para cada instrumento configurado na igreja
        const inst = docInst.data(); // Pega os dados do instrumento
        const id = docInst.id; // Pega o ID (nome técnico) do instrumento
        const sectionName = inst.section?.toUpperCase() || 'GERAL'; // Identifica a seção ou marca como Geral
        sessoesDetectadas.add(sectionName); // Adiciona na lista de seções daquele ensaio

        initialCounts[id] = { // Cria o contador zerado para aquele instrumento
          total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0,   // Inicia todos os campos com zero
          name: inst.name || id.toUpperCase(), // Define o nome que aparecerá na tela
          section: sectionName, // Define a qual grupo ele pertence
          evalType: inst.evalType || 'Sem', // Define se tem exame ou não
          responsibleId: null, // Sem responsável definido ainda
          responsibleName: null, // Sem nome de responsável
          updatedAt: Date.now() // Marca a hora da criação
        };
      });

      sessoesDetectadas.forEach(sec => { // Cria os campos de controle para cada seção (Cordas, Metais, etc)
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Cria um nome técnico para o controle da seção
        initialCounts[metaKey] = { // Dados de quem está contando aquela seção específica
          responsibleId: null, // ID do responsável pela seção
          responsibleName: null, // Nome do responsável
          isActive: false, // Se a contagem está ativa ou não
          updatedAt: Date.now() // Hora da última alteração
        };
      });
      
      const payload = { // Monta o pacote completo do ensaio para salvar no banco
        type: type || 'Ensaio Local', // Tipo do evento (Local ou Regional)
        scope: scope || 'local', // Alcance (Local ou Regional)
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], // Lista de pessoas convidadas para ajudar
        date, // Data do ensaio
        responsavel: responsavel || 'Pendente', // Nome do ancião responsável
        createdById: currentUser?.uid || null, // ID de quem criou o ensaio
        comumNome: comumNome || '', // Nome da igreja
        comumId: comumId, // ID da igreja
        cidadeId: cidadeId || '', // ID da cidade
        cidadeNome: cidadeNome || '', // Nome da cidade
        regionalId: regionalId || '', // ID da regional
        regionalNome: regionalNome || '', // Nome da regional
        ata: { // Inicia a Ata do ensaio em branco
          status: 'open', // Começa como aberta para edição
          palavra: { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' }, // Campos da pregação vazios
          ocorrencias: [] // Nenhuma ocorrência ainda
        },
        counts: initialCounts, // Coloca os contadores de instrumentos zerados
        createdAt: Date.now(), // Marca a hora que o ensaio nasceu no sistema
        dbVersion: "8.12.0-atomic-master" // Versão técnica do banco de dados
      };

      return await addDoc(collection(db, 'events_global'), payload); // Grava o ensaio no banco de dados global

    } catch (err) {
      console.error("Erro detalhado na criação do evento:", err); // Mostra o erro exato no console
      if (err.message === "CONFIG_REQUIRED") throw err; // Repassa erro de falta de configuração
      throw new Error("Falha ao inicializar evento."); // Avisa que não conseguiu criar
    }
  },

  /**
   * GESTÃO DE CONVIDADOS
   */
  addGuest: async (eventId, userObjectOrId) => { // Dá permissão para um GEM de fora ajudar no ensaio
    if (!eventId || !userObjectOrId) return; // Se faltar dados, ignora
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId; // Puxa o ID do usuário
    const eventRef = doc(db, 'events_global', eventId); // Referência do ensaio no banco
    try {
      return await updateDoc(eventRef, { // Adiciona o ID do convidado na lista autorizada
        invitedUsers: arrayUnion(uid) // Comando que adiciona sem repetir o nome
      });
    } catch (e) {
      console.error("Erro ao adicionar convidado:", e); // Avisa se der erro
      throw e; // Repassa o erro para a tela avisar o usuário
    }
  },

  removeGuest: async (eventId, userObjectOrId) => { // Retira a permissão de um convidado
    if (!eventId || !userObjectOrId) return; // Se faltar dados, ignora
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId; // Puxa o ID do usuário
    const eventRef = doc(db, 'events_global', eventId); // Referência do ensaio
    try {
      return await updateDoc(eventRef, { // Remove o ID da lista autorizada
        invitedUsers: arrayRemove(uid) // Comando que tira o nome da lista
      });
    } catch (e) {
      console.error("Erro ao remover convidado:", e); // Avisa erro no console
      throw e; // Repassa o erro
    }
  },

  deleteEvent: async (comumId, eventId) => { // Apaga um ensaio definitivamente (Cuidado!)
    if (!eventId) return; // Se não informar qual ensaio, para aqui
    try {
      const docRef = doc(db, 'events_global', eventId); // Localiza o ensaio no banco
      return await deleteDoc(docRef); // Executa a exclusão definitiva
    } catch (error) {
      console.error("ERRO FIREBASE NA EXCLUSÃO:", error); // Avisa falha na exclusão
      throw error; // Repassa erro
    }
  },

  /**
   * v8.12.0 - ATUALIZAÇÃO RESILIENTE COM SOMA ATÔMICA
   * Garante que contagens de irmãs e irmãos não se sobreponham no Coral.
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => { // Atualiza os números da contagem
    if (!eventId || !instId) return; // Se faltar dados, para

    const timerKey = `${eventId}_${instId}`; // Chave para controlar o tempo de salvamento deste instrumento
    const fieldToUpdate = field === 'total_simples' ? 'total' : field; // Define qual campo vai mudar (irmaos, irmas, total, etc)
    const val = Math.max(0, parseInt(value) || 0); // Garante que o número nunca seja menor que zero

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {}; // Cria um espaço temporário se não existir
    updateBuffers[timerKey][fieldToUpdate] = val; // Guarda o novo número no espaço temporário

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]); // Cancela o salvamento anterior se o usuário ainda está clicando

    debounceTimers[timerKey] = setTimeout(async () => { // Agenda o salvamento para daqui a 300 milisegundos
      const eventRef = doc(db, 'events_global', eventId); // Localiza o ensaio
      const bufferCopy = { ...updateBuffers[timerKey] }; // Faz uma cópia dos números para enviar
      
      try {
        const snap = await getDoc(eventRef); // Busca a versão mais atual do ensaio no banco
        if (!snap.exists()) throw new Error("EVENT_NOT_FOUND"); // Erro se o ensaio tiver sido apagado
        
        const counts = snap.data().counts || {}; // Pega todas as contagens atuais
        let targetId = instId; // Define qual instrumento vai receber a atualização

        // --- AMARRAÇÃO COMPULSÓRIA DA SEÇÃO MESTRE ---
        const sectionKey = (section || counts[instId]?.section || '').toUpperCase(); // Identifica a seção (ex: IRMANDADE)
        const isIrmandade = instId.toLowerCase() === 'irmas' || instId.toLowerCase() === 'irmaos' || sectionKey === 'IRMANDADE'; // Checa se é parte do Coral
        const isOrganistas = instId.toLowerCase() === 'orgao' || sectionKey === 'ORGANISTAS'; // Checa se é órgão
        
        if (isIrmandade || isOrganistas) { // Se for Coral ou Órgão, precisamos salvar no "objeto mestre"
          const mestreId = Object.keys(counts).find(key => 
            counts[key].section?.toUpperCase() === sectionKey && !key.startsWith('meta_')
          ) || (isIrmandade ? 'Coral' : 'orgao'); // Acha o ID principal (ex: Coral) em vez de salvar em 'irmas'
          
          targetId = mestreId; // Muda o destino para o instrumento mestre
        }

        const currentInstData = counts[targetId] || {}; // Pega os dados atuais desse instrumento
        const finalUpdates = {}; // Prepara a lista final de alterações para o banco
        const baseKey = `counts.${targetId}`; // Caminho técnico dentro do documento

        // Aplica o buffer ao objeto mestre
        Object.keys(bufferCopy).forEach(f => { // Para cada número que mudou
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; // Prepara para atualizar no banco
        });

        // RECALCULO ATÔMICO DE TOTAL (Dash/PDF)
        if (isIrmandade) { // Se for Coral, soma automaticamente irmãos + irmãs
          const vIrmaos = fieldToUpdate === 'irmaos' ? val : (currentInstData.irmaos || 0); // Pega número de irmãos
          const vIrmas = fieldToUpdate === 'irmas' ? val : (currentInstData.irmas || 0); // Pega número de irmãs
          finalUpdates[`${baseKey}.total`] = vIrmaos + vIrmas; // Salva a soma no campo Total
        }

        finalUpdates[`${baseKey}.lastEditBy`] = userData?.name || 'Sistema'; // Registra quem mexeu por último
        finalUpdates[`${baseKey}.timestamp`] = Date.now(); // Marca a hora exata
        finalUpdates[`${baseKey}.updatedAt`] = Date.now(); // Atualiza a data de modificação
        
        if (section) finalUpdates[`${baseKey}.section`] = section; // Atualiza a seção se mudar
        if (customName) finalUpdates[`${baseKey}.name`] = customName; // Atualiza o nome se mudar

        await updateDoc(eventRef, finalUpdates); // Envia todas as alterações de uma vez para o banco
        
      } catch (e) {
        console.error("Falha na atualização atômica v8.12.0:", e.message); // Avisa falha grave no console
      } finally {
        delete debounceTimers[timerKey]; // Limpa o timer de espera
        delete updateBuffers[timerKey]; // Limpa o espaço temporário
      }
    }, 300); // Fim do tempo de espera de 300ms
  },

  removeExtraInstrument: async (comumId, eventId, instId) => { // Remove um instrumento que foi adicionado extra
    if (!eventId || !instId) return; // Se faltar dados, ignora
    const eventRef = doc(db, 'events_global', eventId); // Referência do ensaio
    try {
      return await updateDoc(eventRef, { [`counts.${instId}`]: deleteField() }); // Comando para apagar o campo do banco
    } catch (e) {
      console.error("Erro ao remover extra:", e); // Avisa erro no console
    }
  },

  /**
   * Salva Ata na COLEÇÃO GLOBAL
   */
  saveAtaData: async (comumId, eventId, ataData) => { // Salva todos os textos e hinos da Ata
    if (!eventId) throw new Error("Referência de evento inválida."); // Erro se não souber qual ensaio salvar
    const eventRef = doc(db, 'events_global', eventId); // Localiza o ensaio no banco
    
    let todosHinos = []; // Prepara a lista para contar quantos hinos foram chamados
    (ataData.partes || []).forEach(p => { // Percorre cada parte do ensaio
      if (p.hinos) { // Se houver hinos anotados
        todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')]; // Adiciona na contagem geral
      }
    });

    const { date, comumId: cid, regionalId, cidadeId, ...ataLimpa } = ataData; // Limpa dados repetidos para não sujar o banco

    const finalAta = { // Monta o pacote final da Ata
      ...ataLimpa, // Inclui todos os campos de texto (Atendimento, Oração, etc)
      hinosChamados: todosHinos.length, // Salva a quantidade total de hinos
      hinosLista: todosHinos, // Salva a lista com os números dos hinos
      lastUpdate: Date.now() // Marca a hora da última alteração na Ata
    };

    try {
      await updateDoc(eventRef, { ata: finalAta }); // Envia a Ata completa para o banco de dados
    } catch (e) {
      console.error("Erro ao salvar Ata:", e); // Avisa falha no console
      throw new Error("Erro ao salvar os dados da Ata."); // Avisa o usuário na tela
    }
  }
};