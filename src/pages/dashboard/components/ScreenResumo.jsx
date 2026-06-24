import React from 'react'; // 💡 Importa a base do React para construir a interface visual da tela.
import { Share2 } from 'lucide-react'; // 💡 Biblioteca que fornece o ícone oficial do WhatsApp/Compartilhamento.

// 🧩 COMPONENTE FILHO 1: TRILHO DE BI PREMIUM DE ALTA SCANNABILIDADE (VERTICAL STACKING PROTEGIDO)
const AdminRow = ({ label, value, highlight }) => (
  <div className={`flex justify-between items-center py-3.5 px-3 border-b border-slate-100 last:border-0 leading-none select-none transition-all ${highlight ? 'bg-slate-50/50 rounded-xl mb-1 border border-slate-100/70' : ''}`}> {/* 💡 Cria linhas levemente envelopadas com áreas de espaçamento confortáveis para o mobile. */}
    <div className="flex items-center gap-2"> {/* 💡 Alinha o marcador e o texto esquerdo lado a lado. */}
      {highlight && <div className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />} {/* 💡 Pequeno ponto pulsante para destacar os naipes principais. */}
      <span className={`text-[10px] font-black uppercase tracking-wider ${highlight ? 'text-slate-950' : 'text-slate-400'}`}>{label}</span> {/* 💡 Rótulo menor formatado para leitura dinâmica. */}
    </div>
    <span className={`${highlight ? 'text-base font-black' : 'text-xs font-bold'} tracking-tight text-slate-950 italic`}>{value}</span> {/* 💡 Valor numérico com tipografia limpa e precisa. */}
  </div>
);

// 🏆 COMPONENTE PRINCIPAL: TELA DE CONCLUSAO OPERACIONAL PURIFICADA (MÉTRICAS SOCIAIS)
const ScreenResumo = ({ stats, canExport, handleShareEstatistico }) => { // 💡 Declaração da tela recebendo os dados purificados do Maestro.
  return (
    <div className="space-y-4 animate-fadeIn text-left w-full select-none"> {/* 💡 Força o empilhamento vertical limpo no celular com transição suave. */}
      
      {/* 📊 PAINEL DO RESUMO ESTATÍSTICO DE FECHAMENTO */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200/70 shadow-xs relative"> {/* 💡 Moldura branca do bloco de fechamento contábil. */}
        
        {/* 🎛️ CABEÇALHO SOCIAL DA ABA */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100"> {/* 💡 Alinha o título e a ação de disparo na mesma linha. */}
          <div>
            <h3 className="text-[11px] font-black uppercase italic text-slate-950 tracking-tight">Estatísticas Orquestrais</h3> {/* 💡 Título institucional da ata. */}
            <p className="text-[9px] font-medium text-slate-400 mt-0.5">Relatório resumido do evento local</p> {/* 💡 Legenda de apoio. */}
          </div>
          
          {/* 🛡️ TRAVA DE EXPORTAÇÃO EXCLUSIVA PARA WHATSAPP */}
          {canExport && ( // 💡 Exibe o botão de compartilhamento social somente se o usuário tiver autoridade de escrita.
            <button 
              onClick={handleShareEstatistico} // 💡 Dispara o relatório estatístico completo estruturado no WhatsApp.
              className="bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all p-2.5 rounded-xl text-emerald-600 border border-emerald-100 flex items-center justify-center min-h-[44px] min-w-[44px] layout-touch outline-none shadow-xs" // 💡 Área de toque mobile-first estrita de 44px protegida contra erros.
              aria-label="Compartilhar no Whatsapp" // 💡 Tag de acessibilidade internacional.
            >
              <Share2 size={16} /> {/* 💡 Ícone de ramificação social de compartilhamento rápido. */}
            </button>
          )}
        </div>
        
        {/* 📋 DISRIBUIÇÃO SANEADA DOS DADOS COLETADOS EM MEMÓRIA LOCAL */}
        <div className="space-y-0.5"> {/* 💡 Agrupamento de linhas sem divisores pesados para evitar poluição visual. */}
          <AdminRow label="Músicos" value={stats.musicos} highlight /> {/* 💡 Exibe os músicos de naipes calculados no ensaio. */}
          <AdminRow label="Organistas" value={stats.organistas} highlight /> {/* 💡 Exibe as organistas sentadas nas bancadas de órgãos. */}
          <AdminRow label="Irmandade" value={stats.irmandade} highlight /> {/* 💡 Exibe a somatória absoluta das vozes masculinas e femininas. */}
          
          <div className="py-2 flex items-center justify-center select-none"> {/* 💡 Linha pontilhada minimalista de separação de blocos. */}
            <div className="w-full border-t border-dashed border-slate-200" />
          </div>

          <AdminRow label="Encarregados Regionais" value={stats.encRegionalComum + stats.encRegionalVisita} /> {/* 💡 Soma reativa de encarregados da regional (casa + visitantes). */}
          <AdminRow label="Encarregados Locais" value={stats.encLocalComum + stats.encLocalVisita} /> {/* 💡 Soma reativa de encarregados locais (casa + visitantes). */}
          <AdminRow label="Examinadoras" value={stats.examinadorasTotal} /> {/* 💡 Exibe as examinadoras de partituras computadas na ata. */}
          <AdminRow label="Ministério" value={stats.ministerio_oficio} /> {/* 💡 Exibe anciães, diáconos e cooperadores de mesa. */}
        </div>

        {/* 🏆 PLACAR ABSOLUTO GERAL DA ATA (ESTILO REGISTRO CONTÁBIL) */}
        <div className="pt-5 mt-5 border-t-2 border-slate-950 flex justify-between items-end"> {/* 💡 Traço duplo contábil preto de auditoria. */}
          <div>
            <span className="text-[12px] font-black uppercase italic text-slate-950 tracking-tight block leading-none">Total Geral</span> {/* 💡 Identificador do fechamento final. */}
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block leading-none">Público</span> {/* 💡 Rótulo secundário descritivo. */}
          </div>
          <span className="text-5xl font-[1000] text-slate-950 tracking-tighter italic leading-none">{stats.geral}</span> {/* 💡 O número master final do ensaio renderizado com destaque máximo de BI. */}
        </div>

      </div>
    </div>
  );
};

export default ScreenResumo; // 💡 Arquivo purificado, autocontido e sem dependências quebradas pronto para o Copy-Paste.