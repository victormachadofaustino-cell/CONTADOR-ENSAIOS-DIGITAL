import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // Biblioteca validada e instalada

// Exportação explícita para ser usada em outros componentes
export const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const pdfEventService = {
  /**
   * Gera o PDF da Ata de Ensaio
   * v5.3 - Nota MOO fixada às estatísticas e Ocorrências dinâmicas.
   */
  generateAtaEnsaio: async (stats, ataData, userData, counts, comumFullData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const rightColX = pageWidth / 2 + 2;

    // PRESERVAÇÃO: Declaração de variável para evitar ReferenceError no didDrawPage
    let qrImageData = null;

    // --- FUNÇÕES AUXILIARES ---
    const translateDay = (dayNum) => {
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return days[dayNum] || "";
    };

    // 1. TRATAMENTO DE IDENTIDADE E DATAS
    const localidadePura = (comumFullData?.comum || ataData?.comumNome || userData?.comum || "Localidade");
    const comumNomeFormatado = toTitleCase(localidadePura);
    
    let cidadeRaw = comumFullData?.cidadeNome || ataData?.cidadeNome || userData?.cidadeNome || "Jundiaí";
    if (cidadeRaw === "N6xKnEAxY3Ku2FOez55K") cidadeRaw = "JUNDIAÍ";
    const cidadeNome = toTitleCase(cidadeRaw);

    const regionalNome = `Regional ${toTitleCase(userData?.activeRegionalName || userData?.regional || "Jundiaí")}`;
    
    const rawDate = ataData?.date || counts?.date || "2026-01-01"; 
    const dateParts = rawDate.split('-'); 
    const dataFormatada = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // --- 1.1 GERAÇÃO DO QR CODE ---
    const rua = toTitleCase(comumFullData?.endereco?.rua || "");
    const num = comumFullData?.endereco?.numero || "";
    const bairro = toTitleCase(comumFullData?.endereco?.bairro || "");
    const mapsUrl = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(`${rua}, ${num} - ${bairro} ${cidadeNome} CCB`)}`;
    
    try {
      qrImageData = await QRCode.toDataURL(mapsUrl, { margin: 1, width: 120 });
    } catch (e) {
      console.error("Falha ao gerar QR:", e);
    }

    // --- 2. CABEÇALHO OFICIAL ---
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Relatório do Serviço de Ensaio Local", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 21, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(`${comumNomeFormatado} - ${cidadeNome}`, pageWidth / 2, 27, { align: "center" });
    doc.text(regionalNome, pageWidth / 2, 32, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("times", "bold");
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, { align: "right" });
    doc.line(margin, 39, pageWidth - margin, 39);

    // --- 3. TABELA DE INSTRUMENTOS ---
    const officialKeys = ['violino','viola','violoncelo','flauta','oboe','corneingles','corne_ingles','fagote','clarinete','claronealto','clarone_alto','claronebaixo','clarone_baixo','saxsoprano','sax_soprano','saxalto','sax_alto','saxtenor','sax_tenor','saxbaritono','sax_baritono','trompete','flugelhorn','trompa','trombone','eufonio','tuba','acordeon'];
    const presentKeys = Object.keys(counts || {}).filter(key => !key.startsWith('meta_') && !['orgao', 'irmandade', 'Coral', 'date'].includes(key));
    const sortedKeys = presentKeys.sort((a, b) => {
      const idxA = officialKeys.indexOf(a.replace(/_/g, '').toLowerCase());
      const idxB = officialKeys.indexOf(b.replace(/_/g, '').toLowerCase());
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const orqBody = sortedKeys.map((key, idx) => {
      const d = counts[key] || {};
      const total = Number(d.total) || 0;
      const comum = Number(d.comum) || 0;
      return [(idx + 1).toString().padStart(2, '0'), d.name || key.replace(/_/g, ' ').toUpperCase(), comum, Math.max(0, total - comum), total];
    });

    autoTable(doc, {
      startY: 42, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'INSTRUMENTOS', 'COMUM', 'VISITAS', 'TOTAL']],
      body: orqBody,
      theme: 'grid', 
      styles: { fontSize: 6.5, cellPadding: 0.8, font: "times", halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, halign: 'center' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' }, 4: { fillColor: [240, 240, 240] } }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'ORGANISTAS', 'COMUM', 'VISITAS', 'TOTAL']],
      body: [['27', 'ORGANISTAS', Number(counts?.orgao?.comum) || 0, Math.max(0, stats.organistas - (counts?.orgao?.comum || 0)), stats.organistas]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'CORAL', 'IRMÃOS', 'IRMÃS', 'TOTAL']],
      body: [['23', 'IRMANDADE', stats.irmaos, stats.irmas, stats.irmandade]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [80, 80, 80], textColor: 255 },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
    });

    // --- 4. PIRÂMIDE DE TOTAIS ---
    let totalsY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(8); doc.setFont("times", "normal");
    doc.text(`MÚSICOS: ${stats.musicos} | ORGANISTAS: ${stats.organistas} | CORAL: ${stats.irmandade}`, margin, totalsY);
    totalsY += 5;
    doc.setFont("times", "bold");
    doc.text(`TOTAL ORQUESTRA: ${stats.musicos + stats.organistas}`, margin, totalsY);
    totalsY += 6;
    doc.setFontSize(10);
    doc.text(`TOTAL GERAL DE PRESENTES: ${stats.geral}`, margin, totalsY);

    // --- 5. COLUNA DIREITA (Atendimento e Hinos) ---
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ATENDIMENTO", rightColX, 45);
    doc.setFont("times", "normal"); doc.setFontSize(8);
    doc.text(`Nome: ${toTitleCase(ataData?.atendimentoNome) || "---"}`, rightColX, 50);
    doc.text(`Ministério: ${toTitleCase(ataData?.atendimentoMin) || "---"}`, rightColX, 54);

    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("HINOS TOCADOS", rightColX, 62);
    const todosHinos = (ataData?.partes || []).flatMap(p => p.hinos || []).filter(h => h && h.trim() !== "");
    doc.setFont("times", "normal"); doc.setFontSize(8);
    const hinosTxt = doc.splitTextToSize(todosHinos.join(" - ") || "---", 85);
    doc.text(hinosTxt, rightColX, 67);
    const posHinosY = 67 + (hinosTxt.length * 4);
    doc.setFont("times", "bold");
    doc.text(`TOTAL DE HINOS: ${todosHinos.length}`, rightColX, posHinosY);

    // --- 6. ESTATÍSTICA MOO + NOTA MADEIRAS ---
    const mooY = posHinosY + 10;
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ESTATÍSTICA REF. MOO", rightColX, mooY);
    const totalM = Math.max(1, stats.musicos);
    const mooNaipes = [
      { label: 'Cordas', val: stats.cordas, ref: 50, color: [217, 119, 6] },
      { label: 'Madeiras*', val: stats.madeiras + stats.saxofones, ref: 25, color: [5, 150, 105] },
      { label: 'Metais', val: stats.metais, ref: 25, color: [220, 38, 38] }
    ];
    mooNaipes.forEach((n, i) => {
      const rowY = mooY + 6 + (i * 12);
      const percReal = (n.val / totalM) * 100;
      doc.setFontSize(7); doc.setFont("times", "bold");
      doc.text(`${n.label.toUpperCase()} [${n.val}/${totalM}]`, rightColX, rowY);
      doc.setFont("times", "normal");
      doc.text(`${percReal.toFixed(0)}% / Meta ${n.ref}%`, pageWidth - margin, rowY, { align: 'right' });
      doc.setFillColor(245, 245, 245); doc.rect(rightColX, rowY + 2, 85, 3, 'F');
      doc.setFillColor(n.color[0], n.color[1], n.color[2]);
      doc.rect(rightColX, rowY + 2, Math.min(85, (percReal / 100) * 85), 3, 'F');
    });

    const finalMooY = mooY + (mooNaipes.length * 12) + 2;
    doc.setFontSize(6.5); doc.setFont("times", "italic");
    doc.text("* Nota: A seção de Madeiras contempla a família dos Saxofones.", rightColX, finalMooY + 4);

    // --- 7. OCORRÊNCIAS DO ENSAIO (Condicional e Agrupada) ---
    const rawOcorrencias = ataData?.ocorrencias || [];
    const listaFinalOcorr = [];
    const mapA = {}; 

    rawOcorrencias.forEach(o => {
      if (o.tipo === 'A' && o.instrumento && o.etapa) {
        const key = `${o.instrumento}|${o.etapa}`;
        if (!mapA[key]) mapA[key] = [];
        mapA[key].push(o.nome);
      } else {
        listaFinalOcorr.push(o.texto);
      }
    });

    Object.entries(mapA).forEach(([key, nomes]) => {
      const [inst, etapa] = key.split('|');
      const plural = nomes.length > 1;
      const frase = `${plural ? 'Apresentados' : 'Apresentado(a)'} para início nos ensaios ${plural ? 'os irmãos' : 'o(a) irmão(ã)'} ${nomes.join(" e ")}, executando o instrumento ${inst}, na etapa de ${etapa}, a partir desta data.`;
      listaFinalOcorr.push(frase);
    });

    // Variável para controlar o fluxo de altura da coluna direita
    let lastRightColY = finalMooY + 8;

    if (listaFinalOcorr.length > 0) {
      const ocorrenciasY = finalMooY + 14; // Espaçamento após a nota dos saxofones
      doc.setFont("times", "bold"); doc.setFontSize(9);
      doc.text("OCORRÊNCIAS DO ENSAIO", rightColX, ocorrenciasY);
      
      doc.setFont("times", "italic"); doc.setFontSize(7.5);
      let currentOcorrY = ocorrenciasY + 5;
      listaFinalOcorr.forEach(txt => {
        const lines = doc.splitTextToSize(`• ${txt}`, 85);
        doc.text(lines, rightColX, currentOcorrY);
        currentOcorrY += (lines.length * 3.5) + 1;
      });
      lastRightColY = currentOcorrY;
    }

    // --- 8. TABELA MINISTERIAL (Hierarquia Completa) ---
    const pesos = { 'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador do Oficio': 3, 'Cooperador de Jovens e Menores': 4, 'Cooperador RJM': 4, 'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7, 'Secretário da Música': 8, 'Secretario da Musica': 8, 'Instrutor': 9, 'Músico': 10, 'Musico': 10 };
    const localRows = [];
    const visitorRows = [];

    ataData?.presencaLocalFull?.forEach(p => {
      localRows.push({ cargo: p.role, nome: toTitleCase(p.nome), comum: comumNomeFormatado, cidade: cidadeNome, data: "—", hora: "—", peso: pesos[p.role] || 99 });
    });
    ataData?.visitantes?.forEach(v => {
      visitorRows.push({ cargo: v.min, nome: toTitleCase(v.nome), comum: toTitleCase(v.bairro || v.comum), cidade: toTitleCase(v.cidadeUf), data: v.dataEnsaio || "—", hora: v.hora || "—", peso: pesos[v.min] || 99 });
    });

    localRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));
    visitorRows.sort((a, b) => a.cidade.localeCompare(b.cidade) || a.peso - b.peso || a.nome.localeCompare(b.nome));

    const finalMinBody = [];
    if (localRows.length > 0) {
      finalMinBody.push([{ content: 'LOCAL', colSpan: 6, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'left', textColor: [0, 0, 0] } }]);
      localRows.forEach(r => finalMinBody.push([r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora]));
    }
    if (visitorRows.length > 0) {
      finalMinBody.push([{ content: 'VISITAS', colSpan: 6, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'left', textColor: [0, 0, 0] } }]);
      visitorRows.forEach(r => finalMinBody.push([r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora]));
    }

    autoTable(doc, {
      startY: Math.max(totalsY + 12, doc.lastAutoTable.finalY + 12, lastRightColY + 8),
      head: [['MINISTÉRIO', 'NOME', 'COMUM/BAIRRO', 'CIDADE/UF', 'DATA ENS.', 'HORA']],
      body: finalMinBody,
      theme: 'grid', styles: { fontSize: 6, font: "times", cellPadding: 1, halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'left' } },
      margin: { bottom: 35 }, 
      didDrawPage: (data) => {
        const footerY = pageHeight - 18;
        if (qrImageData) {
          doc.addImage(qrImageData, 'PNG', margin + 2, footerY - 5, 12, 12);
        }
        doc.setFontSize(7); doc.setFont("times", "bold");
        doc.text(comumNomeFormatado.toUpperCase(), margin + 17, footerY - 2);
        doc.setFontSize(6.5); doc.setFont("times", "normal");
        doc.text(`${rua}, ${num} - ${bairro} • ${cidadeNome}`, margin + 17, footerY + 1);
        doc.text(`Culto: ${comumFullData?.diasSelecao?.map(d => translateDay(d)).join(' e ') || "---"} às ${comumFullData?.horaCulto || '---'} | Ensaio Local: ${comumFullData?.ensaioLocal || '---'} às ${comumFullData?.horaEnsaio || '---'}`, margin + 17, footerY + 4);
        doc.setFontSize(6.5); doc.text(`Secretaria de Música ${regionalNome} • Sistema de Gestão Digital`, pageWidth / 2, pageHeight - 5, { align: "center" });
      }
    });

    doc.save(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]} - Ata ${localidadePura.toUpperCase()} - Ensaio Local.pdf`);
  }
};