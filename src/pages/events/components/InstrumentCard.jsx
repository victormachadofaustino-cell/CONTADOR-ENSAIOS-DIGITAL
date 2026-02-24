import React from 'react';
import { Minus, Plus, Lock, User, UserCheck, ShieldCheck, UserPlus } from 'lucide-react';

/**
 * InstrumentCard v3.15 - MODO HÍBRIDO (LOCAL/REGIONAL)
 * v3.15 - RESTAURAÇÃO DE REGRAS: Implementação do "Total como Teto".
 * Garante que campos secundários (Comum/Enc) nunca ultrapassem o Total.
 */
const InstrumentCard = ({ 
  inst, 
  data, 
  onUpdate, 
  onToggleOwnership, 
  userData, 
  isClosed, 
  isRegional,
  labelLideranca,
  sectionName 
}) => {
  // BLINDAGEM CRÍTICA
  if (!inst || !inst.id) return null;

  const isIrmandade = ['irmandade', 'irmas', 'irmaos', 'coral'].includes(inst.id.toLowerCase() || '');
  
  const isOrganista = inst.id?.toLowerCase().includes('organista') || 
                      inst.name?.toLowerCase().includes('organ') || 
                      inst.label?.toLowerCase().includes('orgao') ||
                      inst.id?.toLowerCase().includes('orgao');

  const isGovernance = (inst.isGovernance || inst.id?.includes('enc_local') || inst.evalType === 'Examinadora') && !isOrganista;
  
  // LÓGICA DE POSSE INDIVIDUALIZADA (Regional)
  const myUID = userData?.uid || userData?.id;
  const subId = inst.id.toLowerCase();
  
  const isMyTurn = (subId === 'irmas' || subId === 'irmaos') 
    ? data?.[`responsibleId_${subId}`] === myUID
    : data?.responsibleId === myUID;

  const isOtherTurn = (subId === 'irmas' || subId === 'irmaos')
    ? data?.[`responsibleId_${subId}`] && data?.[`responsibleId_${subId}`] !== myUID
    : data?.responsibleId && data?.responsibleId !== myUID;
  
  const canEdit = !isClosed && (isRegional ? isMyTurn : (userData?.accessLevel !== 'basico'));

  // SANEAMENTO DE DADOS COM RESPOSTA INSTANTÂNEA
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0; 
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  const displayVal = subId === 'irmas' ? irmas : subId === 'irmaos' ? irmaos : total;
  
  const visitas = Math.max(0, total - comum);
  const isSubFieldDisabled = !canEdit || total === 0;

  /**
   * handleUpdate v3.15 - Lógica de Saneamento Hierárquico
   */
  const handleUpdate = (field, value) => {
    if (!canEdit) return;
    let finalValue = Math.max(0, parseInt(value) || 0);
    
    // REGRA 1: Comum e Liderança não podem ultrapassar o Total
    if ((field === 'comum' || field === 'enc') && finalValue > total) {
      finalValue = total;
    }

    // REGRA 2: Se o Total diminuir, puxa Comum e Liderança para baixo
    if (field === 'total') {
      if (comum > finalValue) onUpdate(inst.id, 'comum', finalValue, sectionName);
      if (enc > finalValue) onUpdate(inst.id, 'enc', finalValue, sectionName);
    }

    onUpdate(inst.id, field, finalValue, sectionName);
  };

  return (
    <div className={`p-4 rounded-[2rem] border transition-all relative overflow-hidden bg-white shadow-sm ${
      isMyTurn ? 'border-blue-500 ring-1 ring-blue-100' : isOtherTurn ? 'opacity-70 border-slate-200' : 'border-slate-100'
    }`}>
      
      <div className="mb-3 flex justify-between items-start pr-2">
        <div className="flex flex-col text-left leading-none">
          <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1 flex items-center gap-2">
            {inst.label || inst.name || inst.nome || 'INSTRUMENTO'}
            {(isGovernance || isOrganista) && <ShieldCheck size={12} className="text-blue-500" />}
          </h5>
          
          {(isOtherTurn || isMyTurn) && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className={`text-[7px] font-black uppercase italic ${isMyTurn ? 'text-blue-600' : 'text-slate-400'}`}>
                {isMyTurn ? 'No seu comando' : `Com: ${data?.[`responsibleName_${subId}`] || data?.responsibleName || 'Colaborador'}`}
              </span>
            </div>
          )}
        </div>

        {isRegional && !isClosed && (
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
        {isIrmandade && isRegional ? (
          <div className="flex gap-2 h-28">
            <CounterBox 
               label={inst.label || inst.id.toUpperCase()} 
               color={isMyTurn ? "slate" : "white"} 
               val={displayVal} 
               onChange={v => handleUpdate(subId, v)} 
               disabled={!isMyTurn} 
               isMain={true} 
            />
          </div>
        ) : isIrmandade && !isRegional ? (
          <div className="flex gap-2 h-28">
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={!canEdit} isMain={true} />
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={!canEdit} isMain={true} />
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
              />
              
              {!isRegional && !isGovernance && (
                <>
                  <CounterBox 
                    label="COMUM" 
                    color="white" 
                    val={comum} 
                    onChange={v => handleUpdate('comum', v)} 
                    disabled={isSubFieldDisabled} 
                    isMain={false} 
                    maxLimit={total} // Trava visual v3.15
                  />
                  <div className={`flex-[0.5] flex flex-col items-center justify-center rounded-[1.5rem] border transition-colors ${total === 0 ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`text-[7px] font-black uppercase tracking-widest mb-1 italic ${total === 0 ? 'text-slate-300' : 'text-blue-400'}`}>Visitas</span>
                    <span className={`text-2xl font-[900] italic leading-none ${total === 0 ? 'text-slate-200' : 'text-blue-600'}`}>{visitas}</span>
                  </div>
                </>
              )}
            </div>

            {!isRegional && !isGovernance && (
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
                    disabled={isSubFieldDisabled || enc >= total} // Trava Plus v3.15
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

const CounterBox = ({ label, color, val, onChange, disabled, isMain = false, maxLimit = null }) => (
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
            inputMode="numeric"
            className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none ${isMain ? 'text-5xl' : 'text-3xl'} ${disabled ? 'text-slate-200' : 'text-inherit'}`} 
            value={val} 
            onFocus={(e) => e.target.select()}
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

export default InstrumentCard;