import React, { useState } from 'react';
import { db, collection, doc, addDoc, deleteDoc } from '../../config/firebase';
import toast from 'react-hot-toast';
import { Plus, Trash2, ShieldAlert, Award, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const ModuleGlobal = ({ cargos, ministerios }) => {
  const [newCargoInput, setNewCargoInput] = useState('');
  const [newMinisterioInput, setNewMinisterioInput] = useState('');

  // Função unificada para adicionar à coleção referencia_cargos
  const addItemToList = async (tipo, val, set) => {
    if (!val.trim()) return toast.error("Digite um valor válido");
    try {
      await addDoc(collection(db, 'referencia_cargos'), { 
        nome: val.trim(),
        tipo: tipo // 'cargo' ou 'ministerio'
      });
      set('');
      toast.success(`${tipo === 'cargo' ? 'Cargo' : 'Ministério'} adicionado à base`);
    } catch (e) {
      toast.error("Erro ao sincronizar com a base");
    }
  };

  return (
    <div className="p-2 space-y-8 text-left animate-in fade-in duration-500">
      
      {/* SEÇÃO: CARGOS DA ORQUESTRA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Award size={14} className="text-blue-600" />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest">
            Cargos Orquestra (Referência)
          </p>
        </div>
        
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-white p-4 rounded-2xl text-xs font-black text-slate-950 outline-none border border-slate-100 shadow-inner uppercase italic placeholder:text-slate-300" 
            placeholder="EX: EXAMINADORA..." 
            value={newCargoInput} 
            onChange={(e) => setNewCargoInput(e.target.value)} 
          />
          <button 
            onClick={() => addItemToList('cargo', newCargoInput, setNewCargoInput)} 
            className="bg-blue-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-lg shadow-blue-100 transition-all flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {cargos.map(c => (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              key={c.id} 
              className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"
            >
              <span className="text-[10px] font-black text-slate-700 uppercase italic leading-none">{c.nome}</span>
              <button 
                onClick={() => { if(window.confirm('Remover da base oficial?')) deleteDoc(doc(db, 'referencia_cargos', c.id)) }} 
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SEÇÃO: TIPOS DE MINISTÉRIO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Briefcase size={14} className="text-amber-500" />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest">
            Tipos de Ministério (Ata)
          </p>
        </div>

        <div className="flex gap-2">
          <input 
            className="flex-1 bg-white p-4 rounded-2xl text-xs font-black text-slate-950 outline-none border border-slate-100 shadow-inner uppercase italic placeholder:text-slate-300" 
            placeholder="EX: DIÁCONO..." 
            value={newMinisterioInput} 
            onChange={(e) => setNewMinisterioInput(e.target.value)} 
          />
          <button 
            onClick={() => addItemToList('ministerio', newMinisterioInput, setNewMinisterioInput)} 
            className="bg-slate-950 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-xl transition-all flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {ministerios.map(m => (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              key={m.id} 
              className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"
            >
              <span className="text-[10px] font-black text-slate-700 uppercase italic leading-none">{m.nome}</span>
              <button 
                onClick={() => { if(window.confirm('Remover da base oficial?')) deleteDoc(doc(db, 'referencia_cargos', m.id)) }} 
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 p-5 rounded-[1.8rem] border border-amber-100 flex gap-4 items-start">
        <ShieldAlert size={18} className="text-amber-500 shrink-0" />
        <div className="text-left">
          <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest italic mb-1">Privilégio Master</p>
          <p className="text-[8px] font-bold text-amber-600/80 uppercase leading-relaxed tracking-tighter">
            As alterações nestas listas impactam os filtros de cadastro e os campos de condutores em todas as Atas da Regional.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleGlobal;