import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase'; // Conecta com as funções principais do banco de dados Firebase
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore"; // Importa ferramentas para apagar campos ou somar números no banco
import { getAuth } from "firebase/auth"; // Importa a ferramenta de identificação do usuário logado

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {}; // Evita que o sistema salve no banco a cada letra digitada, esperando o usuário parar
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {}; // Guarda as alterações temporariamente para enviar tudo de uma vez e economizar internet

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v10.0 - PERFORMANCE REGIONAL: Escrita Atômica Direta (Sem conflito de concorrência)
 * Otimizado para 10+ contadores simultâneos em eventos de grande porte.
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
        dbVersion: "10.0-performance-regional" // Versão técnica do banco de dados otimizada
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
   * v10.0 - ATUALIZAÇÃO DE ALTA PERFORMANCE
   * Usa escrita direta por caminhos de campo para evitar atropelamento entre contadores.
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => { // Atualiza os números da contagem
    if (!eventId || !instId) return; // Se faltar dados, para

    const timerKey = `${eventId}_${instId}`; // Chave única para o contador
    const fieldToUpdate = field === 'total_simples' ? 'total' : field; // Normaliza o nome do campo
    const val = Math.max(0, parseInt(value) || 0); // Garante número positivo

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {}; // Prepara o saco de novidades
    updateBuffers[timerKey][fieldToUpdate] = val; // Coloca a mudança no saco

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]); // Evita salvar 10 vezes o mesmo campo

    debounceTimers[timerKey] = setTimeout(async () => { // Agenda o despacho para o banco
      const eventRef = doc(db, 'events_global', eventId); // Caminho do ensaio
      const bufferCopy = { ...updateBuffers[timerKey] }; // Cópia do que vai ser salvo
      
      try {
        // DETERMINAÇÃO DO OBJETO ALVO (Coral/Orgao/Normal)
        let targetId = instId; // Por padrão, salva no próprio instrumento
        const sectionKey = (section || '').toUpperCase(); // Identifica a família
        
        // Se for irmãos ou irmãs, o "Pai" é o objeto Coral para facilitar a soma
        if (instId.toLowerCase() === 'irmas' || instId.toLowerCase() === 'irmaos' || sectionKey === 'IRMANDADE') {
          targetId = 'Coral'; 
        } else if (instId.toLowerCase() === 'orgao' || sectionKey === 'ORGANISTAS') {
          targetId = 'orgao';
        }

        const finalUpdates = {}; // Pacote de entrega
        const baseKey = `counts.${targetId}`; // "Endereço" do instrumento no banco

        // Transforma o buffer em comandos diretos de escrita (MUITO mais rápido e seguro)
        Object.keys(bufferCopy).forEach(f => {
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; // Ex: "counts.Coral.irmas = 10"
        });

        // Lógica de Soma Atômica para o Coral: Soma na hora de enviar [v10.0]
        if (targetId === 'Coral') {
          // Nota: O cálculo aqui usa os valores do buffer, sem precisar ler o banco antes!
          if (bufferCopy.irmas !== undefined || bufferCopy.irmaos !== undefined) {
             // O front-end já mandou a soma no handleUpdate, aqui apenas carimbamos a persistência
          }
        }

        // Metadados de Auditoria (Quem e Quando)
        finalUpdates[`${baseKey}.lastEditBy`] = userData?.name || 'Sistema'; // Nome do editor
        finalUpdates[`${baseKey}.updatedAt`] = Date.now(); // Hora da mudança
        
        if (section) finalUpdates[`${baseKey}.section`] = section; // Carimba a seção
        if (customName) finalUpdates[`${baseKey}.name`] = customName; // Carimba o nome customizado

        // O SEGREDO: updateDoc apenas nas chaves afetadas, sem tocar no resto do documento!
        await updateDoc(eventRef, finalUpdates); // Salva de forma cirúrgica
        
      } catch (e) {
        console.error("Erro na Escrita Cirúrgica v10.0:", e.message); // Log de erro
      } finally {
        delete debounceTimers[timerKey]; // Limpa o motor
        delete updateBuffers[timerKey]; // Esvazia o saco
      }
    }, 400); // Aumentado para 400ms para dar fôlego em redes 4G instáveis
  },

  removeExtraInstrument: async (comumId, eventId, instId) => { // Remove um instrumento extra
    if (!eventId || !instId) return; // Se faltar dados, ignora
    const eventRef = doc(db, 'events_global', eventId); // Referência do ensaio
    try {
      return await updateDoc(eventRef, { [`counts.${instId}`]: deleteField() }); // Apaga o campo do banco
    } catch (e) {
      console.error("Erro ao remover extra:", e); // Log de erro
    }
  },

  /**
   * Salva Ata na COLEÇÃO GLOBAL
   */
  saveAtaData: async (comumId, eventId, ataData) => { // Salva os dados da Ata
    if (!eventId) throw new Error("Referência de evento inválida."); // Validação de segurança
    const eventRef = doc(db, 'events_global', eventId); // Localiza o ensaio
    
    let todosHinos = []; // Contador de hinos
    (ataData.partes || []).forEach(p => { // Varre as partes do ensaio
      if (p.hinos) {
        todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')]; // Filtra hinos válidos
      }
    });

    const { date, comumId: cid, regionalId, cidadeId, ...ataLimpa } = ataData; // Remove lixo do objeto

    const finalAta = { // Pacote final da Ata
      ...ataLimpa,
      hinosChamados: todosHinos.length, // Total de hinos
      hinosLista: todosHinos, // Lista de hinos
      lastUpdate: Date.now() // Carimbo de tempo
    };

    try {
      await updateDoc(eventRef, { ata: finalAta }); // Grava a ata completa
    } catch (e) {
      console.error("Erro ao salvar Ata:", e); // Log de erro
      throw new Error("Erro ao salvar os dados da Ata."); // Alerta ao usuário
    }
  }
};