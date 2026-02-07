import React from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { Modal } from './AtaUIComponents';

/**
 * AtaLacreStatus v1.1
 * Módulo de governança para fechamento e reabertura de atas.
 * Ajuste: Sutilização visual com redução de padding e ícones mais discretos.
 */
const AtaLacreStatus = ({ 
  isClosed, 
  isGemLocal, 
  isComissao, 
  loading, 
  showConfirmLock, 
  setShowConfirmLock, 
  showConfirmReopen, 
  setShowConfirmReopen, 
  saveStatus 
}) => {
  return (
    <div className="pt-6 px-2 pb-6">
      {/* 1. ESTADO DE CARREGAMENTO (Previne cliques duplos durante a sincronização) */}
      {loading ? (
        <div className="w-full py-4 text-center font-black text-slate-300 uppercase text-[7px] animate-pulse italic tracking-widest">
          Sincronizando Status...
        </div>
      ) : (
        <div className="flex justify-center">
          {/* 2. BOTÃO DE LACRE (Disponível para GEM Local ou Superior) - Versão Compacta */}
          {!isClosed ? (
            isGemLocal && (
              <button 
                onClick={() => setShowConfirmLock(true)} 
                className="w-full max-w-[240px] bg-slate-950 text-white py-4 rounded-[2rem] font-black uppercase italic tracking-[0.15em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border border-white/10 text-[9px] hover:bg-slate-900"
              >
                <Lock size={16} strokeWidth={2.5} /> Lacrar Ensaio
              </button>
            )
          ) : (
            /* 3. BOTÃO DE REABERTURA (Restrito ao nível Comissão ou Master) - Versão Compacta */
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

export default AtaLacreStatus;