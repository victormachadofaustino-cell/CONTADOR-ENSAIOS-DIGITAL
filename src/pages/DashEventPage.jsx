import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Music, Star, 
  Send, Share2, Activity, PieChart, 
  CheckCircle2, Info, ShieldCheck
} from 'lucide-react';

const DashEventPage = ({ counts, ataData, userData, isAdmin }) => {
  const stats = useMemo(() => {
    const totals = {
      geral: 0, orquestra: 0, organistas: 0, irmandade: 0, visitas: 0, hinos: 0,
      cordas: 0, madeiras: 0, metais: 0, sax: 0, teclas: 0,
      encRegional: 0, encLocal: 0, examinadoras: 0, ministerio: 0, encarregadosTotal: 0
    };

    // 1. PROCESSAMENTO DE INSTRUMENTOS (Lógica por Naipe Direto do Banco)
    Object.entries(counts || {}).forEach(([id, data]) => {
      const val = parseInt(data.total) || 0;
      const section = (data.section || "").toLowerCase();

      if (section.includes('orgão') || section.includes('orgao') || section.includes('organista')) {
        totals.organistas += val;
      } 
      else if (section.includes('coral') || section.includes('vozes')) {
        totals.irmandade += val;
      } 
      else {
        totals.orquestra += val;
        if (section.includes('cordas')) totals.cordas += val;
        else if (section.includes('madeiras')) totals.madeiras += val;
        else if (section.includes('sax')) totals.sax += val;
        else if (section.includes('metais')) totals.metais += val;
        else if (section.includes('teclas')) totals.teclas += val;
      }
    });

    // 2. REGRAS DE NEGÓCIO (Cargos Alvos Conforme Regra de Negócio)
    const CARGOS_MIN_ALVO = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM'];
    const CARGOS_ENC_REGIONAL = ['Encarregado Regional'];
    const CARGOS_ENC_LOCAL = ['Encarregado Local'];
    const CARGOS_EXAMINADORA = ['Examinadora', 'Examinadoras'];
    
    const nomesUnicos = new Set();

    // Processamento de Visitantes (Ata)
    (ataData?.visitantes || []).forEach(v => {
      const cargo = v.min || "";
      const nomeL = (v.nome || "").trim().toLowerCase();
      
      totals.visitas++;

      if (CARGOS_MIN_ALVO.includes(cargo)) totals.ministerio++;
      if (CARGOS_ENC_REGIONAL.includes(cargo)) totals.encRegional++;
      if (CARGOS_ENC_LOCAL.includes(cargo)) totals.encLocal++;
      if (CARGOS_EXAMINADORA.includes(cargo)) totals.examinadoras++;
      
      if (nomeL) nomesUnicos.add(nomeL);
    });

    // Processamento de Ministério Local (Campo presencaLocalFull com cargo)
    (ataData?.presencaLocalFull || []).forEach(p => {
      const nomeL = (p.nome || "").trim().toLowerCase();
      const cargo = p.role || "";

      if (nomeL && !nomesUnicos.has(nomeL)) {
        if (CARGOS_MIN_ALVO.includes(cargo)) totals.ministerio++;
        if (CARGOS_ENC_REGIONAL.includes(cargo)) totals.encRegional++;
        if (CARGOS_ENC_LOCAL.includes(cargo)) totals.encLocal++;
        if (CARGOS_EXAMINADORA.includes(cargo)) totals.examinadoras++;
        nomesUnicos.add(nomeL);
      }
    });

    totals.encarregadosTotal = totals.encRegional + totals.encLocal;
    totals.geral = totals.orquestra + totals.organistas + totals.irmandade;

    let contagemHinos = 0;
    if (ataData?.partes) {
      ataData.partes.forEach(p => {
        if (p.hinos) contagemHinos += p.hinos.filter(h => h && h.trim() !== '').length;
      });
    }
    totals.hinos = contagemHinos;

    return totals;
  }, [counts, ataData]);

  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";

  const handleCopyCozinha = () => {
    const bairro = userData?.comum || "Ponte São João";
    const dataEnsaio = ataData?.date ? ataData.date.split('T')[0].split('-').reverse().join('/') : new Date().toLocaleDateString();
    const msg = `Ensaio Local *${bairro}* - ${dataEnsaio} 🎵🎵\n\n_Informações para o lanche:_🍽️\n\n*Total Geral:* ${stats.geral} ✅\nOrquestra: ${stats.orquestra + stats.organistas} 🎶\nIrmandade: ${stats.irmandade} 🗣️\n\n*Deus abençoe grandemente.* 🙏`;
    navigator.clipboard.writeText(msg);
    toast.success("Relatório da Cozinha Copiado!");
  };

  return (
    <div className="space-y-6 pb-44 px-4 pt-6 max-w-md mx-auto animate-premium bg-[#F1F5F9]">
      
      {/* CARD RELATÓRIO COZINHA - DESIGN PREMIUM SLATE */}
      <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
           <Activity size={120} strokeWidth={4} />
        </div>

        <div className="flex justify-between items-start relative z-10">
          <div className="text-left leading-none">
            <div className="flex items-center gap-1.5 mb-2">
               <Info size={10} className="text-amber-500" />
               <p className="text-[8px] font-black text-amber-500 uppercase tracking-[0.3em] italic leading-none">Relatório de Lanche</p>
            </div>
            <h3 className="text-4xl font-[900] text-white italic leading-none tracking-tighter">
              {stats.geral} <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Total</span>
            </h3>
          </div>
          {isAdmin && (
            <button onClick={handleCopyCozinha} className="bg-white/10 p-4 rounded-2xl text-emerald-500 shadow-sm border border-white/5 active:scale-90 transition-all">
              <Share2 size={24} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="flex gap-6 mt-8 pt-6 border-t border-white/5 relative z-10">
          <div className="flex-1">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2 italic">Músicos + Org</p>
            <p className="text-xl font-[900] text-white italic tracking-tighter leading-none">{stats.orquestra + stats.organistas}</p>
          </div>
          <div className="w-[1px] bg-white/5 h-8 mt-2" />
          <div className="flex-1">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2 italic">Irmandade</p>
            <p className="text-xl font-[900] text-white italic tracking-tighter leading-none">{stats.irmandade}</p>
          </div>
        </div>
      </div>

      {/* BIG NUMBERS GRID - CARDS REDONDO PREMIUM */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Músicos" value={stats.orquestra} color="blue" icon={<Music size={14}/>} />
        <StatCard title="Organistas" value={stats.organistas} color="purple" icon={<PieChart size={14}/>} />
        <StatCard title="Ministério" value={stats.ministerio} color="indigo" icon={<ShieldCheck size={14}/>} />
        <StatCard title="Visitas" value={stats.visitas} color="orange" icon={<Star size={14}/>} />
        <div className="col-span-2">
           <StatCard 
             title="Hinos Ensaiados" 
             value={stats.hinos} 
             color="blue" 
             full 
             icon={<CheckCircle2 size={16} className="text-blue-500"/>} 
           />
        </div>
      </div>

      {/* MONITOR DE EQUILÍBRIO - DESIGN VIBRANTE */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 text-left">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <TrendingUp className="text-slate-950" size={18} />
          <h3 className="text-[12px] font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">Equilíbrio da Orquestra</h3>
        </div>
        
        <ProgressBar label="Cordas" value={getPerc(stats.cordas, stats.orquestra)} refVal="50%" color="bg-amber-400" racional={`${stats.cordas}/${stats.orquestra}`} />
        
        <div className="space-y-4">
          <ProgressBar label="Madeiras" value={getPerc(stats.madeiras + stats.sax, stats.orquestra)} refVal="25%" color="bg-emerald-500" racional={`${stats.madeiras + stats.sax}/${stats.orquestra}`} />
          <div className="pl-6 border-l-2 border-slate-50 ml-2 py-1">
            <ProgressBar label="Saxofones" value={getPerc(stats.sax, (stats.madeiras + stats.sax))} isSub color="bg-emerald-200" racional={`${stats.sax}/${stats.madeiras + stats.sax}`} />
          </div>
        </div>
        
        <ProgressBar label="Metais" value={getPerc(stats.metais, stats.orquestra)} refVal="25%" color="bg-rose-500" racional={`${stats.metais}/${stats.orquestra}`} />
        
        <div className="pt-4 mt-4 border-t border-slate-50">
           <ProgressBar label="Coral (Irmandade)" value={getPerc(stats.irmandade, stats.geral)} color="bg-blue-600" racional={`${stats.irmandade}/${stats.geral}`} />
        </div>
      </div>

      {/* RESUMO ESTATÍSTICO - ESTILO LISTA PREMIUM */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-3">
        <h3 className="text-sm font-[900] uppercase italic text-slate-950 border-b border-slate-50 pb-4 mb-4 tracking-tighter">Resumo Estatístico</h3>
        <AdminRow label="Encarregados Regionais" value={stats.encRegional} />
        <AdminRow label="Encarregados Locais" value={stats.encLocal} />
        <AdminRow label="Examinadoras" value={stats.examinadoras} />
        <AdminRow label="Ministério Presente" value={stats.ministerio} />
        <AdminRow label="Hinos Ensaiados" value={stats.hinos} />
        
        <div className="pt-8 mt-6 border-t-2 border-slate-950 flex justify-between items-end">
          <span className="text-[14px] font-[900] uppercase italic text-slate-950 tracking-tighter mb-1 leading-none">TOTAL GERAL</span>
          <span className="text-6xl font-[900] text-slate-950 tracking-tighter italic leading-none">{stats.geral}</span>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, icon, full }) => (
  <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center group transition-all active:scale-95 ${full ? 'flex-row justify-between' : ''}`}>
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-2">
         <span className="opacity-40">{icon}</span>
         <p className={`text-[8px] font-black uppercase text-${color}-900 tracking-[0.3em] italic leading-none`}>{title}</p>
      </div>
      <p className="text-3xl font-[900] text-slate-950 italic leading-none tracking-tighter group-hover:text-blue-600 duration-300">{value}</p>
    </div>
  </div>
);

const ProgressBar = ({ label, value, refVal, color, isSub, racional }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end px-1 leading-none">
      <div className="text-left">
        <span className={`${isSub ? 'text-[8px]' : 'text-[10px]'} font-black uppercase italic tracking-widest text-slate-950 leading-none`}>{label}</span>
        <span className="text-[7px] text-slate-400 ml-2 font-bold leading-none">[{racional}]</span>
      </div>
      <div className="text-right leading-none">
        <span className="text-[11px] font-[900] text-slate-950 italic leading-none">{value}%</span>
        {refVal && <span className="text-[8px] text-slate-300 ml-1 font-black leading-none">/ {refVal}</span>}
      </div>
    </div>
    <div className={`w-full ${isSub ? 'h-1.5' : 'h-2.5'} bg-slate-100 rounded-full overflow-hidden`}>
      <div className={`h-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const AdminRow = ({ label, value, color = "text-slate-950" }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 leading-none">
    <span className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest leading-none">{label}</span>
    <span className={`text-[12px] font-[900] italic uppercase leading-none ${color}`}>{value}</span>
  </div>
);

export default DashEventPage;