import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // Biblioteca validada e instalada

export const pdfEventService = {
  /**
   * Gera o PDF da Ata de Ensaio
   * v4.4 - Correção de Estabilidade: Remoção de variáveis não declaradas e ajuste de link
   * @param {Object} stats - Estatísticas calculadas no useMemo
   * @param {Object} ataData - Dados da Ata + Raiz do Evento (date, comumId)
   * @param {Object} userData - Dados do usuário logado (para Regional)
   * @param {Object} counts - Mapa completo de contagens
   * @param {Object} comumFullData - Dados vindos da coleção 'comuns' (Endereço/Agenda)
   */
  generateAtaEnsaio: async (stats, ataData, userData, counts, comumFullData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const rightColX = pageWidth / 2 + 2;

    // --- FUNÇÕES AUXILIARES ---
    const toTitleCase = (str) => {
      if (!str) return "";
      return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

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

    // --- 2. CABEÇALHO OFICIAL REESTRUTURADO ---
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
    const officialKeys = [
      'violino','viola','violoncelo','flauta','oboe','corneingles','corne_ingles','fagote','clarinete',
      'claronealto','clarone_alto','claronebaixo','clarone_baixo','saxsoprano','sax_soprano',
      'saxalto','sax_alto','saxtenor','sax_tenor','saxbaritono','sax_baritono',
      'trompete','flugelhorn','trompa','trombone','eufonio','tuba','acordeon'
    ];

    const extraKeys = Object.keys(counts || {}).filter(key => 
      !officialKeys.includes(key.toLowerCase()) && 
      !key.startsWith('meta_') && 
      !['orgao', 'irmandade', 'Coral'].includes(key)
    );

    const printedKeys = [];
    const fullInstOrder = [...officialKeys, ...extraKeys].filter(key => {
      const normalized = key.replace(/_/g, '').toLowerCase();
      if (counts?.[key] && !printedKeys.includes(normalized)) {
        printedKeys.push(normalized);
        return true;
      }
      return false;
    });

    const orqBody = fullInstOrder.map((key, idx) => {
      const d = counts?.[key] || { total: 0, comum: 0 };
      const label = d.name || key.replace(/_/g, ' ').toUpperCase();
      const vis = Math.max(0, (parseInt(d.total) || 0) - (parseInt(d.comum) || 0));
      return [(idx + 1).toString().padStart(2, '0'), label, d.comum || 0, vis, d.total || 0];
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
      headStyles: { fillColor: [60, 60, 60], textColor: 255, halign: 'center' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'CORAL', 'IRMÃOS', 'IRMÃS', 'TOTAL']],
      body: [['23', 'IRMANDADE', stats.irmaos, stats.irmas, stats.irmandade]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, halign: 'center' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }
    });

    // --- 4. PIRÂMIDE DE TOTAIS ---
    let totalsY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(8); 
    doc.setFont("times", "normal");
    doc.text(`MÚSICOS: ${stats.musicos} | ORGANISTAS: ${stats.organistas} | CORAL: ${stats.irmandade}`, margin, totalsY);

    totalsY += 5;
    doc.setFont("times", "bold");
    doc.text(`TOTAL ORQUESTRA: ${stats.musicos + stats.organistas}`, margin, totalsY);

    totalsY += 6;
    doc.setFontSize(10);
    doc.text(`TOTAL GERAL DE PRESENTES: ${stats.geral}`, margin, totalsY);

    // --- 5. COLUNA DIREITA ---
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ATENDIMENTO", rightColX, 45);
    doc.setFont("times", "normal"); doc.setFontSize(8);
    doc.text(`Nome: ${toTitleCase(ataData?.atendimentoNome) || "---"}`, rightColX, 50);
    doc.text(`Ministério: ${toTitleCase(ataData?.atendimentoMin) || "---"}`, rightColX, 54);

    doc.setFont("times", "bold");
    doc.text("ANDAMENTO DO ENSAIO", rightColX, 62);
    const partesBody = (ataData?.partes || []).map(p => [
      p.label, toTitleCase(p.nome) || "---", p.hinos?.filter(h => h).join("-") || "---", p.hinos?.filter(h => h).length || 0
    ]);
    autoTable(doc, {
      startY: 64, margin: { left: rightColX },
      head: [['PARTE', 'CONDUTOR', 'HINOS', 'TOT.']],
      body: partesBody,
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, halign: 'center' },
      columnStyles: { 3: { fontStyle: 'bold' } }
    });

    // --- 6. ESTATÍSTICA MOO + NOTA MADEIRAS ---
    const mooY = doc.lastAutoTable.finalY + 8;
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
      doc.setFontSize(7); 
      doc.setFont("times", "bold");
      doc.text(`${n.label.toUpperCase()} [${n.val}/${totalM}]`, rightColX, rowY);
      doc.setFont("times", "normal");
      doc.text(`${percReal.toFixed(0)}% / Meta ${n.ref}%`, pageWidth - margin, rowY, { align: 'right' });
      doc.setFillColor(245, 245, 245); doc.rect(rightColX, rowY + 2, 85, 3, 'F');
      doc.setFillColor(n.color[0], n.color[1], n.color[2]);
      doc.rect(rightColX, rowY + 2, Math.min(85, (percReal / 100) * 85), 3, 'F');
    });

    const notaY = mooY + (mooNaipes.length * 12) + 8;
    doc.setFontSize(6.5);
    doc.setFont("times", "italic");
    doc.text("* Nota: A seção de Madeiras contempla a família dos Saxofones.", rightColX, notaY);

    // --- 7. TABELA MINISTERIAL E RODAPÉ ---
    const pesos = { 'Encarregado Regional': 1, 'Encarregado Local': 2, 'Examinadora': 3, 'Ancião': 4, 'Diácono': 5, 'Cooperador do Ofício': 6, 'Cooperador RJM': 7 };
    const minRows = [];
    ataData?.presencaLocalFull?.forEach(p => minRows.push({ cargo: p.role, nome: toTitleCase(p.nome), comum: comumNomeFormatado, cidade: cidadeNome, data: "-", hora: "-", peso: pesos[p.role] || 99 }));
    ataData?.visitantes?.forEach(v => minRows.push({ cargo: v.min, nome: toTitleCase(v.nome), comum: toTitleCase(v.bairro || v.comum || "Outra"), cidade: toTitleCase(v.cidadeUf), data: v.dataEnsaio || "", hora: v.hora || "", peso: pesos[v.min] || 99 }));
    minRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));

    const rua = toTitleCase(comumFullData?.endereco?.rua || "");
    const num = comumFullData?.endereco?.numero || "";
    const bairro = toTitleCase(comumFullData?.endereco?.bairro || "");
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rua}, ${num} - ${bairro} ${cidadeNome} CCB`)}`;
    
    let qrImageData = null;
    try {
      qrImageData = await QRCode.toDataURL(mapsUrl, { margin: 1, width: 120 });
    } catch (e) { console.error("Falha ao gerar QR:", e); }

    autoTable(doc, {
      startY: Math.max(totalsY + 12, doc.lastAutoTable.finalY + 12, notaY + 5),
      head: [['MINISTÉRIO', 'NOME', 'COMUM/BAIRRO', 'CIDADE/UF', 'DATA ENS.', 'HORA']],
      body: minRows.map(r => [r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora]),
      theme: 'grid', 
      styles: { fontSize: 6, font: "times", cellPadding: 1, halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'left' } },
      margin: { bottom: 35 }, 
      didDrawPage: (data) => {
        const footerY = pageHeight - 18;
        const qrSize = 12; 
        const qrMarginX = margin + 2;
        
        if (qrImageData) {
            doc.addImage(qrImageData, 'PNG', qrMarginX, footerY - 5, qrSize, qrSize);
            doc.link(qrMarginX, footerY - 5, qrSize, qrSize, { url: mapsUrl });
        }

        const infoX = qrMarginX + qrSize + 5;
        const agendaDias = comumFullData?.diasSelecao ? comumFullData.diasSelecao.map(d => translateDay(d)).join(' e ') : "---";
        const enderecoLine = `${rua}, ${num} - ${bairro} • ${cidadeNome}`;
        
        doc.setFontSize(7); 
        doc.setFont("times", "bold");
        doc.text(comumNomeFormatado.toUpperCase(), infoX, footerY - 2);
        
        doc.setFontSize(6.5);
        doc.setFont("times", "normal");
        doc.text(enderecoLine, infoX, footerY + 1);
        doc.text(`Culto: ${agendaDias} às ${comumFullData?.horaCulto || '---'} | Ensaio Local: ${comumFullData?.ensaioLocal || '---'} às ${comumFullData?.horaEnsaio || '---'}`, infoX, footerY + 4);
        
        doc.setFontSize(6);
        doc.setFont("times", "italic");
        doc.text("Escaneie ou toque no código ao lado para abrir a localização.", infoX, footerY + 7);

        doc.setFontSize(6.5);
        doc.setFont("times", "normal");
        doc.text(`Secretaria de Música ${regionalNome} • Sistema de Gestão Digital`, pageWidth / 2, pageHeight - 5, { align: "center" });
      }
    });

    doc.save(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]} - Ata ${localidadePura.toUpperCase()} - Ensaio Local.pdf`);
  }
};