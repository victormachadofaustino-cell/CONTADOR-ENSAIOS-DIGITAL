import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Music, Star, 
  Share2, Activity, PieChart, 
  CheckCircle2, Info, ShieldCheck, Users, FileText, Briefcase
} from 'lucide-react';
import { pdfEventService } from '../../services/pdfEventService';
// Importação do Cérebro de Autenticação v2.1
import { useAuth } from '../../context/AuthContext';

const DashEventPage = ({ counts, ataData, isAdmin }) => {
  // EXTRAÇÃO DE PODERES: Identifica o nível do usuário via accessLevel
  const { userData } = useAuth();
  const level = userData?.accessLevel;
  
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isGemLocal = isComissao || level === 'regional_cidade' || level === 'gem_local';
  const isBasico = level === 'basico';

  const stats = useMemo(() => {
    const totals = {
      geral: 0, orquestra: 0, musicos: 0, organistas: 0, irmandade: 0, 
      irmaos: 0, irmas: 0, hinos: 0, visitas_total: 0, ministerio_oficio: 0,
      cordas: 0, madeiras: 0, metais: 0, saxofones: 0, teclas: 0,
      encRegional: 0, encLocal: 0, examinadoras: 0
    };

    if (counts) {
      Object.entries(counts).forEach(([id, data]) => {
        if (id.startsWith('meta_')) return;
        const valTotal = parseInt(data.total) || 0;
        const valIrmaos = parseInt(data.irmaos) || 0;
        const valIrmas = parseInt(data.irmas) || 0;
        const section = (data.section || "GERAL").toUpperCase();
        const saneId = id.toLowerCase();

        // 1. LÓGICA DE SOMA DO CORAL (ACEITA PADRÃO ANTIGO E NOVO)
        if (section === 'CORAL' || section === 'IRMANDADE' || saneId === 'coral' || saneId === 'irmandade') {
          // Prioriza contagem detalhada para evitar duplicidade com valTotal
          if (valIrmaos > 0 || valIrmas > 0) {
            totals.irmaos += valIrmaos;
            totals.irmas += valIrmas;
          } else {
            totals.irmaos += valTotal; // Fallback para quando só preencheram o total simples
          }
        } 
        // 2. LÓGICA DE ORGANISTAS
        else if (section === 'ORGANISTAS' || saneId === 'orgao' || saneId === 'org') {
          totals.organistas += valTotal;
        } 
        // 3. LÓGICA DE ORQUESTRA (MÚSICOS)
        else {
          totals.musicos += valTotal;
          
          // Distribuição por Naipes para o Gráfico de Equilíbrio
          if (section === 'CORDAS' || ['vln', 'vla', 'vcl', 'violino', 'viola', 'violoncelo'].includes(saneId)) {
            totals.cordas += valTotal;
          } 
          else if (section.includes('SAX')) {
            totals.saxofones += valTotal;
          }
          else if (section.includes('MADEIRA') || ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'fagote', 'claronealto', 'claronebaixo', 'corneingles'].includes(saneId)) {
            totals.madeiras += valTotal;
          }
          else if (section.includes('METAI') || ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufonio', 'tuba', 'flugelhorn'].includes(saneId)) {
            totals.metais += valTotal;
          }
          else if (section === 'TECLAS' || saneId === 'acordeon' || saneId === 'acd') {
            totals.teclas += valTotal;
          }
        }
      });
    }

    totals.irmandade = totals.irmaos + totals.irmas;
    totals.orquestra = totals.musicos + totals.organistas;
    totals.geral = totals.orquestra + totals.irmandade;

    const liderança = ['Encarregado Regional', 'Encarregado Local', 'Examinadora', 'Examinadoras'];
    const oficio = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM'];
    
    const processarPessoas = (lista, isVisitante = false) => {
      if (!lista || !Array.isArray(lista)) return;
      lista.forEach(p => {
        const cargo = (p.min || p.role || "");
        if (isVisitante) totals.visitas_total++;
        if (liderança.includes(cargo)) {
          if (cargo === 'Encarregado Regional') totals.encRegional++;
          if (cargo === 'Encarregado Local') totals.encLocal++;
          if (cargo.includes('Examinadora')) totals.examinadoras++;
        } else if (oficio.includes(cargo)) {
          totals.ministerio_oficio++;
        }
      });
    };
    processarPessoas(ataData?.visitantes, true);
    processarPessoas(ataData?.presencaLocalFull, false);

    if (ataData?.partes) {
      totals.hinos = ataData.partes.reduce((acc, p) => 
        acc + (p.hinos?.filter(h => h && h.trim() !== '').length || 0), 0);
    }
    return totals;
  }, [counts, ataData]);

  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
  
  const canExport = isGemLocal;

  const handleShareLanche = async () => {
    const dataEnsaio = ataData?.date ? new Date(ataData.date + 'T12:00:00').toLocaleDateString() : new Date().toLocaleDateString();
    const msg = `*Serviço de Ensaio Local* - ${dataEnsaio} 🎵\n${userData?.comum}\n\n_*Resumo da Contagem para Alimentação:*_ 🍽️\n\nTotal Geral: ${stats.geral} ✅\n\n• Orquestra: ${stats.orquestra} 🎶\n      • _Músicos ${stats.musicos} + Organistas ${stats.organistas}_\n• Irmandade: ${stats.irmandade} 🗣️\n\nDeus abençoe grandemente. 🙏`;
    
    if (navigator.share) await navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); toast.success("Resumo Alimentação Copiado!"); }
  };

  const handleShareEstatistico = async () => {
    const dataEnsaio = ataData?.date ? new Date(ataData.date + 'T12:00:00').toLocaleDateString() : new Date().toLocaleDateString();
    const msg = `*Serviço de Ensaio Local* - ${dataEnsaio} 🎵\n${userData?.comum} 📍\n\n_*Resumo Estatístico:*_ 📊\n\n• Músicos: ${stats.musicos}\n• Organistas: ${stats.organistas}\n• Irmandade (Coral): ${stats.irmandade}\n\n*Total Geral: ${stats.geral}*\n\n• _Encarregados Regionais: ${stats.encRegional}_\n• _Encarregados Locais: ${stats.encLocal}_\n• _Examinadoras: ${stats.examinadoras}_\n• _Ministério: ${stats.ministerio_oficio}_\n\nDeus abençoe grandemente!`;
    
    if (navigator.share) await navigator.share({ text: msg });
    else { navigator.clipboard.writeText(msg); toast.success("Resumo Estatístico Copiado!"); }
  };

  return (
    <div className="space-y-4 pb-44 px-4 pt-6 max-w-md mx-auto animate-premium bg-[#F1F5F9] text-left">
      
      <div className="bg-slate-950 p-5 rounded-[2rem] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.3em] mb-0.5 italic">Resumo Alimentação</p>
            <h3 className="text-3xl font-[900] text-white italic tracking-tighter leading-none">
              {stats.geral} <span className="text-[10px] font-black text-slate-500 uppercase ml-1">Presentes</span>
            </h3>
          </div>
          {!isBasico && (
            <button onClick={handleShareLanche} className="bg-white/10 p-2.5 rounded-xl text-emerald-500 active:scale-90 border border-white/5 shadow-inner">
                <Share2 size={18} />
            </button>
          )}
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/5 relative z-10">
          <div>
            <p className="text-[6px] font-black text-slate-500 uppercase italic mb-0.5">Orquestra</p>
            <p className="text-lg font-black text-white italic leading-none">{stats.orquestra}</p>
          </div>
          <div className="border-l border-white/5 pl-6">
            <p className="text-[6px] font-black text-slate-500 uppercase italic mb-0.5">Coral</p>
            <p className="text-lg font-black text-white italic leading-none">{stats.irmandade}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Músicos" value={stats.musicos} icon={<Music size={12}/>} />
        <StatCard title="Organistas" value={stats.organistas} icon={<PieChart size={12}/>} />
        <StatCard title="Coral" value={stats.irmandade} icon={<Users size={12}/>} />
        <StatCard title="Hinos" value={stats.hinos} icon={<CheckCircle2 size={12}/>} />
        <StatCard title="Encarregados" value={stats.encRegional + stats.encLocal} icon={<ShieldCheck size={12}/>} />
        <StatCard title="Visitas" value={stats.visitas_total} icon={<Star size={12}/>} />
      </div>
      
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Briefcase size={16}/></div>
          <p className="text-[9px] font-black uppercase text-slate-500 italic tracking-widest">Ministério</p>
        </div>
        <p className="text-xl font-black text-slate-950 italic">{stats.ministerio_oficio}</p>
      </div>

      <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
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

      <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[11px] font-black uppercase italic text-slate-950 tracking-tighter">Resumo Estatístico</h3>
          {canExport && (
            <div className="flex gap-2">
              <button onClick={handleShareEstatistico} className="bg-slate-50 p-2.5 rounded-xl text-slate-500 active:scale-90 border border-slate-100 hover:bg-emerald-50 transition-colors">
                <Share2 size={16} />
              </button>
              <button onClick={() => pdfEventService.generateAtaEnsaio(stats, ataData, userData, counts)} className="bg-blue-50 p-2.5 rounded-xl text-blue-600 active:scale-90 border border-blue-100 flex items-center gap-2 hover:bg-blue-100 transition-colors">
                <FileText size={16} />
                <span className="text-[8px] font-black uppercase">Gerar PDF</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <AdminRow label="Músicos" value={stats.musicos} highlight />
          <AdminRow label="Organistas" value={stats.organistas} highlight />
          <AdminRow label="Irmandade (Coral)" value={stats.irmandade} highlight />
          <div className="h-4" />
          <AdminRow label="Encarregados Regionais" value={stats.encRegional} />
          <AdminRow label="Encarregados Locais" value={stats.encLocal} />
          <AdminRow label="Examinadoras" value={stats.examinadoras} />
          <AdminRow label="Ministério" value={stats.ministerio_oficio} />
        </div>
        
        <div className="pt-6 mt-6 border-t-2 border-slate-950 flex justify-between items-end">
          <span className="text-[14px] font-black uppercase italic text-slate-950 tracking-tighter">Total Geral</span>
          <span className="text-5xl font-[900] text-slate-950 tracking-tighter italic leading-none">{stats.geral}</span>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-slate-300">{icon}</span>
      <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] italic leading-none">{title}</p>
    </div>
    <p className="text-2xl font-black text-slate-950 italic tracking-tighter leading-none">{value}</p>
  </div>
);

const ProgressBar = ({ label, value, color, isSub, racional, refVal }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end px-1 leading-none">
      <div className="flex items-center gap-2">
        <span className={`${isSub ? 'text-[8px]' : 'text-[9px]'} font-black uppercase italic text-slate-950`}>
          {label} [{racional}]
        </span>
      </div>
      <span className="text-[9px] font-black text-slate-700 italic">
        {Math.round(value)}%{refVal ? ` / ${refVal}%` : ''}
      </span>
    </div>
    <div className={`w-full ${isSub ? 'h-1.5' : 'h-2.5'} bg-slate-50 rounded-full overflow-hidden border border-slate-100/30 shadow-inner`}>
      <div className={`h-full transition-all duration-1000 ease-out shadow-sm ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const AdminRow = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 leading-none">
    <span className={`text-[9px] font-black uppercase italic tracking-widest ${highlight ? 'text-slate-950' : 'text-slate-400'}`}>{label}</span>
    <span className={`${highlight ? 'text-lg font-black' : 'text-xs font-bold'} italic text-slate-950`}>{value}</span>
  </div>
);

export default DashEventPage;