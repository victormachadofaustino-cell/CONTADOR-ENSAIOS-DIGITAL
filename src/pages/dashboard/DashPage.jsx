import React, { useState, useEffect, useMemo } from 'react';
// PRESERVAÇÃO: Importações originais mantidas
import { db, collection, onSnapshot, query, where, collectionGroup } from '../../config/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LabelList
} from 'recharts';
import { 
  Filter, Music, Star, BarChart3, ChevronLeft,
  CheckCircle2, Building2, Users, ShieldCheck, PieChart, ChevronRight, LayoutGrid, MapPin, ChevronDown, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashPage = ({ userData }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topLimit, setTopLimit] = useState(5);

  const [presencaSlide, setPresencaSlide] = useState(0);
  const [equiSlide, setEquiSlide] = useState(0);
  const [hinosSlide, setHinosSlide] = useState(0);
  const [visitaOrigemSlide, setVisitaOrigemSlide] = useState(0);

  const [filterType, setFilterType] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [subFilter, setSubFilter] = useState(new Date().getMonth().toString());

  const [listCityFilter, setListCityFilter] = useState('all');
  const [listMinFilter, setListMinFilter] = useState('all');

  // --- LÓGICA DE JURISDIÇÃO EXPANDIDA ---
  const isMaster = userData?.isMaster;
  const isComissao = userData?.isComissao;
  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;
  
  // AJUSTE DE SEGURANÇA: Identifica se o usuário é estritamente local (GEM/Local)
  const isBasico = userData?.role === 'Músico' || userData?.role === 'Organista';
  const isLocalOnly = !isMaster && !isComissao && (userData?.escopoLocal === true);

  const permitidasIds = useMemo(() => {
    const lista = [userData?.comumId];
    if (userData?.acessosPermitidos) lista.push(...userData.acessosPermitidos);
    return [...new Set(lista.filter(id => id))];
  }, [userData]);

  // Estados de Filtro Geográfico baseados no Contexto (GPS)
  const [selectedCityId, setSelectedCityId] = useState(userData?.activeCityId || userData?.cidadeId || 'all');
  const [activeComumId, setActiveComumId] = useState(userData?.activeComumId || userData?.comumId || 'consolidated');
  
  const [listaCidades, setListaCidades] = useState([]);
  const [listaIgrejas, setListaIgrejas] = useState([]);

  // Sincroniza filtros locais quando o Header mudar o GPS
  useEffect(() => {
    if (userData?.activeCityId) setSelectedCityId(userData.activeCityId);
    if (userData?.activeComumId) setActiveComumId(userData.activeComumId);
  }, [userData?.activeCityId, userData?.activeComumId]);

  // 1. Carregar Cidades e Comuns com Trava de Adjacência Real
  useEffect(() => {
    if (!activeRegionalId) return;

    const qIgr = (isMaster || isComissao)
      ? query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId))
      : query(collection(db, 'comuns'), where('__name__', 'in', permitidasIds.slice(0, 30)));
    
    const unsubIgr = onSnapshot(qIgr, (sIgs) => {
      const igs = sIgs.docs.map(d => ({ id: d.id, nome: d.data().comum, cidadeId: d.data().cidadeId }));
      setListaIgrejas(igs.sort((a, b) => a.nome.localeCompare(b.nome)));

      const qCid = query(collection(db, 'config_cidades'), where('regionalId', '==', activeRegionalId));
      onSnapshot(qCid, (sCids) => {
        const todasCidades = sCids.docs.map(d => ({ id: d.id, nome: d.data().nome }));
        
        if (isMaster || isComissao) {
          setListaCidades(todasCidades.sort((a, b) => a.nome.localeCompare(b.nome)));
        } else {
          const idsCidadesPermitidas = [...new Set(igs.map(i => i.cidadeId))];
          const filtradas = todasCidades.filter(c => idsCidadesPermitidas.includes(c.id));
          setListaCidades(filtradas.sort((a, b) => a.nome.localeCompare(b.nome)));
        }
      });
    });

    return () => unsubIgr();
  }, [activeRegionalId, isMaster, isComissao, permitidasIds]);

  // 2. BUSCA DE EVENTOS (MOTOR HÍBRIDO: Resolve erro de permissão para Local)
  useEffect(() => {
    if (!activeRegionalId) return;
    setLoading(true);

    let qEvents;
    // CORREÇÃO: Se for Local Only (GEM), aponta para a coleção direta da Comum dele.
    // Isso evita o erro de permissão do collectionGroup e não exige índices para usuários locais.
    if ((isLocalOnly || isBasico) && userData?.comumId) {
      qEvents = query(collection(db, 'comuns', userData.comumId, 'events'));
    } else {
      qEvents = query(
        collectionGroup(db, 'events'), 
        where('regionalId', '==', activeRegionalId)
      );
    }

    const unsubEvents = onSnapshot(qEvents, (snap) => {
      let data = snap.docs.map(d => ({ 
        id: d.id, 
        comumId: d.ref.parent.parent?.id, 
        ...d.data() 
      }));

      // Filtros de interface
      if (!isLocalOnly && !isBasico) {
        if (activeComumId !== 'consolidated') {
          data = data.filter(e => e.comumId === activeComumId);
        } else if (selectedCityId !== 'all') {
          const igrejasDaCidade = listaIgrejas.filter(i => i.cidadeId === selectedCityId).map(i => i.id);
          data = data.filter(e => igrejasDaCidade.includes(e.comumId));
        } else if (!isMaster && !isComissao) {
          data = data.filter(e => permitidasIds.includes(e.comumId));
        }
      } else {
        // Trava final de segurança para nível local
        data = data.filter(e => e.comumId === (userData?.activeComumId || userData?.comumId));
      }

      setEvents(data);
      setLoading(false);
    }, (err) => {
      console.error("Erro no motor do Dashboard:", err);
      setLoading(false);
    });

    return () => unsubEvents();
  }, [activeRegionalId, activeComumId, selectedCityId, listaIgrejas, isMaster, isComissao, permitidasIds, isBasico, isLocalOnly, userData?.comumId, userData?.activeComumId]);

  const mesesRef = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const processedData = useMemo(() => {
    const filtered = events.filter(ev => {
      if (!ev.date) return false;
      const [y, m] = ev.date.split('-').map(Number);
      if (filterType === 'all') return true;
      if (y !== parseInt(selectedYear)) return false;
      const mIdx = m - 1;
      if (filterType === 'month') return mIdx === parseInt(subFilter);
      if (filterType === 'semester') return subFilter === '0' ? mIdx < 6 : mIdx >= 6;
      if (filterType === 'quarter') return Math.floor(mIdx / 3) === parseInt(subFilter);
      return true;
    });

    const groups = {};
    const hinosMap = {};
    const cityMap = {};
    const bairroMap = {};
    const minMap = {};
    const nominal = [];
    let tM = 0, tO = 0, tI = 0, tH = 0, tEnc = 0;

    filtered.forEach(ev => {
      const mIdx = parseInt(ev.date.split('-')[1]) - 1;
      const key = mesesRef[mIdx];
      if (!groups[key]) groups[key] = { label: key, monthIdx: mIdx, cordas: 0, cordasV: 0, madeiras: 0, madeirasV: 0, metais: 0, metaisV: 0, teclas: 0, teclasV: 0, organistas: 0, irmandade: 0, h1: 0, h2: 0, hTotal: 0 };
      const g = groups[key];

      Object.entries(ev.counts || {}).forEach(([id, data]) => {
        if (id.startsWith('meta_')) return;
        const tot = Number(data.total) || 0;
        const com = Number(data.comum) || 0;
        const sec = (data.section || "").toUpperCase();
        const vis = Math.max(0, tot - com);

        if (sec === 'ORGANISTAS' || id === 'orgao') { 
          g.organistas += tot; tO += tot; 
        } else if (sec === 'CORAL' || id === 'irmandade') { 
          const soma = (Number(data.irmaos) || 0) + (Number(data.irmas) || 0);
          g.irmandade += soma; tI += soma; 
        } else {
          tM += tot;
          if (sec === 'CORDAS') { g.cordas += com; g.cordasV += vis; }
          else if (sec.includes('MADEIRA') || sec.includes('SAX')) { g.madeiras += com; g.madeirasV += vis; }
          else if (sec.includes('METAI')) { g.metais += com; g.metaisV += vis; }
          else if (sec === 'TECLAS' || id === 'acordeon') { g.teclas += com; g.teclasV += vis; }
        }
      });

      ev.ata?.partes?.forEach((p, idx) => {
        p.hinos?.forEach(h => {
          if (h && h.trim() !== "") {
            const hNum = h.trim();
            hinosMap[hNum] = (hinosMap[hNum] || 0) + 1;
            tH++; g.hTotal++;
            if (idx === 0) g.h1++; else if (idx === 1) g.h2++;
          }
        });
      });

      ev.ata?.visitantes?.forEach(v => {
        const cargo = (v.min || "Músico").toUpperCase();
        minMap[cargo] = (minMap[cargo] || 0) + 1;
        cityMap[(v.cidadeUf || "N/I").toUpperCase()] = (cityMap[(v.cidadeUf || "N/I").toUpperCase()] || 0) + 1;
        bairroMap[(v.bairro || "N/I").toUpperCase()] = (bairroMap[(v.bairro || "N/I").toUpperCase()] || 0) + 1;
        if (cargo.includes('REGIONAL') || cargo.includes('LOCAL')) tEnc++;
        nominal.push({ ...v, eventDate: ev.date });
      });
      ev.ata?.presencaLocalFull?.forEach(p => { if((p.role||"").toUpperCase().includes('ENCARREGADO')) tEnc++; });
    });

    const chartArray = Object.values(groups).sort((a, b) => a.monthIdx - b.monthIdx).map(g => ({
      ...g,
      totalOrq: g.cordas + g.cordasV + g.madeiras + g.madeirasV + g.metais + g.metaisV + g.teclas + g.teclasV + g.organistas
    }));

    return {
      chartArray, tM, tO, tI, tH, tEnc, totalMeses: chartArray.length || 1,
      topHinos: Object.entries(hinosMap).map(([num, count]) => ({ num, count })).sort((a, b) => b.count - a.count),
      origemVisitas: {
        cargos: Object.entries(minMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        cidades: Object.entries(cityMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        bairros: Object.entries(bairroMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
      },
      nominalFinal: nominal.sort((a,b) => b.eventDate.localeCompare(a.eventDate)),
      filterOptions: { cities: [...new Set(nominal.map(v => (v.cidadeUf||"").toUpperCase()))].sort(), mins: [...new Set(nominal.map(v => (v.min||"").toUpperCase()))].sort() }
    };
  }, [events, filterType, selectedYear, subFilter]);

  const { chartArray, tM, tO, tI, tH, tEnc, totalMeses, topHinos, nominalFinal, filterOptions, origemVisitas } = processedData;

  const handlePrev = (curr, set, max) => set(curr === 0 ? max - 1 : curr - 1);
  const handleNext = (curr, set, max) => set((curr + 1) % max);

  if (loading && events.length === 0) return <div className="h-screen flex items-center justify-center font-black text-slate-400 animate-pulse uppercase text-[10px]">Sincronizando Dash...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans pb-32 overflow-x-hidden text-left">
      
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md p-4 border-b border-slate-100 shadow-sm space-y-3 rounded-b-[2.2rem]">
        <div className="flex items-center gap-2 px-1">
          <div className={`flex-[1_1_0px] flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 shadow-sm transition-all overflow-hidden ${(isLocalOnly || isBasico) ? 'opacity-50 pointer-events-none' : (listaCidades.length <= 1 && !isMaster) ? 'opacity-50 pointer-events-none' : ''}`}>
            <MapPin size={10} className="text-blue-600 shrink-0" />
            <select 
              disabled={isLocalOnly || isBasico}
              value={isLocalOnly || isBasico ? userData?.cidadeId : selectedCityId} 
              onChange={(e) => { setSelectedCityId(e.target.value); setActiveComumId('consolidated'); }} 
              className="bg-transparent text-slate-950 font-[900] text-[8px] uppercase outline-none w-full truncate italic appearance-none cursor-pointer"
            >
              {/* HIDRATAÇÃO: Força o nome da cidade do usuário básico/local se estiver travado */}
              {isLocalOnly || isBasico ? (
                <option value={userData?.cidadeId}>{userData?.cidadeNome || "SUA CIDADE"}</option>
              ) : (
                <>
                  <option value="all">Todas as Cidades</option>
                  {listaCidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </>
              )}
            </select>
          </div>

          <div className={`flex-[1_1_0px] flex items-center gap-2 bg-slate-950 p-2 rounded-2xl shadow-xl border border-white/10 overflow-hidden ${(isLocalOnly || isBasico) ? 'opacity-80 pointer-events-none' : ''}`}>
            <Building2 size={10} className="text-blue-400 shrink-0" />
            <select 
              disabled={isLocalOnly || isBasico}
              value={isLocalOnly || isBasico ? userData?.comumId : activeComumId} 
              onChange={(e) => setActiveComumId(e.target.value)} 
              className="bg-transparent text-white font-[900] text-[8px] uppercase outline-none w-full truncate italic appearance-none cursor-pointer"
            >
              {isLocalOnly || isBasico ? (
                <option value={userData?.comumId} className="text-slate-900 bg-white">{userData?.comum || "SUA LOCALIDADE"}</option>
              ) : (
                <>
                  <option value="consolidated" className="text-slate-900 bg-white">
                    {selectedCityId === 'all' ? 'Resumo Regional' : 'Consolidado'}
                  </option>
                  {listaIgrejas.filter(i => selectedCityId === 'all' || i.cidadeId === selectedCityId).map(ig => (
                    <option key={ig.id} value={ig.id} className="text-slate-900 bg-white">{ig.nome}</option>
                  ))}
                </>
              )}
            </select>
            {!isLocalOnly && !isBasico && <ChevronDown size={10} className="text-white/20 shrink-0" />}
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <div className="flex-1">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-blue-600 text-white font-black text-[9px] uppercase px-4 py-2.5 rounded-2xl outline-none italic shadow-md appearance-none cursor-pointer">
                <option value="year">Anual</option>
                <option value="semester">Semestral</option>
                <option value="quarter">Trimestral</option>
                <option value="month">Mensal</option>
                <option value="all">Total</option>
            </select>
          </div>
          {filterType !== 'all' && (
            <div className="w-24 flex items-center bg-white/50 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-200">
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-transparent font-black text-[9px] text-slate-950 outline-none appearance-none cursor-pointer text-center">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>

        {filterType !== 'all' && filterType !== 'year' && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="px-1">
            <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="w-full bg-white border border-slate-100 p-2.5 rounded-2xl font-black text-[9px] uppercase italic text-blue-600 outline-none shadow-sm appearance-none cursor-pointer text-center">
                {filterType === 'semester' && <><option value="0">1º Semestre</option><option value="1">2º Semestre</option></>}
                {filterType === 'quarter' && <><option value="0">1º Trimestre</option><option value="1">2º Trimestre</option><option value="2">3º Trimestre</option><option value="3">4º Trimestre</option></>}
                {filterType === 'month' && mesesRef.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </motion.div>
        )}
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full">
        <div className="space-y-3">
          <BigNumberGroup label="Músicos" total={tM} avg={(tM/totalMeses).toFixed(1)} icon={<Music size={14}/>} color="blue" />
          <BigNumberGroup label="Organistas" total={tO} avg={(tO/totalMeses).toFixed(1)} icon={<PieChart size={14}/>} color="violet" />
          <BigNumberGroup label="Irmandade" total={tI} avg={(tI/totalMeses).toFixed(1)} icon={<Users size={14}/>} color="emerald" />
          <BigNumberGroup label="Encarregados" total={tEnc} avg={(tEnc/totalMeses).toFixed(1)} icon={<ShieldCheck size={14}/>} color="indigo" />
          <BigNumberGroup label="Hinos" total={tH} avg={(tH/totalMeses).toFixed(1)} icon={<CheckCircle2 size={14}/>} color="amber" />
        </div>

        <CarouselBox title={presencaSlide === 0 ? "Frequência Total" : "Equilíbrio Orquestral (Qtd)"} onPrev={() => handlePrev(presencaSlide, setPresencaSlide, 2)} onNext={() => handleNext(presencaSlide, setPresencaSlide, 2)}>
            <BarChart data={chartArray}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', fontWeight: 900, fontSize: 10}} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: 8, fontWeight: 900, paddingTop: 10}} />
              {presencaSlide === 0 ? (
                <><Bar name="Orquestra" dataKey="totalOrq" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} /><Bar name="Irmandade" dataKey="irmandade" stackId="a" fill="#0f172a" radius={[4,4,0,0]} /></>
              ) : (
                <><Bar name="Cordas" dataKey="cordas" stackId="b" fill="#fbbf24" /><Bar name="Madeiras/Sax" dataKey="madeiras" stackId="b" fill="#10b981" /><Bar name="Metais" dataKey="metais" stackId="b" fill="#ef4444" /><Bar name="Teclas" dataKey="teclas" stackId="b" fill="#64748b" /><Bar name="Órgão" dataKey="organistas" stackId="b" fill="#8b5cf6" radius={[4,4,0,0]} /></>
              )}
            </BarChart>
        </CarouselBox>

        <CarouselBox title={equiSlide === 0 ? "Soberania: Cordas" : equiSlide === 1 ? "Soberania: Madeiras" : "Soberania: Metais"} onPrev={() => handlePrev(equiSlide, setEquiSlide, 3)} onNext={() => handleNext(equiSlide, setEquiSlide, 3)}>
            <BarChart data={chartArray}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 8}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              {equiSlide === 0 && <><Bar name="Local" dataKey="cordas" stackId="s" fill="#fbbf24" /><Bar name="Visita" dataKey="cordasV" stackId="s" fill="#e2e8f0" radius={[3,3,0,0]} /></>}
              {equiSlide === 1 && <><Bar name="Local" dataKey="madeiras" stackId="s" fill="#10b981" /><Bar name="Visita" dataKey="madeirasV" stackId="s" fill="#e2e8f0" radius={[3,3,0,0]} /></>}
              {equiSlide === 2 && <><Bar name="Local" dataKey="metais" stackId="s" fill="#ef4444" /><Bar name="Visita" dataKey="metaisV" stackId="s" fill="#e2e8f0" radius={[3,3,0,0]} /></>}
            </BarChart>
        </CarouselBox>

        <CarouselBox title={hinosSlide === 0 ? "Musicalidade: Qtd Hinos" : "Hinos Empilhados por Parte"} onPrev={() => handlePrev(hinosSlide, setHinosSlide, 2)} onNext={() => handleNext(hinosSlide, setHinosSlide, 2)}>
            <BarChart data={chartArray}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: 8, fontWeight: 900}} />
              {hinosSlide === 0 ? (
                <Bar name="Total Hinos" dataKey="hTotal" fill="#6366f1" radius={[4,4,0,0]} />
              ) : (
                <><Bar name="1ª Parte" dataKey="h1" stackId="h" fill="#3b82f6" /><Bar name="2ª Parte" dataKey="h2" stackId="h" fill="#fbbf24" radius={[4,4,0,0]} /></>
              )}
            </BarChart>
        </CarouselBox>

        <section className="bg-slate-950 p-6 rounded-[2.5rem] shadow-xl text-white">
          <div className="flex justify-between items-center mb-6">
              <div className="text-left"><p className="text-[7px] font-black text-amber-500 uppercase tracking-widest italic leading-none">Ranking Musical</p><h3 className="text-lg font-black uppercase italic leading-none">Hinos mais Chamados</h3></div>
              <div className="flex gap-1">{[3, 5, 10, 15].map(n => <button key={n} onClick={() => setTopLimit(n)} className={`px-2 py-1 rounded-lg text-[8px] font-black ${topLimit === n ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white/40'}`}>{n}</button>)}</div>
          </div>
          <div style={{ height: topLimit * 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topHinos.slice(0, topLimit)} margin={{ left: -25, right: 45 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="num" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontStyle: 'italic', fontWeight: '900', fill: '#fff' }} width={45} />
                <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16}>
                   {topHinos.map((entry, index) => <Cell key={`c-${index}`} fillOpacity={1 - (index * 0.05)} />)}
                   <LabelList dataKey="count" position="right" fill="#F59E0B" style={{fontSize: 10, fontWeight: 900}} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <CarouselBox title={visitaOrigemSlide === 0 ? "Cargos Visitantes" : visitaOrigemSlide === 1 ? "Bairros Visitantes" : "Cidades Visitantes"} onPrev={() => handlePrev(visitaOrigemSlide, setVisitaOrigemSlide, 3)} onNext={() => handleNext(visitaOrigemSlide, setVisitaOrigemSlide, 3)} dark>
            <BarChart layout="vertical" data={visitaOrigemSlide === 0 ? origemVisitas.cargos.slice(0,6) : visitaOrigemSlide === 1 ? origemVisitas.bairros.slice(0,6) : origemVisitas.cidades.slice(0,6)} margin={{left: -20, right: 30}}>
              <XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: '900', fill: '#64748b' }} width={70} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12}><LabelList dataKey="value" position="right" style={{fontSize: 8, fontWeight: 900}} /></Bar>
            </BarChart>
        </CarouselBox>

        <section className="space-y-4 pb-20">
            <h3 className="text-[11px] font-black text-slate-950 uppercase italic tracking-widest px-2 leading-none">Detalhamento de Visitas</h3>
            <div className="flex gap-2">
                <select value={listMinFilter} onChange={e => setListMinFilter(e.target.value)} className="flex-1 bg-white border border-slate-100 p-3 rounded-2xl text-[9px] font-black uppercase text-slate-900 outline-none shadow-sm appearance-none cursor-pointer"><option value="all">Ministério</option>{filterOptions.mins.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select value={listCityFilter} onChange={e => setListCityFilter(e.target.value)} className="flex-1 bg-white border border-slate-100 p-3 rounded-2xl text-[9px] font-black uppercase text-slate-900 outline-none shadow-sm appearance-none cursor-pointer"><option value="all">Cidade</option>{filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="space-y-2">
                {nominalFinal.filter(v => (listCityFilter === 'all' || v.cidadeUf?.toUpperCase() === listCityFilter) && (listMinFilter === 'all' || v.min?.toUpperCase() === listMinFilter)).slice(0, 20).map((v, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center active:scale-95 transition-all">
                        <div className="text-left leading-tight">
                            <p className="text-[11px] font-black text-slate-950 uppercase italic mb-1">{v.nome}</p>
                            <p className="text-[8px] font-bold text-blue-600 uppercase mb-1">{v.min || 'Músico'}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase">{v.bairro || 'Comum'} - {v.cidadeUf || 'UF'}</p>
                            <p className="text-[6px] font-black text-slate-300 uppercase italic mt-1">Ens. Origem: {v.dataEnsaio || "---"}</p>
                        </div>
                        <div className="p-1.5 bg-slate-50 rounded-lg text-[7px] font-black text-slate-400 border border-slate-100 h-fit self-start">{v.eventDate.split('-').reverse().join('/')}</div>
                    </div>
                ))}
            </div>
        </section>
      </div>
    </div>
  );
};

