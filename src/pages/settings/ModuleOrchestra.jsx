import React, { useState } from 'react';
// CORREÇÃO: Caminho do Firebase e uso de setDoc para IDs amigáveis
import { db, collection, doc, setDoc, deleteDoc, writeBatch, updateDoc } from '../../config/firebase';
import toast from 'react-hot-toast';
import { Activity, Plus, Trash2, LayoutGrid, Users, ShieldCheck, Ban, X, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ModuleOrchestra = ({ comumId, instrumentsData, isMaster, userData }) => {
  const [showModal, setShowModal] = useState(null); // 'NAIPE' | 'INST' | 'EDIT'
  const [formData, setFormData] = useState({ name: '', section: '', evalType: 'Sem', id: '' });

  // CÉREBRO DE ORGANIZAÇÃO: Ordem Litúrgica Oficial
  const ordemSessoes = ['CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS', 'VOZES', 'GERAL'];
  const ordemInstrumentos = [
    'violino', 'viola', 'violoncelo', 
    'flauta', 'oboe', 'clarinete', 'fagote', 'claronealto', 'claronebaixo',
    'soprano', 'saxalto', 'saxtenor', 'saxbaritono',
    'trompete', 'flugel', 'trompa', 'trombone', 'eufonio', 'tuba',
    'acordeon', 'orgao', 'coral', 'cantores', 'irmandade'
  ];

  // Filtra e ordena as seções encontradas com base na hierarquia oficial
  const sectionsFound = [...new Set(instrumentsData.map(i => i.section?.toUpperCase()))]
    .sort((a, b) => {
      const idxA = ordemSessoes.indexOf(a);
      const idxB = ordemSessoes.indexOf(b);
      return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
    });

  const podeGerenciar = isMaster || userData?.escopoRegional || userData?.escopoCidade || userData?.escopoLocal;

  // LISTA PADRÃO CCB (Sincronizada com IDs do banco consolidado)
  const ORQUESTRA_PADRAO = [
    { id: 'violino', name: 'Violino', section: 'Cordas', eval: 'Encarregado' },
    { id: 'viola', name: 'Viola', section: 'Cordas', eval: 'Encarregado' },
    { id: 'violoncelo', name: 'Violoncelo', section: 'Cordas', eval: 'Encarregado' },
    { id: 'flauta', name: 'Flauta', section: 'Madeiras', eval: 'Encarregado' },
    { id: 'oboe', name: 'Oboé', section: 'Madeiras', eval: 'Encarregado' },
    { id: 'clarinete', name: 'Clarinete', section: 'Madeiras', eval: 'Encarregado' },
    { id: 'fagote', name: 'Fagote', section: 'Madeiras', eval: 'Encarregado' },
    { id: 'claronealto', name: 'Clarone Alto', section: 'Madeiras', eval: 'Encarregado' },
    { id: 'claronebaixo', name: 'Clarone Baixo', section: 'Madeiras', eval: 'Encarregado' },
    { id: 'soprano', name: 'Sax Soprano', section: 'Saxofones', eval: 'Encarregado' },
    { id: 'saxalto', name: 'Sax Alto', section: 'Saxofones', eval: 'Encarregado' },
    { id: 'saxtenor', name: 'Sax Tenor', section: 'Saxofones', eval: 'Encarregado' },
    { id: 'saxbaritono', name: 'Sax Barítono', section: 'Saxofones', eval: 'Encarregado' },
    { id: 'trompete', name: 'Trompete', section: 'Metais', eval: 'Encarregado' },
    { id: 'flugel', name: 'Flugelhorn', section: 'Metais', eval: 'Encarregado' },
    { id: 'trompa', name: 'Trompa', section: 'Metais', eval: 'Encarregado' },
    { id: 'trombone', name: 'Trombone', section: 'Metais', eval: 'Encarregado' },
    { id: 'eufonio', name: 'Eufônio', section: 'Metais', eval: 'Encarregado' },
    { id: 'tuba', name: 'Tuba', section: 'Metais', eval: 'Encarregado' },
    { id: 'acordeon', name: 'Acordeon', section: 'Teclas', eval: 'Sem' },
    { id: 'orgao', name: 'Órgão', section: 'Teclas', eval: 'Examinadora' },
  ];

  const handleInsertPattern = async () => {
    if (!comumId) return toast.error("Localidade não identificada");
    if (instrumentsData.length > 0 && !confirm("Deseja aplicar o padrão sobre os instrumentos existentes?")) return;
    
    const batch = writeBatch(db);
    const ref = collection(db, 'comuns', comumId, 'instrumentos_config');
    
    try {
      ORQUESTRA_PADRAO.forEach(inst => {
        const docRef = doc(ref, inst.id); 
        batch.set(docRef, { 
          id: inst.id,
          name: inst.name.toUpperCase(), 
          section: inst.section.toUpperCase(), 
          evalType: inst.eval, 
          updatedAt: Date.now() 
        });
      });
      await batch.commit();
      toast.success("Padrão CCB Instalado!");
    } catch (e) { toast.error("Erro ao salvar padrão"); }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Insira um nome");
    
    // CORREÇÃO: Lógica profissional de ID para evitar duplicidades e IDs aleatórios
    const idSaneado = formData.id || formData.name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos (ex: Órgão -> orgao)
      .replace(/\s+/g, '_'); // Substitui espaços por underscore (ex: Sax Alto -> sax_alto)

    const ref = doc(db, 'comuns', comumId, 'instrumentos_config', idSaneado);

    try {
      const dataToSave = {
        id: idSaneado,
        name: formData.name.toUpperCase().trim(),
        section: formData.section.toUpperCase() || 'GERAL',
        evalType: formData.evalType,
        updatedAt: Date.now()
      };

      await setDoc(ref, dataToSave, { merge: true });
      toast.success("Salvo!");
      setShowModal(null);
      setFormData({ name: '', section: '', evalType: 'Sem', id: '' });
    } catch (e) { toast.error("Erro ao processar"); }
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
      {podeGerenciar && (
        <div className="space-y-3">
          <button onClick={handleInsertPattern} className="w-full bg-slate-950 text-white py-4 rounded-[1.8rem] font-[900] uppercase italic tracking-[0.1em] flex justify-center items-center gap-3 active:scale-95 shadow-xl border border-white/5"><LayoutGrid size={16} className="text-amber-500" /> Reorganizar Padrão CCB</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setFormData({name:'', section:'', evalType:'Sem', id:''}); setShowModal('INST'); }} className="bg-blue-600 text-white p-4 rounded-2xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={14}/> + Instrumento</button>
            <button onClick={() => { setFormData({name:'', section:'', evalType:'Sem', id:''}); setShowModal('NAIPE'); }} className="bg-white border border-slate-200 p-4 rounded-2xl font-black text-[9px] uppercase italic flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><Plus size={14} className="text-blue-600"/> + Naipe</button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {sectionsFound.length === 0 ? (
          <div className="py-10 text-center opacity-20">
            <Ban className="mx-auto mb-2" size={32} />
            <p className="text-[8px] font-black uppercase tracking-widest">Orquestra não configurada</p>
          </div>
        ) : (
          sectionsFound.map(section => (
            <div key={section} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-[1px] flex-1 bg-slate-100"></div>
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                  <Activity size={12} className="text-blue-500" /> {section}
                </h4>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {instrumentsData
                  .filter(i => i.section?.toUpperCase() === section)
                  .sort((a, b) => {
                    const idxA = ordemInstrumentos.indexOf(a.id);
                    const idxB = ordemInstrumentos.indexOf(b.id);
                    return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
                  })
                  .map(inst => (
                  <div key={inst.id} className="bg-white px-5 py-4 rounded-[1.5rem] border border-slate-100 flex items-center justify-between group shadow-sm transition-all hover:border-blue-100">
                    <div className="flex flex-col leading-tight">
                      <span className="text-[11px] font-black text-slate-950 uppercase italic tracking-tighter">{inst.name}</span>
                      <span className={`text-[6px] font-bold uppercase mt-1 ${inst.evalType === 'Sem' ? 'text-slate-300' : 'text-blue-600'}`}>
                        {inst.evalType === 'Encarregado' && 'Habilita: Encarregado'}
                        {inst.evalType === 'Examinadora' && 'Habilita: Examinadora'}
                        {inst.evalType === 'Sem' && 'Contagem Simples'}
                      </span>
                    </div>
                    {podeGerenciar && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleAction('EDIT', inst)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 size={14}/></button>
                        <button onClick={() => handleAction('DELETE', inst)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
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
                        {ordemSessoes.map(s => <option key={s} value={s}>{s}</option>)}
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