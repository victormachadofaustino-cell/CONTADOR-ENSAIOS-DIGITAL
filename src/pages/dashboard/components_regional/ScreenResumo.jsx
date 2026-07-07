import React from 'react'; // [Funcionamento]: Estrutura núcleo do React para renderização do componente de UI.
import { BookOpen, ListMusic, Share2, Camera } from 'lucide-react'; // [Funcionamento]: Ícones minimalistas para representação litúrgica e gatilhos de mídia.

const ScreenResumo = ({ 
  stats, 
  ataData, 
  canExport, 
  handleShareLanche, 
  handleShareEstatistico, // [Funcionamento]: Disparador da cópia do resumo textual do ensaio
  handleGenerateImage,    // [Funcionamento]: Recebe o disparador da foto oficial CCB do Maestro
  cardImagemRef,          // [Funcionamento]: Ponteiro de ancoragem do HTML invisível
  dataPorExtenso, 
  palavraLidaData, 
  hinosEnsaiadosLista,
  totalPrincipais,
  getPerc
}) => {

  return (
    <div className="space-y-4 animate-in fade-in duration-300 text-left relative font-sans">
      
      {/* 📖 QUADRO 1: A PALAVRA SANTA EXORTADA + GATILHOS DE MÍDIA DIRECT */}
      <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        
        {/* Cabeçalho do Card com Título e Dupla de Botões de Contexto */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 select-none">
          <div className="flex items-center gap-2 text-amber-600">
            <BookOpen size={16} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-wider">A Palavra Santa Exortada</span>
          </div>
          
          {/* v6.8: Botões de ação em formato de ícone compacto injetados no canto superior direito */}
          {canExport && (
            <div className="flex items-center gap-1.5">
              {/* Compartilhar Texto do Resumo */}
              <button
                onClick={handleShareEstatistico}
                title="Compartilhar Resumo em Texto"
                className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 active:scale-90 transition-all cursor-pointer outline-none layout-touch"
              >
                <Share2 size={15} strokeWidth={2.5} />
              </button>
              
              {/* Fabricar Imagem Tradicional CCB */}
              <button
                onClick={handleGenerateImage}
                title="Gerar Imagem Solene Oficial"
                className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-amber-600 active:scale-90 transition-all cursor-pointer outline-none layout-touch"
              >
                <Camera size={15} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* Informações da Palavra */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-700 italic">
            Livro: <span className="text-slate-900 font-sans not-italic font-black">{palavraLidaData.livro}</span>
            {palavraLidaData.capitulo !== '---' && ` | Capítulo: ${palavraLidaData.capitulo}`}
            {palavraLidaData.verso !== '---' && ` | Verso: ${palavraLidaData.verso}`}
          </p>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-[9px] pt-1">Assunto Exortado:</p>
          <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-serif">
            "{palavraLidaData.assunto}"
          </p>
        </div>
      </div>

      {/* 🎵 QUADRO 2: MATRIZ AUTO-ADAPTÁVEL DE HINOS ENSAIADOS */}
      {hinosEnsaiadosLista.length > 0 && (
        <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-blue-600 select-none">
            <ListMusic size={16} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-wider">Hinos Ensaiados ({stats.hinos})</span>
          </div>
          {/* Grid Inteligente Responsivo auto-fill de 5 colunas */}
          <div className="grid grid-cols-5 gap-2 text-center">
            {hinosEnsaiadosLista.map((hino, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-200/60 px-1 py-2 rounded-xl text-xs font-black text-slate-700 shadow-xs select-none"
              >
                {hino}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          📌 PALCO TEATRAL OCULTO (RENDERIZAÇÃO OFF-SCREEN INTEGRADA DENTRO DA ABA)
          Design de Ata Oficial Tradicional CCB, Azul-Marinho Solene e Tipografia Serifada
          ========================================================================= */}
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none select-none overflow-hidden">
        <div 
          ref={cardImagemRef} 
          className="w-[460px] bg-[#0c1a30] p-8 rounded-[1.2rem] flex flex-col gap-5 text-left border border-amber-600/30 font-serif text-white shadow-2xl"
        >
          {/* Cabeçalho de Identidade Solene Equilibrado com Fontes Ampliadas */}
          <div className="text-center space-y-2 border-b border-amber-600/20 pb-4">
            <h1 className="text-2xl font-bold uppercase tracking-tight text-amber-500 leading-tight">
              Congregação Cristã no Brasil
            </h1>
            <p className="text-[13px] font-sans font-semibold text-slate-300 uppercase tracking-widest">
              {dataPorExtenso}
            </p>
            <div className="pt-1">
              <h2 className="text-2xl font-bold tracking-tight uppercase text-white leading-none">
                {ataData?.type || "ENSAIO REGIONAL"}
              </h2>
              <h3 className="text-lg font-sans font-bold text-amber-400 uppercase tracking-wide mt-1">
                {ataData?.cidadeNome || ataData?.comumNome || "REGIONAL"}
              </h3>
            </div>
          </div>

          {/* Seção Central Sóbria: Total de Presentes */}
          <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 text-center shadow-md">
            <span className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-widest block mb-0.5">
              TOTAL GERAL DE PRESENTES
            </span>
            <span className="text-6xl font-sans font-[1000] text-white tracking-tighter block leading-none my-1">
              {stats.geral}
            </span>
          </div>

          {/* Grid Triplo com Sub-totais Menores Internos Protegidos */}
          <div className="grid grid-cols-3 gap-2.5 font-sans">
            <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-blue-400 uppercase block border-b border-white/10 pb-1 mb-1.5">Orquestra</span>
              <span className="text-2xl font-black text-white block leading-none mb-2">{stats.orquestra}</span>
              <div className="text-left text-[9px] text-slate-400 space-y-0.5 leading-tight pl-1">
                <p>• Músicos: <strong className="text-white font-bold">{stats.musicos}</strong></p>
                <p>• Organistas: <strong className="text-white font-bold">{stats.organistas}</strong></p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase block border-b border-white/10 pb-1 mb-1.5">Coral</span>
              <span className="text-2xl font-black text-white block leading-none mb-2">{stats.irmandade}</span>
              <div className="text-left text-[9px] text-slate-400 space-y-0.5 leading-tight pl-1">
                <p>• Irmãos: <strong className="text-white font-bold">{stats.irmaos}</strong></p>
                <p>• Irmãs: <strong className="text-white font-bold">{stats.irmas}</strong></p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-amber-400 uppercase block border-b border-white/10 pb-1 mb-1.5">Ministério</span>
              <span className="text-2xl font-black text-white block leading-none mb-2">{stats.ministerio_total + stats.encRegional}</span>
              <div className="text-left text-[9px] text-slate-400 space-y-0.5 leading-tight pl-0.5">
                <p>• Corpo Min: <strong className="text-white font-bold">{stats.ministerio_total}</strong></p>
                <p>• Enc. Reg: <strong className="text-amber-400 font-bold">{stats.encRegional}</strong></p>
              </div>
            </div>
          </div>

          {/* Equilíbrio Orquestral com Valores Reais Estritos do Ensaio */}
          <div className="bg-slate-900/40 border border-white/5 p-3.5 rounded-xl space-y-2 font-sans">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1">
              Equilíbrio Orquestral (Valores Reais)
            </p>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Cordas</span>
              <span className="font-bold text-white text-sm">{Math.round(getPerc(stats.cordas, totalPrincipais))}% <span className="text-[10px] text-slate-500 font-normal">({stats.cordas})</span></span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Madeiras e Saxofones</span>
              <span className="font-bold text-white text-sm">{Math.round(getPerc(stats.madeiras + stats.saxofones, totalPrincipais))}% <span className="text-[10px] text-slate-500 font-normal">({stats.madeiras + stats.saxofones})</span></span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Metais</span>
              <span className="font-bold text-white text-sm">{Math.round(getPerc(stats.metais, totalPrincipais))}% <span className="text-[10px] text-slate-500 font-normal">({stats.metais})</span></span>
            </div>
          </div>

          {/* Matriz de Hinos Dinâmica Embutida na Imagem */}
          {hinosEnsaiadosLista.length > 0 && (
            <div className="bg-slate-900/40 border border-white/5 p-3.5 rounded-xl font-sans">
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-1.5 mb-2.5 text-slate-400">
                <span className="text-[9px] font-black uppercase tracking-widest">Hinos Ensaiados ({stats.hinos})</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {hinosEnsaiadosLista.map((hinoNumero, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-950/60 border border-white/10 px-1.5 py-1 rounded-md text-xs font-bold text-slate-200 tracking-tight"
                  >
                    {hinoNumero}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registro Solene da Palavra Lida */}
          <div className="bg-slate-900/60 border border-amber-600/10 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-1 text-amber-500">
              <span className="text-[9px] font-sans font-black uppercase tracking-wider">A Palavra Santa Exortada</span>
            </div>
            <p className="text-xs font-bold text-white italic leading-none pt-0.5">
              Livro: <span className="text-amber-400 font-sans not-italic">{palavraLidaData.livro}</span> 
              {palavraLidaData.capitulo !== '---' && ` | Capítulo: ${palavraLidaData.capitulo}`}
              {palavraLidaData.verso !== '---' && ` | Verso: ${palavraLidaData.verso}`}
            </p>
            <p className="text-[11px] text-slate-300 leading-normal italic font-sans border-t border-white/5 pt-1.5 mt-1">
              "{palavraLidaData.assunto}"
            </p>
          </div>

          {/* Rodapé Tradicional com Selo Rebaixado */}
          <div className="flex justify-between items-center border-t border-white/10 pt-3.5 text-slate-500 font-sans font-bold text-[9px] uppercase tracking-wide">
            <span className="bg-amber-500/10 text-amber-500 text-[8px] px-2 py-0.5 rounded-md border border-amber-500/20 font-sans">
              Relatório Oficial
            </span>
            <span className="font-sans text-slate-400 tracking-tight">
              Gerado no contador de ensaios CCB
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ScreenResumo;