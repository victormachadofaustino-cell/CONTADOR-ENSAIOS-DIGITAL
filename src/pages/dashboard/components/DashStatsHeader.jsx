import React from 'react';
import { Share2 } from 'lucide-react';

const DashStatsHeader = ({ stats, isBasico, handleShareLanche }) => {
  return (
    <div className="bg-slate-950 px-5 py-3 rounded-[2rem] shadow-2xl relative border border-white/5 min-h-[84px] flex items-center overflow-hidden">
      <div className="w-[35%] leading-none text-left">
        <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1 italic">Alimentação</p>
        <h3 className="text-xl font-[1000] text-white uppercase italic tracking-tighter">Resumo</h3>
      </div>
      <div className="w-[30%] text-center">
        <span className="text-4xl font-[1000] text-white italic tracking-tighter">{stats.geral}</span>
      </div>
      <div className="w-[35%] flex gap-4 border-l border-white/10 pl-4 h-10 items-center justify-end">
        <div className="text-center leading-none">
          <p className="text-[6px] font-black text-slate-500 uppercase italic mb-1">Orq</p>
          <p className="text-lg font-black text-white">{stats.orquestra}</p>
        </div>
        <div className="text-center leading-none">
          <p className="text-[6px] font-black text-slate-500 uppercase italic mb-1">Coral</p>
          <p className="text-lg font-black text-white">{stats.irmandade}</p>
        </div>
        {!isBasico && (
          <button onClick={handleShareLanche} className="text-emerald-500 active:scale-90 ml-1">
            <Share2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DashStatsHeader;