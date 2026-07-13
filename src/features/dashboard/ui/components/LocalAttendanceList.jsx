import React, { useState, useMemo, useEffect } from "react"; // [Funcionamento]: Traz hooks do React para controle de estados, travar computações pesadas em RAM e escutar alterações.
import {
  Search,
  Music,
  UserCheck,
  ShieldAlert,
  Award,
  X,
  Percent,
  Lock,
  FileText,
} from "lucide-react"; // [Funcionamento]: Importa ícones vetorizados de alta qualidade para ilustrar os botões da tela.
import { AnimatePresence, motion } from "framer-motion"; // [Funcionamento]: Framer Motion para acionar transições suaves e modais premium na interface.
// PRESERVAÇÃO: Conecta a biblioteca de avisos flutuantes para extinguir o ReferenceError no clique!
import toast from "react-hot-toast"; // [Funcionamento]: Emite alertas de sucesso ou erro no topo do aplicativo móvel.
// PRESERVAÇÃO: Importa o serviço que processa e monta a matriz de 12 meses na folha deitada do PDF
import { pdfPresencaAnualService } from "../../../../shared/api/pdfPresencaAnualService"; // [Funcionamento]: Serviço mestre que gera e faz o download do arquivo PDF.

/**
 * COMPONENTE: LocalAttendanceList v5.2 (RESILIENT SECURITY EDITION)
 * IDIOMA VISUAL: Unificado com a identidade corporativa do painel master de atas
 */
