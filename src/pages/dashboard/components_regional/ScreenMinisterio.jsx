import React, { useMemo, useState } from 'react'; // [Funcionamento]: Traz ferramentas núcleo do React para cache e estados de colapso das abas.
import { Landmark, ShieldCheck, Star, ChevronDown, ChevronUp } from 'lucide-react'; // [Funcionamento]: Ícones de navegação e distintivos litúrgicos.

const ScreenMinisterio = ({ stats, ataData }) => { // [Funcionamento]: Recebe a árvore unificada e as listas nominais cruas da ata regional.

  // v6.7: Ordem de precedência e correspondência de strings normalizadas para triagem litúrgica
  const ORDEM_MINISTERIAL = [
    { label: 'Anciães', cargos: ['ancião', 'anciao'] },
    { label: 'Diáconos', cargos: ['diácono', 'diacono'] },
    { label: 'Coop. Ofício', cargos: ['cooperador do ofício', 'cooperador do oficio', 'coop. oficio'] },
    { label: 'Coop. Jovens', cargos: ['cooperador rjm', 'cooperador de jovens e menores', 'coop. jovens'] },
    { label: 'Enc. Regionais', cargos: ['encarregado regional', 'enc. regional'] },
    { label: 'Enc. Locais', cargos: ['encarregado local', 'enc. local'] },
    { label: 'Examinadoras', cargos: ['examinadora'] }
  ];

  // v6.7: Estado local que rastreia quais blocos de cargos foram minimizados pelo usuário
  const [collapsedSections, setCollapsedScreen] = useState({});

  // Alternador dinâmico de visibilidade das seções
  const toggleSection = (key) => {
    setCollapsedScreen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // [Funcionamento]: Função auxiliar para renderizar o distintivo/Badge correto baseado no cargo musical ou altar
  const getCargoIcon = (cargo) => {
    const LowerCargo = (cargo || '').toLowerCase();
    if (LowerCargo.includes('regional')) return <ShieldCheck size={14} className="text-amber-500" />;
    if (LowerCargo.includes('examinadora')) return <Star size={14} className="text-purple-500" />;
    if (LowerCargo.includes('local')) return <ShieldCheck size={14} className="text-blue-500" />;
    return <Landmark size={14} className="text-slate-600" />;
  };

  // 🧱 LOGICA DE TRIAGEM GERAL: Divide e classifica as pessoas por cargo e tipo (Casa vs Visita)
  const ministerioAgrupado = useMemo(() => {
    const localRaw = Array.isArray(ataData?.presencaLocalFull) ? ataData.presencaLocalFull : [];
    const visitaRaw = Array.isArray(ataData?.visitantes) ? ataData.visitantes : [];

    // Função que varre a lista e monta as gavetas ordenadas por cargo
    const agruparPorOrdem = (lista) => {
      return ORDEM_MINISTERIAL.map(grupo => {
        const pessoasFiltradas = lista.filter(p => {
          const pCargo = (p.min || p.role || '').toLowerCase().trim();
          return grupo.cargos.some(c => pCargo === c || pCargo.includes(c));
        });
        return {
          label: grupo.label,
          pessoas: pessoasFiltradas
        };
      }).filter(g => g.pessoas.length > 0); // Oculta dinamicamente categorias vazias para poupar espaço
    };

    return {
      casa: agruparPorOrdem(localRaw),
      visita: agruparPorOrdem(visitaRaw),
      totalCasa: localRaw.filter(p => p.nome && p.nome.trim() !== '').length,
      totalVisita: visitaRaw.filter(p => p.nome && p.nome.trim() !== '').length
    };
  }, [ataData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left font-sans pb-12">
      
      {/* 🏠 BLOCÃO 1: MINISTÉRIO DA REGIÃO (CASA) */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-1 italic">
          Ministério e Liderança Local ({ministerioAgrupado.totalCasa})
        </h2>

        {ministerioAgrupado.casa.length === 0 ? (
          <div className="text-center p-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider shadow-xs">
            Nenhum registro nominal local lançado.
          </div>
        ) : (
          <div className="space-y-2.5">
            {ministerioAgrupado.casa.map((grupo) => {
              const sectionKey = `casa_${grupo.label}`;
              const isCollapsed = collapsedSections[sectionKey];

              return (
                <div key={sectionKey} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
                  {/* Barra de Título do Acordeão Sutil */}
                  <button 
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 cursor-pointer outline-none active:bg-slate-100/50 transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {grupo.label} ({grupo.pessoas.length})
                    </span>
                    {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                  </button>

                  {/* Lista expandível de pessoas */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-1 bg-white animate-in slide-in-from-top-1 duration-150">
                      {grupo.pessoas.map((irmão, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/30 border border-slate-100/30 min-h-[44px]">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {getCargoIcon(irmão.min || irmão.role)}
                            <p className="text-xs font-black text-slate-900 uppercase truncate pr-2">
                              {irmão.nome}
                            </p>
                          </div>
                          <span className="bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider border border-blue-100/30 shrink-0 select-none">
                            Casa
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌍 BLOCÃO 2: MINISTÉRIO VISITANTE (OUTRAS LOCALIDADES) */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-1 italic">
          Ministério e Liderança Visitante ({ministerioAgrupado.totalVisita})
        </h2>

        {ministerioAgrupado.visita.length === 0 ? (
          <div className="text-center p-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider shadow-xs">
            Nenhum ministério visitante registrado.
          </div>
        ) : (
          <div className="space-y-2.5">
            {ministerioAgrupado.visita.map((grupo) => {
              const sectionKey = `visita_${grupo.label}`;
              const isCollapsed = collapsedSections[sectionKey];

              return (
                <div key={sectionKey} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
                  {/* Barra de Título do Acordeão Sutil */}
                  <button 
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 cursor-pointer outline-none active:bg-slate-100/50 transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {grupo.label} ({grupo.pessoas.length})
                    </span>
                    {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                  </button>

                  {/* Lista expandível de pessoas */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-1 bg-white animate-in slide-in-from-top-1 duration-150">
                      {grupo.pessoas.map((irmão, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/30 border border-slate-100/30 min-h-[44px]">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {getCargoIcon(irmão.min || irmão.role)}
                            <div className="min-w-0 flex-1 leading-none">
                              <p className="text-xs font-black text-slate-900 uppercase truncate">
                                {irmão.nome}
                              </p>
                              <p className="text-[9px] font-bold text-amber-600 uppercase truncate mt-1 tracking-tight break-all">
                                {irmão.cidadeUf || irmão.bairro || irmão.comum || 'Outra Comum'}
                              </p>
                            </div>
                          </div>
                          <span className="bg-amber-50 text-amber-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider border border-amber-100/30 shrink-0 select-none">
                            Visita
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default ScreenMinisterio;