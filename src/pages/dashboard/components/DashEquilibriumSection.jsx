import React from 'react';
import { TrendingUp } from 'lucide-react';

const ProgressBar = ({ label, value, color, isSub, racional, refVal }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end px-1 leading-none">
      <span className={`${isSub ? 'text-[8px]' : 'text-[9px]'} font-black uppercase italic text-slate-950`}>
        {label} [{racional}]
      </span>
      <span className="text-[9px] font-black text-slate-700 italic">
        {Math.round(value)}%{refVal ? ` / ${refVal}%` : ''}
      </span>
    </div>
    <div className={`w-full ${isSub ? 'h-1.5' : 'h-2.5'} bg-slate-50 rounded-full overflow-hidden border border-slate-100/30 shadow-inner`}>
      <div className={`h-full transition-all duration-1000 ease-out shadow-sm ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const DashEquilibriumSection = ({ stats, getPerc }) => {
  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 text-left">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="text-slate-900" size={16} />
        <h3 className="text-[11px] font-black text-slate-950 uppercase italic tracking-tighter">Equilíbrio e Distribuição</h3>
      </div>
      
      <ProgressBar label="Cordas" value={getPerc(stats.cordas, stats.musicos)} refVal="50" color="bg-amber-400" racional={`${stats.cordas}/${stats.musicos}`} />
      
      <div className="space-y-4 pt-2">
        <ProgressBar label="Madeiras" value={getPerc(stats.madeiras + stats.saxofones, stats.musicos)} refVal="25" color="bg-emerald-500" racional={`${stats.madeiras + stats.saxofones}/${stats.musicos}`} />
        <div className="pl-4 border-l-2 border-slate-100 ml-1">
          <ProgressBar label="Saxofones" value={getPerc(stats.saxofones, (stats.madeiras + stats.saxofones))} isSub color="bg-emerald-200" racional={`${stats.saxofones}/${stats.madeiras + stats.saxofones}`} />
        </div>
      </div>

      <ProgressBar label="Metais" value={getPerc(stats.metais, stats.musicos)} refVal="25" color="bg-rose-500" racional={`${stats.metais}/${stats.musicos}`} />
      <ProgressBar label="Acordeon" value={getPerc(stats.teclas, stats.musicos)} color="bg-slate-400" racional={`${stats.teclas}/${stats.musicos}`} />

      <div className="pt-6 border-t border-slate-50 space-y-4">
        <ProgressBar label="Coral" value={getPerc(stats.irmandade, stats.geral)} color="bg-blue-600" racional={`${stats.irmandade}/${stats.geral}`} />
        <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-100 ml-1">
          <ProgressBar label="Irmãos" value={getPerc(stats.irmaos, stats.irmandade)} isSub color="bg-blue-400" racional={`${stats.irmaos}/${stats.irmandade}`} />
          <ProgressBar label="Irmãs" value={getPerc(stats.irmas, stats.irmandade)} isSub color="bg-pink-300" racional={`${stats.irmas}/${stats.irmandade}`} />
        </div>
      </div>
    </div>
  );
};

export default DashEquilibriumSection;