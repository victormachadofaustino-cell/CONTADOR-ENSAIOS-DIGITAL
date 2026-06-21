import React, { useState } from 'react'; // Explicação: Importa a base do React para gerenciar o estado de abertura da sanfona.
// PRESERVAÇÃO: Importações originais mantidas
import { ChevronDown, UserCheck, ShieldCheck, PlusCircle, Lock, User } from 'lucide-react'; // Explicação: Importa os ícones de setas, cadeados e escudos.
import InstrumentCard from './InstrumentCard'; // Explicação: Importa o componente que desenha cada instrumento individualmente.

/**
 * Componente que agrupa instrumentos por seção (Naipe).
 * v2.8 - FIXED ERGONOMIC LAYOUT WITH ISOLATED COMMENTS
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
  onOpenChecklistNominal // Explicação: NOVA CONEXÃO: Recebe o gatilho da mãe para abrir a listagem de presença do instrumento.
}) => { // Explicação: Inicia a estrutura da seção de contagem.
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por dispositivo
  const [isOpen, setIsOpen] = useState(false); // Explicação: Controla se a sanfona do grupo está aberta ou fechada no celular.

  const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; // Explicação: Cria o nome técnico da seção (ex: meta_cordas).
  const responsibleName = localCounts?.[metaKey]?.responsibleName; // Explicação: Nome de quem assumiu este grupo.
  const responsibleId = localCounts?.[metaKey]?.responsibleId; // Explicação: ID de quem assumiu este grupo.
  const isOwner = responsibleId === myUID; // Explicação: Checa se você é o dono desta seção agora.
  const hasResponsible = !!responsibleId; // Explicação: Checa se já existe alguém contando este grupo.

  // v2.6.2: Lógica de permissão de posse (Quem pode ver o botão de Assumir/Trocar)
  const isRegionalEvent = ataData?.scope === 'regional'; // Explicação: Checa se o evento é de nível Regional.
  const isHigherHierarchy = userData?.isComissao || userData?.isMaster; // Explicação: Checa se o usuário é da Comissão ou Master.
  
  // Explicação: O GEM só pode "Assumir" ou "Trocar" se o evento for LOCAL. Se for Regional, ele só vê se for convidado ou se for da Comissão.
  const canChangeOwnership = !isRegionalEvent || isHigherHierarchy;

  // JUSTIFICATIVA: Ajuste na soma para contemplar o mapa enxuto de instrumentos comuns vs especial do Coral
  const sectionTotal = allInstruments // Explicação: Calcula o número total que aparece na barra preta do grupo.
    .filter(i => (i.section || "GERAL").toUpperCase() === sec) // Explicação: Filtra apenas os instrumentos pertencentes a este naipe.
    .reduce((acc, inst) => { // Explicação: Acumula a soma matemática passando de instrumento em instrumento.
      const targetId = (sec?.toUpperCase() === 'IRMANDADE') ? 'Coral' : (sec?.toUpperCase() === 'ORGANISTAS') ? 'orgao' : inst.id; // Explicação: Redireciona a busca para a chave correta baseando-se no nosso plano lean.
      const c = localCounts?.[targetId]; // Explicação: Puxa o bloco de contagem daquele instrumento de dentro della memória.
      const isCoral = inst.id.toLowerCase() === 'coral'; // Explicação: Checa se o identificador em análise é o Coral oficial.
      
      if (isCoral) { // Explicação: Se for o Coral, aplica a matemática de gênero de relatórios obrigatórios.
        return acc + (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0); // Explicação: Soma Irmãs + Irmãos para o grupo unificado de Irmandade.
      } // Explicação: Fim da condicional do Coral.
      return acc + (parseInt(c?.total) || 0); // Explicação: Para os instrumentos normais enxutos, puxa e soma diretamente o campo 'total'.
    }, 0); // Explicação: Inicia o acumulador matemático do reduce com o valor zero.

  const isLastIrmandade = sec === 'IRMANDADE' || sec === 'CORAL'; // Explicação: Identifica se é o grupo do Coral.
  const isOrganistas = sec === 'ORGANISTAS'; // Explicação: Identifica se é o grupo das Organistas.
  
  // REGRA: Seções que não permitem inserção de instrumentos extras
  const isProtectedSection = isLastIrmandade || isOrganistas; // Explicação: Proíbe adicionar "extras" no Coral ou Órgão.
  
  // Rótulo de liderança conforme a seção
  const labelLideranca = isOrganistas ? "Examinadora" : "Encarregado"; // Explicação: Muda o texto conforme o naipe.

  const extraSpacing = isProtectedSection ? "mb-10" : "mb-3"; // Explicação: Ajusta o espaço visual entre os grupos.

  // JUSTIFICATIVA: Alterna entre abrir a seção para visualização
  const handleHeaderClick = () => { // Explicação: Abre ou fecha a lista de instrumentos ao clicar no nome.
    setIsOpen(!isOpen); // Explicação: Alterna a memória booleana invertendo o valor atual de aberto/fechado.
  }; // Explicação: Fim da função handleHeaderClick.

  return ( // Explicação: Desenha a caixa da seção na tela.
    <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing}`}> {/* Explicação: Container prêmio com cantos arredondados, fundo branco e espaçamento ergonômico. */}
      <div className="w-full p-5 flex justify-between items-center transition-all"> {/* Explicação: Barra do cabeçalho alinhando títulos e botões horizontalmente com preenchimento interno confortável. */}
        
        {/* LADO ESQUERDO: Título e Identificação Nominal */}
        <button 
          onClick={handleHeaderClick} // Explicação: Dispara a abertura ou recolhimento da sanfona ao clicar.
          className="flex flex-col items-start text-left leading-none gap-1 flex-1 min-w-0" // Explicação: Alinha os textos à esquerda empilhados sem espaçamento de linha bruto.
        >
          <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tight truncate w-full"> {/* Explicação: Estiliza o nome do naipe em destaque preto negrito de alta densidade visual. */}
            {sec} {/* Explicação: Renderiza o nome textual da seção (ex: 'MADEIRAS'). */}
          </span>
          {hasResponsible && ( // Explicação: Mostra quem está cuidando desta contagem no momento se houver zelador.
            <div className="flex items-center gap-1"> {/* Explicação: Agrupa horizontalmente o ponto de pulsação e o texto. */}
               <div className={`w-1 h-1 rounded-full ${isOwner ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} /> {/* Explicação: Desenha uma bolinha azul piscando se a zeladoria for sua, ou cinza fosca se for de outro colaborador. */}
               <span className={`text-[7px] font-black uppercase italic tracking-widest ${isOwner ? 'text-blue-600' : 'text-slate-400'}`}> {/* Explicação: Formata a etiqueta de identificação em letras minúsculas espaçadas de estilo técnico. */}
                {isOwner ? 'Sua Zeladoria' : `Resp: ${responsibleName}`} {/* Explicação: Imprime de forma amigável a posse da aba de contagem. */}
              </span>
            </div>
          )}
        </button>

        {/* CENTRO/DIREITA: Ação de Assumir e Totais */}
        <div className="flex items-center gap-3"> {/* Explicação: Agrupa a pílula de posse e os números totais na extrema direita do cabeçalho. */}
          
          {/* BOTÃO DE POSSE (Ajustado v2.6.2: Só aparece para o GEM se o evento for LOCAL) */}
          {canChangeOwnership && ( // Explicação: Condicional que avalia as regras hierárquicas de privilégio regional antes de mostrar o botão.
            <button
              type="button" // Explicação: Declara o tipo do elemento como botão comum de ação.
              onClick={(e) => { // Explicação: Intercepta o clique de mouse ou toque de dedo do usuário.
                e.preventDefault(); // Explicação: Interrompe comportamentos padrão de envio de formulário do navegador.
                e.stopPropagation(); // Explicação: Bloqueia o efeito cascata impedindo que o clique abra a sanfona por acidente.
                handleToggleGroup(sec); // Explicação: Dispara a função global de assumir ou transferir a zeladoria do naipe.
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 border ${
                isOwner 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-100' 
                  : hasResponsible 
                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                    : 'bg-slate-950 text-white border-slate-900 shadow-sm'
              }`} // Explicação: Estilização inteligente: azul royal se for seu, amarelo se for de outro obreiro, ou preto firme se estiver vago.
            >
              {isOwner ? <UserCheck size={10} strokeWidth={3}/> : hasResponsible ? <Lock size={10}/> : <User size={10}/>} {/* Explicação: Alterna entre ícone de check com traço forte, cadeado de proteção ou boneco de usuário livre. */}
              <span className="text-[8px] font-black uppercase italic tracking-widest leading-none"> {/* Explicação: Texto interno da etiqueta em caixa alta micro. */}
                {isOwner ? 'Você' : hasResponsible ? 'Trocar' : 'Assumir'} {/* Explicação: Altera o rótulo de instrução de acordo com a posse do documento. */}
              </span>
            </button>
          )}

          {/* BADGE DE TOTALIZAÇÃO E CONTROLE DE ABERTURA */}
          <button 
            onClick={handleHeaderClick} // Explicação: Aciona a abertura ao clicar no quadrado numérico.
            className="flex items-center gap-2" // Explicação: Alinha o quadrado preto e a seta cinza lado a lado.
          >
            <div className="bg-slate-950 text-white min-w-[38px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-sm border border-white/10 px-2 leading-none"> {/* Explicação: Quadrado de alta densidade preto prêmio contendo o número total somado em tempo real. */}
              {sectionTotal} {/* Explicação: Exibe a soma real e enxuta processada no topo pelo nosso reduce. */}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} // Explicação: Efeito sofisticado de rotação de 180 graus da seta se a sanfona estiver em modo aberto.
            />
          </button>
        </div>
      </div>

      {isOpen && ( // Explicação: Se a sanfona estiver aberta, desenha os instrumentos um abaixo do outro.
        <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300"> {/* Explicação: Container interno dos cartões com animação CSS suave de descida e surgimento. */}
          {allInstruments // Explicação: Pega a listagem unificada de orquestra organizada e filtra pelo naipe atual.
            .filter(i => (i.section || "GERAL").toUpperCase() === sec) // Explicação: Garante o agrupamento correto na visualização.
            .map(inst => { // Explicação: Varre cada instrumento pertencente gerando o cartão de contagem na tela.
              // Explicação: REQUISITO LEAN: Mapeia os dados de contagem injetando o fallback numérico padrão zerado para as 3 variáveis essenciais do modelo enxuto.
              const targetId = (sec?.toUpperCase() === 'IRMANDADE') ? 'Coral' : (sec?.toUpperCase() === 'ORGANISTAS') ? 'orgao' : inst.id;
              const instrumentData = {
                total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0, // Explicação: Inicializa propriedades padrão limpas de segurança.
                ...(localCounts?.[targetId] || {}), // Explicação: Substitui e dumps os valores reais enxutos que estão guardados na memória do banco.
                responsibleId: responsibleId, // Explicação: Vincula o ID do dono legítimo do naipe para controle do cartão.
                responsibleName: responsibleName // Vincula o nome do dono para exibição interna.
              };

              return ( // Explicação: Renderiza o cartão físico do instrumento processado.
                <InstrumentCard 
                  key={inst.id} // Explicação: Chave identificadora única exigida pelo React para controle de renderização rápida.
                  inst={inst} // Explicação: Passa os dados de cadastro e nome do instrumento.
                  data={instrumentData} // Explicação: Passa o pacote numérico enxuto estruturado por nós.
                  onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} // Explicação: Aciona a função de clique repassando as coordenadas do naipe.
                  isClosed={!isEditingEnabled(sec, inst.id)} // Explicação: ADEQUAÇÃO LEAN: Protege a trava de edição repassando diretamente a propriedade do ID estável.
                  onToggleOwnership={() => handleToggleGroup(sec)} // Explicação: Atalho interno para disparar troca de zeladoria.
                  isRegional={isRegionalEvent} // Explicação: Repassa a flag se o evento ativo é regional ou local.
                  userData={{uid: myUID}} // Explicação: Entrega as credenciais do usuário para o cartão.
                  sectionName={sec} // Explicação: Repassa o nome do naipe em tratamento.
                  labelLideranca={labelLideranca} // Passa o rótulo de liderança textual computado.
                  onFocus={onFocus} // Repassa o gatilho de início de edição de teclado.
                  onBlur={onBlur} // Repassa o gatilho de fim de digitação.
                  onOpenChecklistNominal={onOpenChecklistNominal} // Explicação: NOVO PLUGUE: Repassa o método reativo para o InstrumentCard desenhar o atalho da chamada nominal.
                />
              ); // Explicação: Fim da renderização do InstrumentCard.
            })} {/* Explicação: Fim do mapeamento de instrumentos. */}
          
          {/* BOTÃO ADICIONAR EXTRA: Só aparece se a edição estiver liberada e não for seção protegida */}
          {isEditingEnabled(sec) && !isProtectedSection && ( // Explicação: Valida permissões de escrita e veta a exibição se for Coral ou Órgão.
            <button
              onClick={() => onAddExtra(sec)} // Explicação: Abre o modal de inclusão de instrumento extra passando o naipe atual.
              className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[1.8rem] flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95" // Explicação: Botão ergonômico com bordas tracejadas simulando cupom destacável, ideal para interações mobile.
            >
              <PlusCircle size={16} /> {/* Explicação: Ícone circular de sinal de mais. */}
              <span className="text-[9px] font-black uppercase italic tracking-widest">Adicionar Extra em {sec}</span> {/* Texto instrucional em caixa alta estilizada. */}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CounterSection; // Explicação: Exporta o componente para o sistema principal.