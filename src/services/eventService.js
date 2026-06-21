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
 * v11.3 - STABILIZED SERVICE WITH HIERARCHICAL MANAGEMENT
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
    if (user.activeComumId || user.comumId) {
      constraints.push(where('comumId', '==', user.activeComumId || user.comumId));
    } 
    else if (user.activeCityId || user.cidadeId) {
      constraints.push(where('cidadeId', '==', user.activeCityId || user.cidadeId));
    } 
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
   * Cria um novo ensaio com Estrutura de Ata e Metadados Blindados e Enxutos (Lean)
   */
  createEvent: async (comumId, eventData) => { // Explicação: Função para abrir um novo ensaio no sistema.
    if (!comumId) throw new Error("ID da Localidade ausente."); // Explicação: Impede a criação se a igreja não for identificada.
    
    const auth = getAuth(); // Explicação: Invoca o sistema de autenticação de usuários do Firebase.
    const currentUser = auth.currentUser; // Explicação: Captura o usuário ativo que está comandando a criação do evento.

    if (eventData.scope === 'regional' && eventData.accessLevel === ROLES.GEM) { // Explicação: Impede que administradores locais criem eventos de nível regional.
      throw new Error("Seu nível de acesso não permite criar eventos regionais."); // Explicação: Estoura o erro de veto de permissão.
    }

    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData; // Explicação: Desestrutura o pacote de metadados geográficos recebido da interface.
    let initialCounts = {}; // Explicação: Prepara o objeto vazio onde montaremos a orquestra inicial do ensaio.

    try {
      const localRef = collection(db, 'comuns', comumId, 'instrumentos_config'); // Explicação: Acessa o endereço da subcoleção de instrumentos salvos daquela igreja.
      const localSnap = await getDocs(localRef); // Explicação: Lê a lista de instrumentos que aquela igreja específica possui autorizada.
      
      if (localSnap.empty) { // Explicação: Se a igreja estiver vazia sem nenhum instrumento configurado.
        throw new Error("CONFIG_REQUIRED"); // Explicação: Dispara o aviso para exigir o reset padrão na tela.
      }

      const sessoesDetectadas = new Set(); // Explicação: Cria uma lista de naipes única para não repetir chaves de controle de seções.

      localSnap.docs.forEach(docInst => { // Explicação: Varre cada documento de instrumento retornado do cadastro da igreja.
        const inst = docInst.data(); // Explicação: Extrai o conteúdo interno do cadastro do instrumento.
        const id = docInst.id; // Explicação: Captura o ID por extenso imutável saneado (ex: 'flauta', 'Coral').
        const sectionName = inst.section?.toUpperCase() || 'GERAL'; // Explicação: Descobre a seção em letras maiúsculas ou joga no naipe geral.
        sessoesDetectadas.add(sectionName); // Explicação: Adiciona o naipe na lista de controle de abas da tela.

        // Explicação: PRESERVAÇÃO E HIGIENE DE ESCOPO: Mapeia Coral/Órgão e Instrumentos comuns adaptando as propriedades ao nível local ou regional.
        if (id === 'Coral' || id === 'orgao') {
          if (scope === 'regional') {
            initialCounts[id] = { 
              total: 0,
              name: inst.name || id.toUpperCase(), 
              section: sectionName, 
              evalType: inst.evalType || 'Sem', 
              responsibleId: null, 
              responsibleName: null,
              updatedAt: Date.now() 
            };
            if (id === 'Coral') {
              initialCounts[id].irmaos = 0;
              initialCounts[id].irmas = 0;
              initialCounts[id].responsibleId_irmaos = null;
              initialCounts[id].responsibleId_irmas = null;
              initialCounts[id].responsibleName_irmaos = null;
              initialCounts[id].responsibleName_irmas = null;
            }
          } else {
            initialCounts[id] = { 
              total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0, 
              name: inst.name || id.toUpperCase(), 
              section: sectionName, 
              evalType: inst.evalType || 'Sem', 
              responsibleId: null, 
              responsibleName: null,
              updatedAt: Date.now() 
            };
          }
        } else {
          if (scope === 'regional') {
            initialCounts[id] = { 
              total: 0, 
              updatedAt: Date.now() 
            };
          } else {
            initialCounts[id] = { 
              total: 0, 
              comum: 0, 
              enc: 0, 
              updatedAt: Date.now() 
            };
          }
        }
      });

      sessoesDetectadas.forEach(sec => { // Explicação: Passa por cada seção única mapeada para criar os gatilhos de comando de tela (Aba Regional).
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Monta a chave técnica de metadados da seção (ex: 'meta_madeiras').
        initialCounts[metaKey] = { // Explicação: Inicializa a chave de controle sem totalizador, apenas com os carimbos de comando de tela.
          responsibleId: null, 
          responsibleName: null, 
          isActive: false, 
          updatedAt: Date.now()
        };
      });
      
      const payload = { // Explicação: Monta o documento com status da ata protegido.
        type: type || 'Ensaio Local', 
        scope: scope || 'local', 
        shadowScope: scope || 'local', // Explicação: Campo de segurança oculto para re-verificação de relatórios de fechamento.
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
        dbVersion: "12.0-nominal_cloned" // Explicação: Versão do banco atualizada para suportar chamadas nominais independentes.
      };

      const docNovoCriado = await addDoc(collection(db, 'events_global'), payload); // Explicação: Registra o novo ensaio diretamente na coleção global e captura a ID gerada.

      // --- 🚀 NOVO FLUXO DE CLONAGEM EM LOTE (AMARRAÇÃO CORPO ORQUESTRAL E MINISTÉRIO) ---
      if (scope !== 'regional') { // Explicação: Eventos regionais não copiam listas de uma única comum local.
        const batchChamada = writeBatch(db); // Explicação: Abre uma esteira de gravação em lote rápida para economizar conexões de rede.

        // 1. Clonagem e Isolamento Nominal do Corpo Orquestral (Músicos)
        const musicosSnap = await getDocs(collection(db, 'comuns', comumId, 'musicos_lista')); // Explicação: Vai até a garagem fixa da comum buscar as fichas dos músicos.
        musicosSnap.docs.forEach(musicoDoc => { // Explicação: Passa de irmão em irmão montando o cartão de chamada de presença do ensaio.
          const mData = musicoDoc.data(); // Explicação: Extrai o nome, instrumento e situação do músico.
          const chamadaRef = doc(collection(db, 'events_global', docNovoCriado.id, 'chamada_musicos'), musicoDoc.id); // Explicação: Cria um endereço novo e exclusivo para este irmão dentro deste ensaio.
          batchChamada.set(chamadaRef, { // Explicação: Prepara os dados iniciais do cartão de presença marcando-o originalmente como ausente.
            nome: mData.nome,
            instrumentoId: mData.instrumentoId,
            instrumentoNome: mData.instrumentoNome,
            situacao: mData.situacao,
            presente: false, // Explicação: Inicializa o cartão em falso (Ausente) esperando a caneta do secretário.
            avaliacao: 'Sem', // Explicação: Inicializa o nível de teste/avaliação de ensaio técnico limpo.
            updatedAt: Date.now()
          });
        });

        // 2. Clonagem e Isolamento Nominal do Ministério Local (Obreiros)
        const ministerioSnap = await getDocs(collection(db, 'comuns', comumId, 'ministerio_lista')); // Explicação: Vai até a subcoleção eclesiástica buscar Anciães e Diáconos cadastrados.
        ministerioSnap.docs.forEach(minDoc => { // Explicação: Passa obreiro por obreiro montando o cartão de presença da liderança.
          const minData = minDoc.data(); // Explicação: Captura o nome por extenso e o cargo ministerial.
          const chamadaMinRef = doc(collection(db, 'events_global', docNovoCriado.id, 'chamada_ministerio'), minDoc.id); // Explicação: Cria um endereço único para o obreiro dentro deste ensaio.
          batchChamada.set(chamadaMinRef, { // Explicação: Monta a ficha de presença inicial do obreiro.
            nome: minData.nome,
            cargo: minData.cargo,
            presente: false, // Explicação: Inicializa o obreiro como ausente por padrão.
            updatedAt: Date.now()
          });
        });

        await batchChamada.commit(); // Explicação: Descarrega o lote inteiro de clonagem nominal na nuvem em uma única transação atômica de custo enxuto!
      }

      return docNovoCriado; // Explicação: Devolve o documento do ensaio criado com as listas nominais de chamada já embutidas e prontas.

    } catch (err) {
      console.error("Erro na criação do evento:", err); // Explicação: Imprime falhas técnicas no painel do administrador.
      if (err.message === "CONFIG_REQUIRED") throw err; // Explicação: Repassa o erro de configuração exigida para a interface tratar.
      throw new Error("Falha ao inicializar evento."); // Explicação: Dispara erro genérico amigável de rede.
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
   * ATUALIZAÇÃO DE CONTAGEM (COM BLINDAGEM ANTI-PISCA E TRADUTOR DE SIGLAS)
   */
  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => { 
    if (!eventId || !instId) return; // Explicação: Se faltar o ID do ensaio ou do instrumento, aborta para não quebrar.

    // Explicação: Tabela de tradução interna para converter as siglas recebidas do front-end antigo para os nomes extensos do banco.
    const mapaTradutorInjetado = {
      'acd': 'acordeon', 'clt': 'clarinete', 'euf': 'eufonio', 'fgt': 'fagote', 'gt': 'fagote',
      'flt': 'flauta', 'org': 'orgao', 'tbn': 'trombone', 'tpt': 'trompete', 'trp': 'trompa',
      'tub': 'tuba', 'vcl': 'violoncelo', 'vla': 'viola', 'vln': 'violino'
    };

    // Explicação: Intercepta o ID antigo recebido e substitui pelo nome extenso correto configurado na nossa migração.
    let targetId = mapaTradutorInjetado[instId] || instId;

    const timerKey = `${eventId}_${targetId}`; // Explicação: Cria a chave única unindo o ensaio e o instrumento correto traduzido.
    const fieldToUpdate = field === 'total_simples' ? 'total' : field; // Explicação: Ajusta o nome do campo se vier no formato simplificado.
    const val = Math.max(0, parseInt(value) || 0); // Explicação: Garante que o número digitado seja inteiro e nunca menor que zero.

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {}; // Explicação: Cria a caixinha temporária de memória para esse instrumento se não existir.
    updateBuffers[timerKey][fieldToUpdate] = val; // Explicação: Guarda o valor digitado dentro do buffer temporário.

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]); // Explicação: Cancela o cronômetro anterior se o usuário continuar clicando rápido.

    debounceTimers[timerKey] = setTimeout(async () => { // Explicação: Abre uma janela de 400 milissegundos de espera antes de ir até a internet salvar.
      const eventRef = doc(db, 'events_global', eventId); // Explicação: Localiza o documento específico do ensaio dentro do Firebase.
      const bufferCopy = { ...updateBuffers[timerKey] }; // Explicação: Tira uma foto idêntica dos números acumulados na caixinha.
      
      delete updateBuffers[timerKey]; // Explicação: Limpa o buffer imediatamente para ficar pronto para os próximos cliques.
      delete debounceTimers[timerKey]; // Explicação: Apaga o cronômetro da memória após a execução.

      try {
        const sectionKey = (section || '').toUpperCase(); // Explicação: Padroniza o nome da seção da orquestra em letras maiúsculas.
        
        if (targetId.toLowerCase() === 'irmas' || targetId.toLowerCase() === 'irmaos' || sectionKey === 'IRMANDADE') {
          targetId = 'Coral'; // Explicação: Direciona automaticamente a contagem de irmãos/irmãs para a caixinha unificada do Coral.
        } else if (targetId.toLowerCase() === 'orgao' || sectionKey === 'ORGANISTAS') {
          targetId = 'orgao'; // Explicação: Garante o alinhamento da grafia das organistas.
        }

        const finalUpdates = {}; // Explicação: Prepara o pacote de dados limpo que será enviado para o servidor.
        const baseKey = `counts.${targetId}`; // Explicação: Constrói o caminho exato da propriedade dentro do documento mapeando o nome extenso.

        Object.keys(bufferCopy).forEach(f => {
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; // Explicação: Insere cada número updated no pacote usando o endereço do nome extenso enxuto.
        });

        finalUpdates[`${baseKey}.updatedAt`] = Date.now(); // Explicação: Carimba o horário exato que esse instrumento específico mudou.
        finalUpdates[`updatedAt`] = Date.now(); // Explicação: Atualiza o carimbo geral de modificação do ensaio.
        
        await updateDoc(eventRef, finalUpdates); // Explicação: Faz uma única viagem ao servidor e grava os novos números economizando cota.
        
      } catch (e) {
        console.error("Erro na Gravação Stabilizada:", e.message); // Explicação: Imprime no console se houver qualquer erro de rede.
      }
    }, 400); // Explicação: Tempo exato de 400ms de atraso controlado (anti-pisca).
  },

  // v11.3: Exclusão de instrumento extra protegida por regras lógicas internas.
  removeExtraInstrument: async (comumId, eventId, instId) => { // Explicação: Remove instrumento extra.
    if (!eventId || !instId) return;
    try {
      return await updateDoc(doc(db, 'events_global', eventId), { [`counts.${instId}`]: deleteField(), updatedAt: Date.now() }); 
    } catch (e) { console.error("Erro ao remover instrumento extra:", e); }
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