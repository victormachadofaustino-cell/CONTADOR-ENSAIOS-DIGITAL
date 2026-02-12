import React from 'react';
import { BookOpen, User, Hash, AlignLeft } from 'lucide-react';

/**
 * Componente de registro da Palavra Pregada
 * v1.0 - Exclusivo para Ensaios Regionais
 */
const AtaPalavra = ({ ataData, handleChange, isInputDisabled }) => {
  
  // Função auxiliar para atualizar subcampos do mapa 'palavra'
  const updatePalavra = (field, value) => {
    const novaPalavra = {
      ...(ataData.palavra || {}),
      [field]: value
    };
    handleChange({ ...ataData, palavra: novaPalavra });
  };

  return (
    <div className="space-y-5 animate-premium text-left">
      {/* CAMPO: ANCIÃO ATENDENTE */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
          <User size={10} /> Ancião Atendente
        </label>
        <input 
          type="text"
          disabled={isInputDisabled}
          placeholder="NOME DO ANCIÃO"
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black outline-none uppercase placeholder:text-slate-200 shadow-inner focus:border-blue-300 transition-all disabled:opacity-50"
          value={ataData.palavra?.anciao || ''}
          onChange={(e) => updatePalavra('anciao', e.target.value.toUpperCase())}
        />
      </div>

      {/* GRID: REFERÊNCIA BÍBLICA */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 space-y-1.5">
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <BookOpen size={10} /> Livro
          </label>
          <input 
            type="text"
            disabled={isInputDisabled}
            placeholder="EX: SALMOS"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black outline-none uppercase shadow-inner disabled:opacity-50"
            value={ataData.palavra?.livro || ''}
            onChange={(e) => updatePalavra('livro', e.target.value.toUpperCase())}
          />
        </div>

        <div className="col-span-3 space-y-1.5">
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <Hash size={10} /> Cap.
          </label>
          <input 
            type="number"
            disabled={isInputDisabled}
            placeholder="00"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 text-xs font-black text-center outline-none shadow-inner disabled:opacity-50"
            value={ataData.palavra?.capitulo || ''}
            onChange={(e) => updatePalavra('capitulo', e.target.value)}
          />
        </div>

        <div className="col-span-3 space-y-1.5">
          <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
            <AlignLeft size={10} /> Verso
          </label>
          <input 
            type="text"
            disabled={isInputDisabled}
            placeholder="0-0"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 text-xs font-black text-center outline-none shadow-inner disabled:opacity-50"
            value={ataData.palavra?.verso || ''}
            onChange={(e) => updatePalavra('verso', e.target.value)}
          />
        </div>
      </div>

      {/* CAMPO: RESUMO DO ASSUNTO */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic flex items-center gap-1.5">
          <AlignLeft size={10} /> Resumo da Pregação
        </label>
        <textarea 
          disabled={isInputDisabled}
          placeholder="BREVE RESUMO DO ASSUNTO ABORDADO NA PALAVRA..."
          className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-5 text-[11px] font-bold outline-none h-32 resize-none placeholder:text-slate-200 focus:bg-white focus:border-blue-200 transition-all shadow-inner leading-relaxed italic disabled:opacity-50"
          value={ataData.palavra?.assunto || ''}
          onChange={(e) => updatePalavra('assunto', e.target.value)}
        />
      </div>
    </div>
  );
};

export default AtaPalavra;