import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * AtaMinisterioLocal v1.0
 * Módulo para controle de presença do ministério da comum.
 * Foco: Performance de clique e feedback visual imediato.
 */
const AtaMinisterioLocal = ({ 
  localMinisterio, 
  presencaLocal, 
  isInputDisabled, 
  togglePresencaLocal 
}) => {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {localMinisterio.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
          <p className="text-[9px] font-black text-slate-400 uppercase italic">
            Nenhum ministério cadastrado nesta localidade.
          </p>
        </div>
      ) : (
        localMinisterio.map((m, i) => {
          const estaPresente = presencaLocal?.includes(m.name);
          
          return (
            <button 
              key={m.id || i} 
              disabled={isInputDisabled} 
              onClick={() => togglePresencaLocal(m)} 
              className={`flex justify-between items-center p-5 rounded-3xl border transition-all duration-300 active:scale-[0.98] ${
                estaPresente 
                  ? 'bg-slate-900 text-white border-slate-950 shadow-lg' 
                  : 'bg-white border-slate-100 text-slate-700 hover:border-blue-100'
              } disabled:opacity-50`}
            >
              <div className="text-left leading-none">
                {/* NOME DO IRMÃO (Sempre em destaque) */}
                <p className="text-xs font-black uppercase italic tracking-tight leading-none">
                  {m.name}
                </p>
                
                {/* CARGO / MINISTÉRIO */}
                <p className={`text-[9px] font-bold mt-2 uppercase tracking-widest leading-none ${
                  estaPresente ? 'text-blue-400' : 'text-slate-400'
                }`}>
                  {m.role}
                </p>
              </div>

              {/* INDICADOR VISUAL DE PRESENÇA (Escudo com Check) */}
              <div className={`transition-all duration-500 ${estaPresente ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`}>
                <ShieldCheck size={20} className="text-blue-400" />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

export default AtaMinisterioLocal;