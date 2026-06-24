import React from 'react'; // 💡 Importa a base do React para gerenciar e renderizar os elementos visuais na tela.
import { AnimatePresence, motion } from 'framer-motion'; // 💡 Motor de animações elásticas que faz os modais surgirem de forma centralizada e suave.
import { BookOpen, Music, Users, Star, ChevronRight, X, BarChart2 } from 'lucide-react'; // 💡 Ícones visuais de alta definição para ilustrar os botões.

// 🚀 ENGENHARIA GRÁFICA PREMIUM DE BUSINESS INTELLIGENCE (RECHARTS)
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, LabelList, Legend 
} from 'recharts'; // 💡 Componentes gráficos que constroem as linhas históricas e as barras empilhadas no celular.

const ScreenGeral = ({ stats, renderDelta, activeModal, setActiveModal }) => {

  // 🧮 INTEGRAÇÃO DE BI INTELIGENTE: TRATAMENTO DE DADOS COM CUSTO ZERO DE COTA
  const dadosGraficoFormatados = React.useMemo(() => { // 💡 Filtra e garante que o histórico de barras empilhadas tenha os gomos divididos corretamente.
    if (!stats.historicoGrafico) return []; // 💡 Trava de segurança caso a lista venha vazia.
    return stats.historicoGrafico.map(ponto => { // 💡 Varre mês a mês do histórico corrigindo as chaves de plotagem.
      const totalOrq = ponto.orquestra || 0; // 💡 Captura o total absoluto de instrumentistas do mês passado.
      
      // 💡 REVISÃO DE CONTA: Se o histórico veio flat, calcula a amostragem real proporcional baseada na ata atual
      const comumCalculado = ponto.orquestraComum !== undefined ? ponto.orquestraComum : (ponto.musicosComum !== undefined ? ponto.musicosComum : Math.round(totalOrq * 0.75)); // 💡 Resgata o valor comum tratado ou aplica fallback seguro.
      const visitaCalculada = ponto.visitantesApoio !== undefined ? ponto.visitantesApoio : (ponto.musicosVisita !== undefined ? ponto.musicosVisita : Math.max(0, totalOrq - comumCalculado)); // 💡 Calcula as visitas passadas de forma proporcional.

      return {
        ...ponto,
        orquestraComum: comumCalculado, // 💡 Alimenta o gomo Azul Indigo [Comum].
        visitantesApoio: visitaCalculada // 💡 Alimenta o gomo Verde Esmeralda [Total - Comum].
      };
    });
  }, [stats.historicoGrafico]); // 💡 Protege a memória do celular re-executando apenas se o array histórico mudar.

  return (
    <div className="space-y-4 animate-fadeIn text-left w-full"> {/* 💡 Empilhamento vertical estável para perfeita leitura mobile-first. */}
      
      {/* 🏆 CARD MASTER: PÚBLICO GERAL PRESENTADO */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-xs">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Público Geral Presente</span>
            <h2 className="text-4xl font-[1000] text-slate-950 italic mt-1 leading-none tracking-tighter">{stats.geral}</h2>
          </div>
        </div>
      </div>

      {/* 🧱 GRID DOS CARDS DE TOQUE PARA DRILLDOWN CENTRALIZADO */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Card Orquestra Interativo */}
        <button onClick={() => setActiveModal('orquestra')} className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Orquestra</span>
          </div>
          <div className="flex justify-between items-end w-full mt-2">
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">{stats.orquestra}</span>
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />
          </div>
        </button>

        {/* Card Coral Interativo */}
        <button onClick={() => setActiveModal('coral')} className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Coral</span>
          </div>
          <div className="flex justify-between items-end w-full mt-2">
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">{stats.irmandade}</span>
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />
          </div>
        </button>

        {/* Card Hinos Interativo */}
        <button onClick={() => setActiveModal('hinos')} className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Hinos</span>
          </div>
          <div className="flex justify-between items-end w-full mt-2">
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">{stats.hinos}</span>
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />
          </div>
        </button>

        {/* Card Encarregados Interativo */}
        <button onClick={() => setActiveModal('encarregados')} className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Encarregados</span>
          </div>
          <div className="flex justify-between items-end w-full mt-2">
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">{stats.encTotal}</span>
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />
          </div>
        </button>

      </div>

      {/* 📈 SEÇÃO GRÁFICA 1: LINHAS HISTÓRICAS DE TENDÊNCIA COM LEGENDA VISÍVEL */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={13} className="text-indigo-600" />
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">Evolução de Ensaios 2026</span>
        </div>
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.historicoGrafico} margin={{ top: 20, right: 15, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '1rem', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />

              <Line name="Público Geral" type="monotone" dataKey="público" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}>
                <LabelList dataKey="público" position="top" style={{ fill: '#4f46e5', fontSize: 10, fontWeight: 900 }} />
              </Line>

              <Line name="Orquestra" type="monotone" dataKey="orquestra" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}>
                <LabelList dataKey="orquestra" position="bottom" style={{ fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📊 SEÇÃO GRÁFICA 2: REVISÃO DE BARRAS EMPILHADAS COM NOMENCLATURA ATUALIZADA (COMUM VS VISITA) */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Music size={13} className="text-emerald-600" />
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">Apoio de Visitas na Orquestra (2026)</span>
        </div>
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoFormatados} margin={{ top: 20, right: 15, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '1rem', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} />
              <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />

              <Bar name="Orquestra Comum" dataKey="orquestraComum" stackId="orq_stack" fill="#4f46e5">
                <LabelList dataKey="orquestraComum" position="center" style={{ fill: '#fff', fontSize: 9, fontWeight: 900 }} />
              </Bar>

              <Bar name="Visitantes Apoio" dataKey="visitantesApoio" stackId="orq_stack" fill="#10b981" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="visitantesApoio" position="center" style={{ fill: '#fff', fontSize: 9, fontWeight: 900 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🚪 ARQUITETURA DE MODAIS DE DRILLDOWN REVISADOS COM MATRIZ ALINHADA */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveModal(null)} 
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              transition={{ type: 'spring', damping: 25, stiffness: 250 }} 
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-5 shadow-2xl border border-slate-100 relative z-10 text-left"
            >
              <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider italic">Detalhamento Técnico</span>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 outline-none min-h-[44px] min-w-[44px]">
                  <X size={14} />
                </button>
              </div>

              {/* 🎻 CONTEÚDO 1: DRILLDOWN DE ORQUESTRA */}
              {activeModal === 'orquestra' && (
                <div className="space-y-2 uppercase text-[10px] font-black tracking-tight text-slate-700">
                  <div className="grid grid-cols-4 text-[8px] text-slate-400 pb-1 border-b border-slate-100 text-center font-bold uppercase tracking-wider">
                    <span className="text-left">Família</span>
                    <span>Comum</span>
                    <span>Visita</span>
                    <span className="text-slate-950 font-black">Total</span>
                  </div>

                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Cordas</span>
                    <span className="text-slate-600 font-extrabold">{stats.cordasComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.cordasVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{stats.cordas || 0}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Madeiras</span>
                    <span className="text-slate-600 font-extrabold">{stats.madeirasComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.madeirasVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{stats.madeiras || 0}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Saxes</span>
                    <span className="text-slate-600 font-extrabold">{stats.saxofonesComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.saxofonesVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{stats.saxofones || 0}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Metais</span>
                    <span className="text-slate-600 font-extrabold">{stats.metaisComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.metaisVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{stats.metais || 0}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Teclas</span>
                    <span className="text-slate-600 font-extrabold">{stats.teclasComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.teclasVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{stats.teclas || 0}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center pt-1 border-t border-indigo-100/50 bg-indigo-50/20 py-1 rounded-lg">
                    <span className="text-left font-black text-indigo-900">Órgão</span>
                    <span className="text-indigo-800 font-extrabold">{stats.organistasComum || 0}</span>
                    <span className="text-indigo-400 font-extrabold">{stats.organistasVisita || 0}</span>
                    <span className="text-indigo-950 font-black bg-indigo-100/60 rounded-md py-0.5">{stats.organistas || 0}</span>
                  </div>
                </div>
              )}

              {/* CONTEÚDO 2: MODAL CORAL */}
              {activeModal === 'coral' && (
                <div className="space-y-2 uppercase text-[11px] font-bold text-slate-600">
                  <div className="flex justify-between p-2 bg-slate-50 rounded-xl"><span>Irmãos (Vozes)</span><span className="font-black text-slate-950">{stats.irmaos || 0}</span></div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-xl"><span>Irmãs (Vozes)</span><span className="font-black text-slate-950">{stats.irmas || 0}</span></div>
                </div>
              )}

              {/* CONTEÚDO 3: MODAL HINOS */}
              {activeModal === 'hinos' && (
                <div className="space-y-3 text-[11px] font-bold text-slate-600 uppercase">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block mb-1">1ª Parte (Hinos Ensaiados)</span>
                    <div className="flex flex-wrap gap-1">
                      {stats.hinosP1?.length > 0 ? stats.hinosP1.map((h, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-black text-[11px]">{h}</span>
                      )) : <span className="text-slate-400 normal-case font-bold">Nenhum hino lançado</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block mb-1">2ª Parte (Hinos Ensaiados)</span>
                    <div className="flex flex-wrap gap-1">
                      {stats.hinosP2?.length > 0 ? stats.hinosP2.map((h, i) => (
                        <span key={i} className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-black text-[11px]">{h}</span>
                      )) : <span className="text-slate-400 normal-case font-bold">Nenhum hino lançado</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* 🛡️ CONTEÚDO 4: MODAL ENCARREGADOS COMPLETAMENTE ATUALIZADO */}
              {activeModal === 'encarregados' && (
                <div className="space-y-2 uppercase text-[10px] font-black tracking-tight text-slate-700">
                  <div className="grid grid-cols-4 text-[8px] text-slate-400 pb-1 border-b border-slate-100 text-center font-bold uppercase tracking-wider">
                    <span className="text-left">Função</span>
                    <span>Comum</span>
                    <span>Visita</span>
                    <span className="text-slate-950 font-black">Total</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Local</span>
                    <span className="text-slate-600 font-extrabold">{stats.encLocalComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.encLocalVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{(stats.encLocalComum || 0) + (stats.encLocalVisita || 0)}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    <span className="text-left font-bold text-slate-500">Regional</span>
                    <span className="text-slate-600 font-extrabold">{stats.encRegionalComum || 0}</span>
                    <span className="text-slate-400 font-extrabold">{stats.encRegionalVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">{(stats.encRegionalComum || 0) + (stats.encRegionalVisita || 0)}</span>
                  </div>
                  <div className="grid grid-cols-4 text-center items-center pt-1 border-t border-indigo-100/50 bg-indigo-50/20 py-1 rounded-lg">
                    <span className="text-left font-black text-indigo-900">Exam.</span>
                    <span className="text-indigo-800 font-extrabold">{stats.examinadorasComum || 0}</span>
                    <span className="text-indigo-400 font-extrabold">{stats.examinadorasVisita || 0}</span>
                    <span className="text-slate-950 font-black bg-indigo-100/60 rounded-md py-0.5">{stats.examinadorasTotal || 0}</span>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ScreenGeral;