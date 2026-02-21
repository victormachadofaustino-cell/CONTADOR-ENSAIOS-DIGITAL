import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Music, Star, 
  Share2, Activity, PieChart, 
  CheckCircle2, ShieldCheck, Users, FileText, Briefcase, MapPin, Target, Landmark, Globe, UserCheck
} from 'lucide-react';
import { pdfEventRegionalService } from '../../services/pdfEventRegionalService';
import { whatsappService } from '../../services/whatsappService';
import { useAuth } from '../../context/AuthContext';
import { db, doc, getDoc } from '../../config/firebase';

const DashEventRegionalPage = ({ counts, ataData, isAdmin, eventId }) => {
  const { userData } = useAuth();

  // CÁLCULO DE STATS - Racional de Big Numbers e Ata
  const stats = useMemo(() => {
    const totals = {
      geral: 0, orquestra: 0, musicos: 0, organistas: 0, irmandade: 0, 
      irmaos: 0, irmas: 0, hinos: 0, visitas_total: 0, ministerio_total: 0,
      cordas: 0, madeiras: 0, metais: 0, saxofones: 0, teclas: 0,
      encRegional: 0, encLocal: 0, examinadoras: 0,
      ancianosCasa: 0, ancianosVisitas: 0,
      diaconosCasa: 0, diaconosVisitas: 0,
      coopOficioCasa: 0, coopOficioVisitas: 0,
      coopJovensCasa: 0, coopJovensVisitas: 0,
      encRegionalCasa: 0, encRegionalVisitas: 0,
      encLocalCasa: 0, encLocalVisitas: 0,
      examinadorasCasa: 0, examinadorasVisitas: 0,
      musicosCasa: 0, musicosVisitas: 0,
      organistasCasa: 0, organistasVisitas: 0,
      localidadesUnicas: new Set(), visitasMusicos: 0
    };

    if (counts) {
      Object.entries(counts).forEach(([id, data]) => {
        if (id.startsWith('meta_')) return;
        
        const valTotal = parseInt(data.total) || 0;
        const valComum = parseInt(data.comum) || 0;
        const valIrmaos = parseInt(data.irmaos) || 0;
        const valIrmas = parseInt(data.irmas) || 0;
        
        const effectiveTotal = Math.max(valTotal, (valIrmaos + valIrmas));
        const effectiveComum = valComum;
        const effectiveVisita = Math.max(0, effectiveTotal - valComum);

        const section = (data.section || "GERAL").toUpperCase();
        const saneId = id.toLowerCase();

        if (section === 'CORAL' || section === 'IRMANDADE' || saneId === 'coral' || saneId === 'irmandade') {
          totals.irmaos += valIrmaos || (effectiveTotal - valIrmas);
          totals.irmas += valIrmas;
        } 
        else if (section === 'ORGANISTAS' || saneId === 'orgao' || saneId === 'org') {
          totals.organistas += effectiveTotal;
          totals.organistasCasa += effectiveComum;
          totals.organistasVisitas += effectiveVisita;
        } 
        else {
          totals.musicos += effectiveTotal;
          totals.musicosCasa += effectiveComum;
          totals.musicosVisitas += effectiveVisita;
          
          if (section === 'CORDAS' || ['vln', 'vla', 'vcl', 'violino', 'viola', 'violoncelo'].includes(saneId)) totals.cordas += effectiveTotal;
          else if (section.includes('SAX')) totals.saxofones += effectiveTotal;
          else if (section.includes('MADEIRA') || ['flt', 'clt', 'oboe', 'fgt'].includes(saneId)) totals.madeiras += effectiveTotal;
          else if (section.includes('METAI') || ['tpt', 'tbn', 'trp', 'euf', 'tub'].includes(saneId)) totals.metais += effectiveTotal;
          else if (section === 'TECLAS' || saneId === 'acordeon' || saneId === 'acd') totals.teclas += effectiveTotal;
        }
      });
    }

    totals.irmandade = totals.irmaos + totals.irmas;
    totals.orquestra = totals.musicos + totals.organistas;

    const processarPessoas = (lista, isVisitante = false) => {
      if (!lista || !Array.isArray(lista)) return;
      lista.forEach(p => {
        const cargo = (p.min || p.role || "");
        
        if (cargo === 'Ancião') {
          if (isVisitante) totals.ancianosVisitas++;
          else totals.ancianosCasa++;
        }
        else if (cargo === 'Diácono') {
          if (isVisitante) totals.diaconosVisitas++;
          else totals.diaconosCasa++;
        }
        else if (cargo === 'Cooperador do Ofício' || cargo === 'Cooperador do Oficio') {
          if (isVisitante) totals.coopOficioVisitas++;
          else totals.coopOficioCasa++;
        }
        else if (cargo === 'Cooperador RJM' || cargo === 'Cooperador de Jovens e Menores') {
          if (isVisitante) totals.coopJovensVisitas++;
          else totals.coopJovensCasa++;
        }
        else if (cargo === 'Encarregado Regional') {
          if (isVisitante) totals.encRegionalVisitas++;
          else totals.encRegionalCasa++;
        }
        else if (cargo === 'Encarregado Local') {
          if (isVisitante) totals.encLocalVisitas++;
          else totals.encLocalCasa++;
        }
        else if (cargo === 'Examinadora') {
          if (isVisitante) totals.examinadorasVisitas++;
          else totals.examinadorasCasa++;
        }
        
        if (isVisitante && (p.cidadeUf || p.comum || p.bairro)) {
          totals.localidadesUnicas.add((p.cidadeUf || p.comum || p.bairro).toUpperCase());
        }
      });
    };

    processarPessoas(ataData?.presencaLocalFull, false);
    processarPessoas(ataData?.visitantes, true);

    totals.ministerio_total = (totals.ancianosCasa + totals.ancianosVisitas) + 
                             (totals.diaconosCasa + totals.diaconosVisitas) + 
                             (totals.coopOficioCasa + totals.coopOficioVisitas) + 
                             (totals.coopJovensCasa + totals.coopJovensVisitas) + 
                             (totals.encRegionalCasa + totals.encRegionalVisitas) + 
                             (totals.encLocalCasa + totals.encLocalVisitas) + 
                             (totals.examinadorasCasa + totals.examinadorasVisitas);

    totals.geral = totals.orquestra + totals.irmandade + totals.ministerio_total;

    return totals;
  }, [counts, ataData]);

  const totalAncianos = stats.ancianosCasa + stats.ancianosVisitas;
  const totalDiaconos = stats.diaconosCasa + stats.diaconosVisitas;
  const totalCoopOficio = stats.coopOficioCasa + stats.coopOficioVisitas;
  const totalCoopJovens = stats.coopJovensCasa + stats.coopJovensVisitas;
  const totalEncRegional = stats.encRegionalCasa + stats.encRegionalVisitas;
  const totalEncLocal = stats.encLocalCasa + stats.encLocalVisitas;
  const totalExaminadoras = stats.examinadorasCasa + stats.examinadorasVisitas;

  const totalPrincipais = stats.cordas + (stats.madeiras + stats.saxofones) + stats.metais;
  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";

  const handleShareAlimentacao = () => {
    const msg = whatsappService.obterTextoAlimentacao(ataData, stats);
    if (navigator.share) navigator.share({ text: msg }).catch(() => {});
    else { navigator.clipboard.writeText(msg); toast.success("Copiado!"); }
  };

  const handleShareEstatistico = () => {
    const msg = whatsappService.obterTextoEstatistico({ ...ataData, counts }, stats);
    if (navigator.share) navigator.share({ text: msg }).catch(() => {});
    else { navigator.clipboard.writeText(msg); toast.success("Resumo Estatístico Copiado!"); }
  };

  const handleGeneratePDF = async () => {
    const loadingToast = toast.loading("Gerando Ata...");
    try {
      const comumId = ataData?.comumId || userData?.activeComumId;
      const comumSnap = await getDoc(doc(db, 'comuns', comumId));
      const sedeData = comumSnap.exists() ? comumSnap.data() : null;
      // Chamada para o serviço regional especializado
      pdfEventRegionalService.generateAtaRegional(stats, ataData, userData, counts, sedeData);
      toast.dismiss(loadingToast);
      toast.success("Ata Regional Gerada!");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Erro ao gerar PDF.");
    }
  };

  return (
    <div className="space-y-3 pb-44 px-4 pt-6 max-w-md mx-auto bg-slate-50 min-h-screen animate-in fade-in duration-500 text-left">
      
      {/* CARD PRINCIPAL - ALIMENTAÇÃO */}
      <div className="bg-slate-950 px-5 py-3 rounded-[2rem] shadow-2xl relative border border-white/5 min-h-[84px] flex items-center overflow-hidden">
        <div className="w-[35%] leading-none">
          <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1 italic">Alimentação</p>
          <h3 className="text-xl font-[1000] text-white uppercase italic tracking-tighter">Regional</h3>
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
          <button onClick={handleShareAlimentacao} className="text-emerald-500 active:scale-90 ml-1">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* BIG NUMBERS MINISTERIAIS */}
      <BigNumberCard title="Anciães" total={totalAncianos} casa={stats.ancianosCasa} visita={stats.ancianosVisitas} icon={<Landmark size={20} strokeWidth={3} />} variant="dark" />
      <BigNumberCard title="Diáconos" total={totalDiaconos} casa={stats.diaconosCasa} visita={stats.diaconosVisitas} icon={<Briefcase size={20} strokeWidth={3} />} />
      <BigNumberCard title="Coop. Ofício" total={totalCoopOficio} casa={stats.coopOficioCasa} visita={stats.coopOficioVisitas} icon={<UserCheck size={20} strokeWidth={3} />} />
      <BigNumberCard title="Coop. Jovens" total={totalCoopJovens} casa={stats.coopJovensCasa} visita={stats.coopJovensVisitas} icon={<Users size={20} strokeWidth={3} />} />
      
      {/* BIG NUMBERS TÉCNICOS */}
      <BigNumberCard title="Enc. Regionais" total={totalEncRegional} casa={stats.encRegionalCasa} visita={stats.encRegionalVisitas} icon={<ShieldCheck size={20} strokeWidth={3} />} color="text-slate-600" />
      <BigNumberCard title="Examinadoras" total={totalExaminadoras} casa={stats.examinadorasCasa} visita={stats.examinadorasVisitas} icon={<Star size={20} strokeWidth={3} />} color="text-slate-600" />
      <BigNumberCard title="Enc. Locais" total={totalEncLocal} casa={stats.encLocalCasa} visita={stats.encLocalVisitas} icon={<ShieldCheck size={20} strokeWidth={3} />} color="text-slate-600" />

      {/* SEÇÃO DE EQUILÍBRIO ORQUESTRAL COM BOTÕES DE AÇÃO */}
      <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-lg space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={120} className="text-slate-900" /></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 p-2.5 rounded-2xl text-white shadow-lg"><Target size={20} /></div>
            <div>
              <h3 className="text-[14px] font-[1000] text-slate-950 uppercase italic tracking-tighter leading-none">Equilíbrio Orquestral</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Ref. Naipes: {totalPrincipais} instrumentos</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleShareEstatistico} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl active:scale-90 border border-emerald-100 transition-all shadow-sm">
              <Share2 size={18} />
            </button>
            <button onClick={handleGeneratePDF} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-90 border border-blue-100 transition-all shadow-sm">
              <FileText size={18} />
            </button>
          </div>
        </div>
        
        <div className="space-y-7 relative z-10">
          <ProgressBar label="Família das Cordas" value={getPerc(stats.cordas, totalPrincipais)} refVal="50" color="bg-amber-400" racional={stats.cordas} total={totalPrincipais} />
          <ProgressBar label="Família das Madeiras" value={getPerc(stats.madeiras + stats.saxofones, totalPrincipais)} refVal="25" color="bg-emerald-500" racional={stats.madeiras + stats.saxofones} total={totalPrincipais} />
          <ProgressBar label="Família dos Metais" value={getPerc(stats.metais, totalPrincipais)} refVal="25" color="bg-rose-500" racional={stats.metais} total={totalPrincipais} />
          
          <ProgressBar label="Teclas (Acordeon)" value={getPerc(stats.teclas, stats.orquestra)} color="bg-slate-400" racional={stats.teclas} total={stats.orquestra} />
          <ProgressBar label="Organistas" value={getPerc(stats.organistas, stats.orquestra)} color="bg-slate-400" racional={stats.organistas} total={stats.orquestra} />
        </div>

        <div className="pt-6 border-t border-slate-100 space-y-4">
           <ProgressBar label="Irmandade (Geral)" value={getPerc(stats.irmandade, stats.geral)} color="bg-slate-900" racional={stats.irmandade} total={stats.geral} />
        </div>
      </div>

      {/* BIG NUMBERS DE TOTAIS ESTRATÉGICOS (SOBRIEDADE COM CONTORNO REFORÇADO) */}
      <div className="space-y-3 pb-20">
        <BigNumberCard title="Total Músicos" total={stats.musicos} hideDetails icon={<Music size={20} strokeWidth={3} />} color="text-slate-600" />
        <BigNumberCard title="Total Organistas" total={stats.organistas} hideDetails icon={<PieChart size={20} strokeWidth={3} />} color="text-slate-600" />
        
        <BigNumberCard 
          title="Total Orquestra" 
          total={stats.orquestra} 
          hideDetails 
          icon={<Activity size={20} strokeWidth={3} />} 
          bgColor="bg-slate-100 border-l-4 border-l-blue-500 shadow-sm" 
        />
        
        <BigNumberCard title="Total Irmandade" total={`≈ ${stats.irmandade}`} hideDetails icon={<Users size={20} strokeWidth={3} />} color="text-slate-400" />
        
        <BigNumberCard title="Total Ministério" total={stats.ministerio_total} hideDetails icon={<Briefcase size={20} strokeWidth={3} />} color="text-slate-600" />
        
        <BigNumberCard 
          title="Total Geral" 
          total={stats.geral} 
          hideDetails 
          icon={<Globe size={20} strokeWidth={3} />} 
          bgColor="bg-slate-200/80 border-l-4 border-l-emerald-600 shadow-md" 
        />
      </div>
    </div>
  );
};

