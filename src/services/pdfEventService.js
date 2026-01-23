import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const pdfEventService = {
  generateAtaEnsaio: (stats, ataData, userData, counts) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const rightColX = pageWidth / 2 + 2;

    // --- FUNÇÕES AUXILIARES ---
    const toTitleCase = (str) => {
      if (!str || str === "CIDADE") return ""; 
      return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const translateDay = (dayNum) => {
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return days[dayNum] || "";
    };

    // 1. TRATAMENTO DE IDENTIDADE E DATAS (CORREÇÃO DO REFERENCE ERROR)
    const comumNome = (ataData?.comumNome || userData?.comum || "Localidade").toUpperCase();
    
    let cidadeRaw = userData?.cidade || "Jundiaí";
    if (cidadeRaw === "N6xKnEAxY3Ku2FOez55K") cidadeRaw = "JUNDIAÍ";
    const cidadeNome = toTitleCase(cidadeRaw);

    const regionalRaw = userData?.activeRegionalName || userData?.regional || "Regional";
    const regionalNome = toTitleCase(regionalRaw);
    
    const rawDate = ataData?.date || new Date().toISOString().split('T')[0];
    const dateParts = rawDate.split('-');
    
    // Declaração explícita para evitar ReferenceError no doc.save
    const fAno = dateParts[0];
    const fMes = dateParts[1];
    const fDia = dateParts[2];
    const dataFormatada = `${fDia}/${fMes}/${fAno}`;

    // --- 2. CABEÇALHO OFICIAL ---
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text("Relatório do Serviço de Ensaio Local", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`${comumNome}${cidadeNome ? ' - ' + cidadeNome : ''}`, pageWidth / 2, 25, { align: "center" });
    doc.text(`${regionalNome}`, pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(9);
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, { align: "right" });
    doc.line(margin, 39, pageWidth - margin, 39);

    // --- 3. LÓGICA DINÂMICA DE INSTRUMENTOS (CAPTURA TROMBONITO E EXTRAS) ---
    const officialKeys = [
      'violino','viola','violoncelo','flauta','oboe','corne_ingles','fagote','clarinete',
      'clarone_alto','clarone_baixo','sax_soprano','sax_alto','sax_tenor','sax_baritono',
      'trompete','flugelhorn','trompa','trombone','eufonio','tuba','acordeon'
    ];

    // Detecta instrumentos que estão no 'counts' mas não são da lista fixa
    const extraKeys = Object.keys(counts || {}).filter(key => 
      !officialKeys.includes(key) && !key.startsWith('meta_') && key !== 'orgao' && key !== 'irmandade'
    );

    const fullInstOrder = [...officialKeys, ...extraKeys];

    const orqBody = fullInstOrder.map((key, idx) => {
      const d = counts?.[key] || { total: 0, comum: 0 };
      const label = d.name || key.replace(/_/g, ' ').toUpperCase();
      return [(idx + 1).toString().padStart(2, '0'), label, d.comum || 0, Math.max(0, (d.total || 0) - (d.comum || 0)), d.total || 0];
    });

    autoTable(doc, {
      startY: 42, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'INSTRUMENTOS', 'COM.', 'VIS.', 'TOT.']],
      body: orqBody,
      theme: 'grid', styles: { fontSize: 6.5, cellPadding: 0.8, font: "times", halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, halign: 'left' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' }, 4: { fillColor: [240, 240, 240] } }
    });

    // B. Tabela Organistas
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'ORGANISTAS', 'COM.', 'VIS.', 'TOT.']],
      body: [['27', 'ORGANISTAS', Number(counts?.orgao?.comum) || 0, Math.max(0, stats.organistas - (counts?.orgao?.comum || 0)), stats.organistas]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, halign: 'left' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' }, 4: { fillColor: [240, 240, 240] } }
    });

    // C. Tabela Coral
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['Nº', 'CORAL', 'IRMÃOS', 'IRMÃS', 'TOT.']],
      body: [['23', 'IRMANDADE', stats.irmaos, stats.irmas, stats.irmandade]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, halign: 'left' },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' }, 4: { fillColor: [240, 240, 240] } }
    });

    const finalTableY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(8); doc.setFont("times", "normal");
    doc.text(`MÚSICOS: ${stats.musicos} | ORGANISTAS: ${stats.organistas} | CORAL: ${stats.irmandade}`, margin, finalTableY);
    doc.setFont("times", "bold");
    doc.text(`TOTAL GERAL DE PRESENTES: ${stats.geral}`, margin, finalTableY + 4);

    // --- 4. COLUNA DIREITA ---
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ATENDIMENTO", rightColX, 45);
    doc.setFont("times", "normal"); doc.setFontSize(8);
    doc.text(`NOME: ${ataData?.atendimentoNome || "---"}`, rightColX, 50);
    doc.text(`MINISTÉRIO: ${ataData?.atendimentoMin || "---"}`, rightColX, 54);

    doc.setFont("times", "bold");
    doc.text("ANDAMENTO DO ENSAIO", rightColX, 62);
    const partesBody = (ataData?.partes || []).map(p => [
      p.label, p.nome || "---", p.hinos?.filter(h => h).join("-") || "---", p.hinos?.filter(h => h).length || 0
    ]);
    autoTable(doc, {
      startY: 64, margin: { left: rightColX },
      head: [['PARTE', 'CONDUTOR', 'HINOS', 'TOT.']],
      body: partesBody,
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, halign: 'left' },
      columnStyles: { 1: { halign: 'right' }, 3: { fillColor: [245, 245, 245], fontStyle: 'bold' } }
    });

    // Equilíbrio MOO
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
      doc.setFontSize(7); doc.text(`${n.label.toUpperCase()} [${n.val}/${totalM}]`, rightColX, rowY);
      doc.text(`${percReal.toFixed(0)}% / Meta ${n.ref}%`, pageWidth - margin, rowY, { align: 'right' });
      doc.setFillColor(245, 245, 245); doc.rect(rightColX, rowY + 2, 85, 3, 'F');
      doc.setFillColor(n.color[0], n.color[1], n.color[2]);
      doc.rect(rightColX, rowY + 2, Math.min(85, (percReal / 100) * 85), 3, 'F');
      doc.setDrawColor(200, 200, 200); doc.line(rightColX + (n.ref / 100 * 85), rowY + 1, rightColX + (n.ref / 100 * 85), rowY + 6);
    });

    // --- 5. TABELA MINISTERIAL (CORREÇÃO BAIRRO/COMUM) ---
    const pesos = { 'Encarregado Regional': 1, 'Encarregado Local': 2, 'Examinadora': 3, 'Ancião': 4, 'Diácono': 5, 'Cooperador do Ofício': 6, 'Cooperador RJM': 7 };
    const minRows = [];
    
    ataData?.presencaLocalFull?.forEach(p => {
      minRows.push({ cargo: p.role, nome: (p.nome || "---").toUpperCase(), comum: comumNome, cidade: cidadeNome.toUpperCase(), data: "-", hora: "-", peso: pesos[p.role] || 99 });
    });

    ataData?.visitantes?.forEach(v => {
      minRows.push({ cargo: v.min, nome: (v.nome || "---").toUpperCase(), comum: (v.bairro || v.comum || "Outra").toUpperCase(), cidade: (v.cidadeUf || "").toUpperCase(), data: v.dataEnsaio || "", hora: v.hora || "", peso: pesos[v.min] || 99 });
    });
    
    minRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));

    autoTable(doc, {
      startY: Math.max(finalTableY + 15, doc.lastAutoTable.finalY + 10, mooY + 45),
      head: [['MINISTÉRIO', 'NOME', 'COMUM/BAIRRO', 'CIDADE/UF', 'DATA ENS.', 'HORA']],
      body: minRows.map(r => [r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora]),
      theme: 'grid', styles: { fontSize: 6, font: "times", cellPadding: 1 },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
    });

    // --- 6. LOCALIDADE E RODAPÉ ---
    const footerY = 278;
    const agendaDias = userData?.diasSelecao ? userData.diasSelecao.map(d => translateDay(d)).join(' e ') : "---";
    const rua = userData?.endereco?.rua || "";
    const num = userData?.endereco?.numero || "";
    const cep = userData?.endereco?.cep || "";
    const enderecoFull = `${rua}${rua && num ? ', ' : ''}${num}${cep ? ' - ' + cep : ''}`;
    
    const infoIgreja = `${comumNome} - ${enderecoFull} - Culto: ${agendaDias} às ${userData?.horaCulto || '---'} - Ensaio Local: ${userData?.ensaioLocal || '---'} às ${userData?.horaEnsaio || '---'}`;
    
    doc.setFontSize(7); doc.setFont("times", "bold");
    doc.text(infoIgreja, pageWidth / 2, footerY, { align: "center" });
    doc.setFont("times", "normal");
    doc.text(`Secretaria de Música ${regionalNome}`, pageWidth / 2, footerY + 5, { align: "center" });

    doc.save(`${fAno}-${fMes}-${fDia} - Ata ${comumNome} - Ensaio Local.pdf`);
  }
};