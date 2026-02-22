import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, doc, collection, onSnapshot, addDoc, deleteDoc, updateDoc } from '../../config/firebase';
import toast from 'react-hot-toast';
import { 
  MapPin, Clock, ChevronDown, Plus, Trash2, Home, X, 
  Shield, Calendar, AlertTriangle, Save, Lock, Eye, Edit3 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const ModuleChurch = ({ localData, onUpdate }) => {
  const { userData } = useAuth();
  
  // --- MATRIZ DE PODER PRESERVADA E BLINDADA ---
  const temPoderEdicao = useMemo(() => {
    const level = userData?.accessLevel;
    const isMaster = level === 'master';
    const isComissao = isMaster || level === 'comissao';
    const isRegionalCidade = level === 'regional_cidade';
    const isGemLocal = level === 'gem_local';

    if (isMaster || isComissao) return true;
    if (isRegionalCidade) return userData?.cidadeId === localData?.cidadeId;
    
    return isGemLocal && userData?.comumId === localData?.id;
  }, [userData, localData]);

  const [formData, setFormData] = useState(localData || {});
  const [ministerio, setMinisterio] = useState([]);
  const [isMinListOpen, setIsMinListOpen] = useState(false);
  const [newMin, setNewMin] = useState({ nome: '', cargo: '' });
  
  // Estados para Edição e Exclusão Customizada
  const [editingMin, setEditingMin] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingMin, setDeletingMin] = useState(null);
  
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  const cargosOrdem = [
    'Ancião', 
    'Diácono', 
    'Cooperador do Ofício', 
    'Cooperador RJM', 
    'Encarregado Regional', 
    'Examinadora', 
    'Encarregado Local'
  ];

  // Listener para dados da Comum
  useEffect(() => {
    if (!localData?.id) return;
    setFormData(localData);
    const unsubDoc = onSnapshot(doc(db, 'comuns', localData.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(prev => ({
          ...prev,
          ...data,
          endereco: data.endereco || prev.endereco || {},
          diasSelecao: data.diasSelecao || prev.diasSelecao || []
        }));
      }
    });
    return () => unsubDoc();
  }, [localData?.id]);

  // Listener reativo para a subcoleção de Ministério
  useEffect(() => {
    if (!localData?.id) return;
    const unsubMin = onSnapshot(collection(db, 'comuns', localData.id, 'ministerio_lista'), (s) => {
      const lista = s.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => {
        const pesoA = cargosOrdem.indexOf(a.cargo);
        const pesoB = cargosOrdem.indexOf(b.cargo);
        return (pesoA === -1 ? 99 : pesoA) - (pesoB === -1 ? 99 : pesoB);
      });
      setMinisterio(lista);
    });
    return () => unsubMin();
  }, [localData?.id]);

  const handleFieldChange = (field, value, isAddress = false) => {
    if (!temPoderEdicao) return; 
    const upperValue = typeof value === 'string' ? value.toUpperCase() : value;
    if (isAddress) {
      setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: upperValue } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: upperValue }));
    }
  };

  const saveToDatabase = async () => {
    if (!localData?.id || !temPoderEdicao) return; 
    try {
      const docRef = doc(db, 'comuns', localData.id);
      const updatePayload = {
        endereco: formData.endereco || {},
        horaCulto: formData.horaCulto || '',
        horaCultoDomingo: formData.horaCultoDomingo || '',
        ensaioLocal: formData.ensaioLocal || '',
        horaEnsaio: formData.horaEnsaio || '',
        updatedAt: Date.now()
      };
      await updateDoc(docRef, updatePayload);
      if (onUpdate) onUpdate(formData);
      toast.success("Dados salvos");
    } catch (e) { 
      console.error(e);
      toast.error("Erro ao salvar."); 
    }
  };

  const toggleDia = async (idx) => {
    if (!temPoderEdicao) return;
    const current = formData.diasSelecao || [];
    const updated = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    try {
        await updateDoc(doc(db, 'comuns', localData.id), { diasSelecao: updated });
    } catch (e) { toast.error("Erro ao alterar agenda."); }
  };

  const handleEditClick = (membro) => {
    setEditingMin(membro);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMin.nome.trim() || !editingMin.cargo) return toast.error("Preencha todos os campos");
    try {
      const docRef = doc(db, 'comuns', localData.id, 'ministerio_lista', editingMin.id);
      await updateDoc(docRef, {
        nome: editingMin.nome.trim().toUpperCase(),
        cargo: editingMin.cargo,
        updatedAt: Date.now()
      });
      setIsEditModalOpen(false);
      setEditingMin(null);
      toast.success("Membro atualizado");
    } catch (err) {
      toast.error("Erro ao atualizar.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMin || !localData?.id) return;
    try {
      await deleteDoc(doc(db, 'comuns', localData.id, 'ministerio_lista', deletingMin.id));
      toast.success("Removido com sucesso");
      setDeletingMin(null);
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  if (!localData) return <div className="py-10 text-center opacity-30 text-[8px] font-black uppercase tracking-widest italic">Selecione uma Comum.</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 text-left pb-10">
      
      {/* INDICADOR DE STATUS */}
      <div className={`mx-1 p-4 rounded-2xl flex items-center gap-3 border ${temPoderEdicao ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
          {temPoderEdicao ? <Shield size={16} className="text-blue-600" /> : <Lock size={16} className="text-amber-600" />}
          <div className="leading-tight text-left">
            <p className={`text-[9px] font-black uppercase italic ${temPoderEdicao ? 'text-blue-600' : 'text-amber-600'}`}>
                {temPoderEdicao ? 'Modo de Zeladoria Ativo' : 'Acesso Somente Leitura'}
            </p>
            <p className="text-[7px] font-bold text-slate-400 uppercase">Sincronização em tempo real</p>
          </div>
      </div>

      {/* SEÇÃO 1: ENDEREÇO (Grid Otimizado) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MapPin size={14} className="text-blue-600" />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest leading-none">Localização</p>
        </div>
        <div className="space-y-2">
          {/* Linha 1: Rua e Número */}
          <div className="grid grid-cols-4 gap-2">
            <input disabled={!temPoderEdicao} placeholder="RUA / LOGRADOURO" className="col-span-3 bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none" value={formData.endereco?.rua || ''} onChange={e => handleFieldChange('rua', e.target.value, true)} onBlur={saveToDatabase} />
            <input disabled={!temPoderEdicao} placeholder="Nº" className="col-span-1 bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none text-center" value={formData.endereco?.numero || ''} onChange={e => handleFieldChange('numero', e.target.value, true)} onBlur={saveToDatabase} />
          </div>
          {/* Linha 2: Bairro e CEP */}
          <div className="grid grid-cols-2 gap-2">
            <input disabled={!temPoderEdicao} placeholder="BAIRRO" className="bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none" value={formData.endereco?.bairro || ''} onChange={e => handleFieldChange('bairro', e.target.value, true)} onBlur={saveToDatabase} />
            <input disabled={!temPoderEdicao} placeholder="CEP (00000-000)" className="bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none" value={formData.endereco?.cep || ''} onChange={e => handleFieldChange('cep', e.target.value, true)} onBlur={saveToDatabase} />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: AGENDA DE CULTOS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Clock size={14} className="text-emerald-600" />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest leading-none">Agenda de Cultos</p>
        </div>
        
        <div className="flex justify-between gap-1.5">
          {diasSemana.map((d, i) => (
            <button key={i} disabled={!temPoderEdicao} onClick={() => toggleDia(i)} className={`flex-1 h-10 rounded-xl font-[900] text-[10px] transition-all ${formData.diasSelecao?.includes(i) ? 'bg-emerald-600 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}>{d}</button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-inner flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Clock size={14} className="text-slate-300"/>
                <span className="text-[9px] font-black text-slate-400 uppercase italic">Culto Semanal</span>
            </div>
             <input disabled={!temPoderEdicao} type="time" className="bg-transparent font-black text-slate-950 text-xs outline-none text-right" value={formData.horaCulto || '19:30'} onChange={e => handleFieldChange('horaCulto', e.target.value)} onBlur={saveToDatabase} />
          </div>

          <AnimatePresence>
            {formData.diasSelecao?.includes(0) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-inner flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-emerald-400"/>
                    <span className="text-[9px] font-black text-emerald-600 uppercase italic tracking-tighter">Horário de Domingo</span>
                  </div>
                   <input disabled={!temPoderEdicao} type="time" className="bg-transparent font-black text-emerald-700 text-xs outline-none text-right" value={formData.horaCultoDomingo || '18:30'} onChange={e => handleFieldChange('horaCultoDomingo', e.target.value)} onBlur={saveToDatabase} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SEÇÃO 3: ENSAIO TÉCNICO */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Calendar size={14} className="text-blue-600" />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest leading-none">Ensaio Técnico</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input disabled={!temPoderEdicao} placeholder="DIA (EX: SÁBADO)" className="bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic" value={formData.ensaioLocal || ''} onChange={e => handleFieldChange('ensaioLocal', e.target.value)} onBlur={saveToDatabase} />
          <input disabled={!temPoderEdicao} type="time" className="bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100" value={formData.horaEnsaio || '19:00'} onChange={e => handleFieldChange('horaEnsaio', e.target.value)} onBlur={saveToDatabase} />
        </div>
      </div>

      {/* SEÇÃO 4: MINISTÉRIO LOCAL */}
      <div className="bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-xl border border-white/5">
        <button onClick={() => setIsMinListOpen(!isMinListOpen)} className="w-full p-6 flex justify-between items-center text-amber-500 transition-colors">
          <div className="flex items-center gap-3 text-left">
            <Shield size={16}/>
            <span className="text-[10px] font-black uppercase italic tracking-widest">Ministério Local</span>
          </div>
          <ChevronDown size={16} className={`transition-transform duration-500 ${isMinListOpen ? 'rotate-180' : ''}`}/>
        </button>

        <AnimatePresence>
          {isMinListOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-6 pb-8 space-y-3 overflow-hidden text-left">
              {temPoderEdicao && (
                <div className="space-y-2 pt-2">
                    <input placeholder="NOME DO IRMÃO..." className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-xs outline-none border border-white/5 uppercase italic" value={newMin.nome} onChange={e => setNewMin({...newMin, nome: e.target.value})} />
                    <select className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-[10px] outline-none border border-white/5 uppercase italic appearance-none" value={newMin.cargo} onChange={e => setNewMin({...newMin, cargo: e.target.value})}>
                        <option value="" className="text-slate-950">FUNÇÃO...</option>
                        {cargosOrdem.map(c => <option key={c} value={c} className="text-slate-950">{c}</option>)}
                    </select>
                    <button onClick={async () => {
                        if(!newMin.nome.trim() || !newMin.cargo) return toast.error("Preencha nome e cargo");
                        try {
                            await addDoc(collection(db, 'comuns', localData.id, 'ministerio_lista'), { 
                              nome: newMin.nome.trim().toUpperCase(), 
                              cargo: newMin.cargo,
                              updatedAt: Date.now() 
                            });
                            setNewMin({nome: '', cargo: ''});
                            toast.success("Adicionado");
                        } catch (err) { toast.error("Falha ao salvar."); }
                    }} className="w-full bg-blue-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase italic text-[10px] shadow-lg active:scale-95 transition-all">
                      <Plus size={16}/> Adicionar ao Ministério
                    </button>
                </div>
              )}
              
              <div className="space-y-2 pt-4 border-t border-white/10">
                {ministerio.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 transition-all">
                    <div className="leading-tight text-left flex-1 min-w-0 pr-4">
                      <p className="text-[7px] font-bold text-blue-400 uppercase tracking-widest truncate">{m.cargo || 'SEM CARGO'}</p>
                      <p className="text-[10px] font-[900] text-white uppercase italic mt-1 truncate">{m.nome || 'SEM NOME'}</p>
                    </div>
                    {temPoderEdicao && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEditClick(m)} className="p-2 text-white/10 hover:text-amber-400 transition-colors">
                            <Edit3 size={14}/>
                          </button>
                          <button onClick={() => setDeletingMin(m)} className="p-2 text-white/10 hover:text-red-400 transition-colors">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DE EDIÇÃO DE MINISTÉRIO */}
      <AnimatePresence>
        {isEditModalOpen && editingMin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase italic text-slate-950 tracking-widest">Editar Obreiro</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={16}/></button>
              </div>
              <div className="space-y-3">
                <input placeholder="NOME..." className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-100 uppercase italic outline-none" value={editingMin.nome} onChange={e => setEditingMin({...editingMin, nome: e.target.value})} />
                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-950 text-[10px] border border-slate-100 uppercase italic outline-none" value={editingMin.cargo} onChange={e => setEditingMin({...editingMin, cargo: e.target.value})}>
                  {cargosOrdem.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={handleSaveEdit} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase italic text-[10px] shadow-lg active:scale-95 transition-all">
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (App Style) */}
      <AnimatePresence>
        {deletingMin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingMin(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-10 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xs font-black text-slate-950 uppercase italic leading-tight mb-2">Remover do Ministério?</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed mb-8">
                Você está prestes a remover <span className="text-slate-950 italic">{deletingMin.nome}</span> da lista oficial. Esta ação é imediata.
              </p>
              <div className="space-y-3">
                <button onClick={handleConfirmDelete} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase italic text-[10px] shadow-lg active:scale-95 transition-all">
                  Confirmar Exclusão
                </button>
                <button onClick={() => setDeletingMin(null)} className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase italic text-[10px] active:scale-95 transition-all">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default ModuleChurch;