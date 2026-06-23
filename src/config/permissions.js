// src/config/permissions.js - O Cérebro de Permissões do Sistema

// Explicação: Definimos os nomes oficiais de cada nível para que o sistema não se confunda com erros de digitação.
export const ROLES = {
  MASTER: 'master', // Explicação: Administrador total e supremo com chave universal.
  COMISSAO: 'comissao', // Explicação: Supervisor Regional da comissão técnica musical.
  CIDADE: 'regional_cidade', // Explicação: Gestor de uma Cidade ou jurisdição territorial de comarca.
  GEM: 'gem_local', // Explicação: Zeladoria Musical e secretaria de uma igreja comum local específica.
  BASICO: 'basico' // Explicação: Músico, Organista ou Instrutor sem cargo de gestão ou portaria.
};

// Explicação: Esta tabela define a força de cada cargo (Hierarquia numérica).
const ROLE_LEVELS = {
  [ROLES.MASTER]: 5, // Explicação: Nível 5 de autoridade total global.
  [ROLES.COMISSAO]: 4, // Explicação: Nível 4 de autoridade regional técnica.
  [ROLES.CIDADE]: 3, // Explicação: Nível 3 de autoridade em comarca de cidade.
  [ROLES.GEM]: 2, // Explicação: Nível 2 de autoridade operacional de igreja comum local.
  [ROLES.BASICO]: 1 // Explicação: Nível 1 básico de apenas leitura e consulta de chamadas.
};

// Explicação: Este objeto é o mapa que diz o que cada "crachá" consegue acessar no ecossistema mobile.
export const PERMISSIONS_MAP = {
  [ROLES.MASTER]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Explicação: Acesso total às abas principais do rodapé.
    geoScope: 'global', // Explicação: Enxerga o mundo inteiro sem travas geográficas.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE, ROLES.COMISSAO], // Explicação: Aprova e promove qualquer um no sistema.
    canReopenAta: true, // Explicação: Pode reabrir qualquer ata fechada no ecossistema.
    canDeleteEvent: true, // Explicação: Pode apagar qualquer ensaio do mapa.
    canManageTeam: true, // Explicação: Pode gerenciar equipe em qualquer nível de ensaio.
    canGenerateReport: true // Explicação: Master pode gerar PDF/Compartilhar de tudo livremente.
  },
  [ROLES.COMISSAO]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Explicação: Acesso às abas principais de controle e secretaria.
    geoScope: 'regional', // Explicação: Filtra tudo pela sua Regional indexada.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE, ROLES.COMISSAO], // Explicação: Pode promover usuários até o nível de Comissão Musical.
    canReopenAta: true, // Explicação: Tem autoridade para destravar atas e livros históricos da sua região.
    canDeleteEvent: true, // Explicação: Pode apagar ensaios vinculados à sua regional.
    canManageTeam: true, // Explicação: Pode gerenciar equipes regionais de contadores.
    canGenerateReport: true // Explicação: Comissão pode gerar PDF de qualquer ensaio da região.
  },
  [ROLES.CIDADE]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Explicação: Acesso às abas principais do painel inferior.
    geoScope: 'cidade', // Explicação: Filtra tudo pela sua própria comarca de Cidade.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE], // Explicação: Só aprova músicos e gestores locais ou outros de Cidade.
    canReopenAta: true, // Explicação: Pode destravar atas das igrejas que pertencem à sua cidade.
    canDeleteEvent: true, // Explicação: Cidade apaga qualquer evento da sua jurisdição (Local ou Regional).
    canManageTeam: true, // Explicação: v10.10: AJUSTADO - Cidade mantém autoridade de gestão em eventos regionais como convidado.
    canGenerateReport: true // Explicação: v10.10: AJUSTADO - Cidade mantém autoridade de relatórios em eventos regionais como convidado.
  },
  [ROLES.GEM]: {
    modules: ['ensaios', 'geral', 'ajustes'], // Explicação: Vê a aba de Ajustes para gerenciar sua orquestra e músicos locais.
    geoScope: 'local', // Explicação: Foco total na sua própria igreja comuns de cadastro.
    canApprove: [ROLES.BASICO, ROLES.GEM], // Explicação: GEM agora pode promover Básico para GEM Local.
    canReopenAta: false, // Explicação: Uma vez fechada por ele, só o gestor de cidade ou comissão reabre o livro.
    canDeleteEvent: 'local_only', // Explicação: GEM pode apagar o que é local, mas não o Regional centralizado.
    canManageTeam: true, // Explicação: v11.3: LIBERADO - GEM possui autoridade de gerenciar a equipe nominal da sua localidade igreja.
    canGenerateReport: 'local_only' // Explicação: Só gera PDF/Compartilha se o ensaio for do escopo Local.
  },
  [ROLES.BASICO]: {
    modules: ['ensaios', 'geral'], // Explicação: Não vê a aba de Ajustes (Configurações) para proteção da matriz.
    geoScope: 'local', // Explicação: Só enxerga as agendas que acontecem na sua igreja de origem.
    canApprove: [], // Explicação: Não possui privilégios para aprovar ninguém.
    canReopenAta: false, // Explicação: Sem poder de gestão ou modificação sobre a ata.
    canDeleteEvent: false, // Explicação: Sem poder de exclusão de agendas históricos.
    canManageTeam: false, // Explicação: Sem poder de coordenação de equipe de contadores.
    canGenerateReport: false // Explicação: Músicos comuns não geram relatórios ou arquivos PDF.
  }
};

