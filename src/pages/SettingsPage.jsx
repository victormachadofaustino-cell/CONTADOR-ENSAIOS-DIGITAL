import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Caminho do Firebase subindo um nível
import { db, collection, onSnapshot, doc, query, where } from '../config/firebase';
import { 
  Home, Music, Users, ShieldCheck, Plus, ChevronDown, 
  MapPin, Building2, LayoutGrid, Settings, Briefcase, Trash2, X
} from 'lucide-react';
// Importação do Cérebro de Autenticação (useAuth)
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Importação dos Módulos (Incluindo os novos arquivos criados)
import ModuleChurch from './settings/ModuleChurch';
import ModuleOrchestra from './settings/ModuleOrchestra';
import ModuleGlobal from './settings/ModuleGlobal';
import ModuleAccess from './settings/ModuleAccess';
import ModuleCities from './settings/ModuleCities'; 
import ModuleChurchesManager from './settings/ModuleChurchesManager';

const SettingsPage = () => {
  const { userData, setContext } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedComum, setSelectedComum] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  // --- NOVA LÓGICA DE COMPETÊNCIAS v2.1 (MATRIZ DE PODER) ---
  const level = userData?.accessLevel;
  const isMaster = level === 'master';
  const isComissao = isMaster || level === 'comissao';
  const isRegionalCidade = isComissao || level === 'regional_cidade';
  const isGemLocal = isRegionalCidade || level === 'gem_local';

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId || null;
  const comumIdEfetivo = selectedComum?.id || userData?.activeComumId || null;

  const [sharedData, setSharedData] = useState({
    cargos: [],
    ministeriosDropdown: [],
    instruments: [],
    cidades: [],
    comunsDaRegional: [] 
  });

  // FUNÇÃO DE EXCLUSÃO NATIVA (REPLACE window.confirm)
  const confirmarExclusaoNativa = (itemNome, aoConfirmar) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-1 min-w-[280px]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 size={16} strokeWidth={3} />
            <p className="text-[12px] font-black uppercase tracking-wider">Confirmar Exclusão</p>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Deseja realmente excluir <span className="font-bold text-slate-950 italic">"{itemNome}"</span>? 
            Esta ação é irreversível e removerá todos os dados vinculados.
          </p>
        </div>
        
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              aoConfirmar();
            }}
            className="bg-red-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2"
          >
            Excluir Agora
          </button>
        </div>
      </div>
    ), {
      duration: Infinity, // Mantém aberto até o usuário decidir
      position: 'top-center',
      style: {
        borderRadius: '2.5rem',
        background: '#fff',
        border: '1px solid #F1F5F9',
        padding: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      },
    });
  };

  // Sincronização passiva com o GPS Global - HIGIENE DE TROCA
  useEffect(() => {
    if (userData?.activeCityId) {
      const city = sharedData.cidades.find(c => c.id === userData.activeCityId);
      if (city) setSelectedCity(city);
      else setSelectedCity(null);
    } else {
      setSelectedCity(null);
    }

    if (!userData?.activeComumId) {
      setSelectedComum(null);
    }
  }, [userData?.activeCityId, userData?.activeComumId, sharedData.cidades]);

  // 1. MONITOR GEOGRÁFICO REATIVO
  useEffect(() => {
    if (!activeRegionalId || !userData) return;
    let isMounted = true;
    const unsubs = [];

    setLoading(true);

    try {
      unsubs.push(onSnapshot(collection(db, 'referencia_cargos'), (s) => {
        if (!isMounted) return;
        const cargosData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setSharedData(prev => ({ 
          ...prev, 
          cargos: cargosData.filter(c => c.tipo === 'cargo'),
          ministeriosDropdown: cargosData.filter(c => c.tipo === 'ministerio')
        }));
      }));

      const qComuns = query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId));
      unsubs.push(onSnapshot(qComuns, (s) => {
        if (!isMounted) return;
        const listaBruta = s.docs.map(d => ({ id: d.id, ...d.data(), comum: d.data().comum || "Sem Nome" }));
        const permitidasIds = [userData?.comumId, ...(userData?.acessosPermitidos || [])];
        
        const comunsVisiveis = (isComissao) 
          ? listaBruta 
          : listaBruta.filter(c => c.cidadeId === userData?.cidadeId || permitidasIds.includes(c.id));

        setSharedData(prev => ({ ...prev, comunsDaRegional: comunsVisiveis }));

        const qCidades = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
        unsubs.push(onSnapshot(qCidades, (sCids) => {
          if (!isMounted) return;
          const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome }));
          const filtradas = isComissao ? todasCidades.sort((a, b) => a.nome.localeCompare(b.nome)) : todasCidades.filter(cid => cid.id === userData?.cidadeId);
          
          setSharedData(prev => ({ ...prev, cidades: filtradas }));
          
          if (filtradas.length === 0) {
            setSelectedCity(null);
            setSelectedComum(null);
          } else if (!selectedCity) {
            const myCity = filtradas.find(c => c.id === (userData?.activeCityId || userData?.cidadeId));
            if (myCity) setSelectedCity(myCity);
          }
          setLoading(false); 
        }));
      }));
    } catch (error) {
      if (isMounted) setLoading(false);
    }
    return () => { isMounted = false; unsubs.forEach(unsub => unsub?.()); };
  }, [activeRegionalId, isComissao]);

  // 2. MONITOR DE INSTRUMENTOS
  useEffect(() => {
    if (!comumIdEfetivo) return;
    let isMounted = true;
    
    const comumAindaValida = sharedData.comunsDaRegional.some(c => c.id === comumIdEfetivo);
    if (!comumAindaValida) {
        setSelectedComum(null);
        return;
    }

    const unsub = onSnapshot(doc(db, 'comuns', comumIdEfetivo), (docSnap) => {
        if (docSnap.exists() && isMounted) setSelectedComum({ id: docSnap.id, ...docSnap.data() });
    });
    const unsubInst = onSnapshot(collection(db, 'comuns', comumIdEfetivo, 'instrumentos_config'), (sInst) => {
      if (!isMounted) return;
      setSharedData(prev => ({ ...prev, instruments: sInst.docs.map(d => ({ ...d.data(), id: d.id, section: d.data().section?.toUpperCase() || 'GERAL' })) }));
    });
    return () => { isMounted = false; unsub(); unsubInst(); };
  }, [comumIdEfetivo, sharedData.comunsDaRegional]);

  if (!userData) return null;

  if (loading && isRegionalCidade) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="font-black italic text-slate-400 text-[10px] uppercase tracking-widest text-center">Sincronizando Jurisdição...</div>
    </div>
  );

  return (
    <div className="space-y-6 pb-40 px-4 pt-6 max-w-md mx-auto text-left font-sans">
      
      {/* BLOCO 1: GESTÃO ADMINISTRATIVA DE BASE */}
      {isComissao && (
        <div className="space-y-3">
          <MenuCard id="global" active={activeMenu} setActive={setActiveMenu} icon={<Briefcase size={18}/>} module="Referências" title="Cargos & Ministérios">
            <ModuleGlobal 
              cargos={sharedData.cargos} 
              ministerios={sharedData.ministeriosDropdown}
              onConfirmDelete={confirmarExclusaoNativa} // Prop para exclusão nativa
            />
          </MenuCard>

          <MenuCard id="cities" active={activeMenu} setActive={setActiveMenu} icon={<MapPin size={18}/>} module="Geografia" title="Gestão de Cidades">
            <ModuleCities 
              regionalId={activeRegionalId} 
              onConfirmDelete={confirmarExclusaoNativa} // Prop para exclusão nativa
            />
          </MenuCard>
        </div>
      )}

      {/* BLOCO 2: DIVISOR DE CONTEXTO (Os Pills) */}
      {isRegionalCidade && (
        <div key={`pills-container-${activeRegionalId}`} className="flex items-center gap-2 px-1 py-4 border-y border-slate-100">
          <div className={`flex-1 flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-white shadow-sm transition-all ${(!isComissao || sharedData.cidades.length === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
            <MapPin size={10} className="text-blue-600 shrink-0" />
            <select 
              className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-slate-950 appearance-none cursor-pointer"
              value={selectedCity?.id || ''}
              disabled={!isComissao || sharedData.cidades.length === 0}
              onChange={(e) => {
                const city = sharedData.cidades.find(c => c.id === e.target.value);
                setSelectedCity(city);
                setContext('city', city?.id);
                setSelectedComum(null);
                setContext('comum', null);
                setActiveMenu(null);
              }}
            >
              <option value="">{sharedData.cidades.length === 0 ? "NENHUMA CIDADE" : isComissao ? "CIDADE..." : (userData?.cidadeNome || "SUA CIDADE")}</option>
              {sharedData.cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className={`flex-[1.2] flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl shadow-xl border border-white/10 ${(!selectedCity && sharedData.cidades.length > 0) ? 'opacity-50 pointer-events-none' : ''}`}>
            <Home size={10} className="text-blue-400 shrink-0" />
            <select 
              className="bg-transparent text-[9px] font-black uppercase outline-none w-full italic text-white appearance-none cursor-pointer pr-4"
              value={selectedComum?.id || ''}
              disabled={!selectedCity && sharedData.cidades.length > 0}
              onChange={(e) => {
                const com = sharedData.comunsDaRegional.find(c => c.id === e.target.value);
                setSelectedComum(com);
                setContext('comum', com?.id);
                setActiveMenu(null);
              }}
            >
              <option value="" className="text-slate-900">
                {sharedData.cidades.length === 0 ? "AGUARDANDO CIDADE" : sharedData.comunsDaRegional.filter(c => selectedCity ? c.cidadeId === selectedCity.id : true).length === 0 ? "VAZIO" : "LOCALIDADE..."}
              </option>
              {sharedData.comunsDaRegional
                .filter(c => selectedCity ? c.cidadeId === selectedCity.id : true)
                .map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.comum}</option>)}
            </select>
            <ChevronDown size={10} className="text-white/20 ml-auto" />
          </div>
        </div>
      )}

      {/* BLOCO 3: GESTÃO OPERACIONAL */}
      <div className="space-y-3">
        {isComissao && (
          <MenuCard id="churches_mgr" active={activeMenu} setActive={setActiveMenu} icon={<Building2 size={18}/>} module="Infraestrutura" title="Manutenção de Comuns">
            <ModuleChurchesManager 
              selectedCity={selectedCity} 
              regionalId={activeRegionalId} 
              onConfirmDelete={confirmarExclusaoNativa} // Prop para exclusão nativa
            />
          </MenuCard>
        )}

        {selectedComum?.id && sharedData.comunsDaRegional.some(c => c.id === selectedComum.id) ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="px-2 mb-2 leading-none pt-4">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">Manutenção Ativa:</p>
                <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter leading-none mt-1">
                  {selectedComum.comum}
                </h3>
            </div>

            {isGemLocal && (
              <>
                <MenuCard id="orchestra" active={activeMenu} setActive={setActiveMenu} icon={<Music size={18}/>} module="Configuração" title="Orquestra & Instrumentos">
                    <ModuleOrchestra comumId={comumIdEfetivo} instrumentsData={sharedData.instruments} />
                </MenuCard>
                
                <MenuCard id="users" active={activeMenu} setActive={setActiveMenu} icon={<Users size={18}/>} module="Segurança" title="Acesso & Portaria">
                    <ModuleAccess comumId={comumIdEfetivo} cargos={sharedData.cargos} />
                </MenuCard>
                
                <MenuCard id="church" active={activeMenu} setActive={setActiveMenu} icon={<Home size={18}/>} module="Gestão" title="Dados Cadastrais">
                    <ModuleChurch 
                      localData={selectedComum} 
                      onUpdate={(updated) => setSelectedComum(updated)} 
                    />
                </MenuCard>
              </>
            )}
          </div>
        ) : (
          <div className="p-10 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} />
            </div>
            <p className="text-slate-400 font-black uppercase italic text-[10px] tracking-widest leading-relaxed">
              Jurisdição Indefinida <br/> <span className="text-[8px] opacity-60">Selecione uma localidade acima para gerenciar</span>
            </p>
          </div>
        )}
      </div>
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
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-6 pt-2 bg-slate-50/30 border-t border-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;