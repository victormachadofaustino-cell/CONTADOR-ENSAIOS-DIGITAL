import React from 'react';
import { Minus, Plus, Lock, User, UserCheck, ShieldCheck } from 'lucide-react';

/**
 * InstrumentCard v3.2 - PADRONIZAÇÃO DE GOVERNANÇA & ZELADORIA FLEXÍVEL
 * v3.2 - Ajuste de canEdit para permitir zeladoria colaborativa e botões inteligentes.
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
  // BLINDAGEM CRÍTICA: Se o instrumento não existir ou não tiver ID, ignora a renderização
  if (!inst || !inst.id) return null;

  const isIrmandade = ['irmandade', 'Coral', 'coral'].includes(inst.id.toLowerCase());
  // Identifica se é um card de Governança (Examinadoras/Encarregados Locais)
  const isGovernance = inst.isGovernance || sectionName === 'GOVERNANÇA' || inst.id.includes('enc_local') || inst.evalType === 'Examinadora';
  
  // LÓGICA DE POSSE INDIVIDUAL
  const myUID = userData?.uid || userData?.id;
  const isMyTurn = data?.responsibleId === myUID;
  const isOtherTurn = data?.responsibleId && data?.responsibleId !== myUID;
  
  // REGRA v7.1: Liberado para editar se não estiver fechado e não houver outro dono travando o item.
  const canEdit = !isClosed && !isOtherTurn;

  // SANEAMENTO DE DADOS
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0; 
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  const visitas = Math.max(0, total - comum);

  // Trava visual: Impede alteração de subcampos se não houver ninguém no total
  const isSubFieldDisabled = !canEdit || total === 0;

  const handleUpdate = (field, value) => {
    if (!canEdit) return;
    let finalValue = Math.max(0, parseInt(value) || 0);

    // REGRA DE OURO: Comum ou Liderança nunca podem ser maiores que o Total
    if ((field === 'comum' || field === 'enc') && finalValue > total) {
      finalValue = total;
    }
    
    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-5 rounded-[2.5rem] border transition-all relative overflow-hidden bg-white shadow-sm ${
      isMyTurn ? 'border-blue-200 shadow-md scale-[1.01]' : 'border-slate-100'
    } ${isGovernance ? 'border-l-4 border-l-amber-500' : ''}`}>
      
      {/* BOTÃO ASSUMIR (Fluxo v7.1: Sempre disponível para trocar ou assumir) */}
      {!isClosed && (
        <div className="absolute top-4 right-5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleOwnership(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[8px] uppercase italic tracking-widest transition-all active:scale-90 shadow-sm ${
              isMyTurn ? 'bg-blue-600 text-white' : 
              isOtherTurn ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
              'bg-slate-950 text-white'
            }`}
          >
            {isMyTurn ? <><UserCheck size={10}/> Seu Card</> : isOtherTurn ? <><Lock size={10}/> Trocar Posse</> : <><User size={10}/> Assumir</>}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col text-left pr-32 leading-none">
        <h5 className="font-[900] text-[12px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1 flex items-center gap-2">
          {inst.name || 'INSTRUMENTO'}
          {isGovernance && <ShieldCheck size={12} className="text-amber-500" />}
        </h5>
        
        {/* TAG DE IDENTIFICAÇÃO NOMINAL */}
        {isOtherTurn && (
          <span className="text-[7px] font-black text-slate-400 uppercase italic">
            Sob responsabilidade de: {data.responsibleName || 'Colaborador'}
          </span>
        )}
        {isMyTurn && (
          <span className="text-[7px] font-black text-blue-600 uppercase italic">
            Você está editando este item
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {isIrmandade ? (
          <div className="flex gap-2.5 h-32">
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={!canEdit} isMain={true} />
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={!canEdit} isMain={true} />
          </div>
        ) : (
          <>
            {/* ÁREA DE CONTAGEM PRINCIPAL */}
            <div className="flex gap-2 h-32">
              <CounterBox 
                label={isGovernance ? (inst.evalType || "LIDERANÇA") : (isRegional ? "TOTAL PRESENTE" : "TOTAL")} 
                color="slate" 
                val={total} 
                onChange={v => handleUpdate('total', v)} 
                disabled={!canEdit} 
                isMain={true} 
              />
              
              {!isRegional && !isGovernance && (
                <>
                  <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={isSubFieldDisabled} isMain={false} />
                  <div className={`flex-[0.6] flex flex-col items-center justify-center rounded-[1.8rem] leading-none shadow-inner border transition-colors ${total === 0 ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`text-[7px] font-black uppercase tracking-widest mb-2 italic ${total === 0 ? 'text-slate-300' : 'text-blue-400'}`}>Visitas</span>
                    <span className={`text-4xl font-[900] italic leading-none ${total === 0 ? 'text-slate-200' : 'text-blue-600'}`}>{visitas}</span>
                  </div>
                </>
              )}
            </div>

            {/* RODAPÉ DE LIDERANÇA - Apenas para Instrumentos comuns */}
            {!isRegional && !isGovernance && (
              <div className={`mt-1 rounded-2xl p-2.5 flex items-center justify-between border transition-all ${isSubFieldDisabled ? 'bg-slate-50 border-slate-100' : 'bg-slate-100/50 border-slate-200/50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg text-white transition-colors ${isSubFieldDisabled ? 'bg-slate-300' : 'bg-slate-950'}`}>
                    <UserCheck size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest leading-none">
                    {labelLideranca || "Liderança"}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    disabled={isSubFieldDisabled} 
                    onClick={() => handleUpdate('enc', enc - 1)} 
                    className={`${isSubFieldDisabled ? 'opacity-0 pointer-events-none' : 'text-slate-400 active:text-red-500'} transition-all p-2`}
                  >
                    <Minus size={14} strokeWidth={4}/>
                  </button>
                  <span className={`text-xl font-[900] italic w-8 text-center ${isSubFieldDisabled ? 'text-slate-200' : 'text-slate-950'}`}>
                    {enc}
                  </span>
                  <button 
                    disabled={isSubFieldDisabled} 
                    onClick={() => handleUpdate('enc', enc + 1)} 
                    className={`${isSubFieldDisabled ? 'opacity-0 pointer-events-none' : 'text-slate-950 active:text-blue-600'} transition-all p-2`}
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

/* --- SUB-COMPONENTES AUXILIARES --- */

const CounterBox = ({ label, color, val, onChange, disabled, isMain = false }) => (
  <div className={`flex-1 rounded-[1.8rem] border transition-all relative flex flex-col items-center justify-center overflow-hidden ${
    disabled ? 'bg-slate-50 border-slate-100' : 
    color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-inner' : 
    'bg-white border-slate-100 shadow-sm'
  }`}>
    <p className={`absolute top-2.5 text-[7px] font-black uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
    
    <div className="flex items-center w-full h-full pt-4">
        <button 
          disabled={disabled} 
          onClick={() => onChange(val - 1)} 
          className={`w-12 h-full flex items-center justify-center active:bg-white/10 transition-all ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Minus size={isMain ? 18 : 14} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <input 
            disabled={disabled} 
            type="number" 
            inputMode="numeric"
            className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none ${isMain ? 'text-7xl' : 'text-5xl'} ${disabled ? 'text-slate-400' : 'text-inherit'}`} 
            value={val} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const newVal = e.target.value === "" ? 0 : parseInt(e.target.value);
              onChange(newVal);
            }} 
          />
        </div>

        <button 
          disabled={disabled} 
          onClick={() => onChange(val + 1)} 
          className={`w-12 h-full flex items-center justify-center active:bg-white/10 transition-all ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Plus size={isMain ? 18 : 14} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
        </button>
    </div>
  </div>
);

export default InstrumentCard;