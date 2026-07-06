import jsPDF from 'jspdf'; // [Funcionamento]: Importa a biblioteca principal para moldar e gerar arquivos PDF do zero.
import autoTable from 'jspdf-autotable'; // [Funcionamento]: Importa o assistente de tabelas estruturadas para criar as colunas de meses.

// [Funcionamento]: Função auxiliar que deixa apenas a primeira letra de cada palavra maiúscula (Ex: SILAS -> Silas)
const formatarNomeExtenso = (str) => {
  if (!str) return ""; // [Funcionamento]: Se o texto vier nulo, retorna vazio para segurança do app.
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); // [Funcionamento]: Quebra os espaços e capitaliza as primeiras letras.
};

export const pdfPresencaAnualService = {
  /**
   * Gerador de Relatório de Frequência e Assiduidade Anual de Músicos
   * v11.0 - SCOPE RECTIFIED & ZERO WARNINGS LEGACY COMPILE PRODUCTION EDITION
   */
  generatePresencaAnual: async (anoVigente, comunsData, listaMusicosFichas, historicoPresencasMensais, userData) => {
    // [Funcionamento]: Cria o documento em formato Retrato em milímetros.
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); // [Funcionamento]: Inicia a folha em pé tamanho A4.
    const pageWidth = doc.internal.pageSize.width; // [Funcionamento]: Captura a largura útil total da página em pé (210mm).
    const pageHeight = doc.internal.pageSize.height; // [Funcionamento]: Captura a altura útil total da página em pé (297mm).
    const margin = 8; // [Funcionamento]: Define margem de respiro de 8 milímetros nas bordas para alinhamento.

    // [Funcionamento]: Cria a lista de meses abreviados por extenso.
    const mesesIniciais = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]; // [Funcionamento]: Cabeçalho oficial padrão de mercado de 3 letras.

    // 1. HIGIENIZAÇÃO DE CABEÇALHO JURISDICIONAL
    const localidadePura = comunsData?.comum || userData?.comum || "Congregação"; // [Funcionamento]: Captura o nome da igreja ativa do estado.
    const comumNomeFormatado = formatarNomeExtenso(localidadePura); // [Funcionamento]: Formata o nome da igreja deixando as primeiras letras maiúsculas.
    const cidadeNome = formatarNomeExtenso(comunsData?.cidadeNome || userData?.cidadeNome || "Jundiaí"); // [Funcionamento]: Formata o nome da cidade por extenso.
    const regionalNome = `Regional ${formatarNomeExtenso(userData?.activeRegionalName || userData?.regional || "Jundiaí")}`; // [Funcionamento]: Monta o rótulo da comarca regional.
    
    // 2. DESENHO DO CABEÇALHO DA ATA ANUAL
    doc.setFont("times", "bold"); // [Funcionamento]: Força fonte clássica litúrgica Times New Roman em Negrito.
    doc.setFontSize(11); // [Funcionamento]: Tamanho de letra para destaque de título principal.
    doc.text("Relatório Anual de Frequência da Orquestra", pageWidth / 2, 10, { align: "center" }); // [Funcionamento]: Desenha o título principal centralizado no topo.
    doc.setFontSize(9.5); // [Funcionamento]: Tamanho eclesiástico secundário.
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 14, { align: "center" }); // [Funcionamento]: Desenha o cabeçalho eclesiástico mestre.
    doc.setFont("times", "normal"); // [Funcionamento]: Remove o negrito para as descrições de endereço.
    doc.setFontSize(8.5); // [Funcionamento]: Tamanho enxuto de fonte.
    doc.text(`${comumNomeFormatado} - ${cidadeNome} • ${regionalNome}`, pageWidth / 2, 18, { align: "center" }); // [Funcionamento]: Desenha a jurisdição limpa por extenso.
    
    doc.setFont("times", "bold"); // [Funcionamento]: Ativa o negrito para o marcador cronológico.
    doc.text(`ANO: ${anoVigente}`, pageWidth - margin, 21, { align: "right" }); // [Funcionamento]: Alinha o ano corrente à extrema direita da folha.
    doc.line(margin, 22, pageWidth - margin, 22); // [Funcionamento]: Desenha o traço preto horizontal de divisão de blocos.

    // [Funcionamento]: Cria vetor falso de 12 posições na memória para rastreamento de meses chamados.
    const mesesComChamadaNominalRealizada = Array(12).fill(false); // [Funcionamento]: Inicializa marcador lógico de conferência de rede para os 12 meses.
    const historicoInjetadoRAM = historicoPresencasMensais || {}; // [Funcionamento]: Isola e herda o dicionário de cartões mensais vindo do Firebase.

    (listaMusicosFichas || []).forEach(m => {
      const idChaveMusico = String(m.id || m.uid || m.nome?.toLowerCase().replace(/\s+/g, '')).trim(); // [Funcionamento]: Normaliza chaves de texto e IDs.
      Array(12).fill(null).forEach((_, mesIdx) => {
        const apiKeyMesAno = `${anoVigente}_${String(mesIdx + 1).padStart(2, '0')}`; // [Funcionamento]: Indexador temporal (ex: 2026_07).
        const ficha = historicoInjetadoRAM[idChaveMusico]?.[apiKeyMesAno] || historicoInjetadoRAM[m.id]?.[apiKeyMesAno]; // [Funcionamento]: Captura o nó do mês.
        if (ficha && (ficha.status === 'nominal' || ficha.modoContagem === 'nominal' || ficha.presente === true)) {
          mesesComChamadaNominalRealizada[mesIdx] = true; // [Funcionamento]: Carimba o mês como auditado via chamada nominal verdadeira.
        }
      });
    });

    // [Funcionamento]: Conta os booleanos verdadeiros na RAM para fixar o denominador dinâmico.
    const totalMesesComChamadaNominalRealizada = mesesComChamadaNominalRealizada.filter(Boolean).length || 1; // [Funcionamento]: Evita divisão por zero se a rede falhar.

    // 3. TRIAGEM E AGRUPAMENTO POR FAMÍLIAS INSTRUMENTAIS LITÚRGICAS (AGLUTINAÇÃO BI)
    const listaSanitizadaMembros = (listaMusicosFichas || []).map(m => {
      const nomeLimpo = formatarNomeExtenso(m.name || m.nome || "IRMÃO"); // [Funcionamento]: Higieniza o nome em formato título case.
      const instId = String(m.instrumentoId || m.instrumentId || '').toLowerCase().trim(); // [Funcionamento]: Captura a sigla identificadora do instrumento.
      const instNome = String(m.instrumentoNome || m.instrument || 'GERAL').toUpperCase().trim(); // [Funcionamento]: Captura o nome do instrumento em letras maiúsculas.
      
      let familiaAlvo = 'CORDAS'; // [Funcionamento]: Define as cordas como gaveta padrão de fallback.
      if (instId === 'orgao' || instId === 'órgão' || instNome.includes('ORGANISTA') || instNome === 'ÓRGÃO') {
        familiaAlvo = 'ORGANISTAS'; // [Funcionamento]: Filtra laço da família das organistas.
      } else if (instId === 'acordeon' || instNome.includes('ACORDEON') || instNome.includes('TECLA')) {
        familiaAlvo = 'TECLAS'; // [Funcionamento]: Separa os acordeonistas. 
      } else if (instId.startsWith('sax') || instNome.includes('SAX')) {
        familiaAlvo = 'SAXOFONES'; // [Funcionamento]: Filtra a família dos saxofones.
      } else if (['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufônio', 'tuba', 'flugelhorn'].includes(instId) || instNome.includes('TROMPETE') || instNome.includes('TROMBONE') || instNome.includes('TROMPA') || instNome.includes('TUBA') || instNome.includes('EUFÔNIO')) {
        familiaAlvo = 'METAIS'; // [Funcionamento]: Direciona para a gaveta dos metais.
      } else if (['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'claronealto', 'claronebaixo', 'corneingles'].includes(instId) || instNome.includes('CLARINETE') || instNome.includes('FLAUTA') || instNome.includes('OBOÉ') || instNome.includes('FAGOTE') || instNome.includes('CLARONE')) {
        familiaAlvo = 'MADEIRAS'; // [Funcionamento]: Direciona para a gaveta das madeiras.
      }

      let totalPresencasDesteMusicoNoAno = 0; // [Funcionamento]: Acumulador horizontal de acertos. 
      const idChaveMusico = String(m.id || m.uid || nomeLimpo.toLowerCase().replace(/\s+/g, '')).trim(); // [Funcionamento]: Chave estável de verificação.

      const colunasMesesDoMusico = Array(12).fill("-").map((_, mesIdx) => {
        const chaveMesAno = `${anoVigente}_${String(mesIdx + 1).padStart(2, '0')}`; // [Funcionamento]: Chave técnica de comarca (ex: 2026_07).
        const fichaPresencaDoMes = historicoInjetadoRAM[idChaveMusico]?.[chaveMesAno] || historicoInjetadoRAM[m.id]?.[chaveMesAno]; // [Funcionamento]: Pesca a presença.
        
        if (fichaPresencaDoMes && (fichaPresencaDoMes.presente === true || (Array.isArray(fichaPresencaDoMes) && fichaPresencaDoMes[0]?.presente === true))) {
          totalPresencasDesteMusicoNoAno++; // [Funcionamento]: Incrementa a soma horizontal do irmão. 
          return "P"; // [Funcionamento]: Retorna a letra 'P' de presente para a célula. 
        } else if (mesesComChamadaNominalRealizada[mesIdx] === true) {
          return "A"; // [Funcionamento]: Se o mês teve ensaio nominal e o músico faltou, crava a letra 'A' de ausente. 
        }
        return "-"; // [Funcionamento]: Se o ensaio foi numérico ou não ocorreu, mantém o traço limpo.
      });

      // [Funcionamento]: Avalia horizontalmente se o irmão acumulou 3 ausências seguidas.
      let contadorFaltasSeguidas = 0;
      let atingiuFaltasSeguidas = false;
      colunasMesesDoMusico.forEach(char => {
        if (char === "A") {
          contadorFaltasSeguidas++;
          if (contadorFaltasSeguidas >= 3) atingiuFaltasSeguidas = true;
        } else if (char === "P") {
          contadorFaltasSeguidas = 0; // [Funcionamento]: Reseta o contador imediatamente caso possua uma presença salvadora.
        }
      });

      // [Funcionamento]: Avalia se possui 50% ou mais de ausências em períodos maiores que 6 meses ativos.
      const taxaAssiduidadeAtual = totalPresencasDesteMusicoNoAno / totalMesesComChamadaNominalRealizada;
      const violouPercentualMinimo = totalMesesComChamadaNominalRealizada > 6 && taxaAssiduidadeAtual <= 0.50;

      // [Funcionamento]: Subtrai as presenças do irmão apenas dos meses que de fato tiveram portaria nominal.
      const totalFaltasReaisContexto = Math.max(0, totalMesesComChamadaNominalRealizada - totalPresencasDesteMusicoNoAno);

      return {
        id: m.id,
        nome: nomeLimpo,
        instrumento: instNome,
        familia: familiaAlvo,
        ordem: m.ordem || 0,
        colunasMeses: colunasMesesDoMusico,
        totalPresencas: totalPresencasDesteMusicoNoAno,
        totalFaltasAno: totalFaltasReaisContexto,
        emAlerta: atingiuFaltasSeguidas || violouPercentualMinimo // [Funcionamento]: Ativa flag se violar o critério A ou B para destacar o nome!
      };
    });

    // [Funcionamento]: Ordenação explicita por série litúrgica orquestral obrigatória.
    const ordemNaipesSequencia = ['ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS']; // [Funcionamento]: Vetor mestre de ordenação estrutural.
    listaSanitizadaMembros.sort((a, b) => {
      const idxA = ordemNaipesSequencia.indexOf(a.familia); // [Funcionamento]: Procura a posição do grupo A.
      const idxB = ordemNaipesSequencia.indexOf(b.familia); // [Funcionamento]: Procura a posição do grupo B.
      if (idxA !== idxB) return idxA - idxB; // [Funcionamento]: Desempata pelo peso da família instrumental.
      return (a.ordem - b.ordem) || a.nome.localeCompare(b.nome, 'pt-BR'); // [Funcionamento]: Desempata pelo peso de cadeira e nome.
    });

    // [Funcionamento]: Declaramos a variável do total nominal absoluto da orquestra aqui no topo, antes dos loops!
    const totalInscritosOrquestra = Math.max(1, listaSanitizadaMembros.length); // [Funcionamento]: Trava o total bruto nominal de músicos ativos da orquestra (ex: 87).
    
    // [Funcionamento]: Calcula o tamanho total de integrantes de fileira da orquestra geral sem computar as organistas de banco!
    const totalOrquestraSemOrganistas = Math.max(1, listaSanitizadaMembros.filter(f => f.familia !== 'ORGANISTAS').length); // [Funcionamento]: Injeta o denominador real de agrupamento da orquestra.

    const somasVerticaisMeses = Array(12).fill(0); // [Funcionamento]: Array acumulador de quantidade de presentes por coluna de mês.
    let totalAcumuladoAbsolutoAno = 0; // [Funcionamento]: Contador absoluto geral de presenças do ano todo.

    // 4. CONSTRUÇÃO FINAL DAS LINHAS VISUAIS DA GRADE MESTRE
    const tabelaCorpoMatriz = []; // [Funcionamento]: Matriz que guardará todas as linhas estruturadas da autoTable.
    let ultimaFamiliaDetectada = ''; // [Funcionamento]: Marcador de controle de quebra para injeção de cabeçalhos de naipes.
    let contadorOrdemMusicoGeral = 0; // [Funcionamento]: Contador numérico progressivo para enumerar os músicos à esquerda (1 a 87).

    // [Funcionamento]: Dicionário que armazenará as contagens exatas de presentes de cada naipe por mês para alimentar os gráficos.
    const dadosMensaisPorNaipeGraficos = { ORGANISTAS: Array(12).fill(0), CORDAS: Array(12).fill(0), MADEIRAS: Array(12).fill(0), SAXOFONES: Array(12).fill(0), METAIS: Array(12).fill(0), TECLAS: Array(12).fill(0) };

    listaSanitizadaMembros.forEach((m) => {
      // [Funcionamento]: Se mudar a família, injeta a barra de divisão escura e a linha de proporções matemáticas.
      if (m.familia !== ultimaFamiliaDetectada) {
        ultimaFamiliaDetectada = m.familia; // [Funcionamento]: Atualiza o marcador de família corrente.
        
        const membrosDestaFamilia = listaSanitizadaMembros.filter(f => f.familia === m.familia); // [Funcionamento]: Filtra os irmãos pertencentes a esta família.
        const totalMusicosDoNaipe = Math.max(1, membrosDestaFamilia.length); // [Funcionamento]: Descobre quantos músicos compõem esse naipe específico.

        const estimativaAlturaNecessariaNaipe = (totalMusicosDoNaipe + 2) * 4.2; // [Funcionamento]: Estima o espaço vertical em milímetros do naipe completo.
        const flagForcarSaltoDePagina = tabelaCorpoMatriz.length > 0 && totalMusicosDoNaipe > 1 && estimativaAlturaNecessariaNaipe > 85; // [Funcionamento]: Calcula risco de quebra órfã.

        tabelaCorpoMatriz.push([{ 
          content: `FAMÍLIA: ${m.familia}`, 
          colSpan: 15, 
          cantSplit: true, // [Funcionamento]: Tranca o título escuro impedindo que ele apareça órfão no final do papel.
          styles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'left', cellPadding: 0.4, fontSize: 5.4 },
          pageBreak: flagForcarSaltoDePagina ? 'always' : 'auto' // [Funcionamento]: Salta de página preventivamente para manter título e músicos juntos.
        }]);
        
        // [Funcionamento]: Monta as frações de presença do naipe alinhadas verticalmente sob cada coluna.
        const linhaDeProporcoesDoNaipe = Array(12).fill(null).map((_, idxMes) => {
          const totalPresentesDoNaipeNoMes = membrosDestaFamilia.filter(f => f.colunasMeses[idxMes] === "P").length; // [Funcionamento]: Filtra presentes do mês.
          
          if (m.familia === 'ORGANISTAS') { // [Funcionamento]: Valida se o bloco pertence ao banco do órgão.
            dadosMensaisPorNaipeGraficos[m.familia][idxMes] = totalPresentesDoNaipeNoMes > 0 ? Math.round((totalPresentesDoNaipeNoMes / totalMusicosDoNaipe) * 100) : 0; // [Funcionamento]: Preserva o cálculo original das organistas.
          } else { // [Funcionamento]: Se for grupo de fileira orquestral (Cordas, Madeiras, Saxes, Metais e Teclas).
            dadosMensaisPorNaipeGraficos[m.familia][idxMes] = totalPresentesDoNaipeNoMes > 0 ? Math.round((totalPresentesDoNaipeNoMes / totalOrquestraSemOrganistas) * 100) : 0; // [Funcionamento]: Aplica o cálculo mestre solicitado sobre o total geral sem organistas.
          } // [Funcionamento]: Encerra a condicional de inteligência deBI.
          
          return `${totalPresentesDoNaipeNoMes}/${totalMusicosDoNaipe}`; // [Funcionamento]: Monta a string fracionada.
        }); // [Funcionamento]: Fecha o mapa mensal das frações.
        tabelaCorpoMatriz.push([{ content: "PROPORÇÃO DE PRESENÇAS DO NAIPE", colSpan: 2, cantSplit: true, styles: { fontStyle: 'italic', font: 'times', fontSize: 5.2, halign: 'right', fillColor: [241, 245, 249] } }, ...linhaDeProporcoesDoNaipe, ""]); // [Funcionamento]: Injeta a fileira de proporções.
      }

      contadorOrdemMusicoGeral++; // [Funcionamento]: Incrementa a ordem numérica progressiva a cada irmão.
      m.colunasMeses.forEach((char, idx) => {
        if (char === "P") somasVerticaisMeses[idx]++; // [Funcionamento]: Incrementa acumulador vertical de presentes do mês.
      });
      totalAcumuladoAbsolutoAno += m.totalPresencas; // [Funcionamento]: Soma no acumulador geral absoluto do ano todo.
      
      // [Funcionamento]: Transporta o sinalizador lógico de risco direto para a linha da matriz para leitura do autoTable!
      tabelaCorpoMatriz.push([
        { content: `${contadorOrdemMusicoGeral}.`, emAlerta: m.emAlerta }, 
        { content: `${m.nome} [${m.instrumento}]`, emAlerta: m.emAlerta }, 
        ...m.colunasMeses, 
        m.totalPresencas
      ]); // [Funcionamento]: Injeta a estrutura de células envelopadas em objetos de BI.
    });

    // [Funcionamento]: Cria uma meia linha de respiro em branco fake que separa o corpo dos totais.
    const linhaInvisivelDeRespiro = Array(15).fill(""); // [Funcionamento]: Vetor de 15 colunas vazias.
    tabelaCorpoMatriz.push(linhaInvisivelDeRespiro); // [Funcionamento]: Acopla o espaçador fake na malha antes de descer os totalizadores.

    const linhaVerticalQuantidade = ["", "QUANTIDADE DE PRESENTES", ...somasVerticaisMeses, totalAcumuladoAbsolutoAno]; // [Funcionamento]: Linha de total bruto de cabeças presentes.
    const linhaVerticalPorcentagem = ["", "PERCENTUAL DE ASSIDUIDADE", ...somasVerticaisMeses.map(presentes => `${((presentes / totalInscritosOrquestra) * 100).toFixed(0)}%`), "100%"]; // [Funcionamento]: Linha de BI percentual.

    tabelaCorpoMatriz.push(linhaVerticalQuantidade); // [Funcionamento]: Insere linha numérica de presentes.
    tabelaCorpoMatriz.push(linhaVerticalPorcentagem); // [Funcionamento]: Insere linha percentual.

    // 6. IMPRESSÃO DA GRADE DE ALTA DENSIDADE EM MODO RETRATO NO PDF
    autoTable(doc, {
      startY: 24, margin: { left: margin, right: margin, bottom: 8 },
      head: [['Nº', 'MÚSICO / INSTRUMENTO', ...mesesIniciais, 'TOTAL']], // [Funcionamento]: Títulos oficiais de 3 letras e nova coluna Nº.
      body: tabelaCorpoMatriz,
      theme: 'grid',
      styles: { fontSize: 5.4, cellPadding: 0.25, font: "times", halign: 'center', valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // [Funcionamento]: Zebramento cinza sutil alternado.
      columnStyles: { 
        0: { cellWidth: 5, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] }, // [Funcionamento]: Coluna numérica estreita de 5mm.
        1: { cellWidth: 48, halign: 'left' }, // [Funcionamento]: Nome com largura útil de 48mm equilibrando a planilha.
        14: { cellWidth: 12, fillColor: [240, 244, 248], fontStyle: 'bold' } // [Funcionamento]: Coluna do total geral da tabela.
      },
      didParseCell: (dataCell) => {
        const totalRows = tabelaCorpoMatriz.length;

        // [Funcionamento]: Trata laço da linha invisível de respiro limpando as grades e reduzindo o padding.
        if (dataCell.row.index === totalRows - 3) {
          dataCell.cell.styles.fillColor = [255, 255, 255]; // [Funcionamento]: Fundo branco absoluto.
          dataCell.cell.styles.cellPadding = 0.12; // [Funcionamento]: Padding reduzido à metade para simular 1/2 linha.
          dataCell.cell.styles.lineWidth = 0; // [Funcionamento]: Destrói as bordas internas do respiro.
        }

        // [Funcionamento]: Captura o metadado emAlerta e aplica o Bold e fundo Pérola sutil!
        if (dataCell.cell.raw && dataCell.cell.raw.emAlerta === true && (dataCell.column.index === 0 || dataCell.column.index === 1)) {
          dataCell.cell.styles.fontStyle = 'bold'; // [Funcionamento]: Força o nome do irmão sob risco em NEGRITO!
          dataCell.cell.styles.fillColor = [241, 245, 249]; // [Funcionamento]: Injeta fundo cinza pérola sutil para alertar the analista.
        }

        // [Funcionamento]: Garante o travamento dinâmico antitransbordo se bater perto da margem inferior de escape.
        if (dataCell.row.raw && dataCell.row.raw[0] && String(dataCell.row.raw[0].content).includes("FAMÍLIA:")) {
          const indexAtual = dataCell.row.index;
          if (indexAtual > totalRows - 12 && dataCell.row.raw[0].pageBreak !== 'always') {
            dataCell.row.raw[0].pageBreak = 'always'; // [Funcionamento]: Intercepta e joga o cabeçalho inteiro para a página 2 se ele for ficar órfão.
          }
        }

        if (dataCell.cell.text[0] === "P") { dataCell.cell.styles.textColor = [5, 150, 105]; dataCell.cell.styles.fontStyle = 'bold'; } // [Funcionamento]: Verde esmeralda para presentes.
        else if (dataCell.cell.text[0] === "A") { dataCell.cell.styles.textColor = [220, 38, 38]; dataCell.cell.styles.fontStyle = 'bold'; } // [Funcionamento]: Vermelho carmim para ausentes.
        
        if (dataCell.row.index >= totalRows - 2) {
          dataCell.cell.styles.fillColor = [226, 232, 240]; dataCell.cell.styles.textColor = [15, 23, 42]; dataCell.cell.styles.fontStyle = 'bold';
          if (dataCell.column.index === 1) dataCell.cell.styles.halign = 'right';
        }
      }
    });

    // 7. PROCESSAMENTO DOS RANKINGS TOP 10 ESPELHADOS (NOMES INTEIROS EM COLUNAS RETAS ALINHADAS)
    let blocoY = doc.lastAutoTable.finalY + 4; // [Funcionamento]: Computa espaço de respiro após o fim da tabela principal.
    doc.line(margin, blocoY, pageWidth - margin, blocoY); // [Funcionamento]: Desenha uma linha separadora discreta.
    blocoY += 2; // [Funcionamento]: Posiciona o ponteiro vertical para o início dos rankings.

    const membrosOrquestraGeral = listaSanitizadaMembros.filter(m => m.familia !== 'ORGANISTAS'); // [Funcionamento]: Separa os músicos locais excluindo organistas.
    const membrosOrganistasExclusivas = listaSanitizadaMembros.filter(m => m.familia === 'ORGANISTAS'); // [Funcionamento]: Filtra apenas as organistas de banco.

    // --- BLOCO A: RANKINGS DA ORQUESTRA GERAL (TOP 10) ---
    const musicosTopPresentes = [...membrosOrquestraGeral].sort((a, b) => b.totalPresencas - a.totalPresencas).slice(0, 10); // [Funcionamento]: Classifica os 10 mais presentes.
    const musicosTopAusentes = [...membrosOrquestraGeral].sort((a, b) => b.totalFaltasAno - a.totalFaltasAno).slice(0, 10); // [Funcionamento]: Classifica os 10 mais ausentes no contexto ativo.

    const corpoOrquestraRankingRegua = Array(10).fill(null).map((_, idx) => {
      const p = musicosTopPresentes[idx]; const a = musicosTopAusentes[idx];
      const colAusenteNome = a ? `${idx + 1}. ${a.nome} [${a.instrumento}]` : ""; // [Funcionamento]: Nome e instrumento por extenso do ausente.
      const colAusenteDado = a ? `: ${a.totalFaltasAno}/${totalMesesComChamadaNominalRealizada}F` : ""; // [Funcionamento]: Exibe fração reta de faltas contextuais (ex: : 1/1F).
      const colPresenteNome = p ? `${idx + 1}. ${p.nome} [${p.instrumento}]` : ""; // [Funcionamento]: Nome e instrumento por extenso do presente.
      const colPresenteDado = p ? `: ${p.totalPresencas}/${totalMesesComChamadaNominalRealizada}P` : ""; // [Funcionamento]: Exibe fração reta de assiduidade contextual (ex: : 1/1P).
      return [colAusenteNome, colAusenteDado, "", colPresenteNome, colPresenteDado]; // [Funcionamento]: Retorna as colunas separadas para alinhamento reto.
    });

    autoTable(doc, {
      startY: blocoY, margin: { left: margin, right: margin },
      head: [['Rk Ausências (Orquestra)', '', '', 'Rk Presenças (Orquestra)', '']], 
      body: corpoOrquestraRankingRegua,
      theme: 'plain', // [Funcionamento]: Estilo limpo sem linhas de grade.
      styles: { fontSize: 5.6, font: "times", cellPadding: 0.3, textColor: [51, 65, 85] },
      headStyles: { fontStyle: 'bold', fontSize: 6.2, textColor: [15, 23, 42], fillColor: [241, 245, 249] },
      columnStyles: { 
        0: { cellWidth: 63, halign: 'left' }, // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 63mm liquidando the 18mm de estouro!
        1: { cellWidth: 19, halign: 'left', fontStyle: 'bold', textColor: [220, 38, 38] }, // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 19mm liquidando the 18mm de estouro!
        2: { cellWidth: 6 }, // [Funcionamento]: Respiro central invisível.
        3: { cellWidth: 63, halign: 'left' }, // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 63mm liquidando the 18mm de estouro!
        4: { cellWidth: 19, halign: 'left', fontStyle: 'bold', textColor: [5, 150, 105] } // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 19mm liquidando the 18mm de estouro!
      }
    });

    // --- BLOCO B: RANKINGS EXCLUSIVOS DAS ORGANISTAS (TOP 5 DESMEMBRADO) ---
    blocoY = doc.lastAutoTable.finalY + 3; // [Funcionamento]: Desce ponteiro para apoiar o ranking das irmãs logo abaixo.
    const organistasTopPresentes = [...membrosOrganistasExclusivas].sort((a, b) => b.totalPresencas - a.totalPresencas).slice(0, 5); // [Funcionamento]: Filtra Top 5 presentes.
    const organistasTopAusentes = [...membrosOrganistasExclusivas].sort((a, b) => b.totalFaltasAno - a.totalFaltasAno).slice(0, 5); // [Funcionamento]: Filtra Top 5 ausentes.

    const corpoOrganistasRankingRegua = Array(5).fill(null).map((_, idx) => {
      const p = organistasTopPresentes[idx]; const a = organistasTopAusentes[idx];
      const colAusenteNome = a ? `${idx + 1}. ${a.nome} [ÓRGÃO]` : ""; // [Funcionamento]: Identifica a organista ausente.
      const colAusenteDado = a ? `: ${a.totalFaltasAno}/${totalMesesComChamadaNominalRealizada}F` : ""; // [Funcionamento]: Fração reta de faltas.
      const colPresenteNome = p ? `${idx + 1}. ${p.nome} [ÓRGÃO]` : ""; // [Funcionamento]: Identifica a organista assídua.
      const colPresenteDado = p ? `: ${p.totalPresencas}/${totalMesesComChamadaNominalRealizada}P` : ""; // [Funcionamento]: Fração reta de presenças.
      return [colAusenteNome, colAusenteDado, "", colPresenteNome, colPresenteDado]; // [Funcionamento]: Retorna as 5 colunas simétricas.
    });

    autoTable(doc, {
      startY: blocoY, margin: { left: margin, right: margin },
      head: [['Rk Ausências (Organistas)', '', '', 'Rk Presenças (Organistas)', '']], 
      body: corpoOrganistasRankingRegua,
      theme: 'plain',
      styles: { fontSize: 5.6, font: "times", cellPadding: 0.3, textColor: [51, 65, 85] },
      headStyles: { fontStyle: 'bold', fontSize: 6.2, textColor: [124, 58, 237], fillColor: [243, 232, 255] }, // [Funcionamento]: Tom roxo litúrgico exclusivo para diferenciar o órgão.
      columnStyles: { 
        0: { cellWidth: 63, halign: 'left' }, // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 63mm liquidando the 18mm de estouro!
        1: { cellWidth: 19, halign: 'left', fontStyle: 'bold', textColor: [220, 38, 38] }, // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 19mm liquidando the 18mm de estouro!
        2: { cellWidth: 6 }, 
        3: { cellWidth: 63, halign: 'left' }, // 🚀 CALIBRAÇÃO DEFENSIVA SNIPER: Recolhido para 63mm liquidando the 18mm de estouro!
        4: { cellWidth: 19, halign: 'left', fontStyle: 'bold', textColor: [5, 150, 105] } 
      }
    });

    // 8. MOTOR DE BI ACUMULADO SOBERANO COM EIXO Y BALIZADO (+20%) E LABELS FLUTUANTES POR CAMADAS
    let graficoY = doc.lastAutoTable.finalY + 5; // [Funcionamento]: Centraliza o início dos gráficos na base livre da página 2.
    if (graficoY > pageHeight - 55) { doc.addPage(); graficoY = 15; } // [Funcionamento]: Garante espaço de segurança para abrigar as legendas inferiores.
    
    // 🚀 INVERSÃO E CORREÇÃO DE ESCOPO (RESOLVED LARGURAEIXOX): Declaramos a variável horizontal do eixo X AQUI no topo mestre dos gráficos para blindar the ReferenceError!
    const larguraEixoX = (pageWidth - (margin * 2) - 12) / 11; // [Funcionamento]: Inicializa a métrica horizontal de meses na RAM antes de qualquer loop rodar.

    // --- GRÁFICO 1: ÁREA EMPILHADA CONSOLIDADA DAS FAMÍLIAS ---
    doc.setFont("times", "bold"); doc.setFontSize(7.5); doc.setTextColor(15, 23, 42); // [Funcionamento]: Configura fonte preta ardósia.
    doc.text("ORQUESTRA", margin, graficoY); // [Funcionamento]: Desenha título mestre de BI.
    graficoY += 3.5; // [Funcionamento]: Avança ponteiro vertical.

    const sequenciaNaipesEmpilhados = ['CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS']; // [Funcionamento]: Mapeamento das 5 gavetas integradas do som.
    const coresNaipesDicionario = { CORDAS: [245, 158, 11], MADEIRAS: [16, 185, 129], SAXOFONES: [99, 102, 241], METAIS: [239, 68, 68], TECLAS: [219, 39, 119] }; // [Funcionamento]: Paleta completa de cores.

    // [Funcionamento]: Sensor de Escala Dinâmica. Varre os 12 meses acumulando as porcentagens internas das famílias.
    let picoMaximoEmpilhadoAno = 0;
    Array(12).fill(null).forEach((_, idxMes) => {
      let harmonySomaMes = 0;
      sequenciaNaipesEmpilhados.forEach(naipeId => {
        harmonySomaMes += dadosMensaisPorNaipeGraficos[naipeId][idxMes]; // [Funcionamento]: Soma as porcentagens reais calculadas na RAM.
      });
      picoMaximoEmpilhadoAno = Math.max(picoMaximoEmpilhadoAno, harmonySomaMes); // [Funcionamento]: Registra o maior pico empilhado real do ano.
    });
    
    const tetoCalculadoY1 = Math.min(400, Math.max(10, picoMaximoEmpilhadoAno * 1.2)); // [Funcionamento]: Balizamento de segurança de +20% no teto.
    const meioCalculadoY1 = tetoCalculadoY1 / 2; // [Funcionamento]: Linha intermediária da malha.

    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15); // [Funcionamento]: Carrega o tom cinza claro ultrafino para o grid.
    doc.line(margin + 12, graficoY, pageWidth - margin, graficoY); // [Funcionamento]: Linha do teto balizado (+20%).
    doc.line(margin + 12, graficoY + 12.5, pageWidth - margin, graficoY + 12.5); // [Funcionamento]: Linha do meio de 50%.
    doc.line(margin + 12, graficoY + 25, pageWidth - margin, graficoY + 25); // [Funcionamento]: Linha de chão base 0%.
    
    doc.setFont("times", "normal"); doc.setFontSize(5); doc.setTextColor(148, 163, 184); // [Funcionamento]: Configura fonte dos rótulos de escala.
    doc.text(`${tetoCalculadoY1.toFixed(0)}%`, margin + 3, graficoY + 1); // [Funcionamento]: Texto do topo dinâmico.
    doc.text(`${meioCalculadoY1.toFixed(0)}%`, margin + 3, graficoY + 13.5); // [Funcionamento]: Texto do meio.
    doc.text("0%", margin + 3, graficoY + 26); // [Funcionamento]: Texto da base zero.

    const baseAcumuladaMesesChao = Array(12).fill(0); // [Funcionamento]: Inicia vetor de chão cumulativo na RAM.
    const dicionarioCoordenadasLabelsBI = { CORDAS: [], MADEIRAS: [], SAXOFONES: [], METAIS: [], TECLAS: [], ORGANISTAS: [] }; // [Funcionamento]: Dicionário indexado por chaves inteiras oficiais.

    sequenciaNaipesEmpilhados.forEach((naipeId) => {
      const percentualNaipePorMes = dadosMensaisPorNaipeGraficos[naipeId]; // [Funcionamento]: Coleta os dados percentuais reais salvos na RAM.
      doc.setFillColor(coresNaipesDicionario[naipeId][0], coresNaipesDicionario[naipeId][1], coresNaipesDicionario[naipeId][2]); // [Funcionamento]: Ativa a respectiva cor do naipe corrente.
      
      const tetoInicialY = graficoY + 25 - (((baseAcumuladaMesesChao[0] + percentualNaipePorMes[0]) / tetoCalculadoY1) * 25); // [Funcionamento]: Calcula a quina esquerda.
      doc.moveTo(margin + 12, tetoInicialY); // [Funcionamento]: Move o cursor vetorial.

      const novosTetosDesteNaipe = []; // [Funcionamento]: Cria buffer temporário de teto.
      percentualNaipePorMes.forEach((pctNaipe, idxMes) => {
        const novoTetoMes = baseAcumuladaMesesChao[idxMes] + pctNaipe; // [Funcionamento]: Soma e empilha a onda por cima da anterior.
        novosTetosDesteNaipe.push(novoTetoMes); // [Funcionamento]: Grava o novo marco de altitude.

        const pontoMedioFatiaPct = baseAcumuladaMesesChao[idxMes] + (pctNaipe / 2); // [Funcionamento]: Encontra o baricentro geométrico interno da faixa.
        const coordFisicaY = graficoY + 25 - ((pontoMedioFatiaPct / tetoCalculadoY1) * 25); // [Funcionamento]: Converte o ponto médio para milímetros.
        dicionarioCoordenadasLabelsBI[naipeId].push({ y: coordFisicaY, pctExato: pctNaipe }); // [Funcionamento]: Alimenta a esteira de push sem estouros de undefined.

        const posX = margin + 12 + (idxMes * larguraEixoX); // [Funcionamento]: Calcula coordenada X horizontal do mês.
        const posY = graficoY + 25 - ((novoTetoMes / tetoCalculadoY1) * 25); // [Funcionamento]: Calcula coordenada Y vertical na escala.
        doc.lineTo(posX, posY); // [Funcionamento]: Desenha a linha da crista.
      });

      for (let idxMes = 11; idxMes >= 0; idxMes--) {
        const posX = margin + 12 + (idxMes * larguraEixoX); // [Funcionamento]: Mapeia o caminho de volta de trás para frente.
        const posYBaseAnterior = graficoY + 25 - ((baseAcumuladaMesesChao[idxMes] / tetoCalculadoY1) * 25); // [Funcionamento]: Converte o teto anterior em chão físico.
        doc.lineTo(posX, posYBaseAnterior); // [Funcionamento]: Traça a linha de selamento inferior.
        baseAcumuladaMesesChao[idxMes] = novosTetosDesteNaipe[idxMes]; // [Funcionamento]: Sela o degrau para o próximo loop usar como chão sólido.
      }
      doc.fill(); // [Funcionamento]: Preenche e sela o polígono com a respectiva cor isolada.
    });

    // [Funcionamento]: Varre as coordenadas imprimindo estritamente a porcentagem limpa no corpo do gráfico.
    doc.setFont("times", "bold"); doc.setFontSize(4.8); doc.setTextColor(15, 23, 42); // [Funcionamento]: Configura fonte preta ardósia de alta nitidez.
    sequenciaNaipesEmpilhados.forEach((naipeId) => {
      dicionarioCoordenadasLabelsBI[naipeId].forEach((metaCell, idxMes) => {
        if (mesesComChamadaNominalRealizada[idxMes] === true && metaCell.pctExato > 0) {
          const posX = margin + 12 + (idxMes * larguraEixoX); // [Funcionamento]: Centraliza no meio da coluna mensal.
          doc.text(`${metaCell.pctExato.toFixed(0)}%`, posX, metaCell.y + 0.8, { align: "center" }); // [Funcionamento]: Cospe apenas o número limpo (ex: '15%') destruindo a poluição visual anterior.
        }
      });
    });

    doc.setFont("times", "normal"); doc.setFontSize(5); doc.setTextColor(148, 163, 184); // [Funcionamento]: Reseta para fonte cinza de rodapé cartesiano.
    mesesIniciais.forEach((letra, idx) => { doc.text(letra, margin + 12 + (idx * larguraEixoX), graficoY + 28.5, { align: "center" }); }); // [Funcionamento]: Desenha JAN, FEV... no eixo X.

    // [Funcionamento]: Desenha quadradinhos indexadores na base para explicar as cores sem poluir o corpo.
    const itensLegendaOrquestra = [
      { label: 'CORDAS', color: [245, 158, 11] }, // [Funcionamento]: Indexador das Cordas em tom Âmbar.
      { label: 'MADEIRAS', color: [16, 185, 129] }, // [Funcionamento]: Indexador das Madeiras em tom Verde.
      { label: 'SAXOFONES', color: [99, 102, 241] }, // [Funcionamento]: Indexador dos Saxofones em tom Azul Indigo.
      { label: 'METAIS', color: [239, 68, 68] }, // [Funcionamento]: Indexador dos Metais em tom Vermelho.
      { label: 'TECLAS', color: [219, 39, 119] } // [Funcionamento]: Indexador das Teclas (Acordeon) em tom Fuchsia.
    ];
    let ponteiroLegendaX = margin + 15; // [Funcionamento]: Define o ponto de partida esquerdo da legenda horizontal.
    itensLegendaOrquestra.forEach(item => {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]); // [Funcionamento]: Prepara a cor do quadradinho.
      doc.rect(ponteiroLegendaX, graficoY + 31.5, 3, 2, 'F'); // [Funcionamento]: Desenha o marcador de cor de 3x2mm.
      doc.setFont("times", "bold"); doc.setFontSize(5); doc.setTextColor(15, 23, 42); // [Funcionamento]: Configura fonte pequena e escura.
      doc.text(item.label, ponteiroLegendaX + 4, graficoY + 33); // [Funcionamento]: Escreve o nome do naipe ao lado de sua respectiva cor.
      ponteiroLegendaX += 34; // [Funcionamento]: Desloca horizontalmente para apoiar o próximo item de forma milimétrica e reta.
    });

    // --- GRÁFICO 2: PAINEL DE ASSIDUIDADE ISOLADO DAS ORGANISTAS (EIXO Y +20%, LABELS PRETOS E LEGENDA BASE) ---
    graficoY += 38; // [Funcionamento]: Expandido de 34 para 38mm para abrigar a legenda superior sem sobreposições feias no papel.
    doc.setFont("times", "bold"); doc.setFontSize(7.5); doc.setTextColor(15, 23, 42); // [Funcionamento]: Configura título em negrito.
    doc.text("ORGANISTAS", margin, graficoY); // [Funcionamento]: Imprime o cabeçalho mestre do órgão eletrônico.
    graficoY += 3.5; // [Funcionamento]: Avança ponteiro vertical.

    let picoOrganistasAno = 0; // [Funcionamento]: Rastreador de pico das organistas.
    dadosMensaisPorNaipeGraficos["ORGANISTAS"].forEach(pct => {
      picoOrganistasAno = Math.max(picoOrganistasAno, pct); // [Funcionamento]: Coleta a maior porcentagem interna das irmãs no ano.
    });
    const tetoCalculadoY2 = Math.min(100, Math.max(10, picoOrganistasAno * 1.2)); // [Funcionamento]: Aplica os 20% de respiro móvel na escala do órgão.

    doc.setDrawColor(226, 232, 240); // [Funcionamento]: Define cor cinza claro das linhas.
    doc.line(margin + 12, graficoY, pageWidth - margin, graficoY); // [Funcionamento]: Desenha teto dinâmico das irmãs.
    doc.line(margin + 12, graficoY + 15, pageWidth - margin, graficoY + 15); // [Funcionamento]: Desenha linha base 0% (escala compacta de 15mm).
    
    doc.setFont("times", "normal"); doc.setFontSize(5); doc.setTextColor(148, 163, 184); // [Funcionamento]: Configura escala lateral cinza.
    doc.text(`${tetoCalculadoY2.toFixed(0)}%`, margin + 3, graficoY + 1); // [Funcionamento]: Rótulo do teto balizado das organistas.
    doc.text("0%", margin + 3, graficoY + 16); // [Funcionamento]: Rótulo do chão base.

    doc.setFillColor(139, 92, 246); // [Funcionamento]: Tom Roxo Litúrgico Clássico.
    doc.moveTo(margin + 12, graficoY + 15); // [Funcionamento]: Âncora o ponto inicial inferior esquerdo.
    
    dadosMensaisPorNaipeGraficos["ORGANISTAS"].forEach((percentualOrganistas, idxMes) => {
      const posX = margin + 12 + (idxMes * larguraEixoX); // [Funcionamento]: Posição horizontal do mês.
      const posY = graficoY + 15 - ((percentualOrganistas / tetoCalculadoY2) * 15); // [Funcionamento]: Converte na proporção balanceada de 15mm.
      doc.lineTo(posX, posY); // [Funcionamento]: Desenha a curva roxa.
    });
    
    for (let idxMes = 11; idxMes >= 0; idxMes--) {
      const posX = margin + 12 + (idxMes * larguraEixoX); // [Funcionamento]: Retorna de Dezembro até Janeiro rente à base.
      doc.lineTo(posX, graficoY + 15); // [Funcionamento]: Fecha o fundo do polígono das organistas.
    }
    doc.fill(); // [Funcionamento]: Pinta a área interna isolada do órgão eletrônico.

    doc.setFont("times", "bold"); doc.setFontSize(4.8); doc.setTextColor(15, 23, 42); // [Funcionamento]: Ativa fonte preta ardósia.
    dadosMensaisPorNaipeGraficos["ORGANISTAS"].forEach((pctReal, idxMes) => {
      if (mesesComChamadaNominalRealizada[idxMes] === true && pctReal > 0) {
        const posX = margin + 12 + (idxMes * larguraEixoX); // [Funcionamento]: Posição centralizada horizontal do mês.
        const posYCentralRoxa = graficoY + 15 - (((pctReal / 2) / tetoCalculadoY2) * 15) + 0.6; // [Funcionamento]: Centraliza no miolo da onda roxa.
        doc.text(`${pctReal.toFixed(0)}%`, posX, posYCentralRoxa, { align: "center" }); // [Funcionamento]: Imprime apenas o número percentual limpo centralizado no corpo.
      }
    });

    doc.setFont("times", "normal"); doc.setFontSize(5); doc.setTextColor(15, 23, 42); // [Funcionamento]: Configura texto final dos meses.
    mesesIniciais.forEach((letra, idx) => { doc.text(letra, margin + 12 + (idx * larguraEixoX), graficoY + 18.5, { align: "center" }); }); // [Funcionamento]: Desenha JAN, FEV... no eixo X inferior.

    // [Funcionamento]: Desenha o bloco indexador na base das organistas para espelhar o padrão.
    doc.setFillColor(139, 92, 246); // [Funcionamento]: Carrega a cor roxa eclesiástica.
    doc.rect(margin + 12, graficoY + 21.5, 3, 2, 'F'); // [Funcionamento]: Desenha o quadradinho colorido da legenda.
    doc.setFont("times", "bold"); doc.setFontSize(5); doc.setTextColor(15, 23, 42); // [Funcionamento]: Configura fonte pequena escura.
    doc.text("ORGANISTAS", margin + 16, graficoY + 23); // [Funcionamento]: Escreve a legenda de identificação na base livre.

    // 9. CARIMBO DO SISTEMA E MARCA D'ÁGUA DE RODAPÉ SOBERANO
    doc.setFontSize(5.5); doc.setFont("times", "italic"); doc.setTextColor(148, 163, 184); // [Funcionamento]: Tom cinza marca d'água de fechamento mestre de folha.
    doc.text(`Relatório de Frequência Histórica Anual • Secretaria de Música ${regionalNome} • Emissão Digital Automática`, pageWidth / 2, pageHeight - 4, { align: "center" }); // [Funcionamento]: Imprime carimbo soberano de rodapé.

    // 10. DISPARO E SALVAMENTO DEFINITIVO DO ARQUIVO PDF RETRATO
    doc.save(`${anoVigente} - Relatório Anual Frequência - ENSAIO LOCAL ${localidadePura.toUpperCase()}.pdf`); // [Funcionamento]: Dispara o download definitivo do documento binário para o dispositivo.
  }
};