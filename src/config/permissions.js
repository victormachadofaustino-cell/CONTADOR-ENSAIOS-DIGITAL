import { useMemo } from "react"; // Explicação: Mantém a importação das ferramentas de cache e otimização de memória RAM do React.

/**
 * HISTÓRICO DE MODIFICAÇÕES: v12.8
 * Alinhamento Absoluto: Separação estrita entre Função (Identidade) e Nível Hierárquico (Privilégio).
 * Atribuição de poderes totais de Ajustes, Cultos, Obreiros e Instrumentos conforme a Jurisdição Territorial.
 */

// Explicação: Definimos os nomes oficiais de cada nível para que o sistema não se confunda com erros de digitação.
export const ROLES = {
  MASTER: "master", // Explicação: Administrador total e supremo com chave universal global.
  COMISSAO: "comissao", // Explicação: Supervisor Regional da comissão técnica musical (Poder de Estado/Regional).
  CIDADE: "regional_cidade", // Explicação: Gestor de uma Cidade ou jurisdição territorial de comarca inteira.
  GEM: "gem_local", // Explicação: Zeladoria Musical e secretaria de uma igreja comum local específica.
  BASICO: "basico", // Explicação: Músico, Organista ou Instrutor sem cargo de gestão, portaria ou Ajustes.
};

// Explicação: Esta tabela define a força de cada cargo para validação matemática de promoções (Hierarquia numérica).
const ROLE_LEVELS = {
  [ROLES.MASTER]: 5, // Explicação: Nível 5 de autoridade total global suprema.
  [ROLES.COMISSAO]: 4, // Explicação: Nível 4 de autoridade regional técnica.
  [ROLES.CIDADE]: 3, // Explicação: Nível 3 de autoridade em comarca de cidade.
  [ROLES.GEM]: 2, // Explicação: Nível 2 de autoridade operacional de igreja comum local.
  [ROLES.BASICO]: 1, // Explicação: Nível 1 básico de apenas leitura e consulta de chamadas de presença.
};

