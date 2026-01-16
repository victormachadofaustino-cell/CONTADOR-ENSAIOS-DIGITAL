import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Music, Star, 
  Share2, Activity, PieChart, 
  CheckCircle2, Info, ShieldCheck, Users, FileText
} from 'lucide-react';
// CORREÇÃO DE CAMINHO: Subindo dois níveis para acessar a pasta services
import { pdfEventService } from '../../services/pdfEventService';

const DashEventPage = ({ counts, ataData, userData, isAdmin }) => {
  // NOTA: No seu log, ataData é o conteúdo do campo 'ata' do documento do evento.
  const stats = useMemo(() => {
    const totals = {
      geral: 0, orquestra: 0, musicos: 0, organistas: 0, irmandade: 0, 
      irmaos: 0, irmas: 0, hinos: 0, visitas: 0, ministerio: 0,
      cordas: 0, madeiras: 0, metais: 0, sax: 0, teclas: 0,
      encRegional: 0, encLocal: 0, examinadoras: 0
    };

    // 1. PROCESSAMENTO DAS CONTAGENS (Cálculo Numérico)
    if (counts) {
      Object.entries(counts).forEach(([id, data]) => {
        if (id.startsWith('meta_')) return;

        const valTotal = parseInt(data.total) || 0;
        const valIrmas = parseInt(data.irmas) || 0;
        const section = (data.section || "").toUpperCase();

        if (section.includes('ORGÃO') || section.includes('ORGAO') || section.includes('ORGANISTA')) {
          totals.organistas += valTotal;
        } 
        else if (section.includes('CORAL') || section.includes('VOZES') || section.includes('IRMANDADE')) {
          totals.irmaos += valTotal;
          totals.irmas += valIrmas;
          totals.irmandade += (valTotal + valIrmas);
        } 
        else {
          totals.musicos += valTotal;
          if (section.includes('CORDAS')) totals.cordas += valTotal;
          else if (section.includes('MADEIRAS')) totals.madeiras += valTotal;
          else if (section.includes('SAX')) totals.sax += valTotal;
          else if (section.includes('METAIS')) totals.metais += valTotal;
          else if (section.includes('TECLAS')) totals.teclas += valTotal;
        }
      });
    }

    totals.orquestra = totals.musicos + totals.organistas;
    totals.geral = totals.orquestra + totals.irmandade;

    // 2. REGRAS DE MINISTÉRIO E VISITAS
    const CARGOS_ESTATISTICOS = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Examinadoras'];
    
    // A. VISITANTES (Vem da lista 'visitantes' dentro da ata)
    if (ataData?.visitantes && Array.isArray(ataData.visitantes)) {
      ataData.visitantes.forEach(v => {
        const cargo = v.min || "";
        if (CARGOS_ESTATISTICOS.includes(cargo)) {
          totals.visitas++;
          if (cargo === 'Encarregado Regional') totals.encRegional++;
          if (cargo === 'Encarregado Local') totals.encLocal++;
          if (cargo.includes('Examinadora')) totals.examinadoras++;
        } else {
          totals.ministerio++;
        }
      });
    }

    // B. MINISTÉRIO LOCAL (Vem da lista 'presencaLocalFull' dentro da ata)
    if (ataData?.presencaLocalFull && Array.isArray(ataData.presencaLocalFull)) {
      ataData.presencaLocalFull.forEach(p => {
        const cargo = p.role || "";
        if (CARGOS_ESTATISTICOS.includes(cargo)) {
          totals.visitas++;
          if (cargo === 'Encarregado Regional') totals.encRegional++;
          if (cargo === 'Encarregado Local') totals.encLocal++;
          if (cargo.includes('Examinadora')) totals.examinadoras++;
        } else {
          totals.ministerio++;
        }
      });
    }

    // 3. CONTAGEM DE HINOS
    if (ataData?.partes && Array.isArray(ataData.partes)) {
      let hTotal = 0;
      ataData.partes.forEach(p => {
        if (p.hinos && Array.isArray(p.hinos)) {
          // Filtra hinos que não estão vazios
          hTotal += p.hinos.filter(h => h && h.trim() !== '').length;
        }
      });
      totals.hinos = hTotal;
    }

    return totals;
  }, [counts, ataData]);

  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";

  // TRAVA DE SEGURANÇA CORRIGIDA: Liberado para Local/GEM se for admin (Secretário)
  const canExport = userData?.isMaster || userData?.escopoRegional || userData?.escopoCidade || (userData?.escopoLocal && isAdmin);

  const handleShareRelatorio = async () => {
    const bairro = userData?.comum || "Localidade";
    const dataEnsaio = ataData?.date ? new Date(ataData.date + 'T12:00:00').toLocaleDateString() : new Date().toLocaleDateString();
    const msg = `Ensaio Local *${bairro}* - ${dataEnsaio} 🎵\n\n*Total Geral:* ${stats.geral} ✅\nOrquestra: ${stats.orquestra} 🎶\nIrmandade: ${stats.irmandade} 🗣️\n\n*Deus abençoe.* 🙏`;

    if (navigator.share) {
      try { await navigator.share({ text: msg }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Copiado para área de transferência!");
    }
  };

  const handleExportPDF = () => {
    if (!canExport) return toast.error("Acesso restrito");
    try {
      pdfEventService.generateAtaEnsaio(stats, ataData, userData, counts);
      toast.success("PDF Gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="space-y-4 pb-44 px-4 pt-6 max-w-md mx-auto animate-premium bg-[#F1F5F9] text-left">
      
      {/* CARD LANCHE COMPACTO */}
      <div className="bg-slate-950 p-5 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-[7px] font-black text-amber-500 uppercase tracking-widest mb-1 italic">Relatório de Lanche</p>
            <h3 className="text-3xl font-[900] text-white italic tracking-tighter leading-none">
              {stats.geral} <span className="text-[10px] font-black text-slate-500 uppercase ml-1">Presentes</span>
            </h3>
          </div>
          
          {/* BOTÕES LIBERADOS PARA SECRETÁRIO/ADMIN (NÍVEL LOCAL/GEM INCLUSO) */}
          {canExport && (
            <div className="flex gap-2">
              <button onClick={handleExportPDF} className="bg-white/10 p-3 rounded-xl text-blue-400 active:scale-90 transition-all border border-white/5">
                <FileText size={20} />
              </button>
              <button onClick={handleShareRelatorio} className="bg-white/10 p-3 rounded-xl text-emerald-500 active:scale-90 transition-all border border-white/5">
                <Share2 size={20} />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/5 relative z-10">
          <div className="flex-1">
            <p className="text-[6px] font-black text-slate-500 uppercase italic mb-1">Orquestra</p>
            <p className="text-lg font-black text-white italic leading-none">{stats.orquestra}</p>
          </div>
          <div className="flex-1 border-l border-white/5 pl-4">
            <p className="text-[6px] font-black text-slate-500 uppercase italic mb-1">Irmandade</p>
            <p className="text-lg font-black text-white italic leading-none">{stats.irmandade}</p>
          </div>
        </div>
      </div>

      {/* BIG NUMBERS */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard title="Músicos" value={stats.musicos} color="blue" icon={<Music size={12}/>} />
        <StatCard title="Organistas" value={stats.organistas} color="purple" icon={<PieChart size={12}/>} />
        <StatCard title="Irmandade" value={stats.irmandade} color="emerald" icon={<Users size={12}/>} />
        <StatCard title="Ministério" value={stats.ministerio} color="indigo" icon={<ShieldCheck size={12}/>} />
        <StatCard title="Visitas" value={stats.visitas} color="orange" icon={<Star size={12}/>} />
        <StatCard title="Hinos" value={stats.hinos} color="blue" icon={<CheckCircle2 size={12}/>} />
      </div>

      {/* EQUILÍBRIO */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-slate-950" size={16} />
          <h3 className="text-[11px] font-[900] text-slate-950 uppercase italic tracking-tighter">Equilíbrio & Distribuição</h3>
        </div>
        
        <ProgressBar label="Cordas" value={getPerc(stats.cordas, stats.musicos)} color="bg-amber-400" racional={`${stats.cordas}/${stats.musicos}`} />
        
        <div className="space-y-3">
          <ProgressBar label="Madeiras" value={getPerc(stats.madeiras + stats.sax, stats.musicos)} color="bg-emerald-500" racional={`${stats.madeiras + stats.sax}/${stats.musicos}`} />
          <div className="pl-4 border-l border-slate-100 ml-1">
            <ProgressBar label="Saxofones" value={getPerc(stats.sax, (stats.madeiras + stats.sax))} isSub color="bg-emerald-200" racional={`${stats.sax}/${stats.madeiras + stats.sax}`} />
          </div>
        </div>
        
        <ProgressBar label="Metais" value={getPerc(stats.metais, stats.musicos)} color="bg-rose-500" racional={`${stats.metais}/${stats.musicos}`} />
        
        <div className="pt-4 border-t border-slate-50 space-y-3">
          <ProgressBar label="Coral (Irmandade)" value={getPerc(stats.irmandade, (stats.musicos + stats.irmandade))} color="bg-blue-600" racional={`${stats.irmandade}/${stats.musicos + stats.irmandade}`} />
          <div className="grid grid-cols-2 gap-4 pl-4 border-l border-slate-100 ml-1">
            <ProgressBar label="Irmãos" value={getPerc(stats.irmaos, stats.irmandade)} isSub color="bg-blue-300" racional={`${stats.irmaos}/${stats.irmandade}`} />
            <ProgressBar label="Irmãs" value={getPerc(stats.irmas, stats.irmandade)} isSub color="bg-pink-300" racional={`${stats.irmas}/${stats.irmandade}`} />
          </div>
        </div>
      </div>

      {/* RESUMO ESTATÍSTICO */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-[11px] font-[900] uppercase italic text-slate-950 mb-4 tracking-tighter">Resumo Estatístico</h3>
        <div className="space-y-1">
          <AdminRow label="Músicos" value={stats.musicos} highlight />
          <AdminRow label="Organistas" value={stats.organistas} highlight />
          <AdminRow label="Coral (Irmandade)" value={stats.irmandade} highlight />
          <div className="h-4" />
          <AdminRow label="Encarregados Regionais" value={stats.encRegional} />
          <AdminRow label="Encarregados Locais" value={stats.encLocal} />
          <AdminRow label="Examinadoras" value={stats.examinadoras} />
          <AdminRow label="Ministério" value={stats.ministerio} />
        </div>
        
        <div className="pt-6 mt-6 border-t-2 border-slate-950 flex justify-between items-end">
          <span className="text-[12px] font-[900] uppercase italic text-slate-950 tracking-tighter leading-none mb-1">TOTAL GERAL</span>
          <span className="text-5xl font-[900] text-slate-950 tracking-tighter italic leading-none">{stats.geral}</span>
        </div>
      </div>
    </div>
  );
};

// COMPONENTES AUXILIARES PRESERVADOS
const StatCard = ({ title, value, color, icon }) => (
  <div className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm flex flex-col items-center">
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-slate-400">{icon}</span>
      <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest italic">{title}</p>
    </div>
    <p className="text-2xl font-[900] text-slate-950 italic tracking-tighter">{value}</p>
  </div>
);

const ProgressBar = ({ label, value, color, isSub, racional }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end px-0.5">
      <div className="flex items-center gap-1.5">
        <span className={`${isSub ? 'text-[8px]' : 'text-[9px]'} font-black uppercase italic tracking-widest text-slate-950`}>{label}</span>
        <span className="text-[7px] text-slate-300 font-bold">[{racional}]</span>
      </div>
      <span className={`${isSub ? 'text-[9px]' : 'text-[10px]'} font-black text-slate-950 italic`}>{value}%</span>
    </div>
    <div className={`w-full ${isSub ? 'h-1' : 'h-2'} bg-slate-100 rounded-full overflow-hidden`}>
      <div className={`h-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const AdminRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0`}>
    <span className={`text-[9px] font-black uppercase italic tracking-widest ${highlight ? 'text-slate-950' : 'text-slate-400'}`}>{label}</span>
    <span className={`${highlight ? 'text-[14px] font-[900]' : 'text-[11px] font-bold'} italic uppercase text-slate-950`}>{value}</span>
  </div>
);

export default DashEventPage;