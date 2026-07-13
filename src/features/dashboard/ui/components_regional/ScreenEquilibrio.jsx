import React from 'react'; // [Funcionamento]: Estrutura núcleo do React para renderização do componente de UI.
import { Scale } from 'lucide-react'; // [Funcionamento]: Ícone de balança minimalista para o cabeçalho.

// 🧩 COMPONENTE FILHO ATÔMICO: BARRA DE PROGRESSO PREMIUM AUTOMATIZADA (REAGRUPADA COM DESIGN ACÚSTICO CCB)
const ProgressBar = ({ label, value, color, isSub, racional, refVal }) => (
  <div className="space-y-1.5 animate-in fade-in duration-200 text-left font-sans">
    
    {/* 🏷️ LINHA DE DADOS SUPERIOR: RÓTULOS E ESCALA DE METAS */}
    <div className="flex justify-between items-end px-0.5 leading-none select-none">
      <span className={`${isSub ? 'text-[9px] text-slate-500 font-bold' : 'text-[10px] text-slate-950 font-black'} uppercase tracking-wide flex items-center gap-1.5 min-w-0`}>
        <span className="truncate">{label}</span>
        <span className="text-[8px] font-bold text-slate-400 normal-case italic bg-slate-100 px-1 py-0.5 rounded-md shrink-0">
          {racional}
        </span>
      </span>
      <span className={`text-[10px] font-black italic tracking-tight shrink-0 ${isSub ? 'text-slate-600' : 'text-slate-950'}`}>
        {Math.round(value)}%
        {refVal ? (
          <span className="text-[9px] font-medium text-slate-400 not-italic ml-1">
            (Meta: {refVal}%)
          </span>
        ) : null}
      </span>
    </div>

    {/* 🎛️ ESTRUTURA DO TRILHO TÁTIL: SISTEMA ANALÓGICO COM PROFUNDIDADE */}
    <div className={`w-full ${isSub ? 'h-2' : 'h-3.5'} bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 p-[2px] shadow-inner flex items-center`}>
      <div 
        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-xs bg-gradient-to-r relative overflow-hidden ${color}`} 
        style={{ width: `${value}%` }} 
      >
        {/* Micro-textura de reflexo de luz (Glossy Effect) para acabamento Premium */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      </div>
    </div>

  </div>
);

const ScreenEquilibrio = ({ stats, getPerc }) => { // [Funcionamento]: Recebe a árvore estatística reativa do Maestro.

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200/70 shadow-xs space-y-5 text-left animate-in fade-in duration-300 font-sans">
      
      {/* 🏅 CABEÇALHO DA ABA GERENCIAL */}
      <div className="flex items-center gap-2 pb-1 border-b border-slate-50 select-none">
        <Scale className="text-slate-950" size={14} />
        <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-wider">Equilíbrio Orquestral</h3>
      </div>
      
      {/* 🎻 SEÇÃO DE CORDAS (META REGULAMENTAR DE 50% SOBRE O CORPO DE MÚSICOS) */}
      <ProgressBar 
        label="Cordas" 
        value={getPerc(stats.cordas, stats.musicos)} 
        refVal="50" 
        color="from-amber-400 to-amber-500 border-b border-amber-300" 
        racional={`${stats.cordas}/${stats.musicos}`} 
      />
      
      {/* 🪵 SEÇÃO DE MADEIRAS & SAXOFONES (VERTICAL STACKING HIERÁRQUICO COM ANINHAMENTO) */}
      <div className="space-y-3.5 pt-0.5">
        <ProgressBar 
          label="Madeiras" 
          value={getPerc(stats.madeiras + stats.saxofones, stats.musicos)} 
          refVal="25" 
          color="from-emerald-500 to-emerald-600 border-b border-emerald-400" 
          racional={`${stats.madeiras + stats.saxofones}/${stats.musicos}`} 
        />
        
        {/* Recuo elegante por bordagem tracejada denotando filiação acústica de sub-naipe */}
        <div className="pl-4 border-l-2 border-slate-200/70 ml-1 bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200/30"> 
          <ProgressBar 
            label="Saxofones" 
            value={getPerc(stats.saxofones, (stats.madeiras + stats.saxofones))} 
            isSub 
            color="from-emerald-300 to-emerald-400 border-b border-emerald-200" 
            racional={`${stats.saxofones}/${stats.madeiras + stats.saxofones}`} 
          />
        </div>
      </div>

      {/* 🎺 SEÇÃO DE METAIS (META REGULAMENTAR DE 25% SOBRE O CORPO DE MÚSICOS) */}
      <ProgressBar 
        label="Metais" 
        value={getPerc(stats.metais, stats.musicos)} 
        refVal="25" 
        color="from-rose-500 to-rose-600 border-b border-rose-400" 
        racional={`${stats.metais}/${stats.musicos}`} 
      />
      
      {/* 🎹 SEÇÃO DE TECLAS AUXILIARES (ACORDEON CALCULA SOBRE MÚSICOS) */}
      <ProgressBar 
        label="Acordeon" 
        value={getPerc(stats.teclas, stats.musicos)} 
        color="from-slate-400 to-slate-500 border-b border-slate-300" 
        racional={`${stats.teclas}/${stats.musicos}`} 
      />

      {/* 🎹 SEÇÃO DE ORGANISTAS (CALCULA O PESO DENTRO DA ORQUESTRA TOTAL DE FILEIRA) */}
      <ProgressBar 
        label="Organistas" 
        value={getPerc(stats.organistas, stats.orquestra)} 
        color="from-slate-400 to-slate-500 border-b border-slate-300" 
        racional={`${stats.organistas}/${stats.orquestra}`} 
      />

      {/* 👥 SEÇÃO DO CORAL (DIVISOR DISCRETO COM PROPORÇÃO ABSOLUTA E VOZES EM GRID SIMÉTRICO) */}
      <div className="pt-4 mt-5 border-t border-slate-200/60 space-y-3.5"> 
        <ProgressBar 
          label="Coral" 
          value={getPerc(stats.irmandade, stats.geral)} 
          color="from-indigo-600 to-indigo-700 border-b border-indigo-500" 
          racional={`${stats.irmandade}/${stats.geral}`} 
        />
        
        {/* Grid simétrico equilibrado de 2 colunas para as vozes masculinas e femininas */}
        <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-slate-200/70 ml-1 bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200/30"> 
          <ProgressBar 
            label="Irmãos" 
            value={getPerc(stats.irmaos, stats.irmandade)} 
            isSub 
            color="from-blue-400 to-blue-500 border-b border-blue-300" 
            racional={`${stats.irmaos}/${stats.irmandade}`} 
          />
          
          <ProgressBar 
            label="Irmãs" 
            value={getPerc(stats.irmas, stats.irmandade)} 
            isSub 
            color="from-pink-400 to-pink-500 border-b border-pink-300" 
            racional={`${stats.irmas}/${stats.irmandade}`} 
          />
        </div>
      </div>

    </div>
  );
};

export default ScreenEquilibrio;