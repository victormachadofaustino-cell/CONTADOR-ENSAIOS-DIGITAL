import React, { useMemo } from 'react'; // Explicação: Ferramenta que evita cálculos repetidos sem necessidade.
import toast from 'react-hot-toast'; // Explicação: Sistema de avisos (balões) na tela.
import { 
  TrendingUp, Music, Star, 
  Share2, Activity, PieChart, 
  CheckCircle2, Info, ShieldCheck, Users, FileText, Briefcase
} from 'lucide-react'; // Explicação: Desenhos dos ícones das seções.
import { pdfEventService } from '../../services/pdfEventService'; // Explicação: Motor que gera o arquivo PDF da Ata.
import { whatsappService } from '../../services/whatsappService'; // Explicação: Motor que formata o texto para o WhatsApp.
import { useAuth } from '../../context/AuthContext'; // Explicação: Puxa o crachá do usuário para saber o nível de acesso.
import { db, doc, getDoc } from '../../config/firebase'; // Explicação: Conecta com the base de dados central.

// v8.9.3: Importação da Regra de Ouro para travar exportação (PDF/Compartilhar)
import { hasPermission } from '../../config/permissions'; // Explicação: Importa o cérebro oficial de permissões.

// IMPORTAÇÃO DOS MÓDULOS ATÔMICOS v8.9.1
import DashStatsHeader from './components/DashStatsHeader.jsx'; // Explicação: Parte de cima (Lanche/Alimentação).
import DashQuickGrid from './components/DashQuickGrid.jsx'; // Explicação: Grade de números rápidos.
import DashEquilibriumSection from './components/DashEquilibriumSection.jsx'; // Explicação: Seção de equilíbrio de orquestra.
import DashFinalSummary from './components/DashFinalSummary.jsx'; // Explicação: Resumo final e botões de exportar.

const DashEventPage = ({ counts, ataData, isAdmin, eventId }) => { // Explicação: Inicia a página de estatísticas do ensaio.
  const { userData } = useAuth(); // Explicação: Captura os dados de quem está olhando a tela.
  const level = userData?.accessLevel; // Explicação: Identifica o nível de poder (Master, GEM, etc).
  
  // Explicação: Flags de poder para habilitar ou esconder funções.
  const isMaster = userData?.isMaster; 
  const isComissao = userData?.isComissao;
  const isRegionalCidade = userData?.isRegionalCidade; 
  const isGemLocal = userData?.isGemLocal; 
  const isBasico = userData?.isBasico;

  // v8.9.2: CÁLCULO DE ESTATÍSTICAS COM PROTEÇÃO DE PROCESSAMENTO
  const stats = useMemo(() => { // Explicação: Inicia o processamento pesado de somas e divisões.
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

    if (counts) { // Explicação: Se o banco enviou os números, vamos somar naipe por naipe.
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
          if (section === 'CORDAS' || ['vln', 'vla', 'vcl', 'violino', 'viola', 'violoncelo'].includes(saneId)) totals.cordas += valTotal;
          else if (section.includes('SAX')) totals.saxofones += valTotal;
          else if (section.includes('MADEIRA') || ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'fagote', 'claronealto', 'claronebaixo', 'corneingles'].includes(saneId)) totals.madeiras += valTotal;
          else if (section.includes('METAI') || ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufonio', 'tuba', 'flugelhorn'].includes(saneId)) totals.metais += valTotal;
          else if (section === 'TECLAS' || saneId === 'acordeon' || saneId === 'acd') totals.teclas += valTotal;
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
  
  // v8.9.3: LIBERAÇÃO CONTEXTUAL DA EXPORTAÇÃO
  // Explicação: O sistema pergunta ao permissions.js: "Esse usuário pode gerar relatório neste tipo de evento (scope)?"
  const canExport = hasPermission(userData, 'generate_report', ataData?.scope);

  const handleShareLanche = async () => { 
    const msg = whatsappService.obterTextoAlimentacao(ataData, stats);
    if (navigator.share) {
      try { await navigator.share({ text: msg }); } catch (err) { }
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Resumo Alimentação Copiado!");
    }
  };

  const handleShareEstatistico = async () => { 
    const msg = whatsappService.obterTextoEstatistico({ ...ataData, counts }, stats);
    if (navigator.share) {
      try { await navigator.share({ text: msg }); } catch (err) { }
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
    <div className="space-y-3 pb-0 px-4 pt-6 max-w-md mx-auto animate-premium bg-[#F1F5F9] text-left">
      
      {/* MÓDULO 1: CABEÇALHO DE ALIMENTAÇÃO */}
      {/* Explicação: O botão de compartilhar lanche dentro do header também deve respeitar a trava canExport. */}
      <DashStatsHeader 
        stats={stats} 
        isBasico={isBasico} 
        handleShareLanche={handleShareLanche} 
        canExport={canExport}
      />

      {/* MÓDULO 2: GRADE DE ESTATÍSTICAS RÁPIDAS */}
      <DashQuickGrid stats={stats} />

      {/* MÓDULO 3: EQUILÍBRIO E DISTRIBUIÇÃO */}
      <DashEquilibriumSection stats={stats} getPerc={getPerc} />

      {/* MÓDULO 4: RESUMO FINAL E EXPORTAÇÃO */}
      {/* Explicação: Aqui é onde os botões principais de PDF e WhatsApp aparecem ou somem. */}
      <DashFinalSummary 
        stats={stats} 
        canExport={canExport} 
        handleShareEstatistico={handleShareEstatistico} 
        handleGeneratePDF={handleGeneratePDF} 
      />

    </div>
  );
};

export default DashEventPage; // Explicação: Exporta o painel de estatísticas com segurança de exportação.