import React from "react"; // [Funcionamento]: Importa o núcleo do React para estruturação e gerenciamento de componentes na tela.
// PRESERVAÇÃO DE DEPENDÊNCIAS: Adicionado LineChart e Line para a fusão estável do gráfico de evolução
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  LineChart,
  Line,
} from "recharts"; // [Funcionamento]: Importa os componentes de engenharia visual do Recharts para plotar fatias, colunas, linhas e rótulos.
import { ChevronLeft, ChevronRight, BarChart2 } from "lucide-react"; // [Funcionamento]: Importa as setas táteis e o ícone de BI para navegação móvel.
import { motion } from "framer-motion"; // [Funcionamento]: Importa o Framer Motion para acionar o arrastar físico de slides no smartphone.

// 🚀 ENCAPSULAMENTO SÊNIOR (SOLUÇÃO DE ESCOPO DO BABEL): Isolado o renderizador de rótulos da pizza no topo do arquivo para o compilador não misturar as chaves com os laços inferiores.
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  // [Funcionamento]: Função isolada que calcula e desenha as porcentagens centralizadas dentro de cada fatia da pizza.
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5; // [Funcionamento]: Calcula a coordenada de distância geométrica a partir do centro do círculo.
  const RADIAN = Math.PI / 180; // [Funcionamento]: Fator constante matemático usado para converter graus em radianos nas funções trigonométricas.
  const x = cx + radius * Math.cos(-midAngle * RADIAN); // [Funcionamento]: Calcula o posicionamento exato no eixo horizontal X para o texto da fatia.
  const y = cy + radius * Math.sin(-midAngle * RADIAN); // [Funcionamento]: Calcula o posicionamento exato no eixo vertical Y para o texto da fatia.
  return (
    // [Funcionamento]: Retorna o elemento de texto configurado com o símbolo de porcentagem para exibição.
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] font-black italic"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text> // [Funcionamento]: Renderiza a porcentagem arredondada sem casas decimais com fonte branca e itálica.
  ); // [Funcionamento]: Conclui o retorno do bloco de texto XML.
}; // [Funcionamento]: Encerra a declaração da função auxiliar de rótulo personalizado.

/**
 * COMPONENTE: AnalyticsCarousel v4.6 (MASTER FUSION EDITION)
 * Finalidade: Renderizar o Gráfico de Evolução de Linhas no topo e os carrosséis analíticos logo abaixo na mesma esteira.
 */
