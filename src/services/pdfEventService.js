import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const pdfEventService = {
  generateAtaEnsaio: (stats, ataData, userData, counts) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;

    // 1. DEFINIÇÃO DE IDENTIDADE (Prioriza o nome gravado no evento após o 'save')
    const nomeComum = (ataData?.comumNome || userData?.comum || "PONTE SÃO JOÃO").toUpperCase();
    const nomeCidade = (userData?.cidade || "JUNDIAÍ").toUpperCase();
    const regional = (userData?.activeRegionalName || "JUNDIAÍ").toUpperCase();
    
    // 2. TRATAMENTO DE DATAS (Data do ensaio rHdOZybAQjfTMGez6JNA -> 2026-01-17)
    const dataRef = ataData?.date || "2026-01-17"; 
    const [ano, mes, dia] = dataRef.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const dataISO = `${ano}-${mes}-${dia}`;

    // --- 3. CABEÇALHO ---
    try {
      // AJUSTE DEFINITIVO DO LOGO: Dimensões de 18mm x 28mm para manter a proporção vertical oficial sem achatar
      doc.addImage('/assets/Logo_oficial_CCB.png', 'PNG', margin, 8, 48, 26);
    } catch (e) { console.warn("Logo não encontrada"); }

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`Ensaio Local ${nomeComum} - ${nomeCidade}`, pageWidth / 2, 22, { align: "center" });
    doc.text(`REGIONAL ${regional}`, pageWidth / 2, 28, { align: "center" });

    // Data no lado direito conforme solicitado
    doc.setFontSize(10);
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, { align: "right" });
    doc.line(margin, 39, pageWidth - margin, 39);

    // --- 4. COLUNA ESQUERDA: INSTRUMENTOS E ORGANISTAS ---
    const instrumentOrder = [
      { n: '01', name: 'VIOLINO', key: 'violino' },
      { n: '02', name: 'VIOLA', key: 'viola' },
      { n: '03', name: 'VIOLONCELO', key: 'violoncelo' },
      { n: '04', name: 'FLAUTA', key: 'flauta' },
      { n: '05', name: 'OBOÉ', key: 'oboe' },
      { n: '06', name: 'FAGOTE', key: 'fagote' },
      { n: '07', name: 'CLARINETE', key: 'clarinete' },
      { n: '08', name: 'CLARONE ALTO', key: 'claronealto' },
      { n: '09', name: 'CLARONE BAIXO', key: 'claronebaixo' },
      { n: '11', name: 'SAX SOPRANO', key: 'saxsoprano' },
      { n: '12', name: 'SAX ALTO', key: 'saxalto' },
      { n: '13', name: 'SAX TENOR', key: 'saxtenor' },
      { n: '14', name: 'SAX BARÍTONO', key: 'saxbaritono' },
      { n: '16', name: 'TROMPETE', key: 'trompete' },
      { n: '17', name: 'FLUGELHORN', key: 'flugel' },
      { n: '18', name: 'TROMPA', key: 'trompa' },
      { n: '19', name: 'TROMBONE', key: 'trombone' },
      { n: '20', name: 'EUFÔNIO', key: 'eufonio' },
      { n: '21', name: 'TUBA', key: 'tuba' },
      { n: '22', name: 'ACORDEON', key: 'acordeon' }
    ];

    const instRows = instrumentOrder.map(inst => {
      const d = counts?.[inst.key] || { total: 0, comum: 0 };
      const total = Number(d.total) || 0;
      const comum = Number(d.comum) || 0;
      return [inst.n, inst.name, comum, Math.max(0, total - comum), total];
    });

    autoTable(doc, {
      startY: 42,
      margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'INSTRUMENTOS', 'COMUM', 'VISITAS', 'TOTAL']],
      body: instRows,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1, font: "times", textColor: 0 },
      headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' }
    });

    // Tabela Organistas logo abaixo
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'ORGANISTAS', 'COMUM', 'VISITAS', 'TOTAL']],
      body: [
        ['27', 'ORGANISTAS', Number(stats.organistas) - (Number(stats.orgVisitas) || 0), Number(stats.orgVisitas) || 0, Number(stats.organistas) || 0],
        ['28', 'EXAMINADORAS', '-', '-', Number(stats.examinadoras) || 0]
      ],
      theme: 'grid',
      styles: { fontSize: 6.5, font: "times", textColor: 0 },
      headStyles: { fillColor: [245, 245, 245], textColor: 0 }
    });

    const colEsquerdaY = doc.lastAutoTable.finalY;

    // --- 5. COLUNA DIREITA: ATENDIMENTO E ANDAMENTO ---
    const rightColX = pageWidth / 2 + 5;

    // Atendimento
    doc.setFontSize(9);
    doc.text("ATENDIMENTO", rightColX, 45);
    autoTable(doc, {
      startY: 47,
      margin: { left: rightColX },
      body: [
        ['NOME:', (ataData?.atendimentoNome || "---").toUpperCase()],
        ['MINISTÉRIO:', (ataData?.atendimentoMin || "---").toUpperCase()]
      ],
      theme: 'plain',
      styles: { fontSize: 7, font: "times", cellPadding: 1 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 20 } }
    });

    // Andamento do Ensaio
    doc.text("ANDAMENTO DO ENSAIO", rightColX, doc.lastAutoTable.finalY + 6);
    const andamentoRows = (ataData?.partes || []).map((p, i) => [
      `Parte ${i + 1}`,
      (p.nome || "---").toUpperCase(),
      (p.hinos?.filter(h => h).join("-") || "---")
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      margin: { left: rightColX },
      head: [['PARTE', 'CONDUTOR', 'HINOS']],
      body: andamentoRows,
      theme: 'grid',
      styles: { fontSize: 7, font: "times" },
      headStyles: { fillColor: [245, 245, 245], textColor: 0 }
    });

    // Equilíbrio Naipes
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      margin: { left: rightColX },
      head: [['NAIPE', 'QTD / %', 'REF. MOO']],
      body: [
        ['CORDAS', `${stats.cordas} (${((stats.cordas / stats.musicos) * 100 || 0).toFixed(0)}%)`, '50%'],
        ['MADEIRAS*', `${stats.madeiras + stats.sax} (${(((stats.madeiras + stats.sax) / stats.musicos) * 100 || 0).toFixed(0)}%)`, '25%'],
        ['METAIS', `${stats.metais} (${((stats.metais / stats.musicos) * 100 || 0).toFixed(0)}%)`, '25%']
      ],
      theme: 'grid',
      styles: { fontSize: 7, font: "times" },
      headStyles: { fillColor: [245, 245, 245], textColor: 0 }
    });

    // --- 6. TOTAIS E MINISTÉRIO ---
    const finalY = Math.max(colEsquerdaY, doc.lastAutoTable.finalY) + 12;
    doc.setFontSize(9);
    doc.text(`TOTAL ORQUESTRA (MÚSICOS + ORGANISTAS): ${Number(stats.musicos) + Number(stats.organistas)}`, margin, finalY);
    doc.text(`TOTAL GERAL (COM IRMANDADE): ${Number(stats.geral)}`, margin, finalY + 5);

    const minRows = [];
    (ataData?.presencaLocalFull || []).forEach(p => minRows.push([p.role?.toUpperCase(), p.nome?.toUpperCase(), 'LOCAL', nomeCidade, dataFormatada]));
    (ataData?.visitantes || []).forEach(v => minRows.push([(v.min || "").toUpperCase(), (v.nome || "").toUpperCase(), (v.comum || "").toUpperCase(), (v.cidadeUf || "").toUpperCase(), `${v.dataEnsaio || ""} ${v.hora || ""}`.toUpperCase()]));

    autoTable(doc, {
      startY: finalY + 10,
      head: [['MINISTÉRIO', 'NOME', 'COMUM', 'CIDADE/UF', 'ENSAIO E HORA']],
      body: minRows,
      theme: 'grid',
      styles: { fontSize: 6, font: "times" },
      headStyles: { fillColor: [245, 245, 245], textColor: 0 }
    });

    // --- 7. RODAPÉ ---
    doc.setFontSize(7);
    doc.text(`Secretaria de Musica Regional ${regional} - Relatório Gerado por: ${userData?.name?.toUpperCase() || "SISTEMA"}`, pageWidth / 2, 285, { align: "center" });

    // EXTRAÇÃO: aaaa-mm-dd - Ata [comum] - Ensaio Local
    doc.save(`${dataISO} - Ata ${nomeComum} - Ensaio Local.pdf`);
  }
};