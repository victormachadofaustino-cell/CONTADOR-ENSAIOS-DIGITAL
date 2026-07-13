import React from 'react'; // Importa a biblioteca base do React
import { BookOpen, User, Hash, AlignLeft, CheckCircle2 } from 'lucide-react'; // Importa os ícones visuais para identificação dos campos

/**
 * Componente de registro da Palavra Pregada
 * v1.2 - Exclusivo para Ensaios Regionais
 * Ajuste v9.3: Alteração de rótulos e trava de 3 dígitos no capítulo.
 */
const AtaPalavra = ({ 
  ataData, // Dados atuais da ata vindos do banco
  handleChange, // Função que avisa o sistema que algo mudou para salvar
  isInputDisabled, // Variável que diz se o usuário pode ou não editar
  autoFill = false, // Estado do checkbox de preenchimento automático
  setAutoFill // Função para ligar/desligar a automação da Palavra
}) => {
  
  // Função auxiliar para atualizar subcampos do mapa 'palavra'
  const updatePalavra = (field, value) => { // Inicia a atualização de um campo específico da pregação
    const novaPalavra = { // Cria um novo objeto com os dados da palavra
      ...(ataData.palavra || {}), // Mantém o que já estava escrito
      [field]: value // Atualiza apenas o campo que mudou (livro, verso, etc)
    };
    handleChange({ ...ataData, palavra: novaPalavra }); // Envia para o sistema salvar no banco
  };

  return (
    <div className="space-y-5 animate-premium text-left"> {/* Cria espaçamento entre os campos e animação de entrada */}
      {/* CAMPO: ANCIÃO ATENDENTE */}
      <div className="space-y-1.5"> {/* Espaço entre o título e a caixa de texto */}
        <div className="flex items-center justify-between mb-1 pr-2"> {/* Linha do título com o checkbox discreto */}
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <User size={10} /> Ancião Atendente {/* Título do campo com ícone de usuário */}
          </label>
          {!isInputDisabled && ( // Só mostra o atalho se o usuário tiver permissão de edição
            <button 
              type="button" // Define como botão simples
              onClick={() => setAutoFill(!autoFill)} // Liga ou desliga a cópia do nome do atendimento
              className={`flex items-center gap-1 transition-all ${autoFill ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`} // Muda a cor se estiver ativo
            >
              <CheckCircle2 size={10} /> {/* Ícone pequeno de confirmação */}
              <span className="text-[7px] font-bold uppercase">Mesmo do Atendimento</span> {/* Legenda discreta da automação */}
            </button>
          )}
        </div>
        <input 
          type="text" // Campo para digitar texto
          disabled={isInputDisabled || autoFill} // Bloqueia se a ata estiver lacrada OU se a automação estiver ligada
          placeholder="NOME DO ANCIÃO" // Texto de fundo quando vazio
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black outline-none uppercase placeholder:text-slate-200 shadow-inner focus:border-blue-300 transition-all disabled:opacity-50" // Visual arredondado e profissional
          value={ataData.palavra?.anciao || ''} // Mostra o nome salvo no banco
          onChange={(e) => updatePalavra('anciao', e.target.value.toUpperCase())} // Salva o nome em letras maiúsculas
        />
      </div>

      {/* GRID: REFERÊNCIA BÍBLICA */}
      <div className="grid grid-cols-12 gap-3"> {/* Organiza os campos de Livro, Capítulo e Verso em linha */}
        <div className="col-span-6 space-y-1.5"> {/* Ocupa metade da largura para o nome do Livro */}
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <BookOpen size={10} /> Livro {/* Ícone de Bíblia aberta */}
          </label>
          <input 
            type="text" // Texto para o nome do livro
            disabled={isInputDisabled} // Bloqueia se necessário
            placeholder="EX: SALMOS" // Exemplo de preenchimento
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black outline-none uppercase shadow-inner disabled:opacity-50" // Estilo padrão
            value={ataData.palavra?.livro || ''} // Valor atual do livro
            onChange={(e) => updatePalavra('livro', e.target.value.toUpperCase())} // Salva o livro
          />
        </div>

        <div className="col-span-3 space-y-1.5"> {/* Ocupa 1/4 da largura para o Capítulo */}
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <Hash size={10} /> Cap. {/* Ícone de número */}
          </label>
          <input 
            type="number" // Apenas números para o capítulo
            disabled={isInputDisabled} // Bloqueia se necessário
            placeholder="00" // Exemplo
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 text-xs font-black text-center outline-none shadow-inner disabled:opacity-50" // Texto centralizado
            value={ataData.palavra?.capitulo || ''} // Valor atual do capítulo
            onChange={(e) => { // Inicia a mudança do capítulo com trava de segurança
              const val = e.target.value; // Pega o valor digitado
              if (val.length <= 3) updatePalavra('capitulo', val); // Só salva se tiver até 3 dígitos (Máximo 999)
            }} 
          />
        </div>

        <div className="col-span-3 space-y-1.5"> {/* Ocupa 1/4 da largura para o Verso */}
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <AlignLeft size={10} /> Verso {/* Ícone de alinhamento de texto */}
          </label>
          <input 
            type="text" // Texto para permitir formatos como "1-5"
            disabled={isInputDisabled} // Bloqueia se necessário
            placeholder="0-0" // Exemplo
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 text-xs font-black text-center outline-none shadow-inner disabled:opacity-50" // Texto centralizado
            value={ataData.palavra?.verso || ''} // Valor atual do verso
            onChange={(e) => updatePalavra('verso', e.target.value)} // Salva o verso
          />
        </div>
      </div>

      {/* CAMPO: TÍTULO DA LEITURA (Ajustado v9.3) */}
      <div className="space-y-1.5"> {/* Espaço para o campo de texto grande */}
        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
          <AlignLeft size={10} /> Título da Leitura {/* Rótulo atualizado para Título da Leitura */}
        </label>
        <textarea 
          disabled={isInputDisabled} // Bloqueia se a ata estiver fechada
          placeholder="TÍTULO DA PALAVRA" // Texto interno atualizado para Título da Palavra
          className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-5 text-[11px] font-bold outline-none h-32 resize-none placeholder:text-slate-200 focus:bg-white focus:border-blue-200 transition-all shadow-inner leading-relaxed italic disabled:opacity-50" // Caixa grande para texto longo
          value={ataData.palavra?.assunto || ''} // Mostra o conteúdo salvo no campo de assunto
          onChange={(e) => updatePalavra('assunto', e.target.value)} // Salva o texto enquanto o usuário digita
        />
      </div>
    </div>
  );
};

export default AtaPalavra; // Exporta o módulo para ser usado na AtaPage