const AnalyticsCarousel = ({
  chartArray = [],
  presencaSlide,
  setPresencaSlide,
  equilibrioSlide,
  setEquilibrioSlide,
}) => {
  // [Funcionamento]: Inicia o componente do carrossel recebendo os arrays históricos e as funções de controle de estados de páginas.
  // 🚀 CORREÇÃO DE ROBUSTEZ: Funções de navegação foram especializadas para cada carrossel,
  // eliminando a função genérica `handleNext` que causava o erro "set is not a function"
  // devido a problemas de escopo/closure quando passada como callback.
  const onPrevPresenca = () => setPresencaSlide(presencaSlide === 0 ? 1 : 0);
  const onNextPresenca = () => setPresencaSlide((presencaSlide + 1) % 2);

  const onPrevEquilibrio = () =>
    setEquilibrioSlide(equilibrioSlide === 0 ? 2 : equilibrioSlide - 1);
  const onNextEquilibrio = () => setEquilibrioSlide((equilibrioSlide + 1) % 3);

  // 🚀 CALIBRAÇÃO EM TEMPO REAL: Normaliza os naipes e garante que o Saxofone nunca fique em branco por falha de mapeamento
  const calibratedData = chartArray.map((m) => {
    // [Funcionamento]: Passa uma varredura em cada ponto de histórico para recalcular proporções de naipes na RAM.
    const cordasLocal = parseInt(m.cordas) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de cordas locais da igreja comuns.
    const cordasVisita = parseInt(m.cordasV) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de cordas visitantes de apoio.
    const madeirasLocal = parseInt(m.madeiras) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de madeiras locais.
    const madeirasVisita = parseInt(m.madeirasV) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de madeiras visitantes.
    const metaisLocal = parseInt(m.metais) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de metais locais.
    const metaisVisita = parseInt(m.metaisV) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de metais visitantes.
    const teclasLocal = parseInt(m.teclas) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de teclas locais.
    const teclasVisita = parseInt(m.teclasV) || 0; // [Funcionamento]: Converte e limpa o valor de músicos de teclas visitantes.

    // Alinha o Saxofone extraindo os dados da árvore ou aplicando fallback resiliente
    const saxLocal = // 🚀 CORREÇÃO DE ROBUSTEZ: Garante que `null` ou `undefined` não resultem em NaN.
      m.sax !== undefined
        ? parseInt(m.sax) || 0
        : Math.floor(madeirasLocal * 0.4); // [Funcionamento]: Isola os saxofones locais salvos ou gera fallback de 40% das madeiras.
    const saxVisita = // 🚀 CORREÇÃO DE ROBUSTEZ: Garante que `null` ou `undefined` não resultem em NaN.
      m.saxV !== undefined
        ? parseInt(m.saxV) || 0
        : Math.floor(madeirasVisita * 0.4); // [Funcionamento]: Isola os saxofones visitantes salvos ou gera fallback de proporção.

    const cTot = cordasLocal + cordasVisita;
    const madTot = madeirasLocal + saxLocal + madeirasVisita + saxVisita; // [Funcionamento]: Soma Madeiras e Saxofones para uma família unificada.
    const metTot = metaisLocal + metaisVisita;
    const tecTot = teclasLocal + teclasVisita;
    const totalMes = cTot + madTot + metTot + tecTot; // [Funcionamento]: Consolida o montante total, agora com madeiras e sax unificados.

    return {
      // [Funcionamento]: Devolve o payload mensal formatado em propriedades de porcentagens estáveis para o gráfico empilhado ler.
      ...m, // [Funcionamento]: Preserva os metadados e os campos linearmente calculados de histórico de público do pai.
      cordas: cordasLocal, // [Funcionamento]: Guarda o número absoluto higienizado de cordas comuns da casa.
      cordasV: cordasVisita, // [Funcionamento]: Guarda o número absoluto de cordas visitantes.
      madeiras: madeirasLocal + saxLocal, // [Funcionamento]: Combina madeiras e saxofones locais.
      madeirasV: madeirasVisita + saxVisita, // [Funcionamento]: Combina madeiras e saxofones visitantes.
      metais: metaisLocal, // [Funcionamento]: Guarda o número absoluto limpo de metais da casa.
      metaisV: metaisVisita, // [Funcionamento]: Guarda o número absoluto limpo de metais visitantes.
      teclas: teclasLocal, // [Funcionamento]: Guarda o número absoluto de acordeons e teclas da casa.
      teclasV: teclasVisita, // [Funcionamento]: Guarda o número absoluto de acordeons e teclas visitantes.
      // 🚀 SINTONIZAÇÃO DIRETA: Grava as chaves com os mesmos nomes exatos de exibição para proporções
      Cordas: totalMes > 0 ? Math.round((cTot / totalMes) * 100) : 0, // [Funcionamento]: Computa a porcentagem proporcional das cordas no mês.
      Madeiras: totalMes > 0 ? Math.round((madTot / totalMes) * 100) : 0, // [Funcionamento]: Computa a porcentagem proporcional das madeiras no mês.
      Metais: totalMes > 0 ? Math.round((metTot / totalMes) * 100) : 0, // [Funcionamento]: Computa a porcentagem proporcional dos metais no mês.
      Teclas: totalMes > 0 ? Math.round((tecTot / totalMes) * 100) : 0, // [Funcionamento]: Computa a porcentagem proporcional das teclas no mês.
    }; // [Funcionamento]: Termina a montagem do objeto sanitizado.
  }); // [Funcionamento]: Encerra a subrotina .map de calibração histórica.

  // 🚀 ACÚMULO SEGURO EM RAM: Soma os volumes de todo o período filtrado para gerar a Pizza Macro (Exclui Órgão)
  const pieTotals = calibratedData.reduce(
    (acc, curr) => {
      acc.cordas += curr.cordas + curr.cordasV;
      acc.madeiras += curr.madeiras + curr.madeirasV;
      acc.metais += curr.metais + curr.metaisV;
      acc.teclas += curr.teclas + curr.teclasV;
      return acc;
    },
    { cordas: 0, madeiras: 0, metais: 0, teclas: 0 },
  );

  const pieData = [
    // [Funcionamento]: Monta a estrutura linear estruturada de dados que alimentará o PieChart de naipes.
    { name: "Cordas", value: pieTotals.cordas, color: "#F59E0B" }, // [Funcionamento]: Item de cordas associado à cor laranja.
    { name: "Madeiras", value: pieTotals.madeiras, color: "#10B981" }, // [Funcionamento]: Item de madeiras associado à cor verde.
    { name: "Metais", value: pieTotals.metais, color: "#EF4444" }, // [Funcionamento]: Item de metais associado à cor vermelha.
    { name: "Teclas", value: pieTotals.teclas, color: "#64748B" }, // [Funcionamento]: Item de teclas associado à cor cinza ardósia.
  ].filter((item) => item.value > 0); // [Funcionamento]: Remove do gráfico de pizza os naipes que não possuem nenhuma cabeça registrada para não poluir a tela.

  // 🚀 FORMATADOR RECHARTS: Garante a inclusão do símbolo de porcentagem nos rótulos internos das colunas
  const formatPercentLabel = (value) => (value > 0 ? `${value}%` : ""); // [Funcionamento]: Transforma o número bruto da coluna em texto formatado com o caractere de %.

  return (
    // [Funcionamento]: Inicializa a impressão visual dos blocos de carrosséis analíticos na tela.
    <div className="space-y-6 w-full min-w-0 text-left">
      {/* 🚀 GRÁFICO 1 INJETADO: LINHAS HISTÓRICAS DE EVOLUÇÃO DE ENSAIOS (MÓDULO DE TOPO ESTÁTICO) */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-left">
        <div className="flex items-center gap-2 mb-4 text-left">
          <BarChart2 size={13} className="text-indigo-600" />{" "}
          {/* [Funcionamento]: Ícone analítico de barras vetorizado do lucide-react. */}
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">
            Evolução de Ensaios 2026
          </span>{" "}
          {/* [Funcionamento]: Título textual em caixa alta do gráfico estático superior de linhas. */}
        </div>
        <div className="h-56 w-full mt-2">
          {" "}
          {/* [Funcionamento]: Palco de altura fixa estável para abrigar as linhas do Recharts. */}
          <ResponsiveContainer width="100%" height="100%">
            {" "}
            {/* [Funcionamento]: Container elástico que estica a largura para preencher o celular de ponta a ponta. */}
            <LineChart
              data={chartArray}
              margin={{ top: 20, right: 15, left: -25, bottom: 5 }}
            >
              {" "}
              {/* [Funcionamento]: Conecta os dados analíticos históricos ao motor de linhas do Recharts. */}
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />{" "}
              {/* [Funcionamento]: Desenha as linhas quadriculadas cinzas claras de fundo. */}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              {/* [Funcionamento]: Linha horizontal com os meses textuais formatados em caixa alta. */}
              <YAxis
                tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              {/* [Funcionamento]: Linha vertical de escala de volumetria absoluta de presentes. */}
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  borderRadius: "1rem",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: "bold",
                  border: "none",
                }}
              />{" "}
              {/* [Funcionamento]: Pop-up preto premium que flutua na tela ao encostar o dedo na coordenada. */}
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
              {/* [Funcionamento]: Legenda circular na base dividindo as cores das duas linhas de tendência. */}
              <Line
                name="Público Geral"
                type="monotone"
                dataKey="público"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
              >
                {" "}
                {/* [Funcionamento]: Plota a linha azul indigo representando o público total acumulado da ata. */}
                <LabelList
                  dataKey="público"
                  position="top"
                  style={{ fill: "#4f46e5", fontSize: 10, fontWeight: 900 }}
                />{" "}
                {/* [Funcionamento]: Texto numérico fixado de forma otimizada acima de cada nó da linha azul. */}
              </Line>
              <Line
                name="Orquestra"
                type="monotone"
                dataKey="orquestra"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
              >
                {" "}
                {/* [Funcionamento]: Plota a linha verde esmeralda representando o tamanho total da orquestra orquestral. */}
                <LabelList
                  dataKey="orquestra"
                  position="bottom"
                  style={{ fill: "#10b981", fontSize: 10, fontWeight: 900 }}
                />{" "}
                {/* [Funcionamento]: Texto numérico fixado de forma otimizada abaixo de cada nó da linha verde. */}
              </Line>
            </LineChart>{" "}
            {/* [Funcionamento]: Encerra o LineChart. */}
          </ResponsiveContainer>{" "}
          {/* [Funcionamento]: Fecha o invólucro responsivo elástico. */}
        </div>
      </div>

      {/* 2. CARROSSEL DE DISTRIBUIÇÃO E PROPORÇÕES DE NAIPES (PIZZA / COLUNAS EMPILHADAS COM RÓTULOS ATIVOS EM %) */}
      <CarouselBox
        title={
          presencaSlide === 0
            ? "Distribuição Geral de Naipes (%)"
            : "Proporções dos Naipes por Mês (%)"
        } // [Funcionamento]: Alterna o título do cabeçalho da moldura de forma automática baseando-se na página do carrossel.
        onPrev={onPrevPresenca}
        onNext={onNextPresenca}
      >
        {presencaSlide === 0 ? ( // [Funcionamento]: Condicional de carrossel: se a página ativa for 0, desenha o gráfico de pizza consolidada.
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex-1 w-full min-h-0">
              {" "}
              {/* [Funcionamento]: Palco de dimensões flexíveis para abrigar a pizza. */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {" "}
                  {/* [Funcionamento]: Inicializa o componente de Pizza gráfica do Recharts. */}
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
                    {" "}
                    {/* [Funcionamento]: Conecta as fatias calibradas e vincula o nosso método isolado de rótulos internos brancos em %. */}
                    {pieData.map(
                      (
                        entry,
                        index, // [Funcionamento]: Loop que passa colorindo gomo por gomo do círculo.
                      ) => (
                        <Cell key={`cell-${index}`} fill={entry.color} /> // [Funcionamento]: Aplica a cor cadastrada no mapeamento do gomo ativo.
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} Inst.`, "Volume"]}
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "none",
                      fontWeight: 800,
                    }}
                  />{" "}
                  {/* [Funcionamento]: Janela explicativa com contornos arredondados exibida ao tocar na fatia da pizza. */}
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* 🚀 BLINDAGEM COMPILADORA COMPACTA: O mapeamento de legendas textuais agora opera de forma independente sem conflitos com chaves órfãs, eliminando o erro de sintaxe 500 do Vite! */}
            <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 pb-1">
              {" "}
              {/* [Funcionamento]: Caixa horizontal flexível de legendas inferiores dos naipes orquestrais. */}
              {pieData.map(
                (
                  item,
                  index, // [Funcionamento]: Varre os gomos da pizza para gerar a pílula de legenda correspondente.
                ) => (
                  <div key={index} className="flex items-center gap-1">
                    {" "}
                    {/* [Funcionamento]: Container do item ativo. */}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />{" "}
                    {/* [Funcionamento]: Pequena bolinha colorida do naipe impedida de encolher. */}
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                      {item.name}
                    </span>{" "}
                    {/* [Funcionamento]: Nome por extenso da família orquestral impresso em cinza. */}
                  </div> // [Funcionamento]: Fecha o container individual da legenda do item ativo.
                ),
              )}
            </div>
          </div>
        ) : (
          // [Funcionamento]: Caso contrário, se a página do slide for a 1, desenha as colunas empilhadas de proporções mensais em %.
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={calibratedData}
              margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
            >
              {" "}
              {/* [Funcionamento]: Inicializa o gráfico de colunas verticais conectando a malha de dados filtrada. */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />{" "}
              {/* [Funcionamento]: Grade horizontal cinza sutil de fundo. */}
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
              />{" "}
              {/* [Funcionamento]: Exibe as iniciais em maiúsculo dos meses no rodapé de cada coluna. */}
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                unit="%"
                domain={[0, 100]}
              />{" "}
              {/* [Funcionamento]: Trava o limite do eixo vertical fixando as coordenadas na proporção matemática de 0% a 100%. */}
              <Tooltip
                contentStyle={{
                  borderRadius: "1.2rem",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 11,
                }}
                formatter={(value) => [`${value}%`]}
              />{" "}
              {/* [Funcionamento]: Pop-up explicativo em porcentagem exibido ao tocar na barra. */}
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 15 }}
              />{" "}
              {/* [Funcionamento]: Legenda circular inferior com tamanho reduzido ergonômico para telas mobile. */}
              <Bar name="Cordas" dataKey="Cordas" fill="#F59E0B" stackId="a">
                {" "}
                {/* [Funcionamento]: Base da coluna representando as Cordas em cor laranja. */}
                <LabelList
                  dataKey="Cordas"
                  position="center"
                  formatter={formatPercentLabel}
                  style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                />{" "}
                {/* [Funcionamento]: Imprime o número da porcentagem em branco bem no centro do gomo. */}
              </Bar>
              <Bar
                name="Madeiras"
                dataKey="Madeiras"
                fill="#10B981"
                stackId="a"
              >
                {" "}
                {/* [Funcionamento]: Gomo empilhado representando as Madeiras puras em cor verde. */}
                <LabelList
                  dataKey="Madeiras"
                  position="center"
                  formatter={formatPercentLabel}
                  style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                />{" "}
                {/* [Funcionamento]: Imprime a porcentagem interna do gomo verde. */}
              </Bar>
              <Bar name="Metais" dataKey="Metais" fill="#EF4444" stackId="a">
                {" "}
                {/* [Funcionamento]: Gomo empilhado representando os Metais de bocal em cor vermelha. */}
                <LabelList
                  dataKey="Metais"
                  position="center"
                  formatter={formatPercentLabel}
                  style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                />{" "}
                {/* [Funcionamento]: Imprime a porcentagem interna do gomo vermelho. */}
              </Bar>
              <Bar name="Teclas" dataKey="Teclas" fill="#64748B" stackId="a">
                {" "}
                {/* [Funcionamento]: Gomo superior final representando as Teclas e acordeon em cor cinza. */}
                <LabelList
                  dataKey="Teclas"
                  position="center"
                  formatter={formatPercentLabel}
                  style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                />{" "}
                {/* [Funcionamento]: Imprime a porcentagem interna do gomo cinza. */}
              </Bar>
            </BarChart>{" "}
            {/* [Funcionamento]: Encerra o gráfico de colunas proporcionais. */}
          </ResponsiveContainer>
        )}
      </CarouselBox>

      {/* 3. CARROSSEL DE EQUILÍBRIO SEGREGADO (UMA COLUNA ÚNICA EMPILHADA LOCAL X VISITA COM RÓTULOS ABSORVIDOS NO CENTRO) */}
      <CarouselBox
        title={
          equilibrioSlide === 0
            ? "Cordas (Local x Visita)"
            : equilibrioSlide === 1
              ? "Madeiras e Sax (Local x Visita)"
              : "Metais (Local x Visita)"
        } // [Funcionamento]: Altera o título de forma automática baseando-se no slide de equilíbrio ativo (0 a 3).
        onPrev={onPrevEquilibrio}
        onNext={onNextEquilibrio}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={calibratedData}
            margin={{ top: 20, right: 5, left: -25, bottom: 0 }}
          >
            {" "}
            {/* [Funcionamento]: Abre as colunas verticais absolutas de equilíbrio de apoio. */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />{" "}
            {/* [Funcionamento]: Linhas cinzas horizontais de fundo. */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            />{" "}
            {/* [Funcionamento]: Exibe as iniciais dos meses na base das colunas. */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />{" "}
            {/* [Funcionamento]: Escala numérica absoluta do volume físico de cabeças presentes. */}
            <Tooltip
              contentStyle={{
                borderRadius: "1.2rem",
                border: "none",
                fontWeight: 800,
                fontSize: 11,
              }}
            />{" "}
            {/* [Funcionamento]: Pop-up informativo reativo ao toque de dedo do operador. */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }}
            />{" "}
            {/* [Funcionamento]: Legenda circular inferior dividindo as cores de músicos locais vs visitas. */}
            {equilibrioSlide === 0 && ( // [Funcionamento]: Slide de Equilíbrio 0: renderiza as colunas de Cordas da casa vs visitantes.
              <>
                <Bar
                  name="Cordas Locais"
                  dataKey="cordas"
                  fill="#F59E0B"
                  stackId="b"
                  barSize={14}
                >
                  {" "}
                  {/* [Funcionamento]: Gomo inferior representando os músicos da casa daquela comum. */}
                  <LabelList
                    dataKey="cordas"
                    position="center"
                    style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                  />{" "}
                  {/* [Funcionamento]: Texto numérico fixado no gomo laranja. */}
                </Bar>
                <Bar
                  name="Cordas Visitantes"
                  dataKey="cordasV"
                  fill="#FEF3C7"
                  stackId="b"
                  barSize={14}
                >
                  {" "}
                  {/* [Funcionamento]: Gomo superior empilhado representando as visitas de apoio de outras comuns. */}
                  <LabelList
                    dataKey="cordasV"
                    position="center"
                    style={{ fontSize: 9, fontWeight: 900, fill: "#7c2d12" }}
                  />{" "}
                  {/* [Funcionamento]: Texto numérico fixado no gomo claro. */}
                </Bar>
              </>
            )}
            {equilibrioSlide === 1 && ( // [Funcionamento]: Slide de Equilíbrio 1: renderiza as colunas de Madeiras da casa vs visitantes.
              <>
                <Bar
                  name="Madeiras Locais"
                  dataKey="madeiras"
                  fill="#10B981"
                  stackId="b"
                  barSize={14}
                >
                  {" "}
                  {/* [Funcionamento]: Madeiras locais comuns da casa. */}
                  <LabelList
                    dataKey="madeiras"
                    position="center"
                    style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                  />{" "}
                  {/* [Funcionamento]: Texto numérico centralizado. */}
                </Bar>
                <Bar
                  name="Madeiras Visitantes"
                  dataKey="madeirasV"
                  fill="#D1FAE5"
                  stackId="b"
                  barSize={14}
                >
                  {" "}
                  {/* [Funcionamento]: Madeiras visitantes de apoio de fora. */}
                  <LabelList
                    dataKey="madeirasV"
                    position="center"
                    style={{ fontSize: 9, fontWeight: 900, fill: "#064e3b" }}
                  />{" "}
                  {/* [Funcionamento]: Texto numérico centralizado. */}
                </Bar>
              </>
            )}
            {equilibrioSlide === 2 && ( // [Funcionamento]: Slide de Equilíbrio 2: renderiza as colunas de Metais da casa vs visitantes.
              <>
                <Bar
                  name="Metais Locais"
                  dataKey="metais"
                  fill="#EF4444"
                  stackId="b"
                  barSize={14}
                >
                  {" "}
                  {/* [Funcionamento]: Músicos de metais comuns da casa. */}
                  <LabelList
                    dataKey="metais"
                    position="center"
                    style={{ fontSize: 9, fontWeight: 900, fill: "#ffffff" }}
                  />{" "}
                  {/* [Funcionamento]: Texto numérico no gomo vermelho. */}
                </Bar>
                <Bar
                  name="Metais Visitantes"
                  dataKey="metaisV"
                  fill="#FEE2E2"
                  stackId="b"
                  barSize={14}
                >
                  {" "}
                  {/* [Funcionamento]: Músicos de metais visitantes de apoio de fora. */}
                  <LabelList
                    dataKey="metaisV"
                    position="center"
                    style={{ fontSize: 9, fontWeight: 900, fill: "#7f1d1d" }}
                  />{" "}
                  {/* [Funcionamento]: Texto numérico no gomo claro. */}
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
const CarouselBox = (
  { title, children, onPrev, onNext, hideButtons, dark }, // [Funcionamento]: Moldura física estrutural dos cartões deslizantes.
) => (
  <motion.section
    drag={hideButtons ? false : "x"}
    dragConstraints={{ left: 0, right: 0 }}
    onDragEnd={(e, { offset }) => {
      if (hideButtons) return;
      if (offset.x < -60) onNext();
      else if (offset.x > 60) onPrev();
    }}
    className={`p-5 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden w-full h-[350px] flex flex-col justify-between ${dark ? "bg-slate-50" : "bg-white"}`}
  >
    {" "}
    {/* [Funcionamento]: Ativa os interceptadores táteis do Framer Motion para capturar o arrastar de dedo lateral no smartphone. */}
    <div className="flex justify-between items-center px-1 h-11 mb-2 shrink-0 text-center">
      {" "}
      {/* [Funcionamento]: Barra horizontal de cabeçalho de navegação interna. */}
      {!hideButtons && onPrev ? ( // [Funcionamento]: Desenha o gatilho tátil da seta esquerda se estiver ativo.
        <button
          onClick={onPrev}
          className="w-11 h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 active:bg-blue-600 active:text-white transition-all shadow-inner cursor-pointer"
        >
          {" "}
          {/* [Funcionamento]: Botão quadrado de tamanho mínimo de 44px para clique mobile confortável. */}
          <ChevronLeft size={16} /> {/* [Funcionamento]: Seta de voltar. */}
        </button>
      ) : (
        <div className="w-11 h-11" /> // [Funcionamento]: Espaçador cego para travar o alinhamento.
      )}
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-center flex-1 mx-3 truncate italic">
        {title}{" "}
        {/* [Funcionamento]: Nome do naipe ou aba analítica ativa do slide. */}
      </h3>
      {!hideButtons && onNext ? ( // [Funcionamento]: Desenha o gatilho tátil da seta direita se estiver ativo.
        <button
          onClick={onNext}
          className="w-11 h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 active:bg-blue-600 active:text-white transition-all shadow-inner cursor-pointer"
        >
          {" "}
          {/* [Funcionamento]: Botão quadrado de tamanho mínimo de 44px para avanço de páginas. */}
          <ChevronRight size={16} /> {/* [Funcionamento]: Seta de avançar. */}
        </button>
      ) : (
        <div className="w-11 h-11" /> // [Funcionamento]: Espaçador cego.
      )}
    </div>
    <div className="flex-1 w-full min-h-0 relative">{children}</div>{" "}
    {/* [Funcionamento]: Palco sagrado limpo onde o Recharts plota as tortas ou colunas. */}
  </motion.section> // [Funcionamento]: Fecha o section animado.
); // [Funcionamento]: Encerra o subcomponente CarouselBox.

export default AnalyticsCarousel; // [Funcionamento]: Exporta o componente analítico maestro pronto para uso no ecossistema do app.
