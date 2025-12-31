import React, { useMemo } from 'react';
import toast from 'react-hot-toast';

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
    const bairro = userData?.comum || "Comum";
    const dataEnsaio = ataData?.date ? ataData.date.split('T')[0].split('-').reverse().join('/') : new Date().toLocaleDateString();
    const msg = `Ensaio Local *${bairro}* - ${dataEnsaio} 🎵🎵\n\n_Informações para o lanche:_🍽️\n\n*Total Geral:* ${stats.geral} ✅\nOrquestra: ${stats.orquestra + stats.organistas} 🎶\nIrmandade: ${stats.irmandade} 🗣️\n\n*Deus abençoe grandemente.* 🙏`;
    navigator.clipboard.writeText(msg);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6 pb-40 text-left animate-in fade-in duration-500 px-2 font-sans bg-gray-50 pt-4">
      
      {/* CARD LANCHES (BOTÃO COPIAR RESTRITO A ADMIN) */}
      <div className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="text-left leading-none">
            <p className="text-[10px] font-black text-orange-900 uppercase italic mb-2 tracking-widest">Informações para Lanche</p>
            <h3 className="text-3xl font-black text-gray-900 italic">{stats.geral} <small className="text-xs text-gray-500 uppercase not-italic font-bold">Total</small></h3>
          </div>
          {isAdmin && (
            <button onClick={handleCopyCozinha} className="bg-green-700 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all text-xl">📲</button>
          )}
        </div>
        <div className="flex gap-4 border-t border-orange-200 pt-4">
          <div className="leading-none text-gray-900 font-black">
            <p className="text-[9px] text-gray-700 uppercase tracking-tighter">Orquestra</p>
            <p className="text-lg">{stats.orquestra + stats.organistas}</p>
          </div>
          <div className="leading-none border-l border-orange-200 pl-4 text-gray-900 font-black">
            <p className="text-[9px] text-gray-700 uppercase tracking-tighter">Irmandade</p>
            <p className="text-lg">{stats.irmandade}</p>
          </div>
        </div>
      </div>

      {/* BIG NUMBERS */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Geral" value={stats.geral} color="blue" />
        <StatCard title="Músicos" value={stats.orquestra} color="emerald" />
        <StatCard title="Organistas" value={stats.organistas} color="purple" />
        <StatCard title="Ministério" value={stats.ministerio} color="indigo" />
        <StatCard title="Visitas" value={stats.visitas} color="orange" />
        <StatCard title="Encarregados" value={stats.encarregadosTotal} color="orange" />
        <div className="col-span-2">
           <StatCard title="Hinos Ensaiados" value={stats.hinos} color="blue" />
        </div>
      </div>

      {/* MONITOR DE EQUILÍBRIO */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-[11px] font-black text-gray-900 uppercase italic border-b pb-4 text-center tracking-widest">Equilíbrio da Orquestra</h3>
        <ProgressBar label="Cordas" value={getPerc(stats.cordas, stats.orquestra)} refVal="50%" color="bg-amber-400" racional={`${stats.cordas}/${stats.orquestra}`} />
        <div className="space-y-3">
          <ProgressBar label="Madeiras" value={getPerc(stats.madeiras + stats.sax, stats.orquestra)} refVal="25%" color="bg-emerald-600" racional={`${stats.madeiras + stats.sax}/${stats.orquestra}`} />
          <div className="pl-6 border-l-2 border-gray-100 ml-2">
            <ProgressBar label="Saxofones" value={getPerc(stats.sax, (stats.madeiras + stats.sax))} isSub color="bg-emerald-200" racional={`${stats.sax}/${stats.madeiras + stats.sax}`} />
          </div>
        </div>
        <ProgressBar label="Metais" value={getPerc(stats.metais, stats.orquestra)} refVal="25%" color="bg-rose-600" racional={`${stats.metais}/${stats.orquestra}`} />
        <hr className="border-gray-100" />
        <ProgressBar label="Coral (Irmandade)" value={getPerc(stats.irmandade, stats.geral)} color="bg-sky-500" racional={`${stats.irmandade}/${stats.geral}`} />
      </div>

      {/* RESUMO ESTATÍSTICO */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-200 shadow-sm space-y-4 text-gray-900">
        <h3 className="text-base font-black uppercase italic border-b pb-4 leading-none">Resumo Estatístico</h3>
        <AdminRow label="Encarregados Regionais" value={stats.encRegional} />
        <AdminRow label="Encarregados Locais" value={stats.encLocal} />
        <AdminRow label="Examinadoras" value={stats.examinadoras} />
        <AdminRow label="Ministério Presente" value={stats.ministerio} />
        <AdminRow label="Hinos Ensaiados" value={stats.hinos} />
        <hr className="my-2 border-gray-100" />
        <AdminRow label="Músicos" value={stats.orquestra} color="text-emerald-800" />
        <AdminRow label="Organistas" value={stats.organistas} color="text-purple-800" />
        <AdminRow label="Irmandade (Coral)" value={stats.irmandade} color="text-rose-800" />
        <div className="pt-6 mt-4 border-t-2 border-gray-900 flex justify-between items-center font-black">
          <span className="text-xl uppercase italic">TOTAL GERAL</span>
          <span className="text-5xl tracking-tighter">{stats.geral}</span>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className="bg-white p-5 rounded-[2.2rem] border border-gray-200 shadow-sm flex flex-col items-center">
    <p className={`text-[10px] font-black uppercase text-${color}-900 italic mb-1 tracking-widest leading-none`}>{title}</p>
    <p className="text-3xl font-black text-gray-900 italic leading-none">{value}</p>
  </div>
);

const ProgressBar = ({ label, value, refVal, color, isSub, racional }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end px-1 leading-none text-gray-900 font-black">
      <div className="flex flex-col text-left">
        <span className={`${isSub ? 'text-[10px]' : 'text-[11px]'} uppercase italic tracking-wide`}>{label}</span>
        <span className="text-[8px] text-gray-500 mt-1 uppercase">[{racional}]</span>
      </div>
      <div className="text-right leading-none">
        <span className="text-[11px] font-black italic">{value}%</span>
        {refVal && <span className="text-[9px] text-gray-400 ml-1 font-bold">/ {refVal}</span>}
      </div>
    </div>
    <div className={`w-full ${isSub ? 'h-2' : 'h-3'} bg-gray-100 rounded-full overflow-hidden border border-gray-100`}>
      <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const AdminRow = ({ label, value, color = "text-gray-900" }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 leading-none">
    <span className="text-[11px] font-black uppercase italic text-gray-800">{label}:</span>
    <span className={`text-sm font-black italic ${color}`}>{value}</span>
  </div>
);

export default DashEventPage;