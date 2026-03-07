// src/config/permissions.js - O Cérebro de Permissões do Sistema

// Explicação: Definimos os nomes oficiais de cada nível para que o sistema não se confunda com erros de digitação.
export const ROLES = {
  MASTER: 'master', // Administrador total.
  COMISSAO: 'comissao', // Supervisor Regional.
  CIDADE: 'regional_cidade', // Gestor de uma Cidade ou micro-região.
  GEM: 'gem_local', // Zeladoria Musical de uma igreja específica.
  BASICO: 'basico' // Músico, Organista ou Instrutor sem cargo de gestão.
};

// Explicação: Esta tabela define a força de cada cargo (Hierarquia numérica).
const ROLE_LEVELS = {
  [ROLES.MASTER]: 5,
  [ROLES.COMISSAO]: 4,
  [ROLES.CIDADE]: 3,
  [ROLES.GEM]: 2,
  [ROLES.BASICO]: 1
};

// Explicação: Este objeto é o mapa que diz o que cada "crachá" consegue acessar.
export const PERMISSIONS_MAP = {
  [ROLES.MASTER]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Acesso total às abas.
    geoScope: 'global', // Enxerga o mundo inteiro.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE, ROLES.COMISSAO], // Aprova qualquer um.
    canReopenAta: true, // Pode reabrir qualquer ata fechada.
    canDeleteEvent: true, // Pode apagar qualquer ensaio.
    canManageTeam: true, // Pode gerenciar equipe em qualquer nível.
    canGenerateReport: true // Master pode gerar PDF/Compartilhar de tudo.
  },
  [ROLES.COMISSAO]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Acesso às abas principais.
    geoScope: 'regional', // Filtra tudo pela sua Regional.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE, ROLES.COMISSAO], // Pode promover até o nível de Comissão.
    canReopenAta: true, // Tem autoridade para destravar atas da sua região.
    canDeleteEvent: true, // Pode apagar ensaios da sua regional.
    canManageTeam: true, // Pode gerenciar equipes regionais.
    canGenerateReport: true // Comissão pode gerar PDF de qualquer ensaio da região.
  },
  [ROLES.CIDADE]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Acesso às abas principais.
    geoScope: 'cidade', // Filtra tudo pela sua Cidade.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE], // Só aprova músicos e gestores locais ou outros de Cidade.
    canReopenAta: true, // Pode destravar atas das igrejas da sua cidade.
    canDeleteEvent: true, // Cidade apaga qualquer evento da sua jurisdição (Local ou Regional).
    canManageTeam: true, // v10.10: AJUSTADO - Cidade mantém autoridade de gestão em eventos regionais como convidado.
    canGenerateReport: true // v10.10: AJUSTADO - Cidade mantém autoridade de relatórios em eventos regionais como convidado.
  },
  [ROLES.GEM]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Vê a aba de Ajustes para gerenciar sua orquestra.
    geoScope: 'local', // Foco total na sua própria igreja.
    canApprove: [ROLES.BASICO, ROLES.GEM], // GEM agora pode promover Básico para GEM.
    canReopenAta: false, // Uma vez fechada por ele, só o gestor acima reabre.
    canDeleteEvent: 'local_only', // GEM pode apagar o que é local, mas não o Regional.
    canManageTeam: 'local_only', // Só gerencia equipe se o ensaio for Local.
    canGenerateReport: 'local_only' // Só gera PDF/Compartilha se o ensaio for Local.
  },
  [ROLES.BASICO]: {
    modules: ['ensaios', 'geral'], // Não vê a aba de Ajustes (Configurações).
    geoScope: 'local', // Só enxerga o que acontece na sua igreja.
    canApprove: [], // Não aprova ninguém.
    canReopenAta: false, // Sem poder de gestão sobre a ata.
    canDeleteEvent: false, // Sem poder de exclusão.
    canManageTeam: false, // Sem poder de equipe.
    canGenerateReport: false // Músicos não geram relatórios.
  }
};

