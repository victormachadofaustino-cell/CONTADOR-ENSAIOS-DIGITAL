import React from 'react'; // Explicação: Ferramenta essencial do React para construir e renderizar este componente visual de navegação.
import { LayoutGrid, ClipboardCheck, BarChart3 } from 'lucide-react'; // Explicação: Importa os desenhos dos ícones das abas para exibição nos botões.

const CounterFooter = ({ activeTab, setActiveTab }) => { // Explicação: Inicia o componente do rodapé recebendo por propriedade a aba que está aberta e a função para alterar a aba.
  return ( // Explicação: Inicia o desenho estrutural do rodapé colado na base da tela.
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-slate-950/95 backdrop-blur-xl border-t border-white/10 p-2 pb-5 z-[50] flex justify-around rounded-t-[1.8rem] shadow-2xl">
      {/* Explicação Acima: 'fixed bottom-0 left-0 right-0 w-full' trava a barra 100% colada na base do aparelho e nas laterais. 'rounded-t-[1.8rem]' arredonda apenas o topo e deixa a base reta. 'pb-5' protege o clique contra a barra de gestos do celular. */}
      
      {/* BOTÃO 1: CONTAR */}
      <button 
        onClick={() => setActiveTab('contador')} // Explicação: Ao clicar, avisa a página principal para abrir o painel de contagem de instrumentos.
        // Explicação Abaixo: Se a aba ativa for 'contador', vira uma pílula branca com texto preto e ganha relevo (scale-105). Caso contrário, fica com texto cinza apagado.
        className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 min-h-[44px] flex-1 ${activeTab === 'contador' ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <LayoutGrid size={18} /> {/* Explicação: Desenha o ícone de grade de quatro quadrados. */}
        <span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">Contar</span> {/* Explicação: Texto da etiqueta em caixa alta e espaçado. */}
      </button>

      {/* BOTÃO 2: ATA */}
      <button 
        onClick={() => setActiveTab('ata')} // Explicação: Ao clicar, avisa a página principal para chavear a tela e mostrar o preenchimento da Ata.
        className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 min-h-[44px] flex-1 ${activeTab === 'ata' ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <ClipboardCheck size={18} /> {/* Explicação: Desenha o ícone de prancheta com check de validação. */}
        <span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">Ata</span> {/* Explicação: Texto da etiqueta em caixa alta e espaçado. */}
      </button>

      {/* BOTÃO 3: DASH (GRÁFICOS) */}
      <button 
        onClick={() => setActiveTab('dash')} // Explicação: Ao clicar, avisa a página principal para abrir o painel gráfico de estatísticas.
        className={`flex flex-col items-center justify-center py-3 px-6 rounded-[2rem] transition-all duration-300 min-h-[44px] flex-1 ${activeTab === 'dash' ? 'bg-white text-slate-950 shadow-xl scale-105 font-[900]' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <BarChart3 size={18} /> {/* Explicação: Desenha o ícone de gráfico de barras verticais. */}
        <span className="text-[8px] font-black uppercase italic mt-1 tracking-[0.2em] leading-none">Dash</span> {/* Explicação: Texto da etiqueta em caixa alta e espaçado. */}
      </button>

    </nav>
  );
};

export default CounterFooter; // Explicação: Exporta o componente do rodapé perfeitamente higienizado e isolado para ser importado na página mãe.