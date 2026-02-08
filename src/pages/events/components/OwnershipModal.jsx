import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle, UserCheck, Eye } from 'lucide-react';

/**
 * Componente de Modal para gestão de posse (ownership) de seção.
 * v1.0 - Isolado para limpeza do arquivo principal e melhoria de performance.
 */
const OwnershipModal = ({ 
  showOwnershipModal, 
  localCounts, 
  myUID, 
  userData, 
  onConfirm, 
  onCancel 
}) => {
  if (!showOwnershipModal) return null;

  const metaKey = `meta_${showOwnershipModal.toLowerCase().replace(/\s/g, '_')}`;
  const currentInUse = localCounts?.[metaKey]?.isActive;
  const currentOwner = localCounts?.[metaKey]?.responsibleName;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }} 
        className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl"
      >
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ${currentInUse ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
          {currentInUse ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
        </div>
        
        <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter text-xl">
          {currentInUse ? 'Seção em Uso' : 'Acessar Seção'}
        </h3>
        
        <p className="text-[11px] font-bold text-slate-500 uppercase mb-8 leading-relaxed px-4 italic">
          {currentInUse 
            ? `O irmão ${currentOwner} está realizando a contagem neste momento. Deseja apenas visualizar os dados em tempo real?`
            : currentOwner 
              ? `Esta seção pertence a ${currentOwner}, mas ele não está editando agora. Deseja assumir a responsabilidade ou apenas visualizar?`
              : "Esta seção está livre. Deseja assumir a responsabilidade da contagem?"
          }
        </p>

        <div className="flex flex-col gap-3">
          {!currentInUse && (
            <button 
              onClick={() => onConfirm(showOwnershipModal, true)} 
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-xl flex items-center justify-center gap-2 shadow-blue-100"
            >
              <UserCheck size={16}/> Assumir Seção
            </button>
          )}
          
          <button 
            onClick={() => onConfirm(showOwnershipModal, false)} 
            className="w-full bg-slate-100 text-slate-900 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 flex items-center justify-center gap-2"
          >
            <Eye size={16}/> Apenas Visualizar
          </button>
          
          <button 
            onClick={onCancel} 
            className="w-full py-4 text-slate-400 font-black uppercase text-[9px] tracking-widest active:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OwnershipModal;