// Explicação: Este objeto é o mapa que diz o que cada "crachá" consegue acessar no ecossistema mobile.
export const PERMISSIONS_MAP = {
  [ROLES.MASTER]: {
    modules: ["ensaios", "geral", "ajustes"], // Explicação: Acesso total às abas principais do rodapé do sistema.
    geoScope: "global", // Explicação: Enxerga o mundo inteiro sem travas geográficas ou limitações.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE, ROLES.COMISSAO], // Explicação: Aprova e promove qualquer um no sistema móvel.
    canReopenAta: true, // Explicação: Pode reabrir qualquer ata fechada no ecossistema.
    canDeleteEvent: true, // Explicação: Pode apagar qualquer ensaio do mapa do banco.
    canManageTeam: true, // Explicação: Pode gerenciar equipe em qualquer nível de ensaio.
    canGenerateReport: true, // Explicação: Master pode gerar PDF/Compartilhar de tudo livremente.
    canManageComum: true, // Explicação: Pode alterar endereço e dados de culto de qualquer igreja.
    canManageMinisterio: true, // Explicação: Pode gerenciar obreiros de qualquer comum.
    canManageInstruments: true, // Explicação: Pode configurar a grade orquestral de qualquer comum.
    canCreateRegionalEvent: true, // Explicação: Master cria ensaios regionais em qualquer localidade.
  },
  [ROLES.COMISSAO]: {
    modules: ["ensaios", "geral", "ajustes"], // Explicação: Acesso às abas principais de controle, secretaria e dashboard.
    geoScope: "regional", // Explicação: Filtra as informações e controles pelos limites da sua Regional indexada.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE, ROLES.COMISSAO], // Explicação: Pode promover usuários até o nível de Comissão Musical.
    canReopenAta: true, // Explicação: Tem autoridade para destravar atas e livros históricos da sua região.
    canDeleteEvent: true, // Explicação: Pode apagar ensaios vinculados à sua regional.
    canManageTeam: true, // Explicação: Pode gerenciar equipes regionais de contadores.
    canGenerateReport: true, // Explicação: Comissão pode gerar PDF de qualquer ensaio da região.
    canManageComum: "regional_scope", // Explicação: Gerencia cultos e endereços de todas as comuns da regional.
    canManageMinisterio: "regional_scope", // Explicação: Gerencia as listas de obreiros de toda a regional.
    canManageInstruments: "regional_scope", // Explicação: Modifica a grade de instrumentos de toda a regional.
    canCreateRegionalEvent: true, // Explicação: Comissão pode criar ensaios regionais em sua jurisdição.
  },
  [ROLES.CIDADE]: {
    modules: ["ensaios", "geral", "ajustes"], // Explicação: Acesso às abas principais do painel inferior do aplicativo.
    geoScope: "cidade", // Explicação: Filtra tudo pela sua própria comarca de Cidade/Município.
    canApprove: [ROLES.BASICO, ROLES.GEM, ROLES.CIDADE], // Explicação: Só aprova músicos e gestores locais ou outros de Cidade.
    canReopenAta: true, // Explicação: Pode destravar atas das igrejas que pertencem à sua cidade.
    canDeleteEvent: true, // Explicação: Cidade apaga qualquer evento da sua jurisdição (Local ou Regional).
    canManageTeam: true, // Explicação: Cidade mantém autoridade de gestão em eventos regionais como convidado.
    canGenerateReport: true, // Explicação: Cidade mantém autoridade de relatórios em eventos regionais como convidado.
    canManageComum: "cidade_scope", // Explicação: Gerencia endereços e cultos de todas as comuns da sua cidade.
    canManageMinisterio: "cidade_scope", // Explicação: Gerencia as listas de obreiros de todas as comuns da sua cidade.
    canManageInstruments: "cidade_scope", // Explicação: Modifica a grade de instrumentos de todas as comuns da sua cidade.
    canCreateRegionalEvent: true, // Explicação: Supervisor de cidade pode criar ensaios regionais em seu território.
  },
  [ROLES.GEM]: {
    modules: ["ensaios", "geral", "ajustes"], // Explicação: Vê a aba de Ajustes para gerenciar sua orquestra e músicos locais de direito.
    geoScope: "local", // Explicação: Foco total na sua própria igreja comuns de cadastro.
    canApprove: [ROLES.BASICO, ROLES.GEM], // Explicação: GEM agora pode promover Básico para GEM Local dentro de sua casa.
    canReopenAta: false, // Explicação: Uma vez fechada por ele, só o gestor de cidade ou comissão reabre o livro.
    canDeleteEvent: "local_only", // Explicação: GEM pode apagar o que é local, mas não o Regional centralizado.
    canManageTeam: true, // Explicação: GEM possui autoridade de gerenciar a equipe nominal da sua localidade igreja.
    canGenerateReport: "local_only", // Explicação: Só gera PDF/Compartilha se o ensaio for do escopo Local.
    canManageComum: "local_only", // Explicação: Altera endereço e horários de culto estritamente da sua comum.
    canManageMinisterio: "local_only", // Explicação: Cria, edita e exclui obreiros estritamente da sua comum.
    canManageInstruments: "local_only", // Explicação: Cria, edita e exclui a grade de instrumentos da sua comum.
    canCreateRegionalEvent: false, // Explicação: Secretário local GEM nunca possui permissão de abrir ensaios regionais.
  },
  [ROLES.BASICO]: {
    modules: ["ensaios", "geral"], // Explicação: Não vê a aba de Ajustes (Configurações) para proteção da matriz de dados.
    geoScope: "local", // Explicação: Só enxerga as agendas que acontecem na sua igreja de origem.
    canApprove: [], // Explicação: Não possui privilégios para aprovar ninguém no sistema.
    canReopenAta: false, // Explicação: Sem poder de gestão ou modificação sobre a ata.
    canDeleteEvent: false, // Explicação: Sem poder de exclusão de agendas históricos.
    canManageTeam: false, // Explicação: Sem poder de coordenação de equipe de contadores.
    canGenerateReport: false, // Explicação: Músicos comuns não geram relatórios ou arquivos PDF.
    canManageComum: false, // Explicação: Bloqueado de alterar dados de infraestrutura de cultos.
    canManageMinisterio: false, // Explicação: Bloqueado de gerenciar fichas do corpo ministerial.
    canManageInstruments: false, // Explicação: Bloqueado de gerenciar inventário orquestral.
    canCreateRegionalEvent: false, // Explicação: Músicos básicos não possuem permissão de criar agendas.
  },
};

/**
 * Explicação: Esta função é o "Segurança da Portaria".
 * Ela checa se o usuário atual tem permissão para realizar uma ação específica.
 */
