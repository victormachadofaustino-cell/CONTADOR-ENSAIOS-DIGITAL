/**
 * SERVIÇO DE FORMATAÇÃO PARA COMPARTILHAMENTO v1.1
 * Centraliza a geração de templates para alimentação e estatística.
 * Resolve o bug de localidade utilizando o 'source of truth' do evento.
 * Nota: Funções alteradas para retornar strings (compatível com navigator.share).
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
  obterTextoAlimentacao: (event) => {
    const counts = event?.counts || {};
    const data = formatarData(event?.date);
    
    // O pulo do gato: Buscamos o nome que está gravado no evento, não no perfil do usuário
    const localidade = (event?.comumNome || "LOCALIDADE NÃO IDENTIFICADA").toUpperCase();

    // Cálculos de soma (Lógica solicitada)
    const totalMusicos = Object.keys(counts)
      .filter(key => !['irmandade', 'Coral', 'orgao'].includes(key) && !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.total) || 0), 0);

    const totalOrganistas = parseInt(counts['orgao']?.total) || 0;
    
    const totalIrmandade = (parseInt(counts['irmandade']?.irmaos) || 0) + (parseInt(counts['irmandade']?.irmas) || 0);
    const totalCoral = (parseInt(counts['Coral']?.irmaos) || 0) + (parseInt(counts['Coral']?.irmas) || 0);
    
    const totalGeral = totalMusicos + totalOrganistas + totalIrmandade + totalCoral;

    return `Serviço de Ensaio Local - ${data} 🎵
${localidade}

Resumo da Contagem para Alimentação: 🍽️

Total Geral: ${totalGeral} ✅

* Orquestra: ${totalMusicos + totalOrganistas} 🎶
      • Músicos ${totalMusicos} + Organistas ${totalOrganistas}
* Irmandade: ${totalIrmandade + totalCoral} 🗣️

Deus abençoe grandemente. 🙏`;
  },

  /**
   * MODELO 2: ESTATÍSTICO (REGIONAL/COMISSÃO)
   * Detalhamento de cargos e ministério
   * Retorna: String formatada
   */
  obterTextoEstatistico: (event) => {
    const counts = event?.counts || {};
    const data = formatarData(event?.date);
    const localidade = (event?.comumNome || "LOCALIDADE NÃO IDENTIFICADA").toUpperCase();

    // Somas Técnicas
    const totalMusicos = Object.keys(counts)
      .filter(key => !['irmandade', 'Coral', 'orgao'].includes(key) && !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.total) || 0), 0);
    
    const totalOrganistas = parseInt(counts['orgao']?.total) || 0;
    const totalIrmandadeCoral = (parseInt(counts['irmandade']?.irmaos) || 0) + (parseInt(counts['irmandade']?.irmas) || 0) + 
                                (parseInt(counts['Coral']?.irmaos) || 0) + (parseInt(counts['Coral']?.irmas) || 0);
    
    const totalGeral = totalMusicos + totalOrganistas + totalIrmandadeCoral;

    // Busca de Cargos nos Metadados ou nos campos 'enc'
    const totalEncLoc = Object.keys(counts)
      .filter(key => !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.enc) || 0), 0);
    
    const totalEncReg = event?.ata?.presencaLocalFull?.filter(m => m.role === 'Encarregado Regional').length || 0;
    const totalMinisterio = event?.ata?.presencaLocal?.length || 0;
    const totalExam = parseInt(counts['orgao']?.enc) || 0;

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