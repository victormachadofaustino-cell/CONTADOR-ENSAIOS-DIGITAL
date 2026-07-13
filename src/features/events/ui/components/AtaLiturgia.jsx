import React from 'react'; // Importa a biblioteca base do React
import { Plus, Trash2, X, Music, CheckCircle2 } from 'lucide-react'; // Importa os ícones visuais para botões e avisos
import { Field, Select } from './AtaUIComponents.jsx'; // Importa os campos de texto e seletores padronizados

/**
 * AtaLiturgia v1.9
 * Módulo especializado no registro dos condutores e hinos.
 * Ajuste v9.1: Automação discreta integrada ao rótulo do campo.
 */
const AtaLiturgia = ({ 
  ataData, // Dados atuais da ata vindos do banco
  handleChange, // Função que avisa o sistema que algo mudou para salvar
  isInputDisabled, // Variável que diz se o usuário pode ou não editar
  referenciaMinisterio, // Lista de cargos oficiais (Ancião, Diácono, etc)
  handleHinoChange, // Função que valida os números dos hinos digitados
  hidePartes = false, // Opção para esconder as partes (1ª, 2ª) se necessário
  onlyPartes = false, // Opção para mostrar apenas as partes dos hinos
  isRegional = false, // Indica se o ensaio é regional ou local
  autoFill = false, // Estado do checkbox de preenchimento automático (Oração)
  setAutoFill // Função para ligar/desligar a automação da Oração
}) => {
  
  // Função interna de validação para o hino de abertura (Protocolo 480/C6)
  const validateAbertura = (val) => { // Inicia a conferência do hino digitado
    if (isInputDisabled) return; // Se estiver bloqueado, não faz nada
    let v = val.toUpperCase().trim(); // Transforma o texto em maiúsculo e tira espaços
    
    if (v === '') { // Se apagar o campo, limpa o dado no banco
      return handleChange({...ataData, hinoAbertura: ''}); // Atualiza o sistema com o hino vazio
    }

    // Validação de Coros (C1 até C6)
    if (v.startsWith('C')) { // Se começar com a letra C de Coro
      if (/^C[1-6]?$/.test(v)) { // Verifica se é de C1 até C6
        handleChange({...ataData, hinoAbertura: v}); // Salva o coro validado
      }
      return; // Encerra a função
    }

    // Validação Numérica (1 até 480)
    if (/^\d+$/.test(v)) { // Se forem apenas números
      if (parseInt(v) > 480) return; // Se passar do hino 480, ignora
      handleChange({...ataData, hinoAbertura: v}); // Salva o número do hino validado
    }
  };

  return (
    <div className="space-y-6"> {/* Cria um espaçamento vertical entre os blocos */}
      {/* BLOCO: ATENDIMENTO E ORAÇÕES (Ocultado se onlyPartes for true) */}
      {!onlyPartes && ( // Só mostra este bloco se não estiver no modo "apenas partes"
        <div className="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner text-left"> {/* Fundo cinza suave para os campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Organiza em duas colunas no computador */}
            <Field 
              label="Atendimento" // Rótulo do campo
              val={ataData.atendimentoNome} // Mostra o nome de quem atende
              disabled={isInputDisabled} // Bloqueia se a ata estiver lacrada ou nível baixo
              onChange={v => handleChange({...ataData, atendimentoNome: v})} // Salva o nome ao digitar
            />
            <Select 
              label="Ministério / Cargo" // Rótulo do seletor
              val={ataData.atendimentoMin} // Mostra o cargo de quem atende
              options={referenciaMinisterio} // Lista as opções de cargos
              disabled={isInputDisabled} // Bloqueia conforme a permissão
              onChange={v => handleChange({...ataData, atendimentoMin: v})} // Salva o cargo escolhido
            />
          </div>

          {/* AJUSTE v8.8: HINO DE ABERTURA DISPONÍVEL APENAS EM EVENTO REGIONAL */}
          {isRegional && ( // Só exibe este campo se for um ensaio regional
            <div className="pt-2 border-t border-slate-200/50"> {/* Linha divisória fina */}
              <div className="max-w-[120px]"> {/* Limita a largura para o número do hino */}
                  <Field 
                    label="Hino Abertura" // Nome do campo
                    val={ataData.hinoAbertura || ''} // Valor do hino
                    disabled={isInputDisabled} // Bloqueia se não puder editar
                    placeholder="000" // Exemplo de preenchimento
                    icon={<Music size={10} className="text-blue-600"/>} // Ícone de nota musical
                    onChange={v => validateAbertura(v)} // Valida o hino enquanto digita
                  />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50"> {/* Seção da Oração de Abertura */}
            <div className="flex flex-col w-full"> {/* Container para alinhar o Checkbox com o Label */}
              <div className="flex items-center justify-between mb-1 pr-2"> {/* Linha do título com o checkbox discreto */}
                <span className="text-[8px] font-black uppercase italic text-slate-400 tracking-widest">Oração Abertura</span> {/* Título original do campo */}
                {!isInputDisabled && ( // Só mostra o atalho se o usuário puder editar
                  <button 
                    onClick={() => setAutoFill(!autoFill)} // Liga/Desliga a cópia do atendimento
                    className={`flex items-center gap-1 transition-all ${autoFill ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`} // Muda a cor se estiver ativo
                  >
                    <CheckCircle2 size={10} /> {/* Ícone pequeno de confirmação */}
                    <span className="text-[7px] font-bold uppercase">Mesmo do Atendimento</span> {/* Legenda discreta */}
                  </button>
                )}
              </div>
              <Field 
                label="" // Rótulo vazio pois já usamos o personalizado acima
                val={ataData.oracaoAberturaNome} // Valor de quem faz a oração
                disabled={isInputDisabled || autoFill} // Bloqueia se estiver espelhado
                onChange={v => handleChange({...ataData, oracaoAberturaNome: v})} // Salva a mudança manual
              />
            </div>
            <Select 
              label="Ministério / Cargo" // Seletor de cargo da oração
              val={ataData.oracaoAberturaMin} // Valor do cargo
              options={referenciaMinisterio} // Lista de cargos
              disabled={isInputDisabled || autoFill} // Bloqueia se estiver espelhado pelo atendimento
              onChange={v => handleChange({...ataData, oracaoAberturaMin: v})} // Salva a escolha
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50"> {/* Seção da Última Oração */}
            <Field 
              label="Oração Encerramento" // Nome do campo
              val={ataData.ultimaOracaoNome} // Nome de quem encerra
              disabled={isInputDisabled} // Bloqueia conforme permissão
              onChange={v => handleChange({...ataData, ultimaOracaoNome: v})} // Salva ao digitar
            />
            <Select 
              label="Ministério / Cargo" // Cargo do encerramento
              val={ataData.ultimaOracaoMin} // Valor do cargo
              options={referenciaMinisterio} // Opções de cargos
              disabled={isInputDisabled} // Bloqueia se necessário
              onChange={v => handleChange({...ataData, ultimaOracaoMin: v})} // Salva a escolha
            />
          </div>
        </div>
      )}

      {/* BLOCO: PARTES DO ENSAIO (Ocultado se hidePartes for true) */}
      {!hidePartes && ( // Mostra as partes dos hinos se não estiver oculto
        <div className="space-y-4"> {/* Espaço entre cada parte */}
          {(ataData.partes || []).map((parte, pIdx) => ( // Percorre a lista de partes
            <div key={pIdx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative animate-premium text-left"> {/* Card branco para cada parte */}
              <div className="flex justify-between items-center mb-6"> {/* Cabeçalho da parte */}
                <h4 className="font-black italic uppercase text-[10px] tracking-widest text-blue-600 leading-none"> {/* Título: 1ª Parte, 2ª Parte... */}
                  {parte.label} {/* Mostra o nome da parte */}
                </h4>
                {!isInputDisabled && pIdx > 1 && ( // Só mostra botão de lixeira se for da 3ª parte em diante
                  <button 
                    onClick={() => { // Função para remover a parte
                      const np = [...ataData.partes]; // Copia a lista atual
                      np.splice(pIdx, 1); // Remove a parte selecionada
                      handleChange({...ataData, partes: np}); // Atualiza o banco
                    }} 
                    className="bg-red-50 text-red-500 p-2 rounded-xl active:scale-90 transition-transform" // Botão vermelho suave
                  >
                    <Trash2 size={14}/> {/* Ícone de lixeira */}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"> {/* Nome e Cargo do condutor da parte */}
                <Field 
                  label="Condutor" // Nome do campo
                  val={parte.nome} // Nome de quem rege
                  disabled={isInputDisabled} // Bloqueia se necessário
                  onChange={v => { // Salva o nome do condutor
                    const np = [...ataData.partes]; // Copia a lista
                    np[pIdx].nome = v; // Altera apenas nesta parte
                    handleChange({...ataData, partes: np}); // Salva tudo
                  }} 
                />
                <Select 
                  label="Ministério / Cargo" // Cargo do condutor
                  val={parte.min} // Valor do cargo
                  options={referenciaMinisterio} // Lista de cargos
                  disabled={isInputDisabled} // Bloqueia conforme permissão
                  onChange={v => { // Salva a mudança do cargo
                    const np = [...ataData.partes]; // Copia lista
                    np[pIdx].min = v; // Atualiza cargo da parte
                    handleChange({...ataData, partes: np}); // Salva no sistema
                  }} 
                />
              </div>

              {/* SELEÇÃO DE HINOS (CHIPS ADAPTÁVEIS) */}
              <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner"> {/* Container dos quadradinhos dos hinos */}
                {(parte.hinos || []).map((h, hIdx) => ( // Percorre a lista de hinos
                  <div key={hIdx} className="relative"> {/* Cada hino em seu espaço */}
                    <input 
                      type="text" // Campo de texto simples
                      disabled={isInputDisabled} // Bloqueia se necessário
                      className="w-14 h-14 bg-white rounded-2xl text-center font-black text-blue-800 text-sm outline-none border-2 border-slate-200 focus:border-blue-500 transition-all shadow-sm disabled:opacity-50" // Visual de quadradinho
                      value={h || ''} // Mostra o número do hino
                      placeholder="-" // Mostra tracinho se vazio
                      onChange={e => handleHinoChange(pIdx, hIdx, e.target.value)} // Valida e salva o hino
                    />
                    
                    {!isInputDisabled && hIdx >= 5 && ( // Botão X para apagar hinos extras (além dos 5 padrões)
                      <button 
                        onClick={() => { // Função para remover o hino
                          const np = [...ataData.partes]; // Copia lista
                          np[pIdx].hinos.splice(hIdx, 1); // Remove o hino específico
                          handleChange({...ataData, partes: np}); // Atualiza sistema
                        }} 
                        className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg active:scale-75 transition-all z-10" // Botãozinho vermelho flutuante
                      >
                        <X size={10} strokeWidth={4} /> {/* Ícone de fechar/remover */}
                      </button>
                    )}
                  </div>
                ))}
                
                {!isInputDisabled && ( // Botão de Mais para adicionar hinos
                  <button 
                    onClick={() => { // Função para incluir novo quadradinho de hino
                      const np = [...ataData.partes]; // Copia lista
                      np[pIdx].hinos = [...(np[pIdx].hinos || []), '']; // Adiciona um espaço vazio no fim
                      handleChange({...ataData, partes: np}); // Salva mudança
                    }} 
                    className="w-14 h-14 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 flex items-center justify-center active:scale-95 transition-all hover:bg-white hover:text-blue-500 hover:border-blue-200" // Quadrado tracejado
                  >
                    <Plus size={20}/> {/* Ícone de mais */}
                  </button>
                )}
              </div>
            </div>
          ))}

          {!isInputDisabled && ( // Botão para criar uma 3ª parte, 4ª parte...
            <button 
              onClick={() => { // Função de adicionar nova parte
                const np = [...(ataData.partes || [])]; // Pega partes atuais
                np.push({ // Cria o novo objeto da parte
                  label: `${np.length + 1}ª Parte`, // Define o nome automático (ex: 3ª Parte)
                  nome: '', // Inicia sem condutor
                  min: '', // Inicia sem cargo
                  hinos: ['', '', '', '', ''] // Inicia com 5 espaços de hinos
                });
                handleChange({ ...ataData, partes: np }); // Salva a nova parte
              }} 
              className="w-full py-5 bg-white border-2 border-dashed border-blue-100 rounded-[2.5rem] text-blue-600 font-black uppercase text-[9px] italic flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-blue-50/50 shadow-sm" // Botão grande e arredondado
            >
              <Plus size={16}/> Incluir Nova Parte {/* Texto do botão */}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AtaLiturgia; // Exporta o módulo para ser usado na AtaPage