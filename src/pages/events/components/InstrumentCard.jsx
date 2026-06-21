import React from 'react'; // Explicação: Importa a base do React para criar componentes.
// PRESERVAÇÃO: Importações originais mantidas
import { Minus, Plus, Lock, User, UserCheck, ShieldCheck, UserPlus } from 'lucide-react'; // Explicação: Importa os ícones de botões e escudos.

/**
 * InstrumentCard v10.4 - STABILIZED ERGONOMIC UI FIXED
 * v10.4 - FIX VISUAL SMASHED LAYOUT WITH LEAN INTEGRATION
 * Esta versão garante que o onSnapshot do Firebase não apague o que o usuário digita.
 */
const InstrumentCard = ({ 
  inst, // Explicação: Dados fixos do instrumento (nome, id).
  data, // Explicação: Dados dinâmicos vindos do banco (números atuais).
  onUpdate, // Explicação: Função para salvar a nova contagem.
  onToggleOwnership, // Explicação: Função para assumir a posse do instrumento.
  userData, // Explicação: Dados do contador logado (crachá).
  isClosed, // Explicação: Verifica se o ensaio está encerrado.
  isRegional, // Explicação: Verifica se o layout é o regional (em lista).
  labelLideranca, // Explicação: Texto customizado para o campo de encarregados.
  sectionName, // Explicação: Nome da família (Cordas, Madeiras...).
  onFocus, // Explicação: Avisa o sistema para proteger este campo enquanto o usuário digita [v10.0].
  onBlur // Explicação: Avisa o sistema para liberar o campo após a digitação [v10.0].
}) => {
  // BLINDAGEM CRÍTICA: Se não houver dados básicos, não desenha nada para evitar erro no app.
  if (!inst || !inst.id) return null; // Explicação: Aborta imediatamente a renderização se o instrumento vier sem identificador.

  // Explicação: Identifica se este cartão pertence ao grupo do Coral ou Irmandade.
  const isIrmandade = ['irmandade', 'irmas', 'irmaos', 'coral'].includes(inst.id.toLowerCase() || '');
  
  // Explicação: Identifica se este cartão é de organista para aplicar tratamento especial de cargo.
  const isOrganista = inst.id?.toLowerCase().includes('organista') || 
                      inst.name?.toLowerCase().includes('organ') || 
                      inst.label?.toLowerCase().includes('orgao') ||
                      inst.id?.toLowerCase().includes('orgao');

  // Explicação: Identifica se é um campo de liderança ou examinadora.
  const isGovernance = (inst.isGovernance || inst.id?.includes('enc_local') || inst.evalType === 'Examinadora') && !isOrganista;
  
  // LÓGICA DE POSSE INDIVIDUALIZED: Identifica quem é o "dono da caneta" agora.
  const myUID = userData?.uid || userData?.id; // Explicação: Captura o ID único do usuário atual.
  const subId = inst.id.toLowerCase(); // Explicação: Facilita a comparação de nomes técnicos.
  
  // Explicação: Checa se "Eu" sou o responsável por este instrumento neste momento.
  const isMyTurn = (subId === 'irmas' || subId === 'irmaos') 
    ? data?.[`responsibleId_${subId}`] === myUID
    : data?.responsibleId === myUID;

  // Explicação: Checa se "Outra Pessoa" já assumiu este instrumento, para desativar visualmente.
  const isOtherTurn = (subId === 'irmas' || subId === 'irmaos')
    ? data?.[`responsibleId_${subId}`] && data?.[`responsibleId_${subId}`] !== myUID
    : data?.responsibleId && data?.responsibleId !== myUID;
  
  // REGRA DE OURO: Define se os botões de edição estarão liberados conforme a Matriz de Poder.
  const canEdit = !isClosed && (isRegional ? isMyTurn : true); // Explicação: No Regional exige posse; no Local todos (aprovados) editam.

  // SANEAMENTO DE DADOS: Transforma os valores do banco em números inteiros para evitar erros de soma.
  const total = parseInt(data?.total) || 0; // Explicação: Converte e limpa o valor numérico total de músicos.
  const comum = parseInt(data?.comum) || 0; // Explicação: Converte e limpa o valor numérico de músicos da casa.
  const enc = parseInt(data?.enc) || 0; // Explicação: Converte e limpa o valor numérico de encarregados locais presentes.
  const irmaos = parseInt(data?.irmaos) || 0; // Explicação: Converte e limpa o valor de irmãos para o caso exclusivo do Coral.
  const irmas = parseInt(data?.irmas) || 0; // Explicação: Converte e limpa o valor de irmãs para o caso exclusivo do Coral.
  
  // Explicação: CORREÇÃO DA MUTAÇÃO: Corrige o bug de digitação de fallback de "iromaos" para "irmaos", alinhando o valor otimista da tela.
  const displayVal = subId === 'irmas' ? irmas : subId === 'irmaos' ? irmaos : total;
  
  // Explicação: Cálculo automático de visitas em tempo real (Total menos os da casa).
  const visitas = Math.max(0, total - comum);
  // Explicação: Bloqueia campos de detalhe (comum/liderança) se o Total for zero.
  const isSubFieldDisabled = !canEdit || total === 0;

  /**
   * handleUpdate v3.16 - Lógica de Saneamento Hierárquico
   */
  const handleUpdate = (field, value) => {
    if (!canEdit) return; // Explicação: Se não tiver poder de edição, ignora a ação.
    let finalValue = Math.max(0, parseInt(value) || 0); // Explicação: Bloqueia números negativos.
    
    // REGRA DE OURO: Comum e Liderança nunca podem ultrapassar o valor Total.
    if ((field === 'comum' || field === 'enc') && finalValue > total) {
      finalValue = total;
    }

    // REGRA DE CASCATA: Se o Total diminuir, o sistema reduz Comum e Encarregado para manter a lógica.
    if (field === 'total') {
      if (comum > finalValue) onUpdate(inst.id, 'comum', finalValue, sectionName);
      if (enc > finalValue) onUpdate(inst.id, 'enc', finalValue, sectionName);
    }

    onUpdate(inst.id, field, finalValue, sectionName); // Explicação: Envia o valor higienizado para o banco de dados.
  };

  return ( // Explicação: Desenha o cartão do instrumento com bordas arredondadas (Higiene de UI).
    <div className={`p-4 rounded-[2rem] border transition-all relative overflow-hidden bg-white shadow-sm w-full ${
      isMyTurn ? 'border-blue-500 ring-1 ring-blue-100' : isOtherTurn ? 'opacity-70 border-slate-200' : 'border-slate-100'
    }`}>
      
      <div className="mb-3 flex justify-between items-start pr-2 text-left w-full"> {/* Explicação: Container do cabeçalho alinhado no topo do cartão ocupando a largura total. */}
        <div className="flex flex-col text-left leading-none min-w-0 flex-1"> {/* Explicação: Alinha verticalmente os textos protegendo contra estouro de largura. */}
          <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1 flex items-center gap-2 truncate"> {/* Explicação: Título em destaque ultra-negrita para o nome do instrumento com corte de texto longo. */}
            {inst.label || inst.name || inst.nome || 'INSTRUMENTO'} {/* Explicação: ADEQUAÇÃO LEAN: Busca as referências do nome do objeto mestre 'inst' já que o nó 'data' do banco foi enxugado. */}
            {(isGovernance || isOrganista) && <ShieldCheck size={12} className="text-blue-500 shrink-0" />} {/* Explicação: Selo de cargo oficial impedido de encolher. */}
          </h5>
          
          {(isOtherTurn || isMyTurn) && ( // Explicação: Exibe quem é o responsável pela contagem deste instrumento.
            <div className="flex items-center gap-1.5 mt-1"> {/* Explicação: Caixa horizontal de alinhamento do ponto luminoso e nome. */}
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMyTurn ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} /> {/* Explicação: Ponto luminoso reativo de controle de dono da aba. */}
              <span className={`text-[7px] font-black uppercase italic truncate ${isMyTurn ? 'text-blue-600' : 'text-slate-400'}`}> {/* Explicação: Rótulo com o nome do obreiro zelador atual do painel com corte de segurança. */}
                {isMyTurn ? 'No seu comando' : `Com: ${data?.[`responsibleName_${subId}`] || data?.responsibleName || 'Colaborador'}`} {/* // Explicação: Imprime dinamicamente a assinatura de posse. */}
              </span>
            </div>
          )}
        </div>

        {isRegional && !isClosed && ( // Explicação: Botão para assumir a posse da contagem em eventos Regionais.
          <button
            type="button" // Explicação: Marca o elemento como botão padrão de controle.
            onClick={(e) => { e.stopPropagation(); onToggleOwnership(); }} // Explicação: Dispara a troca de posse individualizada.
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
              isMyTurn 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`} // Explicação: Estiliza reativamente o botão de acordo com a posse de tela impedido de esmagar.
          >
            <UserPlus size={10} strokeWidth={3} /> {/* Explicação: Desenha o ícone de boneco com sinal de mais de adição. */}
            <span className="text-[8px] font-black uppercase italic">{isMyTurn ? 'LOGADO' : 'ASSUMIR'}</span> {/* // Explicação: Etiqueta textual em caixa alta micro. */}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 w-full"> {/* Explicação: Caixa empilhadora das caixas de contagem numéricas ocupando largura total. */}
        {isIrmandade && isRegional ? ( // Explicação: Desenha layout simples para Irmandade no Regional.
          <div className="flex gap-2 h-28 w-full items-stretch"> {/* Explicação: FIX VISUAL: Força o esticamento vertical (items-stretch) ocupando 100% de largura para não esmagar inputs. */}
            <CounterBox 
               label={inst.label || inst.id.toUpperCase()} // Explicação: Rótulo da pílula numérica.
               color={isMyTurn ? "slate" : "white"} // Explicação: Define se a caixa acende em preto ou branco.
               val={displayVal} // Explicação: Entrega o valor numérico atualizado.
               onChange={v => handleUpdate(subId, v)} // Explicação: Conecta o clique de somar ao método traduzido.
               disabled={!isMyTurn} // Explicação: Desativa os botões se a aba não for sua.
               isMain={true} // Explicação: Ativa fontes grandes de destaque de clique.
               onFocus={() => onFocus && onFocus(inst.id, subId)} // Explicação: Ativa proteção de digitação [v10.0].
               onBlur={() => onBlur && onBlur()} // Explicação: Libera proteção [v10.0].
            />
          </div>
        ) : isIrmandade && !isRegional ? ( // Explicação: Desenha caixas separadas para Irmãs e Irmãos no Local.
          <div className="flex gap-2 h-28 w-full items-stretch"> {/* Explicação: FIX VISUAL: Garante o alinhamento de colunas lado a lado sem esmagamento interno de inputs. */}
            <CounterBox label="IRMÃS" color="slate" val={irmas} onChange={v => handleUpdate('irmas', v)} disabled={!canEdit} isMain={true} onFocus={() => onFocus && onFocus(inst.id, 'irmas')} onBlur={() => onBlur && onBlur()} /> {/* Explicação: Caixa de contagem de irmãs do coral. */}
            <CounterBox label="IRMÃOS" color="white" val={irmaos} onChange={v => handleUpdate('irmaos', v)} disabled={!canEdit} isMain={true} onFocus={() => onFocus && onFocus(inst.id, 'irmaos')} onBlur={() => onBlur && onBlur()} /> {/* Explicação: Caixa de contagem de irmãos do coral. */}
          </div>
        ) : ( // Explicação: Caso contrário, se for um instrumento comum de orquestra (Flauta, Violino, etc.).
          <>
            <div className="flex gap-2 h-28 w-full items-stretch"> {/* Explicação: FIX VISUAL: Une e estica horizontalmente o bloco de Total, Comum e Visitas impedindo o encolhimento que escondia os números na foto. */}
              <CounterBox 
                label="TOTAL" // Explicação: Etiqueta superior da caixinha mestre.
                color={isMyTurn && isRegional ? "slate" : isRegional ? "white" : "slate"} // Explicação: Decide a cor de contraste da caixa mestre de totalização.
                val={displayVal} // Explicação: Passa o valor do total de músicos.
                onChange={v => handleUpdate('total', v)} // Explicação: Dispara a atualização do campo total.
                disabled={isRegional ? !isMyTurn : !canEdit} // Explicação: Trava os botões baseado na permissão calculada.
                isMain={true} // Explicação: Força fontes grandes de alta visibilidade.
                onFocus={() => onFocus && onFocus(inst.id, 'total')} // Explicação: Ativa proteção no campo Total [v10.0].
                onBlur={() => onBlur && onBlur()} // Explicação: Desativa proteção [v10.0].
              />
              
              {!isRegional && !isGovernance && ( // Explicação: Campos detalhados de visitas exclusivos para Ensaios Locais comuns.
                <>
                  <CounterBox 
                    label="COMUM" // Explicação: Identificador da caixinha de músicos da casa.
                    color="white" // Fundo branco clássico de contraste secundário.
                    val={comum} // Passa o valor do número de músicos locais.
                    onChange={v => handleUpdate('comum', v)} // Dispara a atualização controlada em cascata.
                    disabled={isSubFieldDisabled} // Desativa se o total for zero.
                    isMain={false} // Mantém fontes de tamanho médio.
                    maxLimit={total} // Trava de segurança: impede a comum de subir além do total.
                    onFocus={() => onFocus && onFocus(inst.id, 'comum')} // Explicação: Proteção para Comum.
                    onBlur={() => onBlur && onBlur()} // Libera proteção.
                  />
                  <div className={`flex-[0.5] flex flex-col items-center justify-center rounded-[1.5rem] border transition-colors min-w-[50px] ${total === 0 ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}> {/* Explicação: FIX VISUAL: Aplica uma largura mínima de segurança (min-w-[50px]) para o bloco matemático de visitas não sumir. */}
                    <span className={`text-[7px] font-black uppercase tracking-widest mb-1 italic ${total === 0 ? 'text-slate-300' : 'text-blue-400'}`}>Visitas</span> {/* Etiqueta cinza ou azul. */}
                    <span className={`text-2xl font-[900] italic leading-none ${total === 0 ? 'text-slate-200' : 'text-blue-600'}`}>{visitas}</span> {/* Resultado automático da subtração Total - Comum. */}
                  </div>
                </>
              )}
            </div>

            {!isRegional && !isGovernance && ( // Explicação: Barra inferior de controle de Liderança (Encarregados Locais presentes).
              <div className={`mt-0.5 rounded-xl p-2 flex items-center justify-between border transition-all w-full ${isSubFieldDisabled ? 'bg-slate-50 border-slate-100' : 'bg-slate-100/50 border-slate-200/50'}`}> {/* Explicação: Barra horizontal compacta cinza ergonômica ocupando largura total. */}
                <div className="flex items-center gap-2 min-w-0 flex-1"> {/* Explicação: Agrupamento do ícone protegendo contra esmagamento de texto. */}
                  <div className={`p-1.5 rounded-lg text-white shrink-0 ${isSubFieldDisabled ? 'bg-slate-300' : 'bg-slate-950'}`}> {/* Ícone quadrado escuro. */}
                    <UserCheck size={10} strokeWidth={3} /> {/* Explicação: Ícone de verificação de obreiro. */}
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest leading-none truncate"> {/* Texto descritivo truncado para segurança visual. */}
                    {labelLideranca || "Liderança"} {/* Exibe 'Encarregado' ou 'Examinadora' dinamicamente. */}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0"> {/* Agrupa os botões impedindo-os de quebrar de tamanho. */}
                  <button type="button" disabled={isSubFieldDisabled} onClick={() => handleUpdate('enc', enc - 1)} className={`${isSubFieldDisabled ? 'opacity-0' : 'text-slate-400'} p-1.5`}> {/* Botão de diminuir encarregado. */}
                    <Minus size={14} strokeWidth={4}/> {/* Desenha o traço do menos grosso. */}
                  </button>
                  <span className={`text-lg font-[900] italic w-6 text-center ${isSubFieldDisabled ? 'text-slate-200' : 'text-slate-950'}`}>{enc}</span> {/* Exibe o número de encarregados ativos salvos. */}
                  <button 
                    type="button" // Tipo de ação de botão comum.
                    disabled={isSubFieldDisabled || enc >= total} // Bloqueia se o total for zero ou se o encarregado atingir o limite do total de músicos.
                    onClick={() => handleUpdate('enc', enc + 1)} // Dispara a soma de mais um encarregado.
                    className={`${(isSubFieldDisabled || enc >= total) ? 'opacity-20' : 'text-slate-950'} p-1.5 transition-opacity`} // Efeito de esmaecido se atingir a trava limite.
                  >
                    <Plus size={14} strokeWidth={4}/> {/* Desenha o sinal de mais grosso. */}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Componente da Caixinha de Número (Peça atômica isolada do contador)
const CounterBox = ({ label, color, val, onChange, disabled, isMain = false, maxLimit = null, onFocus, onBlur }) => (
  <div className={`flex-1 rounded-[1.5rem] border transition-all relative flex flex-col items-center justify-center overflow-hidden min-w-[65px] h-full ${
    disabled ? 'bg-slate-50 border-slate-100 shadow-inner' : 
    color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-lg' : 
    'bg-white border-slate-100 shadow-sm'
  }`}> {/* Explicação: FIX VISUAL: Aplica largura mínima de segurança (`min-w-[65px]`) e força altura total (`h-full`) para as caixas de input numérico nunca esmagarem como visto na foto de erro. */}
    <p className={`absolute top-2 text-[6px] font-black uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p> {/* Rótulo superior fixo em miniatura (ex: TOTAL, COMUM). */}
    
    <div className="flex items-center w-full h-full pt-3 justify-between"> {/* Explicação: Distribui os elementos internos de clique e número perfeitamente (justify-between). */}
        <button 
          disabled={disabled} // Veta cliques se o painel estiver bloqueado.
          type="button" // Define o tipo de elemento.
          onClick={() => onChange(val - 1)} // Diminui em uma unidade o valor da contagem atual.
          className={`w-8 h-full flex items-center justify-center transition-all shrink-0 ${disabled ? 'opacity-20 pointer-events-none' : 'active:bg-black/10'}`} // Controla o clique lateral impedindo encolhimento.
        >
          <Minus size={isMain ? 14 : 11} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/> {/* Desenha o ícone de menos. */}
        </button>

        <div className="flex-1 flex flex-col items-center justify-center min-w-0"> {/* Caixa central que envelopa o input de digitação direta impedindo quebra de largura. */}
          <input 
            disabled={disabled} // Bloqueia a digitação manual se o cadeado estiver acionado.
            type="number" // Força o formato de número.
            inputMode="numeric" // Explicação: Força o surgimento do teclado numérico limpo no smartphone do usuário.
            className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none px-1 ${isMain ? 'text-4xl' : 'text-2xl'} ${disabled ? 'text-slate-200' : 'text-inherit'}`} // Ajusta o tamanho responsivo das fontes para caber perfeitamente no espaço sem vazar.
            value={val} // Exibe o valor numérico que está na memória.
            onFocus={(e) => { e.target.select(); onFocus && onFocus(); }} // Explicação: Seleciona o texto inteiro ao clicar e aciona o escudo de proteção [v10.0].
            onBlur={() => onBlur && onBlur()} // Explicação: Desativa o escudo liberando a sincronização da nuvem após sair do campo [v10.0].
            onChange={(e) => onChange(parseInt(e.target.value) || 0)} // Limpa e envia o número digitado manualmente pelo usuário.
          />
        </div>

        <button 
          disabled={disabled || (maxLimit !== null && val >= maxLimit)} // Trava o botão de mais se atingir o teto do limite em cascata.
          type="button" // Tipo de elemento.
          onClick={() => onChange(val + 1)} // Soma uma unidade na contagem.
          className={`w-8 h-full flex items-center justify-center transition-all shrink-0 ${(disabled || (maxLimit !== null && val >= maxLimit)) ? 'opacity-10 pointer-events-none' : 'active:bg-black/10'}`} // Efeito visual de clique mobile impedido de esmagar.
        >
          <Plus size={isMain ? 14 : 11} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/> {/* Desenha o sinal de mais. */}
        </button>
    </div>
  </div>
);

export default InstrumentCard; // Explicação: Exporta o componente do cartão de instrumentos para uso nas listagens e naipes.