const BigNumberGroup = ({ label, total, avg, icon, color }) => (
  <div className="flex gap-2 w-full">
    <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-1 opacity-40">
        <span className={color === 'blue' ? 'text-blue-600' : color === 'violet' ? 'text-violet-600' : color === 'emerald' ? 'text-emerald-600' : color === 'indigo' ? 'text-indigo-600' : 'text-amber-600'}>
          {icon}
        </span>
        <p className="text-[7px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-950 italic leading-none">{total}</p>
      <p className="text-[6px] font-bold text-slate-300 uppercase italic mt-1">Acumulado</p>
    </div>
    <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col justify-center border-l-4" style={{borderColor: color === 'blue' ? '#3b82f6' : color === 'violet' ? '#8b5cf6' : color === 'emerald' ? '#10b981' : color === 'indigo' ? '#6366f1' : '#f59e0b'}}>
      <p className="text-2xl font-black text-slate-950 italic leading-none">{avg}</p>
      <p className="text-[6px] font-bold text-slate-400 uppercase italic mt-1">Média / Mês</p>
    </div>
  </div>
);

const CarouselBox = ({ title, children, onPrev, onNext, dark }) => (
  <motion.section 
    drag="x" dragConstraints={{ left: 0, right: 0 }} 
    onDragEnd={(e, { offset }) => offset.x < -50 ? onNext() : offset.x > 50 ? onPrev() : null} 
    className={`p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden w-full h-[320px] ${dark ? 'bg-slate-50' : 'bg-white'}`}
  >
    <div className="flex justify-between items-center mb-6 px-1">
        <button onClick={onPrev} className="p-1.5 bg-slate-50 rounded-lg text-slate-300 active:text-blue-600 transition-colors"><ChevronLeft size={14} /></button>
        <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-widest leading-none">{title}</h3>
        <button onClick={onNext} className="p-1.5 bg-slate-50 rounded-lg text-slate-300 active:text-blue-600 transition-colors"><ChevronRight size={14} /></button>
    </div>
    <div className="h-56 w-full">
      {/* PRESERVAÇÃO: Renderização segura para evitar erro de container sem dimensão */}
      <ResponsiveContainer width="99%" height="99%">
        {children}
      </ResponsiveContainer>
    </div>
  </motion.section>
);

export default DashPage;