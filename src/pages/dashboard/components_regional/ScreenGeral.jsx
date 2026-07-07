import React from 'react'; // [Funcionamento]: Estrutura núcleo do React para renderização do componente de UI.
import { Music, PieChart, Activity, Users, Briefcase, Globe, ListMusic } from 'lucide-react'; // [Funcionamento]: Ícones mantidos com foco em sobriedade visual.

const ScreenGeral = ({ stats }) => { // [Funcionamento]: Recebe o cache de BI processado de custo zero pelo Maestro.
  return (
    <div className="space-y-4 animate-in fade-in duration-300 text-left font-sans">
      
      {/* 📖 BLOCO DE ABERTURA: HINOLOGIA DA ATA */}
      <div className="px-5 py-3 rounded-[1.8rem] shadow-sm border border-slate-200/60 bg-white flex items-center min-h-[76px]">
        <div className="w-[45%] flex items-center gap-3 min-w-0">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 shadow-xs">
            <ListMusic size={18} strokeWidth={2.5} />
          </div>
          <div className="leading-none min-w-0 flex-1">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">Total de Hinos</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Ensaiados</p>
          </div>
        </div>
        <div className="w-[55%] text-right pr-2">
          <span className="text-4xl font-[1000] italic text-slate-950 tracking-tighter leading-none">
            {stats.hinos}
          </span>
        </div>
      </div>

      {/* 🎵 BLOCO CONSOLIDADO: CORPO MUSICAL (ORQUESTRA) */}
      <div className="bg-white rounded-[2.2rem] border border-slate-200/70 p-2 space-y-1.5 shadow-xs">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-4 pt-1.5 italic">
          Distribuição da Orquestra
        </p>

        {/* Músicos */}
        <div className="px-4 py-2 flex items-center min-h-[64px] bg-slate-50/50 rounded-2xl">
          <div className="w-[45%] flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white text-slate-600 rounded-xl shrink-0 shadow-xs border border-slate-100">
              <Music size={16} strokeWidth={2.5} />
            </div>
            <div className="leading-none min-w-0 flex-1">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">Músicos</h4>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Instrumentos</p>
            </div>
          </div>
          <div className="w-[55%] text-right pr-2">
            <span className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">
              {stats.musicos}
            </span>
          </div>
        </div>

        {/* Organistas */}
        <div className="px-4 py-2 flex items-center min-h-[64px] bg-slate-50/50 rounded-2xl">
          <div className="w-[45%] flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white text-slate-600 rounded-xl shrink-0 shadow-xs border border-slate-100">
              <PieChart size={16} strokeWidth={2.5} />
            </div>
            <div className="leading-none min-w-0 flex-1">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">Organistas</h4>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Órgão</p>
            </div>
          </div>
          <div className="w-[55%] text-right pr-2">
            <span className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">
              {stats.organistas}
            </span>
          </div>
        </div>

        {/* Total Orquestra (Destaque do Bloco) */}
        <div className="px-4 py-2.5 flex items-center min-h-[68px] bg-blue-50/40 rounded-[1.3rem] border border-blue-100/50">
          <div className="w-[45%] flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white text-blue-600 rounded-xl shrink-0 shadow-sm border border-blue-100/30">
              <Activity size={16} strokeWidth={3} />
            </div>
            <div className="leading-none min-w-0 flex-1">
              <h4 className="text-[11px] font-black text-blue-950 uppercase tracking-tight truncate">Orquestra</h4>
              <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mt-0.5 italic">Ensaio Musical</p>
            </div>
          </div>
          <div className="w-[55%] text-right pr-2">
            <span className="text-3xl font-[1000] italic text-blue-950 tracking-tighter leading-none">
              {stats.orquestra}
            </span>
          </div>
        </div>
      </div>

      {/* 👥 BLOCO CONSOLIDADO: CONGREGAÇÃO E MINISTÉRIO */}
      <div className="bg-white rounded-[2.2rem] border border-slate-200/70 p-2 space-y-1.5 shadow-xs">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-4 pt-1.5 italic">
          Resumo
        </p>

        {/* Total Irmandade */}
        <div className="px-4 py-2 flex items-center min-h-[64px] bg-slate-50/50 rounded-2xl">
          <div className="w-[45%] flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white text-slate-500 rounded-xl shrink-0 shadow-xs border border-slate-100">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <div className="leading-none min-w-0 flex-1">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">Irmandade</h4>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Estimado</p>
            </div>
          </div>
          <div className="w-[55%] text-right pr-2">
            <span className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">
              ≈ {stats.irmandade}
            </span>
          </div>
        </div>

        {/* Total Ministério */}
        <div className="px-4 py-2 flex items-center min-h-[64px] bg-slate-50/50 rounded-2xl">
          <div className="w-[45%] flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white text-slate-600 rounded-xl shrink-0 shadow-xs border border-slate-100">
              <Briefcase size={16} strokeWidth={2.5} />
            </div>
            <div className="leading-none min-w-0 flex-1">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">Ministério</h4>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Espiritual</p>
            </div>
          </div>
          <div className="w-[55%] text-right pr-2">
            <span className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">
              {stats.ministerio_total + stats.encRegional}
            </span>
          </div>
        </div>

        {/* Total Geral (O Grande Resumo Solene) */}
        <div className="px-4 py-3 flex items-center min-h-[72px] bg-amber-500/5 rounded-[1.3rem] border border-amber-500/10 shadow-xs">
          <div className="w-[45%] flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-md">
              <Globe size={16} strokeWidth={2.5} />
            </div>
            <div className="leading-none min-w-0 flex-1">
              <h4 className="text-[12px] font-black text-slate-950 uppercase tracking-tight truncate">Total Geral</h4>
              <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest mt-0.5 italic">Total de Presentes</p>
            </div>
          </div>
          <div className="w-[55%] text-right pr-2">
            <span className="text-4xl font-[1000] italic text-slate-950 tracking-tighter leading-none">
              {stats.geral}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ScreenGeral;