import React, { useMemo, useRef, useState } from "react"; // [Funcionamento]: Importa hooks essenciais do React para cache matemático e controle das abas do carrossel.
// PRESERVAÇÃO: Importações originais mantidas intactas
import toast from "react-hot-toast"; // [Funcionamento]: Importa a biblioteca de notificações de aviso flutuantes para a tela.
import {
  TrendingUp,
  Music,
  Star,
  Share2,
  Activity,
  PieChart,
  CheckCircle2,
  ShieldCheck,
  Users,
  FileText,
  Briefcase,
  MapPin,
  Target,
  Landmark,
  Globe,
  UserCheck,
  Camera,
  BookOpen,
  ListMusic,
  LayoutGrid,
  Scale, // [Funcionamento]: Importa os desenhos dos ícones visuais do sistema.
} from "lucide-react"; // [Funcionamento]: Biblioteca oficial de ícones premium vetorizados.
import { pdfEventRegionalService } from "../../../shared/api/pdfEventRegionalService"; // [Funcionamento]: Importa o serviço que gera o arquivo impresso em PDF.
import { whatsappService } from "../../../shared/api/whatsappService"; // [Funcionamento]: Importa o serviço que formata o texto para WhatsApp.
import { useAuth } from "../../../app/providers/AuthContext"; // [Funcionamento]: Puxa o contexto de login para ler o crachá do usuário logado.
import { db, doc, getDoc } from "../../../shared/api/firebase"; // [Funcionamento]: Conecta ao banco de dados do Firestore.

// v6.9: Importação oficial mantida para o gatilho reativo de fotografia
import * as htmlToImage from "html-to-image"; // [Funcionamento]: Importa o motor que converte elementos da tela em imagem PNG.

// v5.9: Importação da Regra de Ouro para travar exportação
import { hasPermission } from "../../../shared/config/permissions"; // [Funcionamento]: Importa o cérebro que valida as permissões de segurança.

// 📦 IMPORTAÇÃO DAS 4 TELAS ESPECIALIZADAS E DESMEMBRADAS DO ENSEIO REGIONAL
import ScreenGeral from "./components_regional/ScreenGeral.jsx"; // [Funcionamento]: Importa a Tela 1 de cards absolutos refinados.
import ScreenMinisterio from "./components_regional/ScreenMinisterio.jsx"; // [Funcionamento]: Importa a Tela 2 do controle de ministério e lideranças.
import ScreenEquilibrio from "./components_regional/ScreenEquilibrio.jsx"; // [Funcionamento]: Importa a Tela 3 com o design acústico de barras.
import ScreenResumo from "./components_regional/ScreenResumo.jsx"; // [Funcionamento]: Importa a Tela 4 contendo a Palavra e a matriz de hinos.

