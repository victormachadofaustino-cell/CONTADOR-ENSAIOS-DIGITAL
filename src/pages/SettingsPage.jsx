import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, query, where } from '../firebase';
import { Home, Music, Users, ShieldCheck, Plus, ChevronDown } from 'lucide-react';
import { scriptSaneamento } from '../tools/migracao_pro';

// Importação dos Módulos
import ModuleChurch from '../components/settings/ModuleChurch';
import ModuleOrchestra from '../components/settings/ModuleOrchestra';
import ModuleGlobal from '../components/settings/ModuleGlobal';
import ModuleAccess from '../components/settings/ModuleAccess';

const SettingsPage = ({ userEmail, isMaster, userData }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // CAPTURA DO CONTEXTO (Garantindo que nunca sejam undefined para o Firebase)
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId || null;
  const comumId = userData?.comumId || localStorage.getItem('activeComumId');
  
  const isAdminLocal = userData?.role === 'Encarregado Local' || userData?.role === 'Secretário da Música';
  const temAcessoPortaria = isMaster || isAdminLocal || userData?.escopoRegional || userData?.escopoCidade;

  const [sharedData, setSharedData] = useState({
    church: {},
    users: [],
    cargos: [],
    ministeriosDropdown: [],
    instruments: [],
    cidades: []
  });

  useEffect(() => {
    // SÓ INICIA SE TIVER OS IDS BÁSICOS
    if (!activeRegionalId || !comumId) {
      console.warn("SettingsPage: Aguardando IDs de contexto...", { activeRegionalId, comumId });
      return;
    }

    const unsubs = [];

    try {
      // 1. DADOS DA IGREJA
      unsubs.push(onSnapshot(doc(db, 'config_comum', comumId), (snap) => {
        if (snap.exists()) setSharedData(prev => ({ ...prev, church: snap.data() }));
      }, (err) => console.error("Erro Church:", err)));

      // 2. CARGOS E MINISTÉRIOS BASE
      unsubs.push(onSnapshot(collection(db, 'config_cargos'), (s) => 
        setSharedData(prev => ({ ...prev, cargos: s.docs.map(d => ({ id: d.id, ...d.data() })) }))
      ));

      unsubs.push(onSnapshot(collection(db, 'config_ministerio'), (s) => 
        setSharedData(prev => ({ ...prev, ministeriosDropdown: s.docs.map(d => ({ id: d.id, ...d.data() })) }))
      ));

      // 3. INSTRUMENTOS DA REGIONAL (Filtro por Regional)
      const qOrchestra = query(collection(db, 'config_orquestra_regional'), where('regionalId', '==', activeRegionalId));
      unsubs.push(onSnapshot(qOrchestra, (s) => {
        setSharedData(prev => ({ ...prev, instruments: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }));

      // 4. CIDADES FILTRADAS
      const qCidades = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
      unsubs.push(onSnapshot(qCidades, (s) => {
        setSharedData(prev => ({ ...prev, cidades: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
        setLoading(false); // Só desativa o loading quando as cidades (último item) carregarem
      }));

    } catch (error) {
      console.error("Erro ao assinar coleções:", error);
      setLoading(false);
    }

    // LIMPEZA DE MEMÓRIA (Crucial para não travar o app)
    return () => unsubs.forEach(unsub => unsub());
  }, [comumId, activeRegionalId]);

  const handleRodarSaneamento = async () => {
    if (confirm("Deseja iniciar o saneamento do banco de dados para a Regional Jundiaí?")) {
      await scriptSaneamento.executar(activeRegionalId);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="font-black italic text-slate-400 text-[10px] uppercase tracking-widest">Sincronizando Módulos...</div>
    </div>
  );

  return (
    <div className="space-y-4 pb-40 px-4 pt-6 max-w-md mx-auto text-left animate-in fade-in duration-500">
      
      <MenuCard id="church" active={activeMenu} setActive={setActiveMenu} icon={<Home size={18}/>} module="Gestão" title="Localidade">
        <ModuleChurch comumId={comumId} isMaster={isMaster} churchData={sharedData.church} userData={userData} />
      </MenuCard>

      <MenuCard id="orchestra" active={activeMenu} setActive={setActiveMenu} icon={<Music size={18}/>} module="Configuração" title="Orquestra & Instrumentos">
        <ModuleOrchestra 
          comumId={comumId} 
          instrumentsData={sharedData.instruments} 
          userData={userData}
          isMaster={isMaster}
        />
      </MenuCard>

      {isMaster && (
        <MenuCard id="global" active={activeMenu} setActive={setActiveMenu} icon={<Plus size={18}/>} module="Administração" title="Cargos & Ministérios">
          <ModuleGlobal cargos={sharedData.cargos} ministerios={sharedData.ministeriosDropdown} />
        </MenuCard>
      )}

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

      {isMaster && (
        <div className="mt-10 p-6 bg-red-50 rounded-[2.5rem] border border-red-100">
          <p className="text-[10px] font-black text-red-600 uppercase italic mb-4 text-center">Ferramentas de Manutenção Root</p>
          <button 
            onClick={handleRodarSaneamento} 
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Executar Migração Pro
          </button>
        </div>
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
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-3">
      <button onClick={() => setActive(isOpen ? null : id)} className="w-full p-6 flex justify-between items-center outline-none transition-colors active:bg-slate-50">
        <div className="flex items-center gap-4 text-left leading-none">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-slate-950 text-white scale-110 rotate-3 shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{icon}</div>
          <div>
            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-[0.2em] italic opacity-70 leading-none">{module}</p>
            <h3 className="text-[13px] font-[900] text-slate-950 uppercase italic tracking-tighter leading-none">{title}</h3>
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl shadow-inner">
          <ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {/* ANIMAÇÃO DE ABERTURA */}
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-6 pt-2 bg-slate-50/30 border-t border-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;