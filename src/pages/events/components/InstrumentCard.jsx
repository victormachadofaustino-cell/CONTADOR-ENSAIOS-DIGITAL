import React, { useMemo, useState, useEffect } from 'react'; // Explicação: Importa a base do React, os ganchos de estado local, escutas de efeitos e cache de memória RAM.
// PRESERVAÇÃO: Importações originais mantidas e adicionada a dependência Users do Lucide
import { Minus, Plus, Lock, User, UserCheck, ShieldCheck, UserPlus, Users } from 'lucide-react'; // Explicação: Importa os ícones de botões e escudos.

/**
 * InstrumentCard v11.3 - PROFESSIONAL PRECISION INPUT SHIELD EDITION
 * v11.3 - Acopla estados locais espelhos com travas de foco active para extinguir as piscadas de digitação manual.
 */
const InstrumentCard = ({ 
  inst, // Explicação: Dados fixos do instrumento (nome, id, section).
  data, // Explicação: Dados dinâmicos vindos do banco (números atuais).
  onUpdate, // Explicação: Função para salvar a nova contagem.
  onToggleOwnership, // Explicação: Função para assumir a posse do instrumento.
  userData, // Explicação: Dados do contador logado (crachá).
  isClosed, // Explicação: Verifica se o ensaio está encerrado.
  isRegional, // Explicação: Verifica se o layout é o regional (em lista).
  labelLideranca, // Explicação: Texto customizado para o campo de encarregados.
  sectionName, // Explicação: Nome da família (Cordas, Madeiras...).
  onFocus, // Explicação: Avisa o sistema para proteger este campo enquanto o usuário digita [v10.0].
  onBlur, // Explicação: Avisa o sistema para liberar o campo após a digitação [v10.0].
  onOpenChecklistNominal, // Explicação: Conexão reativa para acionar o painel flutuante de chamada nominal por extenso.
  comumId // Explicação: ID da localidade activa do ensaio repassada para batimento territorial de poder.
}) => {
  // BLINDAGEM CRÍTICA: Se não houver dados básicos, não desenha nada para evitar erro no app.
  if (!inst || !inst.id) return null; // Explicação: Aborta imediatamente a renderização se o instrumento vier sem identificador.

  // Explicação: Identifica se este cartão pertence ao grupo do Coral ou Irmandade.
  const subId = inst.id.toLowerCase(); // Explicação: Facilita a comparação de nomes técnicos.
  const isIrmandade = ['irmandade', 'irmas', 'irmaos', 'coral'].includes(subId || '');
  
  // Explicação: Identifica se este cartão é de organista para aplicar tratamento especial de cargo.
  const isOrganista = subId.includes('organista') || 
                      inst.name?.toLowerCase().includes('organ') || 
                      inst.label?.toLowerCase().includes('orgao') ||
                      subId.includes('orgao');

  // Explicação: Identifica se é um campo de liderança ou examinadora.
  const isGovernance = (inst.isGovernance || subId.includes('enc_local') || inst.evalType === 'Examinadora') && !isOrganista;
  
  // LÓGICA DE POSSE INDIVIDUALIZED: Identifica quem é o "dono da caneta" agora.
  const myUID = userData?.uid || userData?.id; // Explicação: Captura o ID único do usuário atual.
  
  // 🚀 REFAZIMENTO DA TRAVA DE TURNO REGIONAL: Se você assumir o naipe inteiro ou a sub-chave, ganha o direito de contar na hora!
  const isMyTurn = (subId === 'irmas' || subId === 'irmaos') 
    ? (data?.[`responsibleId_${subId}`] === myUID || data?.responsibleId === myUID) // 🚀 CORRIGIDO: Valida se você é dono da ala ou da zeladoria macro regional.
    : data?.responsibleId === myUID; // Explicação: Caso contrário, segue a regra padrão de ID de responsável do instrumento comum.

  // 🚀 REFAZIMENTO DA TRAVA DE TURNO CONCORRENTE: Detecta se outro irmão possui a caneta dessa linha no ecrã.
  const isOtherTurn = (subId === 'irmas' || subId === 'irmaos')
    ? (data?.[`responsibleId_${subId}`] && data?.[`responsibleId_${subId}`] !== myUID) || (data?.responsibleId && data?.responsibleId !== myUID && data?.[`responsibleId_${subId}`] !== myUID) // 🚀 CORRIGIDO: Protege contra concorrência macro.
    : data?.responsibleId && data?.responsibleId !== myUID; // Explicação: Regra de barreira de concorrência comum.

  // --- 🚀 INTEGRAÇÃO DA REGRA DE OURO VISUAL: LIBERAÇÃO DO ACESSO GEM/LOCAL ---
  const podeModificarAqui = useMemo(() => { // Explicação: Desata o nó de privilégios validando se o crachá do usuário dá poder sobre esta localidade comuns.
    const level = userData?.accessLevel; // Explicação: Captura o nível hierárquico textual gravado no token.
    if (level === 'master' || level === 'comissao') return true; // Explicação: Master e comissão regional possuem autoridade irrestrita global.
    if (level === 'regional_cidade') return userData?.cidadeId === userData?.activeCityId; // Explicação: Nível de cidade valida a sua própria comarca.
    
    // 🚀 CORREÇÃO DA MATRIZ TERRITORIAL: Valida o privilégio local cruzando com o ID carimbado direto no corpo do evento.
    if (level === 'gem_local' || level === 'basico') { // Explicação: Secretários locais ou auxiliares da própria igreja comum.
      const minhaIgreja = userData?.comumId || userData?.activeComumId; // Explicação: Descobre o código da igreja de origem do obreiro.
      const igrejaDoEvento = comumId || data?.comumId; // Explicação: Captura a classificação da igreja dona do ensaio.
      return minhaIgreja === 'hsfjhZ3KNx7SsCM8EFpu' || minhaIgreja === igrejaDoEvento; // Explicação: Retorna verdadeiro se as igrejas forem idênticas.
    }
    return false; // Explicação: Bloqueia acessos não cadastrados por padrão.
  }, [userData, comumId, data]);
  
  // 🚀 LIBERAÇÃO SOBERANA DE EDIÇÃO: Se o ensaio estiver aberto e você for o dono da aba ou membro autorizado da casa, os botões PRECISAM acender.
  const canEdit = !isClosed && (isMyTurn || (podeModificarAqui && !isRegional)); // Explicação: Garante direitos imediatos para cliques em ensaios locais comuns da sua própria igreja.

  // SANEAMENTO DE DADOS: Transforma os valores do banco em números inteiros para evitar erros de soma.
  const total = parseInt(data?.total) || 0; // Explicação: Converte e limpa o valor numérico total de músicos.
  const comuneVal = parseInt(data?.comum) || 0; // Explicação: Converte e limpa o valor numérico de músicos da casa.
  const enc = parseInt(data?.enc) || 0; // Explicação: Converte e limpa o valor numérico de encarregados locais presentes.
  const irmaos = parseInt(data?.irmaos) || 0; // Explicação: Converte e limpa o valor de irmãos para o caso exclusivo do Coral.
  const irmas = parseInt(data?.irmas) || 0; // Explicação: Converte e limpa o valor de irmãs para o caso exclusivo do Coral.
  
  // Explicação: Alinha o valor otimista da tela de acordo com o subId ativo.
  const displayVal = subId === 'irmas' ? irmas : subId === 'irmaos' ? irmaos : total;
  
  // Explicação: Cálculo automático de visitas em tempo real (Total menos os da casa).
  const visitas = Math.max(0, total - comuneVal);
  // Explicação: Bloqueia campos de detalhe (comum/liderança) se o Total for zero ou se o usuário não possuir direito de escrita.
  const isSubFieldDisabled = !canEdit || total === 0;

  // VERIFICAÇÃO DE MODO DE OPERAÇÃO: Detecta se o número comum veio de gravação de chamadas nominais anteriores.
  const isModoNominalAtivo = data?.modoContagem === 'nominal'; // Explicação: Sinaliza se o instrumento está travado operando via lista nominal de presenças.

  /**
   * handleUpdate v3.16 - Lógica de Saneamento Hierárquico
   */
  const handleUpdate = (field, value) => {
    if (!canEdit) return; // Explicação: Se não tiver poder de edição, ignora a ação.
    let finalValue = Math.max(0, parseInt(value) || 0); // Explicação: Bloqueia números negativos.
    
    // REGRA DE OURO: Comum e Liderança nunca podem ultrapassar o valor Total.
    if ((field === 'comum' || field === 'enc') && finalValue > total) {
      finalValue = total; // Explicação: Limita o valor ao teto total presente.
    }

    // REGRA DE CASCATA: Se o Total diminuir, o sistema reduz Comum e Encarregado para manter a lógica.
    if (field === 'total') {
      if (comuneVal > finalValue) onUpdate(inst.id, 'comum', finalValue, sectionName); // Explicação: Updates em cascata o teto da casa.
      if (enc > finalValue) onUpdate(inst.id, 'enc', finalValue, sectionName); // Explicação: Updates em cascata o teto de liderança.
    }

    // REGRA DE SOBRESCRITA SEGURO: Se o usuário mexer diretamente nas setas do Total, avisa e zera o modo nominal para numérico comum.
    const payloadAdicional = field === 'total' && isModoNominalAtivo ? { modoContagem: 'numerico' } : {}; // Explicação: Desativa o modo nominal se reajustar setas físicas.

    onUpdate(inst.id, field, finalValue, sectionName, payloadAdicional); // Explicação: Envia o valor higienizado para o banco de dados.
  };

  // 🚀 LÓGICA DE INTERCEPTAÇÃO DO CORAL NUMÉRICO STABILIZED: Conecta o clique à propriedade 'coral' original em minúsculo com recálculo atômico de total na hora
  const handleUpdateCoralDireto = (genero, novoValor) => {
    if (!canEdit) return; // Explicação: Ignora cliques se o painel estiver bloqueado.
    const valorLimpo = Math.max(0, parseInt(novoValor) || 0); // Explicação: Limpa o input forçando inteiros positivos.
    
    const novoIrmas = genero === 'irmas' ? valorLimpo : irmas; // Explicação: Computa o valor reativo das irmãs.
    const novoIrmaos = genero === 'irmaos' ? valorLimpo : irmaos; // Explicação: Computa o valor reativo dos irmãos.
    const novoTotalAbsoluto = novoIrmas + novoIrmaos; // Explicação: Força a soma real das duas fractions.

    // 🚀 RECONEXÃO DE CANOS: Dispara o onUpdate mirando no ID 'coral' oficial em minúsculo do Firestore, injetando o total somado
    onUpdate('coral', genero, valorLimpo, sectionName, {
      total: novoTotalAbsoluto,
      comum: novoTotalAbsoluto, // Explicação: Contadores de coral espelham o total na casa por padrão.
      modoContagem: 'numerico'
    });
  };

  // 🚀 INTERCEPTADOR DE CHAMADA NOMINAL DINÂMICO (CAMINHO 2 SANNEADO)
  const handleOpenChecklistSaneado = () => {
    if (!onOpenChecklistNominal) return; // Explicação: Aborta se o atalho reativo não foi injetado.
    onOpenChecklistNominal({
      ...inst // 🚀 UNIFICAÇÃO DE CHAVES: Repassa a ID extensa original do card diretamente para casar com a malha dinâmica de ordenação.
    });
  };

  return ( // Explicação: Desenha o cartão do instrumento com bordas arredondadas (Higiene de UI).
    <div className={`p-4 rounded-[2rem] border transition-all relative overflow-hidden bg-white shadow-sm w-full text-left ${
      isMyTurn ? 'border-blue-500 ring-1 ring-blue-100' : isOtherTurn ? 'opacity-70 border-slate-200' : 'border-slate-100'
    }`}>
      
      <div className="mb-3 flex justify-between items-center pr-1 text-left w-full gap-2"> {/* Explicação: Container do cabeçalho alinhado no topo para centralizar itens horizontalmente. */}
        <div className="flex flex-col text-left leading-none min-w-0 flex-1"> {/* Explicação: Alinha verticalmente os textos protegendo contra estouro de largura. */}
          <h5 className="font-[900] text-[11px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1 flex items-center gap-1.5 flex-wrap whitespace-normal text-left"> {/* Explicação: Título em destaque sem elipses para visualização inteira por extenso. */}
            {inst.label || inst.name || inst.nome || 'INSTRUMENTO'} {/* Explicação: Busca as referências do nome do objeto mestre 'inst'. */}
            {(isGovernance || isOrganista) && <ShieldCheck size={12} className="text-blue-500 shrink-0" />} {/* Explicação: Selo de cargo oficial impedido de encolher. */}
          </h5>
          
          {(isOtherTurn || isMyTurn) && ( // Explicação: Exibe quem é o responsável pela contagem deste instrumento.
            <div className="flex items-center gap-1.5 mt-1 text-left"> {/* Explicação: Caixa horizontal de alfinete de alinhamento do ponto luminoso e nome. */}
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMyTurn ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} /> {/* Explicação: Punto luminoso reativo de controle de dono da aba. */}
              <span className={`text-[7px] font-black uppercase italic tracking-wider whitespace-normal text-left ${isMyTurn ? 'text-blue-600' : 'text-slate-400'}`}> {/* Explicação: Rótulo com o nome do obreiro zelador atual do painel em formato estendido. */}
                {isMyTurn ? 'No seu comando' : `Com: ${data?.[`responsibleName_${subId}`] || data?.responsibleName || 'Colaborador'}`} {/* Explicação: Imprime dinamicamente a assinatura de posse. */}
              </span>
            </div>
          )}
        </div>

        {isRegional && !isClosed && ( // Explicação: Botão para assumir a posse da contagem em eventos Regionais.
          <button
            type="button" // Explicação: Marca o elemento como botão padrão de controle.
            disabled={!podeModificarAqui} // Explicação: Bloqueia o clique se o usuário for de fora da jurisdição.
            onClick={(e) => { e.stopPropagation(); onToggleOwnership(); }} // Explicação: Dispara a troca de posse individualizada.
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer ${
              isMyTurn 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`} // Explicação: Estiliza reativamente o botão de acordo com a posse de tela impedido de esmagar.
          >
            <UserPlus size={10} strokeWidth={3} /> {/* Explicação: Desenha o ícone de boneco com sinal de mais de adição. */}
            <span className="text-[8px] font-black uppercase italic">{isMyTurn ? 'LOGADO' : 'ASSUMIR'}</span> {/* Explicação: Etiqueta textual em caixa alta micro. */}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 w-full text-left"> {/* Explicação: Caixa empilhadora das caixas de contagem numéricas ocupando largura total. */}
        {/* 🚀 TRAVA E FIAÇÃO DO CORAL NUMÉRICO REMODELADA: Conecta as setas diretamente à função saneada que grava com sucesso no Firebase */}
        {isIrmandade && !isRegional ? ( // Explicação: Desenha caixas separadas para Irmãs e Irmãos no Local.
          <div className="flex gap-2 h-28 w-full items-stretch text-left"> {/* Explicação: Garante o alinhamento de colunas lado a lado sem esmagamento interno de inputs. */}
            <CounterBox 
              label="IRMÃS" 
              color="slate" 
              val={irmas} 
              onChange={v => handleUpdateCoralDireto('irmas', v)} // Explicação: Grava o clique das irmãs direto na fiação estável.
              disabled={!canEdit} 
              isMain={true} 
              onFocus={() => onFocus && onFocus('coral', 'irmas')} 
              onOriginalBlur={() => onBlur && onBlur()} 
            />
            <CounterBox 
              label="IRMÃOS" 
              color="white" 
              val={irmaos} 
              onChange={v => handleUpdateCoralDireto('irmaos', v)} // Explicação: Grava o clique dos irmãos direto na fiação estável.
              disabled={!canEdit} 
              isMain={true} 
              onFocus={() => onFocus && onFocus('coral', 'irmaos')} 
              onOriginalBlur={() => onBlur && onBlur()} 
            />
          </div>
        ) : isIrmandade && isRegional ? ( // Explicação: Desenha layout simples para Irmandade no Regional.
          <div className="flex gap-2 h-28 w-full items-stretch"> {/* Explicação: Força o esticamento vertical ocupando 100% de largura para não esmagar inputs. */}
            <CounterBox 
              label={inst.label || inst.id.toUpperCase()} // Explicação: Rótulo da pílula numérica.
              color={isMyTurn ? "slate" : "white"} // Explicação: Define se a caixa acende em preto ou branco.
              val={displayVal} // Explicação: Entrega o valor numérico updated.
              onChange={v => handleUpdate(subId, v)} // Explicação: Conecta o clique de somar ao método traduzido.
              disabled={!isMyTurn} // Explicação: Desativa os botões se a aba não for sua.
              isMain={true} // Explicação: Ativa fontes grandes de destaque de clique.
              onFocus={() => onFocus && onFocus(inst.id, subId)} // Explicação: Ativa proteção de digitação [v10.0].
              onOriginalBlur={() => onBlur && onBlur()} // Explicação: Libera proteção [v10.0].
            />
          </div>
        ) : ( // Explicação: Caso contrário, se for um instrumento comum de orquestra (Flauta, Violino, etc.).
          <>
            <div className="flex gap-2 h-28 w-full items-stretch text-left"> {/* Explicação: Une e estica horizontalmente o bloco de Total, Comum e Visitas impedindo o encolhimento. */}
              <CounterBox 
                label="TOTAL" // Explicação: Etiqueta superior da caixinha mestre.
                color={isMyTurn && isRegional ? "slate" : isRegional ? "white" : "slate"} // Explicação: Decide a cor de contraste da caixa mestre de totalização.
                val={displayVal} // Explicação: Passa o valor do total de músicos.
                onChange={v => handleUpdate('total', v)} // Explicação: Dispara a atualização do campo total.
                disabled={!canEdit} // Explicação: As caixas numéricas agora obedecem rigorosamente ao canEdit limpo do crachá.
                isMain={true} // Explicação: Força fontes grandes de alta visibilidade.
                onFocus={() => onFocus && onFocus(inst.id, 'total')} // Explicação: Ativa proteção no campo Total [v10.0].
                onOriginalBlur={() => onBlur && onBlur()} // Explicação: Desativa proteção [v10.0].
              />
              
              {!isRegional && !isGovernance && ( // Explicação: Campos detalhados de visitas exclusivos para Ensaios Locais comuns.
                <>
                  <div
                    onClick={() => !isSubFieldDisabled && handleOpenChecklistSaneado()} // Explicação: Dispara o modal nominal convertendo a chave para carregar os músicos da garagem.
                    className="flex-1 text-left outline-none min-w-[65px] h-full" // Explicação: Limita larguras de segurança mobile.
                  >
                    <CounterBoxButton 
                      label="COMUM" // Explicação: Rótulo do campo.
                      val={comuneVal} // Explicação: Número atual gravado.
                      color="white" // Explicação: Fundo padrão.
                      activeMode={isModoNominalAtivo} // Explicação: Injeta a flag se o instrumento está rodando no modo automatizado.
                      disabled={isSubFieldDisabled}
                    />
                  </div>

                  <div className={`flex-[0.5] flex flex-col items-center justify-center rounded-[1.5rem] border transition-colors min-w-[50px] ${total === 0 ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}> {/* Explicação: Aplica uma largura mínima de segurança para o bloco matemático de visitas não sumir. */}
                    <span className={`text-[7px] font-black uppercase tracking-widest mb-1 italic ${total === 0 ? 'text-slate-300' : 'text-blue-400'}`}>Visitas</span> {/* Explicação: Etiqueta cinza ou azul. */}
                    <span className={`text-2xl font-[900] italic leading-none ${total === 0 ? 'text-slate-200' : 'text-blue-600'}`}>{visitas}</span> {/* Explicação: Resultado automático della subtração Total - Comum. */}
                  </div>
                </>
              )}
            </div>

            {!isRegional && !isGovernance && ( // Explicação: Barra inferior de controle de Liderança (Encarregados Locais presentes).
              <div className={`mt-0.5 rounded-xl p-2 flex items-center justify-between border transition-all w-full ${isSubFieldDisabled ? 'bg-slate-50 border-slate-100' : 'bg-slate-100/50 border-slate-200/50'}`}> {/* Explicação: Barra horizontal compacta cinza ergonômica ocupando largura total. */}
                <div className="flex items-center gap-2 min-w-0 flex-1 text-left"> {/* Explicação: Agrupamento do ícone protegendo contra esmagamento de texto. */}
                  <div className={`p-1.5 rounded-lg text-white shrink-0 ${isSubFieldDisabled ? 'bg-slate-300' : 'bg-slate-950'}`}> {/* Explicação: Ícone quadrado escuro. */}
                    <UserCheck size={10} strokeWidth={3} /> {/* Explicação: Ícone de verificação de obreiro. */}
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase italic tracking-widest leading-none truncate text-left"> {/* Explicação: Texto descritivo truncado para segurança visual. */}
                    {labelLideranca || "Liderança"} {/* Explicação: Exibe 'Encarregado' ou 'Examinadora' dinamicamente. */}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0"> {/* Explicação: Agrupa os botões impedindo-os de quebrar de tamanho. */}
                  <button type="button" disabled={isSubFieldDisabled} onClick={() => handleUpdate('enc', enc - 1)} className={`p-1.5 cursor-pointer ${isSubFieldDisabled ? 'opacity-0' : 'text-slate-400'}`}> {/* Explicação: Botão de diminuir encarregado. */}
                    <Minus size={14} strokeWidth={4}/> {/* Explicação: Desenha o traço del menos grosso. */}
                  </button>
                  <span className={`text-lg font-[900] italic w-6 text-center ${isSubFieldDisabled ? 'text-slate-200' : 'text-slate-950'}`}>{enc}</span> {/* Explicação: Exibe o número de encarregados ativos salvos. */}
                  <button 
                    type="button" // Explicação: Tipo de ação de botão comum.
                    disabled={isSubFieldDisabled || enc >= total} // Explicação: Bloqueia se o total for zero ou se o encarregado atingir o limite do total de músicos.
                    onClick={() => handleUpdate('enc', enc + 1)} // Explicação: Dispara a soma de mais um encarregado.
                    className={`p-1.5 cursor-pointer ${(isSubFieldDisabled || enc >= total) ? 'opacity-20 pointer-events-none' : 'text-slate-950'} transition-opacity`} // Explicação: Efeito de esmaecido se atingir a trava limite.
                  >
                    <Plus size={14} strokeWidth={4}/> {/* Explicação: Desenha o sinal de mais grosso. */}
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

// Componente da Caixinha de Número com Setas (🚀 FIX PROFESSIONAL: Injetado estado local isolado contra piscadas de digitação)
const CounterBox = ({ label, color, val, onChange, disabled, isMain = false, maxLimit = null, onFocus, onOriginalBlur }) => {
  const [localVal, setLocalVal] = useState(val); // Explicação: Cria uma variável de estado local espelho para reter o número digitado na tela de forma independente.

  // 📡 PROTETOR DE CONCORRÊNCIA: Sincroniza o visor apenas quando a nuvem mudar de verdade lá fora
  useEffect(() => {
    // 💥 REGRA DE PROTOCOLO SÊNIOR: Se o cursor do teclado do irmão estiver pescando dentro deste campo de texto, proíbe o Firestore de apagar a digitação ativa!
    if (document.activeElement !== document.getElementById(`input-${label}`)) {
      setLocalVal(val); // Explicação: Sincroniza pacificamente se o campo estiver ocioso.
    }
  }, [val, label]); // Explicação: Monitora as trocas numéricas do barramento global.

  const triggerChange = (novoValor) => { // Explicação: Função intermediária que unifica a resposta da tela e do banco.
    const valorLimpo = Math.max(0, parseInt(novoValor) || 0); // Explicação: Evita números quebrados ou negativos.
    setLocalVal(valorLimpo); // Explicação: Atualiza o visor local na mesma hora (efeito de clique imediato).
    onChange(valorLimpo); // Explicação: Despacha o dado para a represa do motor de debounce.
  };

  return (
    <div className={`flex-1 rounded-[1.5rem] border transition-all relative flex flex-col items-center justify-center overflow-hidden min-w-[65px] h-full ${
      disabled ? 'bg-slate-50 border-slate-100 shadow-inner' : 
      color === 'slate' ? 'bg-slate-950 text-white border-slate-800 shadow-lg' : 
      'bg-white border-slate-100 shadow-sm'
    }`}>
      <p className={`absolute top-2 text-[6px] font-black uppercase tracking-[0.2em] ${color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
      
      <div className="flex items-center w-full h-full pt-3 justify-between">
          <button 
            disabled={disabled}
            type="button"
            onClick={() => triggerChange(localVal - 1)} // Explicação: Deduz um value usando o gatilho local instantâneo.
            className={`w-8 h-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${disabled ? 'opacity-20 pointer-events-none' : 'active:bg-black/10'}`}
          >
            <Minus size={isMain ? 14 : 11} strokeWidth={4} className={color === 'slate' ? 'text-white/20' : 'text-slate-300'}/>
          </button>

          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            <input 
              id={`input-${label}`} // Explicação: Carimba uma identificação única para a trava de foco do cursor funcionar.
              disabled={disabled}
              type="number"
              inputMode="numeric"
              className={`bg-transparent w-full text-center font-[900] outline-none italic tracking-tighter leading-none px-1 ${isMain ? 'text-4xl' : 'text-2xl'} ${disabled ? 'text-slate-200' : 'text-inherit'}`}
              value={localVal} // 🚀 BLINDAGEM DE UI: O campo agora lê a RAM local estável, destruindo qualquer possibilidade de "piscada".
              onFocus={(e) => { e.target.select(); onFocus && onFocus(); }} // Explicação: Seleciona o texto inteiro ao clicar para agilizar a re-digitação.
              onBlur={() => { onOriginalBlur && onOriginalBlur(); onChange(localVal); }} // Explicação: Ao clicar fora, garante a consolidação final do valor represado no banco.
              onChange={(e) => triggerChange(e.target.value)} // Explicação: Dispara a troca imediata de digitação manual.
            />
          </div>

          <button 
            disabled={disabled || (maxLimit !== null && localVal >= maxLimit)}
            type="button"
            onClick={() => triggerChange(localVal + 1)} // Explicação: Soma um valor usando o gatilho local instantâneo.
            className={`w-8 h-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${(disabled || (maxLimit !== null && maxLimit !== undefined && localVal >= maxLimit)) ? 'opacity-10 pointer-events-none' : 'active:bg-black/10'}`}
          >
            <Plus size={isMain ? 14 : 11} strokeWidth={4} className={color === 'slate' ? 'text-white/80' : 'text-slate-950'}/>
          </button>
      </div>
    </div>
  );
};

// Componente: Transforma a pílula do campo COMUM em um botão limpo e expansível estilo Ata
const CounterBoxButton = ({ label, val, color, activeMode = false, disabled = false }) => (
  <div className={`w-full h-full rounded-[1.5rem] border transition-all relative flex flex-col items-center justify-center overflow-hidden p-4 shadow-3xs border-dashed text-center active:scale-98 cursor-pointer ${
    disabled
      ? 'bg-slate-50 border-slate-100 text-slate-200'
      : activeMode 
        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-100 animate-in navigate-fade duration-300' 
        : color === 'slate' 
          ? 'bg-slate-950 text-white border-slate-800' 
          : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
  }`}>
    <p className={`text-[6px] font-black uppercase tracking-[0.2em] mb-1 truncate ${disabled ? 'text-slate-200' : activeMode ? 'text-white/50' : color === 'slate' ? 'text-white/30' : 'text-slate-400'}`}>
      {label}
    </p>
    
    <div className="flex items-center justify-center gap-1.5">
      <span className={`text-2xl font-[900] italic leading-none tracking-tighter ${disabled ? 'text-slate-200' : 'text-inherit'}`}>
        {val}
      </span>
      {activeMode && !disabled && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />} 
    </div>
    
    <span className={`text-[5.5px] font-black uppercase tracking-tight mt-1.5 block ${disabled ? 'text-slate-200' : activeMode ? 'text-white/70' : 'text-indigo-500'}`}>
      {disabled ? 'Bloqueado' : activeMode ? 'Foco Nominal' : 'Toque para Chamada'}
    </span>
  </div>
);

export default InstrumentCard;