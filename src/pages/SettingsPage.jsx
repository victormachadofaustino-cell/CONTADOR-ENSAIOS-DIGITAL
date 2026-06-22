import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import { db, collection, onSnapshot, doc, query, where } from '../config/firebase'; // Explicação: Importa os motores de conexão em tempo real com o banco de dados Firebase.
import { // Explicação: Importa o pacote de ícones modernos e visuais para ilustrar os botões e menus do aplicativo.
  Home, Music, Users, ShieldCheck, Plus, ChevronDown, ChevronRight,
  MapPin, Building2, LayoutGrid, Settings, Briefcase, Trash2, X, ClipboardList, Contact
} from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Explicação: Importa o sistema de identidade para ler o Crachá Eletrônico do usuário logado.
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa as ferramentas responsáveis por criar transições e animações suaves na tela.
import toast from 'react-hot-toast'; // Explicação: Importa o sistema de avisos e alertas flutuantes de sucesso ou erro na tela.

// Importação dos Módulos - Preservando caminhos originais intocados e incluindo os novos agregados
import ModuleChurch from './settings/ModuleChurch'; // Explicação: Importa o submódulo de edição de dados cadastrais da igreja.
import ModuleOrchestra from './settings/ModuleOrchestra'; // Explicação: Importa o submódulo de ativação e desativação de instrumentos musicais.
import ModuleGlobal from './settings/ModuleGlobal'; // Explicação: Importa o submódulo administrativo de Cargos e Ministérios.
import ModuleAccess from './settings/ModuleAccess'; // Explicação: Importa o submódulo de controle de portaria e liberação de usuários.
import ModuleCities from './settings/ModuleCities'; // Explicação: Importa o submódulo de cadastro geográfico de cidades.
import ModuleChurchesManager from './settings/ModuleChurchesManager'; // Explicação: Importa o gerenciador geral de criação e manutenção de cookies comuns.
import ModuleMinistryLocal from './settings/ModuleMinistryLocal'; // Explicação: AMARRAÇÃO DE INFRAESTRUTURA: Importa o novo lar purificado do Corpo Ministerial Eclesiástico.
import ModuleOrchestraBody from './settings/ModuleOrchestraBody'; // Explicação: AMARRAÇÃO DE INFRAESTRUTURA: Importa a garagem nominal de músicos para a chamada de presença.

