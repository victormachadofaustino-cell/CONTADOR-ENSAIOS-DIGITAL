/**
 * SERVIÇO DE FORMATAÇÃO PARA COMPARTILHAMENTO v1.10
 * Centraliza a geração de templates para alimentação e estatística.
 * v1.10: Refinamento estético premium do modelo de Alimentação com sub-naipes da orquestra.
 * Garante fidelidade de dados para Ensaio Local e Regional sem omissões.
 */

const formatarData = (dateStr) => { // [Funcionamento]: Converte strings técnicas de datas "2026-05-16" para formato visual "16/05/2026".
  if (!dateStr) return '--/--/----'; // [Funcionamento]: Fallback de segurança caso a data não esteja preenchida na RAM.
  const [ano, mes, dia] = dateStr.split('-'); // [Funcionamento]: Quebra a data nos traços separando os conjuntos cronológicos.
  return `${dia}/${mes}/${ano}`; // [Funcionamento]: Remonta a string posicionando o dia e o mês no cabeçalho.
}; // [Funcionamento]: Fim da função utilitária de data.

const toTitleCase = (str) => { // [Funcionamento]: Função auxiliar que padroniza nomes próprios e textos litúrgicos com iniciais maiúsculas.
  if (!str) return ""; // [Funcionamento]: Aborta se a string for nula ou inválida.
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); // [Funcionamento]: Diminui o texto e joga a primeira letra em caixa alta.
}; // [Funcionamento]: Encerra a função utilitária de capitalização.

