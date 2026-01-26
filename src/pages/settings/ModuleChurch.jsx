import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from '../../config/firebase';
import toast from 'react-hot-toast';
import { MapPin, Clock, ChevronDown, Plus, Trash2, Home, X, Shield, Calendar, AlertTriangle, Save, Lock, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const ModuleChurch = ({ localData, onUpdate }) => {
  const { userData } = useAuth();
  
  // --- NOVA LÓGICA DE AUTORIDADE v2.1 (MATRIZ DE PODER) ---
  const temPoderEdicao = useMemo(() => {
    const level = userData?.accessLevel;
    const isMaster = level === 'master';
    const isComissao = isMaster || level === 'comissao';
    const isRegionalCidade = isComissao || level === 'regional_cidade';
    const isGemLocal = isRegionalCidade || level === 'gem_local';

    // O usuário precisa ter nível administrativo E estar na jurisdição correta
    // Master e Comissão editam qualquer uma. Regional/Local editam se for a sua comumId.
    if (isComissao) return true;
    return isGemLocal && userData?.comumId === localData?.id;
  }, [userData, localData]);

  const isMaster = userData?.accessLevel === 'master';

  // ESTADO LOCAL: Armazena os dados temporariamente enquanto o usuário digita
  const [formData, setFormData] = useState(localData || {});
  const [ministerio, setMinisterio] = useState([]);
  const [isMinListOpen, setIsMinListOpen] = useState(false);
  const [newMin, setNewMin] = useState({ nome: '', cargo: '' });
  
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const cargosOrdem = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM', 'Encarregado Regional', 'Examinadora', 'Encarregado Local'];

  // 1. MONITORAMENTO EM TEMPO REAL DOS DADOS CADASTRAIS
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

  // 2. MONITORAMENTO DA LISTA DO MINISTÉRIO
  useEffect(() => {
    if (!localData?.id) return;
    const unsubMin = onSnapshot(collection(db, 'comuns', localData.id, 'ministerio_lista'), (s) => {
      const lista = s.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (cargosOrdem.indexOf(a.cargo) || 99) - (cargosOrdem.indexOf(b.cargo) || 99));
      setMinisterio(lista);
    }, (err) => {
      console.error("Erro snapshot ministerio:", err);
    });
    return () => unsubMin();
  }, [localData?.id]);

  // Função para lidar com a digitação sem travar o cursor
  const handleFieldChange = (field, value, isAddress = false) => {
    if (!temPoderEdicao) return; 
    const upperValue = typeof value === 'string' ? value.toUpperCase() : value;
    
    if (isAddress) {
      setFormData(prev => ({
        ...prev,
        endereco: { ...prev.endereco, [field]: upperValue }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: upperValue }));
    }
  };

  // PERSISTÊNCIA: Salva no banco ao sair do campo
  const saveToDatabase = async () => {
    if (!localData?.id || !temPoderEdicao) return; 
    try {
      const docRef = doc(db, 'comuns', localData.id);
      const updatePayload = {
        endereco: formData.endereco || {},
        horaCulto: formData.horaCulto || '',
        ensaioLocal: formData.ensaioLocal || '',
        horaEnsaio: formData.horaEnsaio || '',
        updatedAt: Date.now()
      };

      await updateDoc(docRef, updatePayload);
      if (onUpdate) onUpdate(formData);
      toast.success("Dados sincronizados");
    } catch (e) {
      console.error("Erro ao salvar:", e);
      toast.error("Falha ao sincronizar.");
    }
  };

  const toggleDia = async (idx) => {
    if (!temPoderEdicao) return;
    const current = formData.diasSelecao || [];
    const updated = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    
    try {
        await updateDoc(doc(db, 'comuns', localData.id), { diasSelecao: updated });
    } catch (e) { 
        console.error("Erro toggle dia:", e);
        toast.error("Sem permissão para alterar agenda."); 
    }
  };

  if (!localData) return (
    <div className="py-10 text-center opacity-30 text-[8px] font-black uppercase tracking-widest">
      Selecione uma Comum para editar.
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 text-left pb-10">
      
      {/* INDICADOR DE STATUS DE EDIÇÃO v2.1 */}
      <div className={`mx-1 p-4 rounded-2xl flex items-center gap-3 border ${temPoderEdicao ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
          {temPoderEdicao ? <Shield size={16} className="text-blue-600" /> : <Lock size={16} className="text-amber-600" />}
          <div className="leading-tight">
            <p className={`text-[9px] font-black uppercase italic ${temPoderEdicao ? 'text-blue-600' : 'text-amber-600'}`}>
                {temPoderEdicao ? 'Modo de Zeladoria Ativo' : 'Acesso Somente Leitura'}
            </p>
            <p className={`text-[7px] font-bold uppercase ${temPoderEdicao ? 'text-blue-400' : 'text-amber-400'}`}>
                {temPoderEdicao ? 'Suas alterações são salvas automaticamente.' : 'Você não possui privilégios de edição para esta localidade.'}
            </p>
          </div>
      </div>

      {/* SEÇÃO 1: LOCALIZAÇÃO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <MapPin size={14} className={temPoderEdicao ? "text-blue-600" : "text-slate-300"} />
            <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest">Endereço Oficial</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          <input 
            disabled={!temPoderEdicao}
            placeholder="RUA / LOGRADOURO" 
            className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner uppercase italic disabled:opacity-50" 
            value={formData.endereco?.rua || ''} 
            onChange={e => handleFieldChange('rua', e.target.value, true)}
            onBlur={saveToDatabase}
          />
          <div className="grid grid-cols-3 gap-2">
            <input 
              disabled={!temPoderEdicao}
              placeholder="Nº" 
              className="col-span-1 bg-white p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner uppercase italic disabled:opacity-50" 
              value={formData.endereco?.numero || ''} 
              onChange={e => handleFieldChange('numero', e.target.value, true)}
              onBlur={saveToDatabase}
            />
            <input 
              disabled={!temPoderEdicao}
              placeholder="BAIRRO" 
              className="col-span-2 bg-white p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner uppercase italic disabled:opacity-50" 
              value={formData.endereco?.bairro || ''} 
              onChange={e => handleFieldChange('bairro', e.target.value, true)}
              onBlur={saveToDatabase}
            />
          </div>
          <input 
            disabled={!temPoderEdicao}
            placeholder="CEP" 
            className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner uppercase italic disabled:opacity-50" 
            value={formData.endereco?.cep || ''} 
            onChange={e => handleFieldChange('cep', e.target.value, true)}
            onBlur={saveToDatabase}
          />
        </div>
      </div>

      {/* SEÇÃO 2: AGENDA DE CULTOS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Clock size={14} className={temPoderEdicao ? "text-emerald-600" : "text-slate-300"} />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest">Agenda de Cultos</p>
        </div>
        
        <div className="flex justify-between gap-1.5">
          {diasSemana.map((d, i) => (
            <button key={i} disabled={!temPoderEdicao} onClick={() => toggleDia(i)} className={`flex-1 h-10 rounded-xl font-[900] text-[10px] transition-all ${formData.diasSelecao?.includes(i) ? 'bg-emerald-600 text-white' : 'bg-white text-slate-300 border border-slate-100'} disabled:opacity-50`}>{d}</button>
          ))}
        </div>

        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-inner flex items-center gap-3">
           <Clock size={14} className="text-slate-300"/>
           <input 
             disabled={!temPoderEdicao}
             type="time" 
             className="bg-transparent font-black text-slate-950 text-xs outline-none flex-1 disabled:opacity-50" 
             value={formData.horaCulto || '19:30'} 
             onChange={e => handleFieldChange('horaCulto', e.target.value)}
             onBlur={saveToDatabase}
           />
        </div>
      </div>

      {/* SEÇÃO 3: ENSAIO TÉCNICO */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Calendar size={14} className={temPoderEdicao ? "text-blue-600" : "text-slate-300"} />
          <p className="text-[10px] font-[900] text-slate-950 uppercase italic tracking-widest">Ensaio Técnico Local</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input 
            disabled={!temPoderEdicao}
            placeholder="DIA (EX: SÁBADO)" 
            className="bg-white p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner uppercase italic disabled:opacity-50" 
            value={formData.ensaioLocal || ''} 
            onChange={e => handleFieldChange('ensaioLocal', e.target.value)}
            onBlur={saveToDatabase}
          />
          <input 
            disabled={!temPoderEdicao}
            type="time" 
            className="bg-white p-4 rounded-2xl font-black text-slate-950 text-xs outline-none border border-slate-100 shadow-inner disabled:opacity-50" 
            value={formData.horaEnsaio || '19:00'} 
            onChange={e => handleFieldChange('horaEnsaio', e.target.value)}
            onBlur={saveToDatabase}
          />
        </div>
      </div>

      {/* SEÇÃO 4: MINISTÉRIO DO GEM */}
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
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-6 pb-8 space-y-4 overflow-hidden text-left">
              {temPoderEdicao && (
                <div className="space-y-2 pt-2">
                    <input placeholder="NOME DO IRMÃO..." className="w-full bg-white/10 p-4 rounded-2xl font-black text-white text-xs outline-none border border-white/5 uppercase" value={newMin.nome} onChange={e => setNewMin({...newMin, nome: e.target.value})} />
                    <div className="flex gap-2">
                        <select className="flex-1 bg-white/10 p-4 rounded-2xl font-black text-white text-[10px] outline-none border border-white/5 uppercase appearance-none" value={newMin.cargo} onChange={e => setNewMin({...newMin, cargo: e.target.value})}>
                            <option value="" className="text-slate-950">FUNÇÃO...</option>
                            {cargosOrdem.map(c => <option key={c} value={c} className="text-slate-950">{c}</option>)}
                        </select>
                        <button onClick={async () => {
                            if(!newMin.nome || !newMin.cargo) return toast.error("Preencha nome e cargo");
                            try {
                                await addDoc(collection(db, 'comuns', localData.id, 'ministerio_lista'), { nome: newMin.nome.toUpperCase(), cargo: newMin.cargo });
                                setNewMin({nome: '', cargo: ''});
                                toast.success("Adicionado");
                            } catch (err) { toast.error("Erro de permissão."); }
                        }} className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 shadow-lg"><Plus size={20}/></button>
                    </div>
                </div>
              )}
              
              <div className="space-y-2 pt-4 border-t border-white/10">
                {ministerio.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="leading-tight text-left">
                      <p className="text-[10px] font-[900] text-white uppercase italic">{m.nome}</p>
                      <p className="text-[7px] font-bold text-blue-400 uppercase tracking-widest mt-1">{m.cargo}</p>
                    </div>
                    {temPoderEdicao && (
                        <button onClick={async () => { 
                            if(confirm('Remover do Ministério Local?')) {
                                try {
                                    await deleteDoc(doc(db, 'comuns', localData.id, 'ministerio_lista', m.id)); 
                                    toast.success("Removido");
                                } catch (err) { toast.error("Sem permissão."); }
                            }
                        }} className="p-2 text-white/10 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isMaster && (
        <button onClick={() => { if(confirm("CUIDADO: Excluir localidade?")) toast.error("Contate o suporte Master para exclusão."); }} className="w-full p-4 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center gap-3 border border-red-100 uppercase text-[9px] font-black italic tracking-widest">
          <Trash2 size={16}/> Excluir Localidade Permanentemente
        </button>
      )}

    </motion.div>
  );
};

export default ModuleChurch;