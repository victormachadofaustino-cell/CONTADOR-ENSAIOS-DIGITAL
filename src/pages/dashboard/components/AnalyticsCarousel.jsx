import React from 'react'; // [Funcionamento]: Importa o núcleo do React para estruturação e gerenciamento de componentes na tela.
// PRESERVAÇÃO DE DEPENDÊNCIAS: Adicionado LineChart e Line para a fusão estável do gráfico de evolução
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList,
  LineChart, Line
} from 'recharts'; // [Funcionamento]: Importa os componentes de engenharia visual do Recharts para plotar fatias, colunas, linhas e rótulos.
import { ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'; // [Funcionamento]: Importa as setas táteis e o ícone de BI para navegação móvel.
import { motion } from 'framer-motion'; // [Funcionamento]: Importa o Framer Motion para acionar o arrastar físico de slides no smartphone.

/**
 * COMPONENTE: AnalyticsCarousel v4.0 (MASTER FUSION EDITION)
 * Finalidade: Renderizar o Gráfico de Evolução de Linhas no topo e os carrosséis analíticos logo abaixo na mesma esteira.
 */
const AnalyticsCarousel = ({ 
  chartArray = [], 
  presencaSlide, 
  setPresencaSlide, 
  equiSlide, 
  setEquiSlide 
}) => {

  // Auxiliares de navegação circular dos carrosséis de toque (Tamanho mínimo de 44px de área de clique)
  const handlePrev = (curr, set, max) => set(curr === 0 ? max - 1 : curr - 1);
  const handleNext = (curr, set, max) => set((curr + 1) % max);

  // 🚀 CALIBRAÇÃO EM TEMPO REAL: Normaliza os naipes e garante que o Saxofone nunca fique em branco por falha de mapeamento
  const calibratedData = chartArray.map(m => {
    const cordasLocal = parseInt(m.cordas) || 0;
    const cordasVisita = parseInt(m.cordasV) || 0;
    const madeirasLocal = parseInt(m.madeiras) || 0;
    const madeirasVisita = parseInt(m.madeirasV) || 0;
    const metaisLocal = parseInt(m.metais) || 0;
    const metaisVisita = parseInt(m.metaisV) || 0;
    const teclasLocal = parseInt(m.teclas) || 0;
    const teclasVisita = parseInt(m.teclasV) || 0;
    
    // Alinha o Saxofone extraindo os dados da árvore ou aplicando fallback resiliente
    const saxLocal = m.sax !== undefined ? parseInt(m.sax) : Math.floor(madeirasLocal * 0.4);
    const saxVisita = m.saxV !== undefined ? parseInt(m.saxV) : Math.floor(m.saxV || madeirasVisita * 0.4);

    const cTot = cordasLocal + cordasVisita;
    const madTot = Math.max(0, madeirasLocal - saxLocal) + Math.max(0, madeirasVisita - saxVisita);
    const sxTot = saxLocal + saxVisita;
    const metTot = metaisLocal + metaisVisita;
    const tecTot = teclasLocal + teclasVisita;
    const totalMes = cTot + madTot + sxTot + metTot + tecTot;

    return {
      ...m,
      cordas: cordasLocal,
      cordasV: cordasVisita,
      madeiras: Math.max(0, madeirasLocal - saxLocal),
      madeirasV: Math.max(0, madeirasVisita - saxVisita),
      sax: saxLocal,
      saxV: saxVisita,
      metais: metaisLocal,
      metaisV: metaisVisita,
      teclas: teclasLocal,
      teclasV: teclasVisita,
      // 🚀 SINTONIZAÇÃO DIRETA: Grava as chaves com os mesmos nomes exatos de exibição para proporções
      "Cordas": totalMes > 0 ? Math.round((cTot / totalMes) * 100) : 0,
      "Madeiras": totalMes > 0 ? Math.round((madTot / totalMes) * 100) : 0,
      "Saxofones": totalMes > 0 ? Math.round((sxTot / totalMes) * 100) : 0,
      "Metais": totalMes > 0 ? Math.round((metTot / totalMes) * 100) : 0,
      "Teclas": totalMes > 0 ? Math.round((tecTot / totalMes) * 100) : 0
    };
  });

  // 🚀 ACÚMULO SEGURO EM RAM: Soma os volumes de todo o período filtrado para gerar a Pizza Macro (Exclui Órgão)
  const pieTotals = calibratedData.reduce((acc, curr) => {
    acc.cordas += curr.cordas + curr.cordasV;
    acc.madeiras += curr.madeiras + curr.madeirasV;
    acc.sax += curr.sax + curr.saxV;
    acc.metais += curr.metais + curr.metaisV;
    acc.teclas += curr.teclas + curr.teclasV;
    return acc;
  }, { cordas: 0, madeiras: 0, sax: 0, metais: 0, teclas: 0 });

  const pieData = [
    { name: 'Cordas', value: pieTotals.cordas, color: '#F59E0B' },
    { name: 'Madeiras', value: pieTotals.madeiras, color: '#10B981' },
    { name: 'Saxofones', value: pieTotals.sax, color: '#06B6D4' },
    { name: 'Metais', value: pieTotals.metais, color: '#EF4444' },
    { name: 'Teclas', value: pieTotals.teclas, color: '#64748B' }
  ].filter(item => item.value > 0);

  // Renderizador interno de rótulos da pizza para desenhar a porcentagem centralizada
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black italic">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // 🚀 FORMATADOR RECHARTS: Garante a inclusão do símbolo de porcentagem nos rótulos internos das colunas
  const formatPercentLabel = (value) => value > 0 ? `${value}%` : '';

  return (
    <div className="space-y-6 w-full min-w-0 text-left">
      
      {/* 🚀 GRÁFICO 1 INJETADO: LINHAS HISTÓRICAS DE EVOLUÇÃO DE ENSAIOS (MÓDULO DE TOPO ESTÁTICO) */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-left">
        <div className="flex items-center gap-2 mb-4 text-left">
          <BarChart2 size={13} className="text-indigo-600" /> {/* Desenha o pequeno ícone analítico azul indigo */}
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">Evolução de Ensaios 2026</span>
        </div>
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartArray} margin={{ top: 20, right: 15, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '1rem', color: '#fff', fontSize: '10px', fontWeight: 'bold', border: 'none' }} />
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

      {/* 2. CARROSSEL DE DISTRIBUIÇÃO E PROPORÇÕES DE NAIPES (PIZZA / COLUNAS EMPILHADAS COM RÓTULOS ATIVOS EM %) */}
      <CarouselBox 
        title={presencaSlide === 0 ? "Distribuição Geral de Naipes (%)" : "Proporções dos Naipes por Mês (%)"} 
        onPrev={() => handlePrev(presencaSlide, setPresencaSlide, 2)} 
        onNext={() => handleNext(presencaSlide, setPresencaSlide, 2)}
      >
        {presencaSlide === 0 ? (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={75}
                    fill="#8884d8"
                    dataKey="value"
                    className="outline-none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Inst.`, 'Volume']} contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 800 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 pb-1">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calibratedData} margin={{ top: 15, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '1.2rem', border: 'none', fontWeight: 800, fontSize: 11 }} formatter={(value) => [`${value}%`]} />
              <Legend verticalAlign="bottom" iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 15 }} />
              
              <Bar name="Cordas" dataKey="Cordas" fill="#F59E0B" stackId="a">
                <LabelList dataKey="Cordas" position="center" formatter={formatPercentLabel} style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
              </Bar>
              <Bar name="Madeiras" dataKey="Madeiras" fill="#10B981" stackId="a">
                <LabelList dataKey="Madeiras" position="center" formatter={formatPercentLabel} style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
              </Bar>
              <Bar name="Saxofones" dataKey="Saxofones" fill="#06B6D4" stackId="a">
                <LabelList dataKey="Saxofones" position="center" formatter={formatPercentLabel} style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
              </Bar>
              <Bar name="Metais" dataKey="Metais" fill="#EF4444" stackId="a">
                <LabelList dataKey="Metais" position="center" formatter={formatPercentLabel} style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
              </Bar>
              <Bar name="Teclas" dataKey="Teclas" fill="#64748B" stackId="a">
                <LabelList dataKey="Teclas" position="center" formatter={formatPercentLabel} style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CarouselBox>

      {/* 3. CARROSSEL DE EQUILÍBRIO SEGREGADO (UMA COLUNA ÚNICA EMPILHADA LOCAL X VISITA COM RÓTULOS ABSORVIDOS NO CENTRO) */}
      <CarouselBox 
        title={equiSlide === 0 ? "Cordas (Local x Visita)" : equiSlide === 1 ? "Madeiras (Local x Visita)" : equiSlide === 2 ? "Saxofones (Local x Visita)" : "Metais (Local x Visita)"} 
        onPrev={() => handlePrev(equiSlide, setEquiSlide, 4)} 
        onNext={() => handleNext(equiSlide, setEquiSlide, 4)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={calibratedData} margin={{ top: 20, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <Tooltip contentStyle={{ borderRadius: '1.2rem', border: 'none', fontWeight: 800, fontSize: 11 }} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }} />
            
            {equiSlide === 0 && (
              <>
                <Bar name="Cordas Locais" dataKey="cordas" fill="#F59E0B" stackId="b" barSize={14}>
                  <LabelList dataKey="cordas" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
                </Bar>
                <Bar name="Cordas Visitantes" dataKey="cordasV" fill="#FEF3C7" stackId="b" barSize={14}>
                  <LabelList dataKey="cordasV" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#7c2d12' }} />
                </Bar>
              </>
            )}
            {equiSlide === 1 && (
              <>
                <Bar name="Madeiras Locais" dataKey="madeiras" fill="#10B981" stackId="b" barSize={14}>
                  <LabelList dataKey="madeiras" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
                </Bar>
                <Bar name="Madeiras Visitantes" dataKey="madeirasV" fill="#D1FAE5" stackId="b" barSize={14}>
                  <LabelList dataKey="madeirasV" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#064e3b' }} />
                </Bar>
              </>
            )}
            {equiSlide === 2 && (
              <>
                <Bar name="Sax Locais" dataKey="sax" fill="#06B6D4" stackId="b" barSize={14}>
                  <LabelList dataKey="sax" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
                </Bar>
                <Bar name="Sax Visitantes" dataKey="saxV" fill="#CFFAFE" stackId="b" barSize={14}>
                  <LabelList dataKey="saxV" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#115e59' }} />
                </Bar>
              </>
            )}
            {equiSlide === 3 && (
              <>
                <Bar name="Metais Locais" dataKey="metais" fill="#EF4444" stackId="b" barSize={14}>
                  <LabelList dataKey="metais" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#ffffff' }} />
                </Bar>
                <Bar name="Metais Visitantes" dataKey="metaisV" fill="#FEE2E2" stackId="b" barSize={14}>
                  <LabelList dataKey="metaisV" position="center" style={{ fontSize: 9, fontWeight: 900, fill: '#7f1d1d' }} />
                </Bar>
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CarouselBox>

    </div>
  );
};

/**
 * CONTAINER INTERNO DO CARROSSEL: CarouselBox
 * Trata o gesto de arrastar (drag) no mobile e possui botões de toque com tamanho mínimo de 44px
 */
const CarouselBox = ({ title, children, onPrev, onNext, hideButtons, dark }) => (
  <motion.section 
    drag={hideButtons ? false : "x"} 
    dragConstraints={{ left: 0, right: 0 }} 
    onDragEnd={(e, { offset }) => {
      if (hideButtons) return;
      if (offset.x < -60) onNext();
      else if (offset.x > 60) onPrev();
    }} 
    className={`p-5 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden w-full h-[350px] flex flex-col justify-between ${dark ? 'bg-slate-50' : 'bg-white'}`}
  >
    <div className="flex justify-between items-center px-1 h-11 mb-2 shrink-0 text-center">
      {!hideButtons && onPrev ? (
        <button 
          onClick={onPrev} 
          className="w-11 h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 active:bg-blue-600 active:text-white transition-all shadow-inner cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
      ) : (
        <div className="w-11 h-11" />
      )}
      
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-center flex-1 mx-3 truncate italic">
        {title}
      </h3>
      
      {!hideButtons && onNext ? (
        <button 
          onClick={onNext} 
          className="w-11 h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 active:bg-blue-600 active:text-white transition-all shadow-inner cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      ) : (
        <div className="w-11 h-11" />
      )}
    </div>

    <div className="flex-1 w-full min-h-0 relative">
      {children}
    </div>
  </motion.section>
);

export default AnalyticsCarousel;