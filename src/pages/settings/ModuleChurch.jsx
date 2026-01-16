import React, { useState, useEffect } from 'react';
// CORREÇÃO: Certificando que as coleções comuns e config_cidades sejam lidas corretamente
import { db, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, where } from '../../config/firebase';
import toast from 'react-hot-toast';
import { Building2, MapPin, Clock, ChevronDown, Plus, Trash2, Globe, Home, X, Check, Shield, Calendar, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ModuleChurch = ({ isMaster, userData }) => {
  // AJUSTE DE REGRAS DE VISIBILIDADE
  const isComissao = isMaster || (userData?.escopoRegional && userData?.membroComissao);
  const hasRegionalScope = userData?.escopoRegional === true || isMaster;
  const hasCityScope = userData?.escopoCidade === true || userData?.role === 'Encarregado Regional';
  const isLocalOnly = !hasRegionalScope && !hasCityScope && userData?.escopoLocal === true;

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  const [cidades, setCidades] = useState([]);
  const [comuns, setComuns] = useState([]);
  const [openCityId, setOpenCityId] = useState(null);
  const [selectedChurch, setSelectedChurch] = useState(null);

  const [newCityName, setNewCityName] = useState('');
  const [newChurchName, setNewChurchName] = useState('');

  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const cargosOrdem = ['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM', 'Encarregado Regional', 'Examinadora', 'Encarregado Local'];

  // 1. Monitorar Cidades com Trava Hierárquica
  useEffect(() => {
    if (!activeRegionalId) return;
    const q = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    return onSnapshot(q, (s) => {
      const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // CORREÇÃO: Se não for Comissão, filtra para ver apenas a própria cidade
      const filtrada = isComissao ? list : list.filter(c => c.id === userData?.cidadeId);
      
      setCidades(filtrada);
      // Abre automaticamente se houver apenas uma cidade (caso do Regional não-comissão)
      if (!isComissao && filtrada.length > 0) setOpenCityId(filtrada[0].id);
    });
  }, [activeRegionalId, isComissao, userData]);

  // 2. Monitorar Comuns
  useEffect(() => {
    if (!activeRegionalId) return;
    const q = query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId));
    return onSnapshot(q, (s) => {
      const list = s.docs.map(d => ({
        id: d.id,
        ...d.data(),
        comum: d.data().comum || d.data().nome || "SEM NOME"
      }));
      // Filtra comuns se o usuário for apenas local
      const filtrada = isLocalOnly ? list.filter(c => c.id === userData?.comumId) : list;
      setComuns(filtrada);
    });
  }, [activeRegionalId, isLocalOnly, userData]);

  const handleCreateCity = async () => {
    if (!newCityName.trim()) return toast.error("Preencha o nome da cidade");
    try {
      await addDoc(collection(db, 'config_cidades'), { 
        nome: newCityName.toUpperCase(), 
        regionalId: activeRegionalId 
      });
      setNewCityName('');
      toast.success("Cidade Criada!");
    } catch (e) { toast.error("Erro ao criar"); }
  };

  const handleCreateChurch = async (cityId) => {
    if (!newChurchName.trim()) return toast.error("Preencha o nome da comum");
    try {
      await addDoc(collection(db, 'comuns'), { 
        comum: newChurchName.toUpperCase(), 
        cidadeId: cityId,
        regionalId: activeRegionalId,
        diasSelecao: [],
        horaCulto: "19:30",
        ensaioLocal: "",
        horaEnsaio: "19:00",
        endereco: { rua: '', numero: '', cep: '', bairro: '' }
      });
      setNewChurchName('');
      toast.success("Comum Criada!");
    } catch (e) { toast.error("Erro ao criar"); }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Somente Comissão/Master cria cidades */}
      {isComissao && (
        <div className="bg-slate-950 p-5 rounded-[2.2rem] shadow-xl space-y-3 mb-6">
          <p className="text-[7px] font-black text-blue-400 uppercase tracking-[0.2em] italic ml-1">Jurisdição Municipal</p>
          <div className="flex gap-2 items-center">
            <input placeholder="NOME DA CIDADE..." className="flex-1 bg-white/10 p-3 rounded-2xl font-bold text-white text-[11px] border border-white/5 outline-none uppercase placeholder:text-white/20" value={newCityName} onChange={e => setNewCityName(e.target.value)} />
            <button onClick={handleCreateCity} className="bg-blue-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg shrink-0"><Plus size={18}/></button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {cidades.map(city => (
          <div key={city.id} className="bg-white rounded-[2.2rem] border border-slate-100 shadow-sm overflow-hidden">
            <button 
              disabled={!isComissao} // Regional não-comissão não precisa fechar a única cidade dele
              onClick={() => setOpenCityId(openCityId === city.id ? null : city.id)} 
              className="w-full p-5 flex justify-between items-center active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4 text-left leading-none">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><Globe size={16}/></div>
                <div>
                   <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1 italic">Município</p>
                   <span className="font-[900] text-slate-950 uppercase italic text-xs tracking-tight">{city.nome}</span>
                </div>
              </div>
              {isComissao && <ChevronDown size={16} className={`text-slate-300 transition-transform ${openCityId === city.id ? 'rotate-180' : ''}`}/>}
            </button>

            <AnimatePresence>
              {openCityId === city.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-5 pb-6 space-y-3 bg-slate-50/50 overflow-hidden">
                  {/* Regional pode criar comum na sua cidade */}
                  {(hasRegionalScope || hasCityScope) && (
                    <div className="flex gap-2 items-center pt-3">
                      <input placeholder="NOVA COMUM..." className="flex-1 bg-white p-3 rounded-2xl font-bold text-slate-950 text-[11px] border border-slate-200 outline-none uppercase italic shadow-sm" value={newChurchName} onChange={e => setNewChurchName(e.target.value)} />
                      <button onClick={() => handleCreateChurch(city.id)} className="bg-slate-950 text-white w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all shrink-0"><Plus size={16}/></button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {comuns.filter(c => c.cidadeId === city.id).map(church => (
                      <button key={church.id} onClick={() => setSelectedChurch(church)} className="w-full p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><Home size={12}/></div>
                            <span className="font-black text-slate-950 uppercase italic text-[9px] tracking-widest">{church.comum}</span>
                        </div>
                        <div className="text-slate-300">
                          <ChevronDown size={12} className="-rotate-90"/>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedChurch && (
          <ChurchModal 
            church={selectedChurch} 
            onClose={() => setSelectedChurch(null)} 
            cargosOrdem={cargosOrdem} 
            diasSemana={diasSemana} 
            isLocalOnly={isLocalOnly}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ChurchModal = ({ church, onClose, cargosOrdem, diasSemana, isLocalOnly }) => {
  const [ministerio, setMinisterio] = useState([]);
  const [isMinListOpen, setIsMinListOpen] = useState(false);
  const [newMin, setNewMin] = useState({ nome: '', cargo: '' });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [localData, setLocalData] = useState(church);

  useEffect(() => {
    return onSnapshot(collection(db, 'comuns', church.id, 'ministerio_lista'), (s) => {
      const lista = s.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (cargosOrdem.indexOf(a.cargo) || 99) - (cargosOrdem.indexOf(b.cargo) || 99));
      setMinisterio(lista);
    });
  }, [church.id, cargosOrdem]);

  const handleChange = async (field, value, isAddress = false) => {
    if (isAddress) {
      setLocalData(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: value } }));
    } else {
      setLocalData(prev => ({ ...prev, [field]: value }));
    }
    try {
      const docRef = doc(db, 'comuns', church.id);
      if (isAddress) { await updateDoc(docRef, { [`endereco.${field}`]: value }); } 
      else { await updateDoc(docRef, { [field]: value }); }
    } catch (e) { console.error(e); }
  };

  const toggleDia = async (idx) => {
    const current = localData.diasSelecao || [];
    const updated = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    setLocalData(prev => ({ ...prev, diasSelecao: updated }));
    await updateDoc(doc(db, 'comuns', church.id), { diasSelecao: updated });
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-7 pb-10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left">
        
        <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-6 shrink-0" />

        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest mb-1 italic leading-none">Gestão Local Ativa</p>
            <h3 className="text-lg font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">{localData.comum}</h3>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 active:scale-90"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-1">
          <div className="space-y-3">
            <p className="text-[7px] font-black text-slate-400 uppercase italic tracking-widest border-b border-slate-50 pb-2">Identificação Geográfica</p>
            <input placeholder="RUA / LOGRADOURO" className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-slate-950 text-xs outline-none border border-transparent focus:border-blue-100 uppercase" value={localData.endereco?.rua || ''} onChange={e => handleChange('rua', e.target.value, true)} />
            <input placeholder="BAIRRO" className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-slate-950 text-xs outline-none border border-transparent focus:border-blue-100 uppercase" value={localData.endereco?.bairro || ''} onChange={e => handleChange('bairro', e.target.value, true)} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Nº" className="bg-slate-50 p-3.5 rounded-2xl font-bold text-slate-950 text-xs outline-none border border-transparent focus:border-blue-100 uppercase" value={localData.endereco?.numero || ''} onChange={e => handleChange('numero', e.target.value, true)} />
              <input placeholder="CEP" className="bg-slate-50 p-3.5 rounded-2xl font-bold text-slate-950 text-xs outline-none border border-transparent focus:border-blue-100 uppercase" value={localData.endereco?.cep || ''} onChange={e => handleChange('cep', e.target.value, true)} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[7px] font-black text-slate-400 uppercase italic tracking-widest border-b border-slate-50 pb-2">Agenda Semanal</p>
            <div className="flex justify-between gap-1">
              {diasSemana.map((d, i) => (
                <button key={i} onClick={() => toggleDia(i)} className={`flex-1 h-9 rounded-xl font-black text-[10px] transition-all ${localData.diasSelecao?.includes(i) ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}>{d}</button>
              ))}
            </div>
            <div className="relative">
              <Clock size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
              <input type="time" className="w-full bg-slate-50 p-3.5 rounded-2xl font-black text-slate-950 text-xs pl-11" value={localData.horaCulto || ''} onChange={e => handleChange('horaCulto', e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[7px] font-black text-blue-600 uppercase italic tracking-widest border-b border-blue-50 pb-2">Ensaio Técnico Local</p>
            <div className="flex gap-2">
               <div className="relative flex-1">
                 <Calendar size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                 <input placeholder="SÁBADO/DOM" className="w-full bg-slate-50 p-3.5 pl-10 rounded-2xl font-black text-slate-950 text-xs outline-none uppercase italic" value={localData.ensaioLocal || ''} onChange={e => handleChange('ensaioLocal', e.target.value)} />
               </div>
               <div className="relative w-32">
                 <Clock size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                 <input type="time" className="w-full bg-slate-50 p-3.5 pl-10 rounded-2xl font-black text-slate-950 text-xs outline-none" value={localData.horaEnsaio || ''} onChange={e => handleChange('horaEnsaio', e.target.value)} />
               </div>
            </div>
          </div>

          <div className="bg-slate-950 rounded-[2.2rem] overflow-hidden shadow-2xl">
            <button onClick={() => setIsMinListOpen(!isMinListOpen)} className="w-full p-5 flex justify-between items-center text-amber-500 active:bg-white/5 transition-colors">
               <div className="flex items-center gap-3 text-left">
                  <Shield size={14}/>
                  <span className="text-[9px] font-black uppercase italic tracking-[0.2em]">Ministério do GEM</span>
               </div>
               <ChevronDown size={14} className={`transition-transform ${isMinListOpen ? 'rotate-180' : ''}`}/>
            </button>

            <AnimatePresence>
              {isMinListOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-5 pb-7 space-y-3 overflow-hidden text-left">
                  <div className="space-y-2 pt-1">
                    <input placeholder="NOME DO IRMÃO..." className="w-full bg-white/10 p-3.5 rounded-2xl font-bold text-white text-xs outline-none border border-white/5 uppercase" value={newMin.nome} onChange={e => setNewMin({...newMin, nome: e.target.value})} />
                    <div className="flex gap-2">
                      <select className="flex-1 bg-white/10 p-3.5 rounded-2xl font-bold text-white text-[10px] outline-none border border-white/5 uppercase appearance-none" value={newMin.cargo} onChange={e => setNewMin({...newMin, cargo: e.target.value})}>
                        <option value="">FUNÇÃO...</option>
                        {cargosOrdem.map(c => <option key={c} value={c} className="text-slate-950">{c}</option>)}
                      </select>
                      <button onClick={async () => {
                        if(!newMin.nome || !newMin.cargo) return toast.error("Preencha tudo");
                        await addDoc(collection(db, 'comuns', church.id, 'ministerio_lista'), newMin);
                        setNewMin({nome: '', cargo: ''});
                        toast.success("Adicionado");
                      }} className="bg-white text-slate-950 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all shrink-0"><Plus size={20}/></button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-white/10">
                    {ministerio.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3.5 bg-white/5 rounded-2xl border border-white/5">
                        <div className="leading-none text-left">
                          <p className="text-[10px] font-black text-white uppercase italic">{m.nome}</p>
                          <p className="text-[7px] font-bold text-white/30 uppercase mt-1">{m.cargo}</p>
                        </div>
                        <button onClick={async () => { await deleteDoc(doc(db, 'comuns', church.id, 'ministerio_lista', m.id)); toast.success("Removido"); }} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isLocalOnly && (
            <button onClick={() => setIsConfirmingDelete(true)} className="w-full py-4 px-6 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm group">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl group-active:animate-bounce"><Trash2 size={16}/></div>
              <div className="text-left leading-none">
                <p className="text-[9px] font-black text-red-600 uppercase italic">Excluir Comum</p>
                <p className="text-[7px] font-bold text-red-400 uppercase tracking-widest mt-0.5 italic">Remover permanentemente</p>
              </div>
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isConfirmingDelete && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-xs rounded-[3rem] p-8 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-950 uppercase italic leading-tight">Confirmar Exclusão?</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Você está prestes a apagar todos os dados desta comum. Esta ação não tem volta.</p>
              </div>
              <div className="space-y-2 pt-2">
                <button onClick={async () => { await deleteDoc(doc(db, 'comuns', church.id)); setIsConfirmingDelete(false); onClose(); toast.success("Localidade Removida"); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest active:scale-95 shadow-lg shadow-red-200">Sim, Excluir Agora</button>
                <button onClick={() => setIsConfirmingDelete(false)} className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest active:scale-95">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuleChurch;