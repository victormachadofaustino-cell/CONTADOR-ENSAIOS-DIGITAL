import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase'; // Explicação: Conecta com as funções principais do banco de dados Firebase.
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore"; // Explicação: Importa ferramentas para apagar campos ou somar números no banco.
import { getAuth } from "firebase/auth"; // Explicação: Importa a ferramenta de identificação do usuário logado.
import { PERMISSIONS_MAP, ROLES } from '../config/permissions'; // Explicação: Importa a nossa "Regra de Ouro" para validar os poderes de cada usuário.

// Variável de controle para o acumulador de cliques (Debounce)
let debounceTimers = {}; // Explicação: Evita que o sistema salve no banco a cada letra digitada, esperando o usuário parar.
// Buffer temporário para acumular múltiplos campos do mesmo instrumento antes de enviar
let updateBuffers = {}; // Explicação: Guarda as alterações temporariamente para enviar tudo de uma vez e economizar internet.

/**
 * Serviço de Gestão de Eventos (Ensaios) e Contagens
 * v11.4 - STABILIZED SERVICE WITH AUTOMATIC NOMINAL CLONING
 */
export const eventService = { // Explicação: Inicia o conjunto de funções de gerenciamento de ensaios.

  /**
   * BUSCA USUÁRIOS DA REGIONAL
   */
  getUsersRegional: async (regionalId) => { // Explicação: Busca todos os usuários aprovados de uma determinada região.
    if (!regionalId) return []; // Explicação: Se não informar a região, retorna lista vazia para não dar erro.
    try { // Explicação: Tenta realizar a operação de busca no banco de dados.
      const q = query( // Explicação: Cria a pergunta para o banco de dados.
        collection(db, 'users'), // Explicação: Procura na pasta de usuários.
        where('regionalId', '==', regionalId), // Explicação: Onde a região for a mesma informada no crachá.
        where('approved', '==', true) // Explicação: E o usuário já estiver com o carimbo de "aprovado".
      ); // Explicação: Encerra a construção da consulta.
      const snap = await getDocs(q); // Explicação: Executa a busca e guarda o resultado.
      return snap.docs.map(d => ({ uid: d.id, ...d.data() })); // Explicação: Transforma o resultado em uma lista organizada com nomes e IDs.
    } catch (e) { // Explicação: Captura a falha caso ocorra erro na rede ou no banco.
      console.error("Erro ao buscar usuários da regional:", e); // Explicação: Avisa no console do navegador se houver erro técnico.
      return []; // Explicação: Retorna lista vazia em caso de falha para não travar a tela.
    } // Explicação: Encerra o tratamento de erros.
  }, // Explicação: Fecha a função getUsersRegional.

  // v10.7: Escuta eventos aplicando o Filtro Geográfico OBRIGATÓRIO (Master/Comissão)
  subscribeToEvents: (user, callback) => { // Explicação: Fica "ouvindo" novos ensaios respeitando o limite do seu nível de acesso.
    if (!user || !user.uid) return; // Explicação: Se o usuário não estiver identificado, não inicia a conexão.
    
    let constraints = []; // Explicação: Prepara a lista de filtros que serão aplicados no banco.

    // v10.7: Lógica de Filtro em Cascata para Master e Comissão
    if (user.activeComumId || user.comumId) { // Explicação: Se houver uma igreja ativa selecionada ou a igreja de origem do usuário.
      constraints.push(where('comumId', '==', user.activeComumId || user.comumId)); // Explicação: Adiciona o filtro para buscar apenas eventos dessa igreja comum.
    } // Explicação: Encerra a checagem da igreja.
    else if (user.activeCityId || user.cidadeId) { // Explicação: Se não houver igreja, mas houver uma cidade ativa selecionada ou de origem.
      constraints.push(where('cidadeId', '==', user.activeCityId || user.cidadeId)); // Explicação: Adiciona o filtro para buscar apenas eventos de igrejas dessa cidade.
    } // Explicação: Encerra a checagem da cidade.
    else if (user.activeRegionalId || user.regionalId) { // Explicação: Se não houver cidade, mas houver uma regional ativa selecionada ou de origem.
      constraints.push(where('regionalId', '==', user.activeRegionalId || user.regionalId)); // Explicação: Adiciona o filtro para buscar eventos de toda a regional.
    } // Explicação: Encerra a checagem da regional.

    // Explicação: Regra específica para GEM Local (Igreja própria + Convidados).
    if (user.accessLevel === ROLES.GEM) { // Explicação: Se o nível de acesso do usuário for exatamente o de secretário GEM Local.
      constraints = [or( // Explicação: Aplica uma lógica onde basta uma das duas condições abaixo ser verdadeira.
        where('comumId', '==', user.comumId), // Explicação: O ensaio pertence à própria igreja de origem do secretário local.
        where('invitedUsers', 'array-contains', user.uid) // Explicação: Ou o ID do secretário está na lista de convidados especiais do ensaio.
      )]; // Explicação: Fecha o bloco de filtros alternativos.
    } // Explicação: Encerra a checagem de privilégio local GEM.

    const q = query( // Explicação: Monta a pergunta final para o Firebase respeitando os filtros de GPS acima.
      collection(db, 'events_global'), // Explicação: Mira na coleção central global de eventos do sistema.
      ...constraints, // Explicação: Insere todos os filtros dinâmicos de localidade calculados anteriormente.
      orderBy('date', 'desc') // Explicação: Força os ensaios a virem organizados do mais recente para o mais antigo.
    ); // Explicação: Encerra a montagem da consulta reativa.

    return onSnapshot(q, (snapshot) => { // Explicação: Mantém a conexão aberta para atualizações automáticas.
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); // Explicação: Converte os documentos reais em objetos legíveis na tela.
      callback(events); // Explicação: Envia a lista updated de eventos de volta para quem chamou a função.
    }, (error) => { // Explicação: Captura erros caso a conexão seja interrompida.
      console.error("Erro no Listener de Eventos Global:", error); // Explicação: Emite aviso detalhado de falha no console técnico.
    }); // Explicação: Fecha a escuta do onSnapshot.
  }, // Explicação: Fecha a função subscribeToEvents.

  /**
   * Cria um novo ensaio com Estrutura de Ata e Metadados Blindados e Enxutos (Lean)
   * 🚀 ATUALIZADO: Agora recebe e sanitiza o 'userData' para injetar as travas obrigatórias do GEM Local.
   */
  createEvent: async (comumId, eventData, userData = null) => { // Explicação: Função para abrir um novo ensaio no sistema.
    if (!comumId) throw new Error("ID da Localidade ausente."); // Explicação: Impede a criação se a igreja não for identificada.
    
    const auth = getAuth(); // Explicação: Invoca o sistema de autenticação de usuários do Firebase.
    const currentUser = auth.currentUser; // Explicação: Captura o usuário ativo que está comandando a criação do evento.

    if (eventData.scope === 'regional' && (eventData.accessLevel === ROLES.GEM || userData?.accessLevel === ROLES.GEM)) { // Explicação: Impede que administradores locais criem eventos de nível regional.
      throw new Error("Seu nível de acesso não permite criar eventos regionais."); // Explicação: Estoura o erro de veto de permissão.
    } // Explicação: Encerra a trava de escopo regional.

    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData; // Explicação: Desestrutura o pacote de metadados geográficos recebido da interface.
    let initialCounts = {}; // Explicação: Prepara o objeto vazio onde montaremos a orquestra inicial do ensaio.

    // 🚀 TRAVA E BLINDAGEM DE CONTRATO FIRESTORE (Anti-Missing Permissions)
    const finalScope = (userData?.accessLevel === ROLES.GEM || eventData.accessLevel === ROLES.GEM) ? 'local' : (scope || 'local'); // Explicação: Intercepta e força o escopo a ser "local" se o criador for GEM Local, atendendo à Security Rule.
    const finalComumId = (userData?.accessLevel === ROLES.GEM) ? (userData.comumId || comumId) : comumId; // Explicação: Obriga o ID da igreja a ser o do cadastro do próprio GEM Local, impedindo rejeição por divergência de portaria.

    try { // Explicação: Inicia a tentativa de montar e salvar o ensaio na nuvem.
      const localRef = collection(db, 'comuns', finalComumId, 'instrumentos_config'); // Explicação: Acessa o endereço da subcoleção usando o ID verificado e blindado da igreja comum.
      const localSnap = await getDocs(localRef); // Explicação: Lê a lista de instrumentos que aquela igreja específica possui autorizada.
      
      if (localSnap.empty) { // Explicação: Se a igreja estiver vazia sem nenhum instrumento configurado.
        throw new Error("CONFIG_REQUIRED"); // Explicação: Dispara o aviso para exigir o reset padrão na tela.
      } // Explicação: Encerra a validação de segurança da grade.

      const sessoesDetectadas = new Set(); // Explicação: Cria uma lista de naipes única para não repetir chaves de controle de seções.

      localSnap.docs.forEach(docInst => { // Explicação: Varre cada documento de instrumento retornado do cadastro da igreja.
        const inst = docInst.data(); // Explicação: Extrai o conteúdo interno do cadastro do instrumento.
        const id = docInst.id; // Explicação: Captura o ID por extenso imutável saneado (ex: 'flauta', 'Coral').
        const sectionName = inst.section?.toUpperCase() || 'GERAL'; // Explicação: Descobre a seção em letras maiúsculas ou joga no naipe geral.
        sessoesDetectadas.add(sectionName); // Explicação: Adiciona o naipe na lista de controle de abas da tela.

        // Explicação: PRESERVAÇÃO E HIGIENE DE ESCOPO: Mapeia Coral/Órgão e Instrumentos comuns adaptando as propriedades ao nível local ou regional.
        if (id === 'Coral' || id === 'orgao') { // Explicação: Se o instrumento verificado for o Coral (Irmandade) ou Órgão (Organistas).
          if (finalScope === 'regional') { // Explicação: Se o ensaio que está sendo criado for de escopo Regional (com controle de abas e posses).
            initialCounts[id] = { // Explicação: Inicializa a propriedade com os dados limpos sem detalhamento de casa/visita.
              total: 0, // Explicação: Inicializa a contagem total zerada.
              name: inst.name || id.toUpperCase(), // Explicação: Carimba o nome do naipe oficial em letras maiúsculas.
              section: sectionName, // Explicação: Carimba o naipe correspondente.
              evalType: inst.evalType || 'Sem', // Explicação: Carimba o tipo de exame ou controle associado.
              responsibleId: null, // Explicação: Inicializa o ID do responsável pela aba como vazio.
              responsibleName: null, // Explicação: Inicializa o nome do responsável pela aba como vazio.
              updatedAt: Date.now() // Explicação: Salva a hora exata da criação da linha.
            }; // Explicação: Encerra a configuração base regional.
            if (id === 'Coral') { // Explicação: Tratamento especial extra se for o Coral no ensaio regional.
              initialCounts[id].irmaos = 0; // Explicação: Inicializa o totalizador de irmãos homens zerado.
              initialCounts[id].irmas = 0; // Explicação: Inicializa o totalizador de irmãs mulheres zerado.
              initialCounts[id].responsibleId_irmaos = null; // Explicação: Zera o responsável pela caneta dos irmãos.
              initialCounts[id].responsibleId_irmas = null; // Explicação: Zera o responsável pela caneta das irmãs.
              initialCounts[id].responsibleName_irmaos = null; // Explicação: Zera o nome do zelador dos irmãos.
              initialCounts[id].responsibleName_irmas = null; // Explicação: Zera o nome do zelador das irmãs.
            } // Explicação: Encerra o anexo do Coral Regional.
          } else { // Explicação: Caso o ensaio criado seja Local comum (com campos de Comum, Visita e Encarregados).
            initialCounts[id] = { // Explicação: Inicializa a estrutura clássica completa local.
              total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0, // Explicação: Zera todas as propriedades numéricas da ficha.
              name: inst.name || id.toUpperCase(), // Explicação: Salva o nome por extenso.
              section: sectionName, // Explicação: Salva a família instrumental.
              evalType: inst.evalType || 'Sem', // Explicação: Salva o tipo de exame técnico.
              responsibleId: null, // Explicação: Zera o ID do responsável.
              responsibleName: null, // Explicação: Zera o nome do responsável.
              updatedAt: Date.now() // Explicação: Registra o marco do tempo atual.
            }; // Explicação: Encerra a configuração local de Órgão/Coral.
          } // Explicação: Encerra o divisor de escopo de Órgão/Coral.
        } else { // Explicação: Caso seja um instrumento comum solista de orquestra (ex: Violino, Trompete, Saxofone).
          if (finalScope === 'regional') { // Explicação: Se o ensaio for Regional, cria a estrutura simplificada direta.
            initialCounts[id] = { // Explicação: Inicializa o objeto do instrumento solista regional.
              total: 0, // Explicação: Inicializa o totalizador zerado.
              updatedAt: Date.now() // Explicação: Registra o horário atual.
            }; // Explicação: Encerra o solista regional.
          } else { // Explicação: Se for ensaio Local comum, adiciona as colunas de detalhamento.
            initialCounts[id] = { // Explicação: Inicializa o objeto do instrumento solista local.
              total: 0, // Explicação: Zera o total geral presente.
              comum: 0, // Explicação: Zera o contador de músicos que pertencem à casa.
              enc: 0, // Explicação: Zera o contador de encarregados locais associados.
              updatedAt: Date.now() // Explicação: Registra o marco temporal.
            }; // Explicação: Encerra o solista local.
          } // Explicação: Encerra o divisor de escopo do instrumento solista.
        } // Explicação: Encerra o mapeamento do instrumento.
      }); // Explicação: Fecha o laço do forEach de instrumentos da igreja.

      sessoesDetectadas.forEach(sec => { // Explicação: Passa por cada seção única mapeada para criar os gatilhos de comando de tela (Aba Regional).
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Monta a chave técnica de metadados da seção (ex: 'meta_madeiras').
        initialCounts[metaKey] = { // Explicação: Inicializa a chave de controle sem totalizador, apenas com os carimbos de comando de tela.
          responsibleId: null, // Explicação: Zera o ID único de quem travou a aba para contagem.
          responsibleName: null, // Explicação: Zera o nome legível de quem pegou a aba.
          isActive: false, // Explicação: Define que a aba está liberada para qualquer um assumir.
          updatedAt: Date.now() // Explicação: Registra a hora da montagem.
        }; // Explicação: Encerra os metadados da seção.
      }); // Explicação: Fecha o laço das seções.
      
      const payload = { // Explicação: Monta o documento com status da ata protegido.
        type: type || 'Ensaio Local', // Explicação: Define o título textual (Ex: Ensaio Local Ponte São João).
        scope: finalScope, // Explicação: Salva o escopo oficial do evento rigorosamente validado e amarrado à regra do banco.
        shadowScope: finalScope, // Explicação: Campo de segurança oculto para re-verificação de relatórios de fechamento.
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], // Explicação: Insere o vetor de colaboradores externos autorizados a ajudar na contagem.
        date, // Explicação: Grava a data do ensaio no formato estável YYYY-MM-DD.
        responsavel: responsavel || 'Pendente', // Explicação: Grava o nome do Ancião responsável pelo atendimento.
        createdById: currentUser?.uid || null, // Explicação: Registra o ID de quem apertou o botão "Criar Ensaio".
        createdByLevel: userData?.accessLevel || eventData.accessLevel || 'basico', // Explicação: Consome o nível legítimo do crachá do criador impedindo o rebaixamento automático para básico.
        comumNome: comumNome || '', // Explicação: Denormalização Preventiva: Carimba o nome por extenso da igreja comuns para economizar cota.
        comumId: finalComumId, // Explicação: Grava a ID blindada e verificada da igreja proprietária do evento.
        cidadeId: cidadeId || '', // Explicação: Grava a ID da comarca da cidade.
        cidadeNome: cidadeNome || '', // Explicação: Carimba o nome por extenso da cidade proprietária.
        regionalId: regionalId || '', // Explicação: Grava a ID da Regional administrativa.
        regionalNome: regionalNome || '', // Explicação: Carimba o nome por extenso da regional.
        ata: { // Explicação: Cria a pasta interna que cuidará do fechamento e hinos do ensaio.
          status: 'open', // Explicação: Inicializa o ensaio obrigatoriamente no status "open" (Aberto).
          palavra: { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' }, // Explicação: Prepara os slots vazios para a pregação.
          ocorrencias: [] // Explicação: Prepara a lista vazia para registrar apresentações ou avisos técnicos.
        }, // Explicação: Encerra o objeto da ata.
        counts: initialCounts, // Explicação: Acopla a grade zerada de orquestra montada e individualizada por instrumento.
        createdAt: Date.now(), // Explicação: Registra a hora exata da criação definitiva do ensaio.
        updatedAt: Date.now(), // Explicação: Sincroniza o horário da última modificação geral do ensaio.
        dbVersion: "12.0-nominal_cloned" // Explicação: Versão do banco atualizada para suportar chamadas nominais independentes.
      }; // Explicação: Encerra a conclusão do documento de dados (payload).

      const docNovoCriado = await addDoc(collection(db, 'events_global'), payload); // Explicação: Registra o novo ensaio diretamente na coleção global do Firebase com o payload aceito pelas regras de segurança.

      // --- 🚀 FLUXO DE CLONAGEM EM LOTE NOMINAL COMPLETO (AMARRAÇÃO CORPO ORQUESTRAL E MINISTÉRIO) ---
      if (finalScope !== 'regional') { // Explicação: Eventos regionais não copiam listas de uma única comum local.
        const batchChamada = writeBatch(db); // Explicação: Abre uma esteira de gravação em lote rápida para economizar conexões de rede.

        // 1. Clonagem e Isolamento Nominal do Corpo Orquestral (Músicos)
        const musicosRef = collection(db, 'comuns', finalComumId, 'musicos_lista'); // Explicação: Aponta para a subcoleção fixa de músicos usando a igreja correta.
        const musicosSnap = await getDocs(musicosRef); // Explicação: Vai até a garagem fixa da comum buscar as fichas dos músicos cadastrados.
        
        musicosSnap.docs.forEach(musicoDoc => { // Explicação: Passa de irmão em irmão montando o cartão de chamada de presença do ensaio.
          const mData = musicoDoc.data(); // Explicação: Extrai o conteúdo da ficha estável.
          const llamadaRef = doc(collection(db, 'events_global', docNovoCriado.id, 'chamada_musicos'), musicoDoc.id); // Explicação: Crava o ID fixo do músico no cartão de chamada do ensaio para manter a reatividade síncrona.
          
          batchChamada.set(llamadaRef, { // Explicação: Prepara os dados iniciais do cartão de presença marcando-o originalmente como ausente.
            nome: (mData.nome || mData.name || 'IRMÃO(Ã)').toUpperCase().trim(), // Explicação: Lê 'nome' ou 'name' em caixa alta higienizada limpando pontas desertas.
            instrumentoId: mData.instrumentoId, // Explicação: Copia a ID imutável do instrumento dele.
            instrumentoNome: (mData.instrumentoNome || mData.instrumentoId || 'GERAL').toUpperCase().trim(), // Explicação: Copia o nome amigável do naipe.
            situacao: mData.situacao || "Oficializado", // Explicação: Copia se é Oficializado, RJM ou Aprendiz.
            presente: false, // Explicação: Inicializa o cartão em falso (Ausente) esperando a caneta do secretário.
            avaliacao: 'Sem', // Explicação: Inicializa o nível de teste/avaliação de ensaio técnico limpo.
            updatedAt: Date.now() // Explicação: Registra o marco do tempo da clonagem nominal.
          }); // Explicação: Encerra la inserção do músico no lote.
        }); // Explicação: Fecha o laço dos músicos.

        // 2. Clonagem e Isolamento Nominal do Ministério Local (Obreiros)
        const ministerioSnap = await getDocs(collection(db, 'comuns', finalComumId, 'ministerio_lista')); // Explicação: Vai buscar Anciães e Diáconos cadastrados na igreja correta.
        ministerioSnap.docs.forEach(minDoc => { // Explicação: Passa obreiro por obreiro montando o cartão de presença da Liderança.
          const minData = minDoc.data(); // Explicação: Captura o nome por extenso e o cargo ministerial.
          const chamadaMinRef = doc(collection(db, 'events_global', docNovoCriado.id, 'chamada_ministerio'), minDoc.id); // Explicação: Cria um endereço único para o obreiro dentro deste ensaio.
          batchChamada.set(chamadaMinRef, { // Explicação: Monta a ficha de presença inicial do obreiro.
            nome: (minData.nome || minData.name || 'OBREIRO').toUpperCase().trim(), // Explicação: Copia o nome por extenso do obreiro da casa.
            cargo: minData.cargo, // Explicação: Copia o ofício eclesiástico dele.
            presente: false, // Explicação: Inicializa o obreiro como ausente por padrão.
            updatedAt: Date.now() // Explicação: Grava o marco do tempo.
          }); // Explicação: Encerra a inserção do obreiro no lote.
        }); // Explicação: Fecha o laço do ministério.

        await batchChamada.commit(); // Explicação: Descarrega o lote inteiro de clonagem nominal na nuvem em uma única transação atômica de custo enxuto!
      } // Explicação: Encerra o condicional de isolamento de listas nominais locais.

      return docNovoCriado; // Explicação: Devolve o documento do ensaio criado com as listas nominais de chamada já embutidas e prontas.

    } catch (err) { // Explicação: Captura e isola falhas técnicas ocorridas em qualquer ponto do processamento.
      console.error("Erro na criação do evento:", err); // Explicação: Imprime falhas técnicas no painel do administrador.
      if (err.message === "CONFIG_REQUIRED") throw err; // Explicação: Repassa o erro de configuração exigida para a interface tratar.
      throw new Error("Falha ao inicializar evento."); // Explicação: Dispara erro genérico amigável de rede.
    } // Explicação: Fecha o bloco catch de tratamento de falhas.
  }, // Explicação: Fecha a função createEvent.

  reopenAta: async (eventId) => { // Explicação: Função para gestores abrirem a ata novamente.
    if (!eventId) return; // Explicação: Aborta se o ID do ensaio vier vazio.
    const eventRef = doc(db, 'events_global', eventId); // Explicação: Mira no documento mestre do ensaio na nuvem.
    try { // Explicação: Tenta fazer a atualização na nuvem.
      return await updateDoc(eventRef, { "ata.status": "open", updatedAt: Date.now() }); // Explicação: Modifica a propriedade de status voltando para "open" (Aberto).
    } catch (e) { // Explicação: Captura falha se a regra de rede travar o usuário.
      throw new Error("Sem permissão para reabrir."); // Explicação: Retorna aviso de veto eclesiástico.
    } // Encerra o tratamento.
  }, // Explicação: Fecha a função reopenAta.

  /**
   * GESTÃO DE CONVIDADOS
   */
  addGuest: async (eventId, userObjectOrId) => { // Explicação: Autoriza colaborador externo.
    if (!eventId || !userObjectOrId) return; // Explicação: Aborta se faltar dados básicos de identificação.
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId; // Explicação: Descobre se passaram o objeto completo ou só a string do ID.
    const eventRef = doc(db, 'events_global', eventId); // Explicação: Conecta com o endereço do ensaio.
    try { // Explicação: Tenta rodar a inclusão.
      return await updateDoc(eventRef, { invitedUsers: arrayUnion(uid), updatedAt: Date.now() }); // Explicação: Injeta o ID único do convidado no vetor de acessos extras sem duplicar.
    } catch (e) { console.error("Erro convidado:", e); } // Explicação: Registra erros silenciosamente no console técnico.
  }, // Explicação: Fecha a função addGuest.

  removeGuest: async (eventId, userObjectOrId) => { // Explicação: Remove autorização externa.
    if (!eventId || !userObjectOrId) return; // Explicação: Cancela se faltar dados.
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId; // Explicação: Descobre a assinatura de texto do ID único.
    const eventRef = doc(db, 'events_global', eventId); // Explicação: Conecta com o ensaio na nuvem.
    try { // Explicação: Tenta realizar a remoção.
      return await updateDoc(eventRef, { invitedUsers: arrayRemove(uid), updatedAt: Date.now() }); // Explicação: Localiza o ID único dentro do vetor e expulsa o usuário da lista de convidados.
    } catch (e) { console.error("Erro remover convidado:", e); } // Explicação: Registra erro técnico.
  }, // Explicação: Fecha a função removeGuest.

  deleteEvent: async (comumId, eventId) => { // Explicação: Tenta apagar o ensaio do banco de dados definitivamente.
    if (!eventId) throw new Error("ID do evento não fornecido."); // Explicação: Trava contra remoções cegas.
    try { // Explicação: Tenta deletar na nuvem.
      const eventRef = doc(db, 'events_global', eventId); // Explicação: Encontra a localização do ensaio no Firebase.
      await deleteDoc(eventRef); // Explicação: Remove permanentemente o ensaio e limpa o documento da nuvem.
      return true; // Explicação: Devolve verdadeiro sinalizando sucesso completo da ação.
    } catch (error) { // Captura falhas de regras ou rede.
      console.error("ERRO_SERVICE_DELETE:", error.message); // Explicação: Imprime la descrição física do erro no painel técnico.
      throw new Error("PERMISSAO_NEGADA_OU_FALHA_REDE"); // Explicação: Dispara aviso amigável de restrição de segurança.
    } // Encerra o tratamento.
  }, // Explicação: Fecha a função deleteEvent.

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
    }; // Explicação: Encerra o mapa dicionário de siglas.

    // Explicação: Intercepta o ID antigo recebido e substitui pelo nome extenso correto configurado na nossa migração.
    let targetId = mapaTradutorInjetado[instId] || instId; // Explicação: Se o ID não estiver no dicionário, usa o nome original direto.

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

      try { // Explicação: Tenta empacotar e enviar os números para a nuvem.
        const sectionKey = (section || '').toUpperCase(); // Explicação: Padroniza o nome da seção da orquestra em letras maiúsculas.
        
        if (targetId.toLowerCase() === 'irmas' || targetId.toLowerCase() === 'irmaos' || sectionKey === 'IRMANDADE') { // Se o ID for irmão/irmã ou naipe de irmandade.
          targetId = 'Coral'; // Explicação: Direciona automaticamente a contagem de irmãos/irmãs para a caixinha unificada do Coral.
        } else if (targetId.toLowerCase() === 'orgao' || sectionKey === 'ORGANISTAS') { // Se for órgão ou família das organistas.
          targetId = 'orgao'; // Explicação: Garante o alinhamento da grafia das organistas.
        } // Encerra a triagem de desvios de nomes extensos.

        const finalUpdates = {}; // Explicação: Prepara o pacote de dados limpo que será enviado para o servidor.
        const baseKey = `counts.${targetId}`; // Explicação: Constrói o caminho exato da propriedade dentro do documento mapeando o nome extenso.

        Object.keys(bufferCopy).forEach(f => { // Varre os campos acumulados na foto do buffer.
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; // Explicação: Insere cada número updated no pacote usando o endereço do nome extenso enxuto.
        }); // Explicação: Encerra a colagem de propriedades.

        finalUpdates[`${baseKey}.updatedAt`] = Date.now(); // Explicação: Carimba o horário exato que esse instrumento específico mudou.
        finalUpdates[`updatedAt`] = Date.now(); // Explicação: Atualiza o carimbo geral de modificação do ensaio.
        
        await updateDoc(eventRef, finalUpdates); // Explicação: Faz uma única viagem ao servidor e grava os novos números economizando cota.
        
      } catch (e) { // Captura falhas de rede.
        console.error("Erro na Gravação Stabilizada:", e.message); // Explicação: Imprime no console se houver qualquer erro de rede.
      } // Encerra o tratamento.
    }, 400); // Explicação: Tempo exato de 400ms de atraso controlado (anti-pisca).
  }, // Explicação: Fecha a função updateInstrumentCount.

  // ax 11.3: Exclusão de instrumento extra protegida por regras lógicas internas.
  removeExtraInstrument: async (comumId, eventId, instId) => { // Explicação: Remove instrumento extra.
    if (!eventId || !instId) return; // Explicação: Cancela se faltar referências básicas.
    try { // Explicação: Tenta apagar a propriedade na nuvem.
      return await updateDoc(doc(db, 'events_global', eventId), { [`counts.${instId}`]: deleteField(), updatedAt: Date.now() }); // Explicação: Usa a ferramenta deleteField do Firestore para remover a cadeira extra do mapa de contagens.
    } catch (e) { console.error("Erro ao remover instrumento extra:", e); } // Captura e exibe erro técnico.
  }, // Explicação: Fecha a função removeExtraInstrument.

  /**
   * Salva Ata com limpeza de dados
   */
  saveAtaData: async (comumId, eventId, ataData) => { // Explicação: Salva hinos e pregação.
    if (!eventId) throw new Error("Evento inválido."); // Trava de barreira.
    const eventRef = doc(db, 'events_global', eventId); // Localiza o ensaio ativo.
    
    let todosHinos = []; // Prepara uma sacola vazia para juntar os hinos.
    (ataData.partes || []).forEach(p => { // Varre as partes do ensaio (Abertura, Meio, Encerramento).
      if (p.hinos) todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')]; // Filtra hinos válidos digitados e adiciona na sacola.
    }); // Encerra o agrupamento de hinos.

    const finalAta = { // Monta o payload higienizado da ata.
      ...ataData, // Mantém os textos de palavra e observações originais.
      hinosChamados: todosHinos.length, // Calcula de forma automática o totalizador numérico de hinos tocados.
      hinosLista: todosHinos, // Anexa a lista limpa e organizada de hinos tocados.
      lastUpdate: Date.now(), // Carimba o horário do salvamento.
      status: ataData.status || 'open' // Preserva o status ou força "open" por padrão.
    }; // Encerra o payload da ata.

    try { // Tenta salvar na nuvem.
      await updateDoc(eventRef, { ata: finalAta, updatedAt: Date.now() }); // Grava os dados da ata e atualiza o carimbo global de modificação do ensaio.
    } catch (e) { // Captura falha de rede.
      console.error("Erro salvar Ata:", e); // Emite aviso detalhado.
      throw new Error("Erro de salvamento."); // Dispara erro legível para a interface.
    } // Encerra o tratamento.
  }, // Explicação: Fecha a função saveAtaData.

  // =========================================================================
  // --- NOVAS FUNÇÕES EXCLUSIVAS DE GESTÃO NOMINAL COMPLETA DE MÚSICOS DA COMUM ---
  // =========================================================================

  /**
   * ADICIONA NOVO MÚSICO DEFINITIVO NA LISTA DA COMUM FIXA
   */
  addMusicoComum: async (comumId, musicoPayload) => { // Explicação: Função que insere de forma perpétua a ficha de um novo irmão na lista daquela igreja.
    if (!comumId || !musicoPayload.nome || !musicoPayload.instrumentoId) throw new Error("Parâmetros incompletos."); // Explicação: Trava contra envio de dados corrompidos.
    try { // Tenta gravar na nuvem.
      const novaFichaRef = doc(collection(db, 'comuns', comumId, 'musicos_lista')); // Explicação: Cria uma nova chave de ID exclusiva na garagem fixa de músicos da comum.
      const payloadSaneado = { // Explicação: Limpa os dados de texto forçando o padrão caixa alta.
        nome: musicoPayload.nome.toUpperCase().trim(), // Converte o nome do irmão em caixa alta sem espaços sobressalentes nas pontas.
        instrumentoId: musicoPayload.instrumentoId, // Vincula a ID estável do instrumento dele.
        instrumentoNome: (musicoPayload.instrumentoNome || musicoPayload.instrumentoId).toUpperCase().trim(), // Saneia e carimba o nome amigável do naipe.
        situacao: musicoPayload.situacao || "Aluno", // Salva se é oficializado ou aluno aprendiz.
        createdAt: Date.now(), // Registra a data de matrícula dele na comum.
        updatedAt: Date.now() // Carimba o horário da modificação.
      }; // Encerra a montagem da ficha nominal.
      await setDoc(novaFichaRef, payloadSaneado); // Explicação: Registra a ficha perpétua na coleção fixa da igreja.
      return novaFichaRef.id; // Explicação: Retorna a identificação gerada para confirmação na interface.
    } catch (e) { // Captura falha de rede ou segurança.
      console.error("Erro ao adicionar músico comum:", e); // Explicação: Avisa em caso de falha física de rede.
      throw new Error("Erro ao salvar músico."); // Explicação: Repassa o erro amigável de portaria.
    } // Encerra o tratamento de erros.
  }, // Explicação: Fecha a função addMusicoComum.

  /**
   * ATUALIZA FICHA DO MÚSICO EXISTENTE NA COMUM
   */
  updateMusicoComum: async (comumId, musicoId, camposNovos) => { // Explicação: Função para alterar dados (como nome, situação ou instrumento) de um irmão alistado.
    if (!comumId || !musicoId) throw new Error("Identificadores ausentes."); // Explicação: Trava de proteção lógica.
    try { // Tenta gravar a alteração na nuvem.
      const fichaRef = doc(db, 'comuns', comumId, 'musicos_lista', musicoId); // Explicação: Localiza o documento fixo do irmão.
      const payloadUpdates = { ...camposNovos, updatedAt: Date.now() }; // Explicação: Acopla o marco de tempo de modificação aos campos editados.
      if (payloadUpdates.nome) payloadUpdates.nome = payloadUpdates.nome.toUpperCase().trim(); // Explicação: Saneia o nome em caixa alta se tiver sido alterado.
      if (payloadUpdates.instrumentoNome) payloadUpdates.instrumentoNome = payloadUpdates.instrumentoNome.toUpperCase().trim(); // Explicação: Saneia o nome do naipe.
      await updateDoc(fichaRef, payloadUpdates); // Explicação: Envia a alteração de escrita cirúrgica para a nuvem.
      return true; // Retorna verdadeiro indicando sucesso.
    } catch (e) { // Captura falha de rede.
      console.error("Erro ao atualizar músico comum:", e); // Imprime aviso técnico no console.
      throw new Error("Erro ao salvar alterações."); // Dispara aviso para a tela do smartphone.
    } // Encerra o tratamento.
  }, // Explicação: Fecha a função updateMusicoComum.

  /**
   * EXCLUI MÚSICO DEFINITIVO DO ALISTAMENTO DA COMUM FIXA
   */
  deleteMusicoComum: async (comumId, musicoId) => { // Explicação: Remove permanentemente um irmão da lista fixa de músicos oficiais daquela igreja.
    if (!comumId || !musicoId) throw new Error("Identificadores ausentes."); // Explicação: Trava lógica contra deleção cega.
    try { // Tenta realizar a exclusão.
      const fichaRef = doc(db, 'comuns', comumId, 'musicos_lista', musicoId); // Explicação: Encontra a ficha do irmão no servidor.
      await deleteDoc(fichaRef); // Explicação: Executa a remoção definitiva do documento na garagem de alistados.
      return true; // Retorna verdadeiro acusando remoção limpa.
    } catch (e) { // Captura falha de rede ou tranca de segurança.
      console.error("Erro ao excluir músico comum:", e); // Imprime log técnico.
      throw new Error("Erro ao deletar músico."); // Repassa o erro amigável para a interface.
    } // Encerra a captura de erros.
  } // Explicação: Fecha a função deleteMusicoComum.
}; // Explicação: Encerra o objeto global exportável do eventService.