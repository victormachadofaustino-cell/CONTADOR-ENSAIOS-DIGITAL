import React, { useState, useMemo } from 'react';
// CORREÇÃO: Caminho do Firebase e uso de setDoc para IDs amigáveis
import { db, collection, doc, setDoc, deleteDoc, writeBatch, getDocs } from '../../config/firebase';
import toast from 'react-hot-toast';
import { Activity, Plus, Trash2, LayoutGrid, Ban, X, Edit3, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Importação do Cérebro de Autenticação para validação de poder
import { useAuth } from '../../context/AuthContext';

const ModuleOrchestra = ({ comumId, instrumentsData }) => {
  // EXTRAÇÃO DE PODERES v2.1: O componente identifica o nível via accessLevel
  const { userData } = useAuth();
  const level = userData?.accessLevel;
  
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';

  const [showModal, setShowModal] = useState(null); // 'NAIPE' | 'INST' | 'EDIT'
  const [formData, setFormData] = useState({ name: '', section: '', evalType: 'Sem', id: '' });

  // 1. DEFINIÇÃO DA HIERARQUIA VISUAL
  const ordemSessoes = ['IRMANDADE', 'ORGANISTAS', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'GERAL'];

  // CORREÇÃO DE RESILIÊNCIA: Força toUpperCase no mapeamento
  const sectionsFound = useMemo(() => {
    return [...new Set(instrumentsData.map(i => i.section?.toUpperCase()))]
      .filter(Boolean)
      .sort((a, b) => (ordemSessoes.indexOf(a) > -1 ? ordemSessoes.indexOf(a) : 99) - (ordemSessoes.indexOf(b) > -1 ? ordemSessoes.indexOf(b) : 99));
  }, [instrumentsData]);

  // REGRA DE OURO v2.1: Somente perfil administrativo (Local ou Superior) pode gerenciar instrumentos
  // Além do nível, valida se o usuário está operando em sua própria jurisdição
  const podeGerenciar = useMemo(() => {
    if (isComissao) return true;
    return isGemLocal && userData?.comumId === comumId;
  }, [isComissao, isGemLocal, userData, comumId]);

  /**
   * LÓGICA BLUEPRINT: Reset de Fábrica
   * Esta função apaga a configuração local e importa a Matriz Saneada do Banco.
   */
  const handleInsertPattern = async () => {
    if (!comumId) return toast.error("Localidade não identificada");
    if (!podeGerenciar) return toast.error("Sem privilégios de gestão");
    if (!confirm("Deseja aplicar o RESET DE FÁBRICA? Isso apagará a lista atual e instalará o Padrão CCB saneado diretamente do banco.")) return;
    
    const loadingToast = toast.loading("Sincronizando com a Matriz Nacional...");
    const batch = writeBatch(db);
    const localRef = collection(db, 'comuns', comumId, 'instrumentos_config');
    
    try {
      const nationalSnap = await getDocs(collection(db, 'config_instrumentos_nacional'));
      
      if (nationalSnap.empty) {
        toast.dismiss(loadingToast);
        return toast.error("Matriz Nacional não encontrada.");
      }

      const localSnap = await getDocs(localRef);
      localSnap.docs.forEach(d => batch.delete(doc(db, 'comuns', comumId, 'instrumentos_config', d.id)));

      nationalSnap.docs.forEach(docInst => {
        const data = docInst.data();
        const docRef = doc(localRef, docInst.id);
        batch.set(docRef, { 
          ...data,
          id: docInst.id,
          updatedAt: Date.now() 
        });
      });

      await batch.commit();
      toast.success("Padrão CCB Saneado Instalado!", { id: loadingToast });
    } catch (e) { 
      console.error("Erro no Reset:", e);
      toast.error("Erro ao salvar padrão.", { id: loadingToast }); 
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Insira um nome");
    
    const idSaneado = formData.id || formData.name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, ''); 

    const ref = doc(db, 'comuns', comumId, 'instrumentos_config', idSaneado);

    try {
      const dataToSave = {
        id: idSaneado,
        name: formData.name.toUpperCase().trim(),
        section: formData.section.toUpperCase() || 'GERAL',
        evalType: formData.evalType || 'Sem',
        updatedAt: Date.now()
      };

      await setDoc(ref, dataToSave, { merge: true });
      toast.success("Salvo!");
      setShowModal(null);
      setFormData({ name: '', section: '', evalType: 'Sem', id: '' });
    } catch (e) { toast.error("Erro de permissão no servidor"); }
  };

  const handleAction = async (action, inst) => {
    if (action === 'DELETE') {
      if (!confirm(`Remover ${inst.name}?`)) return;
      try {
        await deleteDoc(doc(db, 'comuns', comumId, 'instrumentos_config', inst.id));
        toast.success("Removido");
      } catch (e) { toast.error("Erro ao excluir"); }
    } else if (action === 'EDIT') {
      setFormData({ ...inst });
      setShowModal('EDIT');
    }
  };

  return (
    <div className="space-y-6 pb-20 text-left font-sans">
      {/* 1. PAINEL DE COMANDO COMPACTO */}
      {podeGerenciar && (
        <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 shadow-inner space-y-4">
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleInsertPattern} 
              className="w-full bg-slate-950 text-white py-3.5 rounded-2xl font-black uppercase italic text-[10px] tracking-widest flex justify-center items-center gap-3 active:scale-95 transition-all shadow-lg border border-white/5"
            >
              <LayoutGrid size={14} className="text-amber-500" /> 
              Reset Padrão CCB
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { setFormData({name:'', section:'', evalType:'Sem', id:''}); setShowModal('INST'); }} 
                className="bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Plus size={14} className="text-blue-600"/> Instrumento
              </button>
              <button 
                onClick={() => { setFormData({name:'', section:'', evalType:'Sem', id:''}); setShowModal('NAIPE'); }} 
                className="bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Plus size={14} className="text-emerald-600"/> Naipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. LISTAGEM DENSIDADE ALTA */}
      <div className="space-y-6">
        {sectionsFound.length === 0 ? (
          <div className="py-10 text-center opacity-20">
            <Ban className="mx-auto mb-2" size={32} />
            <p className="text-[8px] font-black uppercase tracking-widest">Orquestra não configurada</p>
          </div>
        ) : (
          sectionsFound.map(section => (
            <div key={section} className="space-y-2">
              <div className="flex items-center gap-3 px-2">
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                  <Activity size={10} className="text-blue-500" /> {section}
                </h4>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>

              <div className="grid grid-cols-1 gap-1">
                {instrumentsData
                  .filter(i => i.section?.toUpperCase() === section)
                  .map(inst => (
                  <div key={inst.id} className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all hover:border-blue-100">
                    <div className="flex flex-col leading-tight">
                      <span className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-tighter">
                        {inst.name}
                      </span>
                      <span className={`text-[6px] font-bold uppercase ${inst.evalType === 'Sem' ? 'text-slate-300' : 'text-blue-500'}`}>
                        {inst.evalType !== 'Sem' ? inst.evalType : 'Contagem'}
                      </span>
                    </div>
                    
                    {podeGerenciar && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleAction('EDIT', inst)} 
                          className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 size={12}/>
                        </button>
                        <button 
                          onClick={() => handleAction('DELETE', inst)} 
                          className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. MODAIS DE EDIÇÃO */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic mb-1">Configuração</p>
                  <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                    {showModal === 'NAIPE' ? 'Novo Naipe' : showModal === 'INST' ? 'Instrumento' : 'Editar'}
                  </h3>
                </div>
                <button onClick={() => setShowModal(null)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={18}/></button>
              </div>

              <div className="space-y-4 text-left">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1 ml-1">Identificação</p>
                  <input className="w-full bg-slate-50 p-4 rounded-xl font-black text-slate-950 text-xs outline-none uppercase shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: VIOLINO" />
                </div>
                {(showModal === 'INST' || showModal === 'EDIT') && (
                  <>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1 ml-1">Naipe Correspondente</p>
                      <select className="w-full bg-slate-50 p-4 rounded-xl font-black text-slate-950 text-xs outline-none uppercase appearance-none shadow-inner" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                        <option value="">Selecionar...</option>
                        {ordemSessoes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <button onClick={handleSave} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Confirmar e Gravar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuleOrchestra;