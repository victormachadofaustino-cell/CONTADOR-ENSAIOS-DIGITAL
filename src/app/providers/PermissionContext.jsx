import React, { createContext, useContext, useMemo } from "react"; // Explicação: Importa as ferramentas essenciais do React para criar contextos globais e cachear dados na memória RAM.
import { useAuth } from "./AuthContext"; // Explicação: Conecta com o Cérebro Central de Autenticação para herdar o crachá unificado do usuário logado.

const PermissionContext = createContext(null); // Explicação: Inicializa o canal de comunicação física do contexto de permissões do ecossistema.

export const PermissionProvider = ({ children }) => {
  // Explicação: Cria o componente Provedor que vai envelopar o aplicativo e distribuir as regras de portaria.
  const { userData } = useAuth(); // Explicação: Captura em tempo real a ficha cadastral, que já contém o método 'can' e as flags de nível de acesso.

  const permissions = useMemo(() => {
    // Explicação: Processa e memoriza em cache RAM todas as sub-rotinas de travas e portarias para alta performance de tela.
    if (!userData) return {}; // Explicação: Se o usuário ainda não foi carregado, retorna um objeto vazio por segurança.

    return {
      // Explicação: Devolve a sacola de funções calculadas e blindadas prontas para uso imediato pelo front-end.
      level: userData.accessLevel,
      isMaster: userData.isMaster,
      isComissao: userData.isComissao,
      isRegionalCidade: userData.isRegionalCidade,
      isGemLocal: userData.isGemLocal,
      isBasico: userData.isBasico,
      // DELEGAÇÃO TOTAL: Centraliza todas as checagens na função 'userData.can' para manter uma única fonte da verdade.
      can: (action, context = null) => userData.can(action, context),
    }; // Explicação: Fim do retorno estruturado do useMemo.
  }, [userData]); // Explicação: Só re-processa a matriz inteira se a conta física do usuário mudar no Firebase Auth.

  return (
    // Explicação: Desenha o invólucro injetando a sacola de poderes calculados na árvore de componentes filhos.
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  ); // Explicação: Encerra a tag de distribuição do provedor global.
}; // Explicação: Encerra o componente Provedor.

export const usePermissions = () => {
  // Explicação: Hook customizado utilitário para os componentes filhos consumirem a portaria com uma única linha de código.
  const context = useContext(PermissionContext); // Explicação: Abre o elo de conexão física com o PermissionContext.
  if (!context)
    throw new Error(
      "usePermissions deve ser usado dentro de um PermissionProvider",
    ); // Explicação: Trava de segurança de engenharia para evitar chamadas órfãs fora do provedor.
  return context; // Explicação: Entrega a matriz de portaria mastigada para o componente que efetuou a chamada.
}; // Explicação: Encerra a exportação do hook usePermissions.
