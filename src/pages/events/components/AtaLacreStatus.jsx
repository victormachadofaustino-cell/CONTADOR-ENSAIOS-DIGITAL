import React from 'react'; // Explicação: Importa a base do React para desenhar o componente.
import { Lock, RotateCcw } from 'lucide-react'; // Explicação: Importa os ícones de cadeado e reabertura.
import { Modal } from './AtaUIComponents'; // Explicação: Importa o componente de janelas de confirmação.

/**
 * AtaLacreStatus v1.2
 * Módulo de governança para fechamento e reabertura de atas.
 * v1.2 - Trava hierárquica: GEM não lacra ensaio Regional.
 */
const AtaLacreStatus = ({ 
  isClosed, // Explicação: Indica se a ata já está fechada.
  isGemLocal, // Explicação: Indica se o usuário é do nível GEM Local.
  isComissao, // Explicação: Indica se o usuário é do nível Comissão.
  isRegionalScope, // Explicação: NOVO: Indica se o ensaio atual é Regional ou Local.
  loading, // Explicação: Indica se o sistema está processando informações.
  showConfirmLock, // Explicação: Controla a exibição da janela de confirmação de lacre.
  setShowConfirmLock, // Explicação: Função para abrir/fechar a janela de lacre.
  showConfirmReopen, // Explicação: Controla a exibição da janela de confirmação de reabertura.
  setShowConfirmReopen, // Explicação: Função para abrir/fechar a janela de reabertura.
  saveStatus // Explicação: Função que efetivamente grava a mudança no banco de dados.
}) => { // Explicação: Inicia a estrutura visual do controle de status.
  
  // v1.2: Decide quem pode ver o botão de lacrar conforme o tipo do ensaio.
  // Explicação: Se for Regional, o GEM Local perde o botão. Se for Local, ele mantém. Comissão vê sempre.
  const podeLacrar = isComissao || (isGemLocal && !isRegionalScope);

  return ( // Explicação: Desenha a interface na tela.
    <div className="pt-6 px-2 pb-6">
      {/* 1. ESTADO DE CARREGAMENTO (Previne cliques duplos durante a sincronização) */}
      {loading ? (
        <div className="w-full py-4 text-center font-black text-slate-300 uppercase text-[7px] animate-pulse italic tracking-widest">
          Sincronizando Status...
        </div>
      ) : (
        <div className="flex justify-center">
          {/* 2. BOTÃO DE LACRE (Ajustado v1.2: Respeita o escopo do ensaio) */}
          {!isClosed ? (
            podeLacrar && ( // Explicação: Só mostra o botão se a regra 'podeLacrar' for verdadeira.
              <button 
                onClick={() => setShowConfirmLock(true)} 
                className="w-full max-w-[240px] bg-slate-950 text-white py-4 rounded-[2rem] font-black uppercase italic tracking-[0.15em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border border-white/10 text-[9px] hover:bg-slate-900"
              >
                <Lock size={16} strokeWidth={2.5} /> Lacrar Ensaio
              </button>
            )
          ) : (
            /* 3. BOTÃO DE REABERTURA (Restrito ao nível Comissão ou Master) */
            isComissao && (
              <button 
                onClick={() => setShowConfirmReopen(true)} 
                className="w-full max-w-[240px] bg-blue-50 text-blue-800 py-4 rounded-[2rem] font-black uppercase italic tracking-[0.1em] flex items-center justify-center gap-3 border-2 border-blue-100 active:scale-95 transition-all shadow-md text-[9px] hover:bg-blue-100"
              >
                <RotateCcw size={16} strokeWidth={2.5} /> Reabrir Ensaio
              </button>
            )
          )}
        </div>
      )}

      {/* 4. MODAIS DE CONFIRMAÇÃO DE GOVERNANÇA (Permanecem robustos para segurança) */}
      {showConfirmLock && (
        <Modal 
          title="Confirmar Lacre?" 
          icon={<Lock size={40}/>} 
          confirmLabel="Sim, Lacrar Agora" 
          onConfirm={() => { 
            saveStatus('closed'); 
            setShowConfirmLock(false); 
          }} 
          onCancel={() => setShowConfirmLock(false)}
        >
          Esta ação congela os dados para o Dashboard Regional e encerra todas as sessões de contagem ativa para este ensaio.
        </Modal>
      )}

      {showConfirmReopen && (
        <Modal 
          title="Reabrir Ensaio?" 
          icon={<RotateCcw size={40}/>} 
          confirmLabel="Sim, Reabrir" 
          onConfirm={() => { 
            saveStatus('open'); 
            setShowConfirmReopen(false); 
          }} 
          onCancel={() => setShowConfirmReopen(false)}
        >
          O lacre será removido e a edição voltará a ficar disponível para os encarregados locais e examinadoras autorizadas.
        </Modal>
      )}
    </div>
  );
};

export default AtaLacreStatus; // Explicação: Exporta o componente pronto para uso na página da Ata.