/**
 * Explicação: Esta função é o "Segurança da Portaria". 
 * Ela checa se o usuário atual tem permissão para realizar uma ação específica.
 */
export const hasPermission = (user, action, context = null) => {
  if (!user || !user.accessLevel) return false; // Explicação: Se não estiver logado ou sem nível, barra tudo.
  if (user.accessLevel === ROLES.MASTER) return true; // Explicação: Master sempre passa direto pela portaria.

  const config = PERMISSIONS_MAP[user.accessLevel]; // Explicação: Pega a regra específica do nível do usuário.
  if (!config) return false; // Explicação: Se não reconhecer o crachá, barra.

  // --- NOVA REGRA ESTRETA SOLICITADA: GESTÃO DE MÚSICOS (CRIAR, EDITAR, EXCLUIR) DA COMUM ---
  if (action === 'gerenciar_musicos') { // Explicação: Gatilho que valida se o secretário pode mexer nas fichas fixas de alistamento.
    if (user.accessLevel === ROLES.COMISSAO || user.accessLevel === ROLES.CIDADE) return true; // Explicação: Níveis superiores possuem acesso master total in qualquer localidade.
    if (user.accessLevel === ROLES.GEM) { // Explicação: GEM Local pode gerenciar músicos se a igreja alvo for rigorosamente igual à igreja dele.
      if (!context) return true; // Explicação: Se não foi passado contexto (abrindo a tela de cadastro vazia), libera o botão.
      return user.comumId === context; // Explicação: REGRA DE OURO TERRITORIAL: Retorna verdadeiro apenas se o comumId bater com o do crachá do GEM.
    }
    return false; // Explicação: Usuários básicos ou sem cargo de portaria são sumariamente barrados.
  }

  // Explicação: Lógica para Aprovação e Troca de Cargo (Promoção/Rebaixamento).
  if (action === 'approve_user' || action === 'change_role') {
    const myLevel = ROLE_LEVELS[user.accessLevel]; // Explicação: Captura o peso numérico do cargo do operador atual.
    const targetCurrentLevel = ROLE_LEVELS[context?.currentRole] || 0; // Explicação: Qual o nível atual da pessoa avaliada?
    const targetNextLevel = ROLE_LEVELS[context?.targetRole] || 0; // Explicação: Para qual nível quero levá-la na promoção?

    // REGRA DE PROMOÇÃO: Posso promover se o cargo final for menor ou igual ao meu de direito.
    if (targetNextLevel > targetCurrentLevel) {
      return targetNextLevel <= myLevel; // Explicação: Retorna verdadeiro se o cargo alvo estiver abaixo do meu teto.
    }

    // REGRA DE REBAIXAMENTO: Só posso despromover se eu for maior que o cargo atual da pessoa.
    if (targetNextLevel < targetCurrentLevel) {
      return myLevel > targetCurrentLevel; // Explicação: Bloqueia rebaixamentos se o operador tiver nível menor ou igual ao alvo.
    }

    return true; // Explicação: Se for o mesmo nível (manter), permite.
  }

  // Explicação: Lógica para Reabertura de Atas.
  if (action === 'reopen_ata') {
    return !!config.canReopenAta; // Explicação: Retorna se o crachá tem a chave de reabertura ativa.
  }

  // Explicação: Lógica para Exclusão de Eventos (Lixeira).
  if (action === 'delete_event') {
    if (config.canDeleteEvent === true) return true; // Explicação: Master, Comissão e Cidade apagam tudo em seu escopo.
    if (config.canDeleteEvent === 'local_only') { // Explicação: Se a regra do crachá disser que só mexe nos locais.
      // 🚀 BLINDAGEM NULL-SAFETY: Valida explicitamente se o objeto é real e não nulo antes de ler propriedades.
      if (typeof context === 'object' && context !== null) {
        return context.scope === 'local' && context.comumId === user.comumId;
      }
      return context === 'local'; // Explicação: Fallback síncrono para strings de escopo simples.
    }
    return false; // Explicação: Nível básico não apaga eventos.
  }

  // Explicação: Lógica para Equipe de Contagem e Ativação Coletora.
  // v10.10: Refinado para permitir que Cidade/Comissão gerenciem equipes em qualquer Regional.
  if (action === 'manage_team') {
    if (config.canManageTeam === true) return true; // Explicação: Cargos altos (Comissão/Cidade) gerenciam qualquer equipe.
    if (config.canManageTeam === 'local_only') { // Explicação: Se for restrito ao ambiente local de direito.
      // 🚀 BLINDAGEM NULL-SAFETY: Impede quebras de leitura (properties of null) na varredura do .map do lobby de ensaios.
      if (typeof context === 'object' && context !== null) {
        return context.scope === 'local' && context.comumId === user.comumId;
      }
      return context === 'local'; // Explicação: Fallback estável para escopos em string crua.
    }
    return false; // Explicação: Nível básico não gerencia equipes.
  }

  // Explicação: Geração de PDF e Compartilhamento.
  // v10.10: Refinado para permitir que Cidade/Comissão gerem relatórios em qualquer Regional.
  if (action === 'generate_report') {
    if (config.canGenerateReport === true) return true; // Explicação: Gestores altos geram qualquer relatório eclesiástico.
    if (config.canGenerateReport === 'local_only') { // Explicação: Se for restrito ao ambiente local da casa.
      // 🚀 BLINDAGEM NULL-SAFETY: Garante o perfeito funcionamento dos botões de relatórios sem quebra na listagem.
      if (typeof context === 'object' && context !== null) {
        return context.scope === 'local' && context.comumId === user.comumId;
      }
      return context === 'local'; // Explicação: Fallback estável para strings de formato direto.
    }
    return false; // Explicação: Usuários básicos não emitem PDFs históricos.
  }

  return false; // Explicação: Por segurança máxima, se não souber a ação, barra o acesso.
};

/**
 * Explicação: Esta função decide o que o usuário deve ver na lista de ensaios (Economia de Cota).
 */
export const getQueryFilters = (user) => {
  if (!user || !user.accessLevel) return null; // Explicação: Se não houver dados, retorna nulo.
  
  const config = PERMISSIONS_MAP[user.accessLevel]; // Explicação: Puxa o mapa de escopo do cargo.
  if (!config) return { comumId: user.comumId }; // Explicação: Se der erro de leitura, tranca na própria comum por segurança.

  if (config.geoScope === 'global') return {}; // Explicação: Master puxa todos os registros sem filtros.
  if (config.geoScope === 'regional') return { regionalId: user.regionalId }; // Explicação: Comissão técnica puxa a regional inteira.
  if (config.geoScope === 'cidade') return { cidadeId: user.cidadeId }; // Explicação: Gestor de cidade puxa os limites da sua comarca.
  if (config.geoScope === 'local') return { comumId: user.comumId }; // Explicação: GEM Local puxa unicamente a sua igreja comuns de direito.
  
  return { comumId: user.comumId }; // Explicação: Fallback defensivo padrão de isolamento territorial de dados.
};