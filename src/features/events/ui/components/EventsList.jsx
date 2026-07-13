import React from "react"; // Explicação: Importa la base de React para construir y renderizar componentes funcionales.
// PRESERVAÇÃO: Importações originais mantidas
import {
  ChevronDown,
  Lock,
  ShieldCheck,
  Trash2,
  Globe,
  MapPin,
} from "lucide-react"; // Explicação: Importa os ícones de setas, cadeados, escudos e alfinetes de mapas da biblioteca.

// v1.3.4: CONFIGURAÇÃO DE SEGURANÇA E PARAMETRIZAÇÃO CONTEXTUAL DE PERMISSÕES
import { hasPermission } from "../../../../shared/config/permissions"; // Explicação: Importa o gerenciador oficial da portaria para verificar se o usuário pode realizar ações.

/**
 * Componente dedicado à listagem de ensaios agrupados por ano.
 * v1.3.4 - FIXED OBJECT PASSING TO PREVENT RUNTIME ERRORS AND UNLOCK GEM LIXEIRA
 */
const EventsList = ({
  groupedEvents = {}, // Explicação: Recebe o dicionário contendo os ensaios já indexados e separados por ano de ocorrência.
  openYears = {}, // Explicação: Dicionário reativo que diz se a sanfona daquele ano específico encontra-se aberta ou fechada.
  toggleYear, // Explicação: Função disparadora para inverter o estado visual de fechamento do acordeão do ano.
  onSelectEvent, // Explicação: Função responsável por capturar o clique e focar a navegação no painel do ensaio escolhido.
  setEventToDelete, // Explicação: Função que joga a ID do ensaio na fila de exclusão abrindo o aviso nativo da lixeira.
  temPermissaoAqui, // Explicação: Propriedade herdada informando se o usuário possui direito de escrita genérica.
  userData, // Explicação: Recebe o pacote de dados do crachá eletrônico do usuário logado (nível, e-mail, comumId).
}) => {
  // Explicação: Extrai as chaves do dicionário de anos e organiza do ano mais novo para o mais antigo de mercado.
  const years = Object.keys(groupedEvents || {}).sort((a, b) => b - a);

  // Função utilitária para exibição abreviada dos meses
  const formatMonth = (dateStr) => {
    // Explicação: Recorta a string estável americana de data e converte o mês em sigla textual brasileira.
    if (!dateStr || typeof dateStr !== "string" || !dateStr.includes("-"))
      return "---"; // Explicação: Proteção de barreira sanitária caso o formato venha inválido.
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ]; // Vetor indexado de meses.
    const m = parseInt(dateStr.split("-")[1]) - 1; // Explicação: Captura o número central do mês e subtrai um para casar com o índice do array.
    return months[m] || "---"; // Retorna o texto convertido.
  };

  return (
    // Explicação: Desenha o layout do esqueleto da listagem cronológica na tela do celular.
    <div className="space-y-8 max-w-md mx-auto text-left">
      {" "}
      {/* Explicação: Grid empilhado verticalmente limitado a larguras mobile e alinhado à esquerda. */}
      {years.map(
        (
          year, // Explicação: Inicia a varredura dos anos disponíveis para criar os blocos sanfona.
        ) => (
          <div key={year} className="space-y-4 text-left">
            {/* Cabeçalho do Ano (Accordion com Toque Ergonômico) */}
            <button
              type="button" // Explicação: Declara o tipo do elemento como botão nativo de controle.
              onClick={() => toggleYear(year)} // Explicação: Inverte o recolhimento da sanfona daquele ano ao toque.
              className="flex items-center gap-4 w-full px-2 group active:opacity-60 transition-all text-left outline-none cursor-pointer min-h-[44px]" // Explicação: Área confortável de clique, efeito de esmaecimento reativo e sem bordas feias.
            >
              <span className="text-3xl font-[900] italic text-slate-950 tracking-tighter text-left leading-none">
                {year}
              </span>{" "}
              {/* Número do ano em destaque extra negrito. */}
              <div className="h-[2px] flex-1 bg-slate-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>{" "}
              {/* Linha estética horizontal expansiva. */}
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 shrink-0">
                {" "}
                {/* Moldura para a seta. */}
                <ChevronDown
                  size={14}
                  className={`text-slate-300 transition-transform duration-500 shrink-0 ${openYears[year] ? "rotate-180" : ""}`} // Explicação: Gira a seta em 180 graus de forma suave se a sanfona estiver expandida.
                />
              </div>
            </button>

            {/* Lista de Ensaios do Ano Expandido */}
            {openYears[year] && ( // Explicação: Avalia o dicionário e abre as fileiras de cartões apenas se o ano estiver verdadeiro.
              <div className="space-y-4 animate-in fade-in duration-300 text-left">
                {(groupedEvents[year] || []).map((e) => {
                  // Explicação: Começa a processar e desenhar os cartões individuais de cada ensaio cadastrado.
                  if (!e || !e.id) return null; // 🚀 CURTO-CIRCUITO NULL-SAFETY: Pula a renderização de cartões fantasmas vazios, evitando quebras de carregamento.

                  const isClosed = e.ata?.status === "closed"; // Explicação: Verifica se a ata foi fechada e salva em modo definitivo de ata histórica.
                  const isRegional = e.scope === "regional"; // Explicação: Verifica se o escopo da agenda é de nível Regional centralizado.

                  // IDENTIFICAÇÃO DE CONVIDADO: Se o evento não é da minha comum mas eu fui convidado
                  const isGuest =
                    e.comumId !== userData?.comumId &&
                    (e.invitedUsers || []).includes(userData?.uid); // Explicação: Verifica se o ID do secretário está no vetor de permissões extras de ajuda de contagem.

                  // 🚀 REFACHAMENTO CONTEXTUAL DE OURO: Repassa o objeto INTEIRO do ensaio 'e' para o cérebro de permissões validar scope e comumId simultaneamente!
                  const podeApagarEsteEvento = hasPermission(
                    userData,
                    "delete_event",
                    e,
                  );

                  // Definição dinâmica de cores e ícones baseada no escopo
                  const scopeColor = isRegional
                    ? "text-blue-600"
                    : "text-amber-500"; // Azul para regional, amarelo para local.
                  const sidebarColor = isRegional
                    ? "bg-blue-600"
                    : isGuest
                      ? "bg-blue-400"
                      : "bg-slate-950"; // Injeta tom ardósia, azul ou turquesa na linha indicativa.

                  return (
                    // Explicação: Renderiza o cartão físico interativo do ensaio.
                    <div
                      key={e.id} // Chave identificadora única exigida pelo React.
                      onClick={() => onSelectEvent(e.id)} // Explicação: Abre o painel completo do contador numérico/nominal do ensaio.
                      className={`bg-white p-6 rounded-[2.5rem] border flex justify-between items-center shadow-sm active:scale-95 transition-all relative overflow-hidden group text-left cursor-pointer ${isGuest ? "border-blue-100" : "border-slate-100"}`} // Explicação: Design premium com cantos hiper arredondados e efeito de encolhimento elástico ao toque do polegar.
                    >
                      {/* Barra Lateral Indicativa de Status de UI */}
                      <div
                        className={`absolute left-0 top-0 h-full w-1.5 ${isClosed ? "bg-slate-300" : sidebarColor}`}
                      />{" "}
                      {/* Explicação: Fica cinza fosco se o livro estiver trancado, sinalizando somente leitura. */}
                      <div className="flex items-center gap-5 text-left flex-1 min-w-0 pr-2">
                        {/* Calendário do Card (Data do Ensaio) */}
                        <div
                          className={`flex flex-col items-center justify-center w-16 h-16 rounded-[1.8rem] border-2 transition-colors shrink-0 ${
                            isClosed
                              ? "bg-slate-50 border-slate-100 text-slate-300"
                              : isRegional
                                ? "bg-blue-50 border-blue-600 text-blue-600"
                                : isGuest
                                  ? "bg-blue-50 border-blue-400 text-blue-600"
                                  : "bg-white border-slate-950 text-slate-950 shadow-md"
                          }`}
                        >
                          <span className="text-2xl font-[900] italic leading-none">
                            {e.date?.split("-")[2] || "--"}
                          </span>{" "}
                          {/* Recorta e exibe o número do dia. */}
                          <span className="text-[8px] font-black uppercase mt-1 tracking-widest leading-none">
                            {formatMonth(e.date)}
                          </span>{" "}
                          {/* Exibe a sigla do mês convertida. */}
                        </div>

                        {/* Informações Textuais do Ensaio por Extenso */}
                        <div className="text-left leading-none flex-1 min-w-0">
                          <div className="flex flex-col gap-1.5 mb-1.5 text-left">
                            {/* Badge de Colaboração para Convidados */}
                            {isGuest && ( // Explicação: Exibe etiqueta luminosa pulsante informando que o obreiro é visitante autorizado.
                              <span className="text-[6px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full w-fit tracking-widest uppercase italic animate-pulse leading-none">
                                Colaboração Externa
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 text-left w-full">
                              {(isRegional || isGuest) && !isClosed && (
                                <Globe
                                  size={8}
                                  className="text-blue-600 shrink-0"
                                />
                              )}{" "}
                              {/* Desenha o ícone de globo terrestre para sinalizar relevância regional. */}
                              <p
                                className={`text-[8px] font-black uppercase italic tracking-[0.2em] leading-none text-left truncate ${isClosed ? "text-slate-300" : scopeColor}`}
                              >
                                {e.type ||
                                  (isRegional
                                    ? "Ensaio Regional"
                                    : "Ensaio Local")}{" "}
                                {/* Imprime a modalidade textual do evento. */}
                              </p>
                            </div>
                          </div>
                          <h4
                            className={`text-[13px] font-[900] uppercase italic tracking-tighter text-left leading-tight truncate w-full ${isClosed ? "text-slate-400" : "text-slate-950"}`}
                          >
                            {e.responsavel}{" "}
                            {/* Imprime o nome completo do Ancião ou Encarregado de atendimento. */}
                          </h4>
                          {(isGuest || isRegional) && ( // Explicação: Se o ensaio envolver tráfego geográfico externo, denormaliza e mostra o nome da igreja por extenso.
                            <div className="flex items-center gap-1 mt-1.5 opacity-40 text-left w-full">
                              <MapPin size={8} className="shrink-0" />
                              <p className="text-[7px] font-bold uppercase text-left truncate flex-1">
                                {e.comumNome || "Local não informado"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Ícones de Ações e Lixeira Defensiva Segura */}
                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(cl) => cl.stopPropagation()}
                      >
                        {" "}
                        {/* 🚀 TRAVA DE PROPAGAÇÃO DE FILHO: Bloqueia que o toque nos botões da direita acione o clique do card pai por acidente. */}
                        {isClosed ? (
                          <Lock size={16} className="text-slate-200 shrink-0" /> // Desenha o cadeado cinza fosco de livro trancado.
                        ) : (
                          <ShieldCheck
                            size={16}
                            className={`shrink-0 ${isRegional || isGuest ? "text-blue-500" : "text-emerald-500"} animate-pulse`}
                          /> // Desenha o escudo pulsante de coleta ao vivo.
                        )}
                        {/* v1.3.4: Lógica de exclusão reativa baseada na Portaria Null-Safety Contextual */}
                        {podeApagarEsteEvento &&
                          !isClosed && ( // Explicação: Acende e renderiza o botão vermelho da lixeira se o crachá local do GEM bater territorialmente.
                            <button
                              type="button" // Explicação: Garante o comportamento liso do botão.
                              onClick={(ex) => {
                                ex.preventDefault(); // Corta comportamentos nativos.
                                ex.stopPropagation(); // Explicação: Trava extra de redundância contra disparos falsos no card pai.
                                setEventToDelete(e.id); // Explicação: Envia a identificação estável para a caixa de confirmação nativa de lixeira.
                              }}
                              className="bg-red-50 text-red-400 p-3 rounded-2xl active:bg-red-500 active:text-white transition-all shadow-sm cursor-pointer shrink-0 min-h-[36px] flex items-center justify-center border border-transparent hover:border-red-100" // Explicação: Área confortável mobile de no mínimo 36px/44px de aproximação física para o dedo.
                            >
                              <Trash2 size={16} /> {/* Ícone de lixeira. */}
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
};

export default EventsList;
