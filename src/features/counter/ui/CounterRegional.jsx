import React, { useState, useMemo } from "react"; // Explicação: Ferramentas básicas para criar a tela e memorizar cálculos.
import { motion, AnimatePresence } from "framer-motion"; // Explicação: Ferramentas para animações suaves de abrir e fechar as famílias.
import { Plus, UserPlus, ChevronDown, Users, Calculator } from "lucide-react"; // Explicação: Ícones visuais (mais, seta, pessoas).
import { db, doc, writeBatch } from "@/shared/api/firebase"; // Explicação: Conexão com o banco de dados do Google.
import toast from "react-hot-toast"; // Explicação: Avisos flutuantes na tela.
import { eventService } from "@/shared/api/eventService"; // Para salvar a opção de dedução
// PRESERVAÇÃO: Importação mantida conforme estrutura do projeto
import InstrumentCard from "./InstrumentCard"; // Explicação: Importa o cartão individual de cada instrumento.

/**
 * Módulo de Contagem para Ensaios Regionais
 * v10.2 - FIX PERMISSÃO VISUAL COMPLETA EM PARALELO
 * Conecta e consome a função isEditingEnabled para destravar os botões do GEM Local no celular.
 */
const CounterRegional = ({
  instruments, // Explicação: Lista de instrumentos vindos do banco de dados.
  localCounts, // Explicação: Números atuais da contagem espelhados na tela.
  sections, // Explicação: Famílias de instrumentos (Cordas, Madeiras, etc).
  onUpdate, // Explicação: Função encarregada de disparar a gravação com debounce do número digitado.
  onToggleSection, // Explicação: Função para assumir a posse de governança técnica de uma seção.
  onAddExtra, // Explicação: Função para adicionar um instrumento avulso fora da grade padrão.
  userData, // Explicação: Dados cadastrais e Custom Claims do usuário logado (Crachá).
  isClosed, // Explicação: Indica se o ensaio ou ata geral já acabou (Bloqueio total de edição).
  currentEventId, // Explicação: ID de identificação física do evento ativo.
  onFocus, // Explicação: Função que ativa o escudo de foco quando o usuário começa a digitar no campo.
  onBlur, // Explicação: Função que desativa o escudo de foco quando o usuário encerra a digitação.
  isEditingEnabled, // 🚀 INJEÇÃO DE INFRAESTRUTURA FRONTAL: Recebe o método de portaria visual para validar o clique em cada linha da Flat-List.
  ataData,
}) => {
  // JUSTIFICATIVA: Estado local para garantir Accordion independente por usuário.
  const [openSections, setOpenSections] = useState({}); // Explicação: Controla quais famílias estão abertas exclusivamente no celular do usuário ativo.

  const toggleAccordion = (section) => {
    // Explicação: Abre ou fecha uma família de instrumentos (ex: abre ou fecha a sanfona de Cordas).
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }; // Explicação: Encerra o alternador de sanfona.

  const getSectionColor = (section) => {
    // Explicação: Define a cor da barrinha lateral de cada família para facilitar a identificação visual rápida de toque.
    const s = section.toUpperCase(); // Explicação: Converte o nome do naipe para letras maiúsculas.
    if (s.includes("CORDAS")) return "bg-amber-500"; // Explicação: Laranja para cordas.
    if (s.includes("MADEIRAS")) return "bg-emerald-500"; // Explicação: Verde para madeiras.
    if (s.includes("METAIS")) return "bg-rose-500"; // Explicação: Rosa/Vermelho para metais.
    if (s.includes("SAX")) return "bg-emerald-400"; // Explicação: Verde claro para saxofones.
    if (s.includes("ORGANISTAS")) return "bg-purple-500"; // Explicação: Roxo para organistas.
    if (s.includes("IRMANDADE")) return "bg-blue-600"; // Explicação: Azul para irmandade geral.
    return "bg-slate-500"; // Explicação: Cinza neutro para o restante.
  }; // Explicação: Encerra o seletor de cores de naipe.

  const getSectionTotal = (sectionName) => {
    // Explicação: Calculates a soma de todos os instrumentos de uma família para mostrar em tempo real no cabeçalho.
    const sName = sectionName.toUpperCase(); // Explicação: Converte para caixa alta técnica.

    // Explicação: Localiza o ID principal para soma correta do cabeçalho de relatórios.
    const masterInst = (instruments || []).find(
      (i) =>
        i &&
        i.id &&
        !i.id.startsWith("meta_") &&
        (i.section || "").toUpperCase() === sName &&
        !["irmas", "irmaos"].includes(i.id.toLowerCase()),
    ); // Explicação: Termina a varredura do instrumento mestre da seção.

    // Explicação: Se for Irmandade ou Órgão, busca o total consolidado sem pulverizar subcampos.
    if (sName === "IRMANDADE" || sName === "ORGANISTAS") {
      const mId = masterInst?.id || (sName === "IRMANDADE" ? "coral" : "orgao"); // Explicação: Pareia com o ID unificado em minúsculo do Firestore.
      return parseInt(localCounts?.[mId]?.total) || 0; // Explicação: Extrai o total numérico do nó de dados correspondente da nuvem.
    } // Explicação: Encerra o cálculo de seções complexas.

    // Explicação: Soma todos os instrumentos comuns que pertencem a esta família para atualizar a tela de trás.
    return (instruments || [])
      .filter(
        (i) =>
          i &&
          i.id &&
          !i.id.startsWith("meta_") &&
          (i.section || "").toUpperCase() === sName,
      )
      .reduce(
        (acc, inst) => acc + (parseInt(localCounts?.[inst.id]?.total) || 0),
        0,
      ); // Explicação: Acumula a soma matemática dos subcampos totais.
  }; // Explicação: Encerra o método getSectionTotal.

  const handleToggleDeducao = async () => {
    if (!currentEventId || !ataData?.comumId) return;
    try {
      await eventService.saveAtaData(ataData.comumId, currentEventId, {
        ...ataData,
        deduzirOrganistas: !ataData?.deduzirOrganistas,
      });
      toast.success("Regra de cálculo atualizada!");
    } catch (e) {
      console.error("Erro ao salvar regra de dedução:", e);
      toast.error("Erro ao salvar regra.");
    }
  };

  return (
    // Explicação: Inicia o desenho da lista de famílias estruturadas no celular.
    <div className="space-y-4 pb-32 animate-premium text-left">
      {sections.map((section) => {
        // Explicação: Percorre cada grupo territorial (Cordas, Metais, etc) via laço map.
        const isIrmandade = section.toUpperCase() === "IRMANDADE"; // Explicação: Identifica se o naipe varrido corresponde à Irmandade geral.
        const isOrganistas = section.toUpperCase() === "ORGANISTAS"; // Explicação: Identifica se o naipe varrido corresponde às organistas.

        // Explicação: Alinha e filtra as pílulas organizadas pelo peso numérico da propriedade .ordem da Comum de cadastro fixo.
        const sectionInstruments = (instruments || [])
          .filter(
            (i) =>
              i &&
              i.id &&
              !i.id.startsWith("meta_") &&
              (i.section || "").toUpperCase() === section.toUpperCase(),
          )
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)); // Explicação: Organiza de forma crescente o array pelos pesos numéricos do Firebase, casando com o Front.

        // Explicação: Sincroniza o ID Mestre para controle de posse em caixa baixa.
        const masterId =
          sectionInstruments.find(
            (i) => !["irmas", "irmaos"].includes(i.id.toLowerCase()),
          )?.id || (isIrmandade ? "coral" : isOrganistas ? "orgao" : null); // Explicação: Sincroniza o ID Mestre para controle de posse em caixa baixa.
        const masterData = localCounts?.[masterId] || {}; // Explicação: Resgata o mapa de dados e assinaturas do instrumento mestre da memória RAM.

        let totalNaipe = getSectionTotal(section); // Explicação: Resgata o total calculativo do grupo varrido.

        // AJUSTE PARA DEDUÇÃO DE ORGANISTAS
        if (
          (section === "IRMANDADE" || section === "CORAL") &&
          ataData?.deduzirOrganistas
        ) {
          const organistasTotal = parseInt(localCounts?.orgao?.total) || 0;
          totalNaipe = Math.max(0, totalNaipe - organistasTotal);
        }
        const isOpen = openSections[section]; // Explicação: Checa se a sanfona está marcada como aberta na memória.

        return (
          <div
            key={section}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mx-2 text-left"
          >
            {/* HEADER - Botão de abertura da família */}
            <button
              type="button" // Explicação: Força a tipagem de botão sem comportamento de submit de formulário.
              onClick={() => toggleAccordion(section)} // Explicação: Abre ou fecha o colapsável correspondente ao toque do celular.
              className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-all text-left cursor-pointer" // Explicação: Layout Tailwind expansível com área de toque mínima de 44px.
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-10 rounded-full ${getSectionColor(section)}`}
                />
                <div className="leading-none text-left">
                  <p className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter mb-1 leading-none">
                    {section}
                  </p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {isIrmandade
                      ? "PÚBLICO GERAL"
                      : `${sectionInstruments.length} INSTRUMENTOS`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-black text-slate-400 uppercase italic mb-0.5">
                    Total
                  </span>
                  <div className="bg-slate-950 px-3 py-1 rounded-xl shadow-lg border border-white/10">
                    <span className="text-xs font-[900] text-white italic leading-none">
                      {totalNaipe}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-slate-300 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* CONTEÚDO EXPANSÍVEL */}
            <AnimatePresence>
              {isOpen && ( // Explicação: Se a sanfona estiver marcada como aberta, renderiza o bloco interno com animação fluida móvel.
                <motion.div
                  initial={{ height: 0, opacity: 0 }} // Explicação: Estado inicial encolhido e transparente de animação.
                  animate={{ height: "auto", opacity: 1 }} // Explicação: Expande automaticamente a altura de forma fluida baseada no conteúdo.
                  exit={{ height: 0, opacity: 0 }} // Explicação: Encolhe suavemente na saída de desmontagem.
                  transition={{ duration: 0.3, ease: "easeInOut" }} // Explicação: Define o tempo de transição técnica de 300 milissegundos.
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-6 space-y-3 pt-2 text-left">
                    {/* NOVO: Checkbox para dedução de organistas */}
                    {(section === "IRMANDADE" || section === "CORAL") && (
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-between gap-3 text-left my-2">
                        <div className="leading-none">
                          <p className="text-[9px] font-black text-blue-800 uppercase italic flex items-center gap-1.5">
                            <Calculator size={12} /> Regra de Cálculo
                          </p>
                          <p className="text-[7px] font-bold text-slate-500 uppercase mt-1">
                            Deduzir organistas do total de irmãs no coral?
                          </p>
                        </div>
                        <button
                          disabled={isClosed || !isEditingEnabled(section)}
                          onClick={handleToggleDeducao}
                          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 cursor-pointer outline-none ${ataData?.deduzirOrganistas ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-300 ${ataData?.deduzirOrganistas ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </div>
                    )}

                    {isIrmandade ? ( // Explicação: Bifurcação lógica: Desenha o layout especial para Irmãs e Irmãos (Coral).
                      <div className="space-y-3 text-left">
                        <InstrumentCard
                          key="irmas_row"
                          inst={{
                            id: "irmas",
                            nome: "IRMÃS",
                            label: "IRMÃS",
                            section: "IRMANDADE",
                          }} // Explicação: Entrega o objeto fixo de mapeamento de gênero.
                          data={masterData} // Explicação: Passa o mapa de dados e responsáveis do Coral unificado.
                          onUpdate={onUpdate} // Explicação: Vincula a ação de alteração numérica de contadores.
                          onToggleOwnership={() =>
                            onToggleSection(
                              masterId,
                              masterData?.responsibleId_irmas === userData?.uid,
                              "irmas",
                            )
                          } // Explicação: Dispara a posse individual da ala feminina.
                          userData={userData} // Explicação: Repassa o crachá do secretário ativo para controle.
                          disabled={
                            typeof isEditingEnabled === "function"
                              ? !isEditingEnabled(section, "irmas")
                              : isClosed
                          } // 🚀 BLINDAGEM DE FILTRO REGIONAL: Consome a função mestre da tela para acender os botões do GEM Local!
                          isRegional={true} // Explicação: Força a flag de comportamento regional para ocultar Toques Azuis locais.
                          sectionName={section} // Explicação: Repassa o nome textual do naipe correspondente.
                          onFocus={onFocus} // Explicação: Protege o campo contra zeragem externa durante digitação ativa.
                          onBlur={onBlur} // Explicação: Desativa a trava de foco liberando novas escutas do onSnapshot.
                        />
                        <InstrumentCard
                          key="irmaos_row"
                          inst={{
                            id: "irmaos",
                            nome: "IRMÃOS",
                            label: "IRMÃOS",
                            section: "IRMANDADE",
                          }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() =>
                            onToggleSection(
                              masterId,
                              masterData?.responsibleId_irmaos ===
                                userData?.uid,
                              "irmaos",
                            )
                          } // Explicação: Dispara a posse individual da ala masculina.
                          userData={userData}
                          disabled={
                            typeof isEditingEnabled === "function"
                              ? !isEditingEnabled(section, "irmaos")
                              : isClosed
                          } // 🚀 BLINDAGEM DE FILTRO REGIONAL: Consome a função mestre da tela para acender os botões do GEM Local!
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    ) : isOrganistas ? ( // Explicação: Bifurcação lógica: Desenha o layout especial focado no Órgão eletrônico.
                      <div className="space-y-3 text-left">
                        <InstrumentCard
                          key="orgao_row"
                          inst={{
                            id: "orgao",
                            nome: "ÓRGÃO",
                            label: "ÓRGÃO",
                            section: "ORGANISTAS",
                          }}
                          data={masterData}
                          onUpdate={onUpdate}
                          onToggleOwnership={() =>
                            onToggleSection(
                              masterId,
                              masterData?.responsibleId === userData?.uid,
                            )
                          } // Explicação: Dispara a posse do teclado do órgão.
                          userData={userData}
                          disabled={
                            typeof isEditingEnabled === "function"
                              ? !isEditingEnabled(section, "orgao")
                              : isClosed
                          } // 🚀 BLINDAGEM DE FILTRO REGIONAL: Consome a função mestre da tela para acender os botões do GEM Local!
                          isRegional={true}
                          sectionName={section}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    ) : (
                      /* LISTAGEM PADRÃO SEGUIDO POR CADEIRAS DINÂMICAS: Violinos, Flautas, Trombones, etc */
                      <div className="space-y-3 text-left">
                        {sectionInstruments.length > 0 ? (
                          sectionInstruments.map((inst) => (
                            <InstrumentCard
                              key={inst.id}
                              inst={inst}
                              data={localCounts?.[inst.id] || {}}
                              onUpdate={onUpdate}
                              onToggleOwnership={() =>
                                onToggleSection(
                                  inst.id,
                                  localCounts?.[inst.id]?.responsibleId ===
                                    userData?.uid,
                                )
                              } // Explicação: Posse individualizada por instrumento comum linear da orquestra.
                              userData={userData}
                              disabled={
                                typeof isEditingEnabled === "function"
                                  ? !isEditingEnabled(section, inst.id)
                                  : isClosed
                              } // 🚀 BLINDAGEM DE FILTRO REGIONAL: Consome a função mestre da tela para acender os botões de + e - para o GEM Local!
                              isRegional={true}
                              sectionName={section}
                              onFocus={onFocus}
                              onBlur={onBlur}
                            />
                          ))
                        ) : (
                          <p className="text-center py-4 text-[8px] font-bold text-slate-300 uppercase italic">
                            Vazio
                          </p>
                        )}
                      </div>
                    )}

                    {/* BOTÃO INSTRUMENTO EXTRA */}
                    {!isClosed &&
                      !isIrmandade &&
                      !isOrganistas &&
                      isEditingEnabled(section) && (
                        <button
                          type="button" // Explicação: Evita disparos co laterais de formulários HTML.
                          onClick={() => onAddExtra(section)} // Explicação: Abre o modal para cadastrar novos itens dinâmicos extras criados em tempo de execução.
                          className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all cursor-pointer hover:text-indigo-600 hover:border-indigo-200" // Explicação: Design Mobile-First com feedback tátil ativo e stacking vertical em telas estreitas.
                        >
                          <Plus size={16} strokeWidth={3} />
                          <span className="text-[9px] font-black uppercase italic tracking-widest">
                            Incluir Instrumento Extra
                          </span>
                        </button>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default CounterRegional; // Explicação: Exporta o componente pronto e blindado para os ensaios regionais.