/* --- SUB-COMPONENTES AUXILIARES --- */
const BigNumberCard = ({ title, total, casa, visita, icon, variant, color, hideDetails, bgColor }) => (
  <div className={`px-5 py-2 rounded-[2rem] shadow-sm border flex items-center min-h-[84px] overflow-hidden ${bgColor ? bgColor : 'bg-white'} ${variant === 'dark' ? 'border-slate-200' : 'border-slate-100'}`}>
    <div className="w-[35%] flex items-center gap-3">
      <div className={`p-2.5 rounded-xl shadow-lg ${variant === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600'}`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="leading-none">
        <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">{title}</h3>
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Presença</p>
      </div>
    </div>
    <div className={`${hideDetails ? 'w-[65%]' : 'w-[30%]'} text-center`}>
      <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{total}</span>
    </div>
    {!hideDetails && (
      <div className="w-[35%] flex gap-2 justify-end h-full py-1">
        <div className="bg-blue-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-blue-100/50 min-w-[55px]">
          <span className="text-lg font-[1000] text-blue-700 italic leading-none">{casa}</span>
          <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">Casa</span>
        </div>
        <div className="bg-amber-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-amber-100/50 min-w-[55px]">
          <span className="text-lg font-[1000] text-amber-700 italic leading-none">{visita}</span>
          <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter">Visita</span>
        </div>
      </div>
    )}
  </div>
);

const ProgressBar = ({ label, value, color, racional, total, refVal }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end px-1">
      <div className="flex flex-col text-left">
        <span className="text-[10px] font-[1000] uppercase text-slate-950 italic tracking-tight">{label}</span>
        <span className="text-[11px] font-black text-slate-400 italic tracking-tighter leading-none mt-1">{racional} de {total}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        {refVal && (
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${Number(value) >= Number(refVal) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            META {refVal}%
          </span>
        )}
        <span className="text-xl font-[1000] text-slate-950 italic leading-none tracking-tighter">{Math.round(value)}%</span>
      </div>
    </div>
    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner relative">
      <div 
        className={`h-full transition-all duration-1000 ease-out shadow-sm ${color} relative`} 
        style={{ width: `${value}%` }} 
      >
        <div className="absolute inset-0 bg-white/20 animate-pulse" />
      </div>
    </div>
  </div>
);

export default DashEventRegionalPage;