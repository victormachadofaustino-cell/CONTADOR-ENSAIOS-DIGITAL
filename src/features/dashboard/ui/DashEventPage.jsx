import React, { useMemo, useState, useEffect } from "react"; // [Funcionamento]: Traz as ferramentas oficiais do React para gerenciar memória, estados e efeitos de escuta.
import { useAuth } from "../../../app/providers/AuthContext"; // [Funcionamento]: Conecta ao sistema de login para ler o "Crachá Eletrônico" (Custom Claims) do usuário ativo.
import { hasPermission } from "../../../shared/config/permissions"; // [Funcionamento]: Importa a tabela de segurança para decidir quem pode exportar relatórios.
import { pdfEventService } from "../../../shared/api/pdfEventService"; // [Funcionamento]: Importa o serviço responsável por construir o documento impresso em PDF.
import { whatsappService } from "../../../shared/api/whatsappService"; // [Funcionamento]: Importa o formatador automatizado de mensagens para o WhatsApp.
import { db } from "../../../shared/api/firebase"; // [Funcionamento]: Conexão cirúrgica com o banco de dados sem requisições redundantes.
import { collection, doc, onSnapshot } from "firebase/firestore"; // [Funcionamento]: Importa o escutador em tempo real e o direcionador de coleções do Firebase.
import toast from "react-hot-toast"; // [Funcionamento]: Importa o sistema de balões de aviso flutuantes para a interface.
import {
  LayoutGrid,
  ClipboardList,
  Scale,
  PieChart,
  FileText,
  Share2,
} from "lucide-react"; // [Funcionamento]: Importa os ícones do menu de navegação do carrossel, o ícone de arquivo e o ícone de compartilhar.
import { AnimatePresence, motion } from "framer-motion"; // [Funcionamento]: Motor de animation para transições suaves de deslize entre as telas.

// 📦 IMPORTAÇÃO DAS 4 TELAS ESPECIALIZADAS E DESMEMBRADAS
import ScreenGeral from "./components/ScreenGeral.jsx"; // [Funcionamento]: Importa a Tela 1: Cards Interativos e Gráficos Históricos.
import ScreenPresenca from "./components/ScreenPresenca.jsx"; // [Funcionamento]: Importa a Tela 2: Trilho de Chamada Nominal de Presentes.
import ScreenEquilibrio from "./components/ScreenEquilibrio.jsx"; // [Funcionamento]: Importa a Tela 3: Distribuição e Porcentagem de Naipes.
import ScreenResumo from "./components/ScreenResumo.jsx"; // [Funcionamento]: Importa a Tela 4: Painel da Copa e Conclusão Operacional.

