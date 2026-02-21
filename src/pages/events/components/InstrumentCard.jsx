import React from 'react';
import { Minus, Plus, Lock, User, UserCheck, ShieldCheck } from 'lucide-react';

/**
 * InstrumentCard v3.6.1 - FIX ORGANISTAS & PRIORIDADE DE ESTRUTURA
 * v3.6.1 - Garante estrutura completa para Organistas mesmo sob supervisão de Examinadoras.
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
  
  // IDENTIFICAÇÃO CIRÚRGICA: Diferencia Organista (Instrumento) de Governança pura (Cargos)
  // Busca por variações de nome para garantir que o card musical prevaleça
  const isOrganista = inst.id.toLowerCase().includes('organista') || 
                     inst.name?.toLowerCase().includes('organ') || 
                     inst.id.toLowerCase().includes('orgao');

  // CORREÇÃO: Força isGovernance como false se for organista para liberar os campos Comum/Visitas
  const isGovernance = (inst.isGovernance || inst.id.includes('enc_local') || inst.evalType === 'Examinadora') && !isOrganista;
  
  // LÓGICA DE POSSE INDIVIDUAL (Informativa)
  const myUID = userData?.uid || userData?.id;
  const isMyTurn = data?.responsibleId === myUID;
  const isOtherTurn = data?.responsibleId && data?.responsibleId !== myUID;
  
  // REGRA: A edição aqui é controlada pelo 'isClosed' enviado pelo componente pai (Naipe)
  const canEdit = !isClosed;

  // SANEAMENTO DE DADOS
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0; 
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  const visitas = Math.max(0, total - comum);

  // Trava visual: Impede alteração de subcampos se não houver ninguém no total ou sem permissão
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
    <div className={`p-4 rounded-[2rem] border transition-all relative overflow-hidden bg-white shadow-sm ${
      isMyTurn ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-100'
    }`}>
      
      {/* JUSTIFICATIVA v3.6.1: Botão 'Assumir' individual removido para evitar redundância. */}

      <div className="mb-3 flex flex-col text-left pr-4 leading-none">
        <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1 flex items-center gap-2">
          {inst.name || 'INSTRUMENTO'}
          {(isGovernance || isOrganista) && <ShieldCheck size={12} className="text-blue-500" />}
        </h5>
        
        {/* TAG DE IDENTIFICAÇÃO NOMINAL (ZELADORIA) */}
        {(isOtherTurn || isMyTurn) && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className={`text-[7px] font-black uppercase italic ${isMyTurn ? 'text-blue-600' : 'text-slate-400'}`}>
              {isMyTurn ? 'Você está no comando' : `Responsável: ${data.responsibleName || 'Colaborador'}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {isIrmandade ? (
          <div className="flex gap-2 h-28">
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={!canEdit} isMain={true} />
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={!canEdit} isMain={true} />
          </div>
        ) : (
          <>
            {/* ÁREA DE CONTAGEM PRINCIPAL */}
            <div className="flex gap-2 h-28">
              <CounterBox 
                label={isRegional ? "TOTAL" : "TOTAL"} 
                color="slate" 
                val={total} 
                onChange={v => handleUpdate('total', v)} 
                disabled={!canEdit} 
                isMain={true} 
              />
              
              {/* ESTRUTURA COMPLETA: Agora liberada corretamente para Organistas */}
              {!isRegional && !isGovernance && (
                <>
                  <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={isSubFieldDisabled} isMain={false} />
                  <div className={`flex-[0.5] flex flex-col items-center justify-center rounded-[1.5rem] leading-none shadow-inner border transition-colors ${total === 0 ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`text-[7px] font-black uppercase tracking-widest mb-1 italic ${total === 0 ? 'text-slate-300' : 'text-blue-400'}`}>Visitas</span>
                    <span className={`text-2xl font-[900] italic leading-none tabular-nums ${total === 0 ? 'text-slate-200' : 'text-blue-600'}`}>{visitas}</span>
                  </div>
                </>
              )}
            </div>

            {/* RODAPÉ DE LIDERANÇA */}
            {!isRegional && !isGovernance && (
              <div className={`mt-0.5 rounded-xl p-2 flex items-center justify-between border transition-all ${isSubFieldDisabled ? 'bg-slate-50 border-slate-100' : 'bg-slate-100/50 border-slate-200/50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg text-white transition-colors ${isSubFieldDisabled ? 'bg-slate-300' : 'bg-slate-950'}`}>
                    <UserCheck size={10} strokeWidth={3} />
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest leading-none">
                    {labelLideranca || "Liderança"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    disabled={isSubFieldDisabled} 
                    onClick={() => handleUpdate('enc', enc - 1)} 
                    className={`${isSubFieldDisabled ? 'opacity-0 pointer-events-none' : 'text-slate-400 active:text-red-500'} transition-all p-1.5`}
                  >
                    <Minus size={14} strokeWidth={4}/>
                  </button>
                  <span className={`text-lg font-[900] italic w-6 text-center tabular-nums ${isSubFieldDisabled ? 'text-slate-200' : 'text-slate-950'}`}>
                    {enc}
                  </span>
                  <button 
                    disabled={isSubFieldDisabled} 
                    onClick={() => handleUpdate('enc', enc + 1)} 
                    className={`${isSubFieldDisabled ? 'opacity-0 pointer-events-none' : 'text-slate-950 active:text-blue-600'} transition-all p-1.5`}
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
  <div className={`flex-1 rounded-[1.5rem] border transition-all relative flex flex-col items-center justify-center overflow-hidden ${
    disabled ? 'bg-slate-50 border-slate-100' : 
    color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-inner' : 
    'bg-white border-slate-100 shadow-sm'
  }`}>
    <p className={`absolute top-2 text-[6px] font-black uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
    
    <div className="flex items-center w-full h-full pt-3">
        <button 
          disabled={disabled} 
          onClick={() => onChange(val - 1)} 
          className={`w-10 h-full flex items-center justify-center active:bg-white/10 transition-all ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Minus size={isMain ? 16 : 12} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <input 
            disabled={disabled} 
            type="number" 
            inputMode="numeric"
            className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none tabular-nums ${isMain ? 'text-5xl' : 'text-3xl'} ${disabled ? 'text-slate-400' : 'text-inherit'}`} 
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
          className={`w-10 h-full flex items-center justify-center active:bg-white/10 transition-all ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Plus size={isMain ? 16 : 12} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
        </button>
    </div>
  </div>
);

export default InstrumentCard;