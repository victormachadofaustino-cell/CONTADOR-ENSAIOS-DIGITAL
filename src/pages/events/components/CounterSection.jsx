import React, { useState } from 'react'; // Explicação: Importa a base do React para gerenciar o estado de abertura da sanfona.
// PRESERVAÇÃO: Importações originais mantidas
import { ChevronDown, UserCheck, ShieldCheck, PlusCircle, Lock, User } from 'lucide-react'; // Explicação: Importa os ícones de setas, cadeados e escudos.
import InstrumentCard from './InstrumentCard'; // Explicação: Importa o componente que desenha cada instrumento individualmente.

/**
 * Componente que agrupa instrumentos por seção (Naipe).
 * v2.6.2 - TRAVA DE HIERARQUIA PARA EVENTOS REGIONAIS
 */
const CounterSection = ({ 
  sec, // Explicação: Nome da seção (ex: CORDAS).
  allInstruments, // Explicação: Lista de todos os instrumentos disponíveis.
  localCounts, // Explicação: Números vindos do banco de dados.
  myUID, // Explicação: ID do usuário logado.
  activeGroup, // Explicação: Qual grupo está aberto no momento.
  handleToggleGroup, // Explicação: Função para abrir/fechar e assumir posse.
  handleUpdateInstrument, // Explicação: Função para salvar números.
  isEditingEnabled, // Explicação: Regra que diz se o botão de + e - funciona.
  onAddExtra, // Explicação: Função para incluir instrumentos novos.
  onFocus, // Explicação: Repassa o sinal de "usuário digitando" para o sistema.
  onBlur, // Explicação: Repassa o sinal de "usuário terminou de digitar".
  ataData, // Explicação: NOVO: Recebe os dados da ata para saber se o evento é Regional ou Local.
  userData // Explicação: NOVO: Recebe os dados do usuário para checar o nível de acesso (GEM/Comissão).
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

  // JUSTIFICATIVA: Ajuste na soma para contemplar irmaos/irmas quando o campo 'total' for 0
  const sectionTotal = allInstruments // Explicação: Calcula o número total que aparece na barra preta do grupo.
    .filter(i => (i.section || "GERAL").toUpperCase() === sec)
    .reduce((acc, inst) => {
      const c = localCounts?.[inst.id];
      const isIrm = ['irmandade', 'Coral', 'coral'].includes(inst.id.toLowerCase());
      
      if (isIrm) {
        return acc + (parseInt(c?.irmaos) || 0) + (parseInt(c?.irmas) || 0); // Explicação: Soma Irmãs + Irmãos para o grupo Irmandade.
      }
      return acc + (parseInt(c?.total) || 0); // Explicação: Soma o total normal para os outros instrumentos.
    }, 0);

  const isLastIrmandade = sec === 'IRMANDADE' || sec === 'CORAL'; // Explicação: Identifica se é o grupo do Coral.
  const isOrganistas = sec === 'ORGANISTAS'; // Explicação: Identifica se é o grupo das Organistas.
  
  // REGRA: Seções que não permitem inserção de instrumentos extras
  const isProtectedSection = isLastIrmandade || isOrganistas; // Explicação: Proíbe adicionar "extras" no Coral ou Órgão.
  
  // Rótulo de liderança conforme a seção
  const labelLideranca = isOrganistas ? "Examinadora" : "Encarregado"; // Explicação: Muda o texto conforme o naipe.

  const extraSpacing = isProtectedSection ? "mb-10" : "mb-3"; // Explicação: Ajusta o espaço visual entre os grupos.

  // JUSTIFICATIVA: Alterna entre abrir a seção para visualização
  const handleHeaderClick = () => { // Explicação: Abre ou fecha a lista de instrumentos ao clicar no nome.
    setIsOpen(!isOpen);
  };

  return ( // Explicação: Desenha a caixa da seção na tela.
    <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${extraSpacing}`}>
      <div className="w-full p-5 flex justify-between items-center transition-all">
        
        {/* LADO ESQUERDO: Título e Identificação Nominal */}
        <button 
          onClick={handleHeaderClick}
          className="flex flex-col items-start text-left leading-none gap-1 flex-1 min-w-0"
        >
          <span className="font-[900] uppercase italic text-[12px] text-slate-950 tracking-tight truncate w-full">
            {sec}
          </span>
          {hasResponsible && ( // Explicação: Mostra quem está cuidando desta contagem no momento.
            <div className="flex items-center gap-1">
               <div className={`w-1 h-1 rounded-full ${isOwner ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
               <span className={`text-[7px] font-black uppercase italic tracking-widest ${isOwner ? 'text-blue-600' : 'text-slate-400'}`}>
                {isOwner ? 'Sua Zeladoria' : `Resp: ${responsibleName}`}
              </span>
            </div>
          )}
        </button>

        {/* CENTRO/DIREITA: Ação de Assumir e Totais */}
        <div className="flex items-center gap-3">
          
          {/* BOTÃO DE POSSE (Ajustado v2.6.2: Só aparece para o GEM se o evento for LOCAL) */}
          {canChangeOwnership && (
            <button
              type="button"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                // Explicação: Dispara a função de assumir o naipe apenas se tiver permissão.
                handleToggleGroup(sec); 
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 border ${
                isOwner 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-100' 
                  : hasResponsible 
                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                    : 'bg-slate-950 text-white border-slate-900 shadow-sm'
              }`}
            >
              {isOwner ? <UserCheck size={10} strokeWidth={3}/> : hasResponsible ? <Lock size={10}/> : <User size={10}/>}
              <span className="text-[8px] font-black uppercase italic tracking-widest leading-none">
                {isOwner ? 'Você' : hasResponsible ? 'Trocar' : 'Assumir'}
              </span>
            </button>
          )}

          {/* BADGE DE TOTALIZAÇÃO E CONTROLE DE ABERTURA */}
          <button 
            onClick={handleHeaderClick}
            className="flex items-center gap-2"
          >
            <div className="bg-slate-950 text-white min-w-[38px] h-8 flex items-center justify-center rounded-xl font-[900] italic text-[12px] shadow-sm border border-white/10 px-2 leading-none">
              {sectionTotal}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>
      </div>

      {isOpen && ( // Explicação: Se a sanfona estiver aberta, desenha os instrumentos um abaixo do outro.
        <div className="px-4 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
          {allInstruments
            .filter(i => (i.section || "GERAL").toUpperCase() === sec)
            .map(inst => {
              // Explicação: Monta os dados do instrumento incluindo quem é o responsável atual.
              const instrumentData = {
                ...(localCounts?.[inst.id] || {total:0, comum:0, enc:0, irmaos:0, irmas:0}),
                responsibleId: responsibleId,
                responsibleName: responsibleName
              };

              return (
                <InstrumentCard 
                  key={inst.id} 
                  inst={inst} 
                  data={instrumentData} 
                  onUpdate={(id, f, v) => handleUpdateInstrument(id, f, v, sec)} 
                  isClosed={!isEditingEnabled(sec)} // Explicação: Bloqueia se o usuário não for o dono ou se a ata fechou.
                  onToggleOwnership={() => handleToggleGroup(sec)}
                  isRegional={false} 
                  userData={{uid: myUID}}
                  sectionName={sec}
                  labelLideranca={labelLideranca}
                  onFocus={onFocus} 
                  onBlur={onBlur} 
                />
              );
            })}
          
          {/* BOTÃO ADICIONAR EXTRA: Só aparece se a edição estiver liberada e não for seção protegida */}
          {isEditingEnabled(sec) && !isProtectedSection && (
            <button
              onClick={() => onAddExtra(sec)}
              className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[1.8rem] flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
            >
              <PlusCircle size={16} />
              <span className="text-[9px] font-black uppercase italic tracking-widest">Adicionar Extra em {sec}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CounterSection; // Explicação: Exporta o componente para o sistema principal.