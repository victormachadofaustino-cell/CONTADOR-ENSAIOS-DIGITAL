import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react"; // Explicação: Importa as ferramentas para criar a memória global, escutas e memorização do aplicativo.
import {
  auth,
  db,
  doc,
  onSnapshot,
  onAuthStateChanged,
} from "../../shared/api/firebase"; // Explicação: Conecta com o login e o banco de dados do Firebase.
import {
  PERMISSIONS_MAP,
  ROLES,
  hasPermission,
} from "../../shared/config/permissions"; // Explicação: Importa as regras e chaves da nossa matriz de portaria de poder.

// Criação do Contexto
const AuthContext = createContext(); // Explicação: Cria o reservatório mestre onde guardaremos os dados do usuário logado para distribuição.

export const AuthProvider = ({ children }) => {
  // Explicação: Componente envolvente que distribui as informações de login para todo o app.
  const [user, setUser] = useState(null); // Explicação: Guarda os dados brutos e básicos do login de Auth (e-mail, uid).
  const [rawUserData, setRawUserData] = useState(null); // Explicação: Isola o perfil bruto baixado da nuvem (igreja original, cargo, nível técnico).
  const [loading, setLoading] = useState(true); // Explicação: Mantém o aplicativo em ponto de espera até que a identidade seja confirmada pelo servidor.

  // ESTADOS DE NAVEGAÇÃO (GPS DE TELA)
  const [activeRegionalId, setActiveRegionalId] = useState(
    localStorage.getItem("activeRegionalId"),
  ); // Explicação: Resgata da memória física qual a regional ativa selecionada.
  const [activeCityId, setActiveCityId] = useState(
    localStorage.getItem("activeCityId"),
  ); // Explicação: Resgata da memória física qual a cidade ativa selecionada.
  const [activeComumId, setActiveComumId] = useState(
    localStorage.getItem("activeComumId"),
  ); // Explicação: Resgata da memória física qual a igreja comum ativa selecionada.

  // MONITOR PRINCIPAL DE IDENTIDADE (RODA UMA ÚNICA VEZ NO BOOT)
  useEffect(() => {
    // Explicação: Gatilho persistente ativado na abertura do ecossistema.
    let unsubSnap = null; // Explicação: Reserva a variável de limpeza para o canal do Firestore.

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Explicação: Abre o vigia nativo para checar se o usuário entrou ou saiu do sistema.
      if (unsubSnap) {
        // Explicação: Se já existia um canal aberto de escuta de banco anterior.
        unsubSnap(); // Explicação: Derruba o canal antigo para não duplicar requisições em background.
        unsubSnap = null; // Explicação: Limpa a referência da memória.
      } // Explicação: Fim da derrubada de canal antigo.

      if (currentUser && !currentUser.emailVerified) {
        // Explicação: Trava de segurança: Se o e-mail não foi verificado na portaria, barra o acesso.
        setUser(null); // Explicação: Apaga os dados básicos de Auth.
        setRawUserData(null); // Explicação: Apaga os dados eclesiásticos.
        setLoading(false); // Explicação: Libera a tela para o bloco de login agir.
        return; // Explicação: Aborta o carregamento.
      } // Explicação: Fim da trava de e-mail verificado.

      setUser(currentUser); // Explicação: Valida e salva o usuário autenticado atual.

      if (currentUser) {
        // Explicação: Se houver uma sessão activa de usuário autenticado.
        try {
          // Explicação: Inicia o tratamento seguro de decodificação de crachá eletrônico.
          const tokenResult = await currentUser.getIdTokenResult(true); // Explicação: RENOVAÇÃO FORÇADA: Baixa o chip do token renovado da nuvem.
          const claims = tokenResult.claims || {}; // Explicação: Isola os metadados gravados de Custom Claims.

          // ESTRATÉGIA CRACHÁ ELETRÔNICO: Se já temos os dados no chip do token, montamos o perfil de graça!
          if (claims.accessLevel && claims.comumId) {
            // Explicação: Confere se os dados de cargo estão gravados diretamente no chip do token.
            setRawUserData({
              // Explicação: Injeta os metadados do chip de forma instantânea sem abrir o banco.
              email: currentUser.email, // Explicação: Salva o e-mail do operador logado.
              name: currentUser.displayName || claims.name || "", // Explicação: Salva o nome de exibição do irmão operador.
              accessLevel: claims.accessLevel, // Explicação: Salva o cargo técnico (ex: gem_local).
              comumId: claims.comumId, // Explicação: Salva a identificação da igreja comum de origem.
              cidadeId: claims.cidadeId, // Explicação: Salva a identificação da cidade de origem.
              regionalId: claims.regionalId, // Explicação: Salva a identificação da regional de origem.
              approved: claims.approved || true, // Explicação: Carimba aprovação automática por chip.
              comum: claims.comum || "", // Explicação: Salva o nome por extenso da igreja comum original.
              role: claims.role || "", // Explicação: Salva a descrição por extenso do cargo eclesiástico.
            }); // Explicação: Encerra o despejo de dados de chip.
            setLoading(false); // Explicação: Destrava a tela para o usuário trabalhar imediatamente.
            return; // Explicação: Missão Cumprida: Economia de cota efetuada com sucesso de forma síncrona!
          } // Explicação: Fim da montagem por crachá eletrônico.

          // PLANO DE CONTINGÊNCIA: Se o chip do crachá estiver vazio (ex: usuário novo), escuta o Firestore
          unsubSnap = onSnapshot(
            doc(db, "users", currentUser.uid),
            (docSnap) => {
              // Explicação: Liga um canal reativo focado na ficha cadastral deste usuário específico.
              if (docSnap.exists()) {
                // Explicação: Se a ficha cadastral do obreiro existir na pasta /users/.
                const data = docSnap.data(); // Explicação: Extrai as propriedades de cargo gravadas na nuvem.
                setRawUserData(data); // Explicação: Despeja na memória bruta de controle do app.
              } // Explicação: Fim da checagem de existência.
              setLoading(false); // Explicação: Libera a interface após concluir o carregamento de segurança.
            },
            (snapError) => {
              // Explicação: Intercepta o erro de permissão do Firestore antes que ele quebre o motor interno do app.
              console.warn(
                "AuthContext: Escuta reativa restrita pelo banco. Usando dados locais com segurança.",
                snapError,
              ); // Explicação: Registra o aviso em logs de depuração.
              setLoading(false); // Explicação: Destrava a tela para o usuário não ficar preso em loop eterno de carregamento.
            },
          ); // Explicação: Encerra o ouvinte reativo de contingência.
        } catch (err) {
          // Explicação: Trata falhas severas de rede no download do token.
          console.error("AuthContext: Erro na renovação de identidade:", err); // Explicação: Avisa os logs do console sobre falhas de token.
          setLoading(false); // Explicação: Libera o app para tratamento de erro sem travar a UI.
        } // Encerra o bloco de tratamento.
      } else {
        // Explicação: Se o usuário efetuou logout voluntário ou foi desconectado pelo servidor.
        setRawUserData(null); // Explicação: Apaga a ficha cadastral de obreiro imediatamente da memória RAM.
        setLoading(false); // Explicação: Desativa as travas de carregamento de segurança.
      } // Explicação: Fim do bloco de checagem de usuário logado.
    }); // Explicação: Fim do observador onAuthStateChanged.

    return () => {
      // Explicação: Retorno de limpeza e desmontagem de componente.
      unsubAuth(); // Explicação: Desconecta o ouvinte do Firebase Auth.
      if (unsubSnap) unsubSnap(); // Explicação: Desconecta o ouvinte do Firestore se ele estiver ativo.
    }; // Explicação: Encerra bloco de limpeza.
  }, []); // Explicação: Matriz vazia garante que essa engrenagem de rede rode apenas UMA vez no boot do app.

  // COBRANÇA CUSTO ZERO: INTELIGÊNCIA DINÂMICA REATIVA VIA MEMÓRIA RAM DO SMARTPHONE
  const userData = useMemo(() => {
    // Explicação: Processa permissões e mescla o GPS sem gerar novas leituras de rede ou banco.
    if (!rawUserData) return null; // Explicação: Se não há perfil bruto logado, retorna nulo para o front.

    const level = rawUserData.accessLevel || ROLES.BASICO; // Explicação: Extrai o cargo técnico do usuário ou rebaixa para básico de segurança.
    const isOwner = user?.email === "victormachadofaustino@gmail.com"; // Explicação: Identifica de forma direta se é o e-mail do Victor.

    // Explicação: Calcula em memória as bandeiras binárias de privilégios hierárquicos para o front-end ler em microsegundos.
    const permissions = {
      isMaster: level === ROLES.MASTER || isOwner, // Explicação: Avalia se é o Administrador Master Supremo do sistema.
      isComissao: level === ROLES.MASTER || isOwner || level === ROLES.COMISSAO, // Explicação: Avalia se pertence à comissão técnica regional.
      isRegionalCidade:
        level === ROLES.MASTER ||
        isOwner ||
        level === ROLES.COMISSAO ||
        level === ROLES.CIDADE, // Explicação: Avalia se administra em nível municipal.
      isGemLocal:
        level === ROLES.MASTER ||
        isOwner ||
        level === ROLES.COMISSAO ||
        level === ROLES.CIDADE ||
        level === ROLES.GEM ||
        rawUserData.isGemLocal ||
        rawUserData.accessLevel === "gem_local" ||
        level === "gem_local", // Explicação: Preservação Intacta: Mantida a sua linha original exata e adicionada a checagem por extenso no final para blindar o GEM Local.
      isBasico: level === ROLES.BASICO, // Explicação: Avalia se o usuário possui apenas nível de acesso básico de leitura.
      isAdmin: level !== ROLES.BASICO, // Explicação: Avalia se o usuário tem qualquer poder administrativo ou de caneta no app.
    };

    // GPS REATIVO v10.10: FOCO OBRIGATÓRIO NO CADASTRO SE O SMART-PILL ESTIVER VAZIO
    // Explicação: Se o usuário não selecionou nenhuma igreja comuns manualmente, trava nos dados originais dele para evitar vazamento.
    const validRegionalId = activeRegionalId || rawUserData.regionalId || null; // Explicação: Cruza a regional ativa selecionada com a regional do obreiro.
    const validCityId = activeCityId || rawUserData.cidadeId || null; // Explicação: Cruza a cidade ativa selecionada com a comarca do obreiro.
    const validComumId = activeComumId || rawUserData.comumId || null; // Explicação: Cruza a igreja comum ativa selecionada com a localidade do obreiro.

    return {
      // Explicação: Cospe o objeto de usuário completo unificado processado em cache.
      ...rawUserData, // Explicação: Copia a ficha cadastral original completa.
      uid: user?.uid, // Explicação: Injeta o identificador único do Firebase Auth.
      ...permissions, // Explicação: Injeta o lote booleano de poder calculado.
      accessLevel: level, // Explicação: Injeta o cargo limpo padronizado do usuário.
      activeRegionalId: validRegionalId, // Explicação: Injeta o filtro ativo de regional territorial.
      activeCityId: validCityId, // Explicação: Injeta o filtro ativo de cidade territorial.
      activeComumId: validComumId, // Explicação: Injeta o filtro ativo de igreja comum selecionada.
      // Explicação: Método reativo direto injetado na alma do perfil para checagem rápida de ações.
      can: (action, contextRole) =>
        hasPermission(
          { ...rawUserData, ...permissions, accessLevel: level },
          action,
          contextRole,
        ),
    };
  }, [rawUserData, user, activeRegionalId, activeCityId, activeComumId]); // Explicação: Só recalcula a matemática se o perfil mudar ou ele tocar no filtro GPS do cabeçalho.

  // FUNÇÕES DO GPS v10.7: Ajustado para limpeza higiênica de filtros em cascata vertical.
  const setContext = (type, id) => {
    // Explicação: Método acionado quando o operador altera a localidade no topo do app.
    if (type === "regional") {
      // Explicação: Se ele alterou a Regional mestre.
      setActiveRegionalId(id); // Explicação: Altera o estado na RAM do smartphone.
      id
        ? localStorage.setItem("activeRegionalId", id)
        : localStorage.removeItem("activeRegionalId"); // Explicação: Sincroniza a memória física flash.
      setActiveCityId(null); // Explicação: EFEITO CASCATA: Limpa a cidade selecionada anteriormente para não gerar buscas órfãs.
      localStorage.removeItem("activeCityId"); // Explicação: Expulsa do armazenamento local físico.
      setActiveComumId(null); // Explicação: EFEITO CASCATA: Limpa a igreja comum anterior para blindar o contador.
      localStorage.removeItem("activeComumId"); // Explicação: Expulsa do armazenamento local físico.
    } // Explicação: Fim do bloco regional.
    if (type === "city") {
      // Explicação: Se ele alterou a Cidade.
      setActiveCityId(id); // Explicação: Atualiza a cidade ativa na RAM.
      id
        ? localStorage.setItem("activeCityId", id)
        : localStorage.removeItem("activeCityId"); // Explicação: Sincroniza a memória física flash.
      setActiveComumId(null); // Explicação: EFEITO CASCATA: Limpa a igreja comum para obrigar o operador a escolher uma nova comum legítima daquela cidade.
      localStorage.removeItem("activeComumId"); // Explicação: Expulsa do armazenamento local físico.
    } // Explicação: Fim do bloco de cidade.
    if (type === "comum") {
      // Explicação: Se ele focou em uma Igreja Comum específica.
      setActiveComumId(id); // Explicação: Atualiza a comum ativa na RAM.
      id
        ? localStorage.setItem("activeComumId", id)
        : localStorage.removeItem("activeComumId"); // Explicação: Sincroniza a memória física flash.
    } // Explicação: Fim do bloco de comum.
  }; // Explicação: Encerra o gerenciador de GPS territorial.

  const value = {
    // Explicação: Objeto unificado que empacota os métodos expostos para o front-end.
    user, // Explicação: Entrega os dados crus de autenticação.
    userData, // Explicação: Entrega o perfil com claims, permissões e filtros calculados a custo zero de banco.
    loading, // Explicação: Entrega o estado de carregamento de segurança.
    // 🚀 BLINDAGEM DE ROTEAMENTO: Permite o acesso se estiver logado, e-mail verificado e se for aprovado OU possuir cargo administrativo de caneta (David blindado).
    isAuthenticated:
      !!user &&
      user.emailVerified &&
      (userData?.approved || userData?.isAdmin || userData?.isMaster), // Explicação: Regra de portaria de roteamento.
    setContext, // Explicação: Entrega a chave de mudança de GPS territorial.
  };

  return (
    // Explicação: Renderiza o encapsulador global provendo os estados para os arquivos filhos.
    <AuthContext.Provider value={value}>
      {/* Fornece o reservatório reativo blindado. */}
      {!loading && children}{" "}
      {/* Explicação: Só renderiza as telas do aplicativo se as engrenagens de segurança terminarem o carregamento. */}
    </AuthContext.Provider>
  ); // Explicação: Encerra o retorno de interface.
}; // Explicação: Encerra o AuthProvider.

export const useAuth = () => {
  // Explicação: Gancho (Hook) customizado para as telas chamarem as credenciais com uma linha de código.
  const context = useContext(AuthContext); // Explicação: Captura as informações de dentro do reservatório AuthContext.
  if (!context)
    throw new Error("useAuth deve ser usado dentro de um AuthProvider"); // Explicação: Trava de desenvolvimento contra chamadas órfãs.
  return context; // Explicação: Retorna os dados prontos para consumo das telas.
}; // Explicação: Encerra a exportação do useAuth.
