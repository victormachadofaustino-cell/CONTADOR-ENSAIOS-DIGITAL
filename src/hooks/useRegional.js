import { useMemo } from 'react';

/**
 * HISTÓRICO DE MODIFICAÇÕES: v2.6
 * Correção de Grosseiro de Agregação: Segregação matemática estrita entre Comum e Visita.
 * Alinhamento com as chaves sanitizadas do banco de dados pós-faxina.
 */
export const useAnalyticsData = (eventsGlobalArray) => {
  return useMemo(() => {
    if (!eventsGlobalArray || eventsGlobalArray.length === 0) return [];

    // Mapeamento dos meses para os ticks do XAxis
    const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Agrupa e processa os dados cronologicamente
    const processados = eventsGlobalArray.map(event => {
      const dateObj = new Date(event.date || event.createdAt);
      const mesNome = mesesLabels[dateObj.getMonth()];

      // Inicializadores zerados para a soma cirúrgica na memória RAM
      let cordasLocal = 0, cordasVisita = 0;
      let madeirasLocal = 0, madeirasVisita = 0;
      let metaisLocal = 0, metaisVisita = 0;
      let teclasLocal = 0, teclasVisita = 0;
      let orgaoLocal = 0, orgaoVisita = 0;
      let irmandadeTotal = 0;

      const counts = event.counts || {};

      // Varredura estrita das chaves pós-faxina (Singular e Caixa Baixa)
      Object.keys(counts).forEach(key => {
        const data = counts[key] || {};
        
        // Se for metadado técnico de controle, ignora
        if (key.startsWith('meta_')) return;

        // Extração segura dos numéricos do documento do Firestore
        const comumCount = parseInt(data.comum) || 0;
        const totalCount = parseInt(data.total) || 0;
        
        // Regra de Derivação Eclesiástica: Visita = Total - Comum (Se total for maior)
        const visitaCount = totalCount >= comumCount ? (totalCount - comumCount) : 0;

        if (key === 'violino' || key === 'viola' || key === 'violoncelo') {
          cordasLocal += comumCount;
          cordasVisita += visitaCount;
        } 
        else if (key === 'clarinete' || key === 'flauta' || key === 'oboe' || key === 'fagote' || key === 'corneingles' || key === 'claronealto' || key === 'claronebaixo') {
          madeirasLocal += comumCount;
          madeirasVisita += visitaCount;
        } 
        else if (key === 'saxalto' || key === 'saxtenor' || key === 'saxsoprano' || key === 'saxbaritono') {
          // Unifica a família dos saxofones na gaveta de visualização correta
          madeirasLocal += comumCount;
          madeirasVisita += visitaCount;
        } 
        else if (key === 'trompete' || key === 'trombone' || key === 'trompa' || key === 'tuba' || key === 'eufonio' || key === 'flugelhorn') {
          metaisLocal += comumCount;
          metaisVisita += visitaCount;
        } 
        else if (key === 'acordeon') {
          teclasLocal += comumCount;
          teclasVisita += visitaCount;
        } 
        else if (key === 'orgao') {
          orgaoLocal += comumCount;
          orgaoVisita += visitaCount;
        } 
        else if (key === 'coral') {
          irmandadeTotal += totalCount;
        }
      });

      // Consolidação das duas frentes Orquestrais de forma segregada
      const totalLocaisConsolidados = cordasLocal + madeirasLocal + metaisLocal + teclasLocal + orgaoLocal;
      const totalVisitasConsolidadas = cordasVisita + madeirasVisita + metaisVisita + teclasVisita + orgaoVisita;

      // Extração volumétrica de hinos da Ata
      const hTotal = parseInt(event.ata?.hinosChamados) || 0;
      
      return {
        label: mesNome,
        timestamp: event.date || event.createdAt,
        // Chaves corretas enviadas para o BarChart do Anexo 1
        totalOrq: totalLocaisConsolidados, // Agora representa estritamente os 38 locais
        irmandade: totalVisitasConsolidadas, // Agora representa estritamente as 74 visitas
        // Chaves internas para os gráficos de linhas secundários
        cordas: cordasLocal,
        cordasV: cordasVisita,
        madeiras: madeirasLocal,
        madeirasV: madeirasVisita,
        metais: metaisLocal,
        metaisV: metaisVisita,
        teclas: teclasLocal,
        teclasV: teclasVisita,
        organistas: orgaoLocal,
        organistasV: orgaoVisita,
        // Métricas litúrgicas
        hTotal,
        h1: Math.ceil(hTotal * 0.6),
        h2: Math.floor(hTotal * 0.4)
      };
    });

    // Ordena cronologicamente para o Recharts não cruzar as linhas
    return processados.sort((a, b) => a.timestamp - b.timestamp);
  }, [eventsGlobalArray]);
};