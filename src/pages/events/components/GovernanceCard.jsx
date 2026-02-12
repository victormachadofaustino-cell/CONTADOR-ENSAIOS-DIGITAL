import React from 'react';
import { ShieldCheck, UserCheck, Minus, Plus, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * GovernanceCard v1.2 - ALTA VISIBILIDADE & CAMUFLAGEM
 * v1.2 - Escala 7XL e Tag de Responsável Nominal (Paridade com InstrumentCard)
 */
const GovernanceCard = ({ type, val, onChange, userData, isMyTurn, isOtherTurn, responsibleName, onToggle, disabled }) => {
  const isExaminadora = type.toUpperCase().includes('EXAMINADORA');
  
  // A edição só é permitida se o usuário assumiu o card e o ensaio não está lacrado
  const canEdit = isMyTurn && !disabled;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-[2.5rem] border transition-all relative overflow-hidden ${
        canEdit ? 'bg-white border-slate-200 shadow-xl scale-[1.01]' : 'bg-slate-50 border-slate-100 opacity-80'
      }`}
    >
      {/* BOTÃO DE POSSE INDIVIDUAL */}
      {!disabled && (
        <div className="absolute top-4 right-5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[8px] uppercase italic tracking-widest transition-all active:scale-90 shadow-sm ${
              isMyTurn ? 'bg-red-50 text-red-500 border border-red-100' : 
              isOtherTurn ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
              'bg-slate-950 text-white shadow-lg'
            }`}
          >
            {isMyTurn ? 'Liberar' : isOtherTurn ? <><Lock size={10}/> Em Uso</> : <><User size={10}/> Assumir</>}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 pr-20 leading-none text-left">
        <div className={`p-3 rounded-2xl transition-colors ${canEdit ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
          {isExaminadora ? <ShieldCheck size={20} strokeWidth={2.5} /> : <UserCheck size={20} strokeWidth={2.5} />}
        </div>
        <div className="text-left leading-none">
          <h5 className="font-[900] text-[12px] italic uppercase text-slate-950 tracking-tighter leading-none mb-1">{type}</h5>
          
          {/* TAG DE ZELADORIA NOMINAL (Padronizada) */}
          {isOtherTurn ? (
            <span className="text-[7px] font-black text-amber-600 uppercase italic animate-pulse">
              Contado por: {responsibleName || 'Colaborador'}
            </span>
          ) : isMyTurn ? (
            <span className="text-[7px] font-black text-blue-600 uppercase italic">
              Você assumiu esta contagem
            </span>
          ) : (
            <p className="text-[7px] font-bold text-slate-300 uppercase italic tracking-widest leading-none">Aguardando contagem</p>
          )}
        </div>
      </div>

      {/* CONTROLES DE QUANTIDADE - ESCALA PROFISSIONAL 7XL */}
      <div className={`h-32 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-[2rem] relative shadow-inner ${!canEdit ? 'grayscale pointer-events-none opacity-50' : ''}`}>
        <button 
          disabled={!canEdit}
          onClick={() => onChange(Math.max(0, val - 1))} 
          className="w-16 h-full flex items-center justify-center text-slate-300 active:text-red-500 transition-colors"
        >
          <Minus size={36} strokeWidth={4}/>
        </button>
        
        <div className="flex flex-col items-center justify-center">
          <span className="absolute top-3 text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Total Presente</span>
          <span className="font-[900] text-slate-950 italic text-7xl tracking-tighter leading-none select-none pt-4">
            {val}
          </span>
        </div>

        <button 
          disabled={!canEdit}
          onClick={() => onChange(val + 1)} 
          className="w-16 h-full flex items-center justify-center text-slate-950 active:text-blue-600 transition-colors"
        >
          <Plus size={36} strokeWidth={4}/>
        </button>
      </div>
    </motion.div>
  );
};

export default GovernanceCard;