export const hasPermission = (user, action, context = null) => {
  if (!user || !user.accessLevel) return false; // Explicação: Se não estiver logado ou sem nível de acesso, barra tudo por segurança.
  if (user.accessLevel === ROLES.MASTER) return true; // Explicação: Master sempre passa direto por qualquer verificação da portaria.

  const config = PERMISSIONS_MAP[user.accessLevel]; // Explicação: Puxa o mapa de regras específico do nível do usuário conectado.
  if (!config) return false; // Explicação: Se não reconhecer o crachá eletrônico, barra o acesso imediatamente.

  // --- NOVA REGRA ESTRETA: GESTÃO DE MÚSICOS DA LISTA FIXA ---
  if (action === "gerenciar_musicos") {
    // Explicação: Valida se o secretário pode mexer nas fichas fixas de músicos.
    if (user.accessLevel === ROLES.COMISSAO) {
      // Explicação: Se for Comissão, valida se a igreja comuns alvo pertence à sua Regional.
      if (!context || typeof context !== "object") return true; // Explicação: Se abrir sem contexto de igreja, libera o botão inicial.
      return user.regionalId === context.regionalId; // Explicação: Permite se as Regionais do obreiro e da comum forem iguais.
    }
    if (user.accessLevel === ROLES.CIDADE) {
      // Explicação: Se for Encarregado de Cidade, valida os limites da comarca municipal.
      if (!context || typeof context !== "object") return true; // Explicação: Se não houver dados do contexto da comum, libera.
      return user.cidadeId === context.cidadeId; // Explicação: Libera se o código da cidade da comum bater com a do gestor.
    }
    if (user.accessLevel === ROLES.GEM) {
      // Explicação: GEM Local pode gerenciar músicos se a igreja comuns for estritamente a dele.
      if (!context) return true; // Explicação: Se não foi passado contexto de ID da comum, libera o botão inicial.
      const targetComumId = typeof context === "object" ? context.id : context; // Explicação: Isola a string de ID da comum independente do formato enviado.
      return user.comumId === targetComumId; // Explicação: REGRA DE OURO TERRITORIAL: Retorna verdadeiro apenas se a comum for igual ao crachá.
    }
    return false; // Explicação: Usuários básicos ou sem cargo são sumariamente barrados.
  }

  // --- NOVA REGRA ESTRETA: ALTERAR ENDEREÇO E INFRAESTRUTURA DE CULTO ---
  if (action === "gerenciar_comum") {
    // Explicação: Valida quem altera dados físicos da igreja comum na aba de Ajustes.
    if (config.canManageComum === true) return true; // Explicação: Nível master passa direto.
    if (config.canManageComum === "regional_scope") {
      // Explicação: Comissão altera se a comum pertencer à sua regional.
      return context && context.regionalId === user.regionalId; // Explicação: Retorna verdadeiro se as chaves de regional baterem.
    }
    if (config.canManageComum === "cidade_scope") {
      // Explicação: Encarregado de cidade altera se a comum pertencer à sua cidade.
      return context && context.cidadeId === user.cidadeId; // Explicação: Retorna verdadeiro se as comarcas municipais baterem.
    }
    if (config.canManageComum === "local_only") {
      // Explicação: GEM altera se a comum for rigorosamente a dele de cadastro.
      const targetComumId = typeof context === "object" ? context.id : context; // Explicação: Isola o identificador da comum.
      return user.comumId === targetComumId; // Explicação: Valida a igualdade estrita do ID da casa.
    }
    return false; // Explicação: Barra usuários sem privilégios.
  }

  // --- NOVA REGRA ESTRETA: GESTÃO DO CORPO MINISTERIAL (OBREIROS) ---
  if (action === "gerenciar_ministerio") {
    // Explicação: Valida quem gerencia as fichas nominais da lista do altar.
    if (config.canManageMinisterio === true) return true; // Explicação: Permissão master universal.
    if (config.canManageMinisterio === "regional_scope") {
      // Explicação: Comissão gerencia se a comum for da regional dele.
      return context && context.regionalId === user.regionalId; // Explicação: Confere o elo regional.
    }
    if (config.canManageMinisterio === "cidade_scope") {
      // Explicação: Encarregado de cidade gerencia se a comum for da sua cidade.
      return context && context.cidadeId === user.cidadeId; // Explicação: Confere a jurisdição da comarca.
    }
    if (config.canManageMinisterio === "local_only") {
      // Explicação: GEM gerencia se a comum for estritamente a dele.
      const targetComumId = typeof context === "object" ? context.id : context; // Explicação: Extrai o ID da comum alvo.
      return user.comumId === targetComumId; // Explicação: Trava na comum local de cadastro.
    }
    return false; // Explicação: Bloqueia acessos residuais básicos.
  }

  // --- NOVA REGRA ESTRETA: CONFIGURAR INSTRUMENTOS E NAIPES PADRÃO ---
  if (action === "gerenciar_instrumentos_config") {
    // Explicação: Valida quem altera as grades orquestrais permitidas na casa.
    if (config.canManageInstruments === true) return true; // Explicação: Chave mestre liberada.
    if (config.canManageInstruments === "regional_scope") {
      // Explicação: Comissão altera se a comum for da sua regional.
      return context && context.regionalId === user.regionalId; // Explicação: Confere o elo regional do banco.
    }
    if (config.canManageInstruments === "cidade_scope") {
      // Explicação: Encarregado de cidade altera se a comum for da sua cidade.
      return context && context.cidadeId === user.cidadeId; // Explicação: Confere a jurisdição municipal do banco.
    }
    if (config.canManageInstruments === "local_only") {
      // Explicação: GEM altera se a comum for estritamente a dele.
      const targetComumId = typeof context === "object" ? context.id : context; // Explicação: Coleta o ID da comum.
      return user.comumId === targetComumId; // Explicação: Trava operacional da secretaria da casa.
    }
    return false; // Explicação: Barra músicos básicos de alterar inventários.
  }

  // --- NOVA REGRA: GERENCIAR CONTAGEM DE EVENTO ---
  if (action === "gerenciar_contagem_evento") {
    if (!context || typeof context !== "object") return false; // Explicação: Dados do evento são obrigatórios para esta validação.

    const event = context; // Explicação: O contexto aqui é o objeto 'ataData' do evento.

    // Regra 1: Master e Comissão podem editar qualquer contagem.
    if (
      user.accessLevel === ROLES.MASTER ||
      user.accessLevel === ROLES.COMISSAO
    ) {
      return true;
    }

    const isMyComum = user.comumId === event.comumId;
    const isLocalEvent = event.scope === "local";

    // Regra 2: GEM Local pode editar contagens de ensaios regionais que ocorrem em sua própria regional.
    if (
      user.accessLevel === ROLES.GEM &&
      !isLocalEvent &&
      user.regionalId === event.regionalId
    ) {
      return true;
    }

    // Regra 3: GEM Local ou Básico podem editar contagens de ensaios locais de sua própria igreja.
    if (
      (user.accessLevel === ROLES.GEM || user.accessLevel === ROLES.BASICO) &&
      isLocalEvent &&
      isMyComum
    ) {
      return true;
    }

    return false; // Explicação: Barra a edição por padrão se nenhuma regra for atendida.
  }

  // --- NOVA REGRA ESTRETA: CRIAR ENSAIOS REGIONAIS ---
  if (action === "criar_ensaio_regional") {
    // Explicação: Gatilho que valida se o obreiro pode acionar o formulário de ensaio regional macro.
    return !!config.canCreateRegionalEvent; // Explicação: Retorna o booleano do mapa (verdadeiro para Cidade, Comissão e Master).
  }

  // Explicação: Lógica para Aprovação e Troca de Cargo (Promoção/Rebaixamento).
  if (action === "approve_user" || action === "change_role") {
    const myLevel = ROLE_LEVELS[user.accessLevel]; // Explicação: Captura o peso numérico do cargo do operador atual.
    const targetCurrentLevel = ROLE_LEVELS[context?.currentRole] || 0; // Explicação: Qual o nível atual da pessoa avaliada no sistema?
    const targetNextLevel = ROLE_LEVELS[context?.targetRole] || 0; // Explicação: Para qual nível quero levá-la na promoção?

    // REGRA DE PROMOÇÃO: Posso promover se o cargo final for menor ou igual ao meu de direito.
    if (targetNextLevel > targetCurrentLevel) {
      return targetNextLevel <= myLevel; // Explicação: Retorna verdadeiro se o cargo alvo estiver abaixo ou igual ao meu teto de poder.
    }

    // REGRA DE REBAIXAMENTO: Só posso despromover se eu for maior que o cargo atual da pessoa.
    if (targetNextLevel < targetCurrentLevel) {
      return myLevel > targetCurrentLevel; // Explicação: Bloqueia rebaixamentos se o operador tiver nível menor ou igual ao alvo avaliado.
    }

    return true; // Explicação: Se for o mesmo nível (manter), permite a alteração de dados cadastrais.
  }

  // Explicação: Lógica para Reabertura de Atas.
  if (action === "reopen_ata") {
    return !!config.canReopenAta; // Explicação: Retorna se o crachá tem a chave de reabertura ativa de livro de atas.
  }

  // Explicação: Lógica para Exclusão de Eventos (Lixeira).
  if (action === "delete_event") {
    if (config.canDeleteEvent === true) return true; // Explicação: Master e Comissão apagam tudo em seu escopo amplo.
    if (user.accessLevel === ROLES.CIDADE) {
      // Explicação: Encarregado de cidade apaga se o evento pertencer à sua cidade de direito.
      return context && context.cidadeId === user.cidadeId; // Explicação: Valida se as cidades do gestor e do ensaio casam.
    }
    if (config.canDeleteEvent === "local_only") {
      // Explicação: Se a regra do crachá disser que só mexe nos locais da própria igreja.
      if (typeof context === "object" && context !== null) {
        return context.scope === "local" && context.comumId === user.comumId; // Explicação: Valida escopo local e ID idêntico da comum.
      }
      return context === "local"; // Explicação: Fallback síncrono para strings de escopo simples de formulários.
    }
    return false; // Explicação: Nível básico não possui permissão de apagar eventos históricos.
  }

  // Explicação: Lógica para Equipe de Contagem e Ativação Coletora.
  if (action === "manage_team") {
    if (config.canManageTeam === true) return true; // Explicação: Cargos altos (Comissão/Cidade) gerenciam qualquer equipe.
    if (config.canManageTeam === "local_only") {
      // Explicação: Se for restrito ao ambiente local de direito da casa.
      if (typeof context === "object" && context !== null) {
        return context.scope === "local" && context.comumId === user.comumId; // Explicação: Exige escopo local e ID identitário da comum.
      }
      return context === "local"; // Explicação: Fallback estável para escopos em string crua de componentes.
    }
    return false; // Explicação: Nível básico não gerencia equipes nominais de contadores.
  }

  // Explicação: Geração de PDF e Compartilhamento de relatórios.
  if (action === "generate_report") {
    if (config.canGenerateReport === true) return true; // Explicação: Gestores altos geram qualquer relatório eclesiástico amplo.
    if (config.canGenerateReport === "local_only") {
      // Explicação: Se for restrito ao ambiente local da respectiva casa comuns.
      if (typeof context === "object" && context !== null) {
        return context.scope === "local" && context.comumId === user.comumId; // Explicação: Exige escopo local e ID da comum idêntico.
      }
      return context === "local"; // Explicação: Fallback estável para strings de formato direto de botões.
    }
    return false; // Explicação: Usuários básicos não emitem relatórios analíticos ou arquivos PDF.
  }

  return false; // Explicação: Por segurança máxima de arquitetura, se não souber o nome da ação, barra o acesso.
};

