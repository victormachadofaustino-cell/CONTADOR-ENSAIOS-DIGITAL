import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, doc, deleteDoc, updateDoc } from '../../config/firebase';
import { churchService } from '../../services/churchService';
import { Plus, Trash2, Edit3, Check, X, Home, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ModuleChurchesManager = ({ selectedCity, regionalId, onConfirmDelete }) => {
  const [comuns, setComuns] = useState([]);
  const [newChurchName, setNewChurchName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!selectedCity?.id) {
      setComuns([]);
      return;
    }
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', selectedCity.id));
    const unsub = onSnapshot(q, (s) => {
      setComuns(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.comum.localeCompare(b.comum)));
    });
    return () => unsub();
  }, [selectedCity]);

  const handleAdd = async () => {
    if (!newChurchName.trim()) return toast.error("Nome da comum é obrigatório");
    const sucesso = await churchService.createChurch({
      nome: newChurchName.toUpperCase().trim(),
      cidadeId: selectedCity.id,
      regionalId: regionalId,
      cidadeNome: selectedCity.nome
    });
    if (sucesso) setNewChurchName('');
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim()) return;
    try {
      await updateDoc(doc(db, 'comuns', id), { comum: editValue.toUpperCase().trim() });
      setEditingId(null);
      toast.success("Igreja atualizada");
    } catch (e) { toast.error("Erro ao atualizar"); }
  };

  const handleDelete = (id, nome) => {
    // INTEGRAÇÃO: Utiliza o alerta nativo configurado na SettingsPage
    if (onConfirmDelete) {
      onConfirmDelete(nome, async () => {
        try {
          await deleteDoc(doc(db, 'comuns', id));
          toast.success("Igreja removida", {
            style: { 
              backgroundColor: '#020617', 
              color: '#fff', 
              fontSize: '10px', 
              fontWeight: '900', 
              textTransform: 'uppercase' 
            }
          });
        } catch (e) { 
          toast.error("Erro ao excluir"); 
        }
      });
    } else {
      // Fallback para manter o funcionamento caso a prop não exista
      if (window.confirm(`Remover a comum ${nome}? Todos os ensaios vinculados serão perdidos.`)) {
        deleteDoc(doc(db, 'comuns', id))
          .then(() => toast.success("Igreja removida"))
          .catch(() => toast.error("Erro ao excluir"));
      }
    }
  };

  if (!selectedCity) return (
    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <p className="text-[9px] font-black text-slate-400 uppercase italic">Selecione uma cidade nos filtros acima</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          className="flex-1 bg-white p-4 rounded-2xl text-xs font-black text-slate-950 outline-none border border-slate-100 uppercase italic shadow-inner" 
          placeholder="NOVA COMUM EM CP..." 
          value={newChurchName} 
          onChange={e => setNewChurchName(e.target.value)} 
        />
        <button onClick={handleAdd} className="bg-slate-950 text-white px-5 rounded-2xl active:scale-90 shadow-lg">
          <Send size={18} />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[8px] font-black text-blue-600 uppercase px-1 italic">Igrejas em {selectedCity.nome}:</p>
        <div className="grid grid-cols-1 gap-2">
          {comuns.map(c => (
            <motion.div layout key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
              {editingId === c.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input autoFocus className="flex-1 bg-slate-50 p-2 rounded-lg text-[10px] font-black outline-none uppercase" value={editValue} onChange={e => setEditValue(e.target.value)} />
                  <button onClick={() => handleUpdate(c.id)} className="text-emerald-500"><Check size={18}/></button>
                  <button onClick={() => setEditingId(null)} className="text-red-400"><X size={18}/></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Home size={12}/></div>
                    <span className="text-[10px] font-black text-slate-700 uppercase">{c.comum}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(c.id); setEditValue(c.comum); }} className="p-2 text-slate-300 hover:text-blue-500"><Edit3 size={14}/></button>
                    <button onClick={() => handleDelete(c.id, c.comum)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModuleChurchesManager;