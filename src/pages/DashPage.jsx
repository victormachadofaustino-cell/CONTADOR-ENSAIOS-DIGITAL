import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, doc } from '../firebase';

const DashPage = ({ userData }) => {
  const [events, setEvents] = useState([]);
  const [instrumentsConfig, setInstrumentsConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topLimit, setTopLimit] = useState(5);

  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';

  // ESTADOS DO FILTRO
  const [filterType, setFilterType] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    const unsubInst = onSnapshot(doc(db, 'settings', 'instruments'), (s) => {
      if (s.exists()) setInstrumentsConfig(s.data().groups || []);
    });

    const unsubEvents = onSnapshot(collection(db, 'comuns', comumId, 'events'), (snapshot) => {
      const evs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(evs);
      setLoading(false);
    });

    return () => { unsubInst(); unsubEvents(); };
  }, [comumId]);

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (!ev.date) return false;
      const [year, month] = ev.date.split('-').map(Number);
      if (filterType === 'all') return true;
      if (year !== parseInt(selectedYear)) return false;
      if (filterType === 'month') return (month - 1) === parseInt(selectedMonth);
      return true;
    });
  }, [events, filterType, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    const totals = {
      eventos: filteredEvents.length,
      musicos: 0, organistas: 0, irmandade: 0, visitas: 0, hinosTotal: 0,
      ministerio: 0, encRegional: 0, encLocal: 0, examinadoras: 0,
      sections: {}, hinosMap: {}
    };

    filteredEvents.forEach(ev => {
      const counts = ev.counts || {};
      Object.keys(counts).forEach(id => {
        const data = counts[id] || {};
        const t = parseInt(data.total) || 0;
        const c = parseInt(data.comum) || 0;
        const v = t - c;

        if (id.includes('coral')) {
          totals.irmandade += t;
          if (!totals.sections[id]) totals.sections[id] = { total: 0, comum: 0 };
          totals.sections[id].total += t;
          totals.sections[id].comum += c;
        } else {
          const config = instrumentsConfig.find(i => i.id === id);
          if (config) {
            const sec = config.section;
            if (!totals.sections[sec]) totals.sections[sec] = { total: 0, comum: 0 };
            totals.sections[sec].total += t;
            totals.sections[sec].comum += c;

            if (sec.toLowerCase().includes('organista')) totals.organistas += t;
            else totals.musicos += t;
          }
        }
        totals.visitas += v;
      });

      const ata = ev.ata || {};
      totals.hinosTotal += (parseInt(ata.hinosChamados) || 0);
      if (ata.encarregadoRegional) totals.encRegional++;
      if (ata.encarregadoLocal) totals.encLocal++;
      if (ata.examinadora) totals.examinadoras++;
      
      let minEvento = 0;
      if (ata.ancora) minEvento++;
      if (ata.diacono) minEvento++;
      totals.ministerio += minEvento;

      if (Array.isArray(ata.hinosLista)) {
        ata.hinosLista.forEach(h => { if (h) totals.hinosMap[h] = (totals.hinosMap[h] || 0) + 1; });
      }
    });

    totals.topHinos = Object.entries(totals.hinosMap)
      .map(([num, count]) => ({ num, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topLimit);

    return totals;
  }, [filteredEvents, instrumentsConfig, topLimit]);

  const totalOrq = stats.musicos || 1;
  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";

  if (loading) return <div className="p-20 text-center font-black text-blue-700 animate-pulse uppercase italic">Processando Dash Global...</div>;

  return (
    <div className="space-y-4 pb-32 p-4 text-left font-sans animate-in fade-in duration-500">
      
      {/* 1. FILTRO COMPACTO */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-gray-50 p-2 rounded-xl font-black text-[9px] uppercase text-blue-700 border-none outline-none">
          <option value="all">Todo Histórico</option>
          <option value="year">Ano</option>
          <option value="month">Mês</option>
        </select>
        {filterType !== 'all' && (
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-gray-50 p-2 rounded-xl font-black text-[9px] uppercase text-gray-700 border-none outline-none">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {filterType === 'month' && (
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-gray-50 p-2 rounded-xl font-black text-[9px] uppercase text-gray-700 border-none outline-none flex-1">
            {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* 2. BIG NUMBERS */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard title="Total Eventos" value={stats.eventos} sub="Realizados" color="gray" full />
        <StatCard title="Total Geral" value={stats.musicos + stats.organistas + stats.irmandade} sub="Orq + Coral" color="blue" />
        <StatCard title="Irmandade" value={stats.irmandade} sub="Grupo Coral" color="red" />
        <StatCard title="Músicos" value={stats.musicos} sub="S/ Organistas" color="emerald" />
        <StatCard title="Organistas" value={stats.organistas} sub="Orquestra" color="purple" />
        <StatCard title="Ministério" value={stats.ministerio + stats.visitas} sub="Total Presente" color="indigo" />
        <StatCard title="Visitas" value={stats.visitas} sub="Externas" color="orange" />
        <StatCard title="Hinos Louvados" value={stats.hinosTotal} sub="Total Registrado" color="blue" full />
      </div>

      {/* 3. RANKING HINOS */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest leading-none">Top Hinos</h3>
          <div className="flex bg-gray-50 p-1 rounded-lg gap-1">
            {[3, 5, 10, 15].map(n => (
              <button key={n} onClick={() => setTopLimit(n)} className={`px-2 py-1 rounded-md text-[8px] font-black ${topLimit === n ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{n}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {stats.topHinos.map((hino) => (
            <div key={hino.num} className="space-y-1">
              <div className="flex justify-between items-end px-1 leading-none">
                <span className="text-[10px] font-black text-gray-700 italic">Hino {hino.num}</span>
                <span className="text-[10px] font-black text-blue-600">{hino.count}x</span>
              </div>
              <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(hino.count / (stats.topHinos[0]?.count || 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. EQUILÍBRIO ORQUESTRAL (LAYOUT REFORMULADO) */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
        <h3 className="text-lg font-black text-gray-800 uppercase italic border-b border-gray-50 pb-5 leading-none">Equilíbrio & Origem</h3>
        
        <EquilibrioRow label="Cordas" totalGeral={stats.musicos} data={stats.sections['Cordas']} refVal="50%" />
        
        <div className="space-y-6">
          <EquilibrioRow 
            label="Madeiras" 
            totalGeral={stats.musicos}
            data={{
              total: (stats.sections['Madeiras']?.total || 0) + (stats.sections['Saxofones']?.total || 0),
              comum: (stats.sections['Madeiras']?.comum || 0) + (stats.sections['Saxofones']?.comum || 0)
            }} 
            refVal="25%" 
          />
          {/* SUBITEM SAXOFONES */}
          <div className="pl-6 border-l-2 border-gray-50 ml-2">
            <EquilibrioRow 
              label="Saxofones" 
              totalGeral={(stats.sections['Madeiras']?.total || 0) + (stats.sections['Saxofones']?.total || 0)}
              data={stats.sections['Saxofones']} 
              isSub 
            />
          </div>
        </div>

        <EquilibrioRow label="Metais" totalGeral={stats.musicos} data={stats.sections['Metais']} refVal="25%" />

        <div className="pt-4 border-t border-gray-50">
          <div className="flex justify-between items-end mb-2 leading-none">
             <span className="text-xs font-black text-red-600 uppercase italic">Coral (Irmandade)</span>
             <span className="text-xs font-black text-gray-800 italic">{getPerc(stats.irmandade, (stats.musicos + stats.irmandade))}%</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-3">
             <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${getPerc(stats.irmandade, (stats.musicos + stats.irmandade))}%` }} />
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-black text-gray-400 uppercase italic ml-1">Proporção Interna</p>
             <OriginBar label1="Irmãos" val1={stats.sections['coral_irmaos']?.total || 0} label2="Irmãs" val2={stats.sections['coral_irmas']?.total || 0} />
          </div>
        </div>
      </div>

      {/* 5. RESUMO ADMINISTRATIVO */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-50 pb-5">
          <h3 className="text-lg font-black text-gray-800 uppercase italic">Resumo Administrativo</h3>
          <span className="text-blue-600">📋</span>
        </div>
        <div className="space-y-4">
          <AdminRow label="Enc. Regional" value={stats.encRegional} />
          <AdminRow label="Enc. Local" value={stats.encLocal} />
          <AdminRow label="Examinadoras" value={stats.examinadoras} />
          <AdminRow label="Ministério" value={stats.ministerio} />
          <hr className="border-gray-50 my-2" />
          <AdminRow label="Músicos" value={stats.musicos} color="text-blue-600" />
          <AdminRow label="Organistas" value={stats.organistas} color="text-purple-600" />
          <AdminRow label="Irmandade" value={stats.irmandade} color="text-red-600" />
          <div className="pt-6 mt-4 border-t border-gray-900 flex justify-between items-end">
            <span className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">TOTAL GERAL</span>
            <span className="text-4xl font-black text-gray-900 leading-none">{stats.musicos + stats.organistas + stats.irmandade + stats.ministerio + stats.visitas}</span>
          </div>
        </div>
      </div>

      {/* 6. PDF EXPORT */}
      <div className="grid grid-cols-2 gap-4 px-1">
        <button className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all">
          <span className="text-3xl">📄</span>
          <p className="font-black text-gray-800 text-[10px] uppercase italic">Relatório Interno</p>
        </button>
        <button className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all">
          <span className="text-3xl text-green-600 opacity-60">📄</span>
          <p className="font-black text-gray-800 text-[10px] uppercase italic">Relatório Externo</p>
        </button>
      </div>
    </div>
  );
};

// COMPONENTES AUXILIARES
const StatCard = ({ title, value, sub, color, full }) => (
  <div className={`bg-white p-5 rounded-[2.2rem] border border-gray-100 shadow-sm flex flex-col items-center ${full ? 'col-span-2' : ''}`}>
    <p className={`text-[8px] font-black uppercase tracking-widest text-${color === 'gray' ? 'gray-400' : color + '-600'} italic`}>{title}</p>
    <p className="text-2xl font-black text-gray-800 italic my-1 leading-none">{value}</p>
    <p className="text-[8px] text-gray-300 font-bold uppercase">{sub}</p>
  </div>
);

const EquilibrioRow = ({ label, data, totalGeral, refVal, isSub }) => {
  const total = data?.total || 0;
  const percGeral = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end leading-none">
        <span className={`${isSub ? 'text-[10px]' : 'text-xs'} font-black text-gray-700 uppercase italic`}>{label}</span>
        <span className="text-xs font-black text-gray-800 italic">{percGeral}% {!isSub && <small className="text-gray-300 font-normal">({refVal})</small>}</span>
      </div>
      <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${isSub ? 'bg-gray-400' : 'bg-blue-600'} transition-all duration-1000`} style={{ width: `${percGeral}%` }} />
      </div>
      {/* GRÁFICO DE BARRAS DA PROPORÇÃO (COMUM X VISITA) */}
      <div className="space-y-1 mt-1">
        <OriginBar label1="Comum" val1={data?.comum || 0} label2="Visitas" val2={total - (data?.comum || 0)} />
      </div>
    </div>
  );
};

const OriginBar = ({ label1, val1, label2, val2 }) => {
  const total = val1 + val2;
  const p1 = total > 0 ? (val1 / total) * 100 : 0;
  const p2 = total > 0 ? (val2 / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-100">
        <div className="bg-blue-500 h-full" style={{ width: `${p1}%` }} />
        <div className="bg-gray-300 h-full" style={{ width: `${p2}%` }} />
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[7px] font-bold text-gray-400 uppercase">{label1} {p1.toFixed(0)}%</span>
        <span className="text-[7px] font-bold text-gray-400 uppercase text-right">{label2} {p2.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const AdminRow = ({ label, value, color = "text-gray-400" }) => (
  <div className="flex justify-between items-center py-0.5">
    <span className={`text-[11px] font-black uppercase tracking-wide italic ${color} leading-none`}>{label}:</span>
    <span className="text-sm font-black text-gray-800 italic leading-none">{value}</span>
  </div>
);

export default DashPage;