import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, query, where } from '../firebase';
import { Home, Music, Users, ShieldCheck, Plus, ChevronDown } from 'lucide-react';

// Importação dos Módulos
import ModuleChurch from '../components/settings/ModuleChurch';
import ModuleOrchestra from '../components/settings/ModuleOrchestra';
import ModuleGlobal from '../components/settings/ModuleGlobal';
import ModuleAccess from '../components/settings/ModuleAccess';

const SettingsPage = ({ userEmail, isMaster, userData }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // CAPTURA DO CONTEXTO REGIONAL ATIVO
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;
  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';
  
  const isAdminLocal = userData?.role === 'Encarregado Local' || userData?.role === 'Secretário da Música';
  const temAcessoPortaria = isMaster || isAdminLocal || userData?.escopoRegional || userData?.escopoCidade;

  // Estado centralizado para evitar múltiplas conexões
  const [sharedData, setSharedData] = useState({
    church: {},
    users: [],
    cargos: [],
    ministeriosDropdown: [],
    listaMinisterio: [],
    instruments: [],
    cidades: []
  });

  useEffect(() => {
    if (!activeRegionalId) return;
    const unsubs = [];

    // 1. DADOS DA IGREJA (Puxa a comum do contexto atual)
    unsubs.push(onSnapshot(doc(db, 'config_comum', comumId), (snap) => {
      if (snap.exists()) setSharedData(prev => ({ ...prev, church: snap.data() }));
    }));

    // 2. CARGOS E MINISTÉRIOS BASE (Global)
    unsubs.push(onSnapshot(collection(db, 'config_cargos'), (s) => 
      setSharedData(prev => ({ ...prev, cargos: s.docs.map(d => ({ id: d.id, ...d.data() })) }))
    ));

    unsubs.push(onSnapshot(collection(db, 'config_ministerio'), (s) => 
      setSharedData(prev => ({ ...prev, ministeriosDropdown: s.docs.map(d => ({ id: d.id, ...d.data() })) }))
    ));

    // 3. INSTRUMENTOS DA REGIONAL (Sincroniza com a coleção unificada da Regional)
    const qOrchestra = query(collection(db, 'config_orquestra_regional'), where('regionalId', '==', activeRegionalId));
    unsubs.push(onSnapshot(qOrchestra, (s) => {
      setSharedData(prev => ({ ...prev, instruments: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
    }));

    // 4. CIDADES FILTRADAS PELA REGIONAL (Garante isolamento Jundiaí / Varginha)
    const qCidades = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
    unsubs.push(onSnapshot(qCidades, (s) => {
      setSharedData(prev => ({ ...prev, cidades: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
      setLoading(false);
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [comumId, activeRegionalId]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-slate-400 animate-pulse text-[10px]">SINCRONIZANDO MÓDULOS...</div>;

  return (
    <div className="space-y-4 pb-40 px-4 pt-6 max-w-md mx-auto text-left">
      
      {/* LOCALIDADE */}
      <MenuCard id="church" active={activeMenu} setActive={setActiveMenu} icon={<Home size={18}/>} module="Gestão" title="Localidade">
        <ModuleChurch comumId={comumId} isMaster={isMaster} churchData={sharedData.church} userData={userData} />
      </MenuCard>

      {/* ORQUESTRA */}
      <MenuCard id="orchestra" active={activeMenu} setActive={setActiveMenu} icon={<Music size={18}/>} module="Configuração" title="Orquestra & Instrumentos">
        <ModuleOrchestra 
          comumId={comumId} 
          instrumentsData={sharedData.instruments} 
          userData={userData}
          isMaster={isMaster}
        />
      </MenuCard>

      {/* CARGOS - EXCLUSIVO MASTER */}
      {isMaster && (
        <MenuCard id="global" active={activeMenu} setActive={setActiveMenu} icon={<Plus size={18}/>} module="Administração" title="Cargos & Ministérios">
          <ModuleGlobal cargos={sharedData.cargos} ministerios={sharedData.ministeriosDropdown} />
        </MenuCard>
      )}

      {/* ACESSOS */}
      {temAcessoPortaria && (
        <MenuCard id="users" active={activeMenu} setActive={setActiveMenu} icon={<ShieldCheck size={18}/>} module="Segurança" title="Acesso & Portaria">
          <ModuleAccess 
            comumId={comumId} 
            isMaster={isMaster} 
            userEmail={userEmail} 
            userData={userData} 
            cargos={sharedData.cargos}
            regionalId={activeRegionalId} 
          />
        </MenuCard>
      )}

      <div className="mt-8 flex flex-col items-center gap-1 opacity-20 text-center pb-10">
          <span className="text-[8px] font-[900] text-slate-950 uppercase tracking-[0.3em]">Sistema Regional</span>
          <span className="text-[7px] font-black text-slate-950 uppercase tracking-[0.2em]">Secretaria da Musica - {userData?.activeRegionalName || 'Digital'}</span>
      </div>
    </div>
  );
};

const MenuCard = ({ id, active, setActive, icon, module, title, children }) => {
  const isOpen = active === id;
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in">
      <button onClick={() => setActive(isOpen ? null : id)} className="w-full p-6 flex justify-between items-center outline-none transition-colors active:bg-slate-50">
        <div className="flex items-center gap-4 text-left leading-none">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-slate-950 text-white scale-110 rotate-3 shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{icon}</div>
          <div>
            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-[0.2em] italic opacity-70 leading-none">{module}</p>
            <h3 className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">{title}</h3>
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl shadow-inner"><ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} /></div>
      </button>
      {isOpen && <div className="p-6 pt-2 bg-slate-50/30 border-t border-slate-50 animate-in slide-in-from-top-4 duration-500">{children}</div>}
    </div>
  );
};

export default SettingsPage;