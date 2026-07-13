import jsPDF from 'jspdf'; // Importa a biblioteca principal para gerar arquivos PDF
import autoTable from 'jspdf-autotable'; // Importa o complemento para criar tabelas automáticas no PDF
import QRCode from 'qrcode'; // Importa a biblioteca para converter textos/links em imagens de QR Code

// Função que deixa apenas a primeira letra de cada palavra maiúscula (Ex: SILAS -> Silas)
export const toTitleCase = (str) => {
  if (!str) return ""; // Se não houver texto, retorna vazio para não quebrar o código
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); // Transforma em minúsculo e aumenta a primeira letra
};

export const pdfEventService = {
  /**
   * Gera o PDF da Ata de Ensaio Local
   * v5.7 - Protocolo de Individualidade por Registro e Ordenação Hierárquica.
   */
  generateAtaEnsaio: async (stats, ataData, userData, counts, comumFullData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); // Cria o documento PDF em pé, usando milímetros e tamanho A4
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
    const localidadePura = (comumFullData?.comum || ataData?.comumNome || userData?.comum || "Localidade"); // Pega o nome da igreja de origem
    const comumNomeFormatado = toTitleCase(localidadePura); // Formata o nome para ficar visualmente agradável
    
    let cidadeRaw = comumFullData?.cidadeNome || ataData?.cidadeNome || userData?.cidadeNome || "Jundiaí"; // Busca o nome da cidade no banco
    if (cidadeRaw === "N6xKnEAxY3Ku2FOez55K") cidadeRaw = "JUNDIAÍ"; // Correção técnica para códigos antigos de cidade
    const cidadeNome = toTitleCase(cidadeRaw); // Formata o nome da cidade

    const regionalNome = `Regional ${toTitleCase(userData?.activeRegionalName || userData?.regional || "Jundiaí")}`; // Monta o texto da Regional
    
    const rawDate = ataData?.date || counts?.date || "2026-01-01"; // Pega a data gravada no ensaio
    const dateParts = rawDate.split('-'); // Divide a data onde tem traços (ano-mes-dia)
    const dataFormatada = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // Monta no formato brasileiro (dia/mes/ano)

    // LÓGICA PARA HORÁRIO DO CULTO (Muda se for domingo para atender horários especiais)
    const dataObjeto = new Date(rawDate + "T12:00:00"); // Cria um objeto de data seguro
    const isDomingo = dataObjeto.getDay() === 0; // Verifica se o dia da semana é Domingo (0)
    const horaCultoExibir = isDomingo 
      ? (comumFullData?.horaCultoDomingo || comumFullData?.horaCulto || "---") // Se for domingo, tenta pegar o horário de domingo
      : (comumFullData?.horaCulto || "---"); // Se não for, pega o horário de semana

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
    doc.text("Relatório do Serviço de Ensaio Local", pageWidth / 2, 15, { align: "center" }); // Escreve o título centralizado
    doc.setFontSize(12); // Diminui para tamanho 12
    doc.text("CONGREGAÇÃO CRISTÃ NO BRASIL", pageWidth / 2, 21, { align: "center" }); // Escreve o nome da CCB
    doc.setFont("times", "normal"); // Muda para fonte normal (sem negrito)
    doc.setFontSize(10); // Tamanho 10
    doc.text(`${comumNomeFormatado} - ${cidadeNome}`, pageWidth / 2, 27, { align: "center" }); // Escreve a Comum e Cidade
    doc.text(regionalNome, pageWidth / 2, 32, { align: "center" }); // Escreve a Regional
    doc.setFontSize(9); // Tamanho 9
    doc.setFont("times", "bold"); // Volta para Negrito para destacar a data
    doc.text(`DATA: ${dataFormatada}`, pageWidth - margin, 38, { align: "right" }); // Escreve a data no canto direito
    doc.line(margin, 39, pageWidth - margin, 39); // Desenha uma linha preta separadora

    // 3. TABELA DE INSTRUMENTOS DA ORQUESTRA
    const officialKeys = ['violino','viola','violoncelo','flauta','oboe','corneingles','corne_ingles','fagote','clarinete','claronealto','clarone_alto','claronebaixo','clarone_baixo','saxsoprano','sax_soprano','saxalto','sax_alto','saxtenor','sax_tenor','saxbaritono','sax_baritono','trompete','flugelhorn','trompa','trombone','eufonio','tuba','acordeon']; // Ordem oficial de apresentação
    const presentKeys = Object.keys(counts || {}).filter(key => !key.startsWith('meta_') && !['orgao', 'irmandade', 'Coral', 'date'].includes(key)); // Filtra o que não é instrumento
    const sortedKeys = presentKeys.sort((a, b) => { // Organiza os instrumentos conforme a ordem oficial
      const idxA = officialKeys.indexOf(a.replace(/_/g, '').toLowerCase());
      const idxB = officialKeys.indexOf(b.replace(/_/g, '').toLowerCase());
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const orqBody = sortedKeys.map((key) => { // Monta as linhas da tabela de orquestra
      const d = counts[key] || {};
      const total = Number(d.total) || 0; // Quantidade total presente
      const comum = Number(d.comum) || 0; // Quantidade da casa
      return [d.name || key.replace(/_/g, ' ').toUpperCase(), comum, Math.max(0, total - comum), total]; // Linha com Nome, Casa, Visita e Total
    });

    autoTable(doc, { // Gera a tabela de instrumentos no PDF
      startY: 42, margin: { right: pageWidth / 2 + 2 }, // Define a posição e a margem para ficar na esquerda
      head: [['INSTRUMENTOS', 'COMUM', 'VISITAS', 'TOTAL']], // Títulos das colunas
      body: orqBody, // Dados coletados acima
      theme: 'grid', // Estilo de grade
      styles: { fontSize: 6.5, cellPadding: 0.8, font: "times", halign: 'center' }, // Letra pequena para caber todos instrumentos
      headStyles: { fillColor: [40, 40, 40], textColor: 255, halign: 'center' }, // Cabeçalho escuro com letra branca
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' }, 3: { fillColor: [240, 240, 240] } } // Primeira coluna à esquerda e total com fundo cinza
    });

    autoTable(doc, { // Gera a tabela das organistas abaixo da orquestra
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['ORGANISTAS', 'COMUM', 'VISITAS', 'TOTAL']],
      body: [['ÓRGÃO', Number(counts?.orgao?.comum) || 0, Math.max(0, stats.organistas - (counts?.orgao?.comum || 0)), stats.organistas]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    autoTable(doc, { // Gera a tabela do coral/irmandade
      startY: doc.lastAutoTable.finalY + 4, margin: { right: pageWidth / 2 + 2 },
      head: [['CORAL', 'IRMÃOS', 'IRMÃS', 'TOTAL']],
      body: [['IRMANDADE', stats.irmaos, stats.irmas, stats.irmandade]],
      theme: 'grid', styles: { fontSize: 6.5, font: "times", halign: 'center' },
      headStyles: { fillColor: [80, 80, 80], textColor: 255 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    // 4. BLOCO DE TOTAIS GERAIS
    let totalsY = doc.lastAutoTable.finalY + 8; // Define a altura com base na última tabela
    doc.setFontSize(8); doc.setFont("times", "normal");
    doc.text(`MÚSICOS: ${stats.musicos} | ORGANISTAS: ${stats.organistas} | CORAL: ${stats.irmandade}`, margin, totalsY); // Mostra o resumo das categorias
    totalsY += 5;
    doc.setFont("times", "bold"); // Negrito para destaque
    doc.text(`TOTAL ORQUESTRA: ${stats.musicos + stats.organistas}`, margin, totalsY); // Soma músicos e organistas
    totalsY += 6;
    doc.setFontSize(10);
    doc.text(`TOTAL GERAL DE PRESENTES: ${stats.geral}`, margin, totalsY); // Soma total de toda irmandade

    // 5. COLUNA DA DIREITA (Atendimento e Regência)
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ATENDIMENTO", rightColX, 45); // Título atendimento
    doc.setFont("times", "normal"); doc.setFontSize(8);
    doc.text(`Nome: ${toTitleCase(ataData?.atendimentoNome) || "---"}`, rightColX, 50); // Nome de quem atendeu
    doc.text(`Ministério: ${toTitleCase(ataData?.atendimentoMin) || "---"}`, rightColX, 54); // Cargo de quem atendeu

    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("HINOS TOCADOS", rightColX, 62); // Título hinos
    const todosHinos = (ataData?.partes || []).flatMap(p => p.hinos || []).filter(h => h && h.trim() !== ""); // Junta todos os hinos do ensaio
    doc.setFont("times", "normal"); doc.setFontSize(8);
    const hinosTxt = doc.splitTextToSize(todosHinos.join(" - ") || "---", 85); // Quebra o texto dos hinos para não sair da folha
    doc.text(hinosTxt, rightColX, 67); // Escreve a lista de hinos
    const posHinosY = 67 + (hinosTxt.length * 4);
    doc.setFont("times", "bold");
    doc.text(`TOTAL DE HINOS: ${todosHinos.length}`, rightColX, posHinosY); // Mostra a contagem total de hinos

    // 6. ESTATÍSTICA MOO (EQUILÍBRIO NAIPES)
    const mooY = posHinosY + 10; // Define a altura
    doc.setFont("times", "bold"); doc.setFontSize(9);
    doc.text("ESTATÍSTICA REF. MOO", rightColX, mooY); // Título MOO
    const totalM = Math.max(1, stats.musicos); // Evita divisão por zero
    const mooNaipes = [ // Configura as metas de cada naipe
      { label: 'Cordas', val: stats.cordas, ref: 50, color: [217, 119, 6] },
      { label: 'Madeiras*', val: stats.madeiras + stats.saxofones, ref: 25, color: [5, 150, 105] },
      { label: 'Metais', val: stats.metais, ref: 25, color: [220, 38, 38] }
    ];
    mooNaipes.forEach((n, i) => { // Cria as barras de porcentagem uma abaixo da outra
      const rowY = mooY + 6 + (i * 12);
      const percReal = (n.val / totalM) * 100;
      doc.setFontSize(7); doc.setFont("times", "bold");
      doc.text(`${n.label.toUpperCase()} [${n.val}/${totalM}]`, rightColX, rowY); // Nome do naipe e quantidades
      doc.setFont("times", "normal");
      doc.text(`${percReal.toFixed(0)}% / Meta ${n.ref}%`, pageWidth - margin, rowY, { align: 'right' }); // Porcentagem e meta
      doc.setFillColor(245, 245, 245); doc.rect(rightColX, rowY + 2, 85, 3, 'F'); // Desenha fundo da barra (cinza)
      doc.setFillColor(n.color[0], n.color[1], n.color[2]); // Escolhe a cor do naipe
      doc.rect(rightColX, rowY + 2, Math.min(85, (percReal / 100) * 85), 3, 'F'); // Desenha o preenchimento da barra
    });

    const finalMooY = mooY + (mooNaipes.length * 12) + 2;
    doc.setFontSize(6.5); doc.setFont("times", "italic");
    doc.text("* Nota: A seção de Madeiras contempla a família dos Saxofones.", rightColX, finalMooY + 4); // Observação técnica

    // 7. BLOCO DE OCORRÊNCIAS DO ENSAIO
    const rawOcorrencias = ataData?.ocorrencias || []; // Pega as anotações do ensaio
    const listaFinalOcorr = []; // Lista limpa de textos
    const mapA = {}; // Mapa para agrupar apresentações de novos músicos
    rawOcorrencias.forEach(o => {
      if (o.tipo === 'A' && o.instrumento && o.etapa) { // Se for tipo Apresentação, agrupa por instrumento/etapa
        const key = `${o.instrumento}|${o.etapa}`;
        if (!mapA[key]) mapA[key] = [];
        mapA[key].push(o.nome);
      } else {
        listaFinalOcorr.push(o.texto); // Se for aviso comum, apenas adiciona o texto
      }
    });
    Object.entries(mapA).forEach(([key, nomes]) => { // Transforma o agrupamento em frases automáticas
      const [inst, etapa] = key.split('|');
      const frase = `${nomes.length > 1 ? 'Apresentados' : 'Apresentado(a)'} neste ensaio ${nomes.length > 1 ? 'os irmãos' : 'o(a) irmão(ã)'} ${nomes.join(" e ")}, executando o instrumento ${inst}, na etapa de ${etapa}, a partir desta data.`;
      listaFinalOcorr.push(frase);
    });

    let lastRightColY = finalMooY + 8;
    if (listaFinalOcorr.length > 0) { // Se existirem avisos, desenha no PDF
      const ocorrenciasY = finalMooY + 14; 
      doc.setFont("times", "bold"); doc.setFontSize(9);
      doc.text("OCORRÊNCIAS DO ENSAIO", rightColX, ocorrenciasY);
      doc.setFont("times", "italic"); doc.setFontSize(7.5);
      let currentOcorrY = ocorrenciasY + 5;
      listaFinalOcorr.forEach(txt => {
        const lines = doc.splitTextToSize(`• ${txt}`, 85); // Quebra o texto do aviso
        doc.text(lines, rightColX, currentOcorrY); // Escreve o aviso com um ponto na frente
        currentOcorrY += (lines.length * 3.5) + 1; // Pula linha proporcional ao texto
      });
      lastRightColY = currentOcorrY;
    }

    // 8. TABELA MINISTERIAL (INDIVIDUALIDADE POR REGISTRO E ORDENAÇÃO)
    // Define a ordem de prioridade dos cargos
    const pesos = { 'Ancião': 1, 'Diácono': 2, 'Cooperador do Ofício': 3, 'Cooperador RJM': 4, 'Encarregado Regional': 5, 'Examinadora': 6, 'Encarregado Local': 7, 'Secretário da Música': 8, 'Instrutor': 9, 'Músico': 10 };
    
    // Prepara os dados da casa (Local) individualmente
    const localRows = (ataData?.presencaLocalFull || []).map(p => ({
      cargo: p.role, 
      nome: toTitleCase(p.nome), 
      comum: comumNomeFormatado, 
      cidade: cidadeNome, 
      data: "---", 
      hora: "---", 
      peso: pesos[p.role] || 99 
    }));

    // Prepara os dados dos visitantes individualmente
    const visitorRows = (ataData?.visitantes || []).map(v => ({
      cargo: v.min, 
      nome: toTitleCase(v.nome), 
      comum: toTitleCase(v.bairro || v.comum), 
      cidade: toTitleCase(v.cidadeUf), 
      data: v.dataEnsaio || "---", 
      hora: v.hora || "---", 
      peso: pesos[v.min] || 99 
    }));

    // Aplica a ordenação: Primeiro pelo peso do cargo, depois pelo nome em ordem alfabética
    localRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));
    visitorRows.sort((a, b) => a.peso - b.peso || a.nome.localeCompare(b.nome));

    const finalMinBody = []; // Corpo final da tabela ministerial
    if (localRows.length > 0) {
      finalMinBody.push([{ content: 'LOCAL', colSpan: 6, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'left' } }]); // Título da seção Local
      localRows.forEach(r => finalMinBody.push([r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora])); // Cada irmão é uma linha única
    }
    if (visitorRows.length > 0) {
      finalMinBody.push([{ content: 'VISITAS', colSpan: 6, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'left' } }]); // Título da seção Visitas
      visitorRows.forEach(r => finalMinBody.push([r.cargo, r.nome, r.comum, r.cidade, r.data, r.hora])); // Cada visita é uma linha única (impede agrupamento por nome igual)
    }

    autoTable(doc, { // Desenha a tabela ministerial final no PDF
      startY: Math.max(totalsY + 12, doc.lastAutoTable.finalY + 12, lastRightColY + 8), // Escolhe a posição mais baixa livre
      head: [['MINISTÉRIO', 'NOME', 'COMUM/BAIRRO', 'CIDADE/UF', 'DATA ENS.', 'HORA']], // Cabeçalhos mantidos
      body: finalMinBody, // Conteúdo organizado individualmente
      theme: 'grid', styles: { fontSize: 6, font: "times", cellPadding: 1, halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }, // Destaca o nome do irmão em Negrito
      margin: { bottom: 35 }, 
      didDrawPage: (data) => {
        // RODAPÉ DA PÁGINA (Com endereço da igreja e QR Code)
        const footerY = pageHeight - 18;
        if (qrImageData) {
          doc.addImage(qrImageData, 'PNG', margin + 2, footerY - 5, 12, 12); // Desenha o QR Code
        }
        doc.setFontSize(7); doc.setFont("times", "bold");
        doc.text(comumNomeFormatado.toUpperCase(), margin + 17, footerY - 2); // Nome da Comum em destaque
        doc.setFontSize(6.5); doc.setFont("times", "normal");
        doc.text(`${rua}, ${num} - ${bairro} • ${cidadeNome}`, margin + 17, footerY + 1); // Endereço físico
        doc.text(`Culto: ${comumFullData?.diasSelecao?.map(d => translateDay(d)).join(' e ') || "---"} às ${horaCultoExibir} | Ensaio Local: ${comumFullData?.ensaioLocal || '---'} às ${comumFullData?.horaEnsaio || '---'}`, margin + 17, footerY + 4); // Dias de culto
        doc.setFontSize(6.5); doc.text(`Secretaria de Música ${regionalNome} • Sistema de Gestão Digital`, pageWidth / 2, pageHeight - 5, { align: "center" }); // Identificação do sistema
      }
    });

    // Finaliza o processo e baixa o arquivo com o nome da igreja e data
    doc.save(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]} - Ata ${localidadePura.toUpperCase()} - Ensaio Local.pdf`);
  }
};