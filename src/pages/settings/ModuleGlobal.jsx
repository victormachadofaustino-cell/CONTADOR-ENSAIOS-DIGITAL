import React, { useState } from 'react';
import { db, collection, doc, addDoc, deleteDoc, updateDoc } from '../../config/firebase';
import toast from 'react-hot-toast';
import { Plus, Trash2, ShieldAlert, Award, Briefcase, Edit3, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Importação do Cérebro de Autenticação para validação de nível Master
import { useAuth } from '../../context/AuthContext';

const ModuleGlobal = ({ cargos, ministerios }) => {
  const { userData } = useAuth();
  
  // NOVA LÓGICA DE PODER v2.1: Módulo exclusivo para nível Master
  const isMaster = userData?.accessLevel === 'master';

  const [newCargoInput, setNewCargoInput] = useState('');
  const [newMinisterioInput, setNewMinisterioInput] = useState('');
  
  // Estado para gerenciar qual item está sendo editado
  const [editingItem, setEditingItem] = useState(null); // { id, nome, tipo }
  const [editValue, setEditValue] = useState('');

  // Função unificada para adicionar à coleção referencia_cargos
  const addItemToList = async (tipo, val, set) => {
    if (!isMaster) return toast.error("Ação restrita ao nível Master");
    if (!val.trim()) return toast.error("Digite um valor válido");
    try {
      await addDoc(collection(db, 'referencia_cargos'), { 
        nome: val.trim().toUpperCase(),
        tipo: tipo // 'cargo' ou 'ministerio'
      });
      set('');
      toast.success(`${tipo === 'cargo' ? 'Cargo' : 'Ministério'} adicionado à base`);
    } catch (e) {
      toast.error("Erro ao sincronizar com a base");
    }
  };

  // Função para salvar edição
  const handleUpdate = async () => {
    if (!isMaster) return toast.error("Ação restrita ao nível Master");
    if (!editValue.trim()) return toast.error("O nome não pode estar vazio");
    try {
      const docRef = doc(db, 'referencia_cargos', editingItem.id);
      await updateDoc(docRef, { nome: editValue.trim().toUpperCase() });
      toast.success("Atualizado com sucesso");
      setEditingItem(null);
      setEditValue('');
    } catch (e) {
      toast.error("Erro ao atualizar");
    }
  };

  // Função para excluir
  const handleDelete = async (id) => {
    if (!isMaster) return toast.error("Ação restrita ao nível Master");
    if (window.confirm('Remover da base oficial? Esta ação impactará filtros de todo o sistema.')) {
      try {
        await deleteDoc(doc(db, 'referencia_cargos', id));
        toast.success("Removido da base");
      } catch (e) {
        toast.error("Erro ao excluir");
      }
    }
  };

  // TRAVA DE SEGURANÇA: Se não for master, não renderiza a interface administrativa
  if (!isMaster) return (
    <div className="p-10 text-center space-y-4">
        <ShieldAlert size={40} className="text-red-500 mx-auto opacity-20" />
        <p className="text-[10px] font-black uppercase text-slate-400 italic">Acesso Restrito ao Administrador do Sistema</p>
    </div>
  );

  return (
    <div className="p-2 space-y-10 text-left animate-in fade-in duration-500">
      
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
            className="bg-slate-950 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest italic active:scale-95 shadow-lg transition-all flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-2">
          {cargos.map(c => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              key={c.id} 
              className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between"
            >
              {editingItem?.id === c.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input 
                    autoFocus
                    className="flex-1 bg-slate-50 p-2 rounded-lg text-[10px] font-black text-slate-950 outline-none uppercase italic"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button onClick={handleUpdate} className="text-emerald-500 p-1"><Check size={16} /></button>
                  <button onClick={() => setEditingItem(null)} className="text-red-400 p-1"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-black text-slate-700 uppercase italic leading-none">{c.nome}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => { setEditingItem(c); setEditValue(c.nome); }}
                      className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
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

        <div className="grid grid-cols-1 gap-2 pt-2">
          {ministerios.map(m => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              key={m.id} 
              className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between"
            >
              {editingItem?.id === m.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input 
                    autoFocus
                    className="flex-1 bg-slate-50 p-2 rounded-lg text-[10px] font-black text-slate-950 outline-none uppercase italic"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button onClick={handleUpdate} className="text-emerald-500 p-1"><Check size={16} /></button>
                  <button onClick={() => setEditingItem(null)} className="text-red-400 p-1"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-black text-slate-700 uppercase italic leading-none">{m.nome}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => { setEditingItem(m); setEditValue(m.nome); }}
                      className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(m.id)} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* NOTA DE SEGURANÇA */}
      <div className="bg-slate-950 p-5 rounded-[2.2rem] border border-white/5 flex gap-4 items-start shadow-2xl">
        <ShieldAlert size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-left">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic mb-1">Privilégio Administrativo</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed tracking-tighter">
            Cargos e Ministérios editados aqui são globais. Qualquer mudança afetará instantaneamente os formulários de Ata e cadastros de todas as localidades do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleGlobal;