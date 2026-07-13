import React from 'react'; // Explicação: Importa as ferramentas essenciais do React para construir o componente visual do rodapé.

const Footer = ({ tabs, activeTab, onTabChange }) => { // Explicação: Inicia o componente do Rodapé recebendo a lista de abas permitidas, a aba ativa e a função que avisa a troca.
  return ( // Explicação: Inicia a renderização do bloco visual que desenha a barra de abas inferior.
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-slate-950 text-white rounded-t-[1.8rem] flex justify-around p-2 pb-5 z-50 shadow-2xl border-t border-white/5"> 
      {/* Explicação Acima: 'fixed bottom-0 left-0 right-0 w-full' tranca o rodapé sem frestas na base absoluta, colado nas laterais e embaixo. 'pb-5' protege o clique em celulares com navegação por gestos. */}
      
      {tabs.map(tab => ( // Explicação: Varre a lista de abas permitidas pelo crachá eletrônico do usuário e desenha os botões um por um.
        <button 
          key={tab} // Explicação: Identificador único que o React exige para controle de renderização dos botões na tela.
          onClick={() => onTabChange(tab)} // Explicação: Quando o usuário toca no botão, avisa o arquivo mestre para trocar a tela.
          // Explicação Abaixo: Cada botão tem 'min-h-[44px]' (área de toque segura). Se a aba for a atual, ganha fundo branco e texto preto destacado.
          className={`relative flex-1 py-3 rounded-xl transition-all duration-300 min-h-[44px] flex items-center justify-center ${activeTab === tab ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' : 'text-slate-500'}`}
        >
          <span className="text-[9px] font-black uppercase italic tracking-widest">
            {tab === 'ensaios' ? 'Ensaios' : tab === 'dash' ? 'Geral' : 'Ajustes'} {/* Explicação: Traduz o nome técnico interno para o texto que o usuário lê na tela. */}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default Footer; // Explicação: Exporta o rodapé fixado na base absoluta para ser acatado como importação padrão no arquivo mestre.