/**
 * Explicação: Esta função é o "Segurança da Portaria". 
 * Ela checa se o usuário atual tem permissão para realizar uma ação específica.
 */
export const hasPermission = (user, action, context = null) => {
  if (!user || !user.accessLevel) return false; // Explicação: Se não estiver logado ou sem nível, barra tudo.
  if (user.accessLevel === ROLES.MASTER) return true; // Explicação: Master sempre passa pela portaria.

  const config = PERMISSIONS_MAP[user.accessLevel]; // Explicação: Pega a regra específica do nível do usuário.
  if (!config) return false; // Explicação: Se não reconhecer o crachá, barra.

  // Explicação: Lógica para Aprovação e Troca de Cargo (Promoção/Rebaixamento).
  if (action === 'approve_user' || action === 'change_role') {
    const myLevel = ROLE_LEVELS[user.accessLevel]; // Qual o meu nível?
    const targetCurrentLevel = ROLE_LEVELS[context.currentRole] || 0; // Qual o nível atual da pessoa?
    const targetNextLevel = ROLE_LEVELS[context.targetRole] || 0; // Para qual nível quero levá-la?

    // REGRA DE PROMOÇÃO: Posso promover se o cargo final for menor ou igual ao meu.
    if (targetNextLevel > targetCurrentLevel) {
      return targetNextLevel <= myLevel;
    }

    // REGRA DE REBAIXAMENTO: Só posso despromover se eu for maior que o cargo atual da pessoa.
    if (targetNextLevel < targetCurrentLevel) {
      return myLevel > targetCurrentLevel;
    }

    return true; // Se for o mesmo nível (manter), permite.
  }

  // Explicação: Lógica para Reabertura de Atas.
  if (action === 'reopen_ata') {
    return !!config.canReopenAta; // Retorna se o crachá tem a chave de reabertura.
  }

  // Explicação: Lógica para Exclusão de Eventos (Lixeira).
  if (action === 'delete_event') {
    if (config.canDeleteEvent === true) return true; // Master, Comissão e Cidade apagam tudo em seu escopo.
    if (config.canDeleteEvent === 'local_only') {
      return context === 'local'; // GEM só apaga se o ensaio for do tipo local.
    }
    return false;
  }

  // Explicação: Lógica para Equipe de Contagem.
  // v10.10: Refinado para permitir que Cidade/Comissão gerenciem equipes em qualquer Regional.
  if (action === 'manage_team') {
    if (config.canManageTeam === true) return true; // Cargos altos (Comissão/Cidade) gerenciam qualquer equipe.
    if (config.canManageTeam === 'local_only') {
      return context === 'local'; // GEM só gerencia equipe se o ensaio for local.
    }
    return false;
  }

  // Explicação: Geração de PDF e Compartilhamento.
  // v10.10: Refinado para permitir que Cidade/Comissão gerem relatórios em qualquer Regional.
  if (action === 'generate_report') {
    if (config.canGenerateReport === true) return true; // Gestores altos geram qualquer relatório.
    if (config.canGenerateReport === 'local_only') {
      return context === 'local'; // GEM só vê botões de PDF se o ensaio for local.
    }
    return false;
  }

  return false; // Por segurança, se não souber a ação, barra o acesso.
};

/**
 * Explicação: Esta função decide o que o usuário deve ver na lista de ensaios (Economia de Cota).
 */
export const getQueryFilters = (user) => {
  if (!user || !user.accessLevel) return null; 
  
  const config = PERMISSIONS_MAP[user.accessLevel]; 
  if (!config) return { comumId: user.comumId }; 

  if (config.geoScope === 'global') return {}; 
  if (config.geoScope === 'regional') return { regionalId: user.regionalId }; 
  if (config.geoScope === 'cidade') return { cidadeId: user.cidadeId }; 
  if (config.geoScope === 'local') return { comumId: user.comumId }; 
  
  return { comumId: user.comumId }; 
};