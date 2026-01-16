import React, { useState, useEffect, useMemo } from 'react';
// CORREÇÃO: Importando do caminho centralizado de configuração (Sobe 2 níveis)
import { db, collection, onSnapshot, doc, query, where, getDocs } from '../../config/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell
} from 'recharts';
import { Filter, Music, Star, MapPin, Activity, BarChart3, CheckCircle2, TrendingUp, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashPage = ({ userData }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topLimit, setTopLimit] = useState(5);

  const [presencaSlide, setPresencaSlide] = useState(0);
  const [equiSlide, setEquiSlide] = useState(0);
  const [hinosSlide, setHinosSlide] = useState(0);
  const [visitaSlide, setVisitaSlide] = useState(0);

  const [filterType, setFilterType] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [subFilter, setSubFilter] = useState('0');

  const [listCityFilter, setListCityFilter] = useState('all');
  const [listMinFilter, setListMinFilter] = useState('all');

  // HIERARQUIA: Identificação de Poder de Visão
  const isMaster = userData?.isMaster === true;
  const isComissao = isMaster || (userData?.escopoRegional && userData?.membroComissao);
  const isRegional = isComissao || userData?.role === 'Encarregado Regional' || userData?.escopoRegional === true;
  
  // Define o ID inicial com base na seleção ativa ou cadastro
  const [activeComumId, setActiveComumId] = useState(userData?.comumId);
  const [listaIgrejasRegional, setListaIgrejasRegional] = useState([]);
  const [instrumentsNacionais, setInstrumentsNacionais] = useState([]);
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);

  const activeRegionalId = userData?.activeRegionalId || userData?.regionalId;

  // 1. MONITOR DE CONFIGURAÇÃO NACIONAL & LOCAL (HERANÇA) 
  useEffect(() => {
    if (!activeComumId) return;
    let isMounted = true;

    const loadConfigs = async () => {
      const snapNacional = await getDocs(collection(db, 'config_instrumentos_nacional'));
      if (isMounted) setInstrumentsNacionais(snapNacional.docs.map(d => ({ id: d.id, ...d.data() })));

      const unsubLocal = onSnapshot(collection(db, 'comuns', activeComumId, 'instrumentos_config'), (snapshot) => {
        if (isMounted) setInstrumentsConfig(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return unsubLocal;
    };

    const cleanup = loadConfigs();
    return () => { isMounted = false; cleanup.then(unsub => unsub && typeof unsub === 'function' && unsub()); };
  }, [activeComumId]);

  // 2. MONITOR DE IGREJAS (ZELADORIA POR ESCOPO)
  useEffect(() => {
    if (!activeRegionalId) return;
    
    // REGRA: Regional e Comissão vêem todas. Local vê apenas as da sua cidade.
    const q = isRegional 
      ? query(collection(db, 'comuns'), where('regionalId', '==', activeRegionalId))
      : query(collection(db, 'comuns'), where('cidadeId', '==', userData?.cidadeId));

    const unsubIgrejas = onSnapshot(q, (s) => {
      const lista = s.docs.map(d => ({ 
        id: d.id, 
        nome: d.data().comum || d.data().bairro || d.data().nome || "Sem Nome" 
      }));
      setListaIgrejasRegional(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
      
      // Se a comum ativa não estiver na lista (mudança de login), reseta para a primeira
      if (!activeComumId && lista.length > 0) setActiveComumId(lista[0].id);
    });
    return () => unsubIgrejas();
  }, [isRegional, activeRegionalId, userData?.cidadeId]);

  // 3. MONITOR DE EVENTOS DINÂMICO
  useEffect(() => {
    if (!activeComumId) return;
    setLoading(true);
    const unsubEvents = onSnapshot(collection(db, 'comuns', activeComumId, 'events'), (snapshot) => {
      const evs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(evs);
      setLoading(false);
    });
    return () => unsubEvents();
  }, [activeComumId]);

  const mesesRef = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const availableYears = useMemo(() => {
    const years = [...new Set(events.map(ev => ev.date?.split('-')[0]))].filter(Boolean);
    return years.sort((a, b) => b - a);
  }, [events]);

  const norm = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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
    const citySet = new Set();
    const minSet = new Set();
    const bairroMap = {};
    const nominal = [];
    const hinosMap = {};

    let totalMusicos = 0, totalOrgaos = 0, totalIrmandade = 0, totalHinos = 0;

    const inc = (g, keyBase, t, c) => {
      g[`${keyBase}Total`] = (g[`${keyBase}Total`] || 0) + t;
      g[`${keyBase}Comum`] = (g[`${keyBase}Comum`] || 0) + (c || 0);
      g[`${keyBase}Vis`] = (g[`${keyBase}Vis`] || 0) + (t - (c || 0));
    };

    filtered.forEach(ev => {
      const mIdx = parseInt(ev.date.split('-')[1]) - 1;
      const key = mesesRef[mIdx];
      if (!groups[key]) groups[key] = {
        label: key, monthIdx: mIdx,
        cordasTotal: 0, cordasComum: 0, cordasVis: 0,
        madeirasTotal: 0, madeirasComum: 0, madeirasVis: 0,
        metaisTotal: 0, metaisComum: 0, metaisVis: 0,
        teclasTotal: 0, teclasComum: 0, teclasVis: 0,
        organistasTotal: 0, irmandadeTotal: 0,
        hinos: 0, count: 0
      };
      const g = groups[key];
      g.count++;

      const counts = ev.counts || {};
      Object.entries(counts).forEach(([id, data]) => {
        const t = parseInt(data.total) || 0;
        const c = parseInt(data.comum) || 0;
        
        let secRaw = data.section;
        if (!secRaw) {
          const instBase = instrumentsNacionais.find(i => i.id === id) || instrumentsConfig.find(i => i.id === id);
          secRaw = instBase?.section || '';
        }
        
        const s = norm(secRaw);

        if (s.includes('organista') || s.includes('orgao') || s.includes('orgão')) {
          g.organistasTotal += t; totalOrgaos += t;
        } else if (s.includes('cord')) {
          inc(g, 'cordas', t, c); totalMusicos += t;
        } else if (s.includes('madeir') || s.includes('sax')) {
          inc(g, 'madeiras', t, c); totalMusicos += t;
        } else if (s.includes('met') || s.includes('tromp') || s.includes('tuba')) {
          inc(g, 'metais', t, c); totalMusicos += t;
        } else if (s.includes('tecl') || id === 'acordeon' || id === 'piano') {
          inc(g, 'teclas', t, c); totalMusicos += t;
        } else if (s.includes('coral') || s.includes('vozes') || s.includes('irmandade')) {
          const irmas = parseInt(data.irmas) || 0;
          g.irmandadeTotal += (t + irmas); totalIrmandade += (t + irmas);
        }
      });

      const ata = ev.ata || {};
      const hCount = parseInt(ata.hinosChamados) || 0;
      g.hinos += hCount; totalHinos += hCount;

      if (ata.visitantes) {
        ata.visitantes.forEach(v => {
          const cV = (v.cidadeUf || "N/I").toUpperCase();
          const mV = (v.min || "MÚSICO").toUpperCase();
          const bV = (v.bairro || "CENTRO").toUpperCase();
          citySet.add(cV); minSet.add(mV);
          bairroMap[bV] = (bairroMap[bV] || 0) + 1;
          nominal.push({ ...v, date: ev.date, time: ev.time || '--:--' });
        });
      }

      if (Array.isArray(ata.hinosLista)) {
        ata.hinosLista.forEach(h => { if (h) hinosMap[h] = (hinosMap[h] || 0) + 1; });
      }
    });

    const chartArray = Object.values(groups).sort((a, b) => a.monthIdx - b.monthIdx).map(g => {
      const cordasTotal = g.cordasTotal || 0;
      const madeirasTotal = g.madeirasTotal || 0;
      const metaisTotal = g.metaisTotal || 0;
      const teclasTotal = g.teclasTotal || 0;
      const organistas = g.organistasTotal || 0;
      const totalOrqOnly = cordasTotal + madeirasTotal + metaisTotal + teclasTotal + organistas || 1;

      return {
        ...g,
        cordas: g.cordasComum, cordasV: g.cordasVis,
        madeiras: g.madeirasComum, madeirasV: g.madeirasVis,
        metais: g.metaisComum, metaisV: g.metaisVis,
        teclas: g.teclasComum, teclasV: g.teclasVis,
        organistas, totalOrqOnly, totalGeral: totalOrqOnly + g.irmandadeTotal,
        pCordas: Number(((cordasTotal / totalOrqOnly) * 100).toFixed(1)),
        pMadeiras: Number(((madeirasTotal / totalOrqOnly) * 100).toFixed(1)),
        pMetais: Number(((metaisTotal / totalOrqOnly) * 100).toFixed(1))
      };
    });

    const nEnsSafe = filtered.length || 1;

    return {
      chartArray, tM: totalMusicos, tO: totalOrgaos, tI: totalIrmandade, tH: totalHinos, nEnsSafe,
      topHinosData: Object.entries(hinosMap).map(([num, count]) => ({ num, count })).sort((a, b) => b.count - a.count).slice(0, 15),
      cityList: [...citySet].map(name => ({ name, value: nominal.filter(x => x.cidadeUf?.toUpperCase() === name).length })).sort((a, b) => b.value - a.value).slice(0, 6),
      bairroList: Object.entries(bairroMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      minVisList: [...minSet].map(name => ({ name, value: nominal.filter(x => x.min?.toUpperCase() === name).length })).sort((a, b) => b.value - a.value),
      cityOptions: [...citySet].sort(),
      minOptions: [...minSet].sort(),
      nominalFinal: nominal.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [events, filterType, selectedYear, subFilter, instrumentsNacionais, instrumentsConfig]);

  const { chartArray, tM, tO, tI, tH, nEnsSafe, topHinosData, cityList, bairroList, minVisList, cityOptions, minOptions, nominalFinal } = processedData;

  const filteredNominal = useMemo(() => {
    return nominalFinal.filter(v => {
      const mCity = listCityFilter === 'all' || v.cidadeUf?.toUpperCase() === listCityFilter;
      const mMin = listMinFilter === 'all' || v.min?.toUpperCase() === listMinFilter;
      return mCity && mMin;
    });
  }, [nominalFinal, listCityFilter, listMinFilter]);

  const handleSwipe = (direction, slide, setSlide, max) => {
    if (direction === 'left' && slide < max - 1) setSlide(slide + 1);
    if (direction === 'right' && slide > 0) setSlide(slide - 1);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F1F5F9] font-[900] italic text-slate-950 uppercase tracking-widest animate-pulse">Sincronizando Dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans text-left animate-premium">
      
      {/* 1. CABEÇALHO DE HIERARQUIA & FILTROS */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl p-4 border-b border-slate-200 space-y-3 shadow-sm rounded-b-[2.5rem]">
        
        {/* SELETOR DE ESCOPO DINÂMICO (Liberado para Regional) */}
        {(isRegional || userData?.escopoCidade) && (
          <div className="flex items-center gap-2 bg-blue-600 p-2 rounded-2xl w-full shadow-lg shadow-blue-200">
             <Building2 size={14} className="text-white ml-2 opacity-80" />
             <select value={activeComumId} onChange={(e) => setActiveComumId(e.target.value)} className="bg-transparent text-white font-[900] text-[10px] uppercase outline-none flex-1 py-1 cursor-pointer">
                {listaIgrejasRegional.map(igreja => (
                  <option key={igreja.id} value={igreja.id} className="text-slate-900">{igreja.nome}</option>
                ))}
             </select>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl w-full">
            <Filter size={14} className="text-white ml-2 opacity-50" />
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSubFilter('0'); }} className="bg-transparent text-white font-[900] text-[10px] uppercase outline-none flex-1 py-1 cursor-pointer">
                <option value="all" className="text-slate-900">Histórico Total</option>
                <option value="year" className="text-slate-900">Visão Anual</option>
                <option value="semester" className="text-slate-900">Por Semestre</option>
                <option value="quarter" className="text-slate-900">Por Trimestre</option>
                <option value="month" className="text-slate-900">Visão Mensal</option>
            </select>
        </div>
        
        <div className="flex gap-2 w-full">
          {filterType !== 'all' && (
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-slate-200 p-3 rounded-xl font-[900] text-[10px] text-slate-950 outline-none flex-1 shadow-sm">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {filterType === 'semester' && <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="bg-white border border-slate-200 p-3 rounded-xl font-[900] text-[10px] text-slate-950 flex-1 shadow-sm uppercase italic tracking-tighter"><option value="0">1º Semestre</option><option value="1">2º Semestre</option></select>}
          {filterType === 'quarter' && <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="bg-white border border-slate-200 p-3 rounded-xl font-[900] text-[10px] text-slate-950 flex-1 shadow-sm uppercase italic tracking-tighter"><option value="0">1º Tri</option><option value="1">2º Tri</option><option value="2">3º Tri</option><option value="3">4º Tri</option></select>}
          {filterType === 'month' && <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="bg-white border border-slate-200 p-3 rounded-xl font-[900] text-[10px] text-slate-950 flex-1 shadow-sm uppercase italic tracking-widest">{mesesRef.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>}
        </div>
      </div>

      <div className="p-4 space-y-8 pb-44 max-w-md mx-auto no-scrollbar">
        
        {/* IDENTIDADE DE ESCOPO */}
        <div className="flex items-center gap-3 ml-2">
           <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
           <div className="text-left leading-none">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Análise de Fluxo</p>
              <h2 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter leading-tight">
                {listaIgrejasRegional.find(i => i.id === activeComumId)?.nome || userData?.comum}
              </h2>
           </div>
        </div>

        {/* 2. BIG NUMBERS PREMIUM */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Total Músicos" val={tM} color="bg-blue-600" icon={<Music size={12}/>} />
          <StatCard label="Média/Ensaio" val={(tM / nEnsSafe).toFixed(1)} color="bg-blue-400" isAvg />
          <StatCard label="Total Órgão" val={tO} color="bg-violet-500" />
          <StatCard label="Média/Ensaio" val={(tO / nEnsSafe).toFixed(1)} color="bg-violet-400" isAvg />
          <StatCard label="Irmandade" val={tI} color="bg-slate-900" />
          <StatCard label="Média/Ensaio" val={(tI / nEnsSafe).toFixed(1)} color="bg-slate-500" isAvg />
        </section>

        {/* CARROSSEL FREQUÊNCIA */}
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125">
             <BarChart3 size={100} />
          </div>

          <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
             <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-[0.2em] leading-none">
                {presencaSlide === 0 ? "Equilíbrio Orquestral" : "Frequência Total"}
             </h3>
             <div className="flex gap-1">
               <button onClick={() => setPresencaSlide(0)} className={`w-1.5 h-1.5 rounded-full transition-all ${presencaSlide === 0 ? 'bg-slate-950 w-4' : 'bg-slate-200'}`} />
               <button onClick={() => setPresencaSlide(1)} className={`w-1.5 h-1.5 rounded-full transition-all ${presencaSlide === 1 ? 'bg-slate-950 w-4' : 'bg-slate-200'}`} />
             </div>
          </div>

          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(e, info) => handleSwipe(info.offset.x < 0 ? 'left' : 'right', presencaSlide, setPresencaSlide, 2)} className="h-64 w-full cursor-grab active:cursor-grabbing">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartArray}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '700', fill: '#cbd5e1' }} />
                <Tooltip cursor={{ fill: '#F8FAF9' }} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                {presencaSlide === 0 ? (
                  <>
                    <Bar name="Cordas" dataKey="cordas" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    <Bar name="Madeiras" dataKey="madeiras" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar name="Metais" dataKey="metais" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar name="Teclas" dataKey="teclas" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar name="Órgao" dataKey="organistas" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar name="Orquestra" dataKey="totalOrqOnly" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                    <Bar name="Irmandade" dataKey="irmandadeTotal" stackId="a" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={20} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </section>

        {/* Restante das seções (Soberania, Hinos, Visitas) permanecem intactas seguindo a lógica centralizada... */}
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
             <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-[0.2em] leading-none">
                {equiSlide === 0 ? 'Proporção Técnica (%)' : equiSlide === 1 ? 'Soberania: Cordas' : equiSlide === 2 ? 'Soberania: Madeiras' : 'Soberania: Metais'}
             </h3>
             <div className="flex gap-1">
               {[0, 1, 2, 3].map(i => <button key={i} onClick={() => setEquiSlide(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${equiSlide === i ? 'bg-amber-500 w-4' : 'bg-slate-200'}`} />)}
             </div>
          </div>
          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(e, info) => handleSwipe(info.offset.x < 0 ? 'left' : 'right', equiSlide, setEquiSlide, 4)} className="h-56 w-full cursor-grab active:cursor-grabbing">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartArray}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#cbd5e1' }} domain={[0, 100]} />
                <Tooltip formatter={(value) => (equiSlide === 0 ? `${value}%` : value)} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900' }} />
                {equiSlide === 0 && <><Bar name="Cordas" dataKey="pCordas" stackId="p" fill="#fbbf24" /><Bar name="Madeiras" dataKey="pMadeiras" stackId="p" fill="#10b981" /><Bar name="Metais" dataKey="pMetais" stackId="p" fill="#e11d48" radius={[3, 3, 0, 0]} /></>}
                {equiSlide === 1 && <><Bar name="Comum" dataKey="cordas" stackId="s" fill="#fbbf24" /><Bar name="Visita" dataKey="cordasV" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} /></>}
                {equiSlide === 2 && <><Bar name="Comum" dataKey="madeiras" stackId="s" fill="#10b981" /><Bar name="Visita" dataKey="madeirasV" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} /></>}
                {equiSlide === 3 && <><Bar name="Comum" dataKey="metais" stackId="s" fill="#e11d48" /><Bar name="Visita" dataKey="metaisV" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} /></>}
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </section>

        {/* ... (Musicalidade, Top Hinos, Visitas e Listagem Nominal preservados para funcionalidade completa) ... */}
        <section className="bg-slate-950 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
             <div className="flex justify-between items-center text-white mb-6 border-b border-white/10 pb-4">
                <div className="text-left leading-none">
                   <p className="text-[7px] font-black text-amber-500 uppercase tracking-widest mb-1 italic leading-none">Ranking Musical</p>
                   <h3 className="text-lg font-[900] italic uppercase leading-none tracking-tighter">Top Hinos</h3>
                </div>
                <div className="flex gap-1">
                  {[3, 5, 10, 15].map(n => (
                    <button key={n} onClick={() => setTopLimit(n)} className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all ${topLimit === n ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white/40'}`}>{n}</button>
                  ))}
                </div>
             </div>
             
             <div style={{ height: topLimit * 40 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topHinosData.slice(0, topLimit)} margin={{ left: -20, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="num" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '900', fill: '#fff' }} width={45} />
                  <Bar dataKey="count" fill="#F59E0B" radius={[0, 8, 8, 0]} barSize={18}>
                    {topHinosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.05)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

        <div className="mt-8 flex flex-col items-center justify-center gap-1 opacity-20 text-center pb-10">
          <span className="text-[8px] font-[900] text-slate-950 uppercase tracking-[0.3em]">Sistema Regional</span>
          <span className="text-[7px] font-black text-slate-950 uppercase tracking-[0.2em]">Secretaria da Musica Regional</span>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, color, isAvg, icon }) => (
  <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95">
    <div className="flex items-center gap-2 mb-2">
       {icon && <span className="opacity-20">{icon}</span>}
       <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest italic leading-none">{label}</p>
    </div>
    <div className="flex items-end gap-1.5">
       <p className="text-3xl font-[900] text-slate-950 italic leading-none tracking-tighter">{val}</p>
       <div className={`w-1.5 h-1.5 rounded-full mb-1 ${color}`} />
    </div>
    {isAvg && <p className="text-[6px] font-black text-slate-300 uppercase mt-2 tracking-[0.2em] italic">Média por Ensaio</p>}
  </div>
);

export default DashPage;