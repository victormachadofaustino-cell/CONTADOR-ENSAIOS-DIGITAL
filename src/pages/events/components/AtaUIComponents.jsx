import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, User, Briefcase } from 'lucide-react';

/**
 * AtaUIComponents v1.1
 * Biblioteca de componentes padronizados para o módulo de Ata.
 * Foco: Expansão vertical dinâmica e acessibilidade visual 7XL.
 */

// 1. CAMPO DE TEXTO DINÂMICO (Substituído input por textarea para evitar cortes)
export const Field = ({ label, val, onChange, disabled, icon, placeholder = "Preencher..." }) => {
  // Lógica de ajuste automático de altura para evitar scroll interno no campo
  const handleInput = (e) => {
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="flex flex-col flex-1 text-slate-950 w-full group">
      <label className="text-[8px] font-black uppercase italic mb-2 text-slate-400 tracking-widest flex items-center gap-1.5 transition-colors group-focus-within:text-blue-600">
        {icon || <User size={10}/>} {label}
      </label>
      <div className="relative flex w-full">
        <textarea 
          rows="1"
          disabled={disabled} 
          placeholder={placeholder}
          onInput={handleInput}
          className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent focus:bg-white focus:border-blue-500 transition-all uppercase shadow-inner italic disabled:opacity-40 resize-none overflow-hidden min-h-[52px]" 
          value={val || ''} 
          onChange={e => onChange(e.target.value.toUpperCase())} 
        />
      </div>
    </div>
  );
};

// 2. SELETOR PADRONIZADO (Aumento de escala para legibilidade)
export const Select = ({ label, val, options, onChange, disabled }) => (
  <div className="flex flex-col flex-1 text-slate-950 w-full">
    <label className="text-[8px] font-black uppercase italic mb-2 text-slate-400 tracking-widest flex items-center gap-1.5">
      <Briefcase size={10}/> {label}
    </label>
    <div className="relative">
      <select 
        disabled={disabled} 
        className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent focus:bg-white focus:border-blue-500 transition-all shadow-inner disabled:opacity-40 appearance-none pr-10" 
        value={val || ''} 
        onChange={e => onChange(e.target.value)}
      >
        <option value="">SELECIONAR</option>
        {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
    </div>
  </div>
);

// 3. ACORDEÃO (Container dos módulos)
export const Accordion = ({ title, icon, badge, children, isOpen, onClick }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-4 transition-all hover:border-slate-200">
    <button 
      onClick={onClick} 
      className="w-full p-7 flex justify-between items-center active:bg-slate-50 transition-all outline-none"
    >
      <div className="flex items-center gap-4 text-slate-950">
        <span className="text-2xl">{icon}</span>
        <div className="text-left leading-none">
          <h3 className="font-[900] italic uppercase text-sm tracking-tight">{title}</h3>
          {badge && (
            <span className="text-[8px] font-black text-blue-600 uppercase mt-2 inline-block tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
              {badge} Registros
            </span>
          )}
        </div>
      </div>
      <ChevronDown 
        size={18} 
        className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} 
      />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: 'auto', opacity: 1 }} 
          exit={{ height: 0, opacity: 0 }} 
          className="overflow-hidden"
        >
          <div className="p-6 pt-0 border-t border-slate-50/50">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// 4. MODAL GENÉRICO (Para Avisos e Exclusões)
export const Modal = ({ title, children, icon, confirmLabel, onConfirm, onCancel, danger }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-6 text-left">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }} 
      className="bg-white w-full max-w-[340px] rounded-[3rem] p-10 shadow-2xl relative border border-white/20"
    >
      <div className={`w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center shadow-inner ${
        danger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
      }`}>
        {icon}
      </div>
      <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-4 tracking-tighter leading-none text-center">
        {title}
      </h3>
      <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-10 text-center italic">
        {children}
      </p>
      <div className="space-y-3">
        <button 
          onClick={onConfirm} 
          className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg transition-all ${
            danger ? 'bg-red-600 text-white shadow-red-100' : 'bg-slate-950 text-white'
          }`}
        >
          {confirmLabel}
        </button>
        <button 
          onClick={onCancel} 
          className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest hover:text-slate-400"
        >
          Voltar
        </button>
      </div>
    </motion.div>
  </div>
);