const SettingsPage = () => { // Explicação: Inicia a construção da página principal de Configurações e Ajustes.
  const { userData, setContext } = useAuth(); // Explicação: Puxa as informações do usuário logado e a ferramenta de mudar o foco territorial do GPS.
  const [loading, setLoading] = useState(true); // Explicação: Estado que controla se a página ainda está carregando os dados do banco de dados.
  
  const [selectedCity, setSelectedCity] = useState(null); // Explicação: Armazena a cidade que foi selecionada no menu para filtrar as opções.
  const [selectedComum, setSelectedComum] = useState(null); // Explicação: Armazena a igreja comum que está sendo configurada no momento.
  const [activeModal, setActiveModal] = useState(null); // Explicação: Lógica de Mercado: Controla qual modal/painel autônomo está cobrindo a tela no momento.

  // --- LÓGICA DE COMPETÊNCIAS v2.1 (MATRIZ DE PODER VIA CRACHÁ ELETRÔNICO) ---
  const level = userData?.accessLevel; // Explicação: Lê o cargo de autoridade gravado no Crachá Eletrônico do usuário.
  const isMaster = level === 'master'; // Explicação: Verifica se o usuário é o criador/administrador supremo do sistema.
  const isComissao = isMaster || level === 'comissao'; // Explicação: Define se o usuário pertence à comissão técnica regional de música.
  const isRegionalCidade = isComissao || level === 'regional_cidade'; // Explicação: Define se o usuário tem poder para gerenciar uma cidade inteira.
  const isGemLocal = isRegionalCidade || level === 'gem_local'; // Explicação: Define se o usuário é um secretário de igreja comum local.

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId || null; // Explicação: Define a ID da Regional principal baseada no Crachá do usuário.
  const comumIdEfetivo = selectedComum?.id || userData?.activeComumId || null; // Explicação: Descobre a ID da igreja que deve ser editada agora.

  const [sharedData, setSharedData] = useState({ // Explicação: Cria um armário de memória para guardar dados compartilhados entre as telas.
    cargos: [], // Explicação: Lista vazia que guardará os cargos de referência (ex: Músico, Organista).
    ministeriosDropdown: [], // Explicação: Lista vazia que guardará os ministérios de referência (ex: Ancião, Diácono).
    instruments: [], // Explicação: Lista que guardará os instrumentos da orquestra daquela igreja específica.
    cidades: [], // Explicação: Lista que armazenará as cidades permitidas para o nível do usuário.
    comunsDaRegional: [] // Explicação: Lista que conterá as igrejas comuns de acordo com o poder do crachá do usuário.
  });

  // FUNÇÃO DE EXCLUSÃO NATIVA (REPLACE window.confirm)
  const confirmarExclusaoNativa = (itemNome, aoConfirmar) => { // Explicação: Cria uma caixa de confirmação de exclusão bonita, mobile-first e segura.
    toast((t) => ( // Explicação: Dispara um alerta customizado no centro da tela com botões grandes.
      <div className="flex flex-col gap-4 p-1 min-w-[280px]"> {/* Explicação: Caixa vertical com espaçamentos confortáveis para cliques no celular. */}
        <div className="flex flex-col gap-1 text-left"> {/* Explicação: Agrupa os textos de aviso de exclusão alinhados à esquerda. */}
          <div className="flex items-center gap-2 text-red-600"> {/* Explicação: Linha com ícone de lixeira e título na cor vermelha de perigo. */}
            <Trash2 size={16} strokeWidth={3} /> {/* Explicação: Ícone visual de lixeira com traço grosso e bem visível. */}
            <p className="text-[12px] font-black uppercase tracking-wider">Confirmar Exclusão</p> {/* Explicação: Texto de cabeçalho em letras maiúsculas e bem marcantes. */}
          </div> {/* Explicação: Fecha o cabeçalho do aviso. */}
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed whitespace-normal break-words"> {/* Explicação: Parágrafo explicativo em tom cinza com quebra de linha de texto inteira sem cortes. */}
            Deseja realmente excluir <span className="font-bold text-slate-950 italic">"{itemNome}"</span>? {/* Explicação: Mostra o nome do item que será deletado em negrito e itálico completo. */}
            Esta ação é irreversível e removerá todos os dados vinculados. {/* Explicação: Alerta de segurança informando que não dá para desfazer a ação. */}
          </p> {/* Explicação: Fecha o parágrafo explicativo. */}
        </div> {/* Explicação: Fecha o bloco de textos. */}
        
        <div className="flex gap-2 justify-end pt-2"> {/* Explicação: Linha horizontal que alinha os botões de ação no canto inferior direito. */}
          <button // Explicação: Botão para desistir da exclusão.
            onClick={() => toast.dismiss(t.id)} // Explicação: Ao clicar, simplesmente fecha o aviso da tela sem fazer nada.
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors" // Explicação: Estilo de texto cinza discreto e área de clique confortável.
          >
            Cancelar {/* Explicação: Texto do botão de desistência. */}
          </button> {/* Explicação: Fecha o botão cancelar. */}
          <button // Explicação: Botão vermelho e definitivo para confirmar a exclusão.
            onClick={() => { // Explicação: Executa as funções de apagar e fecha o alerta ao mesmo tempo.
              toast.dismiss(t.id); // Explicação: Fecha o balão de alerta da tela.
              aoConfirmar(); // Explicação: Executa a exclusão real no banco de dados.
            }}
            className="bg-red-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2" // Explicação: Botão vermelho chamativo, cantos arredondados, sombra suave e efeito de encolher ao toque.
          >
            Excluir Agora {/* Explicação: Texto do botão de confirmação definitiva. */}
          </button> {/* Explicação: Força o fechamento do botão de exclusão. */}
        </div> {/* Explicação: Fecha a linha de botões. */}
      </div>
    ), { // Explicação: Configurações extras do balão de aviso.
      duration: Infinity, // Explicação: Força o aviso a ficar na tela até que o usuário clique em um dos dois botões.
      position: 'top-center', // Explicação: Posiciona o alerta no topo central da tela do celular.
      style: { // Explicação: Desenha a estética física do balão (cantos arredondados, fundo branco e sombra marcante).
        borderRadius: '2.5rem',
        background: '#fff',
        border: '1px solid #F1F5F9',
        padding: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      },
    });
  };

  useEffect(() => { // Explicação: Monitor que roda automaticamente para sincronizar as seleções do GPS com os menus da tela.
    if (userData?.activeCityId) { // Explicação: Se o GPS do app estiver focado em uma cidade específica.
      const city = sharedData.cidades.find(c => c.id === userData.activeCityId); // Explicação: Procura essa cidade dentro da nossa lista na memória.
      if (city) setSelectedCity(city); // Explicação: Se achou, marca ela como a cidade ativa na tela.
      else setSelectedCity(null); // Explicação: Se não achou, limpa a seleção.
    } else {
      setSelectedCity(null); // Explicação: Se o GPS não tiver cidade ativa, zera a seleção della tela.
    }

    if (!userData?.activeComumId) { // Explicação: Se o GPS não tiver nenhuma igreja selecionada.
      setSelectedComum(null); // Explicação: Zera a igreja ativa na tela de ajustes.
    }
  }, [userData?.activeCityId, userData?.activeComumId, sharedData.cidades]); // Explicação: Lista de variáveis que ativam esse monitor quando sofrem alterações.

  useEffect(() => { // Explicação: O Motor de Otimização de Banco de Dados que busca as locais de apoio baseadas no Crachá do Usuário.
    if (!activeRegionalId || !userData) return; // Explicação: Se o usuário não tiver uma regional definida, cancela para evitar erros.
    let isMounted = true; // Explicação: Mecanismo de segurança para saber se a tela ainda está aberta antes de salvar dados.
    const unsubs = []; // Explicação: Caixa coletora que guardará todos os canais de conexão abertos com o banco.

    setLoading(true); // Explicação: Coloca a tela no modo "Carregando" por segurança.

    try { // Explicação: Tenta abrir as conexões com o banco de dados.
      unsubs.push(onSnapshot(collection(db, 'referencia_cargos'), (s) => { // Explicação: Abre um canal em tempo real com a tabela global de Cargos e Ministérios.
        if (!isMounted) return; // Explicação: Aborta se o usuário já tiver saído da tela enquanto o banco respondia.
        const cargosData = s.docs.map(d => ({ id: d.id, ...d.data() })); // Explicação: Transforma os documentos brutos do banco em objetos JavaScript legíveis.
        setSharedData(prev => ({ // Explicação: Separa e salva os dados nas suas respectivas gavetas na memória interna.
          ...prev, 
          cargos: cargosData.filter(c => c.tipo === 'cargo'), // Explicação: Filtra e guarda apenas o que for Cargo de músico.
          ministeriosDropdown: cargosData.filter(c => c.tipo === 'ministerio') // Explicação: Filtra e guarda apenas o que for Ministério da irmandade.
        }));
      }));

      // --- CRITÉRIO DE QUOTA CIRÚRGICO: Secretário Local (gem_local) não baixa a lista de toda a regional ---
      if (level === 'gem_local' && userData?.comumId) { // Explicação: Se o crachá do usuário disser que ele cuida apenas de uma igreja local.
        const comumDocRef = doc(db, 'comuns', userData.comumId); // Explicação: Cria a mira apontando direto e unicamente para o documento da igreja dele.
        unsubs.push(onSnapshot(comumDocRef, (docSnap) => { // Explicação: Abre o canal de escuta apenas para esse documento específico de forma ultra econômica.
          if (!isMounted || !docSnap.exists()) return; // Explicação: Aborta se o documento não existir ou se a tela foi fechada.
          const comumUnica = { id: docSnap.id, ...docSnap.data(), comum: docSnap.data().comum || "Sem Nome" }; // Explicação: Monta os dados da única igreja dele.
          setSharedData(prev => ({ ...prev, comunsDaRegional: [comumUnica], cidades: [{ id: comumUnica.cidadeId, nome: comumUnica.cidadeNome || "SUA CIDADE" }] })); // Explicação: Alimenta as opções da tela direto com o dado dele.
          setSelectedComum(comumUnica); // Explicação: Força a tela a já selecionar a igreja dele automaticamente.
          setLoading(false); // Explicação: Desativa o modo de carregamento da tela.
        }));
      } else { // Explicação: Caso o usuário seja nível Regional ou Master, ele sim precisa ver a lista expandida.
        const qComuns = query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId)); // Explicação: Cria uma busca filtrando apenas as igrejas que pertencem à regional dele.
        unsubs.push(onSnapshot(qComuns, (s) => { // Explicação: Abre o canal em tempo real para escutar a lista de igrejas da regional.
          if (!isMounted) return; // Explicação: Aborta se a tela foi fechada durante o processo.
          const listaBruta = s.docs.map(d => ({ id: d.id, ...d.data(), comum: d.data().comum || "Sem Nome" })); // Explicação: Transforma a lista de comuns do banco em formato legível.
          const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])]; // Explicação: Mapeia quais IDs de igrejas este usuário tem direito de enxergar.
          
          const comunsVisiveis = (isComissao) // Explicação: Aplica o filtro de segurança de visualização territorial.
            ? listaBruta // Explicação: Se for da Comissão de Música, enxerga absolutamente todas as igrejas da regional.
            : listaBruta.filter(c => c.cidadeId === userData?.cidadeId || permitidasIds.includes(c.id)); // Explicação: Se for regional de cidade, vê apenas as igrejas da sua própria cidade.

          setSharedData(prev => ({ ...prev, comunsDaRegional: comunsVisiveis })); // Explicação: Salva a lista filtrada de igrejas comuns na memória da tela.

          const qCidades = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId)); // Explicação: Cria uma busca pelas cidades configuradas dentro desta regional.
          unsubs.push(onSnapshot(qCidades, (sCids) => { // Explicação: Abre o canal de escuta em tempo real para as cidades da regional.
            if (!isMounted) return; // Explicação: Cancela se o usuário saiu da tela.
            const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome })); // Explicação: Transforma as cidades em objetos com ID e Nome.
            const filtradas = isComissao ? todasCidades.sort((a, b) => a.nome.localeCompare(b.nome)) : todasCidades.filter(cid => cid.id === userData?.cidadeId); // Explicação: Membros da comissão veem todas em ordem alfabética; gestores de cidade veem apenas a sua cidade.
            
            setSharedData(prev => ({ ...prev, cidades: filtradas })); // Explicação: Salva a lista de cidades na memória compartilhada da tela.
            setLoading(false); // Explicação: Finaliza com sucesso o carregamento de dados da tela.
          }));
        }));
      }
    } catch (error) { // Explicação: Captura qualquer erro inesperado de conexão.
      if (isMounted) setLoading(false); // Explicação: Desativa o carregamento mesmo em caso de erro para não travar a tela do usuário.
    }
    return () => { isMounted = false; unsubs.forEach(unsub => unsub?.()); }; // Explicação: Função de limpeza que desliga todos os canais de banco ao sair da tela, evitando vazamento de memória.
  }, [activeRegionalId, isComissao, level]); // Explicação: Gatilhos que disparam este bloco se sofrerem alterações.

  useEffect(() => { // Explicação: Monitor responsável por escutar os detalhes profundos da igreja selecionada (Instrumentos e Métodos).
    if (!comumIdEfetivo) return; // Explicação: Se não houver igreja focada, ignora este bloco para poupar cota de leitura.
    let isMounted = true; // Explicação: Trava de segurança contra atualização de componentes desmontados.
    
    const comumAindaValida = sharedData.comunsDaRegional.some(c => c.id === comumIdEfetivo); // Explicação: Checa se a igreja selecionada ainda existe e está disponível na lista ativa.
    if (!comumAindaValida && level !== 'gem_local') { // Explicação: Se a igreja sumiu ou ficou inválida e não for um secretário fixo travado.
        setSelectedComum(null); // Explicação: Limpa a seleção da tela para evitar falhas de dados órfãos.
        return; // Explicação: Cancela o processo.
    }

    const docRefFocado = doc(db, 'comuns', comumIdEfetivo); // Explicação: Cria a referência imutável do documento da comum ativa.
    const unsub = onSnapshot(docRefFocado, (docSnap) => { // Explicação: Abre o canal em tempo real para monitorar os dados cadastrais da igreja comum selecionada.
        if (docSnap.exists() && isMounted) setSelectedComum({ id: docSnap.id, ...docSnap.data() }); // Explicação: Atualiza em tempo real as informações de endereço e horários da igreja comum.
    });
    const unsubInst = onSnapshot(collection(db, 'comuns', comumIdEfetivo, 'instrumentos_config'), (sInst) => { // Explicação: Abre canal com a subcoleção interna que diz quais instrumentos estão ativos ou desativados nesta igreja.
      if (!isMounted) return; // Explicação: Aborta se a tela foi fechada.
      setSharedData(prev => ({ ...prev, instruments: sInst.docs.map(d => ({ ...d.data(), id: d.id, section: d.data().section?.toUpperCase() || 'GERAL' })) })); // Explicação: Transforma a lista de instrumentos em maiúsculo por segurança e salva na memória do app.
    });
    return () => { isMounted = false; unsub(); unsubInst(); }; // Explicação: Desliga os ouvintes de detalhes da igreja ao trocar de seleção ou fechar a página.
  }, [comumIdEfetivo, sharedData.comunsDaRegional, level]); // Explicação: Variáveis que reiniciam esta escuta profunda se mudarem.

  if (!userData) return null; // Explicação: Se a identidade do usuário sumiu por completo, renderiza uma tela vazia por segurança.

  if (loading && isRegionalCidade) return ( // Explicação: Renderiza um visual de carregamento premium em formato de spinner enquanto checa os poderes territoriais.
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4"> {/* Explicação: Centraliza o carregamento verticalmente ocupando 60% da altura da tela. */}
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div> {/* Explicação: Círculo azul giratório com animação de spin fluida. */}
      <div className="font-black italic text-slate-400 text-[10px] uppercase tracking-widest text-center">Sincronizando Jurisdição...</div> {/* Explicação: Texto descritivo elegante em letras maiúsculas e espaçadas. */}
    </div>
  );

  return ( // Explicação: Inicia a renderização do layout físico da página de Ajustes.
    <div className="space-y-5 pb-40 px-4 pt-4 max-w-md mx-auto text-left font-sans"> {/* Explicação: Margens mobile confortáveis, largura máxima controlada para não esticar em tablets e alinhamento à esquerda. */}
      
      {/* 📍 REORGANIZAÇÃO FIXA NO TOPO: FILTROS E GPS DE NAVEGAÇÃO JURISDICIONAL */}
      {isRegionalCidade && ( // Explicação: Só exibe seletores de GPS se o usuário tiver poder regional para gerenciar mais de uma localidade.
        <div key={`pills-container-${activeRegionalId}`} className="grid grid-cols-1 gap-2.5 pb-4 border-b border-slate-100"> {/* Explicação: Grid empilhado verticalmente com espaçamento premium de mercado no topo absoluto. */}
          {/* Pill Cidade */}
          <div className={`flex items-center gap-2.5 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-xs transition-all ${(!isComissao || sharedData.cidades.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}> {/* Explicação: Card com fundo branco semi-transparente, efeito vidro, bordas arredondadas e toque confortável. Fica cinza se for Secretário Local travado. */}
            <MapPin size={13} className="text-indigo-600 shrink-0" /> {/* Explicação: Ícone de alfinete de localização na cor azul/indigo de alta legibilidade. */}
            <select // Explicação: Menu de seleção da Cidade ativa.
              className="bg-transparent text-[10.5px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer tracking-tight whitespace-normal leading-normal" // Explicação: Letras pretas marcantes, sem bordas internas feias, sem cortes de texto (...) para visualização por extenso.
              value={selectedCity?.id || ''} // Explicação: Vincula a seleção da tela com o estado della cidade na memória.
              disabled={!isComissao || sharedData.cidades.length === 0} // Explicação: Trava o menu se o usuário não tiver permissão de trocar de cidade.
              onChange={(e) => { // Explicação: Executa em cascata ao mudar a cidade.
                const city = sharedData.cidades.find(c => c.id === e.target.value); // Explicação: Localiza o objeto completo da cidade escolhida.
                setSelectedCity(city); // Explicação: Foca a tela na cidade nova.
                setContext('city', city?.id); // Explicação: Atualiza o GPS global do app para focar nesta cidade.
                setSelectedComum(null); // Explicação: Limpa a igreja antiga imediatamente (limpeza em cascata obrigatória).
                setContext('comum', null); // Explicação: Avisa o GPS global que nenhuma igreja está selecionada por enquanto.
              }}
            >
              <option value="">{sharedData.cidades.length === 0 ? "NENHUMA CIDADE CADASTRADA" : isComissao ? "SELECIONE A CIDADE..." : (userData?.cidadeNome || "SUA CIDADE ATIVA")}</option> {/* Explicação: Opção padrão inteligente por extenso adaptada ao nível do crachá do irmão. */}
              {sharedData.cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)} {/* Explicação: Varre a lista de cidades da memória e cria as linhas de option no menu. */}
            </select> {/* Explicação: Fecha o seletor de cidade. */}
          </div> {/* Explicação: Fecha a caixinha visual da cidade. */}

          {/* Pill Localidade */}
          <div className={`flex items-center gap-2.5 bg-slate-950 p-3 rounded-2xl shadow-md border border-white/5 ${(!selectedCity && sharedData.cidades.length > 0) ? 'opacity-50 pointer-events-none' : ''}`}> {/* Explicação: Card de alto destaque estético (fundo preto ardósia, sombra profunda, cantos arredondados). Bloqueado até que uma cidade seja escolhida. */}
            <Home size={13} className="text-indigo-400 shrink-0" /> {/* Explicação: Ícone pequeno de igreja comum na cor azul clara de alto contraste. */}
            <select // Explicação: Menu de seleção da Igreja Comum ativa para manutenção.
              className="bg-transparent text-[10px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer pr-5 tracking-tight whitespace-normal leading-normal" // Explicação: Letras brancas em alto contraste sobre o fundo preto, sem cortes de texto para visualização inteira.
              value={selectedComum?.id || ''} // Explicação: Vincula a seleção com o estado da igreja comum na memória.
              disabled={!selectedCity && sharedData.cidades.length > 0} // Explicação: Trava la caixinha se nenhuma cidade foi definida antes.
              onChange={(e) => { // Explicação: Executa ao escolher uma igreja.
                const com = sharedData.comunsDaRegional.find(c => c.id === e.target.value); // Explicação: Acha a igreja correspondente na memória da lista.
                setSelectedComum(com); // Explicação: Foca a tela nesta igreja comum.
                setContext('comum', com?.id); // Explicação: Atualiza o GPS global do app informando qual igreja está ativa agora.
              }}
            >
              <option value="" className="text-slate-900"> {/* Explicação: Linha padrão explicativa com texto escuro para legibilidade interna. */}
                {sharedData.cidades.length === 0 ? "AGUARDANDO SELEÇÃO DE CIDADE" : sharedData.comunsDaRegional.filter(c => selectedCity ? c.cidadeId === selectedCity.id : true).length === 0 ? "NENHUMA IGREJA DISPONÍVEL" : "SELECIONE A LOCALIDADE POR EXTENSO..."}
              </option> {/* Explicação: Fecha a linha padrão. */}
              {sharedData.comunsDaRegional // Explicação: Filtra as igrejas que pertencem à cidade selecionada e renderiza no menu.
                .filter(c => selectedCity ? c.cidadeId === selectedCity.id : true)
                .map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.comum}</option>)}
            </select> {/* Explicação: Fecha o seletor de localidade. */}
            <ChevronDown size={13} className="text-white/20 ml-auto shrink-0" /> {/* Explicação: Seta discreta indicando que a caixinha preta expande ao tocar. */}
          </div> {/* Explicação: Fecha a caixinha visual de localidade. */}
        </div>
      )}

      {/* 🔐 REORGANIZAÇÃO: CONDIÇÕES E BOTÕES COMPACTOS SEPARADOS POR NÍVEL DE ACESSO */}
      
      {/* SEÇÃO 1: PAINEL ADMINISTRATIVO REGIONAL (Nível Master / Comissão) */}
      {isComissao && ( // Explicação: Matriz de Permissão: Renderiza os botões de administração de base apenas para quem possui crachá Master ou Comissão.
        <div className="space-y-2 animate-in fade-in duration-300">
          <div className="px-1 flex flex-col text-left"> {/* Explicação: Pequeno rótulo de seção organizacional para guiar o usuário sem tutoriais. */}
            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest italic leading-none">Nível: Administration Regional</span>
          </div>
          <div className="grid grid-cols-2 gap-2"> {/* Explicação: Interface compacta de mercado dividindo as ações em 2 colunas menores e organizadas. */}
            <MenuButton icon={<Briefcase size={15}/>} title="Cargos & Funções" onClick={() => setActiveModal('global')} /> {/* Explicação: Botão compacto que aciona o modal autônomo de cargos. */}
            <MenuButton icon={<MapPin size={15}/>} title="Gestão de Cidades" onClick={() => setActiveModal('cities')} /> {/* Explicação: Botão compacto que aciona o modal autônomo de cidades. */}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: PAINEL DE INFRAESTRUTURA TERRITORIAL (Nível Regional / Gestor de Cidade) */}
      {isRegionalCidade && ( // Explicação: Renderiza o gerenciador de igrejas para quem cuida de cidades ou sub-regiões.
        <div className="space-y-2 pt-1 animate-in fade-in duration-300">
          {isComissao && <div className="h-px bg-slate-100 mx-1" />} {/* Explicação: Linha divisória sutil para não embolar as seções visuais no celular. */}
          <div className="px-1 flex flex-col text-left">
            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest italic leading-none">Nível: Gestão de Infraestrutura</span>
          </div>
          <div className="grid grid-cols-1"> {/* Explicação: Botão expandido em largura inteira para gerenciamento de obras de novas igrejas comuns. */}
            <MenuButton icon={<Building2 size={15}/>} title="Manutenção e Criação de Comuns" onClick={() => setActiveModal('churches_mgr')} />
          </div>
        </div>
      )}

      {/* SEÇÃO 3: PAINEL OPERACIONAL LOCAL (Nível Secretário Local / Zeladoria da Comum Ativa) */}
      <div className="space-y-3 pt-1">
        {selectedComum?.id && sharedData.comunsDaRegional.some(c => c.id === selectedComum.id) ? ( // Explicação: Checagem Crítica de Segurança: Só renderiza as configurações operacionais se houver uma igreja legitimamente selecionada no topo.
          <div className="space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-500"> {/* Explicação: Agrupador das configurações da igreja com animação premium. */}
            <div className="h-px bg-slate-100 mx-1" /> {/* Explicação: Divisor visual estético. */}
            <div className="px-1 leading-none flex flex-col text-left"> {/* Cabeçalho interno informando a manutenção ativa sem cortes de texto. */}
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest italic leading-none">Zeladoria Ativa na Comum:</p> 
              <h3 className="text-[13px] font-black text-slate-950 uppercase italic tracking-tight leading-normal mt-1.5 whitespace-normal break-words"> {/* Explicação: Nome exibido por inteiro sem reticências feias, quebrando linha se necessário. */}
                {selectedComum.comum}
              </h3>
            </div>

            {isGemLocal && ( // Explicação: ORDEM OPERACIONAL SOLICITADA PELO USUÁRIO (Segurança ➔ Cadastro ➔ Ministério Local ➔ Corpo Orquestral ➔ Orquestra).
              <div className="grid grid-cols-1 gap-2 pt-0.5"> {/* Explicação: Grade vertical compacta exibindo todas as descrições inteiras sem abreviações. */}
                
                {/* 1. SEGURANÇA */}
                <MenuButton icon={<Users size={15}/>} title="Controle de Acessos & Portaria Local" moduleName="Segurança" onClick={() => setActiveModal('users')} />
                
                {/* 2. CADASTRO */}
                <MenuButton icon={<Home size={15}/>} title="Alterar Endereço e Dias de Cultos" moduleName="Cadastro" onClick={() => setActiveModal('church')} />
                
                {/* 3. MINISTÉRIO LOCAL */}
                <MenuButton icon={<ClipboardList size={15}/>} title="Corpo Ministerial & Administração Eclesiástica" moduleName="Ministério Local" onClick={() => setActiveModal('ministerio_local')} />
                
                {/* 4. CORPO ORQUESTRAL */}
                <MenuButton icon={<Contact size={15}/>} title="Cadastro de Músicos & Chamada de Presença" moduleName="Corpo Orquestral" onClick={() => setActiveModal('corpo_orquestral')} />
                
                {/* 5. ORQUESTRA */}
                <MenuButton icon={<Music size={15}/>} title="Configurar Instrumentação & Ativação de Naipes" moduleName="Orquestra" onClick={() => setActiveModal('orchestra')} />
                
              </div>
            )}
          </div>
        ) : ( // Explicação: Caso nenhuma igreja tenha sido selecionada no GPS superior ainda, exibe um card de orientação amigável por extenso.
          <div className="p-8 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-in fade-in zoom-in duration-300 shadow-xs"> {/* Explicação: Card branco, contorno pontilhado cinza discreto e animação suave de zoom. */}
            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3"> {/* Explicação: Moldura para o ícone. */}
              <MapPin size={24} /> {/* Explicação: Ícone grande de alfinete de mapa indicando foco de localização geográfica. */}
            </div> {/* Explicação: Fecha a moldura do ícone. */}
            <p className="text-slate-400 font-black uppercase italic text-[9px] tracking-widest leading-relaxed whitespace-normal px-2"> {/* Explicação: Texto de instrução por extenso sem cortes. */}
              Jurisdição Territorial Indefinida <br/> <span className="text-[8px] opacity-75 normal-case font-bold text-slate-400 block mt-1">Por favor, utilize os seletores de filtros localizados no topo da tela para selecionar uma localidade ativa e liberar os painéis de ajustes.</span> {/* Explicação: Explica de forma interativa o que fazer. */}
            </p> {/* Explicação: Fecha o texto de instrução. */}
          </div> // Explicação: Fecha o card de orientação.
        )}
      </div> {/* Explicação: Fecha o bloco operacional de atividades. */}

      {/* SYSTEMA DE MODAIS BOTTOM-SHEET AUTOMÁTICOS PREMIUM DE MERCADO */}
      <AnimatePresence>
        {activeModal && ( // Explicação: Se houver qualquer string ativa no estado, monta o contêiner de cortina preta de fundo.
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-end justify-center z-50 animate-in fade-in duration-200">
            <motion.div
              initial={{ y: '100%' }} // Explicação: CORREÇÃO: Limpado ruído '' que impedia compilação do Vite.
              animate={{ y: 0 }} // Explicação: CORREÇÃO: Limpado ruído ''.
              exit={{ y: '100%' }} // Explicação: CORREÇÃO: Limpado ruído ''.
              transition={{ type: 'spring', damping: 26, stiffness: 230 }} // Explicação: CORREÇÃO: Limpado ruído '' de transição elástica.
              className="bg-white rounded-t-[2.5rem] w-full max-w-md h-[93vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
            >
              {/* CABEÇALHO GERAL DO MODAL AUTÔNOMO */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 text-left">
                <div className="leading-tight text-left pr-2 flex-1 min-w-0">
                  <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest italic mb-0.5">Módulo Configurações</p>
                  <h3 className="text-[12px] font-black text-slate-900 uppercase italic tracking-tight whitespace-normal break-words leading-snug"> {/* Explicação: Título do modal por extenso sem cortes em elipse. */}
                    {activeModal === 'global' && 'Painel de Referências: Cargos & Ministérios'}
                    {activeModal === 'cities' && 'Geografia Regional: Gestão de Cidades Ativas'}
                    {activeModal === 'churches_mgr' && 'Infraestrutura: Manutenção de Comuns'}
                    {activeModal === 'users' && 'Segurança Operacional: Acesso & Portaria Local'}
                    {activeModal === 'church' && 'Zeladoria de Dados Cadastrais da Comum'}
                    {activeModal === 'ministerio_local' && 'Painel da Comum: Corpo Ministerial Eclesiástico'}
                    {activeModal === 'corpo_orquestral' && 'Painel da Comum: Cadastro Nominal do Corpo Orquestral'}
                    {activeModal === 'orchestra' && 'Configuração de Orquestra & Ativação de Naipes'}
                  </h3>
                </div>
                {/* ÁREA DE TOQUE DE FECHAMENTO CONFORTO ERGONÔMICO DE 44PX */}
                <button 
                  onClick={() => { setActiveModal(null); }} // Explicação: Ao fechar o modal, limpa o estado ativo retornando à tela de base de forma limpa.
                  className="w-11 h-11 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 outline-none transition-all active:scale-90 shrink-0"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* CONTEÚDO DO MODAL TOTALMENTE ISOLADO EM FLUXO AUTÔNOMO */}
              <div className="flex-1 overflow-y-auto p-5 bg-slate-50/40 no-scrollbar">
                {activeModal === 'global' && <ModuleGlobal cargos={sharedData.cargos} ministerios={sharedData.ministeriosDropdown} onConfirmDelete={confirmarExclusaoNativa} />}
                {activeModal === 'cities' && <ModuleCities regionalId={activeRegionalId} onConfirmDelete={confirmarExclusaoNativa} />}
                {activeModal === 'churches_mgr' && <ModuleChurchesManager selectedCity={selectedCity} regionalId={activeRegionalId} onConfirmDelete={confirmarExclusaoNativa} />}
                {activeModal === 'orchestra' && <ModuleOrchestra comumId={comumIdEfetivo} instrumentsData={sharedData.instruments} />}
                {activeModal === 'users' && <ModuleAccess comumId={comumIdEfetivo} cargos={sharedData.cargos} />}
                {activeModal === 'church' && <ModuleChurch localData={selectedComum} onUpdate={(updated) => setSelectedComum(updated)} />}
                
                {/* 🔌 PLUGUE E AMARRAÇÃO DOS SUBMÓDULOS REAIS DE DESTINO */}
                {activeModal === 'ministerio_local' && <ModuleMinistryLocal comumId={comumIdEfetivo} />}
                {activeModal === 'corpo_orquestral' && <ModuleOrchestraBody comumId={comumIdEfetivo} instrumentsData={sharedData.instruments} />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div> // Explicação: Fecha o contêiner geral da página.
  );
};

// COMPONENTE INTERATIVO AUXILIAR: BOTÃO INTEGRAL DE ACESSO COMPACTO DE MERCADO (h-11)
const MenuButton = ({ icon, title, moduleName, onClick }) => { // Explicação: Cria os botões limpos, compactos e interativos que abrem os painéis.
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200/60 shadow-xs p-3.5 flex justify-between items-center outline-none transition-all active:bg-slate-50 active:scale-[0.99] min-h-[44px] group"
    >
      <div className="flex items-center gap-3 text-left leading-none min-w-0 flex-1">
        <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-active:bg-slate-950 group-active:text-white transition-colors shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          {moduleName && ( // Explicação: Pequena tag superior em itálico azul indicando o escopo funcional (ex: CADASTRO, SEGURANÇA)
            <p className="text-[7.5px] font-black text-indigo-600 uppercase mb-0.5 tracking-wider italic opacity-85 leading-none">{moduleName}</p>
          )}
          <h3 className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight whitespace-normal break-words leading-snug">{title}</h3> {/* Explicação: Exibição textual por extenso, sem cortes em elipse para total higiene visual. */}
        </div>
      </div>
      <ChevronRight size={13} className="text-slate-300 shrink-0 ml-2 group-hover:text-slate-400 transition-colors" />
    </button>
  );
};

export default SettingsPage; // Explicação: Exporta a nossa página de Ajustes totalmente repaginada no modelo de Modais Autônomos de Mercado.