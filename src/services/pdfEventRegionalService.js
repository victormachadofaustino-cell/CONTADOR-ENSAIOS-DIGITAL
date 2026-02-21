import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const pdfEventRegionalService = {
  /**
   * Gera o PDF da Ata de Ensaio Regional
   * v2.1 - Layout de Duas Colunas Otimizado (Industrial)
   */
  generateAtaRegional: async (stats, ataData, userData, counts, sedeFullData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const rightColX = pageWidth / 2 + 2;

    let qrImageData = null;

    // 1. IDENTIDADE E DATAS
    const sedeNome = toTitleCase(sedeFullData?.comum || ataData?.comumNome || "Sede Regional");
    const cidadeNome = toTitleCase(sedeFullData?.cidadeNome || ataData?.cidadeNome || "Localidade");
    const regionalNomeRaw = userData?.activeRegionalName || userData?.regional || "Regional";
    const regionalNome = `REGIONAL ${regionalNomeRaw.toUpperCase()}`;
    
    const rawDate = ataData?.date || "2026-01-01"; 
    const [ano, mes, dia] = rawDate.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    try {
      const mapsUrl = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(`${sedeNome} CCB ${cidadeNome}`)}`;
      qrImageData = await QRCode.toDataURL(mapsUrl, { margin: 1, width: 100 });
    } catch (e) { console.error(e); }

    // 2. CABEÇALHO
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Relatório do Serviço de Ensaio Regional", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 21, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(`${sedeNome} - ${cidadeNome}`, pageWidth / 2, 27, { align: "center" });
    doc.setFont("times", "bold");
    doc.text(regionalNome, pageWidth / 2, 32, { align: "center" });
    doc.setFontSize(9);
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, { align: "right" });
    doc.line(margin, 39, pageWidth - margin, 39);

    // 3. TABELA DE INSTRUMENTOS (COLUNA ESQUERDA - TODOS INSTRUMENTOS)
    const families = [
      { name: 'CORDAS', keys: ['violino','viola','violoncelo'], total: stats.cordas },
      { name: 'MADEIRAS', keys: ['flauta','oboe','corneingles','fagote','clarinete','claronealto','claronebaixo','saxsoprano','saxalto','saxtenor','saxbaritono'], total: (stats.madeiras + stats.saxofones) },
      { name: 'METAIS', keys: ['trompete','flugelhorn','trompa','trombone','eufonio','tuba'], total: stats.metais },
      { name: 'TECLAS', keys: ['acordeon'], total: stats.teclas }
    ];

    const orqBody = [];
    families.forEach(fam => {
      const instruments = fam.keys.map(k => ({ key: k, data: counts?.[k] }));
      instruments.forEach((inst, idx) => {
        const row = [];
        if (idx === 0) {
          row.push({ content: fam.name, rowSpan: instruments.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [245, 245, 245] } });
        }
        row.push((inst.data?.name || inst.key.replace(/_/g, ' ')).toUpperCase());
        row.push(Number(inst.data?.total) || 0);
        if (idx === 0) {
          row.push({ content: fam.total.toString(), rowSpan: instruments.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [240, 240, 240] } });
        }
        orqBody.push(row);
      });
    });

    autoTable(doc, {
      startY: 42, margin: { right: pageWidth / 2 + 3 },
      head: [['NAIPE', 'INSTRUMENTO', 'QTD', 'TOTAL']],
      body: orqBody,
      theme: 'grid', styles: { fontSize: 6, font: "times", halign: 'center', cellPadding: 0.6 },
      headStyles: { fillColor: [40, 40, 40] },
      columnStyles: { 1: { halign: 'left' }, 2: { fontStyle: 'bold' } }
    });

    // 4. LITURGIA E PARTES (COLUNA DIREITA)
    let rightY = 42;
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("LITURGIA E ATENDIMENTO", rightColX, rightY);
    
    doc.setFont("times", "normal"); doc.setFontSize(8);
    doc.text(`Atendimento: ${toTitleCase(ataData?.atendimentoNome) || "---"} (${ataData?.atendimentoMin || "---"})`, rightColX, rightY + 5);
    doc.text(`Hino de Abertura: ${ataData?.hinoAbertura || "---"}`, rightColX, rightY + 9);
    const pal = ataData?.palavra || {};
    doc.text(`Palavra Lida: ${pal.livro || "---"}, ${pal.capitulo || "0"} : (${pal.verso || "0-0"})`, rightColX, rightY + 13);

    let pY = rightY + 20;
    doc.setFont("times", "bold"); doc.text("DESENVOLVIMENTO DAS PARTES", rightColX, pY);
    doc.setFont("times", "normal");
    let totH = 0;
    (ataData?.partes || []).forEach((p, i) => {
      const hinos = (p.hinos || []).filter(h => h && h.trim() !== "");
      totH += hinos.length;
      const txt = doc.splitTextToSize(`${i+1}ª PARTE - Condutor: ${toTitleCase(p.condutor) || "---"} | Hinos: ${hinos.join(", ")} [Qtd: ${hinos.length}]`, 90);
      doc.text(txt, rightColX, pY + 5);
      pY += (txt.length * 4) + 1.5;
    });
    doc.setFont("times", "bold"); doc.text(`TOTAL GERAL DE HINOS: ${totH}`, rightColX, pY + 2);

    // 5. GRÁFICO REF MOO (COLUNA DIREITA - LOGO ABAIXO DA LITURGIA)
    const mooY = pY + 10;
    doc.setFont("times", "bold"); doc.text("ESTATÍSTICA REF. MOO (EQUILÍBRIO)", rightColX, mooY);
    const pSum = Math.max(1, stats.cordas + stats.madeiras + stats.saxofones + stats.metais);
    const chartItems = [
      { label: "CORDAS", val: stats.cordas, ref: 50, color: [217, 119, 6] },
      { label: "MADEIRAS*", val: stats.madeiras + stats.saxofones, ref: 25, color: [5, 150, 105] },
      { label: "METAIS", val: stats.metais, ref: 25, color: [220, 38, 38] }
    ];

    chartItems.forEach((item, i) => {
      const rowY = mooY + 6 + (i * 9);
      const percReal = (item.val / pSum) * 100;
      doc.setFontSize(7); doc.text(`${item.label} [${item.val}/${pSum}]`, rightColX, rowY);
      doc.setFont("times", "normal");
      doc.text(`${percReal.toFixed(0)}% / Meta ${item.ref}%`, pageWidth - margin, rowY, { align: 'right' });
      doc.setFillColor(245, 245, 245); doc.rect(rightColX, rowY + 1.5, 90, 2.5, 'F');
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(rightColX, rowY + 1.5, Math.min(90, (percReal / 100) * 90), 2.5, 'F');
    });

    // 6. ORGANISTAS E IRMANDADE (COLUNA ESQUERDA - ABAIXO DA TABELA PRINCIPAL)
    const tabY = doc.lastAutoTable.finalY + 3;
    autoTable(doc, {
      startY: tabY, margin: { right: pageWidth / 2 + 3 },
      head: [['ORGANISTAS', 'CASA', 'VISITA', 'TOTAL']],
      body: [['ÓRGÃO ELETRÔNICO', stats.organistasCasa, stats.organistasVisitas, stats.organistas]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center', cellPadding: 0.5 },
      headStyles: { fillColor: [60, 60, 60] }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2, margin: { right: pageWidth / 2 + 3 },
      head: [['CORAL / IRMANDADE', 'IRMÃOS', 'IRMÃS', 'TOTAL']],
      body: [['VOCAL / VIRTUAL', stats.irmaos, stats.irmas, stats.irmandade]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center', cellPadding: 0.5 },
      headStyles: { fillColor: [80, 80, 80] }
    });

    // 7. RESUMO DE PRESENÇA E TOTALIZADORES
    const resY = Math.max(doc.lastAutoTable.finalY + 8, mooY + 35);
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("RESUMO DE PRESENÇA MINISTERIAL", margin, resY);
    
    doc.setFontSize(8); doc.setFont("times", "normal");
    const cW = (pageWidth - 20) / 2;
    doc.text(`ANCIÃO: ${stats.ancianosCasa + stats.ancianosVisitas}  |  DIÁCONO: ${stats.diaconosCasa + stats.diaconosVisitas}  |  COOP. OFÍCIO: ${stats.coopOficioCasa + stats.coopOficioVisitas}  |  COOP. JOVENS: ${stats.coopJovensCasa + stats.coopJovensVisitas}`, margin, resY + 5);
    doc.text(`ENC. REGIONAL: ${stats.encRegionalCasa + stats.encRegionalVisitas}  |  EXAMINADORAS: ${stats.examinadorasCasa + stats.examinadorasVisitas}  |  ENC. LOCAL: ${stats.encLocalCasa + stats.encLocalVisitas}`, margin, resY + 9);

    const totY = resY + 16;
    doc.setFillColor(30, 30, 30); doc.rect(margin, totY, pageWidth - 20, 8, 'F');
    doc.setFont("times", "bold"); doc.setFontSize(10); doc.setTextColor(255);
    doc.text(`MÚSICOS: ${stats.musicos}  |  ORGANISTAS: ${stats.organistas}  |  CORAL: ~ ${stats.irmandade}  |  TOTAL GERAL: ${stats.geral}`, pageWidth / 2, totY + 5.5, { align: 'center' });

    // 8. TABELA MINISTERIAL (FIRMASS)
    doc.setTextColor(0);
    const pesos = { 'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4, 'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7 };
    const allMin = [
      ...(ataData?.presencaLocalFull || []).map(p => ({cargo: p.role, nome: p.nome, ori: 'CASA'})),
      ...(ataData?.visitantes || []).map(p => ({cargo: p.min, nome: p.nome, ori: (p.comum || p.cidadeUf || "VISITA")}))
    ].sort((a, b) => (pesos[a.cargo] || 99) - (pesos[b.cargo] || 99));

    autoTable(doc, {
      startY: totY + 12,
      head: [['MINISTÉRIO / CARGO', 'NOME COMPLETO', 'LOCALIDADE DE ORIGEM']],
      body: allMin.map(m => [m.cargo, toTitleCase(m.nome), m.ori.toUpperCase()]),
      theme: 'grid', styles: { fontSize: 6.5, font: "times", cellPadding: 0.8 },
      headStyles: { fillColor: [40, 40, 40] },
      margin: { bottom: 20 }
    });

    // 9. RODAPÉ
    const footerY = pageHeight - 15;
    if (qrImageData) doc.addImage(qrImageData, 'PNG', margin, footerY - 8, 12, 12);
    doc.setFontSize(7); doc.setFont("times", "bold");
    doc.text(`SECRETARIA DE MÚSICA - ${regionalNome}`, margin + 15, footerY - 2);
    doc.setFont("times", "normal");
    doc.text(`Relatório Regional Digital • Emitido em ${new Date().toLocaleString()} • Página ${doc.internal.getNumberOfPages()}`, margin + 15, footerY + 2);

    doc.save(`${ano}-${mes}-${dia} - ATA REGIONAL ${sedeNome.toUpperCase()}.pdf`);
  }
};