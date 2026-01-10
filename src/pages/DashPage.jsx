import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, doc, query, where } from '../firebase';
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
  const [activeComumId, setActiveComumId] = useState(userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu');
  const [listaIgrejasRegional, setListaIgrejasRegional] = useState([]);

  const [instrumentsConfig, setInstrumentsConfig] = useState([]);

  // 1. MONITOR DE CONFIGURAÇÃO DE INSTRUMENTOS
  useEffect(() => {
    const unsubInst = onSnapshot(doc(db, 'config_comum', activeComumId, 'instrumentos_config', 'lista'), (s) => {
      if (s.exists()) setInstrumentsConfig(s.data().groups || []);
    });
    return () => { if (unsubInst) unsubInst(); };
  }, [activeComumId]);

  // 2. MONITOR DE IGREJAS (EXCLUSIVO MASTER)
  useEffect(() => {
    if (!isMaster) return;
    const unsubIgrejas = onSnapshot(collection(db, 'config_comum'), (s) => {
      setListaIgrejasRegional(s.docs.map(d => ({ id: d.id, nome: d.data().nome || d.data().comum })));
    });
    return () => unsubIgrejas();
  }, [isMaster]);

  // 3. MONITOR DE EVENTOS (DINÂMICO POR COMUM SELECIONADA)
  useEffect(() => {
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
        hinos: 0, partes: {}, count: 0
      };
      const g = groups[key];
      g.count++;

      const counts = ev.counts || {};
      Object.entries(counts).forEach(([id, data]) => {
        const t = parseInt(data.total) || 0;
        const c = parseInt(data.comum) || 0;
        let sec = data.section || '';
        if (!sec) {
          const cfg = instrumentsConfig.find(i => i.id === id);
          if (cfg) sec = cfg.section || '';
        }
        const s = norm(sec);

        if (id && id.startsWith('inst-')) {
          g.organistasTotal += t;
          totalOrgaos += t;
        } else if (s.includes('org') || s.includes('orgao') || s.includes('órgão')) {
          g.organistasTotal += t;
          totalOrgaos += t;
        } else if (s.includes('cord')) {
          inc(g, 'cordas', t, c);
          totalMusicos += t;
        } else if (s.includes('madeir') || s.includes('sax')) {
          inc(g, 'madeiras', t, c);
          totalMusicos += t;
        } else if (s.includes('met') || s.includes('tromp') || s.includes('tuba') || s.includes('eufonio')) {
          inc(g, 'metais', t, c);
          totalMusicos += t;
        } else if (s.includes('tecl') || id === 'acordeon' || id === 'piano' || s.includes('tecla')) {
          inc(g, 'teclas', t, c);
          totalMusicos += t;
        } else if (s.includes('coral') || id.includes('coral') || id.includes('vozes')) {
          g.irmandadeTotal += t;
          totalIrmandade += t;
        } else {
          const idn = id.toLowerCase();
          if (idn.includes('sax') || idn.includes('saxalto') || idn.includes('saxtenor')) {
            inc(g, 'madeiras', t, c); totalMusicos += t;
          } else if (idn.includes('violin') || idn.includes('violino') || idn.includes('viola') || idn.includes('violoncello') || idn.includes('violoncelo')) {
            inc(g, 'cordas', t, c); totalMusicos += t;
          } else if (idn.includes('tromp') || idn.includes('trombone') || idn.includes('trompa') || idn.includes('tuba')) {
            inc(g, 'metais', t, c); totalMusicos += t;
          } else {
            inc(g, 'teclas', t, c); totalMusicos += t;
          }
        }
      });

      const ata = ev.ata || {};
      const hCount = parseInt(ata.hinosChamados) || 0;
      g.hinos += hCount; totalHinos += hCount;

      if (ata.partes) {
        ata.partes.forEach(p => {
          const lbl = p.label || 'Outros';
          const cnt = p.hinos ? p.hinos.filter(h => h && h.trim() !== '').length : 0;
          g.partes[lbl] = (g.partes[lbl] || 0) + cnt;
        });
      }

      if (ata.visitantes) {
        ata.visitantes.forEach(v => {
          const c = (v.cidadeUf || "N/I").toUpperCase();
          const m = (v.min || "MÚSICO").toUpperCase();
          const b = (v.bairro || "CENTRO").toUpperCase();
          citySet.add(c); minSet.add(m);
          bairroMap[b] = (bairroMap[b] || 0) + 1;
          nominal.push({ ...v, date: ev.date, time: ev.time || '--:--' });
        });
      }

      if (Array.isArray(ata.hinosLista)) {
        ata.hinosLista.forEach(h => { if (h) hinosMap[h] = (hinosMap[h] || 0) + 1; });
      }
    });

    const chartArray = Object.values(groups).sort((a, b) => a.monthIdx - b.monthIdx).map(g => {
      const cordasTotal = g.cordasTotal || 0;
      const cordasComum = g.cordasComum || 0;
      const cordasVis = g.cordasVis || 0;
      const madeirasTotal = g.madeirasTotal || 0;
      const madeirasComum = g.madeirasComum || 0;
      const madeirasVis = g.madeirasVis || 0;
      const metaisTotal = g.metaisTotal || 0;
      const metaisComum = g.metaisComum || 0;
      const metaisVis = g.metaisVis || 0;
      const teclasTotal = g.teclasTotal || 0;
      const teclasComum = g.teclasComum || 0;
      const teclasVis = g.teclasVis || 0;
      const organistas = g.organistasTotal || 0;
      const irmandade = g.irmandadeTotal || 0;

      const totalOrqOnly = cordasTotal + madeirasTotal + metaisTotal + teclasTotal + organistas || 1;
      const totalGeral = totalOrqOnly + irmandade;

      return {
        ...g,
        cordas: cordasComum,
        cordasV: cordasVis,
        madeiras: madeirasComum,
        madeirasV: madeirasVis,
        metais: metaisComum,
        metaisV: metaisVis,
        teclas: teclasComum,
        teclasV: teclasVis,
        teclasTotal,
        organistas,
        totalOrqOnly,
        totalGeral,
        pCordas: Number(((cordasTotal / totalOrqOnly) * 100).toFixed(1)),
        pMadeiras: Number(((madeirasTotal / totalOrqOnly) * 100).toFixed(1)),
        pMetais: Number(((metaisTotal / totalOrqOnly) * 100).toFixed(1)),
        hinosAvg: (g.hinos / (g.count || 1)).toFixed(1),
        ...Object.keys(g.partes).reduce((acc, k) => ({ ...acc, [k]: (g.partes[k] / (g.count || 1)).toFixed(1) }), {})
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
  }, [events, filterType, selectedYear, subFilter, instrumentsConfig]);

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
        
        {/* SELETOR DE ESCOPO (EXCLUSIVO MASTER) */}
        {isMaster && (
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
              <h2 className="text-xl font-[900] text-slate-950 uppercase italic tracking-tighter">
                {isMaster ? listaIgrejasRegional.find(i => i.id === activeComumId)?.nome : userData?.comum}
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

        {/* 3. CARROSSEL FREQUÊNCIA */}
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
                    <Bar name="Irmandade" dataKey="irmandade" stackId="a" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={20} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </section>

        {/* 4. CARROSSEL SOBERANIA % */}
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

        {/* 5. MUSICALIDADE & TOP HINOS */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Hinos" val={tH} color="bg-emerald-500" icon={<Activity size={12}/>} />
            <StatCard label="Média/Ensaio" val={(tH / nEnsSafe).toFixed(1)} color="bg-emerald-600" isAvg />
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
               <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-[0.2em] leading-none">
                  {hinosSlide === 0 ? "Fluxo de Hinos" : "Hinos por Parte"}
               </h3>
               <div className="flex gap-1">
                 <button onClick={() => setHinosSlide(0)} className={`w-1.5 h-1.5 rounded-full transition-all ${hinosSlide === 0 ? 'bg-emerald-600 w-4' : 'bg-slate-200'}`} />
                 <button onClick={() => setHinosSlide(1)} className={`w-1.5 h-1.5 rounded-full transition-all ${hinosSlide === 1 ? 'bg-emerald-600 w-4' : 'bg-slate-200'}`} />
               </div>
            </div>
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(e, info) => handleSwipe(info.offset.x < 0 ? 'left' : 'right', hinosSlide, setHinosSlide, 2)} className="h-64 w-full cursor-grab active:cursor-grabbing">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartArray}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900' }} />
                  {hinosSlide === 0 ? <Bar name="Qtd Hinos" dataKey="hinos" fill="#10b981" radius={[5, 5, 0, 0]} barSize={25} /> : <><Bar name="1ª Parte" dataKey="1ª Parte" stackId="h" fill="#065f46" /><Bar name="2ª Parte" dataKey="2ª Parte" stackId="h" fill="#10b981" /><Bar name="Outras" dataKey="Outros" stackId="h" fill="#6ee7b7" radius={[4, 4, 0, 0]} /></>}
                  <ReferenceLine y={tH / nEnsSafe} stroke="#cbd5e1" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          <div className="bg-slate-950 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
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
          </div>
        </section>

        {/* 6. VISITAS */}
        <section className="space-y-4">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125">
               <TrendingUp size={100} />
            </div>
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
               <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-[0.2em] leading-none">
                  {visitaSlide === 0 ? "Cidades Visitantes" : visitaSlide === 1 ? "Bairros Visitantes" : "Ministérios Visitantes"}
               </h3>
               <div className="flex gap-1">
                  {[0, 1, 2].map(i => <button key={i} onClick={() => setVisitaSlide(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${visitaSlide === i ? 'bg-orange-600 w-4' : 'bg-slate-200'}`} />)}
               </div>
            </div>
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(e, info) => handleSwipe(info.offset.x < 0 ? 'left' : 'right', visitaSlide, setVisitaSlide, 3)} className="h-64 w-full cursor-grab active:cursor-grabbing">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={visitaSlide === 0 ? cityList : visitaSlide === 1 ? bairroList : minVisList} margin={{ left: -10, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} width={100} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={12} fill="#f97316">
                     {cityList.map((entry, index) => (
                        <Cell key={`cell-vis-${index}`} fillOpacity={1 - (index * 0.1)} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* LISTA DE VISITAS */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
               <h3 className="text-[10px] font-black text-slate-950 uppercase italic tracking-widest">Registros de Visita</h3>
               <Star size={14} className="text-amber-500 fill-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={listCityFilter} onChange={(e) => setListCityFilter(e.target.value)} className="p-3 bg-slate-50 rounded-2xl text-[9px] font-black uppercase text-slate-950 outline-none border border-slate-100 shadow-inner">
                <option value="all">Todas Cidades</option>
                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={listMinFilter} onChange={(e) => setListMinFilter(e.target.value)} className="p-3 bg-slate-50 rounded-2xl text-[9px] font-black uppercase text-slate-950 outline-none border border-slate-100 shadow-inner">
                <option value="all">Todos Ministérios</option>
                {minOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar pr-1">
              {filteredNominal.map((v, i) => (
                <div key={i} className="flex justify-between items-center p-5 bg-slate-50/50 rounded-[1.8rem] border border-slate-100 group active:scale-95 transition-all">
                  <div className="text-left">
                    <span className="text-[11px] font-[900] text-slate-950 uppercase italic leading-none block mb-1">{v.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-black uppercase px-2 py-0.5 bg-white border border-slate-100 text-blue-600 rounded-md tracking-tighter">{v.inst}</span>
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{v.cidadeUf}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-950 italic">{v.date?.split('-').reverse().join('/')}</span>
                    <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter mt-1">{v.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RODAPÉ INSTITUCIONAL */}
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