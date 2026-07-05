import React, { createContext, useContext, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar contextos globais e cachear dados na memória RAM.
import { useAuth } from './AuthContext'; // Explicação: Conecta com o Cérebro Central de Autenticação para herdar o crachá unificado do usuário logado.

const PermissionContext = createContext(null); // Explicação: Inicializa o canal de comunicação física do contexto de permissões do ecossistema.

export const PermissionProvider = ({ children }) => { // Explicação: Cria o componente Provedor que vai envelopar o aplicativo e distribuir as regras de portaria.
  const { userData } = useAuth(); // Explicação: Captura em tempo real a ficha cadastral e as Custom Claims do obreiro conectado.

  // MATRIZ DE NÍVEIS DE PODER ESTÁTICA
  const level = userData?.accessLevel; // Explicação: Isola a string de cargo contida no crachá eletrônico de Claims.
  const isMaster = level === 'master'; // Explicação: Verifica se o operador é o Administrador Supremo do ecossistema (Victor).
  const isComissao = level === 'comissao' || isMaster; // Explicação: Verifica se o usuário pertence à comissão técnica regional ou master.
  const isRegionalCidade = level === 'regional_cidade' || isComissao; // Explicação: Define se o usuário administra municípios ou regiões inteiras.
  const isGemLocal = level === 'gem_local' || isRegionalCidade; // Explicação: Identifica se possui nível mínimo de secretário local GEM.
  const isBasico = level === 'basico'; // Explicação: Identifica se é um músico comum com permissões restritas de leitura.

  const permissions = useMemo(() => { // Explicação: Processa e memoriza em cache RAM todas as sub-rotinas de travas e portarias para alta performance de tela.
    
    // REGRA 1: QUEM PODE CRIAR REGISTROS DE ENSAIOS
    const canCreateEvent = (eventCityId) => { // Explicação: Função que avalia se o usuário tem o direito de abrir uma nova agenda de ensaio.
      if (isBasico) return false; // Explicação: Músicos básicos nunca criam ensaios no sistema.
      if (isMaster || isComissao) return true; // Explicação: Nível master e comissão regional possuem passe livre para abrir registros em qualquer nó.
      if (level === 'regional_cidade') { // Explicação: Se for gestor de cidade/comarca.
        return eventCityId === userData?.cidadeId; // Explicação: Veredito: Abre as portas se a cidade da Comum Sede for estritamente a cidade dele de cadastro.
      } // Explicação: Fim da trava de cidade.
      return false; // Explicação: GEM Local comum não cria ensaios por este fluxo amplo (cria via trava de igreja local).
    }; // Explicação: Encerra a função canCreateEvent.

    // REGRA 2: QUEM PODE ZELAR E ASSUMIR A CONTAGEM DE UM NAIPE (CORDAS, TECLAS, ETC)
    const canEditCounter = (eventComumId, sectionMetaOwnerId = null) => { // Explicação: Avalia se o usuário pode somar, subtrair ou assumir a caneta de uma seção no painel.
      if (isMaster || isComissao) return true; // Explicação: Autoridades máximas editam e assinam qualquer naipe em qualquer tempo.
      
      const minhaComumLegitima = userData?.comumId || userData?.activeComumId; // Explicação: Puxa a igreja mãe de cadastro fixa do obreiro.
      const ehEnsaioDaMinhaCasa = minhaComumLegitima === eventComumId; // Explicação: Compara se o ensaio aberto pertence à igreja nativa dele.

      if ((level === 'gem_local' || level === 'basico') && ehEnsaioDaMinhaCasa) { // Explicação: Se for da mesma igreja comum e o ensaio for local.
        return true; // Explicação: Libera o Toque Azul Real instantaneamente para cliques.
      } // Explicação: Fim da liberação local.

      if (level === 'regional_cidade') { // Explicação: Se for Encarregado de Cidade.
        return sectionMetaOwnerId === userData?.uid; // Explicação: Só altera se ele tiver clicado no botão de Assumir e o ID dele constar como dono da aba.
      } // Explicação: Fim da trava de cidade.
      return sectionMetaOwnerId === userData?.uid; // Explicação: Fallback padrão de segurança por ID de responsável.
    }; // Explicação: Encerra a função canEditCounter.

    // REGRA 3: QUEM PODE FECHAR OU REABRIR O LIVRO DE ATAS
    const canManageAtaStatus = (eventCityId) => { // Explicação: Determina quem tem o poder eclesiástico de lacrar ou reabrir uma ata.
      if (isMaster || isComissao) return true; // Explicação: Comissão Regional e Master lacram ou reabrem de forma universal.
      if (level === 'regional_cidade') { // Explicação: Se for Encarregado de Cidade.
        return eventCityId === userData?.cidadeId; // Explicação: Libera se o evento estiver acontecendo dentro da comarca municipal dele.
      } // Explicação: Fim da validação municipal.
      return false; // Explicação: GEM Local ou músicos básicos nunca lacram atas regionais.
    }; // Explicação: Encerra a função canManageAtaStatus.

    // REGRA 4: QUEM PODE EDITAR AS TABELAS FIXAS (MÚSICOS DA CASA, INSTRUMENTOS CONFIG)
    const canWriteChurchSettings = (churchComumId, churchCityId) => { // Explicação: Controla a caneta de edição das configurações de orquestras locais.
      if (isMaster || isComissao) return true; // Explicação: Master e comissão gerenciam o alistamento de qualquer casa.
      if (level === 'regional_cidade') { // Explicação: Se for Encarregado de Cidade.
        return churchCityId === userData?.cidadeId; // Explicação: Permite alterar se a igreja comum pertencer ao seu município.
      } // Explicação: Fim da comarca.
      if (level === 'gem_local') { // Explicação: Se for secretário local.
        return churchComumId === userData?.comumId; // Explicação: Só permite alterar se for a ficha de sua própria igreja de direito.
      } // Explicação: Fim do GEM Local.
      return false; // Explicação: Músicos comuns nunca editam alistamentos.
    }; // Explicação: Encerra a função canWriteChurchSettings.

    return { // Explicação: Devolve a sacola de funções calculadas e blindadas prontas para uso.
      level, isMaster, isComissao, isRegionalCidade, isGemLocal, isBasico,
      canCreateEvent, canEditCounter, canManageAtaStatus, canWriteChurchSettings
    }; // Explicação: Fim do retorno do useMemo.
  }, [userData, level, isMaster, isComissao, isRegionalCidade, isGemLocal, isBasico]); // Explicação: Só re-processa a matriz inteira se a conta física do usuário mudar no Firebase.

  return ( // Explicação: Desenha o invólucro injetando a sacola de poderes na árvore de componentes.
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  ); // Explicação: Encerra a tag de distribuição.
}; // Explicação: Encerra o componente Provedor.

export const usePermissions = () => { // Explicação: Hook customizado utilitário para os componentes filhos consumirem a portaria com uma linha de código.
  const context = useContext(PermissionContext); // Explicação: Abre o elo de conexão física com o PermissionContext.
  if (!context) throw new Error("usePermissions deve ser usado dentro de um PermissionProvider"); // Explicação: Trava de engenharia para evitar chamadas órfãs fora do provedor.
  return context; // Explicação: Entrega a matriz de portaria mastigada para o componente que chamou.
}; // Explicação: Encerra o hook usePermissions.