const LocalAttendanceList = ({
  events = [],
  userLevel = "basico",
  comumDataSelected = null,
  anoFiltroAtivo = 2026,
}) => {
  // [Funcionamento]: Inicializa a lista recebendo os dados filtrados do painel pai.
  const [searchTerm, setSearchTerm] = useState(""); // [Funcionamento]: Caixa de memória para guardar o texto digitado na busca por nomes de músicos.
  const [selectedSection, setSelectedSection] = useState("ALL"); // [Funcionamento]: Caixa de memória para controlar qual família instrumental está selecionada nas abas.
  const [selectedMusico, setSelectedMusico] = useState(null); // [Funcionamento]: Controla qual músico foi clicado para abrir o painel com a sua ficha detalhada.
  const [selectedYear, setSelectedYear] = useState(
    anoFiltroAtivo || new Date().getFullYear(),
  ); // [Funcionamento]: Inicializa o ano local baseado no filtro mestre herdado da página pai.

  // INTERCEPTADOR DE FILTRO CRONOLÓGICO PAÍ: Garante que o ano do componente mude instantaneamente se o usuário refinar a pesquisa na Lupa de cima!
  useEffect(() => {
    // [Funcionamento]: Sensor reativo que monitora a chegada de novas propriedades do componente pai.
    if (anoFiltroAtivo) {
      // [Funcionamento]: Valida se o ano enviado pela Lupa de cima é válido.
      setSelectedYear(anoFiltroAtivo); // [Funcionamento]: Sobrescreve o seletor local atualizando as tabelas na tela de forma reativa.
    } // [Funcionamento]: Fecha a verificação lógica de tempo.
  }, [anoFiltroAtivo]); // [Funcionamento]: Dispara este sensor unicamente se o ano mestre mudar lá no topo.

  // PRESERVAÇÃO: Transforma a checagem em busca parcial (.includes). Se contiver 'gem' ou 'local', o Victor entra na hora!
  const isAuthorized = useMemo(() => {
    // [Funcionamento]: Bloqueia o processamento em cache para proteger o desempenho e a segurança se o usuário for inválido.
    const lvl = String(userLevel || "basico")
      .toLowerCase()
      .trim(); // [Funcionamento]: Coloca em caixa baixa e remove espaços vazios do crachá do usuário.
    return (
      lvl.includes("master") ||
      lvl.includes("comissao") ||
      lvl.includes("regional") ||
      lvl.includes("local") ||
      lvl.includes("gem")
    ); // [Funcionamento]: Retorna verdadeiro se o usuário possuir qualquer um dos cargos de liderança musical.
  }, [userLevel]); // [Funcionamento]: Só reavalia o poder se o nível de acesso do usuário mudar.

  // Iniciais dos meses compactadas para o alinhamento da régua superior
  const iniciaisMeses = [
    "J",
    "F",
    "M",
    "A",
    "M",
    "J",
    "J",
    "A",
    "S",
    "O",
    "N",
    "D",
  ]; // [Funcionamento]: Lista de strings com uma única letra para o cabeçalho mobile.

  // PROCESSAMENTO EM RAM: Transforma os ensaios do ano em uma caderneta anual matricial compacta
  const orchestraMatrix = useMemo(() => {
    // [Funcionamento]: Agrupa e constrói a tabela bidimensional de presenças indexada por músico.
    if (!isAuthorized) return []; // [Funcionamento]: Se não possuir access level liberado, retorna uma lista vazia e protege o hardware.

    const registry = {}; // [Funcionamento]: Abre um dicionário vazio para agrupar as presenças por nome de irmão.

    const yearEvents = events.filter((ev) => {
      // [Funcionamento]: Filtra os ensaios recebidos do banco de dados salvando apenas os do ano selecionado.
      if (!ev.date) return false; // [Funcionamento]: Descarta relatórios sem data carimbada por segurança.
      const evYear =
        new Date(ev.date).getFullYear() || parseInt(ev.date.substring(0, 4)); // [Funcionamento]: Extrai o ano numérico da data do ensaio.
      return evYear === parseInt(selectedYear); // [Funcionamento]: Compara e valida se pertence ao ano de análise activa.
    }); // [Funcionamento]: Fecha o filtro cronológico.

    yearEvents.forEach((ev) => {
      // [Funcionamento]: Passa uma varredura em cada um dos ensaios encontrados no ano filtrado.
      const list = ev.musicosPresentesLista || ev.ata?.presencaLocalFull || []; // [Funcionamento]: Localiza a lista nominal bruta de quem tocou naquele ensaio.
      const evMonth = ev.date
        ? new Date(ev.date).getMonth()
        : ev.date
          ? parseInt(ev.date.substring(5, 7)) - 1
          : -1; // [Funcionamento]: Calcula o índice do mês (0 para Janeiro, 11 para Dezembro).

      if (evMonth < 0 || evMonth > 11) return; // [Funcionamento]: Ignora meses corrompidos fora do limite do calendário.

      list.forEach((p) => {
        // [Funcionamento]: Varre cada músico presente catalogado no cartão de chamada do ensaio.
        if (!p || !p.nome) return; // [Funcionamento]: Pula registros sem identificação para não poluir os dados.
        const cleanName = String(p.nome).trim(); // [Funcionamento]: Limpa espaços vazios nas bordas do texto.
        if (!cleanName) return; // [Funcionamento]: Aborta se o nome do irmão vier vazio.

        const instId = String(p.instrumentoId || "")
          .toLowerCase()
          .trim(); // [Funcionamento]: Captura o identificador técnico da sigla do instrumento.
        const instNome = String(p.instrumentoNome || "SOLISTA")
          .toUpperCase()
          .trim(); // [Funcionamento]: Captura o nome do instrumento em letras maiúsculas.
        let section = "CORDAS"; // [Funcionamento]: Define as cordas como gaveta de fallback inicial da matriz.

        if (
          instId === "orgao" ||
          instId === "órgão" ||
          instNome.includes("ORGANISTA") ||
          instNome === "ÓRGÃO"
        ) {
          // [Funcionamento]: Identifica se é organista.
          section = "ÓRGÃO"; // [Funcionamento]: Classifica o instrumento na família das organistas.
        } else if (
          instId === "acordeon" ||
          instNome.includes("ACORDEON") ||
          instNome.includes("TECLA")
        ) {
          // [Funcionamento]: Filtra os acordeonistas.
          section = "TECLAS"; // [Funcionamento]: Separa na gaveta de teclas.
        } else if (instId.startsWith("sax") || instNome.includes("SAX")) {
          // [Funcionamento]: Identifica a família dos saxofones.
          section = "SAXOFONES"; // [Funcionamento]: Direciona para os saxofones.
        } else if (
          [
            "tpt",
            "tbn",
            "trp",
            "euf",
            "tub",
            "trompete",
            "trombone",
            "trompa",
            "eufônio",
            "tuba",
            "flugelhorn",
            "flugel",
          ].includes(instId) ||
          instNome.includes("TROMPETE") ||
          instNome.includes("TROMBONE") ||
          instNome.includes("TROMPA") ||
          instNome.includes("TUBA") ||
          instNome.includes("METAL") ||
          instNome.includes("METAIS") ||
          instNome.includes("EUFÔNIO")
        ) {
          // [Funcionamento]: Filtra os metais de sopro.
          section = "METAIS"; // [Funcionamento]: Agrupa na gaveta dos metais.
        } else if (
          [
            "flt",
            "clt",
            "oboe",
            "fgt",
            "flauta",
            "clarinete",
            "claronealto",
            "claronebaixo",
            "corneingles",
          ].includes(instId) ||
          instNome.includes("CLARINETE") ||
          instNome.includes("FLAUTA") ||
          instNome.includes("OBOÉ") ||
          instNome.includes("FAGOTE") ||
          instNome.includes("MADEIRA") ||
          instNome.includes("CLARONE")
        ) {
          // [Funcionamento]: Filtra as madeiras de sopro.
          section = "MADEIRAS"; // [Funcionamento]: Agrupa na gaveta das madeiras.
        } else if (
          [
            "vln",
            "vla",
            "vcl",
            "cbx",
            "violino",
            "viola",
            "violoncelo",
            "contrabaixo",
          ].includes(instId) ||
          instNome.includes("VIOLINO") ||
          instNome.includes("VIOLA") ||
          instNome.includes("CELLO") ||
          instNome.includes("VIOLONCELO") ||
          instNome.includes("CONTRABAIXO") ||
          instNome.includes("CORDA")
        ) {
          // [Funcionamento]: Confirma e higieniza os dados de cordas tradicionais.
          section = "CORDAS"; // [Funcionamento]: Fixa o músico na gaveta das cordas.
        }

        if (!registry[cleanName]) {
          // [Funcionamento]: Se o músico ainda não foi adicionado na planilha, inicializa a ficha dele.
          registry[cleanName] = {
            // [Funcionamento]: Abre o objeto estruturado com os dados cadastrais do irmão.
            id: p.id || cleanName.toLowerCase().replace(/\s+/g, ""), // [Funcionamento]: Cria um ID de rede limpo e estável para indexar as chaves no PDF.
            name: cleanName, // [Funcionamento]: Salva o nome próprio higienizado do componente.
            section: section, // [Funcionamento]: Vincula a família instrumental litúrgica dele.
            instrument: instNome, // [Funcionamento]: Grava o nome do instrumento completo por extenso.
            situacao: p.situacao || "Músico Local", // [Funcionamento]: Identifica a categoria do irmão (Músico Local, Visitante, GEM, etc.).
            monthsStatus: Array(12).fill(null), // [Funcionamento]: Cria os 12 slots mensais em branco para receber presenças ou faltas.
            totalEnsaioNoAno: 0, // [Funcionamento]: Inicializa contador vertical de meses ativos.
            presencesCount: 0, // [Funcionamento]: Inicializa acumulador horizontal de presenças do irmão.
          }; // [Funcionamento]: Fecha a inicialização cadastral.
        } // [Funcionamento]: Encerra a barreira protetora.

        if (registry[cleanName].monthsStatus[evMonth] === null) {
          // [Funcionamento]: Se o mês ainda estava sem ensaios mapeados, carimba como ausente por padrão.
          registry[cleanName].monthsStatus[evMonth] = false; // [Funcionamento]: Marca false (ausência) para auditoria subsequente.
        } // [Funcionamento]: Fecha a verificação.

        if (p.presente === true) {
          // [Funcionamento]: Se na lista do ensaio do banco o irmão constar como presente com Toque Azul.
          registry[cleanName].monthsStatus[evMonth] = true; // [Funcionamento]: Substitui na célula cravando true (presente verdadeiro).
        } // [Funcionamento]: Termina a validação de presença.
      }); // [Funcionamento]: Encerra o laço interno de músicos do ensaio ativo.
    }); // [Funcionamento]: Encerra o laço mestre de relatórios de ensaios do ano.

    return Object.values(registry)
      .map((musico) => {
        // [Funcionamento]: Transforma o dicionário estruturado em uma lista linear JavaScript calculando os índices de BI.
        let consecutiveAbsences = 0; // [Funcionamento]: Contador horizontal temporário de faltas seguidas.
        let maxConsecutiveAbsences = 0; // [Funcionamento]: Registrador do recorde de faltas seguidas do irmão no ano.
        let monthsWithEnsaio = 0; // [Funcionamento]: Contador de meses que de fato tiveram chamada nominal realizada.
        let presences = 0; // [Funcionamento]: Contador final de presenças.

        musico.monthsStatus.forEach((status) => {
          // [Funcionamento]: Passa lendo as 12 células mensais do histórico do irmão.
          if (status !== null) {
            // [Funcionamento]: Identifica se o mês teve ensaios computados.
            monthsWithEnsaio++; // [Funcionamento]: Incrementa a base de meses ativos.
            if (status === false) {
              // [Funcionamento]: Detectou uma ausência na célula.
              consecutiveAbsences++; // [Funcionamento]: Soma mais um no contador de reincidência.
              maxConsecutiveAbsences = Math.max(
                maxConsecutiveAbsences,
                consecutiveAbsences,
              ); // [Funcionamento]: Atualiza o recorde se quebrar a marca anterior.
            } else {
              // [Funcionamento]: O irmão estava presente no ensaio naquele mês.
              presences++; // [Funcionamento]: Incrementa o total de presenças horizontais dele.
              consecutiveAbsences = 0; // [Funcionamento]: Zera imediatamente o contador de reincidência consecutiva (presença salvadora).
            } // [Funcionamento]: Encerra condicional de estado de célula.
          } // [Funcionamento]: Encerra filtro de meses vazios.
        }); // [Funcionamento]: Fecha a varredura das 12 colunas do músico.

        return {
          // [Funcionamento]: Entrega o objeto final injetando as taxas matemáticas calculadas.
          ...musico, // [Funcionamento]: Herda os dados de cadastro e o vetor de meses.
          presencesCount: presences, // [Funcionamento]: Fixa a soma total de presenças do ano.
          totalEnsaioNoAno: monthsWithEnsaio, // [Funcionamento]: Fixa o total de oportunidades de ensaios.
          attendanceRate:
            monthsWithEnsaio > 0
              ? Math.round((presences / monthsWithEnsaio) * 100)
              : 0, // [Funcionamento]: Calcula a porcentagem clássica de assiduidade individual.
          isEvasionRisk: maxConsecutiveAbsences >= 3, // [Funcionamento]: Gatilho preditivo: marca true se o irmão acumulou 3 ou mais faltas seguidas no ano.
        }; // [Funcionamento]: Fecha o retorno do mapeamento.
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")); // [Funcionamento]: Ordena o Corpo Musical em ordem alfabética de A a Z respeitando a acentuação nativa.
  }, [events, selectedYear, isAuthorized]); // [Funcionamento]: Recalcula a matriz inteira na RAM se novos relatórios chegarem ou o ano mudar.

  // Menu superior fixo com Órgão na segunda posição imediata
  const sectionsMenu = [
    "ALL",
    "ÓRGÃO",
    "CORDAS",
    "MADEIRAS",
    "SAXOFONES",
    "METAIS",
    "TECLAS",
  ]; // [Funcionamento]: Vetor estático que alimenta as abas de filtragem por naipes na interface.

  // Filtros de pesquisa em tempo real
  const filteredMusicos = useMemo(() => {
    // [Funcionamento]: Aplica os filtros combinados de busca por nome e aba instrumental na matriz da orquestra.
    return orchestraMatrix.filter((m) => {
      // [Funcionamento]: Varre os músicos calculando a interseção dos filtros.
      const matchSearch = m.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()); // [Funcionamento]: Checa se o texto digitado bate com parte do nome do músico.
      const matchSection =
        selectedSection === "ALL" || m.section === selectedSection; // [Funcionamento]: Checa se a aba ativa é 'ALL' ou bate com a família do irmão.
      return matchSearch && matchSection; // [Funcionamento]: Retorna verdadeiro unicamente se o músico passar em ambas as exigências.
    }); // [Funcionamento]: Termina a filtragem.
  }, [orchestraMatrix, searchTerm, selectedSection]); // [Funcionamento]: Recalcula as linhas visuais se o usuário digitar ou trocar de aba.

  // PRESERVAÇÃO: INTERCEPTADOR ASSÍNCRONO BLINDADO (REFIX VITE 500)
  const handleDispararImprimirPdf = async () => {
    // [Funcionamento]: Rotina acionada no clique da impressora para disparar a geração mestre do PDF.
    if (orchestraMatrix.length === 0)
      return toast.error("Nenhum dado disponível para o ano selecionado."); // [Funcionamento]: Emite aviso flutuante e barra o processo se a tabela estiver zerada.

    const toastCarregando = toast.loading(
      "Calculando colunas e desenhando matriz anual...",
    ); // [Funcionamento]: Dispara tela de loading flutuante na interface mobile.

    try {
      // [Funcionamento]: Reconstrói o histórico condensado no formato de dicionário que o pdfPresencaAnualService exige para bater as chaves.
      const historicoMapeadoParaBCE = {}; // [Funcionamento]: Inicializa dicionário limpo na RAM.
      orchestraMatrix.forEach((m) => {
        // [Funcionamento]: Varre os músicos ativos processados na tela.
        historicoMapeadoParaBCE[m.id] = {}; // [Funcionamento]: Abre um sub-objeto para o ID estável daquele irmão.
        m.monthsStatus.forEach((status, idx) => {
          // [Funcionamento]: Transforma as 12 colunas horizontais no indexador temporal oficial.
          const chaveMesAno = `${selectedYear}_${String(idx + 1).padStart(2, "0")}`; // [Funcionamento]: Monta a string de chave técnica (ex: 2026_07).
          historicoMapeadoParaBCE[m.id][chaveMesAno] = {
            presente: status === true,
          }; // [Funcionamento]: Carimba o booleano de presença pura no formato que o motor de BI exige.
        }); // [Funcionamento]: Fecha loop de meses.
      }); // [Funcionamento]: Fecha loop de músicos.

      // [Funcionamento]: Blindagem de Sinal Vite: Garante uma estrutura limpa se os filtros da Comum estiverem vazios no carregamento.
      const comumMockPayload = comumDataSelected || {
        comum: events[0]?.comumNome || "Sua Comum",
        cidadeNome: events[0]?.cidadeNome || "Jundiaí",
      }; // [Funcionamento]: Cria objeto de fallback seguro contra quebras de nulo.

      // [Funcionamento]: Disparo Soberano da Folha: Invocação do módulo passando ano, comuns, fichas originais e o histórico mapeado.
      await pdfPresencaAnualService.generatePresencaAnual(
        selectedYear,
        comumMockPayload,
        orchestraMatrix,
        historicoMapeadoParaBCE,
        {
          accessLevel: "comissao",
          activeRegionalName: events[0]?.regionalNome || "Jundiaí",
        },
      ); // [Funcionamento]: Executa a compilação matemática vetorial dos gráficos e tabelas no PDF.
      toast.success("Relatório Anual PDF gerado com sucesso!", {
        id: toastCarregando,
      }); // [Funcionamento]: Remove a tela de carregamento e exibe mensagem de sucesso para a secretaria.
    } catch (err) {
      // [Funcionamento]: Captura falhas de código ou estouros de memória.
      console.error(err); // [Funcionamento]: Imprime o erro técnico no log do sistema.
      toast.error("Falha ao processar matriz de impressão.", {
        id: toastCarregando,
      }); // [Funcionamento]: Alerta a liderança sobre erro no motor vetorial.
    } // [Funcionamento]: Termina bloco de tratamento de erros.
  }; // [Funcionamento]: Fecha método assíncrono.

  // TELA DE BLOQUEIO LOCALIZADA: Se o usuário for básico, barra exclusivamente esta aba com card amigável
  if (!isAuthorized) {
    // [Funcionamento]: Barreira de segurança nível de acesso local.
    return (
      // [Funcionamento]: Intercepta a interface e devolve o aviso de bloqueio na tela do usuário básico.
      <div className="w-full py-10 bg-white border border-slate-100 rounded-[2.5rem] p-6 flex flex-col items-center text-center shadow-sm animate-fadeIn">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-3">
          <Lock size={18} />
        </div>
        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider italic">
          Visualização Restrita
        </h4>
        <p className="text-xs text-slate-400 font-bold mt-1 leading-relaxed max-w-[220px]">
          A visualização é exclusiva para a Liderança Musical.
        </p>
      </div>
    ); // [Funcionamento]: Termina o retorno do card protetor.
  } // [Funcionamento]: Fecha bloco de validação de poder.

  return (
    // [Funcionamento]: Palco visual mestre da aba de frequência se o usuário tiver autorização.
    <div className="space-y-4 w-full min-w-0 text-left">
      {/* SEÇÃO 1 RETIFICADA: REMOVIDO O SELETOR DE ANO LOCAL SECUNDÁRIO PARA CENTRALIZAR O FILTRO NA LUPA PAI */}
      <div className="flex gap-3 w-full items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar músico da comum..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* 🚀 BOTÃO PREMIUM DE PDF RESTAURADO: Alinhamento, cor, contorno e texto 100% integrados no padrão original da ata */}
        <button
          type="button" // [Funcionamento]: Evita recarregamento de página padrão HTML.
          onClick={handleDispararImprimirPdf} // [Funcionamento]: Invoca a rotina assíncrona de compilação da matriz de 12 meses.
          className="bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all text-blue-600 rounded-[1.5rem] border border-blue-100 flex items-center justify-center gap-0.5 h-12 px-3 shadow-sm font-black text-[11px] uppercase tracking-wider shrink-0 outline-none layout-touch" // [Funcionamento]: Molda o botão retangular horizontal com conforto de 48px de altura.
        >
          <FileText size={16} className="text-blue-600" />{" "}
          {/* [Funcionamento]: Desenha o ícone técnico de folha azul no centro da ação. */}
          <span className="font-extrabold tracking-tight">PDF</span>{" "}
          {/* [Funcionamento]: Injeta a etiqueta textual mestre ao lado do desenho unificando the identidade visual. */}
        </button>
      </div>

      {/* SEÇÃO 2: ABAS FIXAS SUPERIORES */}
      <div className="w-full overflow-x-auto scrollbar-none flex items-center gap-2 pb-1 shrink-0 -mx-4 px-4">
        {sectionsMenu.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`h-11 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all shrink-0 flex items-center justify-center cursor-pointer ${
              selectedSection === sec
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {sec === "ALL" ? "Orquestra" : sec}
          </button>
        ))}
      </div>

      {/* SEÇÃO 3: CABEÇALHO TABULAR DA CHAMADA */}
      <div className="flex justify-between items-center px-2.5 h-0 bg-slate-100/60 rounded-xl border border-slate-200/30">
        <span className="text-[13px] font-black uppercase text-slate-400 tracking-wider">
          Corpo Musical
        </span>

        <div className="flex items-center justify-between gap-[3px] w-full max-w-[205px] shrink-0 px-[4px]">
          {iniciaisMeses.map((letra, idx) => (
            <span
              key={idx}
              className="w-[13px] text-center text-[15px] font-black text-slate-400 select-none"
            >
              {letra}
            </span>
          ))}
        </div>
      </div>

      {/* SEÇÃO 4: HISTÓRICO EM HEATMAP MATRICIAL MOBILE */}
      <div className="space-y-2 w-full">
        {filteredMusicos.length > 0 ? (
          filteredMusicos.map((musico, index) => (
            <div
              key={index}
              onClick={() => setSelectedMusico(musico)}
              className={`w-full min-h-[3.75rem] bg-white border rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 min-w-0 transition-all active:bg-slate-50 cursor-pointer ${
                musico.isEvasionRisk
                  ? "border-l-4 border-l-red-500 border-slate-100"
                  : "border-slate-100"
              }`}
            >
              <div className="w-[42%] min-w-0 text-left">
                <h4 className="text-xs font-black text-slate-800 truncate tracking-tight uppercase">
                  {musico.name}
                </h4>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate block">
                  {musico.instrument}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-between gap-[3px] max-w-[210px] shrink-0">
                {musico.monthsStatus.map((status, mIdx) => (
                  <div
                    key={mIdx}
                    className={`w-[14px] h-[22px] rounded-[4px] flex flex-col items-center justify-center text-[8px] font-black transition-all ${
                      status === true
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-100"
                        : status === false
                          ? "bg-red-400 text-white shadow-sm shadow-red-100"
                          : "border border-dashed border-slate-200 bg-slate-50 text-slate-300"
                    }`}
                  >
                    {status === true ? "P" : status === false ? "A" : "-"}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="w-full py-12 bg-white border border-slate-100 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-6 text-center">
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Nenhum registro encontrado
            </h5>
            <p className="text-xs text-slate-400 mt-1 font-medium max-w-[200px]">
              Sem dados para exibir com os critérios atuais.
            </p>
          </div>
        )}
      </div>

      {/* SEÇÃO 5: MODAL DA FICHA TÉCNICA DETALHADA DO MÚSICO */}
      <AnimatePresence>
        {selectedMusico && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMusico(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 24, stiffness: 350 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative z-10 border border-slate-100 flex flex-col gap-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-blue-600">
                  <Award size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 italic">
                    Ficha do Membro
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMusico(null)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-pointer active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                    Nome do Músico
                  </span>
                  <p className="text-sm font-black text-slate-800 uppercase break-words">
                    {selectedMusico.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                      Naipe
                    </span>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-tight">
                      {selectedMusico.section}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                      Instrumento
                    </span>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">
                      {selectedMusico.instrument}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                      Situação Atual
                    </span>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
                      {selectedMusico.situacao}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border ${
                      selectedMusico.isEvasionRisk
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    <span className="text-[9px] font-black opacity-60 uppercase tracking-wider block mb-0.5">
                      Assiduidade Anual
                    </span>
                    <div className="flex items-center gap-1 font-black text-xs">
                      <Percent size={12} className="shrink-0" />
                      <span>{selectedMusico.attendanceRate}%</span>
                    </div>
                  </div>
                </div>

                {selectedMusico.isEvasionRisk && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-2.5 text-left items-start">
                    <ShieldAlert
                      size={18}
                      className="text-red-500 shrink-0 mt-0.5"
                    />
                    <div>
                      <h5 className="text-[11px] font-black text-red-800 uppercase tracking-tight">
                        Risco Crítico de Afastamento
                      </h5>
                      <p className="text-[11px] text-red-600/90 font-bold mt-0.5 leading-snug">
                        Este irmão faltou a 3 ou mais ensaios consecutivos nos
                        meses ativos. Sugere-se uma visita preventiva.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocalAttendanceList;
