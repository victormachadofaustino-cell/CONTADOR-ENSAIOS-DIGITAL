import React, { useState } from 'react';
import { db, collection, doc, addDoc, deleteDoc, writeBatch, updateDoc } from '../../firebase';
import toast from 'react-hot-toast';
import { Activity, Plus, Trash2, LayoutGrid, Users, ShieldCheck, Ban, X, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ModuleOrchestra = ({ comumId, instrumentsData, isMaster, userData }) => {
  const [showModal, setShowModal] = useState(null); // 'NAIPE' | 'INST' | 'EDIT'
  const [formData, setFormData] = useState({ name: '', section: '', evalType: 'Sem', id: '' });

  // CÉREBRO DE REGIONAL
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;
  const sectionsFound = [...new Set(instrumentsData.map(i => i.section))].sort();
  const podeGerenciar = isMaster || userData?.escopoRegional || userData?.escopoCidade;

  // LISTA PADRÃO CCB REVISADA (Conforme sua regra)
  const ORQUESTRA_PADRAO = [
    { name: 'Flauta', section: 'Madeiras', eval: 'Encarregado' },
    { name: 'Clarinete', section: 'Madeiras', eval: 'Encarregado' },
    { name: 'Sax Soprano', section: 'Madeiras', eval: 'Encarregado' },
    { name: 'Sax Alto', section: 'Madeiras', eval: 'Encarregado' },
    { name: 'Sax Tenor', section: 'Madeiras', eval: 'Encarregado' },
    { name: 'Trompete', section: 'Metais', eval: 'Encarregado' },
    { name: 'Trombone', section: 'Metais', eval: 'Encarregado' },
    { name: 'Tuba', section: 'Metais', eval: 'Encarregado' },
    { name: 'Violino', section: 'Cordas', eval: 'Encarregado' },
    { name: 'Viola', section: 'Cordas', eval: 'Encarregado' },
    { name: 'Violoncelo', section: 'Cordas', eval: 'Encarregado' },
    { name: 'Órgão', section: 'Teclas', eval: 'Examinadora' }, // Única Examinadora
    { name: 'Coral', section: 'Vozes', eval: 'Sem' }, // Vazio
    { name: 'Cantores', section: 'Vozes', eval: 'Sem' }, // Vazio
    { name: 'Irmandade', section: 'Geral', eval: 'Sem' }, // Vazio
  ];

  const handleInsertPattern = async () => {
    if (!activeRegionalId) return toast.error("Selecione uma Regional");
    if (instrumentsData.length > 0 && !confirm("Deseja aplicar o padrão sobre os instrumentos existentes?")) return;
    
    const batch = writeBatch(db);
    const ref = collection(db, 'config_orquestra_regional');
    
    try {
      ORQUESTRA_PADRAO.forEach(inst => {
        const newDoc = doc(ref);
        batch.set(newDoc, { 
          name: inst.name.toUpperCase(), 
          section: inst.section.toUpperCase(), 
          evalType: inst.eval, 
          regionalId: activeRegionalId, 
          createdAt: Date.now() 
        });
      });
      await batch.commit();
      toast.success("Padrão CCB Instalado!");
    } catch (e) { toast.error("Erro ao salvar padrão"); }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Insira um nome");
    
    const existe = instrumentsData.find(i => 
      i.name.toLowerCase() === formData.name.toLowerCase() && 
      i.id !== formData.id
    );
    if (existe) return toast.error("Este registro já existe!");

    const ref = collection(db, 'config_orquestra_regional');

    try {
      const dataToSave = {
        name: formData.name.toUpperCase().trim(),
        section: formData.section.toUpperCase() || 'GERAL',
        evalType: formData.evalType,
        regionalId: activeRegionalId,
        updatedAt: Date.now()
      };

      if (showModal === 'EDIT') {
        await updateDoc(doc(db, 'config_orquestra_regional', formData.id), dataToSave);
      } else {
        await addDoc(ref, { ...dataToSave, createdAt: Date.now() });
      }
      toast.success("Salvo!");
      setShowModal(null);
      setFormData({ name: '', section: '', evalType: 'Sem', id: '' });
    } catch (e) { toast.error("Erro ao processar"); }
  };

  const handleAction = async (action, inst) => {
    if (action === 'DELETE') {
      if (!confirm(`Remover ${inst.name}?`)) return;
      try {
        await deleteDoc(doc(db, 'config_orquestra_regional', inst.id));
        toast.success("Removido");
      } catch (e) { toast.error("Erro ao excluir"); }
    } else if (action === 'EDIT') {
      setFormData({ ...inst });
      setShowModal('EDIT');
    }
  };

  return (
    <div className="space-y-6 pb-20 text-left font-sans">
      {podeGerenciar && (
        <div className="space-y-3">
          <button onClick={handleInsertPattern} className="w-full bg-slate-950 text-white py-4 rounded-[1.8rem] font-[900] uppercase italic tracking-[0.1em] flex justify-center items-center gap-3 active:scale-95 shadow-xl border border-white/5"><LayoutGrid size={16} className="text-amber-500" /> Inserir Padrão CCB</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setFormData({name:'', section:'', evalType:'Sem'}); setShowModal('NAIPE'); }} className="bg-white border border-slate-200 p-4 rounded-2xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><Plus size={14} className="text-blue-600"/> + Naipe</button>
            <button onClick={() => { setFormData({name:'', section:'', evalType:'Sem'}); setShowModal('INST'); }} className="bg-blue-600 text-white p-4 rounded-2xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={14}/> + Instrumento</button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {sectionsFound.map(section => (
          <div key={section} className="space-y-2">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2 italic"><Activity size={10} className="text-blue-500" /> {section}</h4>
            <div className="grid grid-cols-1 gap-1.5">
              {instrumentsData.filter(i => i.section === section).map(inst => (
                <div key={inst.id} className="bg-white px-5 py-4 rounded-[1.5rem] border border-slate-100 flex items-center justify-between group shadow-sm transition-all hover:border-blue-100">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-black text-slate-950 uppercase italic">{inst.name}</span>
                    <span className={`text-[6px] font-bold uppercase mt-0.5 ${inst.evalType === 'Sem' ? 'text-slate-300' : 'text-blue-500'}`}>
                      {inst.evalType === 'Encarregado' && 'Habilita: Encarregado'}
                      {inst.evalType === 'Examinadora' && 'Habilita: Examinadora'}
                      {inst.evalType === 'Sem' && 'Contagem Simples'}
                    </span>
                  </div>
                  {podeGerenciar && (
                    <div className="flex gap-1">
                      <button onClick={() => handleAction('EDIT', inst)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 size={14}/></button>
                      <button onClick={() => handleAction('DELETE', inst)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter mb-6 leading-none">
                {showModal === 'NAIPE' ? 'Criar Novo Naipe' : showModal === 'INST' ? 'Novo Instrumento' : 'Editar Registro'}
              </h3>
              <div className="space-y-4 text-left">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1 ml-1">Nome / Identificação</p>
                  <input className="w-full bg-slate-50 p-4 rounded-xl font-black text-slate-950 text-xs outline-none uppercase shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: VIOLINO / CORDAS" />
                </div>
                {(showModal === 'INST' || showModal === 'EDIT') && (
                  <>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1 ml-1">Naipe Correspondente</p>
                      <select className="w-full bg-slate-50 p-4 rounded-xl font-black text-slate-950 text-xs outline-none uppercase appearance-none shadow-inner" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                        <option value="">Selecionar...</option>
                        {sectionsFound.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl space-y-4 border border-slate-100">
                      <p className="text-[7px] font-black text-blue-600 uppercase italic tracking-widest">Opções de Contagem:</p>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-0" 
                            checked={formData.evalType === 'Encarregado'} 
                            onChange={() => setFormData({...formData, evalType: formData.evalType === 'Encarregado' ? 'Sem' : 'Encarregado'})} 
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-700">Encarregado</span>
                            <span className="text-[6px] font-bold text-slate-400 uppercase">Habilitar campo Regional/Local</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-0" 
                            checked={formData.evalType === 'Examinadora'} 
                            onChange={() => setFormData({...formData, evalType: formData.evalType === 'Examinadora' ? 'Sem' : 'Examinadora'})} 
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-700">Examinadora</span>
                            <span className="text-[6px] font-bold text-slate-400 uppercase">Habilitar campo Examinadoras</span>
                          </div>
                        </label>
                      </div>
                      {formData.evalType === 'Sem' && (
                        <p className="text-[6px] font-bold text-amber-500 uppercase text-center mt-2 italic">Modo Contagem Simples Ativo</p>
                      )}
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