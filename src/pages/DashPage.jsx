import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, doc } from '../firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

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

  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';

  const [instrumentsConfig, setInstrumentsConfig] = useState([]);

  useEffect(() => {
    const unsubInst = onSnapshot(doc(db, 'settings', 'instruments'), (s) => {
      if (s.exists()) setInstrumentsConfig(s.data().groups || []);
    });
    return () => { if (unsubInst) unsubInst(); };
  }, []);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'comuns', comumId, 'events'), (snapshot) => {
      const evs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(evs);
      setLoading(false);
    });
    return () => unsubEvents();
  }, [comumId]);

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
      chartArray,
      tM: totalMusicos,
      tO: totalOrgaos,
      tI: totalIrmandade,
      tH: totalHinos,
      nEnsSafe,
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-700 animate-pulse uppercase italic text-center p-10">Processando Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-left">
      {/* 1. FILTRO DINÂMICO FIXO NO TOPO */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md p-3 border-b border-gray-100 flex flex-wrap gap-2 shadow-sm">
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setSubFilter('0'); }} className="bg-gray-100 p-2 rounded-xl font-black text-[10px] uppercase text-blue-700 outline-none flex-1">
          <option value="all">Histórico Total</option><option value="year">Ano</option><option value="semester">Semestre</option><option value="quarter">Trimestre</option><option value="month">Mês</option>
        </select>
        {filterType !== 'all' && (
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-gray-100 p-2 rounded-xl font-black text-[10px] text-gray-700 outline-none">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {filterType === 'semester' && <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="bg-gray-100 p-2 rounded-xl font-black text-[10px] uppercase text-gray-700"><option value="0">1º Semestre</option><option value="1">2º Semestre</option></select>}
        {filterType === 'quarter' && <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="bg-gray-100 p-2 rounded-xl font-black text-[10px] uppercase text-gray-700"><option value="0">1º Tri</option><option value="1">2º Tri</option><option value="2">3º Tri</option><option value="3">4º Tri</option></select>}
        {filterType === 'month' && <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="bg-gray-100 p-2 rounded-xl font-black text-[10px] uppercase text-gray-700">{mesesRef.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>}
      </div>

      <div className="p-4 space-y-6 pb-32">
        {/* 2. BIG NUMBERS */}
        <section className="grid grid-cols-2 gap-2">
          <StatCard label="Total Músicos" val={tM} color="blue" />
          <StatCard label="Média Músicos" val={(tM / nEnsSafe).toFixed(1)} color="blue" isAvg />
          <StatCard label="Total Órgão" val={tO} color="purple" />
          <StatCard label="Média Órgão" val={(tO / nEnsSafe).toFixed(1)} color="purple" isAvg />
          <StatCard label="Total Irmandade" val={tI} color="red" />
          <StatCard label="Média Irmandade" val={(tI / nEnsSafe).toFixed(1)} color="red" isAvg />
        </section>

        {/* 3. CARROSSEL FREQUÊNCIA */}
        <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative min-w-0">
          <h3 className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest mb-4">{presencaSlide === 0 ? "Equilíbrio Orquestral" : "Frequência Total"}</h3>
          <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={chartArray}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tick={{ fontSize: 9 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '11px' }} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '15px' }} />
                {presencaSlide === 0 ? (
                  <>
                    <Bar name="Cordas" dataKey="cordas" stackId="a" fill="#fbbf24" />
                    <Bar name="Madeiras" dataKey="madeiras" stackId="a" fill="#34d399" />
                    <Bar name="Metais" dataKey="metais" stackId="a" fill="#f87171" />
                    <Bar name="Teclas" dataKey="teclas" stackId="a" fill="#3b82f6" />
                    <Bar name="Órgao" dataKey="organistas" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar name="Orquestra" dataKey="totalOrqOnly" stackId="a" fill="#3b82f6" />
                    <Bar name="Irmandade" dataKey="irmandade" stackId="a" fill="#1e293b" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-2 mt-2">
            <button onClick={() => setPresencaSlide(0)} className={`w-2 h-2 rounded-full ${presencaSlide === 0 ? 'bg-blue-600 w-4' : 'bg-gray-200'}`} />
            <button onClick={() => setPresencaSlide(1)} className={`w-2 h-2 rounded-full ${presencaSlide === 1 ? 'bg-blue-600 w-4' : 'bg-gray-200'}`} />
          </div>
        </section>

        {/* 4. CARROSSEL SOBERANIA % */}
        <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative min-w-0">
          <h3 className="text-[10px] font-black text-gray-900 uppercase italic tracking-widest mb-4 border-b pb-2">
            {equiSlide === 0 ? 'Proporção Técnica (%)' : equiSlide === 1 ? 'Soberania: Cordas' : equiSlide === 2 ? 'Soberania: Madeiras' : 'Soberania: Metais'}
          </h3>
          <div className="h-56 w-full" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={chartArray}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 8 }} />
                <YAxis axisLine={false} tick={{ fontSize: 8 }} domain={[0, 100]} />
                <Tooltip formatter={(value) => (equiSlide === 0 ? `${value}%` : value)} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '8px' }} />
                {equiSlide === 0 && <><Bar name="Cordas" dataKey="pCordas" stackId="p" fill="#fbbf24" /><Bar name="Madeiras" dataKey="pMadeiras" stackId="p" fill="#10b981" /><Bar name="Metais" dataKey="pMetais" stackId="p" fill="#e11d48" radius={[3, 3, 0, 0]} /></>}
                {equiSlide === 1 && <><Bar name="Comum" dataKey="cordas" stackId="s" fill="#fbbf24" /><Bar name="Visita" dataKey="cordasV" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} /></>}
                {equiSlide === 2 && <><Bar name="Comum" dataKey="madeiras" stackId="s" fill="#10b981" /><Bar name="Visita" dataKey="madeirasV" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} /></>}
                {equiSlide === 3 && <><Bar name="Comum" dataKey="metais" stackId="s" fill="#e11d48" /><Bar name="Visita" dataKey="metaisV" stackId="s" fill="#e2e8f0" radius={[3, 3, 0, 0]} /></>}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-1 mt-4">
            {[0, 1, 2, 3].map(i => <button key={i} onClick={() => setEquiSlide(i)} className={`w-2 h-2 rounded-full ${equiSlide === i ? 'bg-orange-600 w-4' : 'bg-gray-200'}`} />)}
          </div>
        </section>

        {/* 5. MUSICALIDADE */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total Hinos" val={tH} color="emerald" />
            <StatCard label="Média Hinos" val={(tH / nEnsSafe).toFixed(1)} color="emerald" isAvg />
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative min-w-0">
            <h3 className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest mb-4">{hinosSlide === 0 ? "Hinos Ensaiados" : "Hinos por Parte"}</h3>
            <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={chartArray}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 9 }} />
                  <YAxis axisLine={false} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '11px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '8px' }} />
                  {hinosSlide === 0 ? <Bar name="Qtd Hinos" dataKey="hinos" fill="#10b981" radius={[5, 5, 0, 0]} barSize={25} /> : <><Bar name="1ª Parte" dataKey="1ª Parte" stackId="h" fill="#065f46" /><Bar name="2ª Parte" dataKey="2ª Parte" stackId="h" fill="#10b981" /><Bar name="Outras" dataKey="Outros" stackId="h" fill="#6ee7b7" radius={[4, 4, 0, 0]} /></>}
                  <ReferenceLine y={tH / nEnsSafe} stroke="#94a3b8" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-2 mt-2"><button onClick={() => setHinosSlide(0)} className={`w-2 h-2 rounded-full ${hinosSlide === 0 ? 'bg-emerald-600 w-4' : 'bg-gray-200'}`} /><button onClick={() => setHinosSlide(1)} className={`w-2 h-2 rounded-full ${hinosSlide === 1 ? 'bg-emerald-600 w-4' : 'bg-gray-200'}`} /></div>
          </div>

          {/* 6. TOP HINOS */}
          <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm min-w-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Top Hinos</h3>
              <div className="flex gap-1">{[3, 5, 10, 15].map(n => (<button key={n} onClick={() => setTopLimit(n)} className={`px-2 py-1 rounded-md text-[8px] font-black ${topLimit === n ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{n}</button>))}</div>
            </div>
            <div style={{ height: topLimit * 35 }} className="w-full">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart layout="vertical" data={topHinosData.slice(0, topLimit)} margin={{ left: -20, right: 40 }}>
                  <XAxis type="number" hide /><YAxis dataKey="num" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'black' }} width={40} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 5, 5, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </section>

        {/* 7. VISITAS */}
        <section className="space-y-4">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative min-w-0">
            <h3 className="text-[10px] font-black text-gray-400 uppercase italic mb-4">{visitaSlide === 0 ? "Cidades Visitantes" : visitaSlide === 1 ? "Bairros Visitantes" : "Ministérios Visitantes"}</h3>
            <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="99%" height="100%">
                <BarChart layout="vertical" data={visitaSlide === 0 ? cityList : visitaSlide === 1 ? bairroList : minVisList} margin={{ left: -10, right: 30 }}>
                  <XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 'bold' }} width={90} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={12} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-1 mt-2">{[0, 1, 2].map(i => <button key={i} onClick={() => setVisitaSlide(i)} className={`w-2 h-2 rounded-full ${visitaSlide === i ? 'bg-orange-600 w-4' : 'bg-gray-200'}`} />)}</div>
          </div>

          <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase italic mb-4 border-b pb-2">Listagem Nominal de Visitas</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <select value={listCityFilter} onChange={(e) => setListCityFilter(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-[9px] font-black uppercase outline-none border border-gray-100"><option value="all">Todas Cidades</option>{cityOptions.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={listMinFilter} onChange={(e) => setListMinFilter(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-[9px] font-black uppercase outline-none border border-gray-100"><option value="all">Todos Ministérios</option>{minOptions.map(m => <option key={m} value={m}>{m}</option>)}</select>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredNominal.map((v, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-gray-900 leading-tight">{v.nome}</span><span className="text-[8px] font-bold text-blue-600 uppercase">{v.min} • {v.inst}</span><span className="text-[7px] text-gray-400 uppercase font-black">{v.bairro} - {v.cidadeUf}</span></div>
                  <div className="text-right flex flex-col items-end"><span className="text-[8px] font-black text-gray-900">{v.date?.split('-').reverse().join('/')}</span><span className="text-[7px] font-bold text-gray-400">{v.time}</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, color, isAvg }) => {
  const colorMap = { blue: 'text-blue-600', purple: 'text-purple-600', red: 'text-red-600', emerald: 'text-emerald-600' };
  return (
    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center">
      <p className={`text-[7px] font-black uppercase ${colorMap[color] || 'text-gray-600'} italic leading-none mb-1`}>{label}</p>
      <p className="text-xl font-black text-gray-800 italic leading-none">{val}</p>
      {isAvg && <p className="text-[6px] font-bold text-gray-300 uppercase mt-1">Por Ensaio</p>}
    </div>
  );
};

export default DashPage;