import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Music, Star, 
  Share2, Activity, PieChart, 
  CheckCircle2, Info, ShieldCheck, Users, FileText, Briefcase
} from 'lucide-react';
import { pdfEventService } from '../../services/pdfEventService';
import { whatsappService } from '../../services/whatsappService';
import { useAuth } from '../../context/AuthContext';
import { db, doc, getDoc } from '../../config/firebase';

const DashEventPage = ({ counts, ataData, isAdmin, eventId }) => {
  const { userData } = useAuth();
  const level = userData?.accessLevel;
  
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';
  const isBasico = level === 'basico';

  const stats = useMemo(() => {
    const totals = {
      geral: 0, orquestra: 0, musicos: 0, organistas: 0, irmandade: 0, 
      irmaos: 0, irmas: 0, hinos: 0, visitas_total: 0, ministerio_oficio: 0,
      cordas: 0, madeiras: 0, metais: 0, saxofones: 0, teclas: 0,
      encRegional: 0, encLocal: 0, examinadoras: 0,
      musicosComum: 0, musicosVisita: 0,
      organistasComum: 0, organistasVisita: 0,
      orquestraTotalComum: 0, orquestraTotalVisita: 0,
      irmandadeComum: 0, irmandadeVisita: 0,
      examinadorasComum: 0, examinadorasVisita: 0,
      ministerioCasa: 0, ministerioVisita: 0
    };

    if (counts) {
      Object.entries(counts).forEach(([id, data]) => {
        if (id.startsWith('meta_')) return;
        
        const valTotal = parseInt(data.total) || 0;
        const valComum = parseInt(data.comum) || 0;
        const valIrmaos = parseInt(data.irmaos) || 0;
        const valIrmas = parseInt(data.irmas) || 0;
        const section = (data.section || "GERAL").toUpperCase();
        const saneId = id.toLowerCase();

        const visitasCalc = Math.max(0, valTotal - valComum);

        if (section === 'CORAL' || section === 'IRMANDADE' || saneId === 'coral' || saneId === 'irmandade') {
          totals.irmaos += valIrmaos || (saneId === 'irmandade' ? valTotal : 0);
          totals.irmas += valIrmas;
          totals.irmandadeComum += valComum;
          totals.irmandadeVisita += visitasCalc;
        } 
        else if (section === 'ORGANISTAS' || saneId === 'orgao' || saneId === 'org') {
          totals.organistas += valTotal;
          totals.organistasComum += valComum;
          totals.organistasVisita += visitasCalc;
        } 
        else {
          totals.musicos += valTotal;
          totals.musicosComum += valComum;
          totals.musicosVisita += visitasCalc;
          
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

    const oficio = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM'];
    
    const processarPessoasAta = (lista, isVisitante = false) => {
      if (!lista || !Array.isArray(lista)) return;
      lista.forEach(p => {
        const cargo = (p.min || p.role || "");
        if (isVisitante) totals.visitas_total++;
        
        if (cargo === 'Encarregado Regional') totals.encRegional++;
        if (cargo === 'Encarregado Local') totals.encLocal++;
        
        if (cargo === 'Examinadora') {
          totals.examinadoras++;
          if (isVisitante) totals.examinadorasVisita++;
          else totals.examinadorasComum++;
        }
        
        if (oficio.includes(cargo)) {
          totals.ministerio_oficio++;
          if (isVisitante) totals.ministerioVisita++;
          else totals.ministerioCasa++;
        }
      });
    };

    processarPessoasAta(ataData?.visitantes, true);
    processarPessoasAta(ataData?.presencaLocalFull, false);

    totals.orquestraTotalComum = totals.musicosComum + totals.organistasComum;
    totals.orquestraTotalVisita = totals.musicosVisita + totals.organistasVisita;
    totals.irmandade = totals.irmaos + totals.irmas;
    totals.orquestra = totals.musicos + totals.organistas;
    totals.geral = totals.orquestra + totals.irmandade;

    if (ataData?.partes) {
      totals.hinos = ataData.partes.reduce((acc, p) => 
        acc + (p.hinos?.filter(h => h && h.trim() !== '').length || 0), 0);
    }
    return totals;
  }, [counts, ataData]);

  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
  const canExport = isGemLocal;

  const handleShareLanche = async () => {
    const msg = whatsappService.obterTextoAlimentacao(ataData, stats);
    if (navigator.share) {
      try { await navigator.share({ text: msg }); } catch (err) { console.log("Cancelado"); }
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Resumo Alimentação Copiado!");
    }
  };

  const handleShareEstatistico = async () => {
    const msg = whatsappService.obterTextoEstatistico({ ...ataData, counts }, stats);
    if (navigator.share) {
      try { await navigator.share({ text: msg }); } catch (err) { console.log("Cancelado"); }
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Resumo Estatístico Copiado!");
    }
  };

  const handleGeneratePDF = async () => {
    const loadingToast = toast.loading("Gerando PDF...");
    try {
      const comumId = ataData?.comumId || counts?.comumId || userData?.activeComumId || userData?.comumId; 
      if (!comumId) throw new Error("ID da localidade ausente.");
      let comumFullData = (userData?.comumId === comumId && userData?.comumDados) ? userData.comumDados : null;
      if (!comumFullData) {
        const comumSnap = await getDoc(doc(db, 'comuns', comumId));
        comumFullData = comumSnap.exists() ? comumSnap.data() : null;
      }
      pdfEventService.generateAtaEnsaio(stats, ataData, userData, counts, comumFullData);
      toast.dismiss(loadingToast);
      toast.success("Documento gerado!");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Erro ao processar PDF.");
    }
  };

  return (
    <div className="space-y-3 pb-44 px-4 pt-6 max-w-md mx-auto animate-premium bg-[#F1F5F9] text-left">
      
      {/* CARD ALIMENTAÇÃO */}
      <div className="bg-slate-950 px-5 py-3 rounded-[2rem] shadow-2xl relative border border-white/5 min-h-[84px] flex items-center overflow-hidden">
        <div className="w-[35%] leading-none">
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

      {/* CARD MÚSICOS */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Music size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Músicos</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Orquestra</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.musicos}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-blue-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-blue-100/50 min-w-[55px]">
            <span className="text-lg font-[1000] text-blue-700 italic leading-none">{stats.musicosComum}</span>
            <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">Casa</span>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-100 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-700 italic leading-none">{stats.musicosVisita}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Visita</span>
          </div>
        </div>
      </div>

      {/* CARD ORGANISTAS */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <PieChart size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Organistas</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Teclas</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.organistas}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-amber-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-amber-100/50 min-w-[55px]">
            <span className="text-lg font-[1000] text-amber-700 italic leading-none">{stats.organistasComum}</span>
            <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter">Casa</span>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-100 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-700 italic leading-none">{stats.organistasVisita}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Visita</span>
          </div>
        </div>
      </div>

      {/* CARD ORQUESTRA TOTAL */}
      <div className="bg-slate-200 px-5 py-2 rounded-[2rem] shadow-inner border border-slate-300 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-slate-400 text-white rounded-xl">
            <Activity size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Orquestra</h3>
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Subtotal</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.orquestra}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-white/60 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-300 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-900 italic leading-none">{stats.orquestraTotalComum}</span>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Casa</span>
          </div>
          <div className="bg-white/60 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-300 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-900 italic leading-none">{stats.orquestraTotalVisita}</span>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Visita</span>
          </div>
        </div>
      </div>

      {/* CARD CORAL */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-pink-50 text-pink-500 rounded-xl">
            <Users size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Coral</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Irmandade</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.irmandade}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-blue-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-blue-100/50 min-w-[55px]">
            <span className="text-lg font-[1000] text-blue-700 italic leading-none">{stats.irmaos}</span>
            <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">Irmãos</span>
          </div>
          <div className="bg-pink-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-pink-100/50 min-w-[55px]">
            <span className="text-lg font-[1000] text-pink-700 italic leading-none">{stats.irmas}</span>
            <span className="text-[7px] font-black text-pink-400 uppercase tracking-tighter">Irmãs</span>
          </div>
        </div>
      </div>

      {/* CARD TOTAL GERAL */}
      <div className="bg-slate-900 px-5 py-2 rounded-[2rem] shadow-xl border border-white/10 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-white text-slate-950 rounded-xl shadow-lg shadow-white/5">
            <TrendingUp size={20} strokeWidth={3} />
          </div>
          <div className="leading-none text-white">
            <h3 className="text-[11px] font-[1000] uppercase italic tracking-tighter">Geral</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Final</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-white leading-none tracking-tighter">{stats.geral}</span>
        </div>
        <div className="w-[35%] flex justify-end pr-2 text-white/20">
          <Activity size={32} />
        </div>
      </div>

      {/* CARD ENCARREGADOS */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Líderes</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Encarregados</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.encRegional + stats.encLocal}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-emerald-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-emerald-100/50 min-w-[55px]">
            <span className="text-lg font-[1000] text-emerald-700 italic leading-none">{stats.encRegional}</span>
            <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">Reg.</span>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-100 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-700 italic leading-none">{stats.encLocal}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Loc.</span>
          </div>
        </div>
      </div>

      {/* CARD EXAMINADORAS */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl">
            <Activity size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Exams</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Liderança</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.examinadoras}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-blue-50/50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-blue-100/50 min-w-[55px]">
            <span className="text-lg font-[1000] text-blue-700 italic leading-none">{stats.examinadorasComum}</span>
            <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">Casa</span>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-100 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-700 italic leading-none">{stats.examinadorasVisita}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Vis.</span>
          </div>
        </div>
      </div>

      {/* CARD HINOS */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <CheckCircle2 size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Hinos</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Cantados</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.hinos}</span>
        </div>
        <div className="w-[35%] flex justify-end pr-4 text-slate-100">
           <Music size={32} />
        </div>
      </div>

      {/* CARD MINISTÉRIO */}
      <div className="bg-white px-5 py-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center min-h-[84px] overflow-hidden">
        <div className="w-[35%] flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
            <Briefcase size={20} strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h3 className="text-[11px] font-[1000] text-slate-900 uppercase italic tracking-tighter">Ofício</h3>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Ministério</p>
          </div>
        </div>
        <div className="w-[30%] text-center">
          <span className="text-5xl font-[1000] italic text-slate-950 leading-none tracking-tighter">{stats.ministerio_oficio}</span>
        </div>
        <div className="w-[35%] flex gap-2 justify-end h-full py-1">
          <div className="bg-slate-50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-100 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-700 italic leading-none">{stats.ministerioCasa}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Casa</span>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl flex flex-col items-center justify-center border border-slate-100 min-w-[55px]">
            <span className="text-lg font-[1000] text-slate-700 italic leading-none">{stats.ministerioVisita}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Vis.</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO: EQUILÍBRIO */}
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

      {/* SEÇÃO: RESUMO E EXPORTAÇÃO */}
      <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[11px] font-black uppercase italic text-slate-950 tracking-tighter">Resumo Estatístico</h3>
          {canExport && (
            <div className="flex gap-2">
              <button onClick={handleShareEstatistico} className="bg-slate-50 p-2.5 rounded-xl text-emerald-500 active:scale-90 border border-slate-100 hover:bg-emerald-50">
                <Share2 size={16} />
              </button>
              <button onClick={handleGeneratePDF} className="bg-blue-50 p-2.5 rounded-xl text-blue-600 active:scale-90 border border-blue-100 flex items-center gap-2">
                <FileText size={16} />
                <span className="text-[8px] font-black uppercase tracking-widest">PDF</span>
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
          <span className="text-[14px] font-black uppercase italic text-slate-950 tracking-tighter leading-none">Total Geral</span>
          <span className="text-5xl font-[1000] text-slate-950 tracking-tighter italic leading-none">{stats.geral}</span>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white py-3 px-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between overflow-hidden">
    <div className="flex items-center gap-2">
      <span className="text-slate-300">{icon}</span>
      <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest italic leading-none">{title}</p>
    </div>
    <p className="text-lg font-black text-slate-950 italic leading-none">{value}</p>
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