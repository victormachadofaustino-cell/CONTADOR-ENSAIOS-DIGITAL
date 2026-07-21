import React, { useState } from "react"; // [Funcionamento]: Traz o coração do React e a caixa de memória useState para gerenciar janelas e limites de paginação locais.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts"; // [Funcionamento]: Traz o motor de engenharia gráfica do Recharts para desenhar colunas, eixos e tabelas de ranking.
import {
  Music,
  Users,
  ShieldCheck,
  CheckCircle2,
  PieChart,
  X,
  BarChart3,
  ArrowRight,
} from "lucide-react"; // [Funcionamento]: Traz os ícones visuais do pacote Lucide para ilustrar cada assunto.
import { motion, AnimatePresence } from "framer-motion"; // [Funcionamento]: Traz o motor de animações para fazer o modal surgir centralizado com suavidade estilo app nativo.

/**
 * COMPONENTE PRINCIPAL: MetricCardsGroup v7.2 (ALINHAMENTO LITÚRGICO BLINDADO)
 * Finalidade: Exibir os resumos em cards horizontais e acoplar o Ranking Litúrgico Premium de Hinos corrigido contra cortes de 3 dígitos.
 */
const MetricCardsGroup = ({
  tM,
  tO,
  tI,
  tEnc,
  tH,
  totalMeses,
  chartArray,
  topHinos = [],
}) => {
  // [Funcionamento]: Recebe as variáveis globais calculadas pelo hook analítico direto do componente pai.
  // Caixa de memória que monitora qual modal de detalhamento de cartões está aberto no centro do celular (null = nenhum)
  const [activeDetail, setActiveDetail] = useState(null);

  // CONTROLADOR LITÚRGICO LOCAL: Monitora quantas linhas (3, 5, 10 ou 15) o usuário deseja ver listadas no ranking de hinos.
  const [topLimit, setTopLimit] = useState(5);

  // Cálculos de médias feitos de forma protegida contra divisões por zero
  const avgM = totalMeses > 0 ? (tM / totalMeses).toFixed(0) : 0; // [Funcionamento]: Divide os músicos locais pelo número de meses ativos arredondando o valor.
  const avgO = totalMeses > 0 ? (tO / totalMeses).toFixed(0) : 0; // [Funcionamento]: Divide as organistas locais pelo número de meses ativos arredondando o valor.
  const avgI = totalMeses > 0 ? (tI / totalMeses).toFixed(0) : 0; // [Funcionamento]: Divide os membros do coral pelo número de meses ativos arredondando o valor.
  const avgEnc = totalMeses > 0 ? (tEnc / totalMeses).toFixed(1) : 0; // [Funcionamento]: Divide os condutores ativos pelo número de meses preservando uma casa decimal.
  const avgH = totalMeses > 0 ? (tH / totalMeses).toFixed(0) : 0; // [Funcionamento]: Divide a volumetria de hinos cantados pelo número de meses ativos.

  return (
    // [Funcionamento]: Inicia a renderização do layout visível do quadrante executivo no navegador.
    <div className="space-y-5 w-full text-left">
      {" "}
      {/* [Funcionamento]: Caixa agrupadora que empilha verticalmente os cartões e o bloco do ranking com espaçamento simétrico. */}
      {/* 1. CARD: ORQUESTRA ATIVA (COMUM X VISITAS) */}
      <BigNumberCard
        id="orquestra"
        label="Músicos"
        total={tM}
        avg={avgM}
        icon={<Music size={16} />}
        color="blue" // [Funcionamento]: Passa as propriedades de texto, número absoluto e cor azul para o invólucro do cartão.
        isOpen={activeDetail === "orquestra"}
        onClose={() => setActiveDetail(null)}
        onOpen={() => setActiveDetail("orquestra")} // [Funcionamento]: Amarra as chaves de abertura e fechamento do modal específico de músicos.
        titleDetail="Análise de Músicos"
        subtitleDetail="Músicos Locais e Visitantes Segregados na Barra" // [Funcionamento]: Textos de cabeçalho interno do Pop-up.
      >
        <ResponsiveContainer width="100%" height="100%">
          {" "}
          {/* [Funcionamento]: Alinha o gráfico para ocupar de forma elástica toda a largura do celular. */}
          <BarChart
            data={chartArray}
            margin={{ top: 20, right: 5, left: -25, bottom: 0 }}
          >
            {" "}
            {/* [Funcionamento]: Plota o gráfico vertical de músicos. */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />{" "}
            {/* [Funcionamento]: Grade cinza horizontal de fundo. */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            />{" "}
            {/* [Funcionamento]: Eixo horizontal dos meses. */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />{" "}
            {/* [Funcionamento]: Eixo vertical de quantidades. */}
            <Tooltip
              contentStyle={{
                borderRadius: "1.2rem",
                border: "none",
                fontWeight: 800,
                fontSize: 11,
              }}
            />{" "}
            {/* [Funcionamento]: Janela flutuante explicativa ao tocar na coluna. */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }}
            />{" "}
            {/* [Funcionamento]: Legenda circular inferior. */}
            <Bar
              name="Músicos da Comum"
              dataKey="totalOrq"
              fill="#3b82f6"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Coluna da base representando músicos locais. */}
              <LabelList
                dataKey="totalOrq"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#ffffff" }}
              />{" "}
              {/* [Funcionamento]: Número impresso dentro do bloco azul. */}
            </Bar>
            <Bar
              name="Músicos Visitantes"
              dataKey="visitaOrq"
              fill="#93c5fd"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Coluna superior empilhada representando as visitas. */}
              <LabelList
                dataKey="visitaOrq"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#1e3a8a" }}
              />{" "}
              {/* [Funcionamento]: Número impresso dentro do bloco azul claro. */}
            </Bar>
          </BarChart>{" "}
          {/* [Funcionamento]: Fecha o BarChart de músicos. */}
        </ResponsiveContainer>{" "}
        {/* [Funcionamento]: Fecha o ResponsiveContainer. */}
        <p className="text-[11px] font-black text-slate-400 uppercase italic mt-4 text-center tracking-wide bg-slate-50 py-2 rounded-xl border border-slate-100">
          ⚠️ Obs: Sem organistas neste gráfico
        </p>{" "}
        {/* [Funcionamento]: Nota de rodapé técnica. */}
      </BigNumberCard>{" "}
      {/* [Funcionamento]: Fecha o cartão de orquestra ativa. */}
      {/* 2. CARD: ORGANISTAS (COMUM X VISITAS) */}
      <BigNumberCard
        id="organistas"
        label="Organistas"
        total={tO}
        avg={avgO}
        icon={<PieChart size={16} />}
        color="violet" // [Funcionamento]: Passa os parâmetros estruturais e a cor violeta para as organistas.
        isOpen={activeDetail === "organistas"}
        onClose={() => setActiveDetail(null)}
        onOpen={() => setActiveDetail("organistas")} // [Funcionamento]: Ativa as travas do modal de organistas.
        titleDetail="Análise de Organistas"
        subtitleDetail="Organistas Locais e Visitantes Segregadas" // [Funcionamento]: Cabeçalho informativo interno.
      >
        <ResponsiveContainer width="100%" height="100%">
          {" "}
          {/* [Funcionamento]: Abre o contêiner responsivo. */}
          <BarChart
            data={chartArray}
            margin={{ top: 20, right: 5, left: -25, bottom: 0 }}
          >
            {" "}
            {/* [Funcionamento]: Inicia as barras de organistas. */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />{" "}
            {/* [Funcionamento]: Grade horizontal cinza. */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            />{" "}
            {/* [Funcionamento]: Meses no rodapé. */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />{" "}
            {/* [Funcionamento]: Eixo vertical de escala. */}
            <Tooltip
              contentStyle={{
                borderRadius: "1.2rem",
                border: "none",
                fontWeight: 800,
                fontSize: 11,
              }}
            />{" "}
            {/* [Funcionamento]: Janela de leitura flutuante. */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }}
            />{" "}
            {/* [Funcionamento]: Legenda inferior circular. */}
            <Bar
              name="Organistas Locais"
              dataKey="organistas"
              fill="#8b5cf6"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Torre de organistas locais da casa. */}
              <LabelList
                dataKey="organistas"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#ffffff" }}
              />{" "}
              {/* [Funcionamento]: Texto numérico centralizado. */}
            </Bar>
            <Bar
              name="Organistas Visitantes"
              dataKey="organistasV"
              fill="#c084fc"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Torre empilhada de organistas de fora. */}
              <LabelList
                dataKey="organistasV"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#4c1d95" }}
              />{" "}
              {/* [Funcionamento]: Texto numérico superior. */}
            </Bar>
          </BarChart>{" "}
          {/* [Funcionamento]: Fecha o BarChart de organistas. */}
        </ResponsiveContainer>{" "}
        {/* [Funcionamento]: Fecha o contêiner responsivo. */}
      </BigNumberCard>{" "}
      {/* [Funcionamento]: Fecha o cartão de organistas. */}
      {/* 3. CARD: IRMANDADE (IRMÃO X IRMÃ CORRIGIDO) */}
      <BigNumberCard
        id="irmandade"
        label="Irmandade"
        total={tI}
        avg={avgI}
        icon={<Users size={16} />}
        color="emerald" // [Funcionamento]: Passa os parâmetros estruturais e a cor verde esmeralda para a irmandade do coral.
        isOpen={activeDetail === "irmandade"}
        onClose={() => setActiveDetail(null)}
        onOpen={() => setActiveDetail("irmandade")} // [Funcionamento]: Vincula botões do modal de coral.
        titleDetail="Frequência da Irmandade"
        subtitleDetail="Divisão Interna de Irmãos e Irmãs (coral)" // [Funcionamento]: Títulos internos do Pop-up.
      >
        <ResponsiveContainer width="100%" height="100%">
          {" "}
          {/* [Funcionamento]: Invólucro elástico responsivo. */}
          <BarChart
            data={chartArray}
            margin={{ top: 20, right: 5, left: -25, bottom: 0 }}
          >
            {" "}
            {/* [Funcionamento]: Inicia colunas do coral. */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />{" "}
            {/* [Funcionamento]: Grade de fundo. */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            />{" "}
            {/* [Funcionamento]: Rótulos inferiores. */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />{" "}
            {/* [Funcionamento]: Escala numérica. */}
            <Tooltip
              contentStyle={{
                borderRadius: "1.2rem",
                border: "none",
                fontWeight: 800,
                fontSize: 11,
              }}
            />{" "}
            {/* [Funcionamento]: Caixa flutuante reativa. */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }}
            />{" "}
            {/* [Funcionamento]: Legenda inferior. */}
            <Bar
              name="Irmãos (coral)"
              dataKey="irmaos"
              fill="#10b981"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Base da torre conectada diretamente à chave irmaos do cérebro matemático. */}
              <LabelList
                dataKey="irmaos"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#ffffff" }}
              />{" "}
              {/* [Funcionamento]: Texto interno branco. */}
            </Bar>
            <Bar
              name="Irmãs (coral)"
              dataKey="irmas"
              fill="#a7f3d0"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Topo da torre conectado diretamente à chave irmas do cérebro matemático. */}
              <LabelList
                dataKey="irmas"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#064e3b" }}
              />{" "}
              {/* [Funcionamento]: Texto interno verde escuro. */}
            </Bar>
          </BarChart>{" "}
          {/* [Funcionamento]: Fecha o BarChart de coral. */}
        </ResponsiveContainer>{" "}
        {/* [Funcionamento]: Fecha o invólucro responsivo. */}
      </BigNumberCard>{" "}
      {/* [Funcionamento]: Fecha o cartão de irmandade. */}
      {/* 4. CARD: VISITAS CONDUTORES (LOCAIS X REGIONAIS EMPILHADOS) */}
      <BigNumberCard
        id="visitas"
        label="Visitas Condutores"
        total={tEnc}
        avg={avgEnc}
        icon={<ShieldCheck size={16} />}
        color="indigo" // [Funcionamento]: Passa os parâmetros estruturais e a cor indigo para a liderança técnica.
        isOpen={activeDetail === "visitas"}
        onClose={() => setActiveDetail(null)}
        onOpen={() => setActiveDetail("visitas")} // [Funcionamento]: Vincula gatilhos do modal de condutores.
        titleDetail="Visitas de Condutores"
        subtitleDetail="Segregação de Encarregados Locais e Regionais" // [Funcionamento]: Cabeçalho explicativo interno.
      >
        <ResponsiveContainer width="100%" height="100%">
          {" "}
          {/* [Funcionamento]: Abre o invólucro elástico responsivo. */}
          <BarChart
            data={chartArray}
            margin={{ top: 20, right: 5, left: -25, bottom: 0 }}
          >
            {" "}
            {/* [Funcionamento]: Desenha as colunas de condutores. */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />{" "}
            {/* [Funcionamento]: Grade cinza de fundo. */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            />{" "}
            {/* [Funcionamento]: Meses no rodapé. */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />{" "}
            {/* [Funcionamento]: Escala numérica vertical. */}
            <Tooltip
              contentStyle={{
                borderRadius: "1.2rem",
                border: "none",
                fontWeight: 800,
                fontSize: 11,
              }}
            />{" "}
            {/* [Funcionamento]: Caixa flutuante tátil. */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }}
            />{" "}
            {/* [Funcionamento]: Legenda inferior. */}
            <Bar
              name="Encarregados Locais"
              dataKey="condutoresLocais"
              fill="#6366f1"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Base da torre vinculada aos encarregados locais da casa. */}
              <LabelList
                dataKey="condutoresLocais"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#ffffff" }}
              />{" "}
              {/* [Funcionamento]: Rótulo numérico centralizado. */}
            </Bar>
            <Bar
              name="Encarregados Regionais"
              dataKey="condutoresVisitas"
              fill="#c7d2fe"
              stackId="a"
            >
              {" "}
              {/* [Funcionamento]: Topo da torre vinculado aos condutores visitantes do livro. */}
              <LabelList
                dataKey="condutoresVisitas"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#312e81" }}
              />{" "}
              {/* [Funcionamento]: Rótulo numérico superior. */}
            </Bar>
          </BarChart>{" "}
          {/* [Funcionamento]: Fecha o BarChart de condutores. */}
        </ResponsiveContainer>{" "}
        {/* [Funcionamento]: Fecha o invólucro responsivo. */}
      </BigNumberCard>{" "}
      {/* [Funcionamento]: Fecha o cartão de visitas condutores. */}
      {/* 5. CARD: HINOS CANTADOS */}
      <BigNumberCard
        id="hinos"
        label="Hinos Cantados"
        total={tH}
        avg={avgH}
        icon={<CheckCircle2 size={16} />}
        color="amber" // [Funcionamento]: Passa os parâmetros estruturais e a cor amarela para o volume de hinos entoados.
        isOpen={activeDetail === "hinos"}
        onClose={() => setActiveDetail(null)}
        onOpen={() => setActiveDetail("hinos")} // [Funcionamento]: Vincula botões do modal de hinos.
        titleDetail="Partes Executadas no Ensaio"
        subtitleDetail="Volume Dinâmico de Hinos por Seção da Ata" // [Funcionamento]: Títulos internos do Pop-up.
      >
        <ResponsiveContainer width="100%" height="100%">
          {" "}
          {/* [Funcionamento]: Invólucro elástico responsivo. */}
          <BarChart
            data={chartArray}
            margin={{ top: 20, right: 5, left: -25, bottom: 0 }}
          >
            {" "}
            {/* [Funcionamento]: Desenha as colunas liturgicas. */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />{" "}
            {/* [Funcionamento]: Linhas horizontais de fundo. */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            />{" "}
            {/* [Funcionamento]: Eixo com os meses. */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />{" "}
            {/* [Funcionamento]: Escala numérica esquerda. */}
            <Tooltip
              contentStyle={{
                borderRadius: "1.2rem",
                border: "none",
                fontWeight: 800,
                fontSize: 11,
              }}
            />{" "}
            {/* [Funcionamento]: Caixa flutuante descritiva. */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }}
            />{" "}
            {/* [Funcionamento]: Legenda inferior. */}
            <Bar name="1ª Parte" dataKey="h1" fill="#f59e0b" stackId="a">
              {" "}
              {/* [Funcionamento]: Hinos tocados na abertura do ensaio. */}
              <LabelList
                dataKey="h1"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#ffffff" }}
              />{" "}
              {/* [Funcionamento]: Número interno branco. */}
            </Bar>
            <Bar name="2ª Parte" dataKey="h2" fill="#fef3c7" stackId="a">
              {" "}
              {/* [Funcionamento]: Hinos tocados no encerramento da ata. */}
              <LabelList
                dataKey="h2"
                position="center"
                style={{ fontSize: 10, fontWeight: 900, fill: "#78350f" }}
              />{" "}
              {/* [Funcionamento]: Número interno amarelo escuro. */}
            </Bar>
          </BarChart>{" "}
          {/* [Funcionamento]: Fecha o BarChart litúrgico. */}
        </ResponsiveContainer>{" "}
        {/* [Funcionamento]: Fecha o invólucro responsivo. */}
      </BigNumberCard>{" "}
      {/* [Funcionamento]: Fecha o cartão de hinos cantados. */}
      {/* 6. CARD: RANKING LITÚRGICO DE HINOS MAIS CHAMADOS (DARK MODE PREMIUM - ENQUADRAMENTO RECALIBRADO) */}
      <section className="bg-slate-900 p-5 rounded-[2.5rem] shadow-xl text-white text-left w-full overflow-hidden">
        {" "}
        {/* [Funcionamento]: Desenha uma caixa escura arredondada de alta fidelidade para acomodar o ranking no rodapé do Stacking. */}
        <div className="flex flex-col gap-3 mb-5">
          {" "}
          {/* [Funcionamento]: Alinha verticalmente os títulos e os seletores com margem inferior de espaçamento. */}
          <div>
            {" "}
            {/* [Funcionamento]: Bloco textual dos metadados do ranking. */}
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic mb-0.5">
              {" "}
              {/* [Funcionamento]: Subtítulo estilizado em itálico dourado. */}
              Estatística Litúrgica
            </p>{" "}
            {/* [Funcionamento]: Fecha o subtítulo. */}
            <h3 className="text-sm font-black uppercase tracking-tight">
              {" "}
              {/* [Funcionamento]: Título principal em caixa alta compacta. */}
              Hinos de Maior Frequência
            </h3>{" "}
            {/* [Funcionamento]: Fecha o título. */}
          </div>{" "}
          {/* [Funcionamento]: Fecha o bloco textual. */}
          {/* Seletores Rápidos de Limite */}
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl w-fit">
            {" "}
            {/* [Funcionamento]: Desenha uma esteira de botões horizontais cinzas com cantos arredondados. */}
            {[3, 5, 10, 15].map(
              (
                n, // [Funcionamento]: Realiza uma varredura nas opções de limite permitidas pelo sistema.
              ) => (
                <button
                  key={n} // [Funcionamento]: Identificador único do laço para o React.
                  onClick={() => setTopLimit(n)} // [Funcionamento]: Atualiza reativamente a quantidade de linhas exibidas no gráfico ao tocar no botão.
                  className={`px-3 h-8 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    topLimit === n
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white" // [Funcionamento]: Aplica fundo dourado se o botão estiver ativo ou cor opaca se estiver desligado.
                  }`}
                >
                  {n}{" "}
                  {/* [Funcionamento]: Imprime o número da paginação (ex: 3, 5, 10). */}
                </button> // [Funcionamento]: Fecha o gatilho tátil.
              ),
            )}
          </div>{" "}
          {/* [Funcionamento]: Fecha a esteira de botões. */}
        </div>{" "}
        {/* [Funcionamento]: Conclui o cabeçalho do ranking. */}
        {/* Espaço de Palco do Gráfico Linear Horizontal do Recharts */}
        <div style={{ width: "100%", height: topLimit * 40 }}>
          {" "}
          {/* [Funcionamento]: Define uma altura dinâmica proporcional ao limite de linhas para evitar esmagamento vertical no celular. */}
          {topHinos && topHinos.length > 0 ? ( // [Funcionamento]: Validação de salvaguarda: se houver hinos processados na memória RAM, desenha as colunas.
            <ResponsiveContainer width="100%" height="100%">
              {" "}
              {/* [Funcionamento]: Ajusta de forma elástica a largura do gráfico horizontal. */}
              {/* 🚀 CORREÇÃO DE ENQUADRAMENTO: Alterado margin.left para 5 positivo para abrir recuo físico contra cortes de tela */}
              <BarChart
                layout="vertical"
                data={topHinos.slice(0, topLimit)}
                margin={{ left: 5, right: 35, top: 0, bottom: 0 }}
              >
                {" "}
                {/* [Funcionamento]: Abre o gráfico horizontal injetando as margens protetoras. */}
                <XAxis type="number" hide />{" "}
                {/* [Funcionamento]: Oculta a linha de escala numérica horizontal do rodapé. */}
                {/* 🚀 EXPANSÃO DE COLUNA: Alocado width={55} fixo e textAnchor="end" para garantir a impressão nítida dos 3 dígitos do hino */}
                <YAxis
                  dataKey="num"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fontWeight: "900",
                    fill: "#FFFFFF",
                    fontStyle: "italic",
                    textAnchor: "end",
                  }}
                  width={55}
                />{" "}
                {/* [Funcionamento]: Imprime o rótulo alinhado à direita com espaçamento confortável. */}
                <Bar
                  dataKey="count"
                  fill="#F59E0B"
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                >
                  {" "}
                  {/* [Funcionamento]: Configura as barras horizontais douradas com cantos arredondados na ponta direita. */}
                  {topHinos.slice(0, topLimit).map(
                    (
                      entry,
                      index, // [Funcionamento]: Varre os blocos para injetar um efeito visual de gradiente de opacidade.
                    ) => (
                      <Cell
                        key={`cell-hin-${index}`}
                        fillOpacity={Math.max(0.3, 1 - index * 0.05)}
                      /> // [Funcionamento]: Esmaece sutilmente as fatias de baixo para dar sensação de profundidade.
                    ),
                  )}
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill="#F59E0B"
                    style={{ fontSize: 11, fontWeight: 900, paddingLeft: 6 }}
                  />{" "}
                  {/* [Funcionamento]: Imprime o volume de repetições em dourado na extremidade externa direita. */}
                </Bar>{" "}
                {/* [Funcionamento]: Fecha a barra mestre. */}
              </BarChart>{" "}
              {/* [Funcionamento]: Fecha a estrutura do BarChart horizontal. */}
            </ResponsiveContainer> // [Funcionamento]: Fecha o ResponsiveContainer.
          ) : (
            /* Estado de Feedback de Segurança */
            <div className="h-full flex items-center justify-center text-xs font-bold uppercase text-slate-500 italic py-6">
              {" "}
              {/* [Funcionamento]: Caixa centralizada cinza. */}
              Aguardando dados litúrgicos...{" "}
              {/* [Funcionamento]: Texto amigável de espera. */}
            </div> // [Funcionamento]: Fecha o bloco de feedback.
          )}
        </div>{" "}
        {/* [Funcionamento]: Conclui o palco do gráfico. */}
      </section>{" "}
      {/* [Funcionamento]: Fecha a seção escura de estatísticas litúrgicas do rodapé. */}
    </div> // [Funcionamento]: Fecha a divisão raiz das tabelas analíticas horizontais.
  );
};

/**
 * SUBCOMPONENTE DE ARQUITETURA INTERNA: BigNumberCard
 */
const BigNumberCard = ({
  label,
  total,
  avg,
  icon,
  color,
  isOpen,
  onClose,
  onOpen,
  children,
  titleDetail,
  subtitleDetail,
}) => {
  // [Funcionamento]: Declara a fiação interna de montagem individual dos cartões horizontais de topo.
  const colorMap = {
    // [Funcionamento]: Tabela fixa contendo os dicionários de paletas Tailwind para cada cartão.
    blue: {
      text: "text-blue-600",
      border: "border-l-blue-500",
      bg: "bg-blue-50/60",
    }, // [Funcionamento]: Cores azuis de orquestra.
    violet: {
      text: "text-violet-600",
      border: "border-l-violet-500",
      bg: "bg-violet-50/60",
    }, // [Funcionamento]: Cores roxas de organistas.
    emerald: {
      text: "text-emerald-600",
      border: "border-l-emerald-500",
      bg: "bg-emerald-50/60",
    }, // [Funcionamento]: Cores verdes de coral.
    indigo: {
      text: "text-indigo-600",
      border: "border-l-indigo-500",
      bg: "bg-indigo-50/60",
    }, // [Funcionamento]: Cores azuis escuras de liderança.
    amber: {
      text: "text-amber-600",
      border: "border-l-amber-500",
      bg: "bg-amber-50/60",
    }, // [Funcionamento]: Cores douradas de hinos.
  };

  const currentStyle = colorMap[color] || colorMap.blue; // [Funcionamento]: Seleciona a cor do mapa baseando-se na propriedade recebida ou escolhe azul como trava de segurança.

  return (
    // [Funcionamento]: Renderiza o esqueleto tátil e animado do card individual.
    <>
      <button
        onClick={onOpen} // [Funcionamento]: Dispara a abertura do modal centralizado ao receber o clique do dedo do usuário.
        className="w-full h-20 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-between p-4 active:scale-[0.98] transition-all cursor-pointer min-w-0" // [Funcionamento]: Botão horizontal arredondado com efeito físico de clique de mola.
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {" "}
          {/* [Funcionamento]: Caixa alinhada à esquerda com tratamento contra esmagamentos nominais. */}
          <div
            className={`p-2.5 rounded-xl ${currentStyle.bg} ${currentStyle.text} shrink-0 flex items-center justify-center`}
          >
            {" "}
            {/* [Funcionamento]: Emblema quadrado flutuante contendo o ícone colorido. */}
            {icon} {/* [Funcionamento]: Ícone Lucide vetorizado. */}
          </div>{" "}
          {/* [Funcionamento]: Fecha o emblema. */}
          <div className="min-w-0">
            {" "}
            {/* [Funcionamento]: Caixa compacta textual. */}
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none mb-1 truncate">
              {label}
            </span>{" "}
            {/* [Funcionamento]: Rótulo do cartão em caixa alta microscópica cinza. */}
            <p className="text-2xl font-black text-slate-900 tracking-tight m-0 italic truncate">
              {total}
            </p>{" "}
            {/* [Funcionamento]: Número absoluto gigante em itálico preto. */}
          </div>{" "}
          {/* [Funcionamento]: Conclui o bloco textual esquerdo. */}
        </div>{" "}
        {/* [Funcionamento]: Conclui o lado esquerdo. */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-100 h-10 w-32 shrink-0 text-left min-w-0">
          {" "}
          {/* [Funcionamento]: Divisão direita isolada por uma linha vertical cinza contendo as médias mensais. */}
          <div className="min-w-0 flex-1">
            {" "}
            {/* [Funcionamento]: Caixa textual interna da média. */}
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block leading-none mb-1 truncate">
              Média / Mês
            </span>{" "}
            {/* [Funcionamento]: Texto superior explicativo. */}
            <p className="text-xl font-black text-slate-800 m-0 italic truncate">
              {avg}
            </p>{" "}
            {/* [Funcionamento]: Número da média em tamanho médio. */}
          </div>{" "}
          {/* [Funcionamento]: Conclui a caixa textual. */}
          <ArrowRight size={14} className="text-slate-300 shrink-0" />{" "}
          {/* [Funcionamento]: Seta cinza indicando que o card é clicável (Drill-down). */}
        </div>{" "}
        {/* [Funcionamento]: Conclui o lado direito. */}
      </button>{" "}
      {/* [Funcionamento]: Fecha a barra tátil do card. */}
      <AnimatePresence>
        {" "}
        {/* [Funcionamento]: Ativa as travas do Framer Motion para controlar a saída física do modal da tela sem cortes bruscos. */}
        {isOpen && ( // [Funcionamento]: Condicional lógica: se o estado estiver ativo, renderiza o modal flutuante centralizado.
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {" "}
            {/* [Funcionamento]: Quadro fixado em tela inteira acima de qualquer outro assunto do celular. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }} // [Funcionamento]: Efeito de transição de esmaecimento suave de entrada e saída.
              onClick={onClose}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" // [Funcionamento]: Cortina escura translúcida de fundo que fecha o modal se receber um toque na área vazia.
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} // [Funcionamento]: Inicia ligeiramente menor e invisível.
              animate={{ opacity: 1, scale: 1 }} // [Funcionamento]: Expande até o tamanho real ganhando foco de nitidez.
              exit={{ opacity: 0, scale: 0.92 }} // [Funcionamento]: Encolhe e esmaece ao fechar.
              transition={{ type: "spring", damping: 24, stiffness: 360 }} // [Funcionamento]: Efeito físico de rebote elástico estilo aplicativo nativo iOS/Android.
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative z-10 border border-slate-100 flex flex-col h-[400px] text-left" // [Funcionamento]: Caixa branca arredondada premium com altura travada em 400px para o palco gráfico.
            >
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-5 shrink-0">
                {" "}
                {/* [Funcionamento]: Cabeçalho interno do Pop-up. */}
                <div className="min-w-0 flex-1">
                  {" "}
                  {/* [Funcionamento]: Caixa textual da liderança do Pop-up. */}
                  <div className="flex items-center gap-2 text-slate-900 min-w-0">
                    {" "}
                    {/* [Funcionamento]: Agrupa o ícone com o título de forma alinhada. */}
                    <BarChart3
                      size={16}
                      className={`${currentStyle.text} shrink-0`}
                    />{" "}
                    {/* [Funcionamento]: Ícone ilustrativo com a cor mestre da família do card. */}
                    <h3 className="text-sm font-black uppercase tracking-tight italic truncate">
                      {titleDetail}
                    </h3>{" "}
                    {/* [Funcionamento]: Título técnico do assunto em caixa alta. */}
                  </div>{" "}
                  {/* [Funcionamento]: Fecha o alinhamento. */}
                  <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide truncate">
                    {subtitleDetail}
                  </p>{" "}
                  {/* [Funcionamento]: Subtítulo explicativo cinza. */}
                </div>{" "}
                {/* [Funcionamento]: Conclui a caixa textual. */}
                <button
                  onClick={onClose} // [Funcionamento]: Desliga a visualização do modal ao receber o clique do dedo no 'X'.
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-pointer active:scale-90 transition-all shrink-0 ml-2" // [Funcionamento]: Botão quadrado de fechar com área de clique confortável.
                >
                  <X size={16} />{" "}
                  {/* [Funcionamento]: Ícone do 'X' do Lucide. */}
                </button>{" "}
                {/* [Funcionamento]: Conclui o botão. */}
              </div>{" "}
              {/* [Funcionamento]: Conclui o cabeçalho interno. */}
              <div className="flex-1 w-full min-h-0">
                {" "}
                {/* [Funcionamento]: Palco sagrado limpo onde o Recharts plota as torres verticais do Drill-down. */}
                {children}{" "}
                {/* [Funcionamento]: Gráfico de colunas empilhadas correspondente injetado dinamicamente aqui dentro. */}
              </div>{" "}
              {/* [Funcionamento]: Fecha o palco. */}
            </motion.div>{" "}
            {/* [Funcionamento]: Fecha a caixa animada branca. */}
          </div> // [Funcionamento]: Fecha o quadro fixado de tela inteira.
        )}
      </AnimatePresence>{" "}
      {/* [Funcionamento]: Conclui as travas de saída do Framer Motion. */}
    </> // [Funcionamento]: Conclui o fragmento React.
  );
};

export default MetricCardsGroup;
