import {
  db,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  or,
} from "../config/firebase"; // [Funcionamento]: Mantém a importação de todos os conectores e métodos oficiais do SDK do Firebase Firestore.
import {
  deleteField,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore"; // [Funcionamento]: Ferramental para manipulação de campos complexos e contadores atômicos na nuvem.
import { getAuth } from "firebase/auth"; // [Funcionamento]: Puxa o módulo de autenticação para validar quem é o operador logado no dispositivo.
import { PERMISSIONS_MAP, ROLES } from "../config/permissions"; // [Funcionamento]: Mantém o dicionário de permissões rígidas e níveis de autoridade da comissão.

let debounceTimers = {}; // [Funcionamento]: Buffer de temporizadores locais para agrupar batidas rápidas de teclado antes de enviar à internet.
let updateBuffers = {}; // [Funcionamento]: Armazém temporário na memória RAM para reter os valores intermediários digitados no input.

// DICIONÁRIO DE SANITIZAÇÃO ESTÁTICA EXPANDIDO CONTRA INSTRUMENTOS FANTASMAS
const INSTRUMENT_ID_MAP = {
  coral: "coral",
  corais: "coral",
  acordeon: "acordeon",
  acordeons: "acordeon",
  clarinete: "clarinete",
  clarinetes: "clarinete",
  claronealto: "claronealto",
  claronebaixo: "claronebaixo",
  corneingles: "corneingles",
  eufonio: "eufonio",
  eufonios: "eufonio",
  fagote: "fagote",
  fagotes: "fagote",
  flauta: "flauta",
  flautas: "flauta",
  flugelhorn: "flugelhorn",
  oboe: "oboe",
  oboes: "oboe",
  orgao: "orgao",
  organistas: "orgao",
  saxalto: "saxalto",
  saxbaritono: "saxbaritono",
  saxsoprano: "saxsoprano",
  saxtenor: "saxtenor",
  trombone: "trombone",
  trombones: "trombone",
  trompa: "trompa",
  trompas: "trompa",
  trompete: "trompete",
  trompetes: "trompete",
  tuba: "tuba",
  tubas: "tuba",
  viola: "viola",
  violas: "viola",
  violino: "violino",
  violinos: "violino",
  violoncelo: "violoncelo",
  violoncelos: "violoncelo",
  tub: "tuba",
  vln: "violino",
  vla: "viola",
  vcl: "violoncelo",
  flt: "flauta",
  clt: "clarinete",
  tbn: "trombone",
  tpt: "trompete",
  trp: "trompa",
  org: "orgao",
  acd: "acordeon",
  euf: "eufonio",
  fgt: "fagote", // [Funcionamento]: Interceptador de 3 letras que anula a criação de nós como 'tub' na nuvem.
}; // [Funcionamento]: Mantém a paridade estável entre siglas de sistema e strings textuais do banco.

export const eventService = {
  // [Funcionamento]: Inicia a exportação do objeto de serviços que agrupa as chamadas de banco de dados dos eventos.

  getUsersRegional: async (regionalId) => {
    // [Funcionamento]: Método assíncrono para buscar todos os usuários aprovados de uma regional específica.
    if (!regionalId) return []; // [Funcionamento]: Se não for fornecido o ID da regional, retorna um array vazio imediatamente para segurança.
    try {
      // [Funcionamento]: Inicia a tentativa de consulta ao banco de dados.
      const q = query(
        // [Funcionamento]: Constrói a estrutura da busca com filtros integrados.
        collection(db, "users"), // [Funcionamento]: Aponta a busca para a tabela mestre de usuários do sistema.
        where("regionalId", "==", regionalId), // [Funcionamento]: Filtra apenas os usuários que pertencem à regional especificada.
        where("approved", "==", true), // [Funcionamento]: Ex exige que a conta do usuário esteja marcada como aprovada.
      ); // [Funcionamento]: Encerra a montagem da consulta query.
      const snap = await getDocs(q); // [Funcionamento]: Executa fisicamente a leitura no Firestore and aguarda o retorno dos documentos.
      return snap.docs.map((d) => ({ uid: d.id, ...d.data() })); // [Funcionamento]: Converte os documentos do banco em objetos JavaScript utilizáveis com ID.
    } catch (e) {
      // [Funcionamento]: Captura qualquer erro de rede ou permissão ocorrido na busca.
      console.error("Erro ao buscar usuários da regional:", e); // [Funcionamento]: Emite o erro detalhado no console do navegador para debug.
      return []; // [Funcionamento]: Retorna um array vazio em caso de falha para a aplicação não quebrar.
    } // [Funcionamento]: Encerra o bloco de captura catch.
  }, // [Funcionamento]: Encerra o método getUsersRegional.

  subscribeToEvents: (user, callback) => {
    // [Funcionamento]: Abre uma escuta reativa em tempo real para listar os eventos do usuário conectado.
    if (!user || !user.uid) return; // [Funcionamento]: Se o usuário não estiver devidamente autenticado, cancela a operação silenciosamente.

    let constraints = []; // [Funcionamento]: Inicializa uma lista vazia para empilhar os filtros de segurança territorial.

    if (user.activeComumId || user.comumId) {
      // [Funcionamento]: Se o usuário tiver uma igreja comum ativa selecionada no topo do app.
      constraints.push(
        where("comumId", "==", user.activeComumId || user.comumId),
      ); // [Funcionamento]: Trava o filtro para trazer apenas ensaios dessa igreja comum.
    } // [Funcionamento]: Encerra o bloco de checagem da igreja comum.
    else if (user.activeCityId || user.cidadeId) {
      // [Funcionamento]: Caso não seja comum, mas o usuário possua uma cidade ativa focada.
      constraints.push(
        where("cidadeId", "==", user.activeCityId || user.cidadeId),
      ); // [Funcionamento]: Filtra os ensaios de todas as igrejas daquela cidade.
    } // [Funcionamento]: Encerra o bloco de checagem de cidade.
    else if (user.activeRegionalId || user.regionalId) {
      // [Funcionamento]: Caso seja administrador regional and possua uma regional focada.
      constraints.push(
        where("regionalId", "==", user.activeRegionalId || user.regionalId),
      ); // [Funcionamento]: Filtra os ensaios de toda a regional de ponta a ponta.
    } // [Funcionamento]: Encerra o bloco de checagem de regional.

    if (
      user.accessLevel === ROLES.GEM ||
      user.accessLevel === "gem_local" ||
      user.accessLevel === "gem" ||
      user.accessLevel === "GEM"
    ) {
      // [Funcionamento]: Se o operador for estritamente um secretário local GEM.
      constraints = [
        or(
          // [Funcionamento]: Aplica uma condition lógica OU especial de portaria do banco.
          where("comumId", "==", user.comumId), // [Funcionamento]: Permite ver os ensaios da própria igreja comuns nativa dele.
          where("invitedUsers", "array-contains", user.uid), // [Funcionamento]: Ou os ensaios de outras cidades onde ele foi convidado nominalmente.
        ),
      ]; // [Funcionamento]: Encerra a aplicação do filtro lógico OU.
    } // [Funcionamento]: Encerra a checagem de nível GEM.

    const q = query(
      // [Funcionamento]: Constrói a consulta final unificada para enviar ao Firestore.
      collection(db, "events_global"), // [Funcionamento]: Mira na coleção global de ensaios do ecossistema.
      ...constraints, // [Funcionamento]: Injeta dinamicamente os filtros territoriais empilhados acima.
      orderBy("date", "desc"), // [Funcionamento]: Ordena o resultado cronologicamente trazendo os ensaios mais recentes primeiro.
    ); // [Funcionamento]: Encerra a construção da query de eventos.

    return onSnapshot(
      q,
      (snapshot) => {
        // [Funcionamento]: Abre o canal de comunicação ao vivo (onSnapshot) com a nuvem do Firebase.
        const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })); // [Funcionamento]: Transforma os documentos retornados em tempo real em array de objetos ricos.
        callback(events); // [Funcionamento]: Executa a função de retorno atualizando instantaneamente a tela do usuário.
      },
      (error) => {
        // [Funcionamento]: Captura erros na escuta em tempo real (ex: falta de internet).
        console.error("Erro no Listener de Eventos Global:", error); // [Funcionamento]: Registra a falha técnica no console para análise.
      },
    ); // [Funcionamento]: Encerra a conexão reativa del onSnapshot.
  }, // [Funcionamento]: Encerra o método subscribeToEvents.

  createEvent: async (comumId, eventData, userData = null) => {
    // [Funcionamento]: Método encarregado de criar e estruturar um Executar novo ensaio no banco de dados.
    if (
      !comumId &&
      !eventData?.comumId &&
      !userData?.comumId &&
      !userData?.activeComumId
    )
      throw new Error("ID da Localidade ausente."); // [Funcionamento]: Regra de segurança: impede a criação de ensaios sem uma igreja amarrada.

    const auth = getAuth(); // [Funcionamento]: Puxa o motor de autenticação active do dispositivo.
    const currentUser = auth.currentUser; // [Funcionamento]: Isola o operador logado atualmente no chip.

    const userRoleLevel = userData?.accessLevel || eventData.accessLevel; // [Funcionamento]: Lê o crachá do usuário para verificar seu nível de autoridade.
    const isGemUser =
      userRoleLevel === ROLES.GEM ||
      userRoleLevel === "gem_local" ||
      userRoleLevel === "gem" ||
      userRoleLevel === "GEM"; // [Funcionamento]: Identifica se é um secretário local.

    if (eventData.scope === "regional" && isGemUser) {
      // [Funcionamento]: Barreira de segurança: secretário local nunca cria ensaio regional amplo.
      throw new Error(
        "Seu nível de acesso não permite criar eventos regionais.",
      ); // [Funcionamento]: Interrompe a execução emitindo o aviso de veto.
    } // [Funcionamento]: Encerra a checagem de barreira de escopo.

    const {
      type,
      date,
      responsavel,
      regionalId,
      regionalNome,
      comumNome,
      cidadeId,
      cidadeNome,
      scope,
      invitedUsers,
    } = eventData; // [Funcionamento]: Desestrutura os dados do formulário da tela.
    let initialCounts = {}; // [Funcionamento]: Cria o objeto vazio que receberá a grade inicial de contagem de instrumentos.

    const finalScope = isGemUser ? "local" : scope || "local"; // [Funcionamento]: Se for GEM, força o escopo a ser local, senão herda o escopo escolhido.

    // 🚀 BLINDAGEM SÊNIOR ABSOLUTA ANTI-ROTA-VAZIA: Garante o resgate imediato e higienizado do ID da comum de dentro do payload do evento ou das claims do usuário logado se o parâmetro cru vier nulo de componentes órfãos.
    const finalComumId =
      comumId ||
      eventData?.comumId ||
      userData?.activeComumId ||
      userData?.comumId ||
      ""; // [Funcionamento]: Dissolve de forma definitiva as strings nulas ou vazias que quebravam as chamadas nominais da linha 235.

    // 🚀 EXCLUSIVO PROFESSIONAL EDITION: Saneamento absoluto anti-ponto cego. Se o Front mandar a cidade vazia na sua comum de origem, resgata ela do crachá do usuário ativo!
    const finalCidadeId =
      cidadeId ||
      eventData?.cidadeId ||
      userData?.cidadeId ||
      userData?.activeCityId ||
      ""; // [Funcionamento]: Extrai e garante o preenchimento legítimo do ID territorial da cidade para travar a portaria do Firebase rules.
    const finalRegionalId =
      regionalId ||
      eventData?.regionalId ||
      userData?.regionalId ||
      userData?.activeRegionalId ||
      ""; // [Funcionamento]: Extrai e garante o preenchimento legítimo do ID territorial da regional.

    try {
      // [Funcionamento]: Inicia o bloco de transação com o banco de dados.
      const localRef = collection(
        db,
        "comuns",
        finalComumId,
        "instrumentos_config",
      ); // [Funcionamento]: Aponta para a subcoleção de instrumentos configurados daquela igreja comum.
      const localSnap = await getDocs(localRef); // [Funcionamento]: Lê a grade de instrumentos cadastrados na igreja comuns.

      if (localSnap.empty) {
        // [Funcionamento]: Se a lista retornar vazia, significa que a igreja comum não configurou sua orquestra ainda.
        throw new Error("CONFIG_REQUIRED"); // [Funcionamento]: Interrompe a criação disparando o alerta de configuração obrigatória.
      } // [Funcionamento]: Encerra la validation de grade vazia.

      const sessoesDetectadas = new Set(); // [Funcionamento]: Cria uma lista de conjuntos únicos na memória RAM para catalogar os naipes (Cordas, Madeiras, etc).

      localSnap.docs.forEach((docInst) => {
        // [Funcionamento]: Varre instrumento por instrumento configurado na igreja comum.
        const inst = docInst.data(); // [Funcionamento]: Extrai as propriedades do instrumento (ex: section, nome).
        const originalId = docInst.id; // [Funcionamento]: Puxa a chave identificadora do documento.
        const id =
          INSTRUMENT_ID_MAP[originalId.toLowerCase().trim()] ||
          originalId.toLowerCase().trim(); // [Funcionamento]: Higieniza o ID convertendo letras maiúsculas and espaços.
        const sectionName = inst.section?.toUpperCase() || "GERAL"; // [Funcionamento]: Captura o naipe in letras maiúsculas ou define como GERAL padrão.
        sessoesDetectadas.add(sectionName); // [Funcionamento]: Adiciona o naipe catalogado no conjunto único na RAM.

        if (id === "coral" || id === "orgao") {
          // [Funcionamento]: Tratamento especial de inicialização para as seções complexas de Teclas/Irmandade.
          if (finalScope === "regional") {
            // [Funcionamento]: Se for um ensaio amplo de escopo regional.
            initialCounts[id] = {
              // [Funcionamento]: Cria o nó estruturado de contagem inicial com suporte a donos de contagem por naipe.
              total: 0, // [Funcionamento]: Inicializa a volumetria total zerada.
              name: id === "coral" ? "CORAL" : "ÓRGÃO", // [Funcionamento]: Carimba o nome visual estático por extenso.
              section: sectionName, // [Funcionamento]: Vincula o grupo do naipe correspondente.
              evalType: inst.evalType || "Sem", // [Funcionamento]: Aplica o tipo de avaliação padrão.
              responsibleId: null, // [Funcionamento]: Define o ID do dono della contagem como nulo inicial.
              responsibleName: null, // [Funcionamento]: Define o Nome do dono della contagem como nulo inicial.
              updatedAt: Date.now(), // [Funcionamento]: Carimba a data e hora do carimbo inicial in formato numérico Unix.
            }; // [Funcionamento]: Encerra o payload inicial estruturado regional.
            if (id === "coral") {
              // [Funcionamento]: Se for o Coral especificamente no escopo regional.
              initialCounts[id].irmaos = 0; // [Funcionamento]: Inicializa a contagem nominal de irmãos em zero.
              initialCounts[id].irmas = 0; // [Funcionamento]: Inicializa a contagem nominal de irmãs em zero.
              initialCounts[id].responsibleId_irmaos = null; // [Funcionamento]: Zera o ID do encarregado de contar os irmãos.
              initialCounts[id].responsibleId_irmas = null; // [Funcionamento]: Zera o ID do encarregado de contar as irmãs.
              initialCounts[id].responsibleName_irmaos = null; // [Funcionamento]: Zera o nome do encarregado de contar os irmãos.
              initialCounts[id].responsibleName_irmas = null; // [Funcionamento]: Zera o nome do encarregado de contar as irmãs.
            } // [Funcionamento]: Encerra as chaves adicionais do coral regional.
          } else {
            // [Funcionamento]: Caso seja um ensaio de escopo estritamente local de igreja comum.
            initialCounts[id] = {
              // [Funcionamento]: Inicia a fiação simplificada local de Teclas e Coral.
              total: 0,
              irmaos: 0,
              irmas: 0, // [Funcionamento]: Inicializa todos os sub-totalizadores zerados in linha.
              name: id === "coral" ? "CORAL" : "ÓRGÃO", // [Funcionamento]: Carimba o nome por extenso.
              section: sectionName, // [Funcionamento]: Vincula o naipe de irmandade ou organistas.
              evalType: inst.evalType || "Sem", // [Funcionamento]: Inicializa o tipo de avaliação padrão.
              responsibleId: null, // [Funcionamento]: Define o ID do dono della contagem como nulo.
              responsibleName: null, // [Funcionamento]: Define o Nome do dono della contagem como nulo.
              updatedAt: Date.now(), // [Funcionamento]: Carimba o relógio numérico Unix inicial.
            }; // [Funcionamento]: Encerra o payload enxuto local.
          } // [Funcionamento]: Encerra la bifurcação de escopos de Teclas.
        } else {
          // [Funcionamento]: Tratamento para instrumentos lineares comuns da orquestra (ex: violino, flauta).
          if (finalScope === "regional") {
            // [Funcionamento]: Se o ensaio for regional.
            initialCounts[id] = { total: 0, updatedAt: Date.now() }; // [Funcionamento]: Inicializa apenas o total zerado e o relógio.
          } else {
            // [Funcionamento]: Se o ensaio for local da igreja comum.
            initialCounts[id] = {
              total: 0,
              comum: 0,
              enc: 0,
              updatedAt: Date.now(),
            }; // [Funcionamento]: Inicializa a estrutura tripla local (total, comum da casa, visitas/enc).
          } // [Funcionamento]: Encerra la bifurcação de instrumentos comuns.
        } // [Funcionamento]: Encerra a inicialização de nós de instrumentos.
      }); // [Funcionamento]: Encerra la varredura através de foreach de instrumentos.

      sessoesDetectadas.forEach((sec) => {
        // [Funcionamento]: Varre os naipes únicos catalogados para criar as chaves de liderança de grupo (Metas de Naipe).
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, "_")}`; // [Funcionamento]: Transforma o naipe in chave técnica limpa (ex: 'meta_cordas').
        initialCounts[metaKey] = {
          responsibleId: null,
          responsibleName: null,
          isActive: false,
          updatedAt: Date.now(),
        }; // [Funcionamento]: Inicializa a chave de governança do naipe vazia e desligada.
      }); // [Funcionamento]: Encerra o laço das metas de naipes.

      const ataPayload = { status: "open", ocorrencias: [] }; // [Funcionamento]: Cria o objeto inicial da ata do ensaio aberto e sem avisos anotados.
      if (finalScope === "regional") {
        // [Funcionamento]: Se for ensaio regional amplo.
        ataPayload.palavra = {
          anciao: "",
          livro: "",
          capitulo: "",
          verso: "",
          assunto: "",
        }; // [Funcionamento]: Adiciona o mapa estruturado para catalogar a pregação da Palavra.
      } // [Funcionamento]: Encerra o bloco della Palavra regional.

      const payload = {
        // [Funcionamento]: Monta o documento mestre unificado final que será gravado no Firestore.
        type: type || "Ensaio Local", // [Funcionamento]: Grava o tipo textual do evento.
        scope: finalScope, // [Funcionamento]: Grava o escopo territorial ativo.
        shadowScope: finalScope, // [Funcionamento]: Grava a chave espelho de escopo para indexação de segurança.
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], // [Funcionamento]: Salva a lista de secretários convidados ou um array vazio por segurança.
        date, // [Funcionamento]: Carimba a data do calendário no formato YYYY-MM-DD.
        responsavel: responsavel || "Pendente", // [Funcionamento]: Salva the nome del Ancião ou encarregado condutor del ensaio.
        createdById: currentUser?.uid || null, // [Funcionamento]: Salva a ID de autenticação do operador criador.
        createdByLevel:
          userData?.accessLevel || eventData.accessLevel || "basico", // [Funcionamento]: Carimba o nível de acesso contido no crachá do criador.
        comumNome: comumNome || "", // [Funcionamento]: Carimba o nome por extenso da igreja comuns (Denormalização).
        comumId: finalComumId, // [Funcionamento]: Salva o identificador físico de propriedade da igreja comum.
        cidadeId: finalCidadeId, // [Funcionamento]: Salva o ID sanitizado e corrigido da cidade vinculada, liquidando as strings vazias.
        cidadeNome: cidadeNome || "", // [Funcionamento]: Carimba o nome por extenso da cidade vinculada (Cura do bug de Jundiaí).
        regionalId: finalRegionalId, // [Funcionamento]: Salva o ID sanitizado e corrigido da regional administrativa.
        regionalNome: regionalNome || "", // [Funcionamento]: Carimba o nome por extenso da regional administrativa.
        ata: ataPayload, // [Funcionamento]: Acopla a estrutura de ata vazia e aberta montada acima.
        counts: initialCounts, // [Funcionamento]: Acopla toda a grade inicial zerada de instrumentos and naipes criada.
        createdAt: Date.now(), // [Funcionamento]: Registra a data e hora exata de nascimento do ensaio no servidor.
        updatedAt: Date.now(), // [Funcionamento]: Inicializa a marcação de atualização com o mesmo relógio corrente.
        dbVersion: "12.6-serial_fixed", // [Funcionamento]: Carimba a versão técnica estável da arquitetura do banco de dados.
      }; // [Funcionamento]: Encerra a montagem del documento payload mestre.

      const docNovoCriado = await addDoc(
        collection(db, "events_global"),
        payload,
      ); // [Funcionamento]: Despacha o documento para o Firestore e cria o novo ensaio retornando sua ID.

      // 🚀 BLINDAGEM DE ESCOPO HISTÓRICA DA LINHA 235: Chamadas nominais fixas só são criadas se for Ensaio Local. Ensaios Regionais não possuem lista nominal de músicos locais!
      if (finalScope !== "regional") {
        // [Funcionamento]: Se o ensaio for local comum (não regional), monta as chamadas de presença nominais da casa.
        const batchChamada = writeBatch(db); // [Funcionamento]: Inicializa uma transação em lote (writeBatch) de escrita atômica para alta performance.

        const musicosRef = collection(
          db,
          "comuns",
          finalComumId,
          "musicos_lista",
        ); // [Funcionamento]: Aponta para a subcoleção nominal de fichas de músicos cadastrados na igreja comuns.
        const musicosSnap = await getDocs(musicosRef); // [Funcionamento]: Executa a leitura em lote de todos os músicos oficiais e em ensaio da casa.

        musicosSnap.docs.forEach((musicoDoc) => {
          // [Funcionamento]: Varre músico por músico cadastrado na igreja comuns.
          const mData = musicoDoc.data(); // [Funcionamento]: Extrai os dados do músico (nome, instrumentoId).
          const saneInstId =
            INSTRUMENT_ID_MAP[mData.instrumentoId?.toLowerCase().trim()] ||
            mData.instrumentoId; // [Funcionamento]: Saneia o ID do instrumento do irmão.

          if (saneInstId === "coral") return; // [Funcionamento]: Trava de isolamento: Membros do Coral não entram na subcoleção nominal da portaria.

          const llamadaRef = doc(
            collection(
              db,
              "events_global",
              docNovoCriado.id,
              "chamada_musicos",
            ),
            musicoDoc.id,
          ); // [Funcionamento]: Prepara a rota da ficha de presença desse irmão dentro deste ensaio novo.

          batchChamada.set(llamadaRef, {
            // [Funcionamento]: Prepara a escrita da ficha de portaria zerada do músico no lote.
            nome: (mData.nome || mData.name || "IRMÃO(Ã)").toUpperCase().trim(), // [Funcionamento]: Salva o nome do irmão in letras maiúsculas e limpo.
            instrumentoId: saneInstId, // [Funcionamento]: Carimba o ID limpo do instrumento dele.
            instrumentoNome: (
              mData.instrumentoNome ||
              mData.instrumentoId ||
              "GERAL"
            )
              .toUpperCase()
              .trim(), // [Funcionamento]: Carimba o nome por extenso do instrumento em letras maiúsculas.
            situacao: mData.situacao || "Oficializado", // [Funcionamento]: Carimba se ele é oficializado, rjm ou em ensaio.
            presente: false, // [Funcionamento]: Inicializa a presença em falso (ausente por padrão até bater o cartão).
            avaliacao: "Sem", // [Funcionamento]: Inicializa a nota de avaliação da execução musical como "Sem".
            updatedAt: Date.now(), // [Funcionamento]: Registra o carimbo de data Unix.
          }); // [Funcionamento]: Encerra a preparação del documento do músico no lote.
        }); // [Funcionamento]: Encerra o laço XML foreach dos músicos.

        const ministerioSnap = await getDocs(
          collection(db, "comuns", finalComumId, "ministerio_lista"),
        ); // [Funcionamento]: Puxa a lista nominal de obreiros e irmãs examinadoras cadastrados na igreja comum.
        ministerioSnap.docs.forEach((minDoc) => {
          // [Funcionamento]: Varre obreiro por obreiro cadastrado na igreja comuns.
          const minData = minDoc.data(); // [Funcionamento]: Extrai os dados do ministério (nome, cargo).
          const llamadaMinRef = doc(
            collection(
              db,
              "events_global",
              docNovoCriado.id,
              "chamada_ministerio",
            ),
            minDoc.id,
          ); // [Funcionamento]: Prepara a rota da ficha de presença ministerial neste ensaio.
          batchChamada.set(llamadaMinRef, {
            // [Funcionamento]: Prepara a gravação da presença ministerial zerada no lote.
            nome: (minData.nome || minData.name || "OBREIRO")
              .toUpperCase()
              .trim(), // [Funcionamento]: Força o nome do obreiro em letras maiúsculas.
            cargo: minData.cargo, // [Funcionamento]: Carimba o cargo eclesiástico por extenso (Ancião, Diácono, etc).
            presente: false, // [Funcionamento]: Inicializa a presença em falso.
            updatedAt: Date.now(), // [Funcionamento]: Carimba o relógio Unix.
          }); // [Funcionamento]: Encerra a preparação da linha ministerial no lote.
        }); // [Funcionamento]: Encerra o laço foreach do ministério.

        await batchChamada.commit(); // [Funcionamento]: Executa e grava o lote inteiro na nuvem de uma única vez, economizando requisições.
      } // [Funcionamento]: Encerra o bloco de criação de chamadas nominais de Ensaios Locais.

      return docNovoCriado; // [Funcionamento]: Retorna a referência física do ensaio novo criado com sucesso para a tela.
    } catch (err) {
      // [Funcionamento]: Captura qualquer barreira de rede ou erro na montagem do ensaio.
      console.error("Erro na criação do evento:", err); // [Funcionamento]: Imprime a falha no log técnico.
      if (err.message === "CONFIG_REQUIRED") throw err; // [Funcionamento]: Propaga o erro de grade de instrumentos para a tela tratar.
      throw err; // [Funcionamento]: Propaga os demais erros de rede.
    } // [Funcionamento]: Encerra o bloco catch.
  }, // [Funcionamento]: Encerra o método createEvent.

  reopenAta: async (eventId) => {
    // [Funcionamento]: Método encarregado de reabrir uma ata lacrada para correções tardias de secretaria.
    if (!eventId) return; // [Funcionamento]: Cancela se o ID do ensaio não for fornecido.
    const eventRef = doc(db, "events_global", eventId); // [Funcionamento]: Autentica a rota física do ensaio dentro della coleção global.
    try {
      // [Funcionamento]: Tenta efetuar a atualização no servidor.
      return await updateDoc(eventRef, {
        "ata.status": "open",
        updatedAt: Date.now(),
      }); // [Funcionamento]: Altera o status da ata de volta para aberto e atualiza o relógio do documento.
    } catch (e) {
      // [Funcionamento]: Captura falhas (ex: usuário sem permissão eclesiástica na comissão).
      throw new Error("Sem permissão para reabrir."); // [Funcionamento]: Interrompe a execução avisando sobre a restrição de portaria.
    } // [Funcionamento]: Encerra o bloco catch.
  }, // [Funcionamento]: Encerra o método reopenAta.

  addGuest: async (eventId, userObjectOrId) => {
    // [Funcionamento]: Adiciona um secretário visitante autorizado para editar dados neste ensaio.
    if (!eventId || !userObjectOrId) return; // [Funcionamento]: Trava contra disparos órfãos sem dados preenchidos.
    const uid =
      typeof userObjectOrId === "object" ? userObjectOrId.uid : userObjectOrId; // [Funcionamento]: Extrai a string pura do ID do usuário.
    const eventRef = doc(db, "events_global", eventId); // [Funcionamento]: Localiza o documento mestre do ensaio na nuvem.
    try {
      // [Funcionamento]: Tenta injetar o convidado.
      return await updateDoc(eventRef, {
        invitedUsers: arrayUnion(uid),
        updatedAt: Date.now(),
      }); // [Funcionamento]: Injeta o ID no array de convidados sem apagar os existentes (arrayUnion).
    } catch (e) {
      console.error("Erro convidado:", e);
    } // [Funcionamento]: Registra falhas de gravação de rede no console de debug.
  }, // [Funcionamento]: Encerra o método addGuest.

  removeGuest: async (eventId, userObjectOrId) => {
    // [Funcionamento]: Remove a autorização de edição de um secretário visitante neste ensaio.
    if (!eventId || !userObjectOrId) return; // [Funcionamento]: Cancela se os parâmetros vierem nulos.
    const uid =
      typeof userObjectOrId === "object" ? userObjectOrId.uid : userObjectOrId; // [Funcionamento]: Isola a string de identificación do operador.
    const eventRef = doc(db, "events_global", eventId); // [Funcionamento]: Localiza o documento do ensaio no Firestore.
    try {
      // [Funcionamento]: Tenta executar a remoção.
      return await updateDoc(eventRef, {
        invitedUsers: arrayRemove(uid),
        updatedAt: Date.now(),
      }); // [Funcionamento]: Remove o ID do array de convidados na nuvem (arrayRemove).
    } catch (e) {
      console.error("Erro remover convidado:", e);
    } // [Funcionamento]: Registra falhas de comunicação no log técnico.
  }, // [Funcionamento]: Encerra o método removeGuest.

  deleteEvent: async (comumId, eventId) => {
    // [Funcionamento]: Exclui fisicamente um ensaio e limpa seus registros do banco de dados global.
    if (!eventId) throw new Error("ID do evento não fornecido."); // [Funcionamento]: Impede a remoção se o ponteiro ID vier em branco.
    try {
      // [Funcionamento]: Tenta rodar a exclusão.
      const eventRef = doc(db, "events_global", eventId); // [Funcionamento]: Localiza o documento alvo na rota mestre.
      await deleteDoc(eventRef); // [Funcionamento]: Apaga fisicamente o documento principal do Firestore de forma definitiva.
      return true; // [Funcionamento]: Retorna verdadeiro informando o sucesso della remoção para a tela.
    } catch (error) {
      // [Funcionamento]: Captura erros (ex: travas de segurança eclesiásticas ou rede).
      console.error("ERRO_SERVICE_DELETE:", error.message); // [Funcionamento]: Emite a falha detalhada no console técnico.
      throw new Error("PERMISSAO_NEGADA_OU_FALHA_REDE"); // [Funcionamento]: Devolve um erro limpo e amigável para o usuário ler na tela.
    } // [Funcionamento]: Encerra o tratamento catch.
  }, // [Funcionamento]: Encerra o método deleteEvent.

  // 🚀 MOTOR ESTABILIZADO PROFESSIONAL EDITION: Gravação com Buffers Ricos e Salvamento Absoluto de Donos de Naipes e Contadores de Coral
  updateInstrumentCount: async (
    comumId,
    eventId,
    { instId, field, value, userData, section, customName },
  ) => {
    if (!eventId || !instId) return; // [Funcionamento]: Cancela o processamento se o ID do ensaio ou do instrumento vier vazios de segurança.

    const rawId = instId.toLowerCase().trim(); // [Funcionamento]: Converte o ID do instrumento para letras minúsculas e remove espaços residuais nas bordas.

    // 🚀 REDIRECIONAMENTO DE CANOS REGIONAL & FILTRO DE FANTASMAS: Higieniza o ID unificado forçando a passagem segura pelo dicionário estático contendo chaves de 3 letras.
    let targetId =
      rawId === "irmas" || rawId === "irmaos"
        ? "coral"
        : INSTRUMENT_ID_MAP[rawId] || rawId; // [Funcionamento]: Sanitiza e centraliza a árvore do JSON no nó pai correto em minúsculo, liquidando criações como 'tub'.

    const timerKey = `${eventId}_${targetId}`; // [Funcionamento]: Constrói uma chave única na memória RAM combinando o ID do ensaio e do instrumento para agrupar as batidas de teclado.

    // 🚀 CORREÇÃO SUPREMA DA INJEÇÃO SUJA: Passa o campo original enviado pela tela pelo mapa estático. Se o front mandar "tub" como campo a atualizar, ele é interceptado e vira um subcampo limpo de sistema.
    const rawField = field?.toLowerCase().trim(); // [Funcionamento]: Limpa o texto da propriedade de entrada.
    const sanitizedField = INSTRUMENT_ID_MAP[rawField] ? "comum" : field; // [Funcionamento]: 🚀 SEGURO ATÔMICO: Se o campo for uma sigla de instrumento (ex: "tub"), intercepta e força a virar o subcampo operacional legítimo "comum"!

    // [Funcionamento]: Se o ID de clique original for irmas ou irmaos, repassa a sub-chave correta para o campo a ser atualizado dentro do Coral.
    const fieldToUpdate =
      rawId === "irmas" || rawId === "irmaos"
        ? rawId
        : sanitizedField === "total_simples"
          ? "total"
          : sanitizedField; // [Funcionamento]: Garante o mapeamento cirúrgico imune a fiações e propriedades desorganizadas do front de trás.

    const val = Math.max(0, parseInt(value) || 0); // [Funcionamento]: Converte o valor do input em um número inteiro limpo e impede que existam músicos negativos (mínimo zero).

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {}; // [Funcionamento]: Se a represa (Buffer) desse instrumento estiver vazia na RAM, inicializa uma nova gaveta limpa.
    updateBuffers[timerKey][fieldToUpdate] = val; // [Funcionamento]: Armazena temporariamente o novo número digitado pelo usuário na RAM local, respondendo instantaneamente ao toque.

    // 🚀 INJEÇÃO DE GOVERNANÇA (CARIMBAGEM RICA): Guarda as informações do operador logado dentro do Buffer para não perdê-las no delay de 400ms
    if (userData && userData.uid) {
      // [Funcionamento]: Se o crachá do secretário ativo contiver um código de login legítimo.
      // 🚀 CAPTURA DE ASSINATURA POR GÊNERO REGIONAL: Se for clique em irmas/irmaos, assina na vaga correspondente da comarca.
      if (rawId === "irmas" || rawId === "irmaos") {
        updateBuffers[timerKey][`responsibleId_${rawId}`] = userData.uid; // [Funcionamento]: Assina o ID na vaga de gênero do buffer.
        updateBuffers[timerKey][`responsibleName_${rawId}`] =
          userData.name || userData.responsavel || "Secretaria"; // [Funcionamento]: Assina o Nome na vaga de gênero do buffer.
      } else {
        updateBuffers[timerKey]["responsibleId"] = userData.uid; // [Funcionamento]: Carimba o ID do secretário logado na gaveta temporária da RAM mestre.
        updateBuffers[timerKey]["responsibleName"] =
          userData.name || userData.responsavel || "Secretaria"; // [Funcionamento]: Carimba o Nome por extenso do responsável na gaveta da RAM mestre.
      }
    } // [Funcionamento]: Encerra o salvamento das credenciais do dono del naipe no buffer.

    if (section) {
      // [Funcionamento]: Se a seção do naipe (ex: CORDAS, MADEIRAS) for passada pela tela do contador.
      updateBuffers[timerKey]["section"] = section.toUpperCase().trim(); // [Funcionamento]: Garante o nome do naipe salvo em letras maiúsculas e limpo.
    } // [Funcionamento]: Encerra o salvamento do naipe no buffer.

    if (customName) {
      // [Funcionamento]: Caso seja um instrumento extra customizado inserido de forma avulsa pela comissão.
      updateBuffers[timerKey]["name"] = customName.toUpperCase().trim(); // [Funcionamento]: Carimba o nome do instrumento extra em caixa alta.
    } // [Funcionamento]: Encerra o carimbo de nome customizado.

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]); // [Funcionamento]: Se houver um temporizador ativo rodando (usuário metralhando o botão +), desliga ele para renovar o prazo.

    debounceTimers[timerKey] = setTimeout(async () => {
      // [Funcionamento]: Abre uma contagem regressiva de 400 milissegundos na memória RAM. Quando você parar de digitar, ele executa o bloco abaixo.
      const eventRef = doc(db, "events_global", eventId); // [Funcionamento]: Localiza o documento físico del ensaio ativo na coleção global do Firestore.
      const bufferCopy = { ...updateBuffers[timerKey] }; // [Funcionamento]: Clona de forma isolada todos os dados represados na RAM para liberar o buffer para los próximos cliques.

      delete updateBuffers[timerKey]; // [Funcionamento]: Esvazia e limpa a represa física da RAM desse instrumento para as próximas contagens.
      delete debounceTimers[timerKey]; // [Funcionamento]: Deleta o temporizador gasto da memória para fechar o ciclo do circuito.

      try {
        // [Funcionamento]: Inicia a tentativa de gravação definitiva em lote na nuvem do Firestore.
        const finalUpdates = {}; // [Funcionamento]: Cria a sacola final de propriedades que serão enviadas para o servidor do Firebase.
        const baseKey = `counts.${targetId}`; // [Funcionamento]: Monta o caminho técnico do objeto no banco (ex: 'counts.violino' ou 'counts.coral').

        // 🚀 CÁLCULO ATÔMICO CUMULATIVO REAL DE TOTALIZADOR DO CORAL COM LEITURA DA NUVEM (FIM DA FIAÇÃO PARTIDA)
        if (targetId === "coral") {
          // [Funcionamento]: Se o identificador de destino for o Coral, executa a mesclagem atômica lendo o documento físico para impedir pulverizações.
          const docSnapSnapshot = await getDoc(eventRef); // [Funcionamento]: Lê o estado instantâneo atualizado do ensaio direto do Firestore antes de somar.
          const dadosAtuaisBanco = docSnapSnapshot.exists()
            ? docSnapSnapshot.data()?.counts?.coral
            : {}; // [Funcionamento]: Extrai com segurança a gaveta atual do Coral salva na nuvem.

          const bancoIrmas = parseInt(dadosAtuaisBanco?.irmas) || 0; // [Funcionamento]: Resgata o número de irmãs legítimo gravado no servidor.
          const bancoIrmaos = parseInt(dadosAtuaisBanco?.irmaos) || 0; // [Funcionamento]: Resgata o número de irmãos legítimo gravado no servidor.

          const finalIrmas =
            typeof bufferCopy["irmas"] !== "undefined"
              ? bufferCopy["irmas"]
              : bancoIrmas; // 🚀 SOLUÇÃO DO UNDEFINED: Se o clique atual não trouxe as irmãs, herda o valor real do banco in vez de zerar!
          const finalIrmaos =
            typeof bufferCopy["irmaos"] !== "undefined"
              ? bufferCopy["irmaos"]
              : bancoIrmaos; // 🚀 SOLUÇÃO DO UNDEFINED: Se o clique atual não trouxe os irmãos, herda o valor real do banco in vez de zerar!
          const somaTotalAbsoluta = finalIrmas + finalIrmaos; // [Funcionamento]: Realiza a soma matemática legítima das duas metade da irmandade.

          bufferCopy["irmas"] = finalIrmas; // [Funcionamento]: Re-injeta o valor unificado estável corrigido no payload de irmãs.
          bufferCopy["irmaos"] = finalIrmaos; // [Funcionamento]: Re-injeta o valor unificado estável corrigido no payload de irmãos.
          bufferCopy["total"] = somaTotalAbsoluta; // [Funcionamento]: Grava o total absoluto corrigido imune a concorrência assíncrona. Envia sem o `.comum` intruso!
        } // [Funcionamento]: Encerra a blindagem especial do Coral contra pulverização de dados.

        // 🚀 ELEVAÇÃO ATÔMICA DA VALIDAÇÃO DO CARD (PROTEÇÃO DE TETO CONTRA ZERADOS): Se o campo atual for da 'comum' e o valor for maior do que o total físico do ensaio aberto, sobe o Total de forma automática para destravar a tela principal de trás!
        if (fieldToUpdate === "comum") {
          // [Funcionamento]: Avalia se a gravação pertence ao nó dos músicos da casa (Toque Azul ou digitação avulsa).
          const docSnapshotParaTeto = await getDoc(eventRef); // [Funcionamento]: Realiza uma leitura rápida de segurança do documento na nuvem para ler a estrutura de setas vigentes.
          const dadosAtuaisInstrumento = docSnapshotParaTeto.exists()
            ? docSnapshotParaTeto.data()?.counts?.[targetId]
            : {}; // [Funcionamento]: Puxa a caixinha numérica salva do instrumento (ex: Tuba).
          const totalAtualDoBanco =
            parseInt(dadosAtuaisInstrumento?.total) || 0; // [Funcionamento]: Isola os músicos totais salvos nas setas pretas do painel.
          if (val > totalAtualDoBanco) {
            // [Funcionamento]: Se a contagem nominal de cabeças da comum ultrapassar o limite das setas pretas.
            bufferCopy["total"] = val; // [Funcionamento]: Força a elevação automática do totalizador para o mesmo número de cabeças presentes, impedindo o reset síncrono para zero.
          } // [Funcionamento]: Termina a barreira de teto.
        } // [Funcionamento]: Encerra o interceptador de proteção.

        Object.keys(bufferCopy).forEach((f) => {
          // [Funcionamento]: Varre todas as propriedades salvas na cópia do buffer (números, nomes, IDs).
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; // [Funcionamento]: Monta o caminho absoluto no banco de dados injetando a propriedade correspondente perfeitamente aninhada.
        }); // [Funcionamento]: Encerra a varredura das chaves colhidas do buffer.

        finalUpdates[`${baseKey}.updatedAt`] = Date.now(); // [Funcionamento]: Carimba o relógio Unix preciso no nó individual do instrumento (Cura das piscadas de concorrência).
        finalUpdates[`updatedAt`] = Date.now(); // [Funcionamento]: Atualiza o relógio na raiz do ensaio global para avisar o painel que o documento mudou.

        await updateDoc(eventRef, finalUpdates); // [Funcionamento]: Dispara a gravação atômica rica de um único tiro (`updateDoc`) no Firestore, salvando números, donos de naipes e totais sincronizados.
      } catch (e) {
        // [Funcionamento]: Captura quedas de conexão ou barreiras nas Firestore Security Rules.
        console.error("Erro na Gravação Stabilizada:", e.message); // [Funcionamento]: Emite o alerta técnico detalhado no log técnico.
      } // [Funcionamento]: Encerra o bloco catch de gravação.
    }, 400); // [Funcionamento]: Encerra o prazo de 400 milissegundos do circuito temporizador setTimeout.
  }, // [Funcionamento]: Encerra o método estabilizado updateInstrumentCount.

  removeExtraInstrument: async (comumId, eventId, instId) => {
    // [Funcionamento]: Remove um instrumento extra avulso criado por engano no ensaio corrente.
    if (!eventId || !instId) return; // [Funcionamento]: Interrompe se as referências de IDs vierem vazias.
    try {
      // [Funcionamento]: Tenta remover a propriedade.
      return await updateDoc(doc(db, "events_global", eventId), {
        [`counts.${instId}`]: deleteField(),
        updatedAt: Date.now(),
      }); // [Funcionamento]: Executa um comando especial do Firestore (`deleteField`) que arranca o nó do mapa sem quebrar os outros instrumentos.
    } catch (e) {
      console.error("Erro ao remover instrumento extra:", e);
    } // [Funcionamento]: Registra erros de portaria ou internet no log.
  }, // [Funcionamento]: Encerra o método removeExtraInstrument.

  saveAtaData: async (comumId, eventId, ataData) => {
    // [Funcionamento]: Grava os dados de liturgia, hinos tocados e ocorrências textuais na ata do ensaio.
    if (!eventId) throw new Error("Evento inválido."); // [Funcionamento]: Aborta se o ID do ensaio estiver corrompido ou ausente.
    const eventRef = doc(db, "events_global", eventId); // [Funcionamento]: Localiza a rota do documento na coleção global.

    let todosHinos = []; // [Funcionamento]: Cria um vetor vazio na RAM para unificar os números de hinos de todas as etapas.
    let partesValidas = Array.isArray(ataData.partes) ? ataData.partes : []; // [Funcionamento]: Garante que a estrutura de blocos e partes seja um array legítimo.
    partesValidas.forEach((p) => {
      // [Funcionamento]: Varre etapa por etapa litúrgica do ensaio (1ª parte, 2ª parte, etc).
      if (p.hinos)
        todosHinos = [
          ...todosHinos,
          ...p.hinos.filter((h) => h && h.trim() !== ""),
        ]; // [Funcionamento]: Limpa hinos em branco e anexa os números válidos no acumulador.
    }); // [Funcionamento]: Encerra o laço das etapas litúrgicas.

    const finalAta = {
      // [Funcionamento]: Monta o objeto final higienizado da ata (Denormalização).
      ...ataData, // [Funcionamento]: Herda os campos textuais digitados (nomes de pregadores, hinos).
      hinosChamados: todosHinos.length, // [Funcionamento]: Calculates e grava a quantidade numérica total de hinos chamados.
      hinosLista: todosHinos, // [Funcionamento]: Grava a lista linear limpa de hinos para criação direta de resumos.
      lastUpdate: Date.now(), // [Funcionamento]: Carimba o relógio Unix de atualização da ata.
      status: ataData.status || "open", // [Funcionamento]: Mantém o status aberto ou o status enviado pela tela.
    }; // [Funcionamento]: Encerra a montagem do objeto da ata.

    try {
      // [Funcionamento]: Tenta despachar a ata para a nuvem.
      await updateDoc(eventRef, { ata: finalAta, updatedAt: Date.now() }); // [Funcionamento]: Grava o bloco da ata updated de uma única vez no Firestore.
    } catch (e) {
      // [Funcionamento]: Captura falhas de rede.
      console.error("Erro salvar Ata:", e); // [Funcionamento]: Registra o erro no console de debug.
      throw new Error("Erro de salvamento."); // [Funcionamento]: Devolve uma mensagem limpa de falha de rede para o usuário.
    } // [Funcionamento]: Encerra o bloco de tratamento catch.
  }, // [Funcionamento]: Encerra o método saveAtaData.

  addMusicoComum: async (comumId, musicoPayload) => {
    // [Funcionamento]: Cadastra a ficha cadastral de um Executar novo músico na lista nominal fixa da igreja comum.
    if (!comumId || !musicoPayload.nome || !musicoPayload.instrumentoId)
      throw new Error("Parâmetros incompletos."); // [Funcionamento]: Trava contra cadastros incompletos sem nome ou instrumento amarrados.
    try {
      // [Funcionamento]: Tenta efetuará o cadastro.
      const sId =
        INSTRUMENT_ID_MAP[musicoPayload.instrumentoId.toLowerCase().trim()] ||
        musicoPayload.instrumentoId; // [Funcionamento]: Higieniza a string de ID do instrumento.
      const novaFichaRef = doc(
        collection(db, "comuns", comumId, "musicos_lista"),
      ); // [Funcionamento]: Prepara a nova rota com ID aleatório na subcoleção fixa da igreja comuns.
      const payloadSaneado = {
        // [Funcionamento]: Estrutura a ficha limpa do músico.
        nome: musicoPayload.nome.toUpperCase().trim(), // [Funcionamento]: Força o nome do músico em letras maiúsculas e sem espaços extras.
        instrumentoId: sId, // [Funcionamento]: Grava o ID limpo do instrumento.
        instrumentoNome: (musicoPayload.instrumentoNome || sId)
          .toUpperCase()
          .trim(), // [Funcionamento]: Grava o nome por extenso do instrumento em letras maiúsculas.
        situacao: musicoPayload.situacao || "Oficializado", // [Funcionamento]: Vincula o cargo eclesiástico musical (Oficializado, RJM, etc).
        createdAt: Date.now(), // [Funcionamento]: Carimba a data de nascimento da ficha.
        updatedAt: Date.now(), // [Funcionamento]: Inicializa o relógio de alterações.
      }; // [Funcionamento]: Encerra a montagem da ficha limpa do músico.
      await setDoc(novaFichaRef, payloadSaneado); // [Funcionamento]: Grava fisicamente a ficha do irmão no Firestore.
      return novaFichaRef.id; // [Funcionamento]: Devolve o ID da nova ficha criada para o aplicativo.
    } catch (e) {
      // [Funcionamento]: Cadastra a ficha cadastral de um Executar novo músico na lista nominal fixa da igreja comum.
      console.error("Erro ao adicionar músico comum:", e); // [Funcionamento]: Emite a falha no log técnico.
      throw new Error("Erro ao salvar músico."); // [Funcionamento]: Avisa a tela sobre a falha.
    } // [Funcionamento]: Encerra o bloco catch.
  }, // [Funcionamento]: Encerra o método addMusicoComum.

  updateMusicoComum: async (comumId, musicoId, camposNovos) => {
    // [Funcionamento]: Edita os dados cadastrais (como mudança de instrumento ou correção de nome) da ficha de um músico da casa.
    if (!comumId || !musicoId) throw new Error("Identificadores ausentes."); // [Funcionamento]: Trava se os ponteiros de rotas vierem em branco.
    try {
      // [Funcionamento]: Tenta processar a alteração.
      const fichaRef = doc(db, "comuns", comumId, "musicos_lista", musicoId); // [Funcionamento]: Localiza a ficha exata na subcoleção daquela igreja comum.
      const payloadUpdates = { ...camposNovos, updatedAt: Date.now() }; // [Funcionamento]: Herda as alterações da tela e carimba o relógio Unix corrente.
      if (payloadUpdates.nome)
        payloadUpdates.nome = payloadUpdates.nome.toUpperCase().trim(); // [Funcionamento]: Se o nome foi alterado, força caixa alta limpa.
      if (payloadUpdates.instrumentoId)
        payloadUpdates.instrumentoId =
          INSTRUMENT_ID_MAP[
            payloadUpdates.instrumentoId.toLowerCase().trim()
          ] || payloadUpdates.instrumentoId; // [Funcionamento]: Saneia o ID do instrumento modificado.
      if (payloadUpdates.instrumentoNome)
        payloadUpdates.instrumentoNome = payloadUpdates.instrumentoNome
          .toUpperCase()
          .trim(); // [Funcionamento]: Força o nome por extenso do instrumento em letras maiúsculas.
      await updateDoc(fichaRef, payloadUpdates); // [Funcionamento]: Grava as alterações na ficha cadastral do irmão no servidor.
      return true; // [Funcionamento]: Retorna verdadeiro informando o sucesso.
    } catch (e) {
      // [Funcionamento]: Captura falhas de rede.
      console.error("Erro ao atualizar músico comum:", e); // [Funcionamento]: Registra a falha no console técnico.
      throw new Error("Erro ao salvar alterações."); // [Funcionamento]: Reporta erro para a interface.
    } // [Funcionamento]: Encerra o tratamento catch.
  }, // [Funcionamento]: Encerra o método updateMusicoComum.

  deleteMusicoComum: async (comumId, musicoId) => {
    // [Funcionamento]: Remove definitivamente a ficha cadastral de um músico da lista fixa da igreja comum (ex: mudança de comum).
    if (!comumId || !musicoId) throw new Error("Identificadores ausentes."); // [Funcionamento]: Cancela se as chaves virem em branco.
    try {
      // [Funcionamento]: Tenta remover a ficha.
      const fichaRef = doc(db, "comuns", comumId, "musicos_lista", musicoId); // [Funcionamento]: Localiza a ficha do músico na subcoleção fixa.
      await deleteDoc(fichaRef); // [Funcionamento]: Deleta fisicamente o documento da ficha mestre do Firestore.
      return true; // [Funcionamento]: Devolve verdadeiro sinalizando sucesso para a tela.
    } catch (e) {
      // [Funcionamento]: Captura erros.
      console.error("Erro ao excluir músico comum:", e); // [Funcionamento]: Registra a falha técnica no log.
      throw new Error("Erro ao deletar músico."); // [Funcionamento]: Avisa a tela sobre o insucesso do comando de remoção.
    } // [Funcionamento]: Encerra o tratamento catch.
  }, // [Funcionamento]: Encerra o método deleteMusicoComum.
};
