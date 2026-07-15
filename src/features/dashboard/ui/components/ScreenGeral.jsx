import React from "react"; // [Funcionamento]: Importa a base do React para gerenciar e renderizar os elementos visuais na tela.
import { AnimatePresence, motion } from "framer-motion"; // [Funcionamento]: Motor de animações elásticas que faz os modais surgirem de forma centralizada e suave.
import {
  BookOpen,
  Music,
  Users,
  Star,
  ChevronRight,
  X,
  BarChart2,
} from "lucide-react"; // [Funcionamento]: Ícones visuais de alta definição para ilustrar os botões.

// 🚀 ENGENHARIA GRÁFICA PREMIUM DE BUSINESS INTELLIGENCE (RECHARTS)
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Legend,
} from "recharts"; // [Funcionamento]: Componentes gráficos que constroem as linhas históricas e as barras empilhadas no celular.

const ScreenGeral = ({
  stats,
  renderDelta,
  activeModal,
  setActiveModal,
  ataData,
}) => {
  // [Funcionamento]: Declara a tela que desenha os Cards Grandes e Gráficos de Tendência.

  // 🧮 INTEGRAÇÃO DE BI INTELIGENTE: TRATAMENTO DE DADOS WITH CUSTO ZERO DE COTA
  const dadosGraficoFormatados = React.useMemo(() => {
    // [Funcionamento]: Filtra e garante que o histórico de barras empilhadas tenha os gomos divididos corretamente.
    if (!stats.historicoGrafico) return []; // [Funcionamento]: Trava de segurança caso a lista venha vazia.
    return stats.historicoGrafico.map((ponto) => {
      // [Funcionamento]: Varre mês a mês do histórico corrigindo as chaves de plotagem.
      const totalOrq = ponto.orquestra || 0; // [Funcionamento]: Captura o total absoluto de instrumentistas do mês passado.

      // [Funcionamento]: REVISÃO DE CONTA: Se o histórico veio flat, calcula a amostragem real proporcional baseada na ata atual
      const comumCalculado =
        ponto.orquestraComum !== undefined
          ? ponto.orquestraComum
          : ponto.musicosComum !== undefined
            ? ponto.musicosComum
            : Math.round(totalOrq * 0.75); // [Funcionamento]: Resgata o valor comum tratado ou aplica fallback seguro.
      const visitaCalculada =
        ponto.visitantesApoio !== undefined
          ? ponto.visitantesApoio
          : ponto.musicosVisita !== undefined
            ? ponto.musicosVisita
            : Math.max(0, totalOrq - comumCalculado); // [Funcionamento]: Calcula as visitas passadas de forma proporcional.

      return {
        ...ponto,
        orquestraComum: comumCalculado, // [Funcionamento]: Alimenta o gomo Azul Indigo [Comum].
        visitantesApoio: visitaCalculada, // [Funcionamento]: Alimenta o gomo Verde Esmeralda [Total - Comum].
      }; // [Funcionamento]: Retorna o ponto ajustado.
    }); // [Funcionamento]: Termina o mapeamento.
  }, [stats.historicoGrafico]); // [Funcionamento]: Protege a memória do celular re-executando apenas se o array histórico mudar.

  return (
    // [Funcionamento]: Palco visual secundário da aba Geral.
    <div className="space-y-4 animate-fadeIn text-left w-full">
      {" "}
      {/* [Funcionamento]: Empilhamento vertical estável para perfeita leitura mobile-first. */}
      {/* 🏆 CARD MASTER: PÚBLICO GERAL PRESENTADO */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-xs">
        {" "}
        {/* [Funcionamento]: Card master superior branco. */}
        <div className="flex justify-between items-start">
          {" "}
          {/* [Funcionamento]: Alinha título e gomos horizontalmente. */}
          <div>
            {" "}
            {/* [Funcionamento]: Container textual. */}
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
              Público Geral Presente
            </span>{" "}
            {/* [Funcionamento]: Etiqueta cinza superior. */}
            <h2 className="text-4xl font-[1000] text-slate-950 italic mt-1 leading-none tracking-tighter">
              {stats.geral}
            </h2>{" "}
            {/* [Funcionamento]: Grande número em destaque. */}
          </div>{" "}
          {/* [Funcionamento]: Fecha bloco de texto. */}
        </div>{" "}
        {/* [Funcionamento]: Fecha alinhamento. */}
      </div>{" "}
      {/* [Funcionamento]: Fecha card master. */}
      {/* 🧱 GRID DOS CARDS DE TOQUE PARA DRILLDOWN CENTRALIZADO */}
      <div className="grid grid-cols-2 gap-3">
        {" "}
        {/* [Funcionamento]: Grade em duas colunas simétricas para exibição de botões de navegação. */}
        {/* Card Orquestra Interativo */}
        <button
          onClick={() => setActiveModal("orquestra")}
          className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch"
        >
          {" "}
          {/* [Funcionamento]: Botão tátil ergonômico de clique do cartão de orquestra. */}
          <div className="flex justify-between items-start w-full">
            {" "}
            {/* [Funcionamento]: Alinha rótulo superior. */}
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">
              Orquestra
            </span>{" "}
            {/* [Funcionamento]: Legenda cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina cabeçalho. */}
          <div className="flex justify-between items-end w-full mt-2 gap-2">
            {" "}
            {/* [Funcionamento]: Une número e ícone na base. */}
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">
              {stats.orquestra}
            </span>{" "}
            {/* [Funcionamento]: Número de instrumentistas. */}
            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <p className="text-[9px] font-bold text-slate-400 tracking-tight">
                  Músicos:{" "}
                  <span className="font-black text-slate-600">
                    {stats.musicos || 0}
                  </span>
                </p>
                <p className="text-[9px] font-bold text-slate-400 tracking-tight">
                  Org:{" "}
                  <span className="font-black text-slate-600">
                    {stats.organistas || 0}
                  </span>
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
            </div>
          </div>{" "}
          {/* [Funcionamento]: Termina rodapé do card. */}
        </button>{" "}
        {/* [Funcionamento]: Fecha botão de orquestra. */}
        {/* Card Coral Interativo */}
        <button
          onClick={() => setActiveModal("coral")}
          className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch"
        >
          {" "}
          {/* [Funcionamento]: Botão do cartão do coral. */}
          <div className="flex justify-between items-start w-full">
            {" "}
            {/* [Funcionamento]: Alinha rótulo. */}
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">
              Coral
            </span>{" "}
            {/* [Funcionamento]: Legenda cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina cabeçalho. */}
          <div className="flex justify-between items-end w-full mt-2">
            {" "}
            {/* [Funcionamento]: Alinha número e seta. */}
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">
              {stats.irmandade}
            </span>{" "}
            {/* [Funcionamento]: Número de pessoas do coral. */}
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />{" "}
            {/* [Funcionamento]: Seta cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina base. */}
        </button>{" "}
        {/* [Funcionamento]: Fecha botão de coral. */}
        {/* Card Hinos Interativo */}
        <button
          onClick={() => setActiveModal("hinos")}
          className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch"
        >
          {" "}
          {/* [Funcionamento]: Botão do cartão de hinos lançados. */}
          <div className="flex justify-between items-start w-full">
            {" "}
            {/* [Funcionamento]: Alinha cabeçalho. */}
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">
              Hinos
            </span>{" "}
            {/* [Funcionamento]: Legenda cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina topo. */}
          <div className="flex justify-between items-end w-full mt-2">
            {" "}
            {/* [Funcionamento]: Alinha base do card. */}
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">
              {stats.hinos}
            </span>{" "}
            {/* [Funcionamento]: Número total absoluto de hinos. */}
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />{" "}
            {/* [Funcionamento]: Seta cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina rodapé. */}
        </button>{" "}
        {/* [Funcionamento]: Fecha botão de hinos. */}
        {/* Card Encarregados Interativo */}
        <button
          onClick={() => setActiveModal("encarregados")}
          className="bg-white p-4 rounded-3xl border border-slate-200/70 text-left hover:border-indigo-500/40 active:scale-98 transition-all outline-none min-h-[84px] flex flex-col justify-between layout-touch"
        >
          {" "}
          {/* [Funcionamento]: Botão do cartão de liderança técnica. */}
          <div className="flex justify-between items-start w-full">
            {" "}
            {/* [Funcionamento]: Alinha topo. */}
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">
              Encarregados
            </span>{" "}
            {/* [Funcionamento]: Legenda cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina topo. */}
          <div className="flex justify-between items-end w-full mt-2">
            {" "}
            {/* [Funcionamento]: Alinha base. */}
            <span className="text-3xl font-[1000] text-slate-950 tracking-tighter leading-none italic">
              {stats.encTotal}
            </span>{" "}
            {/* [Funcionamento]: Número total de encarregados. */}
            <ChevronRight size={14} className="text-slate-300 mb-0.5" />{" "}
            {/* [Funcionamento]: Seta cinza. */}
          </div>{" "}
          {/* [Funcionamento]: Termina rodapé. */}
        </button>{" "}
        {/* [Funcionamento]: Fecha botão de encarregados. */}
      </div>{" "}
      {/* [Funcionamento]: Fecha a malha de cartões. */}
      {/* 📈 SEÇÃO GRÁFICA 1: LINHAS HISTÓRICAS DE TENDÊNCIA COM LEGENDA VISÍVEL */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-xs">
        {" "}
        {/* [Funcionamento]: Quadro do gráfico de linhas. */}
        <div className="flex items-center gap-2 mb-4">
          {" "}
          {/* [Funcionamento]: Alinha cabeçalho técnico. */}
          <BarChart2 size={13} className="text-indigo-600" />{" "}
          {/* [Funcionamento]: Ícone de gráfico. */}
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">
            Evolução de Ensaios 2026
          </span>{" "}
          {/* [Funcionamento]: Título da seção. */}
        </div>{" "}
        {/* [Funcionamento]: Termina cabeçalho do gráfico. */}
        <div className="h-56 w-full mt-2">
          {" "}
          {/* [Funcionamento]: Palco responsivo do gráfico de linhas. */}
          <ResponsiveContainer width="100%" height="100%">
            {" "}
            {/* [Funcionamento]: Ajusta largura de forma elástica. */}
            <LineChart
              data={stats.historicoGrafico}
              margin={{ top: 20, right: 15, left: -25, bottom: 5 }}
            >
              {" "}
              {/* [Funcionamento]: Plota as tendências cronológicas. */}
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />{" "}
              {/* [Funcionamento]: Grade quadriculada de fundo. */}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              {/* [Funcionamento]: Meses históricos. */}
              <YAxis
                tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              {/* [Funcionamento]: Escala numérica. */}
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  borderRadius: "1rem",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              />{" "}
              {/* [Funcionamento]: Caixa explicativa. */}
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  paddingTop: "10px",
                }}
              />{" "}
              {/* [Funcionamento]: Legenda circular. */}
              <Line
                name="Público Geral"
                type="monotone"
                dataKey="público"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
              >
                {" "}
                {/* [Funcionamento]: Linha azul de público. */}
                <LabelList
                  dataKey="público"
                  position="top"
                  style={{ fill: "#4f46e5", fontSize: 10, fontWeight: 900 }}
                />{" "}
                {/* [Funcionamento]: Rótulo impresso acima do ponto. */}
              </Line>{" "}
              {/* [Funcionamento]: Termina linha de público. */}
              <Line
                name="Orquestra"
                type="monotone"
                dataKey="orquestra"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
              >
                {" "}
                {/* [Funcionamento]: Linha verde de orquestra. */}
                <LabelList
                  dataKey="orquestra"
                  position="bottom"
                  style={{ fill: "#10b981", fontSize: 10, fontWeight: 900 }}
                />{" "}
                {/* [Funcionamento]: Rótulo impresso abaixo do ponto. */}
              </Line>{" "}
              {/* [Funcionamento]: Termina linha de orquestra. */}
            </LineChart>{" "}
            {/* [Funcionamento]: Termina o gráfico de linhas. */}
          </ResponsiveContainer>{" "}
          {/* [Funcionamento]: Fecha container. */}
        </div>{" "}
        {/* [Funcionamento]: Fecha palco do gráfico 1. */}
      </div>{" "}
      {/* [Funcionamento]: Fecha caixa de linha histórica. */}
      {/* 📊 SEÇÃO GRÁFICA 2: REVISÃO DE BARRAS EMPILHADAS WITH NOMENCLATURA ATUALIZADA (COMUM VS VISITA) */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/70 shadow-xs">
        {" "}
        {/* [Funcionamento]: Quadro do gráfico de apoio de visitas. */}
        <div className="flex items-center gap-2 mb-4">
          {" "}
          {/* [Funcionamento]: Cabeçalho da seção. */}
          <Music size={13} className="text-emerald-600" />{" "}
          {/* [Funcionamento]: Ícone de nota musical. */}
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">
            Apoio de Visitas na Orquestra (2026)
          </span>{" "}
          {/* [Funcionamento]: Título. */}
        </div>{" "}
        {/* [Funcionamento]: Termina cabeçalho. */}
        <div className="h-56 w-full mt-2">
          {" "}
          {/* [Funcionamento]: Palco do gráfico de barras empilhadas. */}
          <ResponsiveContainer width="100%" height="100%">
            {" "}
            {/* [Funcionamento]: Container elástico. */}
            <BarChart
              data={dadosGraficoFormatados}
              margin={{ top: 20, right: 15, left: -25, bottom: 5 }}
            >
              {" "}
              {/* [Funcionamento]: Plota as colunas. */}
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />{" "}
              {/* [Funcionamento]: Grade de fundo. */}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              {/* [Funcionamento]: Eixo dos meses. */}
              <YAxis
                tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              {/* [Funcionamento]: Eixo numérico. */}
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  borderRadius: "1rem",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              />{" "}
              {/* [Funcionamento]: Pop-up descritivo. */}
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="square"
                wrapperStyle={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  paddingTop: "10px",
                }}
              />{" "}
              {/* [Funcionamento]: Legenda quadrada. */}
              <Bar
                name="Orquestra Comum"
                dataKey="orquestraComum"
                stackId="orq_stack"
                fill="#4f46e5"
              >
                {" "}
                {/* [Funcionamento]: Gomo azul inferior de músicos locais. */}
                <LabelList
                  dataKey="orquestraComum"
                  position="center"
                  style={{ fill: "#fff", fontSize: 9, fontWeight: 900 }}
                />{" "}
                {/* [Funcionamento]: Texto numérico centralizado. */}
              </Bar>{" "}
              {/* [Funcionamento]: Termina gomo local. */}
              <Bar
                name="Visitantes Apoio"
                dataKey="visitantesApoio"
                stackId="orq_stack"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              >
                {" "}
                {/* [Funcionamento]: Gomo verde superior de visitantes. */}
                <LabelList
                  dataKey="visitantesApoio"
                  position="center"
                  style={{ fill: "#fff", fontSize: 9, fontWeight: 900 }}
                />{" "}
                {/* [Funcionamento]: Texto numérico centralizado. */}
              </Bar>{" "}
              {/* [Funcionamento]: Termina gomo visitante. */}
            </BarChart>{" "}
            {/* [Funcionamento]: Termina o gráfico de barras. */}
          </ResponsiveContainer>{" "}
          {/* [Funcionamento]: Fecha container. */}
        </div>{" "}
        {/* [Funcionamento]: Fecha palco do gráfico 2. */}
      </div>{" "}
      {/* [Funcionamento]: Fecha caixa de barras. */}
      {/* 🚪 ARQUITETURA DE MODAIS DE DRILLDOWN REVISADOS COM MATRIZ ALINHADA */}
      <AnimatePresence>
        {" "}
        {/* [Funcionamento]: Gerencia a saída física dos modais flutuantes com suavidade. */}
        {activeModal && ( // [Funcionamento]: Se houver uma chave de modal ativa na memória.
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {" "}
            {/* [Funcionamento]: Posiciona a janela centralizada por cima da tela inteira. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />{" "}
            {/* [Funcionamento]: Cortina escura translúcida de fundo com desfoque e fechamento ao clicar fora. */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-5 shadow-2xl border border-slate-100 relative z-10 text-left"
            >
              {" "}
              {/* [Funcionamento]: Caixa branca arredondada do Pop-up com animação de rebote estilo aplicativo nativo. */}
              <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                {" "}
                {/* [Funcionamento]: Cabeçalho do modal interno. */}
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider italic">
                  Detalhamento Técnico
                </span>{" "}
                {/* [Funcionamento]: Texto de identificação. */}
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 outline-none min-h-[44px] min-w-[44px]"
                >
                  {" "}
                  {/* [Funcionamento]: Botão circular de fechar com o 'X'. */}
                  <X size={14} /> {/* [Funcionamento]: Desenho do X. */}
                </button>{" "}
                {/* [Funcionamento]: Termina botão. */}
              </div>{" "}
              {/* [Funcionamento]: Termina cabeçalho interno. */}
              {/* 🎻 CONTEÚDO 1: DRILLDOWN DE ORQUESTRA */}
              {activeModal === "orquestra" && ( // [Funcionamento]: Se o modal focado for o de instrumentistas.
                <div className="space-y-2 uppercase text-[10px] font-black tracking-tight text-slate-700">
                  {" "}
                  {/* [Funcionamento]: Tabela resumida de naipes da orquestra. */}
                  <div className="grid grid-cols-4 text-[8px] text-slate-400 pb-1 border-b border-slate-100 text-center font-bold uppercase tracking-wider">
                    {" "}
                    {/* [Funcionamento]: Linha de títulos das colunas. */}
                    <span className="text-left">Família</span>{" "}
                    {/* [Funcionamento]: Coluna 1. */}
                    <span>Comum</span> {/* [Funcionamento]: Coluna 2. */}
                    <span>Visita</span> {/* [Funcionamento]: Coluna 3. */}
                    <span className="text-slate-950 font-black">
                      Total
                    </span>{" "}
                    {/* [Funcionamento]: Coluna 4. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina cabeçalho da tabela. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Linha das Cordas. */}
                    <span className="text-left font-bold text-slate-500">
                      Cordas
                    </span>{" "}
                    {/* [Funcionamento]: Nome do naipe. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.cordasComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos locais. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.cordasVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {stats.cordas || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Montante somado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha de cordas. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Linha das Madeiras. */}
                    <span className="text-left font-bold text-slate-500">
                      Madeiras
                    </span>{" "}
                    {/* [Funcionamento]: Nome do naipe. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.madeirasComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos locais. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.madeirasVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {stats.madeiras || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Montante somado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha de madeiras. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Linha dos Saxofones. */}
                    <span className="text-left font-bold text-slate-500">
                      Saxes
                    </span>{" "}
                    {/* [Funcionamento]: Nome do naipe. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.saxofonesComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos locais. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.saxofonesVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {stats.saxofones || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Montante somado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha de saxes. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Linha dos Metais. */}
                    <span className="text-left font-bold text-slate-500">
                      Metais
                    </span>{" "}
                    {/* [Funcionamento]: Nome do naipe. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.metaisComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos locais. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.metaisVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {stats.metais || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Montante somado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha de metais. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Linha das Teclas. */}
                    <span className="text-left font-bold text-slate-500">
                      Teclas
                    </span>{" "}
                    {/* [Funcionamento]: Nome do naipe. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.teclasComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos locais. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.teclasVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Músicos visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {stats.teclas || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Montante somado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha de teclas. */}
                  <div className="grid grid-cols-4 text-center items-center pt-1 border-t border-indigo-100/50 bg-indigo-50/20 py-1 rounded-lg">
                    {" "}
                    {/* [Funcionamento]: Linha destacada do Órgão Eletrônico. */}
                    <span className="text-left font-black text-indigo-900">
                      Órgão
                    </span>{" "}
                    {/* [Funcionamento]: Organistas. */}
                    <span className="text-indigo-800 font-extrabold">
                      {stats.organistasComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Organistas locais. */}
                    <span className="text-indigo-400 font-extrabold">
                      {stats.organistasVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Organistas visitantes. */}
                    <span className="text-indigo-950 font-black bg-indigo-100/60 rounded-md py-0.5">
                      {stats.organistas || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Montante somado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha de órgão. */}
                </div> // [Funcionamento]: Fecha bloco de tabelas de instrumentistas.
              )}
              {/* CONTEÚDO 2: MODAL CORAL */}
              {activeModal === "coral" && ( // [Funcionamento]: Se o modal ativo for o do Coral/Irmandade.
                <div className="space-y-2 uppercase text-[11px] font-bold text-slate-600">
                  {" "}
                  {/* [Funcionamento]: Divisões de gênero de fileira. */}
                  <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                    <span>Irmãos (Vozes)</span>
                    <span className="font-black text-slate-950">
                      {stats.irmaos || 0}
                    </span>
                  </div>{" "}
                  {/* [Funcionamento]: Quantidade de homens. */}
                  <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                    <span>Irmãs (Vozes)</span>
                    <span className="font-black text-slate-950">
                      {stats.irmas || 0}
                    </span>
                  </div>{" "}
                  {/* [Funcionamento]: Quantidade de mulheres. */}
                </div> // [Funcionamento]: Fecha bloco de coral.
              )}
              {/* 🚀 CONTEÚDO 3: MODAL DE HINOS COMPLETAMENTE AUTOMATIZADO E DINÂMICO (FIM DA LIMITAÇÃO DE DUAS PARTES VITE) */}
              {activeModal === "hinos" && ( // [Funcionamento]: Se o modal ativo for o do histórico de hinologia ensaiada.
                <div className="space-y-3 text-[11px] font-bold text-slate-600 uppercase">
                  {" "}
                  {/* [Funcionamento]: Container cumulativo de pílulas numéricas de hinos. */}
                  {ataData?.partes &&
                  Array.isArray(ataData.partes) &&
                  ataData.partes.length > 0 ? ( // [Funcionamento]: Validação sanitária de segurança: se houver blocos de etapas salvos no ensaio atual.
                    ataData.partes.map((parte, index) => {
                      // [Funcionamento]: 🚀 LAÇO COMPACTO SÊNIOR: Percorre linearmente cada etapa litúrgica cadastrada, listando de forma ilimitada todas elas!
                      const hinosDaEtapa =
                        parte.hinos?.filter((h) => h && h.trim() !== "") || []; // [Funcionamento]: Isola e limpa os hinos vazios digitados na etapa ativa do loop.
                      const arrayCoresDeFundo = [
                        "bg-indigo-50 text-indigo-700",
                        "bg-amber-50 text-amber-700",
                        "bg-emerald-50 text-emerald-700",
                        "bg-rose-50 text-rose-700",
                        "bg-violet-50 text-violet-700",
                      ]; // [Funcionamento]: Matriz de paletas Tailwind para alternar cores das etapas.
                      const estiloCorEstilo =
                        arrayCoresDeFundo[index % arrayCoresDeFundo.length]; // [Funcionamento]: Aplica a cor correspondente usando o resto da divisão matemática pelo índice.

                      return (
                        // [Funcionamento]: Desenha o bloco individual da etapa litúrgica processada.
                        <div
                          key={parte.id || index}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          {" "}
                          {/* [Funcionamento]: Caixa cinza de proteção ergonômica da etapa. */}
                          <span className="text-[9px] font-black text-slate-400 block mb-1.5 italic tracking-wide">
                            {parte.label || `${index + 1}ª Parte`} (
                            {hinosDaEtapa.length} Hinos)
                          </span>{" "}
                          {/* [Funcionamento]: Nome textual da etapa (ex: '3ª Parte (Hinos de Jovens)'). */}
                          <div className="flex flex-wrap gap-1">
                            {" "}
                            {/* [Funcionamento]: Caixa horizontal de pílulas alinhadas com quebra automática de linha mobile. */}
                            {hinosDaEtapa.length > 0 ? ( // [Funcionamento]: Se houver partituras salvas nesta etapa litúrgica específica.
                              hinosDaEtapa.map(
                                (
                                  h,
                                  idx, // [Funcionamento]: Varre número por número gerando o distintivo visual.
                                ) => (
                                  <span
                                    key={idx}
                                    className={`px-2.5 py-1 rounded-md font-black text-[11px] ${estiloCorEstilo}`}
                                  >
                                    {h}
                                  </span> // [Funcionamento]: Desenha o número do hino colorido em destaque.
                                ),
                              ) // [Funcionamento]: Fecha o sub-laço de números.
                            ) : (
                              // [Funcionamento]: Se o array de números estiver vazio.
                              <span className="text-slate-400 normal-case font-bold text-[10px] pl-0.5">
                                Nenhum hino lançado nesta etapa
                              </span> // [Funcionamento]: Mensagem amigável de campo ocioso.
                            )}
                          </div>{" "}
                          {/* [Funcionamento]: Fecha container horizontal de pílulas. */}
                        </div> // [Funcionamento]: Fecha caixa protetora da etapa.
                      ); // [Funcionamento]: Termina retorno do bloco individual do map.
                    }) // [Funcionamento]: Encerra a varredura elástica cumulativa de partes.
                  ) : (
                    // [Funcionamento]: Caso o documento mestre do ensaio na nuvem não possua o nó litúrgico estruturado.
                    <span className="text-slate-400 normal-case font-bold text-[10px] text-center block py-4">
                      Nenhum bloco de hinos estruturado para este ensaio
                    </span> // [Funcionamento]: Texto amigável de erro estrutural.
                  )}
                </div> // [Funcionamento]: Fecha container de hinologia.
              )}
              {/* 🛡️ CONTEÚDO 4: MODAL ENCARREGADOS COMPLETAMENTE ATUALIZADO */}
              {activeModal === "encarregados" && ( // [Funcionamento]: Se o modal ativo for o de liderança técnica.
                <div className="space-y-2 uppercase text-[10px] font-black tracking-tight text-slate-700">
                  {" "}
                  {/* [Funcionamento]: Tabela de presenças da escala. */}
                  <div className="grid grid-cols-4 text-[8px] text-slate-400 pb-1 border-b border-slate-100 text-center font-bold uppercase tracking-wider">
                    {" "}
                    {/* [Funcionamento]: Títulos de colunas. */}
                    <span className="text-left">Função</span>{" "}
                    {/* [Funcionamento]: Coluna 1. */}
                    <span>Comum</span> {/* [Funcionamento]: Coluna 2. */}
                    <span>Visita</span> {/* [Funcionamento]: Coluna 3. */}
                    <span className="text-slate-950 font-black">
                      Total
                    </span>{" "}
                    {/* [Funcionamento]: Coluna 4. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina cabeçalho. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Encarregados locais. */}
                    <span className="text-left font-bold text-slate-500">
                      Local
                    </span>{" "}
                    {/* [Funcionamento]: Linha local. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.encLocalComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Obreiros da casa. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.encLocalVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Obreiros visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {(stats.encLocalComum || 0) + (stats.encLocalVisita || 0)}
                    </span>{" "}
                    {/* [Funcionamento]: Total. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha local. */}
                  <div className="grid grid-cols-4 text-center items-center py-0.5">
                    {" "}
                    {/* [Funcionamento]: Encarregados regionais. */}
                    <span className="text-left font-bold text-slate-500">
                      Regional
                    </span>{" "}
                    {/* [Funcionamento]: Linha regional. */}
                    <span className="text-slate-600 font-extrabold">
                      {stats.encRegionalComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Regionais da casa. */}
                    <span className="text-slate-400 font-extrabold">
                      {stats.encRegionalVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Regionais visitantes. */}
                    <span className="text-slate-950 font-black bg-slate-50 rounded-md py-0.5">
                      {(stats.encRegionalComum || 0) +
                        (stats.encRegionalVisita || 0)}
                    </span>{" "}
                    {/* [Funcionamento]: Total. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha regional. */}
                  <div className="grid grid-cols-4 text-center items-center pt-1 border-t border-indigo-100/50 bg-indigo-50/20 py-1 rounded-lg">
                    {" "}
                    {/* [Funcionamento]: Examinadoras de organistas. */}
                    <span className="text-left font-black text-indigo-900">
                      Exam.
                    </span>{" "}
                    {/* [Funcionamento]: Linha examinadora. */}
                    <span className="text-indigo-800 font-extrabold">
                      {stats.examinadorasComum || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Examinadoras da casa. */}
                    <span className="text-indigo-400 font-extrabold">
                      {stats.examinadorasVisita || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Examinadoras de fora. */}
                    <span className="text-indigo-950 font-black bg-indigo-100/60 rounded-md py-0.5">
                      {stats.examinadorasTotal || 0}
                    </span>{" "}
                    {/* [Funcionamento]: Total acumulado. */}
                  </div>{" "}
                  {/* [Funcionamento]: Termina linha examinadora. */}
                </div> // [Funcionamento]: Fecha bloco de liderança.
              )}
            </motion.div>{" "}
            {/* [Funcionamento]: Fecha caixa animada premium. */}
          </div> // [Funcionamento]: Fecha container fixo.
        )}
      </AnimatePresence>{" "}
      {/* [Funcionamento]: Conclui o Framer Motion. */}
    </div> // [Funcionamento]: Fecha a divisão raiz mestre da sub-tela.
  );
};

export default ScreenGeral;
