/**
 * SERVIÇO DE FORMATAÇÃO PARA COMPARTILHAMENTO v1.3
 * Centraliza a geração de templates para alimentação e estatística.
 * Resolve o bug de localidade utilizando o 'source of truth' do evento.
 * Nota: Funções alteradas para retornar strings (compatível com navigator.share).
 * v1.3: Adicionada Blindagem de Dados via parâmetro 'stats' para evitar valores zerados.
 */

const formatarData = (dateStr) => {
  if (!dateStr) return '--/--/----';
  const [ano, mes, dia] = dateStr.split('-');
  return `${dia}/${mes}/${ano}`;
};

export const whatsappService = {
  
  /**
   * MODELO 1: ALIMENTAÇÃO (COZINHA)
   * Foco em Músicos + Organistas e Irmandade
   * Retorna: String formatada
   */
  obterTextoAlimentacao: (event, stats = null) => {
    const counts = event?.counts || {};
    const data = formatarData(event?.date);
    
    // O pulo do gato: Buscamos o nome que está gravado no evento, não no perfil do usuário
    const localidade = (event?.comumNome || "LOCALIDADE NÃO IDENTIFICADA").toUpperCase();

    // BLINDAGEM v1.3: Prioriza os stats calculados na tela para evitar delay do Firebase
    const totalMusicos = stats ? stats.musicos : Object.keys(counts)
      .filter(key => !['irmandade', 'Coral', 'orgao'].includes(key) && !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.total) || 0), 0);

    const totalOrganistas = stats ? stats.organistas : (parseInt(counts['orgao']?.total) || 0);
    
    const totalIrmandade = stats ? stats.irmandade : ((parseInt(counts['irmandade']?.irmaos) || 0) + (parseInt(counts['irmandade']?.irmas) || 0) + 
                           (parseInt(counts['Coral']?.irmaos) || 0) + (parseInt(counts['Coral']?.irmas) || 0));
    
    const totalGeral = stats ? stats.geral : (totalMusicos + totalOrganistas + totalIrmandade);

    return `Serviço de Ensaio Local - ${data} 🎵
${localidade}

Resumo da Contagem para Alimentação: 🍽️

Total Geral: ${totalGeral} ✅

* Orquestra: ${totalMusicos + totalOrganistas} 🎶
      • Músicos ${totalMusicos} + Organistas ${totalOrganistas}
* Irmandade: ${totalIrmandade} 🗣️

Deus abençoe grandemente. 🙏`;
  },

  /**
   * MODELO 2: ESTATÍSTICO (REGIONAL/COMISSÃO)
   * Detalhamento de cargos e ministério
   * Retorna: String formatada
   */
  obterTextoEstatistico: (event, stats = null) => {
    const counts = event?.counts || {};
    const data = formatarData(event?.date);
    const localidade = (event?.comumNome || "LOCALIDADE NÃO IDENTIFICADA").toUpperCase();

    // Somas Técnicas com Fallback para Stats da Tela
    const totalMusicos = stats ? stats.musicos : Object.keys(counts)
      .filter(key => !['irmandade', 'Coral', 'orgao'].includes(key) && !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.total) || 0), 0);
    
    const totalOrganistas = stats ? stats.organistas : (parseInt(counts['orgao']?.total) || 0);
    
    const totalIrmandadeCoral = stats ? stats.irmandade : ((parseInt(counts['irmandade']?.irmaos) || 0) + (parseInt(counts['irmandade']?.irmas) || 0) + 
                                (parseInt(counts['Coral']?.irmaos) || 0) + (parseInt(counts['Coral']?.irmas) || 0));
    
    const totalGeral = stats ? stats.geral : (totalMusicos + totalOrganistas + totalIrmandadeCoral);

    // Busca de Cargos nos Metadados
    const totalEncLoc = stats ? stats.encLocal : Object.keys(counts)
      .filter(key => !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.enc) || 0), 0);
    
    const totalEncReg = stats ? stats.encRegional : (event?.ata?.presencaLocalFull?.filter(m => m.role === 'Encarregado Regional').length || 0);
    const totalMinisterio = stats ? stats.ministerio_oficio : (event?.ata?.presencaLocal?.length || 0);
    const totalExam = stats ? stats.examinadoras : (parseInt(counts['orgao']?.enc) || 0);

    return `Serviço de Ensaio Local - ${data} 🎵
${localidade} 📍

Resumo Estatístico: 📊

* Músicos: ${totalMusicos}
* Organistas: ${totalOrganistas}
* Irmandade (Coral): ${totalIrmandadeCoral}

Total Geral: ${totalGeral}

* Encarregados Regionais: ${totalEncReg}
* Encarregados Locais: ${totalEncLoc}
* Examinadoras: ${totalExam}
* Ministério: ${totalMinisterio}

Deus abençoe grandemente!`;
  }
};