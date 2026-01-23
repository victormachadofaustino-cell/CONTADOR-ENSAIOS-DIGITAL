import React from 'react';
import { ArrowRight } from 'lucide-react'; 
import { motion } from 'framer-motion';

const CapaEntrada = ({ aoEntrar }) => {
  return (
    <div 
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center py-20 px-8 text-center overflow-hidden cursor-pointer
      bg-gradient-to-b from-[#FFFFFF] via-[#E2E8F0] to-[#0F172A]"
      onClick={aoEntrar}
    >
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-slate-400/10 rounded-full blur-3xl"></div>

      {/* Títulos e Identificação Regional Atualizados - Centralizados sem o Logo */}
      <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-1000 mb-20">
        <div className="text-center space-y-3">
          <h2 className="text-slate-950 text-4xl font-[900] tracking-[0.25em] uppercase leading-tight">
            Contador de
          </h2>
          <h2 className="text-slate-800 text-5xl font-[900] tracking-[0.25em] italic uppercase leading-none opacity-90">
            Ensaios Musicais
          </h2>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className="h-[2px] w-12 bg-slate-950 mb-4 opacity-20"></div>
          <span className="text-slate-700 text-[14px] font-black uppercase tracking-[0.5em]">
            Sistema Regional
          </span>
        </div>
      </div>

      {/* Botão de Gatilho para Login */}
      <div className="w-full max-w-xs space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
        <div className="group relative bg-slate-950 px-10 py-6 rounded-full flex items-center justify-center gap-4 animate-pulse shadow-2xl shadow-slate-900 transition-all active:scale-95">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full pointer-events-none"></div>
          
          <span className="text-white text-[11px] font-black uppercase tracking-[0.4em] relative z-10">
            Toque para entrar
          </span>
          <ArrowRight size={20} className="text-white relative z-10" strokeWidth={3} />
        </div>

        <div className="space-y-1">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em]">
            Secretaria da Música Regional
          </p>
        </div>
      </div>
    </div>
  );
};

export default CapaEntrada;