/**
 * Explicação: Esta função decide o que o usuário deve ver na lista de ensaios (Economia de Cota e Isolamento Territorial).
 */
export const getQueryFilters = (user) => {
  if (!user || !user.accessLevel) return null; // Explicação: Se não houver dados do operador na RAM, retorna nulo para segurança.

  const config = PERMISSIONS_MAP[user.accessLevel]; // Explicação: Puxa o mapa de escopo geográfico do cargo do operador.
  if (!config) return { comumId: user.comumId }; // Explicação: Se der erro de leitura, tranca na própria comum por isolamento de segurança.

  if (config.geoScope === "global") return {}; // Explicação: Master puxa todos os registros de ensaios mundiais sem filtros geográficos.
  if (config.geoScope === "regional") return { regionalId: user.regionalId }; // Explicação: Comissão técnica puxa todos os ensaios da regional inteira.
  if (config.geoScope === "cidade") return { cidadeId: user.cidadeId }; // Explicação: Gestor de cidade puxa todos os ensaios nos limites da sua comarca municipal.
  if (config.geoScope === "local") return { comumId: user.comumId }; // Explicação: GEM Local e Básico puxam unicamente a sua igreja comuns de direito nativa.

  return { comumId: user.comumId }; // Explicação: Fallback defensivo padrão de isolamento territorial de dados do ecossistema.
};