const DashEventRegionalPage = ({ counts, ataData }) => {
  // [Funcionamento]: Inicia o componente Maestro do painel regional.
  const { userData } = useAuth(); // [Funcionamento]: Identifica os metadados do usuário que está olhando o gráfico.

  // v6.9: Estado reativo que gerencia qual aba do carrossel regional está ativa na tela
  const [currentScreen, setCurrentScreen] = useState("geral"); // [Funcionamento]: Define 'geral' como a tela de início do painel.

  // v6.9: Referência de âncora repassada para a ScreenResumo tirar a foto oficial CCB
  const cardImagemRef = useRef(null); // [Funcionamento]: Cria a ponte para referenciar o palco oculto de fotografia.

  // CÁLCULO DE STATS - Racional de Big Numbers e Ata (Preservado Estritamente)
  const stats = useMemo(() => {
    // [Funcionamento]: useMemo retém os cálculos em cache para economizar processamento e bateria.
    const totals = {
      // [Funcionamento]: Inicializa o objeto limpo com todos os acumuladores de dados do ensaio.
      geral: 0,
      orquestra: 0,
      musicos: 0,
      organistas: 0,
      irmandade: 0,
      irmaos: 0,
      irmas: 0,
      hinos: 0,
      visitas_total: 0,
      ministerio_total: 0,
      cordas: 0,
      madeiras: 0,
      metais: 0,
      saxofones: 0,
      teclas: 0,
      encRegional: 0,
      encLocal: 0,
      examinadoras: 0,
      ancianosCasa: 0,
      ancianosVisitas: 0,
      diaconosCasa: 0,
      diaconosVisitas: 0,
      coopOficioCasa: 0,
      coopOficioVisitas: 0,
      coopJovensCasa: 0,
      coopJovensVisitas: 0,
      encRegionalCasa: 0,
      encRegionalVisitas: 0,
      encLocalCasa: 0,
      encLocalVisitas: 0,
      examinadorasCasa: 0,
      examinadorasVisitas: 0,
      musicosCasa: 0,
      musicosVisitas: 0,
      organistasCasa: 0,
      organistasVisitas: 0,
      localidadesUnicas: new Set(),
      visitasMusicos: 0, // [Funcionamento]: Guarda localidades únicas sem repetições.
    }; // [Funcionamento]: Fim da declaração inicial da árvore de estatísticas.

    if (counts) {
      // [Funcionamento]: Verifica se os dados numéricos de portaria foram carregados do banco.
      Object.entries(counts).forEach(([id, data]) => {
        // [Funcionamento]: Passa uma varredura em cada registro do mapa de contagem.
        if (id.startsWith("meta_")) return; // [Funcionamento]: Ignora cabeçalhos técnicos de metas de BI.
        const valTotal = parseInt(data.total) || 0; // [Funcionamento]: Captura a quantidade absoluta confirmada do instrumento.
        const valComum = parseInt(data.comum) || 0; // [Funcionamento]: Captura quantos são da própria localidade de origem.
        const valIrmaos = parseInt(data.irmaos) || 0; // [Funcionamento]: Puxa a contagem de irmãos homens.
        const valIrmas = parseInt(data.irmas) || 0; // [Funcionamento]: Puxa a contagem de irmãs mulheres.
        const effectiveTotal = Math.max(valTotal, valIrmaos + valIrmas); // [Funcionamento]: Escolhe o maior valor para blindagem matemática.
        const effectiveComum = valComum; // [Funcionamento]: Consolida o número de membros da casa.
        const effectiveVisita = Math.max(0, effectiveTotal - valComum); // [Funcionamento]: Subtrai os da casa para descobrir os visitantes.
        const section = (data.section || "GERAL").toUpperCase(); // [Funcionamento]: Padroniza a seção litúrgica mestre em maiúsculo.
        const saneId = id.toLowerCase(); // [Funcionamento]: Normaliza o identificador técnico em minúsculo.
        const ehIrmandadeOuCoral =
          section.includes("CORAL") ||
          section.includes("IRMANDADE") ||
          saneId.includes("coral") ||
          saneId.includes("irmandade") ||
          saneId === "irmas" ||
          saneId === "irmaos"; // [Funcionamento]: Filtra se pertence aos bancos ou ao coro.

        if (ehIrmandadeOuCoral) {
          // [Funcionamento]: Bloco de acúmulo exclusivo da congregação sentada.
          totals.irmaos +=
            valIrmaos || (saneId === "irmaos" ? effectiveTotal : 0); // [Funcionamento]: Adiciona ao totalizador de vozes masculinas.
          totals.irmas += valIrmas || (saneId === "irmas" ? effectiveTotal : 0); // [Funcionamento]: Adiciona ao totalizador de vozes femininas.
          if (saneId === "coral" && !counts.irmas && !counts.irmaos) {
            // [Funcionamento]: Tratamento de fallback para o canal legado de coral.
            totals.irmandade += effectiveTotal; // [Funcionamento]: Adiciona o volume total de coral diretamente.
          } // [Funcionamento]: Fim da condicional interna de coral.
        } else if (
          section.includes("ORGANISTA") ||
          saneId.includes("orgao") ||
          saneId.includes("org")
        ) {
          // [Funcionamento]: Triagem do banco de órgão eletrônico.
          totals.organistas += effectiveTotal; // [Funcionamento]: Soma no montante absoluto de organistas.
          totals.organistasCasa += effectiveComum; // [Funcionamento]: Incrementa as organistas locais.
          totals.organistasVisitas += effectiveVisita; // [Funcionamento]: Incrementa as organistas de outras comuns.
        } else {
          // [Funcionamento]: Caso seja músico de fileira (sopro, bocal ou arco).
          totals.musicos += effectiveTotal; // [Funcionamento]: Acumula no total absoluto de músicos.
          totals.musicosCasa += effectiveComum; // [Funcionamento]: Soma os músicos locais da casa.
          totals.musicosVisitas += effectiveVisita; // [Funcionamento]: Soma os músicos de apoio visitantes.
          if (
            section === "CORDAS" ||
            ["vln", "vla", "vcl", "violino", "viola", "violoncelo"].includes(
              saneId,
            )
          )
            totals.cordas += effectiveTotal; // [Funcionamento]: Soma instrumentos do naipe de cordas.
          else if (section.includes("SAX"))
            totals.saxofones += effectiveTotal; // [Funcionamento]: Soma instrumentos do naipe de saxofones.
          else if (
            section.includes("MADEIRAS") ||
            [
              "flt",
              "clt",
              "oboe",
              "fgt",
              "clarinete",
              "claronealto",
              "claronebaixo",
              "corneingles",
            ].includes(saneId)
          )
            totals.madeiras += effectiveTotal; // [Funcionamento]: Soma instrumentos do naipe de madeiras.
          else if (
            section.includes("METAI") ||
            ["tpt", "tbn", "trp", "euf", "tub"].includes(saneId)
          )
            totals.metais += effectiveTotal; // [Funcionamento]: Soma instrumentos do naipe de metais.
          else if (
            section === "TECLAS" ||
            saneId === "acordeon" ||
            saneId === "acd".includes(saneId)
          )
            totals.teclas += effectiveTotal; // [Funcionamento]: Soma os acordeonistas presentes.
        } // [Funcionamento]: Fim da distribuição por categorias musicais.
      }); // [Funcionamento]: Termina o loop pelas contagens enviadas.
    } // [Funcionamento]: Fim da validação de existência das contagens.

    totals.irmandade = totals.irmaos + totals.irmas; // [Funcionamento]: Consolida o público geral assentado unindo homens e mulheres.
    totals.orquestra = totals.musicos + totals.organistas;

    const nomesProcessados = new Set(); // [Funcionamento]: Estrutura temporária para evitar duplicidades de nomes de oficiais.

    // AJUSTE 1: DEDUÇÃO DE ORGANISTAS DO CORAL (IRMANDADE)
    if (ataData?.deduzirOrganistas) {
      totals.irmandade = Math.max(0, totals.irmandade - totals.organistas);
    }

    // AJUSTE 2: DEDUÇÃO DO MINISTÉRIO QUE TOCA DO PÚBLICO GERAL
    const allMinisterioParaContagem = [
      ...(ataData?.presencaLocalFull || []),
      ...(ataData?.visitantes || []),
    ];
    const ministerioTocando = allMinisterioParaContagem.filter(
      (p) => p.tocando === true,
    ).length;
    const ministerioNaoTocando =
      allMinisterioParaContagem.length - ministerioTocando;

    const processarPessoas = (lista, isVisitante = false) => {
      // [Funcionamento]: Função interna que varre e classifica o oficialato nominal da ata.
      if (!lista || !Array.isArray(lista)) return; // [Funcionamento]: Aborta caso o vetor nominal venha vazio do banco.
      lista.forEach((p) => {
        // [Funcionamento]: Percorre item por item da lista de pessoas.
        const nomeSaneado = (p.nome || p.name || "").trim().toUpperCase(); // [Funcionamento]: Limpa espaços e joga o nome em caixa alta.
        const cargo = p.min || p.role || ""; // [Funcionamento]: Localiza o cargo eclesiástico ou musical dele.
        if (!nomeSaneado || nomesProcessados.has(nomeSaneado)) return; // [Funcionamento]: Bloqueia se o nome estiver em branco ou repetido.
        nomesProcessados.add(nomeSaneado); // [Funcionamento]: Registra o nome no rastreador de segurança.
        if (cargo === "Ancião") {
          if (isVisitante) totals.ancianosVisitas++;
          else totals.ancianosCasa++;
        } // [Funcionamento]: Acumula os blocos de Anciães.
        else if (cargo === "Diácono") {
          if (isVisitante) totals.diaconosVisitas++;
          else totals.diaconosCasa++;
        } // [Funcionamento]: Acumula os blocos de Diáconos.
        else if (
          cargo === "Cooperador do Ofício" ||
          cargo === "Cooperador do Ofio"
        ) {
          if (isVisitante) totals.coopOficioVisitas++;
          else totals.coopOficioCasa++;
        } // [Funcionamento]: Acumula Cooperadores de Ofício.
        else if (
          cargo === "Cooperador RJM" ||
          cargo === "Cooperador de Jovens e Menores"
        ) {
          if (isVisitante) totals.coopJovensVisitas++;
          else totals.coopJovensCasa++;
        } // [Funcionamento]: Acumula Cooperadores de Jovens.
        else if (cargo === "Encarregado Regional") {
          if (isVisitante) totals.encRegionalVisitas++;
          else totals.encRegionalCasa++;
        } // [Funcionamento]: Acumula os Encarregados Regionais de música.
        else if (cargo === "Encarregado Local") {
          if (isVisitante) totals.encLocalVisitas++;
          else totals.encLocalCasa++;
        } // [Funcionamento]: Acumula os Encarregados Locais de orquestra.
        else if (cargo === "Examinadora") {
          if (isVisitante) totals.examinadorasVisitas++;
          else totals.examinadorasCasa++;
        } // [Funcionamento]: Acumula as Examinadoras de organistas.
        const localidade = (
          p.comum ||
          p.cidadeUf ||
          p.bairro ||
          ""
        ).toUpperCase(); // [Funcionamento]: Puxa a igreja ou território de origem dele.
        if (localidade) totals.localidadesUnicas.add(localidade); // [Funcionamento]: Adiciona a localidade no mapa geográfico.
      }); // [Funcionamento]: Fim do loop do vetor nominal.
    }; // [Funcionamento]: Fim da função interna de processamento.
    processarPessoas(ataData?.presencaLocalFull, false); // [Funcionamento]: Processa reativamente os dados nominais da casa.
    processarPessoas(ataData?.visitantes, true); // [Funcionamento]: Processa reativamente os dados nominais de visitantes.

    if (ataData?.partes) {
      // [Funcionamento]: Se existirem hinos divididos por blocos na ata.
      totals.hinos = ataData.partes.reduce(
        (acc, p) =>
          acc + (p.hinos?.filter((h) => h && h.trim() !== "").length || 0),
        0,
      ); // [Funcionamento]: Soma a quantidade real de hinos preenchidos.
    } // [Funcionamento]: Fim da validação de hinologia.

    totals.ministerio_total =
      totals.ancianosCasa +
      totals.ancianosVisitas +
      (totals.diaconosCasa + totals.diaconosVisitas) +
      (totals.coopOficioCasa + totals.coopOficioVisitas) +
      (totals.coopJovensCasa + totals.coopJovensVisitas) +
      (totals.encLocalCasa + totals.encLocalVisitas) +
      (totals.examinadorasCasa + totals.examinadorasVisitas); // [Funcionamento]: Totaliza o corpo de liderança local e de visitas.
    totals.encRegional = totals.encRegionalCasa + totals.encRegionalVisitas; // [Funcionamento]: Consolida o montante absoluto de Encarregados Regionais.

    totals.geral = totals.orquestra + totals.irmandade + ministerioNaoTocando;
    return totals; // [Funcionamento]: Retorna o JSON de dados pronto para o cache do useMemo.
  }, [counts, ataData]); // [Funcionamento]: O sensor re-executa a matemática se as variáveis do Firebase mudarem.

  // v6.9: CONVERSOR CRONOLÓGICO MANTIDO PARA A ATA TRADICIONAL
  const dataPorExtenso = useMemo(() => {
    // [Funcionamento]: Converte datas técnicas em formato extenso tradicional (ex: 01 de Março de 2026).
    try {
      const dataAlvo = ataData?.date || ataData?.data; // [Funcionamento]: Isola a string de data disponível.
      if (dataAlvo) {
        const dataObjeto = new Date(dataAlvo + "T00:00:00"); // [Funcionamento]: Inicia o objeto cronológico travado no fuso horário local.
        if (!isNaN(dataObjeto.getTime())) {
          // [Funcionamento]: Se for uma data real e válida.
          return dataObjeto.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }); // [Funcionamento]: Devolve a string pt-BR formatada solenemente.
        }
      }
    } catch (e) {
      console.error("Erro na conversão de data:", e); // [Funcionamento]: Emite alerta no console se houver falha de fuso.
    }
    return new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }); // [Funcionamento]: Fallback seguro com a data de hoje.
  }, [ataData]); // [Funcionamento]: Monitora alterações baseadas na ata.

  // v6.9: EXTRAÇÃO DA PALAVRA MANTIDA PARA TRANSFERÊNCIA VIA PROPS
  const palavraLidaData = useMemo(() => {
    // [Funcionamento]: Organiza os dados da Palavra Lida do Firestore para as telas filhas.
    if (ataData?.palavra) {
      return {
        livro: ataData.palavra.livro || "---",
        capitulo: ataData.palavra.capitulo || "---",
        verso: ataData.palavra.verso || "---",
        assunto: ataData.palavra.assunto || "Não Informado",
      };
    }
    return {
      livro: "---",
      capitulo: "---",
      verso: "---",
      assunto: "Palavra da Santa Escritura exortada.",
    }; // [Funcionamento]: Fallback caso esteja em branco.
  }, [ataData]); // [Funcionamento]: Reage se a ata sofrer updates.

  // v6.9: FILTRO DA LISTA DE HINOS DO ARRAY DO FIRESTORE
  const hinosEnsaiadosLista = useMemo(() => {
    // [Funcionamento]: Limpa strings vazias do vetor de hinos ensaiados lançado na portaria.
    if (ataData?.hinosLista && Array.isArray(ataData.hinosLista)) {
      return ataData.hinosLista.filter((h) => h && h.trim() !== ""); // [Funcionamento]: Elimina espaçamentos e hinos em branco.
    }
    return []; // [Funcionamento]: Retorna vetor vazio por segurança.
  }, [ataData]); // [Funcionamento]: Vinculado ao ciclo de vida da ata.

  const totalPrincipais =
    stats.cordas + (stats.madeiras + stats.saxofones) + stats.metais; // [Funcionamento]: Soma absoluta das três principais famílias orquestrais.
  const getPerc = (val, total) =>
    total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"; // [Funcionamento]: Função utilitária de cálculo percentual com uma casa decimal fixada.

  const handleShareAlimentacao = () => {
    // [Funcionamento]: Constrói e envia os totais do lanche da portaria via WhatsApp.
    const msg = whatsappService.obterTextoAlimentacao(ataData, stats); // [Funcionamento]: Compila o texto limpo da Copa.
    if (navigator.share)
      navigator.share({ text: msg }).catch(() => {}); // [Funcionamento]: Aciona o menu nativo de partilha do smartphone.
    else {
      navigator.clipboard.writeText(msg);
      toast.success("Copiado!");
    } // [Funcionamento]: Fallback salvando na área de transferência.
  }; // [Funcionamento]: Fim da rotina de lanche.

  const handleShareEstatistico = () => {
    // [Funcionamento]: Envia o resumo estatístico formal do ensaio regional para o WhatsApp.
    const msg = whatsappService.obterTextoEstatistico(
      { ...ataData, counts },
      stats,
    ); // [Funcionamento]: Compila a mensagem estruturada.
    if (navigator.share)
      navigator.share({ text: msg }).catch(() => {}); // [Funcionamento]: Dispara partilha nativa do celular.
    else {
      navigator.clipboard.writeText(msg);
      toast.success("Resumo Estatístico Copiado!");
    } // [Funcionamento]: Fallback copiando o texto.
  }; // [Funcionamento]: Fim da rotina estatística.

  const handleGeneratePDF = async () => {
    // [Funcionamento]: Puxa os dados da comarca sede e dispara a compilação do relatório impresso em PDF.
    const loadingToast = toast.loading("Gerando Ata..."); // [Funcionamento]: Ativa o aviso flutuante de carregamento.
    try {
      const comumId = ataData?.comumId || userData?.activeComumId; // [Funcionamento]: Puxa a ID territorial correta da ram.
      const comumSnap = await getDoc(doc(db, "comuns", comumId)); // [Funcionamento]: Executa consulta cirúrgica na coleção comuns.
      const sedeData = comumSnap.exists() ? comumSnap.data() : null; // [Funcionamento]: Resgata endereço e CNPJ da igreja sede se houver.
      pdfEventRegionalService.generateAtaRegional(
        stats,
        ataData,
        userData,
        counts,
        sedeData,
      ); // [Funcionamento]: Constrói o PDF.
      toast.dismiss(loadingToast); // [Funcionamento]: Apaga o aviso de carregamento.
      toast.success("Ata Regional Gerada!"); // [Funcionamento]: Balão informativo de sucesso.
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Erro ao gerar PDF.");
    } // [Funcionamento]: Captura e trata falhas bloqueando travamentos de UI.
  }; // [Funcionamento]: Fim da rotina de PDF.

  // v6.9: DISPARADOR DO FOTÓGRAFO TRAZIDO PARA O CORPO DO MAESTRO E PASSADO À SCREENRESUMO
  const handleGenerateImage = async () => {
    // [Funcionamento]: Transforma o palco oculto invisível em imagem PNG de alta definição para envio instantâneo.
    if (!cardImagemRef.current) return; // [Funcionamento]: Trava de segurança caso a âncora visual não esteja acoplada na árvore.
    const loadingToast = toast.loading(
      "📸 Gerando Relatório Solene em Imagem...",
    ); // [Funcionamento]: Notifica o início da fabricação da mídia.

    try {
      await new Promise((resolve) => setTimeout(resolve, 150)); // [Funcionamento]: Pequena pausa técnica de milissegundos para estabilização de fontes do sistema.

      const dataUrl = await htmlToImage.toPng(cardImagemRef.current, {
        // [Funcionamento]: Converte o HTML em string de dados PNG pura.
        quality: 1.0, // [Funcionamento]: Força qualidade máxima de exportação de pixels.
        backgroundColor: "#0c1a30", // [Funcionamento]: Define o fundo azul-marinho sóbrio institucional.
        style: { transform: "scale(1)", transformOrigin: "top left" }, // [Funcionamento]: Trava o tamanho geométrico da imagem.
      }); // [Funcionamento]: Encerra a conversão client-side.

      const res = await fetch(dataUrl); // [Funcionamento]: Lê a string de dados de mídia produzida.
      const blob = await res.blob(); // [Funcionamento]: Encapsula a string em um objeto Blob binário de arquivo real.
      const file = new File(
        [blob],
        `Relatorio_Ensaio_${ataData?.cidadeNome || "Regional"}.png`,
        { type: "image/png" },
      ); // [Funcionamento]: Carimba o nome dinâmico e o formato PNG no arquivo físico.

      toast.dismiss(loadingToast); // [Funcionamento]: Remove o aviso de carregamento da tela.

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // [Funcionamento]: Se o celular possuir o motor moderno de compartilhamento de arquivos.
        await navigator.share({
          files: [file],
          title: `Relatório Oficial - Ensaio Regional`,
          text: `Resumo Oficial do Ensaio Regional - Congregação Cristã no Brasil.`,
        }); // [Funcionamento]: Abre o menu do celular enviando o arquivo direto para os grupos do WhatsApp.
        toast.success("Enviado com Sucesso!"); // [Funcionamento]: Notificação de envio efetuado.
      } else {
        // [Funcionamento]: Caso o navegador seja antigo ou esteja rodando em desktop sem API de share.
        const link = document.createElement("a"); // [Funcionamento]: Cria um elemento de clique de download invisível na memória.
        link.download = `Relatorio_Ensaio_${ataData?.cidadeNome || "Regional"}.png`; // [Funcionamento]: Carimba o nome do download do arquivo.
        link.href = dataUrl; // [Funcionamento]: Injeta a string de imagem produzida no link.
        link.click(); // [Funcionamento]: Simula o clique do mouse forçando o download físico da imagem.
        toast.success("Imagem baixada com sucesso!"); // [Funcionamento]: Notificação de download efetuado.
      } // [Funcionamento]: Encerra condicional de exportação de mídia.
    } catch (error) {
      // [Funcionamento]: Intercepta quebras catastróficas do html-to-image.
      console.error("Erro ao gerar card tradicional:", error); // [Funcionamento]: Emite erro de renderização de imagem no console.
      toast.dismiss(loadingToast); // [Funcionamento]: Apaga balão de carregamento.
      toast.error("Erro ao fabricar imagem."); // [Funcionamento]: Alerta o usuário do erro na compilação da imagem.
    } // [Funcionamento]: Encerra bloco de capturas.
  }; // [Funcionamento]: Fim da rotina de imagem.

  const podeExportar = hasPermission(
    userData,
    "generate_report",
    ataData?.scope,
  ); // [Funcionamento]: Guarda o booleano de validação de nível de acesso.

  return (
    // [Funcionamento]: Palco de renderização visual definitivo do Maestro móvel.
    <div className="space-y-4 text-slate-900 pb-24 max-w-md mx-auto px-2 font-sans">
      {/* 👥 v6.9 CORREÇÃO: SEÇÃO DE TOPO MASTER ALINHADA COM SPREAD ELÁSTICO (ANTI-SOBREPOSIÇÃO) */}
      <div className="flex gap-2 items-stretch w-full select-none">
        {/* CARD PRINCIPAL - RESUMO DO LANCHE (ALIMENTAÇÃO DA PORTARIA) */}
        <div className="bg-slate-950 px-4 py-2.5 rounded-[1.8rem] shadow-2xl border border-white/5 flex items-center justify-between flex-1 min-w-0 text-left relative overflow-hidden">
          {/* Título Identificador com margens protegidas */}
          <div className="leading-tight shrink-0">
            <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.2em] mb-0.5 italic">
              Alimentação
            </p>
            <h3 className="text-lg font-[1000] text-white uppercase italic tracking-tighter">
              Resumo
            </h3>
          </div>

          {/* Número Grande Centralizado de Presentes com Margem Elástica */}
          <div className="text-center min-w-0 px-2 flex-1">
            <span className="text-3xl font-[1000] text-white italic tracking-tighter block leading-none">
              {stats.geral}
            </span>
          </div>

          {/* Sub-totais Operacionais da Portaria com Espaçamentos Higienizados e Tamanhos Seguros */}
          <div className="flex items-center gap-3 border-l border-white/10 pl-3 h-8 shrink-0">
            <div className="text-center leading-none">
              <p className="text-[7px] font-black text-slate-500 uppercase italic mb-0.5">
                Orq
              </p>
              <p className="text-[11px] font-black text-white tracking-tight">
                {stats.orquestra}
              </p>
            </div>
            <div className="text-center leading-none">
              <p className="text-[7px] font-black text-slate-500 uppercase italic mb-0.5">
                Coral
              </p>
              <p className="text-[11px] font-black text-white tracking-tight">
                {stats.irmandade}
              </p>
            </div>
            {podeExportar && ( // [Funcionamento]: Verifica se o usuário tem crachá com acesso para emitir partilhas.
              <button
                onClick={handleShareAlimentacao} // [Funcionamento]: Dispara o envio do texto oficial do lanche da portaria.
                className="text-emerald-500 active:scale-90 cursor-pointer w-7 h-7 flex items-center justify-center outline-none shrink-0" // [Funcionamento]: Área de toque confortável isolada.
              >
                <Share2 size={16} />{" "}
                {/* [Funcionamento]: Ícone verde premium vetorizado de compartilhamento. */}
              </button>
            )}
          </div>
        </div>

        {/* v6.9 CORREÇÃO: BOTÃO AZUL CLÁSSICO DE ATA PDF EMBUTIDO AO LADO DIREITO COM SIMETRIA HORIZONTAL PERFECT */}
        {podeExportar && ( // [Funcionamento]: Exibe o botão de relatório impresso se ele possuir nível de acesso.
          <button
            onClick={handleGeneratePDF} // [Funcionamento]: Executa a compilação do documento impresso.
            className="bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all text-blue-600 rounded-3xl border border-blue-100 flex flex-col items-center justify-center gap-0.5 px-3 shadow-sm font-black text-[10px] uppercase tracking-wider shrink-0 outline-none layout-touch min-w-14" // [Funcionamento]: Estilização azul-clara litúrgica idêntica ao ensaio local.
          >
            <FileText size={16} className="text-blue-600" />{" "}
            {/* [Funcionamento]: Desenho do arquivo técnico de PDF. */}
            <span className="font-extrabold tracking-tight mt-0.5">
              PDF
            </span>{" "}
            {/* [Funcionamento]: Inscrição em caixa alta original. */}
          </button>
        )}
      </div>

      {/* 🏎️ TRILHO EXCLUSIVO DE CARROSSEL DE ABAS REGIONAIS (SISTEMA DE NAVEGAÇÃO INTERNA) */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 select-none">
        <button
          onClick={() => setCurrentScreen("geral")} // [Funcionamento]: Altera o carrossel reativo para mostrar os cards gerais.
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-10 cursor-pointer outline-none transition-all ${currentScreen === "geral" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`} // [Funcionamento]: Muda a cor para preto realçado se ativo.
        >
          <LayoutGrid size={12} /> Geral{" "}
          {/* [Funcionamento]: Ícone e texto da Aba 1. */}
        </button>
        <button
          onClick={() => setCurrentScreen("ministerio")} // [Funcionamento]: Altera o carrossel reativo para mostrar o agrupamento de ministério.
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-10 cursor-pointer outline-none transition-all ${currentScreen === "ministerio" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`} // [Funcionamento]: Muda a cor para preto realçado se ativo.
        >
          <Briefcase size={12} /> Ministério{" "}
          {/* [Funcionamento]: Ícone e texto da Aba 2. */}
        </button>
        <button
          onClick={() => setCurrentScreen("equilibrio")} // [Funcionamento]: Altera o carrossel reativo para mostrar as barras acústicas.
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-10 cursor-pointer outline-none transition-all ${currentScreen === "equilibrio" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`} // [Funcionamento]: Muda a cor para preto realçado se ativo.
        >
          <Scale size={12} /> Equilíbrio{" "}
          {/* [Funcionamento]: Ícone e texto da Aba 3. */}
        </button>
        <button
          onClick={() => setCurrentScreen("resumo")} // [Funcionamento]: Altera o carrossel reativo para mostrar a Palavra e os botões de mídia.
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-10 cursor-pointer outline-none transition-all ${currentScreen === "resumo" ? "bg-white text-slate-950 shadow-xs" : "text-slate-400"}`} // [Funcionamento]: Muda a cor para preto realçado se ativo.
        >
          <PieChart size={12} /> Resumo{" "}
          {/* [Funcionamento]: Ícone e texto da Aba 4. */}
        </button>
      </div>

      {/* 🎛 cache-PROP-BRIDGE: DISTRIBUIDOR DE TELAS POR PONTE DE MEMÓRIA DE CUSTO FIRESTORE ZERO */}
      <div className="w-full">
        {currentScreen === "geral" && <ScreenGeral stats={stats} />}{" "}
        {/* [Funcionamento]: Aciona a UI de cartões totais injetando a matemática. */}
        {currentScreen === "ministerio" && (
          <ScreenMinisterio stats={stats} ataData={ataData} />
        )}{" "}
        {/* [Funcionamento]: Aciona a UI de acordeões nominais do ministério. */}
        {currentScreen === "equilibrio" && (
          <ScreenEquilibrio stats={stats} getPerc={getPerc} />
        )}{" "}
        {/* [Funcionamento]: Aciona a UI de engenharia de som e naipes. */}
        {currentScreen === "resumo" && ( // [Funcionamento]: Condicional para renderizar a quarta perna do relatório móvel.
          <ScreenResumo // [Funcionamento]: Componente reativo que agrupa a hinologia, palavra e os botões contextuais.
            stats={stats} // [Funcionamento]: Envia o mapa matemático consolidado.
            ataData={ataData} // [Funcionamento]: Envia os dados nativos do Firestore.
            canExport={podeExportar} // [Funcionamento]: Repassa a flag de validação de relatórios.
            handleShareLanche={handleShareAlimentacao} // [Funcionamento]: Repassa o link de disparo do texto de lanches.
            handleShareEstatistico={handleShareEstatistico} // [Funcionamento]: Repassa o link de disparo do texto estatístico.
            handleGeneratePDF={handleGeneratePDF} // [Funcionamento]: Repassa o método compilador de PDF.
            handleGenerateImage={handleGenerateImage} // [Funcionamento]: Repassa o gatilho da imagem solene CCB.
            cardImagemRef={cardImagemRef} // [Funcionamento]: Fornece a âncora mestre do palco oculto de fotografia.
            dataPorExtenso={dataPorExtenso} // [Funcionamento]: Fornece a data por extenso limpa.
            palavraLidaData={palavraLidaData} // [Funcionamento]: Fornece o objeto de triagem bíblica.
            hinosEnsaiadosLista={hinosEnsaiadosLista} // [Funcionamento]: Fornece o vetor de hinologia filtrado.
            totalPrincipais={totalPrincipais} // [Funcionamento]: Fornece o volume dos três naipes principais.
            getPerc={getPerc} // [Funcionamento]: Fornece o utilitário matemático de porcentagem.
          /> // [Funcionamento]: Fecha o componente de fechamento.
        )}
      </div>
    </div>
  ); // [Funcionamento]: Conclui o retorno estruturado do palco visual.
}; // [Funcionamento]: Encerra a declaração do bloco funcional do Maestro.

export default DashEventRegionalPage; // [Funcionamento]: Exporta o componente Maestro pronto para o roteamento global do dashboard do app.
