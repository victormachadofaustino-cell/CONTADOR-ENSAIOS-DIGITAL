import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, addDoc, deleteDoc, updateDoc, doc } from '../../config/firebase';
import { Plus, Trash2, Edit3, Check, X, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ModuleCities = ({ regionalId, onConfirmDelete }) => {
  const [cidades, setCidades] = useState([]);
  const [newCityName, setNewCityName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!regionalId) return;
    const q = query(collection(db, 'config_cidades'), where('regionalId', '==', regionalId));
    const unsub = onSnapshot(q, (s) => {
      setCidades(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome)));
    });
    return () => unsub();
  }, [regionalId]);

  const handleAdd = async () => {
    if (!newCityName.trim()) return toast.error("Digite o nome da cidade");
    try {
      await addDoc(collection(db, 'config_cidades'), {
        nome: newCityName.toUpperCase().trim(),
        regionalId,
        createdAt: Date.now()
      });
      setNewCityName('');
      toast.success("Cidade adicionada");
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim()) return;
    try {
      await updateDoc(doc(db, 'config_cidades', id), { nome: editValue.toUpperCase().trim() });
      setEditingId(null);
      toast.success("Nome atualizado");
    } catch (e) { toast.error("Erro ao atualizar"); }
  };

  // MUDANÇA: Substituição do window.confirm pela função nativa recebida via props
  const handleDelete = (id, nome) => {
    if (onConfirmDelete) {
      onConfirmDelete(nome, async () => {
        try {
          await deleteDoc(doc(db, 'config_cidades', id));
          toast.success("Cidade removida", {
            style: { backgroundColor: '#020617', color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }
          });
        } catch (e) { 
          toast.error("Erro ao excluir"); 
        }
      });
    } else {
      // Fallback de segurança caso a prop não seja passada
      if (window.confirm(`Excluir a cidade ${nome}?`)) {
        deleteDoc(doc(db, 'config_cidades', id))
          .then(() => toast.success("Cidade removida"))
          .catch(() => toast.error("Erro ao excluir"));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          className="flex-1 bg-white p-4 rounded-2xl text-xs font-black text-slate-950 outline-none border border-slate-100 uppercase italic" 
          placeholder="NOVA CIDADE..." 
          value={newCityName} 
          onChange={e => setNewCityName(e.target.value)} 
        />
        <button onClick={handleAdd} className="bg-emerald-600 text-white px-5 rounded-2xl active:scale-90 transition-all shadow-lg">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {cidades.map(c => (
          <motion.div layout key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
            {editingId === c.id ? (
              <div className="flex items-center gap-2 w-full">
                <input autoFocus className="flex-1 bg-slate-50 p-2 rounded-lg text-[10px] font-black outline-none uppercase" value={editValue} onChange={e => setEditValue(e.target.value)} />
                <button onClick={() => handleUpdate(c.id)} className="text-emerald-500"><Check size={18}/></button>
                <button onClick={() => setEditingId(null)} className="text-red-400"><X size={18}/></button>
              </div>
            ) : (
              <>
                <span className="text-[10px] font-black text-slate-700 uppercase italic">{c.nome}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(c.id); setEditValue(c.nome); }} className="p-2 text-slate-300 hover:text-blue-500"><Edit3 size={14}/></button>
                  <button onClick={() => handleDelete(c.id, c.nome)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ModuleCities;