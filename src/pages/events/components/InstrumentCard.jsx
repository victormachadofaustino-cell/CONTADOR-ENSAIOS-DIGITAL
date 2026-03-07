import React from 'react'; // Explicação: Importa a base do React para criar componentes.
import { Minus, Plus, Lock, User, UserCheck, ShieldCheck, UserPlus } from 'lucide-react'; // Explicação: Importa os ícones de botões e escudos.

/**
 * InstrumentCard v10.1 - MODO HÍBRIDO (LOCAL/REGIONAL)
 * v10.1 - SINCRONIZADO COM REGRA DE OURO
 * Esta versão garante que o onSnapshot do Firebase não apague o que o usuário digita.
 */
const InstrumentCard = ({ 
  inst, // Explicação: Dados fixos do instrumento (nome, id).
  data, // Explicação: Dados dinâmicos vindos do banco (números atuais).
  onUpdate, // Explicação: Função para salvar a nova contagem.
  onToggleOwnership, // Explicação: Função para assumir a posse do instrumento.
  userData, // Explicação: Dados do contador logado (crachá).
  isClosed, // Explicação: Verifica se o ensaio está encerrado.
  isRegional, // Explicação: Verifica se o layout é o regional (em lista).
  labelLideranca, // Explicação: Texto customizado para o campo de encarregados.
  sectionName, // Explicação: Nome da família (Cordas, Madeiras...).
  onFocus, // Explicação: Avisa o sistema para proteger este campo enquanto o usuário digita [v10.0].
  onBlur // Explicação: Avisa o sistema para liberar o campo após a digitação [v10.0].
}) => {
  // BLINDAGEM CRÍTICA: Se não houver dados básicos, não desenha nada para evitar erro no app.
  if (!inst || !inst.id) return null;

  // Explicação: Identifica se este cartão pertence ao grupo do Coral ou Irmandade.
  const isIrmandade = ['irmandade', 'irmas', 'irmaos', 'coral'].includes(inst.id.toLowerCase() || '');
  
  // Explicação: Identifica se este cartão é de organista para aplicar tratamento especial de cargo.
  const isOrganista = inst.id?.toLowerCase().includes('organista') || 
                      inst.name?.toLowerCase().includes('organ') || 
                      inst.label?.toLowerCase().includes('orgao') ||
                      inst.id?.toLowerCase().includes('orgao');

  // Explicação: Identifica se é um campo de liderança ou examinadora.
  const isGovernance = (inst.isGovernance || inst.id?.includes('enc_local') || inst.evalType === 'Examinadora') && !isOrganista;
  
  // LÓGICA DE POSSE INDIVIDUALIZADA: Identifica quem é o "dono da caneta" agora.
  const myUID = userData?.uid || userData?.id; // Explicação: Captura o ID único do usuário atual.
  const subId = inst.id.toLowerCase(); // Explicação: Facilita a comparação de nomes técnicos.
  
  // Explicação: Checa se "Eu" sou o responsável por este instrumento neste momento.
  const isMyTurn = (subId === 'irmas' || subId === 'irmaos') 
    ? data?.[`responsibleId_${subId}`] === myUID
    : data?.responsibleId === myUID;

  // Explicação: Checa se "Outra Pessoa" já assumiu este instrumento, para desativar visualmente.
  const isOtherTurn = (subId === 'irmas' || subId === 'irmaos')
    ? data?.[`responsibleId_${subId}`] && data?.[`responsibleId_${subId}`] !== myUID
    : data?.responsibleId && data?.responsibleId !== myUID;
  
  // REGRA DE OURO: Define se os botões de edição estarão liberados conforme a Matriz de Poder.
  const canEdit = !isClosed && (isRegional ? isMyTurn : true); // Explicação: No Regional exige posse; no Local todos (aprovados) editam.

  // SANEAMENTO DE DADOS: Transforma os valores do banco em números inteiros para evitar erros de soma.
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0; 
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  // Explicação: Define qual valor mostrar na caixa principal (Total, Irmãs ou Irmãos).
  const displayVal = subId === 'irmas' ? irmas : subId === 'irmaos' ? irmaos : total;
  
  // Explicação: Cálculo automático de visitas em tempo real (Total menos os da casa).
  const visitas = Math.max(0, total - comum);
  // Explicação: Bloqueia campos de detalhe (comum/liderança) se o Total for zero.
  const isSubFieldDisabled = !canEdit || total === 0;

  /**
   * handleUpdate v3.16 - Lógica de Saneamento Hierárquico
   */
  const handleUpdate = (field, value) => {
    if (!canEdit) return; // Explicação: Se não tiver poder de edição, ignora a ação.
    let finalValue = Math.max(0, parseInt(value) || 0); // Explicação: Bloqueia números negativos.
    
    // REGRA DE OURO: Comum e Liderança nunca podem ultrapassar o valor Total.
    if ((field === 'comum' || field === 'enc') && finalValue > total) {
      finalValue = total;
    }

    // REGRA DE CASCATA: Se o Total diminuir, o sistema reduz Comum e Encarregado para manter a lógica.
    if (field === 'total') {
      if (comum > finalValue) onUpdate(inst.id, 'comum', finalValue, sectionName);
      if (enc > finalValue) onUpdate(inst.id, 'enc', finalValue, sectionName);
    }

    onUpdate(inst.id, field, finalValue, sectionName); // Explicação: Envia o valor higienizado para o banco de dados.
  };

  return ( // Explicação: Desenha o cartão do instrumento com bordas arredondadas (Higiene de UI).
    <div className={`p-4 rounded-[2rem] border transition-all relative overflow-hidden bg-white shadow-sm ${
      isMyTurn ? 'border-blue-500 ring-1 ring-blue-100' : isOtherTurn ? 'opacity-70 border-slate-200' : 'border-slate-100'
    }`}>
      
      <div className="mb-3 flex justify-between items-start pr-2 text-left">
        <div className="flex flex-col text-left leading-none">
          <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1 flex items-center gap-2">
            {inst.label || inst.name || inst.nome || 'INSTRUMENTO'}
            {(isGovernance || isOrganista) && <ShieldCheck size={12} className="text-blue-500" />} {/* Explicação: Selo de cargo oficial. */}
          </h5>
          
          {(isOtherTurn || isMyTurn) && ( // Explicação: Exibe quem é o responsável pela contagem deste instrumento.
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className={`text-[7px] font-black uppercase italic ${isMyTurn ? 'text-blue-600' : 'text-slate-400'}`}>
                {isMyTurn ? 'No seu comando' : `Com: ${data?.[`responsibleName_${subId}`] || data?.responsibleName || 'Colaborador'}`}
              </span>
            </div>
          )}
        </div>

        {isRegional && !isClosed && ( // Explicação: Botão para assumir a posse da contagem em eventos Regionais.
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleOwnership(); }}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 ${
              isMyTurn 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <UserPlus size={10} strokeWidth={3} />
            <span className="text-[8px] font-black uppercase italic">{isMyTurn ? 'LOGADO' : 'ASSUMIR'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {isIrmandade && isRegional ? ( // Explicação: Desenha layout simples para Irmandade no Regional.
          <div className="flex gap-2 h-28">
            <CounterBox 
               label={inst.label || inst.id.toUpperCase()} 
               color={isMyTurn ? "slate" : "white"} 
               val={displayVal} 
               onChange={v => handleUpdate(subId, v)} 
               disabled={!isMyTurn} 
               isMain={true}
               onFocus={() => onFocus && onFocus(inst.id, subId)} // Explicação: Ativa proteção de digitação [v10.0].
               onBlur={() => onBlur && onBlur()} // Explicação: Libera proteção [v10.0].
            />
          </div>
        ) : isIrmandade && !isRegional ? ( // Explicação: Desenha caixas separadas para Irmãs e Irmãos no Local.
          <div className="flex gap-2 h-28">
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={!canEdit} isMain={true} onFocus={() => onFocus && onFocus(inst.id, 'irmas')} onBlur={() => onBlur && onBlur()} />
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={!canEdit} isMain={true} onFocus={() => onFocus && onFocus(inst.id, 'irmaos')} onBlur={() => onBlur && onBlur()} />
          </div>
        ) : (
          <>
            <div className="flex gap-2 h-28">
              <CounterBox 
                label="TOTAL" 
                color={isMyTurn && isRegional ? "slate" : isRegional ? "white" : "slate"} 
                val={displayVal} 
                onChange={v => handleUpdate('total', v)} 
                disabled={isRegional ? !isMyTurn : !canEdit} 
                isMain={true}
                onFocus={() => onFocus && onFocus(inst.id, 'total')} // Explicação: Ativa proteção no campo Total [v10.0].
                onBlur={() => onBlur && onBlur()} // Explicação: Desativa proteção [v10.0].
              />
              
              {!isRegional && !isGovernance && ( // Explicação: Campos detalhados exclusivos para Ensaios Locais.
                <>
                  <CounterBox 
                    label="COMUM" 
                    color="white" 
                    val={comum} 
                    onChange={v => handleUpdate('comum', v)} 
                    disabled={isSubFieldDisabled} 
                    isMain={false} 
                    maxLimit={total} 
                    onFocus={() => onFocus && onFocus(inst.id, 'comum')} // Explicação: Proteção para Comum.
                    onBlur={() => onBlur && onBlur()} 
                  />
                  <div className={`flex-[0.5] flex flex-col items-center justify-center rounded-[1.5rem] border transition-colors ${total === 0 ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`text-[7px] font-black uppercase tracking-widest mb-1 italic ${total === 0 ? 'text-slate-300' : 'text-blue-400'}`}>Visitas</span>
                    <span className={`text-2xl font-[900] italic leading-none ${total === 0 ? 'text-slate-200' : 'text-blue-600'}`}>{visitas}</span>
                  </div>
                </>
              )}
            </div>

            {!isRegional && !isGovernance && ( // Explicação: Barra de Liderança (Encarregados Locais).
              <div className={`mt-0.5 rounded-xl p-2 flex items-center justify-between border transition-all ${isSubFieldDisabled ? 'bg-slate-50 border-slate-100' : 'bg-slate-100/50 border-slate-200/50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg text-white ${isSubFieldDisabled ? 'bg-slate-300' : 'bg-slate-950'}`}>
                    <UserCheck size={10} strokeWidth={3} />
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest leading-none">
                    {labelLideranca || "Liderança"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button type="button" disabled={isSubFieldDisabled} onClick={() => handleUpdate('enc', enc - 1)} className={`${isSubFieldDisabled ? 'opacity-0' : 'text-slate-400'} p-1.5`}>
                    <Minus size={14} strokeWidth={4}/>
                  </button>
                  <span className={`text-lg font-[900] italic w-6 text-center ${isSubFieldDisabled ? 'text-slate-200' : 'text-slate-950'}`}>{enc}</span>
                  <button 
                    type="button" 
                    disabled={isSubFieldDisabled || enc >= total} 
                    onClick={() => handleUpdate('enc', enc + 1)} 
                    className={`${(isSubFieldDisabled || enc >= total) ? 'opacity-20' : 'text-slate-950'} p-1.5 transition-opacity`}
                  >
                    <Plus size={14} strokeWidth={4}/>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Componente da Caixinha de Número (Peça atômica do contador)
const CounterBox = ({ label, color, val, onChange, disabled, isMain = false, maxLimit = null, onFocus, onBlur }) => (
  <div className={`flex-1 rounded-[1.5rem] border transition-all relative flex flex-col items-center justify-center overflow-hidden ${
    disabled ? 'bg-slate-50 border-slate-100 shadow-inner' : 
    color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-lg' : 
    'bg-white border-slate-100 shadow-sm'
  }`}>
    <p className={`absolute top-2 text-[6px] font-black uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
    
    <div className="flex items-center w-full h-full pt-3">
        <button 
          disabled={disabled} 
          type="button"
          onClick={() => onChange(val - 1)} 
          className={`w-10 h-full flex items-center justify-center transition-all ${disabled ? 'opacity-20 pointer-events-none' : 'active:bg-black/10'}`}
        >
          <Minus size={isMain ? 16 : 12} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <input 
            disabled={disabled} 
            type="number" 
            inputMode="numeric" // Explicação: Força o teclado de números no celular.
            className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none ${isMain ? 'text-5xl' : 'text-3xl'} ${disabled ? 'text-slate-200' : 'text-inherit'}`} 
            value={val} 
            onFocus={(e) => { e.target.select(); onFocus && onFocus(); }} // Explicação: Seleciona o texto ao clicar e liga o escudo [v10.0].
            onBlur={() => onBlur && onBlur()} // Explicação: Libera o campo após sair dele [v10.0].
            onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
          />
        </div>

        <button 
          disabled={disabled || (maxLimit !== null && val >= maxLimit)} 
          type="button"
          onClick={() => onChange(val + 1)} 
          className={`w-10 h-full flex items-center justify-center transition-all ${(disabled || (maxLimit !== null && val >= maxLimit)) ? 'opacity-10 pointer-events-none' : 'active:bg-black/10'}`}
        >
          <Plus size={isMain ? 16 : 12} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
        </button>
    </div>
  </div>
);

export default InstrumentCard; // Explicação: Exporta o componente para uso no sistema.