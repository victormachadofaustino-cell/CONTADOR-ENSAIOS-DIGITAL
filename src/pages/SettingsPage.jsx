import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Caminho do Firebase subindo um nível
import { db, collection, onSnapshot, doc, query, where, addDoc, deleteDoc, updateDoc } from '../config/firebase';
import { 
  Home, Music, Users, ShieldCheck, Plus, ChevronDown, 
  ChevronRight, ChevronLeft, MapPin, Building2, LayoutGrid, 
  Trash2, Edit3, X, Check, PlusCircle, Send
} from 'lucide-react';
// Importação do Cérebro de Autenticação (useAuth)
import { useAuth } from '../context/AuthContext';
// Importação do Serviço de Igreja para criação de novas localidades
import { churchService } from '../services/churchService';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Importação dos Módulos (Caminhos ajustados para a subpasta settings)
import ModuleChurch from './settings/ModuleChurch';
import ModuleOrchestra from './settings/ModuleOrchestra';
import ModuleGlobal from './settings/ModuleGlobal';
import ModuleAccess from './settings/ModuleAccess';

const SettingsPage = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedComum, setSelectedComum] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  // Estados para Modais de Criação
  const [isNewChurchModalOpen, setIsNewChurchModalOpen] = useState(false);
  const [newChurchName, setNewChurchName] = useState('');

  // --- NOVA LÓGICA DE COMPETÊNCIAS v2.1 (MATRIZ DE PODER) ---
  const level = userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';

  // REATIVIDADE AO HEADER: Pega a Regional ativa do contexto
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId || null;
  const activeRegionalName = userData?.activeRegionalName || userData?.regional || "Regional";

  // Lista de IDs permitidos para o Regional (Sua comum + Adjacências)
  const permitidasIds = useMemo(() => {
    const ids = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
    return [...new Set(ids.filter(Boolean))];
  }, [userData]);
  
  // REGRA DE OURO: Prioriza a seleção ativa ou o activeComumId injetado pelo AuthContext
  const comumIdEfetivo = selectedComum?.id || userData?.activeComumId || userData?.comumId;

  const [sharedData, setSharedData] = useState({
    church: {},
    cargos: [],
    ministeriosDropdown: [],
    instruments: [],
    cidades: [],
    comunsDaRegional: [] 
  });

  // 1. MONITOR GEOGRÁFICO REATIVO (Cargos, Cidades e Comuns)
  useEffect(() => {
    if (!activeRegionalId || !userData) return;
    let isMounted = true;
    const unsubs = [];

    // Reset para Master/Comissão ao trocar Regional, mas mantém para Local
    if (isRegionalCidade) {
        setSelectedCity(null);
        setSelectedComum(null);
        setActiveMenu(null);
    }
    
    setLoading(true);

    try {
      // CARGOS UNIFICADOS (Referência Global)
      unsubs.push(onSnapshot(collection(db, 'referencia_cargos'), (s) => {
        if (!isMounted) return;
        const cargosData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setSharedData(prev => ({ 
          ...prev, 
          cargos: cargosData.filter(c => c.tipo === 'cargo'),
          ministeriosDropdown: cargosData.filter(c => c.tipo === 'ministerio')
        }));
      }));

      // BUSCA DE TODAS AS COMUNS DA REGIONAL ATIVA
      const qComuns = query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId));
      unsubs.push(onSnapshot(qComuns, (s) => {
        if (!isMounted) return;
        const listaComuns = s.docs.map(d => ({ id: d.id, ...d.data(), comum: d.data().comum || "Sem Nome" }));
        
        const comunsVisiveis = (isComissao) 
          ? listaComuns 
          : listaComuns.filter(c => permitidasIds.includes(c.id) || c.cidadeId === userData?.cidadeId);

        setSharedData(prev => ({ ...prev, comunsDaRegional: comunsVisiveis }));

        // CIDADES DA REGIONAL
        const qCidades = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
        unsubs.push(onSnapshot(qCidades, (sCidades) => {
          if (!isMounted) return;
          const todasCidades = sCidades.docs.map(d => ({ id: d.id, nome: d.data().nome }));
          
          let filtradas = [];
          if (isComissao) {
            filtradas = todasCidades.sort((a, b) => a.nome.localeCompare(b.nome));
          } else {
            const cidadesIdsPermitidas = listaComuns
              .filter(com => permitidasIds.includes(com.id) || com.cidadeId === userData?.cidadeId)
              .map(com => com.cidadeId);
            filtradas = todasCidades.filter(cid => cidadesIdsPermitidas.includes(cid.id));
          }
          
          setSharedData(prev => ({ ...prev, cidades: filtradas }));
          
          // Inicialização geográfica inteligente
          if (filtradas.length > 0 && !selectedCity) {
            const userCity = filtradas.find(c => c.id === userData?.activeCityId || c.id === userData?.cidadeId);
            if (userCity) setSelectedCity(userCity);
          }
          
          setLoading(false); 
        }));
      }));

    } catch (error) {
      console.error("Erro reatividade Geográfica:", error);
      if (isMounted) setLoading(false);
    }

    return () => { isMounted = false; unsubs.forEach(unsub => unsub?.()); };
  }, [activeRegionalId, userData?.uid]); 

  // 2. MONITOR DE INSTRUMENTOS REATIVO (Ajustado para a Comum Ativa)
  useEffect(() => {
    if (!comumIdEfetivo) return;
    let isMounted = true;
    const unsub = onSnapshot(collection(db, 'comuns', comumIdEfetivo, 'instrumentos_config'), (sInst) => {
      if (!isMounted) return;
      setSharedData(prev => ({ ...prev, instruments: sInst.docs.map(d => ({ ...d.data(), id: d.id, section: d.data().section?.toUpperCase() || 'GERAL' })) }));
    });
    return () => { isMounted = false; unsub(); };
  }, [comumIdEfetivo]);

  const handleCreateChurch = async () => {
    if (!newChurchName.trim()) return toast.error("Informe o nome da localidade");
    if (!selectedCity) return toast.error("Selecione uma cidade primeiro");

    const sucesso = await churchService.createChurch({
      nome: newChurchName.toUpperCase().trim(),
      cidadeId: selectedCity.id,
      regionalId: activeRegionalId,
      cidadeNome: selectedCity.nome,
      regionalNome: activeRegionalName
    });

    if (sucesso) {
      setNewChurchName('');
      setIsNewChurchModalOpen(false);
    }
  };

  // Trava de segurança para evitar renderizar sem dados de usuário
  if (!userData) return null;

  if (loading && isRegionalCidade) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="font-black italic text-slate-400 text-[10px] uppercase tracking-widest text-center">Sincronizando Jurisdição...</div>
    </div>
  );

  return (
    <div className="space-y-6 pb-40 px-4 pt-6 max-w-md mx-auto text-left font-sans">
      
      {/* SELETORES HIERÁRQUICOS UNIFICADOS (v2.1) - Exclusivo para quem pode navegar */}
      {isRegionalCidade && (
        <div className="flex items-center gap-2 px-1">
          <div className={`flex-1 flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-white shadow-sm transition-all ${sharedData.cidades.length <= 1 && !isComissao ? 'opacity-50 pointer-events-none' : ''}`}>
            <MapPin size={10} className="text-blue-600 shrink-0" />
            <select 
              className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer"
              value={selectedCity?.id || ''}
              onChange={(e) => {
                const city = sharedData.cidades.find(c => c.id === e.target.value);
                setSelectedCity(city);
                setSelectedComum(null);
                setActiveMenu(null);
              }}
            >
              <option value="">CIDADE...</option>
              {sharedData.cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="flex-[1.2] flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl shadow-xl border border-white/10 relative">
            <Home size={10} className="text-blue-400 shrink-0" />
            <select 
              className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer pr-8"
              value={selectedComum?.id || ''}
              onChange={(e) => {
                const com = sharedData.comunsDaRegional.find(c => c.id === e.target.value);
                setSelectedComum(com);
                setActiveMenu(null);
              }}
            >
              <option value="" className="text-slate-900">{selectedComum?.comum || "LOCALIDADE..."}</option>
              {sharedData.comunsDaRegional
                .filter(c => selectedCity ? c.cidadeId === selectedCity.id : true)
                .map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.comum}</option>)}
            </select>
            
            <div className="absolute right-2 flex items-center gap-1">
              {isRegionalCidade && selectedCity && (
                <button 
                  onClick={() => setIsNewChurchModalOpen(true)}
                  className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                  title="Nova Comum"
                >
                  <PlusCircle size={16} strokeWidth={3} />
                </button>
              )}
              <ChevronDown size={10} className="text-white/20" />
            </div>
          </div>
        </div>
      )}

      {/* BLOCO 2: GESTÃO GLOBAL (Exclusivo Master) */}
      {isMaster && (
        <MenuCard id="global" active={activeMenu} setActive={setActiveMenu} icon={<LayoutGrid size={18}/>} module="Administração" title="Cidades, Cargos & Ministérios">
          <ModuleGlobal 
            cargos={sharedData.cargos} 
            ministerios={sharedData.ministeriosDropdown}
            regionalId={activeRegionalId}
          />
        </MenuCard>
      )}

      {/* BLOCO 3: MÓDULOS DE MANUTENÇÃO - Visíveis para GEM Local ou superior */}
      <div className="space-y-3">
        <div className="px-2 mb-2">
            <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">Manutenção Ativa em:</p>
            <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter leading-none mt-1">
              {selectedComum?.comum || userData.comum || "CARREGANDO..."}
            </h3>
        </div>

        {isGemLocal && (
          <>
            <MenuCard id="orchestra" active={activeMenu} setActive={setActiveMenu} icon={<Music size={18}/>} module="Configuração" title="Orquestra & Instrumentos">
                <ModuleOrchestra comumId={comumIdEfetivo} instrumentsData={sharedData.instruments} />
            </MenuCard>
            
            <MenuCard id="users" active={activeMenu} setActive={setActiveMenu} icon={<ShieldCheck size={18}/>} module="Segurança" title="Acesso & Portaria">
                <ModuleAccess comumId={comumIdEfetivo} cargos={sharedData.cargos} />
            </MenuCard>
            
            <MenuCard id="church" active={activeMenu} setActive={setActiveMenu} icon={<Home size={18}/>} module="Gestão" title="Dados Cadastrais">
                <ModuleChurch 
                  localData={selectedComum || {id: userData.comumId, comum: userData.comum}} 
                  onUpdate={(updated) => setSelectedComum(updated)} 
                />
            </MenuCard>
          </>
        )}
      </div>

      <AnimatePresence>
        {isNewChurchModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewChurchModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl space-y-6">
              <div className="text-left space-y-1">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">Expansão de Jurisdição</p>
                <h3 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">Nova Localidade</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase italic">Cidade: {selectedCity?.nome}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic">Nome da Comum</label>
                  <input 
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-6 text-xs font-black text-slate-950 outline-none uppercase italic shadow-inner" 
                    placeholder="EX: JD. AEROPORTO..."
                    value={newChurchName}
                    onChange={e => setNewChurchName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleCreateChurch}
                  className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3"
                >
                  <Send size={16} /> Confirmar Cadastro
                </button>
                <button onClick={() => setIsNewChurchModalOpen(false)} className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuCard = ({ id, active, setActive, icon, module, title, children }) => {
  const isOpen = active === id;
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-3">
      <button onClick={() => setActive(isOpen ? null : id)} className="w-full p-6 flex justify-between items-center outline-none transition-colors active:bg-slate-50">
        <div className="flex items-center gap-4 text-left leading-none">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-slate-950 text-white scale-110 rotate-3 shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{icon}</div>
          <div>
            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-[0.2em] italic opacity-70 leading-none">{module}</p>
            <h3 className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">{title}</h3>
          </div>
        </div>
        <ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-6 pt-2 bg-slate-50/30 border-t border-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;