import { useState, useEffect, useRef, useMemo } from "react"; // Explicação: Importa as ferramentas essenciais do React para controlar estados, efeitos e cache de memória RAM.
import {
  db,
  doc,
  onSnapshot,
  collection,
  updateDoc,
  getDocs,
  query,
  where,
} from "../config/firebase"; // Explicação: Importa os conectores oficiais e métodos de consultas do SDK do Firebase Firestore.
import { eventService } from "../services/eventService"; // Explicação: Importa o serviço mestre de salvamento e envio estabilizado de pacotes de rede.
import toast from "react-hot-toast"; // Explicação: Importa o sistema de avisos flutuantes para reportar mensagens de alertas.

// DICIONÁRIO DE TRADUÇÃO GEOGRÁFICA DE SIGLAS PARA NOMES COMPLETOS
const MAPA_TRADUTOR_EXTENSO = {
  acd: "acordeon",
  clt: "clarinete",
  euf: "eufonio",
  fgt: "fagote",
  flt: "flauta",
  org: "orgao",
  tbn: "trombone",
  tpt: "trompete",
  trp: "trompa",
  tub: "tuba",
  vcl: "violoncelo",
  vla: "viola",
  vln: "violino",
  acordeon: "acd",
  clarinete: "clt",
  eufonio: "euf",
  fagote: "fgt",
  flauta: "flt",
  orgao: "org",
  trombone: "tbn",
  trompete: "tpt",
  trompa: "trp",
  tuba: "tub",
  violoncelo: "vcl",
  viola: "vla",
  violino: "vln",
}; // Explicação: Mantém a paridade estável entre siglas de sistema e strings textuais do banco.

