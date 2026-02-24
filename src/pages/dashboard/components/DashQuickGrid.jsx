import React from 'react';
import { Music, PieChart, Activity, Users, ShieldCheck, Briefcase, TrendingUp, Star } from 'lucide-react';

/**
 * DashQuickGrid v1.2
 * Grade de estatísticas rápidas com suporte a subtotal de orquestra e nomenclaturas v8.9.1.
 */
const DashQuickGrid = ({ stats }) => {
  const GridCard = ({ title, value, icon, color, subValue1, subLabel1, subValue2, subLabel2, isDark, isSubtotal, hideSubLabels }) => (
    <div className={`
      ${isDark ? 'bg-slate-900 border-white/10 shadow-xl' : isSubtotal ? 'bg-slate-200 border-slate-300 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} 
      px-5 py-2 rounded-[2rem] border flex items-center min-h-[84px] overflow-hidden
    `}>
      <div className="w-[35%] flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white text-slate-950' : isSubtotal ? 'bg-slate-400 text-white' : `bg-${color}-50 text-${color}-600`}`}>
          {icon}
        </div>
        <div className="leading-none text-left">
          <h3 className={`text-[11px] font-[1000] uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          <p className={`text-[7px] font-black uppercase tracking-widest mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            {isDark ? 'Final' : 'Subtotal'}
          </p>
        </div>
      </div>
      <div className="w-[30%] text-center">
        <span className={`text-5xl font-[1000] italic leading-none tracking-tighter ${isDark ? 'text-white' : 'text-slate-950'}`}>{value}</span>
      </div>
      <div className="w-[35%] flex gap-2 justify-end h-full py-1">
        {subValue1 !== undefined && (
          <div className={`${isDark ? 'bg-white/10' : isSubtotal ? 'bg-white/60 border-slate-300' : `bg-${color}-50/50 border-${color}-100/50`} px-3 py-2 rounded-xl flex flex-col items-center justify-center border min-w-[55px]`}>
            <span className={`text-lg font-[1000] italic leading-none ${isDark || isSubtotal ? 'text-slate-900' : `text-${color}-700`}`}>{subValue1}</span>
            {!hideSubLabels && <span className={`text-[7px] font-black uppercase tracking-tighter ${isDark ? 'text-white/40' : isSubtotal ? 'text-slate-500' : `text-${color}-400`}`}>{subLabel1}</span>}
          </div>
        )}
        {subValue2 !== undefined && (
          <div className={`${isDark ? 'bg-white/10' : isSubtotal ? 'bg-white/60 border-slate-300' : 'bg-slate-50 border-slate-100'} px-3 py-2 rounded-xl flex flex-col items-center justify-center border min-w-[55px]`}>
            <span className={`text-lg font-[1000] italic leading-none ${isDark || isSubtotal ? 'text-slate-900' : 'text-slate-700'}`}>{subValue2}</span>
            {!hideSubLabels && <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{subLabel2}</span>}
          </div>
        )}
        {/* Espaçador visual para cards sem sub-valores */}
        {subValue1 === undefined && isDark && (
          <div className="pr-2 text-white/20">
            <Activity size={32} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* GRADE PRINCIPAL */}
      <GridCard title="Músicos" value={stats.musicos} icon={<Music size={20} strokeWidth={3}/>} color="blue" subValue1={stats.musicosComum} subLabel1="Casa" subValue2={stats.musicosVisita} subLabel2="Visita" />
      
      <GridCard title="Coral" value={stats.irmandade} icon={<Users size={20} strokeWidth={3}/>} color="pink" subValue1={stats.irmaos} subLabel1="Irmãos" subValue2={stats.irmas} subLabel2="Irmãs" />

      {/* RESGATE: SUBTOTAL ORQUESTRA (Entre Coral e Organista) */}
      <GridCard title="Orquestra" value={stats.orquestra} icon={<Activity size={20} strokeWidth={3}/>} isSubtotal subValue1={stats.orquestraTotalComum} subValue2={stats.orquestraTotalVisita} hideSubLabels />

      <GridCard title="Organistas" value={stats.organistas} icon={<PieChart size={20} strokeWidth={3}/>} color="amber" subValue1={stats.organistasComum} subLabel1="Casa" subValue2={stats.organistasVisita} subLabel2="Visita" />
      
      <GridCard title="Geral" value={stats.geral} icon={<TrendingUp size={20} strokeWidth={3}/>} isDark />

      {/* BLOCO FINAL: LIMPEZA DE LABELS E NOVAS NOMENCLATURAS */}
      <GridCard title="Encarregados" value={stats.encRegional + stats.encLocal} icon={<ShieldCheck size={20} strokeWidth={3}/>} color="emerald" subValue1={stats.encRegional} subValue2={stats.encLocal} hideSubLabels />
      
      <GridCard title="Examinadoras" value={stats.examinadoras} icon={<Star size={20} strokeWidth={3}/>} color="pink" subValue1={stats.examinadorasComum} subValue2={stats.examinadorasVisita} hideSubLabels />

      <GridCard title="Hinos" value={stats.hinos} icon={<Music size={20} strokeWidth={3}/>} color="amber" hideSubLabels />

      <GridCard title="Ministérios" value={stats.ministerio_oficio} icon={<Briefcase size={20} strokeWidth={3}/>} color="slate" subValue1={stats.ministerioCasa} subValue2={stats.ministerioVisita} hideSubLabels />
    </div>
  );
};

export default DashQuickGrid;