const DashEventPage = ({
  counts,
  ataData,
  isAdmin,
  eventId,
  allEvents = [],
  instrumentsConfig,
}) => {
  // [Funcionamento]: Início do componente Maestro que gerencia o painel do ensaio.
  const { userData } = useAuth(); // [Funcionamento]: Recupera o Crachá Eletrônico do usuário conectado de forma local (Custo Zero de cota).

  // 🛡️ VALIDAÇÃO DE PERMISSÃO EM TEMPO REAL
  const canExport = hasPermission(userData, "generate_report", ataData?.scope); // [Funcionamento]: Valida se o crachá do usuário permite emitir relatórios.

  const [currentScreen, setCurrentScreen] = useState("geral"); // [Funcionamento]: Estado que controla qual aba do carrossel está activa.
  const [activeModal, setActiveModal] = useState(null); // [Funcionamento]: Estado global que gerencia qual modal de Drilldown está aberto centralizado na tela.
  const [comumFullData, setComumFullData] = useState(null); // [Funcionamento]: Estado local criado para reter as informações completas de endereço físico e horários da comum.

  const isBasico = userData?.isBasico; // [Funcionamento]: Verifica se é um usuário com acesso básico de consulta.

  // 📡 PONTE REATIVA DE PRESENÇA (CAPTURA A SUBCOLEÇÃO DO FIRESTORE EM TEMPO REAL)
  const [chamadaNominal, setChamadaNominal] = useState([]); // [Funcionamento]: Estado local que guardará a lista de chamada vinda de chamada_musicos.

  useEffect(() => {
    // [Funcionamento]: Dispara a escuta em tempo real da lista de presença assim que a página carrega.
    if (!eventId) return; // [Funcionamento]: Trava de segurança caso o identificador do evento não seja carregado na inicialização.

    // 🎯 Mira diretamente na subcoleção do evento atual para não misturar dados
    const llamadaRef = collection(
      db,
      "events_global",
      eventId,
      "chamada_musicos",
    ); // [Funcionamento]: Monta o caminho da subcoleção no banco.

    // 🏎️ Escuta reativa em tempo real com custo zero de re-consultas na navegação de abas
    const unsubscribe = onSnapshot(
      llamadaRef,
      (snapshot) => {
        // [Funcionamento]: Liga o canal reativo com o banco.
        const listaMusicos = []; // [Funcionamento]: Cria a gaveta vazia temporária para receber os músicos da portaria.
        snapshot.forEach((docSnap) => {
          // [Funcionamento]: Varre documento por documento reativamente.
          const dados = docSnap.data(); // [Funcionamento]: Puxa o JSON puro interno do Firestore.
          // 🚀 CORREÇÃO DE DADOS: Inclui todos os dados do músico (incluindo instrumentoId) para uso posterior.
          listaMusicos.push({
            id: docSnap.id,
            ...dados,
            presente: dados.presente === true,
          });
        }); // [Funcionamento]: Termina a varredura do snapshot.
        setChamadaNominal(listaMusicos); // [Funcionamento]: Atualiza a esteira de presença dinamicamente
      },
      (error) => {
        // [Funcionamento]: Captura erros na escuta do Firestore.
        console.error("Erro na escuta da chamada:", error); // [Funcionamento]: Emite alerta no console se houver perda de autenticação no Firebase.
      },
    ); // [Funcionamento]: Fecha a escuta em tempo real.

    return () => unsubscribe(); // [Funcionamento]: Desliga laço de escuta ao fechar o painel para proteger a bateria e a cota de dados.
  }, [eventId]); // [Funcionamento]: Monitora re-atualizações baseadas estritamente se o ID do ensaio mudar.

  // 📡 PONTE REATIVA DE ENDEREÇO DA COMUM (BUSCA AS INFORMAÇÕES DE CADASTRO DA LOCALIDADE EM SEGUNDO PLANO)
  useEffect(() => {
    // [Funcionamento]: Abre escuta paralela para capturar os dados geográficos e cadastrais da igreja local.
    const comumTargetId =
      ataData?.comumId || userData?.activeComumId || userData?.comumId; // [Funcionamento]: Isola o identificador da igreja comum de forma segura.
    if (!comumTargetId) return; // [Funcionamento]: Aborta se não houver ponteiro GPS territorial disponível na RAM.

    // 🏎️ Escuta em tempo real conectada na raiz da comum para capturar mapas de ruas e horários de cultos
    const unsubComum = onSnapshot(
      doc(db, "comuns", comumTargetId),
      (docSnap) => {
        // [Funcionamento]: Abre escuta no documento mestre da igreja.
        if (docSnap.exists()) {
          // [Funcionamento]: Se a ficha cadastral da igreja existir no servidor.
          setComumFullData({ id: docSnap.id, ...docSnap.data() }); // [Funcionamento]: Despeja o endereço, CEP, rua e número salvos na RAM.
        } // [Funcionamento]: Fecha validação de existência.
      },
      (err) => {
        // [Funcionamento]: Captura erros de restrição de segurança.
        console.error("Erro ao escutar dados da comum:", err); // [Funcionamento]: Registra bloqueios de portaria nas regras de segurança do Firebase.
      },
    ); // [Funcionamento]: Fecha o canal de monitoramento da comum.

    return () => unsubComum(); // [Funcionamento]: Desliga o elo de escuta geográfica ao sair do painel.
  }, [ataData?.comumId, userData]); // [Funcionamento]: Monitora as chaves de isolamento territorial do usuário ativo.

  // ⚡ COMPILADOR MATEMÁTICO INTEGRADO (PROCESSA TUDO EM MEMÓRIA LOCAL SEM CUSTO DE COTA - DENORMALIZADO)
  const stats = useMemo(() => {
    // [Funcionamento]: useMemo retém os cálculos em cache e só reprocessa se os dados mudarem fisicamente.
    const totals = {
      geral: 0,
      orquestra: 0,
      musicos: 0,
      organistas: 0,
      irmandade: 0,
      irmaos: 0,
      irmas: 0,
      hinos: 0,
      visitas_total: 0,
      ministerio_oficio: 0,
      cordas: 0,
      cordasComum: 0,
      cordasVisita: 0,
      madeiras: 0,
      madeirasComum: 0,
      madeirasVisita: 0,
      metais: 0,
      metaisComum: 0,
      metaisVisita: 0,
      saxofones: 0,
      saxofonesComum: 0,
      saxofonesVisita: 0,
      teclas: 0,
      teclasComum: 0,
      teclasVisita: 0,
      organistasComum: 0,
      organistasVisita: 0,
      musicosComum: 0,
      musicosVisita: 0,
      encRegionalComum: 0,
      encRegionalVisita: 0,
      encLocalComum: 0,
      encLocalVisita: 0,
      encTotal: 0,
      examinadorasComum: 0,
      examinadorasVisita: 0,
      examinadorasTotal: 0,
      hinosP1: [],
      hinosP2: [],
      deltaGeral: 0,
      deltaOrquestra: 0,
      deltaCoral: 0,
      deltaHinos: 0,
      deltaEncarregados: 0,
      // 🚀 ENRIQUECIMENTO DE DADOS: Anexa a 'section' (família) a cada músico presente,
      // usando os dados de 'counts' para garantir o agrupamento correto na tela de presença.
      musicosPresentesLista: chamadaNominal.map((musico) => {
        const instId = (musico.instrumentoId || "").toLowerCase().trim();
        const section = counts?.[instId]?.section;
        return {
          ...musico,
          section: section,
        };
      }),
      historicoGrafico: [],
    }; // [Funcionamento]: Inicializa a árvore limpa de acumuladores de BI.

    if (counts) {
      // [Funcionamento]: Valida se o objeto contendo as contagens numéricas da portaria foi carregado.
      Object.entries(counts).forEach(([id, data]) => {
        // [Funcionamento]: Passa uma varredura em cada uma das linhas do objeto de contagem.
        if (id.startsWith("meta_")) return; // [Funcionamento]: Descarta linhas de configuração técnica que não representam pessoas.
        const valTotal = parseInt(data.total) || 0; // [Funcionamento]: Captura o total de cabeças confirmadas daquele instrumento.
        const valComum = parseInt(data.comum) || 0; // [Funcionamento]: Captura quantos são da própria igreja comum local.
        const valVisita = Math.max(0, valTotal - valComum); // [Funcionamento]: Realiza subtração segura para isolar o número de visitantes.
        const section = (data.section || "GERAL").toUpperCase(); // [Funcionamento]: Isola o nome da seção litúrgica mestre em maiúsculo.
        const saneId = id.toLowerCase(); // [Funcionamento]: Normaliza a string do ID do instrumento in minúsculo.

        if (
          saneId === "coral" ||
          section === "IRMANDADE" ||
          saneId.includes("irmandade") ||
          saneId.includes("irmao") ||
          saneId.includes("irma")
        ) {
          // [Funcionamento]: Identifica se pertence ao coro ou irmandade de fileira.
          const irmaosCount = parseInt(data.irmaos) || 0; // [Funcionamento]: Soma os irmãos homens da irmandade.
          const irmasCount = parseInt(data.irmas) || 0; // [Funcionamento]: Soma as irmãs mulheres da irmandade.
          totals.irmaos += irmaosCount; // [Funcionamento]: Acumula no totalizador anual de homens.
          totals.irmas += irmasCount; // [Funcionamento]: Acumula no totalizador anual de mulheres.
          totals.irmandade += irmaosCount + irmasCount; // [Funcionamento]: Soma no montante de suporte geral da irmandade.
        } else if (
          section === "ORGANISTAS" ||
          saneId === "orgao" ||
          saneId === "org"
        ) {
          // [Funcionamento]: Identifica se o instrumento pertence ao banco do órgão eletrônico.
          totals.organistas += valTotal; // [Funcionamento]: Acumula no bloco absoluto de organistas presentes.
          totals.organistasComum += valComum; // [Funcionamento]: Incrementa organistas que pertencem à casa.
          totals.organistasVisita += valVisita; // [Funcionamento]: Incrementa organistas visitantes de apoio.
        } else {
          // [Funcionamento]: Se for músico de fileira orquestral (Cordas, Madeiras, Saxofones, Metais ou Teclas).
          totals.musicos += valTotal; // [Funcionamento]: Acumula no bloco absoluto de músicos de sopro e arco.
          totals.musicosComum += valComum; // [Funcionamento]: Soma músicos da própria comum local.
          totals.musicosVisita += valVisita; // [Funcionamento]: Soma músicos visitantes.

          // 🚀 ALTERAÇÃO SOLICITADA (INVERSÃO DA PRECEDÊNCIA DE METAIS): Metais sobem para o topo para interceptar o Flugelhorn antes das Cordas!
          if (
            section.includes("METAI") ||
            [
              "tpt",
              "tbn",
              "trp",
              "euf",
              "tub",
              "trompete",
              "flugelhorn",
              "flugel",
            ].includes(saneId) ||
            id.toUpperCase().includes("FLUGEL")
          ) {
            // [Funcionamento]: Identifica e blinda o Flugel nos metais de bocal de forma estrita.
            totals.metais += valTotal;
            totals.metaisComum += valComum;
            totals.metaisVisita += valVisita; // [Funcionamento]: Distribui nos sub-contadores de metais de forma isolada na RAM.
          } else if (
            [
              "vln",
              "vla",
              "vcl",
              "violino",
              "viola",
              "violoncelo",
              "contrabaixo",
            ].includes(saneId) ||
            section.includes("CORDA")
          ) {
            // [Funcionamento]: Identifica se é do naipe de cordas puras de arco.
            totals.cordas += valTotal;
            totals.cordasComum += valComum;
            totals.cordasVisita += valVisita; // [Funcionamento]: Distribui nos sub-contadores de cordas locais e de visitas.
          } else if (section.includes("SAX")) {
            // [Funcionamento]: Identifica se é do naipe de saxofones.
            totals.saxofones += valTotal;
            totals.saxofonesComum += valComum;
            totals.saxofonesVisita += valVisita; // [Funcionamento]: Distribui nos sub-contadores de saxofones.
          } else if (
            section.includes("MADEIRA") ||
            ["flt", "clt", "oboe", "fgt", "flauta", "clarinete"].includes(
              saneId,
            )
          ) {
            // [Funcionamento]: Identifica se é do naipe de madeiras.
            totals.madeiras += valTotal;
            totals.madeirasComum += valComum;
            totals.madeirasVisita += valVisita; // [Funcionamento]: Distribui nos sub-contadores de madeiras.
          } else if (saneId === "acordeon" || section.includes("TECLA")) {
            // [Funcionamento]: Verifica e acumula os acordeonistas e teclistas.
            totals.teclas += valTotal;
            totals.teclasComum += valComum;
            totals.teclasVisita += valVisita; // [Funcionamento]: Distribui nos sub-contadores de teclas/acordeon de forma consolidada.
          } // [Funcionamento]: Encerra sub-triagem de naipes com precedência restabelecida.
        } // [Funcionamento]: Termina bloco condicional de categorias.
      }); // [Funcionamento]: Fecha loop forEach de linhas de contagem.
    } // [Funcionamento]: Fecha validação de existência de contagens.

    const processarPessoasAta = (lista, isVisitante = false) => {
      // [Funcionamento]: Função auxiliar interna para varrer e contar o ministério de oficialato da ata.
      if (!lista || !Array.isArray(lista)) return; // [Funcionamento]: Aborta se a lista nominal vier vazia.
      lista.forEach((p) => {
        // [Funcionamento]: Percorre pessoa por pessoa da lista de ministério.
        const cargo = p.min || p.role || ""; // [Funcionamento]: Pesca o cargo carimbado na ficha eletrônica do irmão.
        if (isVisitante) totals.visitas_total++; // [Funcionamento]: Se a flag marcar verdadeiro, incrementa o totalizador geral de visitantes.

        if (cargo === "Encarregado Regional") {
          // [Funcionamento]: Identifica se é encarregado regional.
          if (isVisitante) totals.encRegionalVisita++;
          else totals.encRegionalComum++; // [Funcionamento]: Acumula na gaveta correspondente de comarca.
        } // [Funcionamento]: Termina checagem de regional.
        if (cargo === "Encarregado Local") {
          // [Funcionamento]: Identifica se é encarregado de orquestra local.
          if (isVisitante) totals.encLocalVisita++;
          else totals.encLocalComum++; // [Funcionamento]: Acumula na gaveta correspondente local.
        } // [Funcionamento]: Termina checagem de local.
        if (cargo === "Examinadora") {
          // [Funcionamento]: Identifica se é examinadora de organistas.
          if (isVisitante) totals.examinadorasVisita++;
          else totals.examinadorasComum++; // [Funcionamento]: Separa e incrementa nos blocks de examinadoras.
          totals.examinadorasTotal++; // [Funcionamento]: Soma no montante absoluto de examinadoras na ata.
        } // [Funcionamento]: Termina checagem de examinadora.
        if (
          [
            "Ancião",
            "Diácono",
            "Cooperador do Ofício",
            "Cooperador RJM",
          ].includes(cargo)
        ) {
          // [Funcionamento]: Varre os cargos do Ministério de Ofício do Altar.
          totals.ministerio_oficio++; // [Funcionamento]: Soma no totalizador de oficiais presentes.
        } // [Funcionamento]: Termina checagem de ofício.
      }); // [Funcionamento]: Fecha o laço forEach de pessoas.
    }; // [Funcionamento]: Encerra função interna de processamento.

    processarPessoasAta(ataData?.presencaLocalFull, false); // [Funcionamento]: Roda o processamento de oficiais da casa.
    processarPessoasAta(ataData?.visitantes, true); // [Funcionamento]: Roda o processamento de oficiais visitantes de outras comuns.

    totals.orquestra = totals.musicos + totals.organistas; // [Funcionamento]: Realiza a soma litúrgica unindo músicos de fileira e as irmãs organistas.
    totals.geral = totals.orquestra + totals.irmandade; // [Funcionamento]: Realiza a soma do público geral unindo a orquestra e a irmandade sentada no coro/bancos.
    totals.encTotal =
      totals.encRegionalComum +
      totals.encRegionalVisita +
      totals.encLocalComum +
      totals.encLocalVisita; // [Funcionamento]: Totaliza todos os encarregados de orquestra presentes.

    // 🚀 ATUALIZAÇÃO SOBERANA DE HINOLOGIA DINÂNICA: Varre linearmente todas as partes litúrgicas existentes, quebrando a barreira das duas partes fixas!
    if (ataData?.partes && Array.isArray(ataData.partes)) {
      // [Funcionamento]: Valida se o array de partes litúrgicas veio preenchido da nuvem.
      let totalHinosApurados = 0; // [Funcionamento]: Cria o acumulador numérico na RAM local.
      ataData.partes.forEach((parte) => {
        // [Funcionamento]: Passa varrendo etapa por etapa litúrgica cadastrada na Ata, independente de quantas existam.
        const hinosValidos =
          parte.hinos?.filter((h) => h && h.trim() !== "") || []; // [Funcionamento]: Filtra os hinos em branco e extrai apenas as partituras legítimas tocadas na etapa.
        totalHinosApurados += hinosValidos.length; // [Funcionamento]: Incrementa a quantidade de hinos desta etapa no acumulador mestre.

        // Mantém a compatibilidade das variáveis legadas dos cartões inferiores de sub-telas
        if (parte.label?.includes("1ª") || parte.id === "parte_1")
          totals.hinosP1 = hinosValidos; // [Funcionamento]: Alinha o frame retrô da 1ª parte se for correspondente.
        if (parte.label?.includes("2ª") || parte.id === "parte_2")
          totals.hinosP2 = hinosValidos; // [Funcionamento]: Alinha o frame retrô da 2ª parte se for correspondente.
      }); // [Funcionamento]: Encerra o laço cumulativo dinâmico.
      totals.hinos = totalHinosApurados; // [Funcionamento]: Insere a somatória de todas as etapas litúrgicas reais no painel de relatórios, matando o bug!
    } // [Funcionamento]: Termina a extração de hinologia.

    if (allEvents && allEvents.length > 0 && ataData?.comumId) {
      // [Funcionamento]: Sensor de histórico: se houver outros relatórios guardados, inicia os cálculos de gráficos.
      const atualCreatedAt = ataData?.createdAt || Date.now(); // [Funcionamento]: Isola o marcador de milissegundos do ensaio atual para servir de barreira cronológica.

      const eventos2026 = allEvents // [Funcionamento]: Filtra a coleção global de relatórios.
        .filter(
          (ev) =>
            ev.comumId === ataData.comumId &&
            ev.createdAt &&
            ev.createdAt <= atualCreatedAt,
        ) // [Funcionamento]: Puxa apenas relatórios da mesma igreja e que aconteceram antes do ensaio atual.
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // [Funcionamento]: Ordena do mais antigo para o mais recente para alinhar a linha do gráfico.

      eventos2026.forEach((ev) => {
        // [Funcionamento]: Varre ensaio por ensaio do histórico encontrado para montar as coordenadas do gráfico.
        let totalEv = 0;
        let orqEv = 0;
        let comEv = 0;
        let visEv = 0; // [Funcionamento]: Inicializa mini-acumuladores locais para a linha ativa.
        if (ev.counts) {
          // [Funcionamento]: Valida se o relatório antigo possui as linhas de contagem preenchidas.
          Object.entries(ev.counts).forEach(([id, d]) => {
            // [Funcionamento]: Destrincha o dicionário antigo em pares de chave e valor.
            if (id.startsWith("meta_")) return; // [Funcionamento]: Descarta linhas de cabeçalhos técnicos.
            const t = parseInt(d.total) || 0; // [Funcionamento]: Captura total absoluto do instrumento.
            const c = parseInt(d.comum) || 0; // [Funcionamento]: Captura total de músicos da casa da época.
            const s = (d.section || "").toUpperCase(); // [Funcionamento]: Normaliza seção em maiúsculo.
            const sid = id.toLowerCase(); // [Funcionamento]: Normaliza ID in minúsculo.

            if (
              sid === "coral" ||
              s === "IRMANDADE" ||
              sid.includes("irmandade") ||
              sid.includes("irmao") ||
              sid.includes("irma")
            ) {
              // [Funcionamento]: Identifica irmandade antiga.
              totalEv += (parseInt(d.irmaos) || 0) + (parseInt(d.irmas) || 0); // [Funcionamento]: Soma homens e mulheres antigos no total do público.
            } else {
              // [Funcionamento]: Era músico de fileira ou organista no ensaio antigo.
              totalEv += t; // [Funcionamento]: Soma no público geral daquele mês histórico.
              orqEv += t; // [Funcionamento]: Acumula no tamanho antigo da orquestra.
              comEv += c; // [Funcionamento]: Acumula quantos eram da casa naquele ensaio.
              visEv += Math.max(0, t - c); // [Funcionamento]: Isola e acumula os visitantes de apoio da época.
            } // [Funcionamento]: Termina condicional de agrupamento histórico.
          }); // [Funcionamento]: Termina loop de contagens antigas.
        } // [Funcionamento]: Termina verificação de existência.
        const dataFormatada = ev.date
          ? new Date(ev.date + "T12:00:00").toLocaleDateString("pt-BR", {
              month: "short",
            })
          : "---"; // [Funcionamento]: Converte data técnica em mês abreviado de 3 letras (ex: 'jul').
        totals.historicoGrafico.push({
          name: dataFormatada.toUpperCase().replace(".", ""), // [Funcionamento]: Remove pontos e padroniza em caixa alta (ex: 'JUL').
          público: totalEv, // [Funcionamento]: Eixo Y: Volume total de público daquela data antiga.
          orquestra: orqEv, // [Funcionamento]: Eixo Y: Tamanho da orquestra antiga.
          orquestraComum: comEv, // [Funcionamento]: Eixo Y: Tamanho dos músicos locais antigos.
          visitantesApoio: visEv, // [Funcionamento]: Eixo Y: Tamanho dos visitantes antigos.
        }); // [Funcionamento]: Fecha o push de coordenadas.
      }); // [Funcionamento]: Encerra laço forEach de ensaios passados.

      if (!eventos2026.some((e) => e.id === eventId)) {
        // [Funcionamento]: Proteção de segurança: se o ensaio atual acabou de ser criado e não entrou na lista, injeta uma coordenada final.
        totals.historicoGrafico.push({
          name: "ATUAL",
          público: totals.geral,
          orquestra: totals.orquestra,
          orquestraComum: totals.musicosComum + totals.organistasComum,
          visitorsApoio: totals.musicosVisita + totals.organistasVisita,
        }); // [Funcionamento]: Fecha inclusão do ponto atual.
      } // [Funcionamento]: Encerra barreira protetora do gráfico.

      const ensaiosPassados = allEvents // [Funcionamento]: Filtra novamente para descobrir o ensaio que aconteceu imediatamente antes deste.
        .filter(
          (ev) =>
            ev.comumId === ataData.comumId &&
            ev.id !== eventId &&
            ev.createdAt &&
            ev.createdAt < atualCreatedAt,
        ) // [Funcionamento]: Isola relatórios passados excluindo o atual.
        .sort((a, b) => (a.createdAt || 0) - (a.createdAt || 0)); // [Funcionamento]: Ordenação cronológica.

      const uEnsaio = ensaiosPassados[0]; // [Funcionamento]: Captura o documento do ensaio anterior imediato.
      if (uEnsaio) {
        // [Funcionamento]: Se houver um ensaio anterior para podermos tirar a diferença de BI (Delta).
        let uOrq = 0;
        let uCoral = 0;
        let uHinos = 0;
        let uEnc = 0; // [Funcionamento]: Inicializa acumuladores do ensaio passado.

        if (uEnsaio.counts) {
          // [Funcionamento]: Varre as contagens do ensaio anterior.
          Object.entries(uEnsaio.counts).forEach(([id, d]) => {
            // [Funcionamento]: Triagem de chaves e valores.
            if (id.startsWith("meta_")) return; // [Funcionamento]: Ignora linhas de metadados.
            const t = parseInt(d.total) || 0; // [Funcionamento]: Total do instrumento.
            const s = (d.section || "").toUpperCase(); // [Funcionamento]: Seção em maiúsculo.
            const sid = id.toLowerCase(); // [Funcionamento]: ID em minúsculo.

            if (
              sid === "coral" ||
              s === "IRMANDADE" ||
              sid.includes("irmandade") ||
              sid.includes("irmao") ||
              sid.includes("irma")
            ) {
              // [Funcionamento]: Identifica irmandade anterior.
              uCoral += (parseInt(d.irmaos) || 0) + (parseInt(d.irmas) || 0); // [Funcionamento]: Soma homens e mulheres anteriores.
            } else {
              // [Funcionamento]: Era orquestra no ensaio anterior.
              uOrq += t; // [Funcionamento]: Soma no montante da orquestra anterior.
            } // [Funcionamento]: Termina condicional de naipe anterior.
          }); // [Funcionamento]: Termina loop de contagens passadas.
        } // [Funcionamento]: Termina checagem de existência anterior.

        if (uEnsaio.partes) {
          // [Funcionamento]: Calcula quantos hinos foram tocados no ensaio anterior.
          uHinos = uEnsaio.partes.reduce(
            (acc, p) =>
              acc + (p.hinos?.filter((h) => h && h.trim() !== "").length || 0),
            0,
          ); // [Funcionamento]: Soma o comprimento dos vetores de hinos antigos.
        } // [Funcionamento]: Termina hinologia antiga.

        const contarEncAntigo = (lista) => {
          // [Funcionamento]: Mini-função interna para somar oficiais da ata anterior.
          if (!lista) return; // [Funcionamento]: Aborta se a lista nominal antiga estiver vazia.
          lista.forEach((p) => {
            // [Funcionamento]: Varre oficiais antigos.
            if (
              [
                "Encarregado Regional",
                "Encarregado Local",
                "Examinadora",
              ].includes(p.min || p.role)
            )
              uEnc++; // [Funcionamento]: Incrementa se bater com os cargos de liderança.
          }); // [Funcionamento]: Termina loop.
        }; // [Funcionamento]: Fecha escopo do método interno.
        contarEncAntigo(uEnsaio.ata?.presencaLocalFull); // [Funcionamento]: Roda para oficiais da casa antigos.
        contarEncAntigo(uEnsaio.ata?.visitantes); // [Funcionamento]: Roda para oficiais visitantes antigos.

        totals.deltaGeral = totals.geral - (uOrq + uCoral); // [Funcionamento]: Calcula o balanço comparativo do público geral (Atual menos Anterior).
        totals.deltaOrquestra = totals.orquestra - uOrq; // [Funcionamento]: Calcula o balanço comparativo de crescimento ou queda da orquestra.
        totals.deltaCoral = totals.irmandade - uCoral; // [Funcionamento]: Calcula o balanço comparativo da irmandade sentada.
        totals.deltaHinos = totals.hinos - uHinos; // [Funcionamento]: Calcula a diferença de hinos ensaiados comparado ao mês passado.
        totals.deltaEncarregados = totals.encTotal - uEnc; // [Funcionamento]: Calcula a diferença de liderança presente comparado ao mês passado.
      } // [Funcionamento]: Termina bloco lógico de cálculo do Delta.
    } // [Funcionamento]: Termina barreira protetora do sensor histórico.

    return totals; // [Funcionamento]: Devolve a árvore de resultados matemáticos higienizada para o cache da tela.
  }, [counts, ataData, allEvents, eventId, chamadaNominal]); // [Funcionamento]: Recalcula o useMemo unicamente se dados físicos mudarem nas conexões do Firebase.

  // 🎯 CORREÇÃO DE PONTE COMPACTA DE LANCHES (WHATSAPP): Aciona o método real de montagem de strings
  const handleShareLanche = () => {
    // [Funcionamento]: Rotina acionada no clique do ícone de compartilhar lanches da Copa.
    if (!counts) return toast.error("Dados de contagem indisponíveis"); // [Funcionamento]: Bloqueia se o barramento estiver vazio.
    if (
      whatsappService &&
      typeof whatsappService.obterTextoAlimentacao === "function"
    ) {
      // [Funcionamento]: Valida se a função de strings está pronta.
      const msg = whatsappService.obterTextoAlimentacao(
        {
          counts,
          date: ataData?.date,
          scope: ataData?.scope,
          comumNome: ataData?.comumNome,
        },
        stats,
      ); // [Funcionamento]: Compila o texto oficial do lanche da portaria.
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
        "_blank",
      ); // [Funcionamento]: Dispara no navegador para o celular abrir o App.
    } else {
      // [Funcionamento]: Se a biblioteca falhar ou não carregar.
      toast.error("Serviço de compartilhamento pendente de carregamento"); // [Funcionamento]: Mágica de fallback seguro.
    } // [Funcionamento]: Termina tratamento de envio.
  }; // [Funcionamento]: Fecha método de lanches.

  // 🎯 CORREÇÃO DE PONTE COMPACTA ESTATÍSTICA (WHATSAPP): Aciona o método real de montagem de strings
  const handleShareEstatistico = () => {
    // [Funcionamento]: Rotina acionada no clique do botão de exportação estatística do WhatsApp.
    if (!counts) return toast.error("Dados estatísticos indisponíveis"); // [Funcionamento]: Bloqueia se a volumetria estiver vazia.
    if (
      whatsappService &&
      typeof whatsappService.obterTextoEstatistico === "function"
    ) {
      // [Funcionamento]: Valida se a função de strings está pronta.
      const msg = whatsappService.obterTextoEstatistico(
        {
          counts,
          date: ataData?.date,
          scope: ataData?.scope,
          comumNome: ataData?.comumNome,
        },
        stats,
      ); // [Funcionamento]: Compila o texto estatístico oficial.
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
        "_blank",
      ); // [Funcionamento]: Dispara no navegador para o celular abrir o App.
    } else {
      // [Funcionamento]: Caso o arquivo de serviço falte na inicialização.
      toast.error("Serviço estatístico pendente de carregamento"); // [Funcionamento]: Mensagem de fallback seguro.
    } // [Funcionamento]: Termina tratamento estatístico.
  }; // [Funcionamento]: Fecha método estatístico.

  // 🎯 CORREÇÃO DE PONTE DO PDF ORIGINAL: Conecta diretamente ao método 'generateAtaEnsaio' do arquivo de serviços
  const handleGeneratePDF = async () => {
    // [Funcionamento]: Método acionado para compilar e disparar the download do relatório impresso da ata de ensaio.
    try {
      // [Funcionamento]: Inicia bloco de segurança.
      if (
        pdfEventService &&
        typeof pdfEventService.generateAtaEnsaio === "function"
      ) {
        // [Funcionamento]: Valida o nome exato do método da classe.
        // [Funcionamento]: Passamos o estado 'comumFullData' como o 5º argumento para injetar o endereço correto (rua, número e bairro) no rodapé do PDF, contornando strings vazias antigas.
        await pdfEventService.generateAtaEnsaio(
          stats,
          ataData,
          userData,
          counts,
          comumFullData || ataData,
          instrumentsConfig,
        ); // [Funcionamento]: Dispara a montagem do PDF.
        toast.success("PDF gerado com sucesso!"); // [Funcionamento]: Balão informativo de sucesso.
      } else {
        // [Funcionamento]: Em caso de ausência da biblioteca na inicialização.
        toast.error("Serviço de PDF pendente de carregamento"); // [Funcionamento]: Alerta caso a função falte.
      } // [Funcionamento]: Termina condicional de validação de método.
    } catch (error) {
      // [Funcionamento]: Intercepta falhas catastróficas de compilação.
      console.error(error); // [Funcionamento]: Registra o rastro do erro no log.
      toast.error("Erro ao gerar relatório em PDF"); // [Funcionamento]: Balão informativo de erro na compilação.
    } // [Funcionamento]: Encerra o bloco de tratamento de capturas.
  }; // [Funcionamento]: Fecha método de PDF.

  const getPerc = (val, total) =>
    total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"; // [Funcionamento]: Função auxiliar matemática de divisão percentual com uma casa decimal fixa.

  return (
    // [Funcionamento]: Palco visual mestre do painel móvel.
    <div className="space-y-4 text-slate-900 pb-24 max-w-md mx-auto px-2 font-sans">
      {/* 👥 SEÇÃO DE TOPO MASTER DUPLA REESTRUTURADA COM MARGENS ELÁSTICAS (TOTALMENTE ANTI-SOBREPOSIÇÃO) */}
      <div className="flex gap-2 items-stretch w-full select-none">
        {/* 🧳 CARD ESCURO DE ALIMENTAÇÃO: Ajustado com flex elástico para dar respiro em telas de qualquer largura */}
        <div className="bg-slate-950 px-4 py-2.5 rounded-[1.8rem] shadow-xl border border-white/5 flex items-center justify-between flex-1 min-w-0 text-left relative overflow-hidden">
          {/* Título Identificador com corte protetor contra esmagamentos laterais */}
          <div className="leading-tight shrink-0">
            <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.2em] mb-0.5 italic">
              Alimentação
            </p>{" "}
            {/* [Funcionamento]: Tag superior dourada. */}
            <p className="text-lg font-[1000] text-white uppercase italic tracking-tighter">
              Resumo
            </p>{" "}
            {/* [Funcionamento]: Subtítulo branco em caixa alta. */}
          </div>

          {/* Número Grande Centralizado com Margem de Ajuste Elástico */}
          <div className="text-center min-w-0 px-2 flex-1">
            <span className="text-3xl font-[1000] text-white italic tracking-tighter block leading-none">
              {stats.geral}
            </span>{" "}
            {/* [Funcionamento]: Placar volumétrico total do evento. */}
          </div>

          {/* Sub-totais Operacionais da Portaria com Espaçamentos e Tamanhos Seguros de Fontes */}
          <div className="flex items-center gap-3 border-l border-white/10 pl-3 h-8 shrink-0">
            <div className="text-center leading-none">
              {" "}
              {/* [Funcionamento]: Caixa numérica da orquestra. */}
              <p className="text-[7px] font-black text-slate-500 uppercase italic mb-0.5">
                Orq
              </p>{" "}
              {/* [Funcionamento]: Legenda cinza. */}
              <p className="text-[11px] font-black text-white tracking-tight">
                {stats.orquestra}
              </p>{" "}
              {/* [Funcionamento]: Contagem de lanches da orquestra. */}
            </div>
            <div className="text-center leading-none">
              {" "}
              {/* [Funcionamento]: Caixa numérica do coral. */}
              <p className="text-[7px] font-black text-slate-500 uppercase italic mb-0.5">
                Coral
              </p>{" "}
              {/* [Funcionamento]: Legenda cinza. */}
              <p className="text-[11px] font-black text-white tracking-tight">
                {stats.irmandade}
              </p>{" "}
              {/* [Funcionamento]: Contagem de lanches do coro. */}
            </div>
            <button
              onClick={handleShareLanche} // [Funcionamento]: Gatilho reativo de envio de texto estruturado para o WhatsApp.
              className="text-emerald-500 active:scale-90 cursor-pointer w-7 h-7 flex items-center justify-center outline-none shrink-0" // [Funcionamento]: Área de clique livre de interrupções.
              aria-label="Compartilhar Lanches" // [Funcionamento]: Controle de acessibilidade de tela.
            >
              <Share2 size={16} />{" "}
              {/* [Funcionamento]: Desenho do nó gráfico verde de compartilhamento. */}
            </button>
          </div>
        </div>

        {/* ⚡ BOTÃO DE PDF REESCALADO PARA SIMETRIA HORIZONTAL PERFECT: Alinhamento, cor, borda e texto originais mantidos */}
        {canExport && (
          <button
            onClick={handleGeneratePDF} // [Funcionamento]: Executa a compilação do relatório impresso.
            className="bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all text-blue-600 rounded-[1.5rem] border border-blue-100 flex flex-col items-center justify-center gap-0.5 px-3 shadow-sm font-black text-[10px] uppercase tracking-wider shrink-0 outline-none layout-touch min-w-[56px]" // [Funcionamento]: Estilização visual alinhada em altura ao card de lanche.
          >
            <FileText size={16} className="text-blue-600" />{" "}
            {/* [Funcionamento]: Ícone técnico azul nativo da biblioteca Lucide. */}
            <span className="font-extrabold tracking-tight mt-0.5">PDF</span>{" "}
            {/* [Funcionamento]: Inscrição textual pura original sem reescritas. */}
          </button>
        )}
      </div>

      {/* Carrossel de Abas Fixo */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 select-none">
        <button
          onClick={() => setCurrentScreen("geral")}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] cursor-pointer outline-none transition-all ${currentScreen === "geral" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`}
        >
          <LayoutGrid size={12} /> Geral
        </button>
        <button
          onClick={() => setCurrentScreen("presenca")}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] cursor-pointer outline-none transition-all ${currentScreen === "presenca" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`}
        >
          <ClipboardList size={12} /> Presença
        </button>
        <button
          onClick={() => setCurrentScreen("equilibrio")}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] cursor-pointer outline-none transition-all ${currentScreen === "equilibrio" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`}
        >
          <Scale size={12} /> Equilíbrio
        </button>
        <button
          onClick={() => setCurrentScreen("resumo")}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] cursor-pointer outline-none transition-all ${currentScreen === "resumo" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`}
        >
          <PieChart size={12} /> Resumo
        </button>
      </div>

      {/* Janela Dinâmica */}
      <AnimatePresence mode="wait">
        {currentScreen === "geral" && (
          <motion.div
            key="geral"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <ScreenGeral
              stats={stats}
              renderDelta={renderDelta}
              activeModal={activeModal}
              setActiveModal={setActiveModal}
              ataData={ataData}
            />
          </motion.div>
        )}

        {currentScreen === "presenca" && (
          <motion.div
            key="presenca"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <ScreenPresenca stats={stats} />
          </motion.div>
        )}

        {currentScreen === "equilibrio" && (
          <motion.div
            key="equilibrio"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <ScreenEquilibrio stats={stats} getPerc={getPerc} />
          </motion.div>
        )}

        {currentScreen === "resumo" && (
          <motion.div
            key="resumo"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <ScreenResumo
              stats={stats}
              canExport={canExport}
              handleShareLanche={handleShareLanche}
              handleShareEstatistico={handleShareEstatistico}
              handleGeneratePDF={handleGeneratePDF}
              isBasico={isBasico}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const renderDelta = (val) => {
  // [Funcionamento]: Renderizador de diferencial numérico comparado ao ensaio do mês anterior.
  if (val === 0 || isNaN(val))
    return (
      <span className="text-slate-300 font-black text-sm select-none">―</span>
    ); // [Funcionamento]: Devolve traço se o valor for nulo ou empatado.
  const isUp = val > 0; // [Funcionamento]: Define se o indicador é positivo.
  return (
    <span
      className={`text-[11px] font-black flex items-center select-none ${isUp ? "text-emerald-600" : "text-rose-600"}`}
    >
      {isUp ? "▲" : "▼"} {isUp ? `+${val}` : val}
    </span>
  ); // [Funcionamento]: Retorna the badge colorida verde ou vermelha apontando a flutuação.
}; // [Funcionamento]: Fecha escopo do renderizador delta.

export default DashEventPage; // [Funcionamento]: Exporta o componente Maestro do Ensaio Local pronto para uso no ecossistema do app.
