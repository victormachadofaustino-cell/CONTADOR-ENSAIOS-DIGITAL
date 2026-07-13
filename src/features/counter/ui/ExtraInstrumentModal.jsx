import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Music, Info } from 'lucide-react'; // CORREÇÃO: ShieldInfo removido

/**
 * Modal para adição de instrumentos extras em um ensaio específico.
 * v1.2 - Preparação para Persistência em PDF e Dashboard.
 * Garante que o nome seja enviado e processado como um novo campo no Firebase.
 */
const ExtraInstrumentModal = ({ section, onConfirm, onCancel }) => {
  const [nome, setNome] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = nome.trim();
    if (!cleanName) return;

    // ESTRATÉGIA v1.2: Enviamos o nome limpo. 
    // O componente pai (CounterPage) deve gerar um ID único (ex: harpa_extra) 
    // e salvar na subcoleção ou campo 'extraInstruments' do evento para o PDF ler.
    onConfirm(cleanName);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl relative text-left overflow-hidden border border-white/20"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-left leading-none">
            <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic mb-1">
              Adicionar ao Evento
            </p>
            <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">
              Novo Instrumento
            </h3>
          </div>
          <button 
            onClick={onCancel} 
            className="p-2 bg-slate-50 rounded-xl text-slate-300 active:text-slate-950 transition-colors"
          >
            <X size={20}/>
          </button>
        </div>

        {/* Informação de Contexto - Ícone Info corrigido */}
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6 flex items-center gap-3">
          <Info size={16} className="text-blue-600 shrink-0" />
          <p className="text-[9px] font-bold text-blue-800 uppercase leading-tight italic">
            Este item será listado no grupo de <span className="font-black text-blue-600">{section}</span> apenas para este ensaio.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[7px] font-black text-slate-400 uppercase italic ml-1">
              Nome do Instrumento
            </label>
            <input 
              autoFocus
              className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner uppercase italic placeholder:text-slate-300 focus:bg-white focus:border-blue-200 transition-all" 
              placeholder="Ex: HARPA, FLAUTIM..." 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
            />
          </div>

          <button 
            type="submit" 
            disabled={!nome.trim()}
            className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus size={16}/> Confirmar Inclusão
          </button>
        </form>

        <p className="text-[7px] text-center text-slate-300 font-bold uppercase mt-6 tracking-tighter">
          O padrão da igreja não será alterado.
        </p>
      </motion.div>
    </div>
  );
};

export default ExtraInstrumentModal;