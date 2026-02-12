import React from 'react';
import { Minus, Plus, Lock, User, UserCheck } from 'lucide-react';

/**
 * InstrumentCard v2.7 - ALTA VISIBILIDADE & MINISTÉRIO ACOPLADO
 * v2.7 - Preserva 7XL Central e move Ministério para Destaque Inferior (Local)
 */
const InstrumentCard = ({ inst, data, onUpdate, onToggleOwnership, userData, isClosed, isRegional }) => {
  // BLINDAGEM CRÍTICA: Se o instrumento não existir ou não tiver ID, ignora a renderização
  if (!inst || !inst.id) return null;

  const isIrmandade = ['irmandade', 'Coral'].includes(inst.id);
  
  // LÓGICA DE POSSE INDIVIDUAL
  const myUID = userData?.uid || userData?.id;
  const isMyTurn = data?.responsibleId === myUID;
  const isOtherTurn = data?.responsibleId && data?.responsibleId !== myUID;
  
  // No modo Regional, a edição só é permitida se o usuário assumiu o instrumento. 
  const canEdit = !isClosed && (isRegional ? isMyTurn : true);

  // SANEAMENTO DE DADOS
  const total = parseInt(data?.total) || 0;
  const comum = parseInt(data?.comum) || 0;
  const enc = parseInt(data?.enc) || 0; 
  const irmaos = parseInt(data?.irmaos) || 0;
  const irmas = parseInt(data?.irmas) || 0;
  
  const visitas = Math.max(0, total - comum);

  const handleUpdate = (field, value) => {
    if (!canEdit) return;
    let finalValue = Math.max(0, parseInt(value) || 0);
    if (field === 'comum' && finalValue > total) finalValue = total;
    onUpdate(inst.id, field, finalValue);
  };

  return (
    <div className={`p-5 rounded-[2.5rem] border transition-all relative overflow-hidden ${
      canEdit ? 'bg-white border-slate-200 shadow-xl scale-[1.01]' : 'bg-slate-50 border-slate-100 opacity-80'
    }`}>
      
      {/* BOTÃO ASSUMIR (Apenas em modo Regional) */}
      {isRegional && !isClosed && (
        <div className="absolute top-4 right-5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleOwnership(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[8px] uppercase italic tracking-widest transition-all active:scale-90 shadow-sm ${
              isMyTurn ? 'bg-red-50 text-red-500 border border-red-100' : 
              isOtherTurn ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
              'bg-slate-950 text-white'
            }`}
          >
            {isMyTurn ? 'Liberar' : isOtherTurn ? <><Lock size={10}/> Em Uso</> : <><User size={10}/> Assumir</>}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col text-left pr-20 leading-none">
        <h5 className="font-[900] text-[12px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1">
          {inst.name || 'INSTRUMENTO'}
        </h5>
        
        {/* TAG DE ZELADORIA NOMINAL */}
        {isOtherTurn && (
          <span className="text-[7px] font-black text-amber-600 uppercase italic animate-pulse">
            Contado por: {data.responsibleName || 'Colaborador'}
          </span>
        )}
        {isMyTurn && (
          <span className="text-[7px] font-black text-blue-600 uppercase italic">
            Você assumiu esta contagem
          </span>
        )}
      </div>

      <div className={`flex flex-col gap-3 ${!canEdit ? 'grayscale pointer-events-none opacity-50' : ''}`}>
        {isIrmandade ? (
          <div className="flex gap-2.5 h-32">
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={!canEdit} isMain={true} />
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={!canEdit} isMain={true} />
          </div>
        ) : (
          <>
            {/* ÁREA DE CONTAGEM PRINCIPAL (Sempre 7XL) */}
            <div className="flex gap-2 h-32">
              <CounterBox label={isRegional ? "TOTAL PRESENTE" : "TOTAL"} color="slate" val={total} onChange={v => handleUpdate('total', v)} disabled={!canEdit} isMain={true} />
              {!isRegional && (
                <>
                  <CounterBox label="COMUM" color="white" val={comum} onChange={v => handleUpdate('comum', v)} disabled={!canEdit} isMain={false} />
                  <div className="flex-[0.6] flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-[1.8rem] leading-none shadow-inner">
                    <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Visitas</span>
                    <span className="text-4xl font-[900] text-blue-600 italic leading-none">{visitas}</span>
                  </div>
                </>
              )}
            </div>

            {/* DESTAQUE DE MINISTÉRIO (RODAPÉ DO CARD - MODO LOCAL) */}
            {!isRegional && (
              <div className="mt-1 bg-slate-100/50 rounded-2xl p-2.5 flex items-center justify-between border border-slate-200/50">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-950 p-1.5 rounded-lg text-white">
                    <UserCheck size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest leading-none">Encarregados / Examinadoras</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button onClick={() => handleUpdate('enc', enc - 1)} className="text-slate-400 active:text-red-500 transition-colors">
                    <Minus size={14} strokeWidth={4}/>
                  </button>
                  <span className="text-xl font-[900] text-slate-950 italic w-8 text-center">{enc}</span>
                  <button onClick={() => handleUpdate('enc', enc + 1)} className="text-slate-950 active:text-blue-600 transition-colors">
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
    disabled ? 'bg-slate-100 border-slate-200' : 
    color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-inner' : 
    'bg-white border-slate-100 shadow-sm'
  }`}>
    <p className={`absolute top-2.5 text-[7px] font-black uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
    
    <div className="flex items-center w-full h-full pt-4">
        <button disabled={disabled} onClick={() => onChange(val - 1)} className="w-10 h-full flex items-center justify-center active:bg-white/10 transition-colors">
          <Minus size={isMain ? 18 : 14} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <input 
            disabled={disabled} 
            type="number" 
            className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none ${isMain ? 'text-7xl' : 'text-5xl'}`} 
            value={val} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const newVal = e.target.value === "" ? 0 : parseInt(e.target.value);
              onChange(newVal);
            }} 
          />
        </div>

        <button disabled={disabled} onClick={() => onChange(val + 1)} className="w-10 h-full flex items-center justify-center active:bg-white/10 transition-colors">
          <Plus size={isMain ? 18 : 14} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
        </button>
    </div>
  </div>
);

export default InstrumentCard;