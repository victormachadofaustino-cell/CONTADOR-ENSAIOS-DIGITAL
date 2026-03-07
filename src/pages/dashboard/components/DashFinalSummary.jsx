import React from 'react'; // Explicação: Importa a base do React para criar o componente visual.
import { Share2, FileText } from 'lucide-react'; // Explicação: Importa os ícones de compartilhar e documento PDF.

const AdminRow = ({ label, value, highlight }) => ( // Explicação: Cria uma linha padrão para mostrar os números (ex: Músicos: 50).
  <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 leading-none">
    <span className={`text-[9px] font-black uppercase italic tracking-widest ${highlight ? 'text-slate-950' : 'text-slate-400'}`}>{label}</span>
    <span className={`${highlight ? 'text-lg font-black' : 'text-xs font-bold'} italic text-slate-950`}>{value}</span>
  </div>
);

const DashFinalSummary = ({ stats, canExport, handleShareEstatistico, handleGeneratePDF }) => { // Explicação: Inicia o resumo final recebendo os cálculos e a permissão de exportar.
  return ( // Explicação: Começa a desenhar o card branco de resumo na tela.
    // mb-0 para garantir que o card cole no rodapé sem margens extras
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative mb-0 text-left">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[11px] font-black uppercase italic text-slate-950 tracking-tighter">Resumo Estatístico</h3>
        {/* v5.9: Trava de Segurança Hierárquica aplicada aos botões principais de exportação */}
        {/* Explicação: Os botões de WhatsApp e PDF só aparecem se o usuário tiver autoridade para o tipo de ensaio atual. */}
        {canExport && (
          <div className="flex gap-2">
            <button onClick={handleShareEstatistico} className="bg-slate-50 p-2.5 rounded-xl text-emerald-500 active:scale-90 border border-slate-100">
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
  );
};

export default DashFinalSummary; // Explicação: Exporta o componente pronto para o Dashboard.