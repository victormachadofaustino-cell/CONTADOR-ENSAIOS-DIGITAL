import jsPDF from "jspdf"; // Importa a biblioteca principal para gerar arquivos PDF
import autoTable from "jspdf-autotable"; // Importa o complemento para criar tabelas automáticas no PDF
import QRCode from "qrcode"; // Importa a biblioteca para converter textos/links em imagens de QR Code

// Função que deixa apenas a primeira letra de cada palavra maiúscula (Ex: SILAS -> Silas)
export const toTitleCase = (str) => {
  if (!str) return ""; // Se não houver texto, retorna vazio para não quebrar o código
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "); // Transforma em minúsculo e aumenta a primeira letra
};

export const pdfEventService = {
  /**
   * Gera o PDF da Ata de Ensaio Local
   * v5.7 - Protocolo de Individualidade por Registro e Ordenação Hierárquica.
   */
  generateAtaEnsaio: async (
    stats,
    ataData,
    userData,
    counts,
    comumFullData,
    instrumentsConfig = [],
  ) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    }); // Cria o documento PDF em pé, usando milímetros e tamanho A4
    const pageWidth = doc.internal.pageSize.width; // Descobre qual é a largura total da folha
    const pageHeight = doc.internal.pageSize.height; // Descobre qual é a altura total da folha
    const margin = 10; // Define uma margem de segurança de 10 milímetros
    const rightColX = pageWidth / 2 + 2; // Define o ponto de partida da coluna da direita (metade da página + respiro)

    let qrImageData = null; // Variável que guardará a imagem do QR Code gerado

    // Função que transforma o número do dia da semana no nome abreviado (Ex: 0 vira Dom)
    const translateDay = (dayNum) => {
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]; // Lista de dias disponíveis
      return days[dayNum] || ""; // Retorna o dia correspondente ou nada se estiver fora da lista
    };

    // 1. TRATAMENTO DE IDENTIDADE E DATAS
    const localidadePura =
      comumFullData?.comum ||
      ataData?.comumNome ||
      userData?.comum ||
      "Localidade"; // Pega o nome da igreja de origem
    const comumNomeFormatado = toTitleCase(localidadePura); // Formata o nome para ficar visualmente agradável

    let cidadeRaw =
      comumFullData?.cidadeNome ||
      ataData?.cidadeNome ||
      userData?.cidadeNome ||
      "Jundiaí"; // Busca o nome da cidade no banco
    if (cidadeRaw === "N6xKnEAxY3Ku2FOez55K") cidadeRaw = "JUNDIAÍ"; // Correção técnica para códigos antigos de cidade
    const cidadeNome = toTitleCase(cidadeRaw); // Formata o nome da cidade

    const regionalNome = `Regional ${toTitleCase(userData?.activeRegionalName || userData?.regional || "Jundiaí")}`; // Monta o texto da Regional

    const rawDate = ataData?.date || counts?.date || "2026-01-01"; // Pega a data gravada no ensaio
    const dateParts = rawDate.split("-"); // Divide a data onde tem traços (ano-mes-dia)
    const dataFormatada = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // Monta no formato brasileiro (dia/mes/ano)

    // LÓGICA PARA HORÁRIO DO CULTO (Muda se for domingo para atender horários especiais)
    const dataObjeto = new Date(rawDate + "T12:00:00"); // Cria um objeto de data seguro
    const isDomingo = dataObjeto.getDay() === 0; // Verifica se o dia da semana é Domingo (0)
    const horaCultoExibir = isDomingo
      ? comumFullData?.horaCultoDomingo || comumFullData?.horaCulto || "---" // Se for domingo, tenta pegar o horário de domingo
      : comumFullData?.horaCulto || "---"; // Se não for, pega o horário de semana

    // 1.1 GERAÇÃO DO QR CODE COM O LINK DO MAPS
    const rua = toTitleCase(comumFullData?.endereco?.rua || ""); // Formata o nome da rua
    const num = comumFullData?.endereco?.numero || ""; // Pega o número da igreja
    const bairro = toTitleCase(comumFullData?.endereco?.bairro || ""); // Formata o bairro
    const mapsUrl = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(`${rua}, ${num} - ${bairro} ${cidadeNome} CCB`)}`; // Cria o link de localização

    try {
      qrImageData = await QRCode.toDataURL(mapsUrl, { margin: 1, width: 120 }); // Transforma o link em imagem QR Code
    } catch (e) {
      console.error("Falha ao gerar QR:", e); // Se der erro, avisa no sistema mas continua gerando o PDF
    }

    // 2. CABEÇALHO DO DOCUMENTO
    doc.setFont("times", "bold"); // Define fonte Times New Roman com Negrito
    doc.setFontSize(14); // Define tamanho de letra 14 para o título
    doc.text("Relatório do Serviço de Ensaio Local", pageWidth / 2, 15, {
      align: "center",
    }); // Escreve o título centralizado
    doc.setFontSize(12); // Diminui para tamanho 12
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 21, {
      align: "center",
    }); // Escreve o nome da CCB
    doc.setFont("times", "normal"); // Muda para fonte normal (sem negrito)
    doc.setFontSize(10); // Tamanho 10
    doc.text(`${comumNomeFormatado} - ${cidadeNome}`, pageWidth / 2, 27, {
      align: "center",
    }); // Escreve a Comum e Cidade
    doc.text(regionalNome, pageWidth / 2, 32, { align: "center" }); // Escreve a Regional
    doc.setFontSize(9); // Tamanho 9
    doc.setFont("times", "bold"); // Volta para Negrito para destacar a data
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, {
      align: "right",
    }); // Escreve a data no canto direito
    doc.line(margin, 39, pageWidth - margin, 39); // Desenha uma linha preta separadora

    // 3. TABELA DE INSTRUMENTOS DA ORQUESTRA (AGRUPADA POR FAMÍLIA E ORDENADA)
    const sectionsOrder = [
      "CORDAS",
      "MADEIRAS",
      "SAXOFONES",
      "METAIS",
      "TECLAS",
      "GERAL",
    ];
    const instrumentsBySection = {};

    const allInstrumentKeys = Object.keys(counts || {}).filter(
      (key) =>
        !key.startsWith("meta_") &&
        !["orgao", "irmandade", "coral", "date"].includes(key.toLowerCase()),
    );

    allInstrumentKeys.forEach((key) => {
      const instrument = counts[key] || {};
      const section = (instrument.section || "GERAL").toUpperCase();
      if (!instrumentsBySection[section]) {
        instrumentsBySection[section] = [];
      }
      instrumentsBySection[section].push({ key, ...instrument });
    });

    const orqBody = [];
    const allOrqRowsForTotal = [];

    sectionsOrder.forEach((sectionName) => {
      const instruments = instrumentsBySection[sectionName];
      if (!instruments || instruments.length === 0) return;

      // Ordena os instrumentos pela ordem customizada e depois alfabeticamente
      instruments.sort((a, b) => {
        const configA = instrumentsConfig.find((i) => i.id === a.key);
        const configB = instrumentsConfig.find((i) => i.id === b.key);
        const orderA = configA ? parseInt(configA.ordem, 10) : 999;
        const orderB = configB ? parseInt(configB.ordem, 10) : 999;

        if (orderA !== 999 && orderB !== 999 && orderA !== orderB) {
          return orderA - orderB;
        }

        const nameA =
          a.name ||
          (a.key.startsWith("extra_")
            ? a.key
                .substring("extra_".length, a.key.lastIndexOf("_"))
                .toUpperCase()
            : a.key.toUpperCase());
        const nameB =
          b.name ||
          (b.key.startsWith("extra_")
            ? b.key
                .substring("extra_".length, b.key.lastIndexOf("_"))
                .toUpperCase()
            : b.key.toUpperCase());
        return nameA.localeCompare(nameB);
      });

      // Adiciona o cabeçalho da seção
      orqBody.push([
        {
          content: sectionName,
          colSpan: 4,
          styles: {
            halign: "left",
            fontStyle: "bold",
            fillColor: [230, 230, 230],
            textColor: 0,
            fontSize: 7,
            cellPadding: 1,
          },
        },
      ]);

      instruments.forEach((inst) => {
        const total = Number(inst.total) || 0;
        const comum = Number(inst.comum) || 0;
        const name =
          inst.name ||
          (inst.key.startsWith("extra_")
            ? inst.key
                .substring("extra_".length, inst.key.lastIndexOf("_"))
                .toUpperCase()
            : inst.key.replace(/_/g, " ").toUpperCase());
        const row = [name, comum, Math.max(0, total - comum), total];
        orqBody.push(row);
        allOrqRowsForTotal.push(row);
      });
    });

    const totalComum = allOrqRowsForTotal.reduce((sum, row) => sum + row[1], 0);
    const totalVisitas = allOrqRowsForTotal.reduce(
      (sum, row) => sum + row[2],
      0,
    );
    const totalGeral = allOrqRowsForTotal.reduce((sum, row) => sum + row[3], 0);

    orqBody.push([
      {
        content: "TOTAL ORQUESTRA",
        colSpan: 1,
        styles: { fontStyle: "bold", halign: "left" },
      },
      { content: totalComum, styles: { fontStyle: "bold" } },
      { content: totalVisitas, styles: { fontStyle: "bold" } },
      { content: totalGeral, styles: { fontStyle: "bold" } },
    ]);

    const headStyles = {
      fillColor: [40, 40, 40],
      textColor: 255,
      halign: "center",
    };

    autoTable(doc, {
      startY: 42,
      margin: { right: pageWidth / 2 + 2 },
      head: [["INSTRUMENTOS", "COMUM", "VISITAS", "TOTAL"]],
      body: orqBody,
      theme: "grid", // Estilo de grade
      styles: {
        fontSize: 6.5,
        cellPadding: 0.8,
        font: "times",
        halign: "center",
      },
      headStyles: headStyles,
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        3: { fillColor: [240, 240, 240] },
      },
      didParseCell: (data) => {
        if (data.row.raw.length === 1 && typeof data.row.raw[0] === "object") {
          data.cell.styles.cellPadding = 1;
        }
        if (data.row.raw[0]?.content === "TOTAL ORQUESTRA") {
          // CORREÇÃO: Aplica o estilo a cada célula da linha para evitar o erro 'Cannot set properties of undefined'.
          data.cell.styles.fillColor = [40, 40, 40];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      margin: { right: pageWidth / 2 + 2 },
      head: [["ORGANISTAS", "COMUM", "VISITAS", "TOTAL"]],
      body: [
        [
          "ÓRGÃO",
          Number(counts?.orgao?.comum) || 0,
          Math.max(0, stats.organistas - (counts?.orgao?.comum || 0)),
          stats.organistas,
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 6.5,
        font: "times",
        halign: "center",
        cellPadding: 0.8,
      },
      headStyles: headStyles,
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      margin: { right: pageWidth / 2 + 2 },
      head: [["CORAL", "IRMÃOS", "IRMÃS", "TOTAL"]],
      body: [["IRMANDADE", stats.irmaos, stats.irmas, stats.irmandade]],
      theme: "grid",
      styles: {
        fontSize: 6.5,
        font: "times",
        halign: "center",
        cellPadding: 0.8,
      },
      headStyles: headStyles,
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });

    // 4. BLOCO DE TOTAIS GERAIS
    let totalsY = doc.lastAutoTable.finalY + 8; // Define a altura com base na última tabela
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text(
      `MÚSICOS: ${stats.musicos} | ORGANISTAS: ${stats.organistas} | CORAL: ${stats.irmandade}`,
      margin,
      totalsY,
    ); // Mostra o resumo das categorias
    totalsY += 5;
    doc.setFont("times", "bold"); // Negrito para destaque
    doc.text(
      `TOTAL ORQUESTRA: ${stats.musicos + stats.organistas}`,
      margin,
      totalsY,
    ); // Soma músicos e organistas
    totalsY += 6;
    doc.setFontSize(10);
    doc.text(`TOTAL GERAL DE PRESENTES: ${stats.geral}`, margin, totalsY); // Soma total de toda irmandade

    // 4.2 DESENHO DO RESUMO MINISTERIAL
    const ministerioCounts = {
      Ancião: 0,
      Diácono: 0,
      "Cooperador do Ofício": 0,
      "Cooperador RJM": 0,
      "Encarregado Regional": 0,
      "Encarregado Local": 0,
      Examinadora: 0,
    };
    const allMinisterio = [
      ...(ataData?.presencaLocalFull || []),
      ...(ataData?.visitantes || []),
    ];
    allMinisterio.forEach((p) => {
      const cargo = p.role || p.min;
      if (ministerioCounts.hasOwnProperty(cargo)) {
        ministerioCounts[cargo]++;
      }
    });

    let minSummaryY = totalsY - 11; // Alinha com o resumo da orquestra
    doc.setFont("times", "bold");
    doc.setFontSize(7);
    const minCol1X = rightColX;
    const minCol2X = rightColX + 45;

    const drawMinLine = (label, value, x, y) => {
      doc.setFont("times", "normal");
      doc.text(label, x, y);
      doc.setFont("times", "bold");
      doc.text(`[ ${value} ]`, x + 30, y, { align: "right" });
    };

    drawMinLine("Anciãos:", ministerioCounts["Ancião"], minCol1X, minSummaryY);
    drawMinLine(
      "Enc. Regionais:",
      ministerioCounts["Encarregado Regional"],
      minCol2X,
      minSummaryY,
    );
    minSummaryY += 4;
    drawMinLine(
      "Diáconos:",
      ministerioCounts["Diácono"],
      minCol1X,
      minSummaryY,
    );
    drawMinLine(
      "Enc. Locais:",
      ministerioCounts["Encarregado Local"],
      minCol2X,
      minSummaryY,
    );
    minSummaryY += 4;
    drawMinLine(
      "Coop. Ofício:",
      ministerioCounts["Cooperador do Ofício"],
      minCol1X,
      minSummaryY,
    );
    drawMinLine(
      "Examinadoras:",
      ministerioCounts["Examinadora"],
      minCol2X,
      minSummaryY,
    );
    minSummaryY += 4;
    drawMinLine(
      "Coop. RJM:",
      ministerioCounts["Cooperador RJM"],
      minCol1X,
      minSummaryY,
    );

    // 5. COLUNA DA DIREITA (Atendimento e Regência)
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("ATENDIMENTO", rightColX, 45); // Título atendimento
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text(
      `Nome: ${toTitleCase(ataData?.atendimentoNome) || "---"}`,
      rightColX,
      50,
    ); // Nome de quem atendeu
    doc.text(
      `Ministério: ${toTitleCase(ataData?.atendimentoMin) || "---"}`,
      rightColX,
      54,
    ); // Cargo de quem atendeu

    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("HINOS TOCADOS", rightColX, 62); // Título hinos
    const todosHinos = (ataData?.partes || [])
      .flatMap((p) => p.hinos || [])
      .filter((h) => h && h.trim() !== ""); // Junta todos os hinos do ensaio
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    const hinosTxt = doc.splitTextToSize(todosHinos.join(" - ") || "---", 85); // Quebra o texto dos hinos para não sair da folha
    doc.text(hinosTxt, rightColX, 67); // Escreve a lista de hinos
    const posHinosY = 67 + hinosTxt.length * 4;
    doc.setFont("times", "bold");
    doc.text(`TOTAL DE HINOS: ${todosHinos.length}`, rightColX, posHinosY); // Mostra a contagem total de hinos

    // 6. ESTATÍSTICA MOO (EQUILÍBRIO NAIPES)
    const mooY = posHinosY + 10; // Define a altura
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("ESTATÍSTICA REF. MOO", rightColX, mooY); // Título MOO
    const totalM = Math.max(1, stats.musicos); // Evita divisão por zero
    const mooNaipes = [
      // Configura as metas de cada naipe
      { label: "Cordas", val: stats.cordas, ref: 50, color: [217, 119, 6] },
      {
        label: "Madeiras*",
        val: stats.madeiras + stats.saxofones,
        ref: 25,
        color: [5, 150, 105],
      },
      { label: "Metais", val: stats.metais, ref: 25, color: [220, 38, 38] },
    ];
    mooNaipes.forEach((n, i) => {
      // Cria as barras de porcentagem uma abaixo da outra
      const rowY = mooY + 6 + i * 12;
      const percReal = (n.val / totalM) * 100;
      doc.setFontSize(7);
      doc.setFont("times", "bold");
      doc.text(
        `${n.label.toUpperCase()} [${n.val}/${totalM}]`,
        rightColX,
        rowY,
      ); // Nome do naipe e quantidades
      doc.setFont("times", "normal");
      doc.text(
        `${percReal.toFixed(0)}% / Meta ${n.ref}%`,
        pageWidth - margin,
        rowY,
        { align: "right" },
      ); // Porcentagem e meta
      doc.setFillColor(245, 245, 245);
      doc.rect(rightColX, rowY + 2, 85, 3, "F"); // Desenha fundo da barra (cinza)
      doc.setFillColor(n.color[0], n.color[1], n.color[2]); // Escolhe a cor do naipe
      doc.rect(
        rightColX,
        rowY + 2,
        Math.min(85, (percReal / 100) * 85),
        3,
        "F",
      ); // Desenha o preenchimento da barra
    });

    const finalMooY = mooY + mooNaipes.length * 12 + 2;
    doc.setFontSize(6.5);
    doc.setFont("times", "italic");
    doc.text(
      "* Nota: A seção de Madeiras contempla a família dos Saxofones.",
      rightColX,
      finalMooY + 4,
    ); // Observação técnica

    // 7. BLOCO DE OCORRÊNCIAS DO ENSAIO
    const rawOcorrencias = ataData?.ocorrencias || []; // Pega as anotações do ensaio
    const listaFinalOcorr = []; // Lista limpa de textos
    const mapA = {}; // Mapa para agrupar apresentações de novos músicos
    rawOcorrencias.forEach((o) => {
      if (o.tipo === "A" && o.instrumento && o.etapa) {
        // Se for tipo Apresentação, agrupa por instrumento/etapa
        const key = `${o.instrumento}|${o.etapa}`;
        if (!mapA[key]) mapA[key] = [];
        mapA[key].push(o.nome);
      } else {
        listaFinalOcorr.push(o.texto); // Se for aviso comum, apenas adiciona o texto
      }
    });
    Object.entries(mapA).forEach(([key, nomes]) => {
      // Transforma o agrupamento em frases automáticas
      const [inst, etapa] = key.split("|");
      const frase = `${nomes.length > 1 ? "Apresentados" : "Apresentado(a)"} neste ensaio ${nomes.length > 1 ? "os irmãos" : "o(a) irmão(ã)"} ${nomes.join(" e ")}, executando o instrumento ${inst}, na etapa de ${etapa}, a partir desta data.`;
      listaFinalOcorr.push(frase);
    });

    let lastRightColY = finalMooY + 8;
    if (listaFinalOcorr.length > 0) {
      // Se existirem avisos, desenha no PDF
      const ocorrenciasY = finalMooY + 14;
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.text("OCORRÊNCIAS DO ENSAIO", rightColX, ocorrenciasY);
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      let currentOcorrY = ocorrenciasY + 5;
      listaFinalOcorr.forEach((txt) => {
        const lines = doc.splitTextToSize(`• ${txt}`, 85); // Quebra o texto do aviso
        doc.text(lines, rightColX, currentOcorrY); // Escreve o aviso com um ponto na frente
        currentOcorrY += lines.length * 3.5 + 1; // Pula linha proporcional ao texto
      });
      lastRightColY = currentOcorrY;
    }

    // 8. TABELA MINISTERIAL (INDIVIDUALIDADE POR REGISTRO E ORDENAÇÃO)
    // Define a ordem de prioridade dos cargos
    const pesos = {
      Ancião: 1,
      Diácono: 2,
      "Cooperador do Ofício": 3,
      "Cooperador RJM": 4,
      "Encarregado Regional": 5,
      Examinadora: 6,
      "Encarregado Local": 7,
      "Secretário da Música": 8,
      Instrutor: 9,
      Músico: 10,
    };

    // Prepara os dados da casa (Local) individualmente
    const localRows = (ataData?.presencaLocalFull || []).map((p) => ({
      cargo: p.role,
      nome: toTitleCase(p.nome),
      comum: comumNomeFormatado,
      cidade: cidadeNome,
      data: "---",
      hora: "---",
      peso: pesos[p.role] || 99,
    }));

    // Prepara os dados dos visitantes individualmente
    const visitorRows = (ataData?.visitantes || []).map((v) => ({
      cargo: v.min,
      nome: toTitleCase(v.nome),
      comum: toTitleCase(v.bairro || v.comum),
      cidade: toTitleCase(v.cidadeUf),
      data: v.dataEnsaio || "---",
      hora: v.hora || "---",
      peso: pesos[v.min] || 99,
    }));

    // Aplica a ordenação: Primeiro pelo peso do cargo, depois pelo nome em ordem alfabética
    localRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));
    visitorRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));

    const finalMinBody = []; // Corpo final da tabela ministerial
    if (localRows.length > 0) {
      finalMinBody.push([
        {
          content: "LOCAL",
          colSpan: 6,
          styles: {
            fillColor: [245, 245, 245],
            fontStyle: "bold",
            halign: "left",
          },
        },
      ]); // Título da seção Local
      localRows.forEach((r) =>
        finalMinBody.push([r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora]),
      ); // Cada irmão é uma linha única
    }
    if (visitorRows.length > 0) {
      finalMinBody.push([
        {
          content: "VISITAS",
          colSpan: 6,
          styles: {
            fillColor: [245, 245, 245],
            fontStyle: "bold",
            halign: "left",
          },
        },
      ]); // Título da seção Visitas
      visitorRows.forEach((r) =>
        finalMinBody.push([r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora]),
      ); // Cada visita é uma linha única (impede agrupamento por nome igual)
    }

    autoTable(doc, {
      // Desenha a tabela ministerial final no PDF
      startY: Math.max(
        totalsY + 12,
        doc.lastAutoTable.finalY + 12,
        lastRightColY + 8,
      ), // Escolhe a posição mais baixa livre
      head: [
        [
          "MINISTÉRIO",
          "NOME",
          "COMUM/BAIRRO",
          "CIDADE/UF",
          "DATA ENS.",
          "HORA",
        ],
      ], // Cabeçalhos mantidos
      body: finalMinBody, // Conteúdo organizado individualmente
      theme: "grid",
      styles: { fontSize: 6, font: "times", cellPadding: 1, halign: "center" },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      columnStyles: { 1: { halign: "left", fontStyle: "bold" } }, // Destaca o nome do irmão em Negrito
      margin: { bottom: 35 },
      didDrawPage: (data) => {
        // RODAPÉ DA PÁGINA (Com endereço da igreja e QR Code)
        const footerY = pageHeight - 18;
        if (qrImageData) {
          doc.addImage(qrImageData, "PNG", margin + 2, footerY - 5, 12, 12); // Desenha o QR Code
        }
        doc.setFontSize(7);
        doc.setFont("times", "bold");
        doc.text(comumNomeFormatado.toUpperCase(), margin + 17, footerY - 2); // Nome da Comum em destaque
        doc.setFontSize(6.5);
        doc.setFont("times", "normal");
        doc.text(
          `${rua}, ${num} - ${bairro} • ${cidadeNome}`,
          margin + 17,
          footerY + 1,
        ); // Endereço físico
        doc.text(
          `Culto: ${comumFullData?.diasSelecao?.map((d) => translateDay(d)).join(" e ") || "---"} às ${horaCultoExibir} | Ensaio Local: ${comumFullData?.ensaioLocal || "---"} às ${comumFullData?.horaEnsaio || "---"}`,
          margin + 17,
          footerY + 4,
        ); // Dias de culto
        doc.setFontSize(6.5);
        doc.text(
          `Secretaria de Música ${regionalNome} • Sistema de Gestão Digital`,
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" },
        ); // Identificação do sistema
      },
    });

    // Finaliza o processo e baixa o arquivo com o nome da igreja e data
    doc.save(
      `${dateParts[0]}-${dateParts[1]}-${dateParts[2]} - Ata ${localidadePura.toUpperCase()} - Ensaio Local.pdf`,
    );
  },

  generateVisitsReport: async (visitors, ataData, comumFullData) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;

    // 1. CABEÇALHO
    // CORREÇÃO: Prioriza o dado vivo de 'comumFullData' como fonte única da verdade para o nome da comum e da cidade,
    // evitando o uso de dados históricos potencialmente desatualizados de 'ataData'.
    const localidadePura = comumFullData?.comum ||;
    const cidadeNome = comumFullData?.cidadeNome ||;
    const title = `Relatório de Visitas [${toTitleCase(
      localidadePura,
    )} - ${toTitleCase(cidadeNome)}]`;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.text(
      `Período de Análise: ${new Date().getFullYear()}`,
      pageWidth / 2,
      21,
      { align: "center" },
    );
    doc.line(margin, 25, pageWidth - margin, 25);

    // 2. PREPARAR E ORDENAR DADOS
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    const sortedVisitors = [...visitors].sort((a, b) => {
      const dateA = new Date(`${a.eventDate}T00:00:00`);
      const dateB = new Date(`${b.eventDate}T00:00:00`);
      const monthA = dateA.getMonth();
      const monthB = dateB.getMonth();
      if (monthA !== monthB) {
        return monthA - monthB;
      }
      return (a.nome || "").localeCompare(b.nome || "");
    });

    // 3. TABELA DE VISITANTES
    const head = [
      [
        "Mês Registro",
        "Nome",
        "Contato",
        "Instrumento",
        "Ministério",
        "Comum",
        "Cidade/UF",
        "Data Ensaio Local",
        "Hora",
        "Visita Paga",
      ],
    ];

    const body = sortedVisitors.map((v) => {
      const eventDate = v.eventDate
        ? new Date(`${v.eventDate}T00:00:00`)
        : null;
      const monthName = eventDate ? monthNames[eventDate.getMonth()] : "N/I";
      return [
        monthName,
        toTitleCase(v.nome),
        v.contato || "---",
        v.inst || "---",
        v.min || "---",
        toTitleCase(v.bairro || "---"),
        v.cidadeUf || "---",
        v.dataEnsaio || "---",
        v.hora || "---",
        "", // Coluna vazia para "Visita Paga"
      ];
    });

    let lastMonth = "";
    let isGray = false;

    autoTable(doc, {
      startY: 30,
      head: head,
      body: body,
      theme: "grid",
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        halign: "center",
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        font: "times",
        cellPadding: 1.5,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: 45 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25 },
        7: { cellWidth: 20, halign: "center" },
        8: { cellWidth: 15, halign: "center" },
        9: { cellWidth: 20 }, // Coluna "Visita Paga"
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const currentMonth = data.row.raw[0];
          if (currentMonth !== lastMonth) {
            lastMonth = String(currentMonth);
            isGray = !isGray;
          }
          if (isGray) {
            data.cell.styles.fillColor = [245, 245, 245];
          }
        }
      },
    });

    // 4. TOTALIZADOR MENSAL
    const monthlyCounts = Array(12).fill(0);
    visitors.forEach((v) => {
      if (v.eventDate) {
        const monthIndex = new Date(`${v.eventDate}T00:00:00`).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyCounts[monthIndex]++;
        }
      }
    });

    let summaryY = doc.lastAutoTable.finalY + 10;

    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text("Total de Visitas por Mês de Registro:", margin, summaryY);
    summaryY += 7;

    doc.setFont("times", "normal");
    doc.setFontSize(9);

    const col1X = margin + 5;
    const col2X = pageWidth / 2 + 5;

    for (let i = 0; i < 6; i++) {
      const month1 = monthNames[i];
      const count1 = monthlyCounts[i];
      doc.text(
        `${month1.toUpperCase()}: ${count1} visita(s)`,
        col1X,
        summaryY + i * 5,
      );

      const month2 = monthNames[i + 6];
      const count2 = monthlyCounts[i + 6];
      doc.text(
        `${month2.toUpperCase()}: ${count2} visita(s)`,
        col2X,
        summaryY + i * 5,
      );
    }

    // 5. RODAPÉ
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.height - 5,
        { align: "right" },
      );
      doc.text(
        `Relatório de Visitas - Sistema de Gestão Digital © ${new Date().getFullYear()}`,
        margin,
        doc.internal.pageSize.height - 5,
      );
    }

    // 6. SALVAR
    doc.save(
      `Relatorio_Visitantes_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  },
};
