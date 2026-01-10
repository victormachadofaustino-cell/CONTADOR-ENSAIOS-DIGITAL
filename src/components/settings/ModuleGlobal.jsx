import React, { useState } from 'react';
import { db, collection, doc, addDoc, deleteDoc } from '../../firebase';
import toast from 'react-hot-toast';

const ModuleGlobal = ({ cargos, ministerios }) => {
  const [newCargoInput, setNewCargoInput] = useState('');
  const [newMinisterioInput, setNewMinisterioInput] = useState('');

  // Função genérica para adicionar itens às listas globais
  const addItemToList = async (coll, field, val, set) => {
    if (!val.trim()) return toast.error("Digite um valor válido");
    try {
      await addDoc(collection(db, coll), { [field]: val.trim() });
      set('');
      toast.success("Adicionado à base regional");
    } catch (e) {
      toast.error("Erro ao adicionar");
    }
  };

  return (
    <div className="p-2 bg-gray-50/50 space-y-8 text-left animate-in">
      
      {/* SEÇÃO: CARGOS DA ORQUESTRA (Usado no Cadastro de Usuários) */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase italic border-b border-slate-200 pb-1 tracking-widest">
          Cargos Orquestra (Referência)
        </p>
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-white p-3 rounded-xl text-xs font-black text-slate-950 outline-none border border-slate-100 shadow-sm uppercase italic" 
            placeholder="EX: EXAMINADORA..." 
            value={newCargoInput} 
            onChange={(e) => setNewCargoInput(e.target.value)} 
          />
          <button 
            onClick={() => addItemToList('config_cargos', 'cargo', newCargoInput, setNewCargoInput)} 
            className="bg-slate-950 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-md transition-all"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cargos.map(c => (
            <div key={c.id} className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 animate-in">
              <span className="text-[10px] font-black text-slate-950 uppercase italic">{c.cargo}</span>
              <button onClick={() => deleteDoc(doc(db, 'config_cargos', c.id))} className="text-red-400 hover:text-red-600 font-black text-xs p-1">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO: TIPOS DE MINISTÉRIO (Usado na Presença do Ministério) */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase italic border-b border-slate-200 pb-1 tracking-widest">
          Tipos de Ministério (Referência)
        </p>
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-white p-3 rounded-xl text-xs font-black text-slate-950 outline-none border border-slate-100 shadow-sm uppercase italic" 
            placeholder="EX: DIÁCONO..." 
            value={newMinisterioInput} 
            onChange={(e) => setNewMinisterioInput(e.target.value)} 
          />
          <button 
            onClick={() => addItemToList('config_ministerio', 'ministerio', newMinisterioInput, setNewMinisterioInput)} 
            className="bg-slate-950 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-md transition-all"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ministerios.map(m => (
            <div key={m.id} className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 animate-in">
              <span className="text-[10px] font-black text-slate-950 uppercase italic">{m.ministerio}</span>
              <button onClick={() => deleteDoc(doc(db, 'config_ministerio', m.id))} className="text-red-400 hover:text-red-600 font-black text-xs p-1">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
        <p className="text-[8px] font-bold text-amber-700 uppercase leading-tight italic">
          ⚠️ Nota de Master: Alterações nestas listas impactam os filtros de todos os usuários da Regional.
        </p>
      </div>
    </div>
  );
};

export default ModuleGlobal;