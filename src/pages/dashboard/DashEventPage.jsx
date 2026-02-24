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

// IMPORTAÇÃO DOS MÓDULOS ATÔMICOS v8.9.1
import DashStatsHeader from './components/DashStatsHeader.jsx';
import DashQuickGrid from './components/DashQuickGrid.jsx';
import DashEquilibriumSection from './components/DashEquilibriumSection.jsx';
import DashFinalSummary from './components/DashFinalSummary.jsx';

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
    /* AJUSTE v8.9.1: pb-14 reduzido pela metade para colar no rodapé e space-y-3 para compactação */
    <div className="space-y-3 pb-0 px-4 pt-6 max-w-md mx-auto animate-premium bg-[#F1F5F9] text-left">
      
      {/* MÓDULO 1: CABEÇALHO DE ALIMENTAÇÃO */}
      <DashStatsHeader 
        stats={stats} 
        isBasico={isBasico} 
        handleShareLanche={handleShareLanche} 
      />

      {/* MÓDULO 2: GRADE DE ESTATÍSTICAS RÁPIDAS (Inclui Subtotal Orquestra) */}
      <DashQuickGrid stats={stats} />

      {/* MÓDULO 3: EQUILÍBRIO E DISTRIBUIÇÃO (MOO) */}
      <DashEquilibriumSection stats={stats} getPerc={getPerc} />

      {/* MÓDULO 4: RESUMO FINAL E EXPORTAÇÃO (MAX-PROXIMIDADE RODAPÉ) */}
      <DashFinalSummary 
        stats={stats} 
        canExport={canExport} 
        handleShareEstatistico={handleShareEstatistico} 
        handleGeneratePDF={handleGeneratePDF} 
      />

    </div>
  );
};

export default DashEventPage;