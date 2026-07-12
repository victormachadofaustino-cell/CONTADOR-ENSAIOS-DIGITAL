import React, { useMemo, useState, useEffect } from "react"; // Explicação: Importa a base do React, os ganchos de estado local, escutas de efeitos e cache de memória RAM.
// PRESERVAÇÃO: Importações originais mantidas e adicionada a dependência Users do Lucide
import {
  ChevronDown,
  UserCheck,
  ShieldCheck,
  PlusCircle,
  Lock,
  User,
} from "lucide-react"; // Explicação: Importa os ícones de setas, cadeados e escudos.
import InstrumentCard from "./InstrumentCard"; // Explicação: Importa o componente que desenha cada instrumento individualmente.

/**
 * Componente que agrupa instrumentos por seção (Naipe).
 * v3.5 - FIXED ACCORDION JUMP AND HYBRID NOMINAL DATA PIPE
 */
const CounterSection = ({
  sec, // Explicação: Nome da seção (ex: CORDAS).
  allInstruments, // Explicação: Lista de todos os instrumentos disponíveis.
  localCounts, // Explicação: Números vindos do banco de dados.
  myUID, // Explicação: ID do usuário logado.
  activeGroup, // Explicação: Qual grupo está aberto no momento.
  handleToggleGroup, // Explicação: Função para abrir/fechar e assumir posse.
  handleUpdateInstrument, // Explicação: Função para salvar números.
  isEditingEnabled, // Explicação: Regra que dita se o botão de + e - funciona.
  onAddExtra, // Explicação: Função para incluir instrumentos novos.
  onFocus, // Explicação: Repassa o sinal de "usuário digitando" para o sistema.
  onBlur, // Explicação: Repassa o sinal de "usuário terminou de digitar".
  ataData, // Explicação: Recebe os dados da ata para saber se o evento é Regional ou Local.
  userData, // Explicação: Recebe os dados do usuário para checar o nível de acesso (GEM/Comissão).
  onOpenChecklistNominal, // Explicação: NOVA CONEXÃO: Recebe o gatilho da mãe para abrir a listagem de presença do instrumento.
  comumId, // Explicação: AMARRAÇÃO CIRÚRGICA: Recebe a ID da localidade ativa del ensaio repassada pela página mãe superior.
}) => {
  // Explicação: Inicia a estrutura della seção de contagem.
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por dispositivo
  const [isOpen, setIsOpen] = useState(false); // Explicação: Controla se a sanfona do grupo está aberta ou fechada no celular.

  const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, "_")}`; // Explicação: Cria o nome técnico da seção (ex: meta_cordas).
  const responsibleName = localCounts?.[metaKey]?.responsibleName; // Explicação: Nome de quem assumiu este grupo.
  const responsibleId = localCounts?.[metaKey]?.responsibleId; // Explicação: ID de quem assumiu este grupo.
  const isOwner = responsibleId === myUID; // Explicação: Checa se você é o dono desta seção agora.
  const hasResponsible = !!responsibleId; // Explicação: Checa se já existe alguém contando este grupo.

  // w2.6.2: Lógica de permissão de posse (Quem pode ver o botão de Assumir/Trocar)
  const isRegionalEvent = ataData?.scope === "regional"; // Explicação: Checa se o evento é de nível Regional.
  const isHigherHierarchy = userData?.isComissao || userData?.isMaster; // Explicação: Checa se o usuário é da Comissão ou Master.

  // Explicação: O GEM só pode "Assumir" ou "Trocar" se o evento for LOCAL. Se foi Regional, ele só vê se for convidado ou se for da Comissão.
  const canChangeOwnership = !isRegionalEvent || isHigherHierarchy;

  // 🚀 CAIXA DE MEMÓRIA DA SOMA: Conjunto temporário isolado para não conflitar com a renderização da tela
  const sumSpecialSections = new Set(); // Explicação: Guarda as tags calculadas no cabeçalho para evitar duplicidade de contagem de gênero.

  // JUSTIFICATIVA: Ajuste na soma para contemplar o mapa enxuto de instrumentos comuns vs especial do Coral ordenado dinamicamente
  const sectionTotal = allInstruments // Explicação: Calcula o número total que aparece na barra preta do grupo.
    .filter((i) => (i.section || "GERAL").toUpperCase() === sec) // Explicação: Filtra apenas os instrumentos pertencentes a este naipe.
    .reduce((acc, inst) => {
      // Explicação: Acumula a soma matemática passando de instrumento em instrumento.
      // 🚀 FIX DE CAIXA DE TEXTO: Alterado para 'coral' minúsculo para casar perfeitamente com a gaveta física do Firestore
      const targetId =
        sec?.toUpperCase() === "IRMANDADE"
          ? "coral"
          : sec?.toUpperCase() === "ORGANISTAS"
            ? "orgao"
            : inst.id; // Explicação: Redireciona a busca para a chave correta em minúsculo.
      const c = localCounts?.[targetId]; // Explicação: Puxa o bloco de contagem daquele instrumento de dentro della memória.
      const isCoral =
        inst.id.toLowerCase() === "coral" ||
        inst.id.toLowerCase() === "irmas" ||
        inst.id.toLowerCase() === "irmaos"; // Explicação: Ampara qualquer ramificação de ID do nó do coral.

      if (isCoral) {
        // Explicação: Se for o Coral, aplica a matemática de gênero de relatórios obrigatórios.
        // PREVENÇÃO DE DUPLICIDADE EM SOMA: Confere a trava de soma usando o conjunto isolado do cabeçalho
        const uniqueKey = `total_coral_sum`; // Explicação: Identificador da trava matemática.
        if (sumSpecialSections.has(uniqueKey)) return acc; // Explicação: Se já somou o bloco completo neste clique, retorna o acumulador intacto sem duplicar.
        sumSpecialSections.add(uniqueKey); // Explicação: Registra que a matemática de soma do coral foi efetuada no cabeçalho.
        return acc + (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0); // Explicação: Soma Irmãs + Irmãos para o grupo unificado de Irmandade e calcula o Total correto.
      } // Explicação: Fim della condicional do Coral.
      return acc + (parseInt(c?.total) || 0); // Explicação: Para os instrumentos normais enxutos, puxa e soma diretamente o campo 'total'.
    }, 0); // Explicação: Inicia o acumulador matemático do reduce com o valor zero.

  // 🚀 CAIXA DE MEMÓRIA DOS CARDS: Conjunto temporário isolado na RAM exclusivo para o mapeamento visual de tela
  const cardSpecialSections = new Set(); // Explicação: Guarda as tags dos cartões já impressos na tela para evitar repetição visual.

  const isLastIrmandade = sec === "IRMANDADE" || sec === "CORAL"; // Explicação: Identifica se é o grupo do Coral.
  const isOrganistas = sec === "ORGANISTAS"; // Explicação: Identifica se é o grupo das Organistas.

  // REGRA: Seções que não permitem inserção de instrumentos extras
  const isProtectedSection = isLastIrmandade || isOrganistas; // Explicação: Proíbe adicionar "extras" no Coral ou Órgão.

  // Rótulo de liderança conforme a seção
  const labelLideranca = isOrganistas ? "Examinadora" : "Encarregado"; // Explicação: Muda o texto conforme o naipe.

  const extraSpacing = isProtectedSection ? "mb-10" : "mb-3"; // Explicação: Ajusta o espaço visual entre os grupos.

  // JUSTIFICATIVA: Alterna entre abrir a seção para visualização
  const handleHeaderClick = () => {
    // Explicação: Abre ou fecha a lista de instrumentos ao clicar no nome.
    setIsOpen(!isOpen); // Explicação: Alterna a memória booleana invertendo o valor atual de aberto/fechado.
  }; // Explicação: Fim della função handleHeaderClick.

  return (
    // Explicação: Desenha a caixa della seção na tela.
    <div
      className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing} text-left`}
    >
      {" "}
      {/* Explicação: Container prêmio com cantos arredondados, fundo branco e espaçamento ergonômico. */}
      <div className="w-full p-5 flex justify-between items-center transition-all text-left">
        {" "}
        {/* Explicação: Barra do cabeçalho alinhando títulos e botões horizontalmente com preenchimento interno confortável. */}
        {/* LADO ESQUERDO: Título e Identificação Nominal */}
        <button
          type="button" // Explicação: Declara explicitamente o tipo como botão clássico de interface.
          onClick={handleHeaderClick} // Explicação: Dispara a abertura ou recolhimento da sanfona ao clicar.
          className="flex flex-col items-start text-left leading-none gap-1 flex-1 min-w-0 cursor-pointer outline-none" // Explicação: Alinha os textos à esquerda empilhados sem espaçamento de linha bruto.
        >
          <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tight truncate w-full text-left">
            {" "}
            {/* Explicação: Estiliza o nome do naipe em destaque preto negrito de alta densidade visual. */}
            {sec}{" "}
            {/* Explicação: Renderiza o nome textual della seção (ex: 'MADEIRAS'). */}
          </span>
          {hasResponsible && ( // Explicação: Mostra quem está cuidando desta contagem no momento se houver zelador.
            <div className="flex items-center gap-1 text-left">
              {" "}
              {/* Explicação: Agrupa horizontalmente o ponto de pulsação e o texto. */}
              <div
                className={`w-1 h-1 rounded-full ${isOwner ? "bg-blue-500 animate-pulse" : "bg-slate-300"}`}
              />{" "}
              {/* Explicação: Desenha uma bolinha azul piscando se a zeladoria for sua, ou cinza fosca se for de outro colaborador. */}
              <span
                className={`text-[7px] font-black uppercase italic tracking-widest text-left ${isOwner ? "text-blue-600" : "text-slate-400"}`}
              >
                {" "}
                {/* Explicação: Formata a etiqueta de identificação em letras minúsculas espaçadas de estilo técnico. */}
                {isOwner ? "Sua Zeladoria" : `Resp: ${responsibleName}`}{" "}
                {/* Explicação: Imprime de forma amigável a posse da aba de contagem. */}
              </span>
            </div>
          )}
        </button>
        {/* CENTRO/DIREITA: Ação de Assumir e Totais */}
        <div className="flex items-center gap-3 shrink-0">
          {" "}
          {/* Explicação: Agrupa a pílula de posse e os números totais na extrema direita do cabeçalho. */}
          {/* BOTÃO DE POSSE (Ajustado v2.6.2: Só aparece para o GEM se o evento for LOCAL) */}
          {canChangeOwnership && ( // Explicação: Condicional que avalia as regras hierárquicas de privilégio regional antes de mostrar o botão.
            <button
              type="button" // Explicação: Declara o tipo do elemento como botão comum de ação.
              onClick={(e) => {
                // Explicação: Intercepta o clique de mouse ou toque de dedo do usuário.
                e.preventDefault(); // Explicação: Interrompe comportamentos padrão de envio de formulário do navegador.
                e.stopPropagation(); // Explicação: Bloqueia o efeito cascata impedindo que o clique abra a sanfona por acidente.
                handleToggleGroup(sec); // Explicação: Dispara a função global de assumir ou transferir a zeladoria do naipe.
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 border cursor-pointer ${
                isOwner
                  ? "bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-100"
                  : hasResponsible
                    ? "bg-amber-50 text-amber-600 border-amber-100"
                    : "bg-slate-950 text-white border-slate-900 shadow-sm"
              }`} // Explicação: Estilização inteligente: azul royal se for seu, amarelo se for de outro obreiro, ou preto firme se estiver vago.
            >
              {isOwner ? (
                <UserCheck size={10} strokeWidth={3} />
              ) : hasResponsible ? (
                <Lock size={10} />
              ) : (
                <User size={10} />
              )}{" "}
              {/* Explicação: Alterna entre ícone de check com traço forte, cadeado de proteção ou boneco de usuário livre. */}
              <span className="text-[8px] font-black uppercase italic tracking-widest leading-none">
                {" "}
                {/* Explicação: Texto interno da etiqueta em caixa alta micro. */}
                {isOwner ? "Você" : hasResponsible ? "Trocar" : "Assumir"}{" "}
                {/* Explicação: Altera o rótulo de instrução de acordo com a posse do documento. */}
              </span>
            </button>
          )}
          {/* BADGE DE TOTALIZAÇÃO E CONTROLE DE ABERTURA */}
          <button
            type="button" // Explicação: Marca o elemento como botão nativo de interface.
            onClick={handleHeaderClick} // Explicação: Aciona a abertura ao clicar no quadrado numérico.
            className="flex items-center gap-2 cursor-pointer outline-none" // Explicação: Alinha o quadrado preto e a seta cinza lado a lado.
          >
            <div className="bg-slate-950 text-white min-w-[38px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-sm border border-white/10 px-2 leading-none">
              {" "}
              {/* Explicação: Quadrado de alta densidade preto prêmio contendo o número total somado em tempo real. */}
              {sectionTotal}{" "}
              {/* Explicação: Exibe a soma real e enxuta processada no topo. */}
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-300 transition-transform duration-500 shrink-0 ${isOpen ? "rotate-180" : ""}`} // Explicação: Efeito sofisticado de rotação de 180 graus da seta se a sanfona estiver em modo aberto.
            />
          </button>
        </div>
      </div>
      {isOpen && ( // Explicação: Se a sanfona estiver aberta, desenha os instrumentos um abaixo do outro.
        <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300 text-left">
          {" "}
          {/* Explicação: Container interno dos cartões com animação CSS suave de descida e surgimento. */}
          {allInstruments // Explicação: Pega a listagem unificada de orquestra organizada e filtra pelo naipe atual.
            .filter((i) => (i.section || "GERAL").toUpperCase() === sec) // Explicação: Garante o agrupamento correto na visualização.
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)) // 🚀 INJEÇÃO DO FILTRO CAMINHO 2 EM LOCAL: Reordena os cartões na tela seguindo fielmente a cadeira numérica ditada pelo hambúrguer!
            .map((inst) => {
              // Explicação: Varre cada instrumento pertencente gerando o cartão de contagem na tela.

              const isCoral =
                inst.id.toLowerCase() === "coral" ||
                inst.id.toLowerCase() === "irmas" ||
                inst.id.toLowerCase() === "irmaos"; // Explicação: Identifica as variações de chamada do nó do Coral.

              // OPERAÇÃO ANTI-DUPLICIDADE VISUAL: Usa o conjunto exclusivo dos cartões para pular repetições na tela
              if (isCoral) {
                // Explicação: Se cair na linha de leitura do Coral.
                if (cardSpecialSections.has("coral_card_printed")) return null; // Explicação: Se o card mestre de Irmãs + Irmãos já foi impresso, aborta o map e retorna nulo para ignorar a duplicata do banco!
                cardSpecialSections.add("coral_card_printed"); // Explicação: Registra a carimbagem do card impresso com sucesso para blindar as próximas linhas.
              }

              // Explicação: REQUISITO LEAN: Mapeia os dados de contagem injetando o fallback numérico padrão zerado para as 3 variáveis essenciais do modelo enxuto.
              const targetId =
                sec?.toUpperCase() === "IRMANDADE"
                  ? "coral"
                  : sec?.toUpperCase() === "ORGANISTAS"
                    ? "orgao"
                    : inst.id;
              const instrumentData = {
                total: 0,
                comum: 0,
                enc: 0,
                irmaos: 0,
                irmas: 0, // Explicação: Inicializa propriedades padrão limpas de segurança.
                ...(localCounts?.[targetId] || {}), // Explicação: Substitui e dumps os valores reais enxutos que estão guardados na memória do banco.
                responsibleId: responsibleId, // Explicação: Vincula o ID do dono legítimo do naipe para controle do cartão.
                responsibleName: responsibleName, // Vincula o nome do dono para exibição interna.
              };

              // GARGALO DE CONTROLE VISUAL RESOLVIDO: Inverte o motor de verificação para libertar e acender os botões.
              const deEdicaoTrancada = !isEditingEnabled(sec, inst.id); // Explicação: Aciona a checagem reativa unificada da mãe passando a rota de identificação mapeada.

              // 🚀 SOLUÇÃO DA SINC NOMINAL DA TUBA: Higieniza o objeto inst que entra no cartão, forçando o id a ser o targetId unificado por extenso contra bugs visuais de chaves cruzadas.
              const sanitizedInst = { ...inst, id: targetId }; // Explicação: Monta a cópia protetora injetando a chave estável em minúsculo do barramento.

              return (
                // Explicação: Renderiza o cartão físico do instrumento processado.
                <InstrumentCard
                  key={inst.id} // Explicação: Chave identificadora única exigida pelo React para controle de renderização rápida.
                  inst={sanitizedInst} // 🚀 RECONEXÃO DO CANO: Entrega o instrumento sanitizado para pacificar o visor azul da tela principal de trás!
                  data={instrumentData} // Explicação: Passa o pacote numérico enxuto estruturado por nós.
                  // 🚀 CANO HÍBRIDO BLINDADO: Se for Coral, envia o id original (irmas/irmaos) para salvar individual; se for Orquestra, força o targetId por extenso contra bugs visuais
                  onUpdate={(id, f, v) =>
                    handleUpdateInstrument(isCoral ? id : targetId, f, v, sec)
                  }
                  isClosed={deEdicaoTrancada} // Explicação: O cartão obedece ao motor central reativo, acendendo os botões para GEM/Básico.
                  onToggleOwnership={() => handleToggleGroup(sec)} // Explicação: Atalho interno para disparar troca de zeladoria.
                  isRegional={isRegionalEvent} // Explicação: Repassa a flag se o evento ativo é regional ou local.
                  userData={{ uid: myUID }} // Explicação: Entrega as credenciais do usuário para o cartão.
                  sectionName={sec} // Explicação: Repassa o nome do naipe em tratamento.
                  labelLideranca={labelLideranca} // Passa o rótulo de liderança textual computado.
                  onFocus={onFocus} // Repassa o gatilho de início de edição de teclado.
                  onBlur={onBlur} // Repassa o gatilho de fim de digitação.
                  onOpenChecklistNominal={onOpenChecklistNominal} // Explicação: NOVO PLUGUE: Repassa o método reativo para o InstrumentCard desenhar o atalho da chamada nominal.
                  comumId={comumId} // Explicação: PLUGUE CONTEXTUAL: Repassa a ID da igreja comuns ativa de forma direta para o InstrumentCard validar o poder do GEM Local.
                />
              ); // Explicação: Fim della renderização do InstrumentCard.
            })}{" "}
          {/* Explicação: Fim do mapeamento de instrumentos. */}
          {/* BOTÃO ADICIONAR EXTRA: Só aparece se a edição estiver liberada e não for seção protegida */}
          {isEditingEnabled(sec) &&
            !isProtectedSection && ( // Explicação: Valida permissões de escrita e veta a exibição se for Coral ou Órgão.
              <button
                type="button" // Explicação: Define o elemento como botão de clique comum.
                onClick={() => onAddExtra(sec)} // Explicação: Abre o modal de inclusão de instrumento extra passando o naipe atual.
                className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[1.8rem] flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 cursor-pointer text-center" // Explicação: Botão ergonômico com bordas tracejadas simulando cupom destacável, ideal para interações mobile.
              >
                <PlusCircle size={16} />{" "}
                {/* Explicação: Ícone circular de sinal de mais. */}
                <span className="w-full text-center text-[9px] font-black uppercase italic tracking-widest">
                  Adicionar Extra em {sec}
                </span>{" "}
                {/* Texto instrucional em caixa alta estilizada. */}
              </button>
            )}
        </div>
      )}
    </div>
  );
};

export default CounterSection;
