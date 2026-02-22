import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// Exportação explícita para ser usada em outros componentes
export const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const pdfEventRegionalService = {
  /**
   * Gera o PDF da Ata de Ensaio Regional
   * v3.4 - Restauração do Detalhamento de Irmandade (Irmãos/Irmãs) e Ajuste de Espaços
   */
  generateAtaRegional: async (stats, ataData, userData, counts, sedeFullData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const rightColX = pageWidth / 2 + 2;

    let qrImageData = null;

    // --- FUNÇÕES AUXILIARES ---
    const translateDay = (dayNum) => {
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return days[dayNum] || "";
    };

    // 1. IDENTIDADE E DATAS
    const sedeNomePura = (sedeFullData?.comum || ataData?.comumNome || userData?.comum || "Sede Regional");
    const sedeNomeFormatado = toTitleCase(sedeNomePura);
    
    let cidadeRaw = sedeFullData?.cidadeNome || ataData?.cidadeNome || userData?.cidadeNome || "Jundiaí";
    const cidadeNome = toTitleCase(cidadeRaw);

    const rawReg = (userData?.activeRegionalName || userData?.regional || "Jundiaí").toUpperCase();
    const cleanReg = rawReg.replace("REGIONAL", "").trim();
    const regionalNome = `REGIONAL ${cleanReg}`;
    
    const rawDate = ataData?.date || counts?.date || "2026-02-22"; 
    const dateParts = rawDate.split('-');
    const dataFormatada = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // --- GERAÇÃO DO QR CODE COM ENDEREÇO ---
    const rua = toTitleCase(sedeFullData?.endereco?.rua || "");
    const num = sedeFullData?.endereco?.numero || "";
    const bairro = toTitleCase(sedeFullData?.endereco?.bairro || "");
    
    try {
      const mapsUrl = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(`${rua}, ${num} - ${bairro} ${cidadeNome} CCB`)}`;
      qrImageData = await QRCode.toDataURL(mapsUrl, { margin: 1, width: 100 });
    } catch (e) { console.error("Falha ao gerar QR:", e); }

    // 2. CABEÇALHO OFICIAL
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Relatório do Serviço de Ensaio Regional", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 21, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(`${sedeNomeFormatado} - ${cidadeNome}`, pageWidth / 2, 27, { align: "center" });
    doc.setFont("times", "bold");
    doc.text(regionalNome, pageWidth / 2, 32, { align: "center" });
    doc.setFontSize(9);
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, { align: "right" });
    doc.line(margin, 39, pageWidth - margin, 39);

    // 3. TABELA DE INSTRUMENTOS COM SUPORTE A EXTRAS
    const families = [
      { name: 'CORDAS', keys: ['violino','viola','violoncelo'], total: stats.cordas },
      { name: 'MADEIRAS', keys: ['flauta','oboe','corneingles','fagote','clarinete','claronealto','claronebaixo','saxsoprano','saxalto','saxtenor','saxbaritono'], total: (stats.madeiras + stats.saxofones) },
      { name: 'METAIS', keys: ['trompete','flugelhorn','trompa','trombone','eufonio','tuba'], total: stats.metais },
      { name: 'TECLAS', keys: ['acordeon'], total: stats.teclas }
    ];

    Object.keys(counts || {}).forEach(key => {
      if (key.startsWith('extra_')) {
        const extra = counts[key];
        const famName = (extra.section || 'GERAL').toUpperCase();
        const famIndex = families.findIndex(f => f.name === famName || (famName === 'SAXOFONES' && f.name === 'MADEIRAS'));
        if (famIndex !== -1) families[famIndex].keys.push(key);
      }
    });

    const orqBody = [];
    families.forEach(fam => {
      const instruments = fam.keys.map(k => ({ key: k, data: counts?.[k] })).filter(i => i.data);
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

    // 4. LITURGIA (Espaço de 1 linha acima)
    let rightY = 43.5; 
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("LITURGIA", rightColX, rightY);
    
    doc.setFont("times", "normal"); doc.setFontSize(8);
    doc.text(`Atendimento: ${toTitleCase(ataData?.atendimentoNome) || "---"} (${ataData?.atendimentoMin || "---"})`, rightColX, rightY + 5);
    doc.text(`Hino de Abertura: ${ataData?.hinoAbertura || "---"}`, rightColX, rightY + 9);
    const pal = ataData?.palavra || {};
    doc.text(`Palavra: ${pal.livro || "---"}, ${pal.capitulo || "0"} : ${pal.verso || "0"}`, rightColX, rightY + 13);
    const assuntoTxt = doc.splitTextToSize(`Assunto: ${pal.assunto || "---"}`, 90);
    doc.text(assuntoTxt, rightColX, rightY + 17);

    // 5. PARTE MUSICAL (Retirado espaço superior)
    let pY = rightY + 24; 
    doc.setFont("times", "bold"); doc.text("PARTE MUSICAL", rightColX, pY);
    doc.setFont("times", "normal");
    let totH = 0;
    (ataData?.partes || []).forEach((p, i) => {
      const hinos = (p.hinos || []).filter(h => h && h.trim() !== "");
      totH += hinos.length;
      const condutor = p.nome || p.condutor || "---";
      const txt = doc.splitTextToSize(`${p.label || (i+1 + 'ª PARTE')}: ${toTitleCase(condutor)} | Hinos: ${hinos.join(", ")}`, 90);
      
      const isSecondPart = p.label?.includes('2') || i === 1;
      const topPadding = isSecondPart ? 0 : 5; 
      const bottomPadding = isSecondPart ? 6 : 4;

      doc.text(txt, rightColX, pY + topPadding);
      pY += (txt.length * 4) + bottomPadding; 
    });
    doc.setFont("times", "bold"); doc.text(`TOTAL GERAL DE HINOS: ${totH}`, rightColX, pY);

    // 6. OCORRÊNCIAS
    if (ataData?.ocorrencias?.length > 0) {
      pY += 6;
      doc.setFont("times", "bold"); doc.text("OCORRÊNCIAS DO ENSAIO", rightColX, pY);
      doc.setFont("times", "italic"); doc.setFontSize(7);
      ataData.ocorrencias.forEach((oc) => {
        const ocTxt = doc.splitTextToSize(`• ${oc.texto}`, 90);
        doc.text(ocTxt, rightColX, pY + 4);
        pY += (ocTxt.length * 3.5);
      });
    }

    // 7. ESTATÍSTICA REF MOO (Espaço de 1 linha acima)
    const mooY = pY + 10;
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ESTATÍSTICA REF. MOO (EQUILÍBRIO)", rightColX, mooY);
    const pSum = Math.max(1, stats.musicos);
    const totalMadeiras = Math.max(1, stats.madeiras + stats.saxofones);
    
    const renderBar = (label, val, base, y, color, isSub = false) => {
      const percReal = (val / base) * 100;
      doc.setFontSize(isSub ? 6 : 7);
      doc.setFont("times", isSub ? "italic" : "bold");
      doc.text(`${label} [${val}/${base}]`, isSub ? rightColX + 4 : rightColX, y);
      doc.setFont("times", "normal");
      doc.text(`${percReal.toFixed(0)}%`, pageWidth - margin, y, { align: 'right' });
      doc.setFillColor(245, 245, 245); doc.rect(rightColX, y + 1.5, 90, 2, 'F');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(rightColX, y + 1.5, Math.min(90, (percReal / 100) * 90), 2, 'F');
      return y + 8;
    };

    let nextMooY = mooY + 6;
    nextMooY = renderBar("CORDAS", stats.cordas, pSum, nextMooY, [217, 119, 6]);
    nextMooY = renderBar("MADEIRAS*", (stats.madeiras + stats.saxofones), pSum, nextMooY, [5, 150, 105]);
    nextMooY = renderBar("SAXOFONES (SOBRE MADEIRAS)", stats.saxofones, totalMadeiras, nextMooY - 2, [16, 185, 129], true);
    nextMooY = renderBar("METAIS", stats.metais, pSum, nextMooY, [220, 38, 38]);

    // 8. ÓRGÃO E IRMANDADE (Restauração do detalhamento de Irmãos/Irmãs)
    const tabY = doc.lastAutoTable.finalY + 5;
    autoTable(doc, {
      startY: tabY, margin: { right: pageWidth / 2 + 3 },
      head: [['ORGANISTAS', 'TOTAL']],
      body: [['ÓRGÃO', stats.organistas]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center', cellPadding: 0.8 },
      headStyles: { fillColor: [60, 60, 60] },
      columnStyles: { 0: { halign: 'left' } }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 3, margin: { right: pageWidth / 2 + 3 },
      head: [['IRMANDADE', 'IRMÃOS', 'IRMÃS', 'TOTAL']],
      body: [['CORAL', stats.irmaos, stats.irmas, stats.irmandade]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center', cellPadding: 0.8 },
      headStyles: { fillColor: [80, 80, 80] },
      columnStyles: { 0: { halign: 'left' } }
    });

    // 9. TOTAIS E RESUMO MINISTERIAL
    const totY = Math.max(doc.lastAutoTable.finalY + 10, nextMooY + 5);
    doc.setFillColor(30, 30, 30); doc.rect(margin, totY, pageWidth - 20, 8, 'F');
    doc.setFont("times", "bold"); doc.setFontSize(9); doc.setTextColor(255);
    doc.text(`MÚSICOS: ${stats.musicos}  |  ORGANISTAS: ${stats.organistas}  |  CORAL: ~ ${stats.irmandade}  |  TOTAL GERAL: ${stats.geral}`, pageWidth / 2, totY + 5.5, { align: 'center' });

    doc.setTextColor(0);
    const resY = totY + 14;
    doc.setFontSize(8); doc.setFont("times", "bold");
    doc.text("RESUMO DA PRESENÇA MINISTERIAL", margin, resY);
    doc.setFont("times", "normal");
    doc.text(`ANCIÃES: ${stats.ancianosCasa + stats.ancianosVisitas}`, margin, resY + 5);
    doc.text(`DIÁCONOS: ${stats.diaconosCasa + stats.diaconosVisitas}`, margin, resY + 9);
    doc.text(`COOP. OFÍCIO: ${stats.coopOficioCasa + stats.coopOficioVisitas}`, margin, resY + 13);
    doc.text(`COOP. RJM: ${stats.coopJovensCasa + stats.coopJovensVisitas}`, margin, resY + 17);

    doc.text(`ENC. REGIONAIS: ${stats.encRegionalCasa + stats.encRegionalVisitas}`, rightColX, resY + 5);
    doc.text(`EXAMINADORAS: ${stats.examinadorasCasa + stats.examinadorasVisitas}`, rightColX, resY + 9);
    doc.text(`ENC. LOCAIS: ${stats.encLocalCasa + stats.encLocalVisitas}`, rightColX, resY + 13);

    // 10. TABELA MINISTERIAL
    const localRows = (ataData?.presencaLocalFull || []).map(p => [p.role, toTitleCase(p.nome), sedeNomeFormatado.toUpperCase(), cidadeNome.toUpperCase(), "-", "-"]);
    const visitRows = (ataData?.visitantes || []).map(v => [v.min, toTitleCase(v.nome), (v.bairro || v.comum || "---").toUpperCase(), (v.cidadeUf || "---").toUpperCase(), v.dataEnsaio || "-", v.hora || "-"]);

    const finalMinBody = [];
    if (localRows.length > 0) {
      finalMinBody.push([{ content: 'LOCAL', colSpan: 6, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left' } }]);
      localRows.forEach(r => finalMinBody.push(r));
    }
    if (visitRows.length > 0) {
      finalMinBody.push([{ content: 'VISITAS', colSpan: 6, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left' } }]);
      visitRows.forEach(r => finalMinBody.push(r));
    }

    autoTable(doc, {
      startY: resY + 22,
      head: [['MINISTÉRIO', 'NOME COMPLETO', 'COMUM/BAIRRO', 'CIDADE/UF', 'ENSAIO', 'HORA']],
      body: finalMinBody,
      theme: 'grid', styles: { fontSize: 6, font: "times", cellPadding: 0.8, halign: 'center' },
      headStyles: { fillColor: [40, 40, 40] },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'left' }, 2: { halign: 'left' } },
      margin: { bottom: 35 },
      didDrawPage: (data) => {
        const footerY = pageHeight - 18;
        if (qrImageData) {
          doc.addImage(qrImageData, 'PNG', margin + 2, footerY - 5, 12, 12);
        }
        doc.setFontSize(7); doc.setFont("times", "bold");
        doc.text(sedeNomeFormatado.toUpperCase(), margin + 17, footerY - 2);
        doc.setFontSize(6.5); doc.setFont("times", "normal");
        doc.text(`${rua}, ${num} - ${bairro} • ${cidadeNome}`, margin + 17, footerY + 1);
        doc.text(`Culto: ${sedeFullData?.diasSelecao?.map(d => translateDay(d)).join(' e ') || "---"} às ${sedeFullData?.horaCulto || '---'} | Ensaio Local: ${sedeFullData?.ensaioLocal || '---'} às ${sedeFullData?.horaEnsaio || '---'}`, margin + 17, footerY + 4);
        doc.setFontSize(6.5); doc.text(`Secretaria de Música ${toTitleCase(regionalNome)} • Sistema de Gestão Digital`, pageWidth / 2, pageHeight - 5, { align: "center" });
      }
    });

    doc.save(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]} - ATA REGIONAL ${sedeNomePura.toUpperCase()}.pdf`);
  }
};