export const useCounterSync = (currentEventId, counts) => {
  // Explicação: Declara o gancho Custom Hook que gerencia a reatividade de rede del contador de presenças.
  const [localCounts, setLocalCounts] = useState({}); // Explicação: Estado que armazena o mapa espelho de contagens que o usuário visualiza na tela.
  const [ataData, setAtaData] = useState(null); // Explicação: Armazena as informações litúrgicas compiladas da ata do ensaio corrente.
  const [eventComumId, setEventComumId] = useState(null); // Explicação: Identificador físico da igreja comum onde o evento está sediado.
  const [eventDateRaw, setEventDateRaw] = useState(""); // Explicação: String de data bruta do ensaio extraída direto do documento do servidor.
  const [isCountsLocked, setIsCountsLocked] = useState(false); // Explicação: Estado booleano que dita se a digitação de números foi bloqueada por cadeado.
  const [focusedField, setFocusedField] = useState(null); // Explicação: Salva a string técnica do input que está ativo com o teclado aberto para evitar apagões.

  const lastLocalUpdateRef = useRef(0); // Explicação: Guarda a marcação temporal Unix em milissegundos do último clique do operador neste aparelho.

  // v10.9.2: MONITOR DA SINCRONIZAÇÃO OTIMISTA E CONTROLE DE FOCO CONTRA PISCADAS
  useEffect(() => {
    // Explicação: Efeito que intercepta a chegada de novas contagens do Firebase e decide se mescla ou aguarda.
    const isFreshLocalUpdate = Date.now() - lastLocalUpdateRef.current < 8000; // Explicação: Confere se o celular sofreu clique nos últimos 8 segundos para blindar as alterações locais da RAM.

    // 🚀 TRAVA SOBERANA ANTI-SOBRESCRITA: Se o rádio amador do Firebase ou o fechamento de modal tentarem re-injetar dados antigos durante a janela ativa de mutação de 8 segundos, veta a sincronização reversa de frames vazios!
    if (isFreshLocalUpdate) return; // Explicação: Aborta e protege a RAM local se houver ações e atualizações assíncronas em andamento.

    if (counts) {
      // Explicação: Se houver dados novos na nuvem e o operador não estiver metralhando botões locais.
      if (focusedField) {
        // Explicação: Se o teclado físico ou virtual estiver aberto editando uma caixa de texto.
        const [instId, field] = focusedField.split("_"); // Explicação: Recorta a chave para isolar o ID do instrumento e o subcampo.
        setLocalCounts((prev) => {
          // Explicação: Mescla de forma cirúrgica protegendo a digitação atual do usuário.
          const newCounts = { ...counts }; // Explicação: Clona integralmente a sacola atual de dados do Firebase.
          if (newCounts[instId]) {
            // Explicação: Se o instrumento ativo constar no novo pacote de rede.
            newCounts[instId] = {
              ...newCounts[instId],
              [field]: prev[instId]?.[field],
            }; // Explicação: Preserva o valor intermediário da RAM do input para não sumir o texto.
          } // Explicação: Fim da emenda protetora.
          return newCounts; // Explicação: Aplica o resultado unificado estável na tela.
        }); // Explicação: Encerra o setState.
      } else {
        // Explicação: Caso o usuário esteja apenas assistindo a tela sem inputs ativos.
        setLocalCounts(counts); // Explicação: Sincroniza a tela mestre imediatamente com os dados do servidor.
      } // Explicação: Fim da triagem de foco de teclado.
    } // Explicação: Encerra a condicional anti-sobrescrita.
  }, [counts, focusedField]); // Explicação: Re-avalia a barreira se chegarem novas atualizações de banco ou troca de foco.

  // MONITOR REATIVO MESTRE DE DOCUMENTO DO ENSAIO
  useEffect(() => {
    // Explicação: Liga o link reativo para monitorar as mutações e o status de encerramento da ata.
    if (!currentEventId) return; // Explicação: Aborta se o código do ensaio for nulo.
    let isMounted = true; // Explicação: Flag de segurança para evitar vazamento de memória e updates em componentes desmontados.
    const eventRef = doc(db, "events_global", currentEventId); // Explicação: Localiza a rota física do ensaio na coleção central del Firestore.

    const unsubEvent = onSnapshot(eventRef, (s) => {
      // Explicação: Conecta o ouvinte em tempo real onSnapshot.
      if (s.exists() && isMounted) {
        // Explicação: Se o documento existir legitimamente no servidor e a flag de montagem estiver de pé.
        const data = s.data(); // Explicação: Despeja os dados internos do snapshot técnico.
        const ataConsolidada = {
          // Explicação: Consolida os metadados da ata com segurança contra nulos.
          ...data.ata, // Explicação: Clona os registros textuais de ocorrências e palavra.
          date: data.date, // Explicação: Anexa a data do calendário.
          comumId: data.comumId, // Explicação: Anexa a ID da igreja.
          comumNome: data.comumNome, // Explicação: Anexa o nome textual da comum.
          status: data.ata?.status || "open", // Explicação: Define o status lógico de bloqueio de encerramento.
          scope: data.scope || "local", // Explicação: Identifica se é ensaio comum local ou comarca regional.
          regionalId: data.regionalId || "", // Explicação: Injeta a ID da regional para cruzamento da portaria visual.
        }; // Explicação: Encerra a ata consolidada.

        setAtaData(ataConsolidada); // Explicação: Injeta o objeto estruturado no estado local de atas.
        setEventComumId(data.comumId); // Explicação: Atualiza o ID da localidade.
        setEventDateRaw(data.date || ""); // Explicação: Salva a data bruta.
        setIsCountsLocked(data.countsLocked || false); // Explicação: Liga ou desliga o status de cadeado de contagem.

        const isFreshLocalUpdate =
          Date.now() - lastLocalUpdateRef.current < 8000; // Explicação: Recalcula o delay de clique de segurança de 8 segundos.
        if (!isFreshLocalUpdate) {
          // Explicação: Se o operador estiver parado sem cliques recentes.
          setLocalCounts(data.counts || {}); // Explicação: Sobrescreve o layout local com a malha real do servidor.
        } // Explicação: Fim da injeção protetora.
      } // Explicação: Encerra a verificação de documento existente.
    }); // Explicação: Encerra o snapshot técnico do Firebase.

    return () => {
      isMounted = false;
      unsubEvent();
    }; // Explicação: Corta e limpa a conexão com a nuvem ao sair do painel do contador.
  }, [currentEventId]); // Explicação: Reinicia o canal se mudar o ensaio focado no lobby.

  // SUBROTINA DE ATUALIZAÇÃO INCREMENTAL DE BOTÕES + / - E INPUTS DE QUANTIDADES
  const updateCount = (id, field, value, section, userData) => {
    // Explicação: Método que processa e despacha a soma ou subtração de músicos de linha.
    if (ataData?.status === "closed" || isCountsLocked) return; // Explicação: Trava de portaria: bloqueia mutações se a ata ou contagem estiverem trancadas.
    let idSaneado = id; // Explicação: Inicializa a variável de ID limpa de envio.
    lastLocalUpdateRef.current = Date.now(); // Explicação: Renova a marcação Unix del clique local para travar o escudo de 8 segundos anti-sobrescrita.

    setLocalCounts((prev) => {
      // Explicação: Atualiza instantaneamente a tela de forma otimista para o app dar sensação de velocidade extrema.
      const targetId =
        section?.toUpperCase() === "IRMANDADE"
          ? "coral"
          : section?.toUpperCase() === "ORGANISTAS"
            ? "orgao"
            : id; // Explicação: Ajustado para minúsculo padrão para acoplar no 'coral' legítimo do banco.
      const parsedValue = Math.max(0, parseInt(value) || 0); // Explicação: Garante que o valor processado seja um número inteiro positivo limpo.

      // 🚀 INTERCEPTADOR ATÔMICO DO CORAL REATIVO SANEADO: Agora operando 100% em paridade de caixa baixa com o Firestore.
      if (section?.toUpperCase() === "IRMANDADE") {
        idSaneado = "coral"; // Explicação: Força o ID de rede a mirar no nó unificado pai 'coral'.
        const fieldLimpo = field === "total" ? id : field; // Explicação: Saneia se o input veio como total_simples da pílula regional.

        return {
          // Explicação: Retorna o novo estado, atualizando apenas a parte que o usuário clicou (irmas ou irmaos). A soma do total agora é de responsabilidade exclusiva do eventService para evitar duplicação.
          ...prev, // Explicação: Clona os outros instrumentos intactos.
          coral: {
            ...prev["coral"], // Explicação: Preserva metadados ou assinaturas de responsáveis anteriores.
            [fieldLimpo]: parsedValue, // Explicação: Altera a ala correspondente do clique (irmas ou irmaos).
          },
        }; // Explicação: Encerra a montagem reativa do Coral.
      } // Explicação: Fim do interceptador do Coral.

      return {
        ...prev,
        [targetId]: { ...prev[targetId], [field]: parsedValue },
      }; // Explicação: Lógica padrão otimista estável para os demais instrumentos comuns da orquestra.
    }); // Explicação: Encerra o setState otimista.

    eventService
      .updateInstrumentCount(eventComumId, currentEventId, {
        instId: idSaneado, // Explicação: Envia o ID pai corrigido e saneado.
        field,
        value,
        userData,
        section,
      }) // Explicação: Dispara o pacote enxuto estabilizado de rede para o motor central gravar no Firestore.
      .catch(() => toast.error("Erro na sincronização de rede.")); // Explicação: Dispara balão flutuante vermelho em caso de queda física de sinal de internet.
  }; // Explicação: Encerra o método updateCount.

  // SUBROTINA DE POSSE E ASSINATURA DE ZELADORIA DE NAIPE (GOVERNANÇA DOS SECRETÁRIOS)
  const setOwnership = async (id, myUID, userName, subId = null) => {
    // Explicação: Método encarregado de carimbar o ID e nome do secretário como dono daquela aba, com suporte a sub-alas de gênero.
    if (!eventComumId || !currentEventId || isCountsLocked || !myUID) return; // Explicação: Trava disparos órfãos ou em ensaios bloqueados por cadeados.
    lastLocalUpdateRef.current = Date.now(); // Explicação: Carimba o relógio Unix local na memória do smartphone.

    // 🚀 LÓGICA DE GAVETAS ISOLADAS REGIONAIS: Se for Coral/Irmandade, calcula as chaves dinâmicas baseadas no subId enviado (irmas/irmaos).
    const keyId = subId ? `responsibleId_${subId}` : "responsibleId"; // Explicação: Define a string da sub-chave técnica de ID.
    const keyName = subId ? `responsibleName_${subId}` : "responsibleName"; // Explicação: Define a string da sub-chave técnica de Nome.

    setLocalCounts((prev) => ({
      // Explicação: Injeta o nome do operador de forma otimista no cabeçalho da sanfona visível.
      ...prev,
      [id]: {
        ...prev[id],
        [keyId]: myUID,
        [keyName]: userName || "Você",
      },
    })); // Explicação: Encerra o setState otimista da caneta.

    try {
      // Explicação: Tenta gravar a assinatura física no documento mestre do Firebase.
      await updateDoc(doc(db, "events_global", currentEventId), {
        // Explicação: Envia a instrução de atualização de nós aninhados de governança.
        [`counts.${id}.${keyId}`]: myUID, // Explicação: Carimba o ID de autenticação do secretário logado na vaga correta.
        [`counts.${id}.${keyName}`]: userName || "Colaborador", // Explicação: Grava o nome nominal por extenso no nó correspondente da meta.
        updatedAt: Date.now(), // Explicação: Atualiza o relógio mestre do documento.
      }); // Explicação: Encerra a transação.
      toast.success("Zeladoria assumida com sucesso!"); // Explicação: Emite balão verde flutuante de sucesso na tela.
    } catch (e) {
      // Explicação: Trata erros de rede.
      toast.error("Falha ao assinar seção."); // Explicação: Emite notificação de barreira.
    } // Explicação: Encerra o bloco catch.
  }; // Explicação: Encerra o método setOwnership.

  return {
    // Explicação: Devolve a sacola contendo todas as variáveis e comandos de rede mastigados para a página visível comsumir.
    localCounts,
    setLocalCounts,
    ataData,
    eventComumId,
    eventDateRaw,
    isCountsLocked,
    focusedField,
    setFocusedField,
    lastLocalUpdateRef,
    handleFocus: (instId, field) => setFocusedField(`${instId}_${field}`), // Explicação: Callback que trava o escudo de foco do teclado.
    handleBlur: () => setFocusedField(null), // Explicação: Callback que desliga o foco liberando a sincronização normal.
    updateCount,
    setOwnership,
    MAPA_TRADUTOR_EXTENSO, // Explicação: Devolve os métodos operacionais e dicionário.
  }; // Explicação: Termina o retorno da lógica.
}; // Explicação: Encerra o Custom Hook useCounterSync.
