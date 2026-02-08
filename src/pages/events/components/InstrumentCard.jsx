import React from 'react';
import { Eye, Minus, Plus, ShieldCheck, UserCheck } from 'lucide-react';

/**
 * Componente individual para cada instrumento/seção de contagem.
 * v1.0 - Isolado para modularidade e facilidade de manutenção.
 */
const InstrumentCard = ({ inst, data, onUpdate, disabled }) => {
  const isIrmandade = ['irmandade', 'Coral'].includes(inst.id);
  const isOrganista = ['orgao'].includes(inst.id);
  
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0;
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  const visitas = Math.max(0, total - comum);
  const encarregadoHabilitado = total > 0;

  const handleUpdate = (field, value) => {
    if (disabled) return;
    let finalValue = Math.max(0, parseInt(value) || 0);

    // Regra de Consistência: Comum e Encarregados não podem superar o Total
    if (field === 'comum' && finalValue > total) {
      finalValue = total;
    }
    if (field === 'enc' && finalValue > total) {
        finalValue = total;
    }

    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-4 rounded-[2.2rem] border transition-all relative overflow-hidden ${disabled ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-100 shadow-md'}`}>
      <div className="mb-3 flex items-center justify-between text-left">
        <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tight">{inst.name}</h5>
        {disabled && <Eye size={12} className="text-slate-300" />}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 h-24">
            {isIrmandade ? (
              <>
                <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={disabled} />
                <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={disabled} />
              </>
            ) : (
              <>
                <CounterBox label="TOTAL" color="slate" val={total} onChange={v => handleUpdate('total', v)} disabled={disabled} />
                <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={disabled} />
                
                <div className="flex-1 flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-2xl leading-none shadow-inner">
                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Visitas</span>
                  <span className="text-3xl font-[900] text-blue-600 italic leading-none">{visitas}</span>
                </div>
              </>
            )}
        </div>

        {!isIrmandade && (
          <div className={`flex items-center gap-2 pt-1 transition-all duration-300 ${!encarregadoHabilitado ? 'opacity-30 grayscale' : 'opacity-100'}`}>
            <div className={`p-2 rounded-xl shrink-0 transition-colors ${encarregadoHabilitado ? 'bg-slate-900 text-amber-500 shadow-md' : 'bg-slate-100 text-slate-400'}`}>
               {isOrganista ? <ShieldCheck size={16}/> : <UserCheck size={16}/>}
            </div>
            <div className="flex-1">
              <CounterBoxSmall 
                label={isOrganista ? "EXAMINADORAS" : "ENCARREGADOS"} 
                val={enc} 
                onChange={v => handleUpdate('enc', v)} 
                disabled={disabled || !encarregadoHabilitado} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CounterBox = ({ label, color, val, onChange, disabled }) => (
  <div className={`flex-1 rounded-2xl border transition-all relative flex flex-col items-center justify-center overflow-hidden ${disabled ? 'bg-slate-100 border-slate-200' : color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-lg' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
    <p className={`absolute top-2.5 text-[7px] font-[900] uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
    
    <div className="flex items-center w-full h-full pt-4">
        <button disabled={disabled} onClick={() => onChange(val - 1)} className="w-10 h-full flex items-center justify-center active:bg-white/10 transition-colors">
          <Minus size={16} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <input 
            disabled={disabled} 
            type="number" 
            className="bg-transparent w-full text-center font-[900] text-4xl outline-none italic tracking-tighter" 
            value={val} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const newVal = e.target.value === "" ? 0 : parseInt(e.target.value);
              onChange(newVal);
            }} 
          />
        </div>

        <button disabled={disabled} onClick={() => onChange(val + 1)} className="w-10 h-full flex items-center justify-center active:bg-white/10 transition-colors">
          <Plus size={16} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
        </button>
    </div>
  </div>
);

const CounterBoxSmall = ({ label, val, onChange, disabled }) => (
  <div className={`h-12 px-4 rounded-[1.2rem] border transition-all flex items-center justify-between overflow-hidden ${disabled ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-200 shadow-sm'}`}>
    <p className="text-[8px] font-black text-slate-400 uppercase italic tracking-widest leading-none">{label}</p>
    <div className="flex items-center h-full">
      <button disabled={disabled} onClick={() => onChange(val - 1)} className="w-8 h-full flex items-center justify-center text-slate-300 active:text-red-500 transition-colors">
        <Minus size={14} strokeWidth={4}/>
      </button>
      
      <span className="font-black text-slate-950 italic text-lg w-8 text-center">{val}</span>
      
      <button 
        disabled={disabled} 
        onClick={() => onChange(val + 1)} 
        className="w-8 h-full flex items-center justify-center text-slate-950 active:text-blue-500 transition-colors"
      >
        <Plus size={14} strokeWidth={4}/>
      </button>
    </div>
  </div>
);

export default InstrumentCard;