export const whatsappService = { // [Funcionamento]: Exporta a classe mestre de formatação e templates para o WhatsApp do app.
  
  /**
   * MODELO 1: ALIMENTAÇÃO (COZINHA / COPA) - REFINADO EM NÍVEL PREMIUM CCB
   */
  obterTextoAlimentacao: (event, stats = null) => { // [Funcionamento]: Constrói a mensagem otimizada para o controle lanche da Copa.
    const counts = event?.counts || {}; // [Funcionamento]: Captura o dicionário de contagens com barreira de segurança.
    const data = formatarData(event?.date || event?.data); // [Funcionamento]: Formata a data de forma reativa.
    const tipoEnsaio = event?.scope === 'regional' ? 'Regional' : 'Local'; // [Funcionamento]: Identifica se o título deve ser Local ou Regional.
    const localidadePura = (event?.comumNome || "LOCALIDADE NÃO IDENTIFICADA"); // [Funcionamento]: Puxa o nome da comum sede.
    const comumNome = toTitleCase(localidadePura); // [Funcionamento]: Limpa e padroniza o nome da comum para os leigos.

    // Inicializa a árvore de contagem de alimentação isolada
    let totalMusicos = 0; // [Funcionamento]: Cria a gaveta para somar os músicos de fileiras.
    let totalOrganistas = 0; // [Funcionamento]: Cria a gaveta para somar as organistas de teclas.
    let totalIrmandade = 0; // [Funcionamento]: Cria a gaveta para somar as vozes da irmandade.

    if (stats) { // [Funcionamento]: Se os cálculos da tela estiverem ativos na RAM, aproveita as chaves calculadas de custo zero.
      totalMusicos = stats.musicos || 0; // [Funcionamento]: Copia o valor de músicos de fileira da RAM.
      totalOrganistas = stats.organistas || 0; // [Funcionamento]: Copia o valor de organistas da RAM.
      totalIrmandade = stats.irmandade || 0; // [Funcionamento]: Copia o valor de irmandade da RAM.
    } else if (counts) { // [Funcionamento]: Fallback reativo caso o disparo ocorra direto de um snap de dados brutos.
      totalOrganistas = parseInt(counts['orgao']?.total) || 0; // [Funcionamento]: Captura o total absoluto de órfãos/órgão.
      totalIrmandade = (parseInt(counts['irmandade']?.irmaos) || 0) + (parseInt(counts['irmandade']?.irmas) || 0) + 
                       (parseInt(counts['Coral']?.irmaos) || 0) + (parseInt(counts['Coral']?.irmas) || 0); // [Funcionamento]: Acumula irmandade e coral.
      totalMusicos = Object.keys(counts) // [Funcionamento]: Varre as chaves remanescentes para descobrir os sopros e arcos.
        .filter(key => !['irmandade', 'Coral', 'orgao'].includes(key) && !key.startsWith('meta_')) // [Funcionamento]: Ignora congregação e órgãos.
        .reduce((acc, key) => acc + (parseInt(counts[key]?.total) || 0), 0); // [Funcionamento]: Executa a redução aritmética.
    } // [Funcionamento]: Fim do bloco de resolução matemática.

    const totalOrquestra = totalMusicos + totalOrganistas; // [Funcionamento]: Junta os músicos e organistas no bloco musical da orquestra.
    const totalGeral = totalOrquestra + totalIrmandade; // [Funcionamento]: Soma final absoluta de lanches requeridos pela portaria.

    // [Funcionamento]: Monta o layout de texto premium e refinado, perfeitamente simétrico para os dois escopos.
    return `*CONGREGAÇÃO CRISTÃ NO BRASIL* 🎵\n*ENSAIO ${tipoEnsaio.toUpperCase()} - ${comumNome.toUpperCase()}*\n*Relatório de Alimentação - ${data}* 🍽️\n\nTotal Geral de Presentes (Lanches): ${totalGeral} ✅\n\n* Orquestra: ${totalOrquestra} 🎶\n      • Músicos: ${totalMusicos} + Organistas: ${totalOrganistas}\n* Irmandade: ${totalIrmandade} 🗣️\n\nDeus abençoe grandemente! 🙏`;
  }, // [Funcionamento]: Encerra o método refinado de alimentação.

  /**
   * MODELO 2: RESUMO ESTATÍSTICO COMPLETO (SISTEMA MATRICIAL DUPLO BLINDADO)
   */
  obterTextoEstatistico: (event, stats = null) => { // [Funcionamento]: Compila o relatório formal completo do Ensaio Local ou Regional.
    const counts = event?.counts || {}; // [Funcionamento]: Resgata o mapa numérico com proteção contra nulos.
    const data = formatarData(event?.date || event?.data); // [Funcionamento]: Formata reativamente a data oficial do evento.
    const tipoEnsaio = event?.scope === 'regional' ? 'Regional' : 'Local'; // [Funcionamento]: Discernimento de escopo para aplicação do título correto.
    const localidadePura = (event?.comumNome || "LOCALIDADE NÃO IDENTIFICADA"); // [Funcionamento]: Captura o nome da localidade cadastrada.
    const comumNome = toTitleCase(localidadePura); // [Funcionamento]: Aplica tratamento de beleza visual na string da comum.

    // 📊 EXTRAÇÃO MATRICIAL DAS ESTERAS DE CÁLCULO DA RAM (Captura as chaves locais e regionais sem conflitos)
    const totalMusicos = stats ? stats.musicos : Object.keys(counts)
      .filter(key => !['irmandade', 'Coral', 'orgao'].includes(key) && !key.startsWith('meta_'))
      .reduce((acc, key) => acc + (parseInt(counts[key]?.total) || 0), 0);
    
    const totalOrganistas = stats ? stats.organistas : (parseInt(counts['orgao']?.total) || 0);
    
    const totalIrmandadeCoral = stats ? stats.irmandade : ((parseInt(counts['irmandade']?.irmaos) || 0) + (parseInt(counts['irmandade']?.irmas) || 0) + 
                                (parseInt(counts['Coral']?.irmaos) || 0) + (parseInt(counts['Coral']?.irmas) || 0));
    
    const totalGeral = stats ? stats.geral : (totalMusicos + totalOrganistas + totalIrmandadeCoral);
    const totalHinos = stats ? (stats.hinos || event?.hinosChamados || 0) : (event?.hinosChamados || 0);

    // 🔧 PONTES DE MAPEAMENTO CRUZADO DE ACORDO COM O ESCOPO ATIVO (Evita o bug do zero absoluto)
    const totalEncReg = stats ? (
      typeof stats.encRegional === 'number' ? stats.encRegional : 
      ((stats.encRegionalComum || 0) + (stats.encRegionalVisita || 0))
    ) : 0;

    const totalEncLoc = stats ? (
      ((stats.encLocalCasa || 0) + (stats.encLocalVisitas || 0)) || 
      ((stats.encLocalComum || 0) + (stats.encLocalVisita || 0))
    ) : 0;

    const totalExam = stats ? (
      (stats.totalExaminadoras || 0) ||
      ((stats.examinadorasCasa || 0) + (stats.examinadorasVisitas || 0)) ||
      ((stats.examinadorasComum || 0) + (stats.examinadorasVisita || 0)) ||
      (stats.examinadorasTotal || 0)
    ) : 0;

    const totalMinisterioAltar = stats ? (
      (stats.ministerio_total || 0) || 
      (stats.ministerio_oficio || 0)
    ) : 0;

    // Constrói a estrutura visual padrão da mensagem de texto
    let msg = `Serviço de Ensaio ${tipoEnsaio} - ${data} 🎵\n${localidadePura.toUpperCase()} 📍\n\nResumo Estatístico: 📊\n\n`;
    
    msg += `* Músicos: ${totalMusicos}\n`;
    msg += `* Organistas: ${totalOrganistas}\n`;
    msg += `* Irmandade (Coral): ${totalIrmandadeCoral}\n`;
    msg += `* Hinos Ensaiados: ${totalHinos} 🎶\n\n`;
    
    msg += `Total Geral: ${totalGeral} ✅\n\n`;
    
    msg += `* Encarregados Regionais: ${totalEncReg}\n`;
    msg += `* Encarregados Locais: ${totalEncLoc}\n`;
    msg += `* Examinadoras: ${totalExam}\n`;
    msg += `* Ministério: ${totalMinisterioAltar}\n\n`;

    // 📖 MAPA DA PALAVRA SANTA (Injeção contextual exclusiva do Ensaio Regional)
    if (event?.scope === 'regional') {
      const mapaPalavra = event?.palavra || event?.ata?.palavra || null;
      if (mapaPalavra && mapaPalavra.livro && mapaPalavra.livro !== '---') {
        msg += `A Palavra Santa Exortada: 📖\n`;
        msg += `• Livro: ${mapaPalavra.livro.toUpperCase()} ${mapaPalavra.capitulo}:${mapaPalavra.verso}\n`;
        msg += `• Assunto: "${toTitleCase(mapaPalavra.assunto)}"\n`;
        msg += `• Atendido por: ${toTitleCase(mapaPalavra.anciao || event?.ata?.atendimentoNome || "---")}\n\n`;
      }
    }

    msg += `Deus abençoe grandemente! 🙏`;
    return msg; // [Funcionamento]: Devolve a mensagem final perfeitamente calibrada para os dois escopos do app.
  } // [Funcionamento]: Encerra o método estatístico.
}; // [Funcionamento]: Encerra o objeto do serviço de mensageria.