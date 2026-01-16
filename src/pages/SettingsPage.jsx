import React, { useState, useEffect } from 'react';
// CORREÇÃO: Caminho do Firebase subindo um nível
import { db, collection, onSnapshot, doc, query, where } from '../config/firebase';
import { Home, Music, Users, ShieldCheck, Plus, ChevronDown } from 'lucide-react';

// Importação dos Módulos (Caminhos ajustados para a subpasta settings)
import ModuleChurch from './settings/ModuleChurch';
import ModuleOrchestra from './settings/ModuleOrchestra';
import ModuleGlobal from './settings/ModuleGlobal';
import ModuleAccess from './settings/ModuleAccess';

const SettingsPage = ({ userEmail, isMaster, userData }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // CAPTURA DO CONTEXTO COM TRAVA DE ESCOPO LOCAL
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId || null;
  
  // REGRA DE OURO: Se for Master/Regional, permite comumId dinâmico do localStorage
  const isRegional = isMaster || userData?.escopoRegional || userData?.isComissao || userData?.role === 'Encarregado Regional';
  const comumId = isRegional ? (localStorage.getItem('activeComumId') || userData?.comumId) : userData?.comumId;
  
  const isAdminLocal = userData?.role === 'Encarregado Local' || userData?.role === 'Secretário da Música' || userData?.role === 'Secretario da Música';
  const temAcessoPortaria = isMaster || isAdminLocal || userData?.escopoRegional || userData?.escopoCidade || userData?.role === 'Encarregado Regional';

  const [sharedData, setSharedData] = useState({
    church: {},
    users: [],
    cargos: [],
    ministeriosDropdown: [],
    instruments: [],
    cidades: []
  });

  useEffect(() => {
    if (!activeRegionalId) return;
    let isMounted = true;
    const unsubs = [];

    try {
      // 1. DADOS DA IGREJA (Só carrega se houver comumId definido)
      if (comumId) {
        unsubs.push(onSnapshot(doc(db, 'comuns', comumId), (snap) => {
          if (snap.exists() && isMounted) setSharedData(prev => ({ ...prev, church: { id: snap.id, ...snap.data() } }));
        }, (err) => console.error("Erro Church:", err)));

        // INSTRUMENTOS DA COMUM
        const instRef = collection(db, 'comuns', comumId, 'instrumentos_config');
        unsubs.push(onSnapshot(instRef, (s) => {
          if (!isMounted) return;
          setSharedData(prev => ({ ...prev, instruments: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
        }));
      }

      // 2. CARGOS UNIFICADOS (referencia_cargos)
      unsubs.push(onSnapshot(collection(db, 'referencia_cargos'), (s) => {
        if (!isMounted) return;
        const cargosData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setSharedData(prev => ({ 
          ...prev, 
          cargos: cargosData.filter(c => c.tipo === 'cargo'),
          ministeriosDropdown: cargosData.filter(c => c.tipo === 'ministerio')
        }));
      }));

      // 3. CIDADES FILTRADAS (Define o fim do loading para Regionais)
      const qCidades = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
      unsubs.push(onSnapshot(qCidades, (s) => {
        if (!isMounted) return;
        setSharedData(prev => ({ ...prev, cidades: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
        setLoading(false); 
      }));

    } catch (error) {
      console.error("Erro ao assinar coleções:", error);
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubs.forEach(unsub => { if(unsub) unsub(); });
    };
  }, [comumId, activeRegionalId]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="font-black italic text-slate-400 text-[10px] uppercase tracking-widest">Acessando Nível Regional...</div>
    </div>
  );

  return (
    <div className="space-y-4 pb-40 px-4 pt-6 max-w-md mx-auto text-left animate-in fade-in duration-500">
      
      {/* Aviso de Seleção para Regionais */}
      {isRegional && !comumId && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl mb-2">
          <p className="text-[9px] font-black text-blue-600 uppercase italic leading-tight">
            Selecione uma Localidade no módulo abaixo para gerenciar instrumentos e acessos específicos.
          </p>
        </div>
      )}

      {/* Módulo Localidade - Liberado para navegar entre Cidades e Comuns */}
      <MenuCard id="church" active={activeMenu} setActive={setActiveMenu} icon={<Home size={18}/>} module="Gestão" title={isRegional ? "Cidades e Comuns" : "Localidade"}>
        <ModuleChurch isMaster={isMaster} userData={userData} />
      </MenuCard>

      {/* Módulo Orquestra - Contextualizado por Comum */}
      <MenuCard id="orchestra" active={activeMenu} setActive={setActiveMenu} icon={<Music size={18}/>} module="Configuração" title="Orquestra & Instrumentos">
        {comumId ? (
          <ModuleOrchestra 
            comumId={comumId} 
            instrumentsData={sharedData.instruments} 
            userData={userData}
            isMaster={isMaster}
          />
        ) : (
          <div className="py-6 text-center opacity-30 text-[8px] font-black uppercase tracking-widest">Aguardando seleção de comum...</div>
        )}
      </MenuCard>

      {/* Módulo Global - Visível para Master e Regional */}
      {(isMaster || userData?.escopoRegional || userData?.role === 'Encarregado Regional') && (
        <MenuCard id="global" active={activeMenu} setActive={setActiveMenu} icon={<Plus size={18}/>} module="Administração" title="Cargos & Ministérios">
          <ModuleGlobal cargos={sharedData.cargos} ministerios={sharedData.ministeriosDropdown} />
        </MenuCard>
      )}

      {/* Módulo Segurança/Acessos - Agora com suporte a agrupamento por comum e visão da cidade */}
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
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-6 pt-2 bg-slate-50/30 border-t border-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;