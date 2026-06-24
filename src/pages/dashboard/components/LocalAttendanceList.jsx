import React, { useState, useMemo } from 'react'; // [Funcionamento]: Traz hooks do React para controle de estados e travar computações pesadas em RAM.
import { Search, Music, UserCheck, ShieldAlert, Award, X, Percent, Lock } from 'lucide-react'; // [Funcionamento]: Ícones do Lucide para ilustrar seções, alertas, travas e botões.
import { AnimatePresence, motion } from 'framer-motion'; // [Funcionamento]: Framer Motion para acionar transições suaves e modais premium.

/**
 * COMPONENTE: LocalAttendanceList v5.2 (RESILIENT SECURITY EDITION)
 * Objetivo: Exibir o Heatmap anual condensado com iniciais de meses e validação flexível de nível de poder (gem_local).
 */
const LocalAttendanceList = ({ events = [], userLevel = 'basico' }) => {
  const [searchTerm, setSearchTerm] = useState(''); // Guarda a string digitada na caixa de busca por nome.
  const [selectedSection, setSelectedSection] = useState('ALL'); // Armazena a seção de filtro ativa (Orquestra, Órgão, etc.).
  const [selectedMusico, setSelectedMusico] = useState(null); // Controla o músico selecionado para exibição da ficha técnica no modal.
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ano sob análise no heatmap.

  // 🚀 CORREÇÃO CIRÚRGICA: Transforma a checagem em busca parcial (.includes). Se contiver 'gem' ou 'local', o Victor entra na hora!
  const isAuthorized = useMemo(() => {
    const lvl = String(userLevel || 'basico').toLowerCase().trim();
    return lvl.includes('master') || 
           lvl.includes('comissao') || 
           lvl.includes('regional') || 
           lvl.includes('local') || 
           lvl.includes('gem');
  }, [userLevel]);

  // Iniciais dos meses compactadas para o alinhamento da régua superior
  const iniciaisMeses = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  // PROCESSAMENTO EM RAM: Transforma os ensaios do ano em uma caderneta anual matricial compacta
  const orchestraMatrix = useMemo(() => {
    if (!isAuthorized) return []; // Se não for autorizado, bloqueia o processamento em memória para poupar hardware.
    
    const registry = {};

    const yearEvents = events.filter(ev => {
      if (!ev.date) return false;
      const evYear = new Date(ev.date).getFullYear() || parseInt(ev.date.substring(0, 4));
      return evYear === parseInt(selectedYear);
    });

    yearEvents.forEach(ev => {
      const list = ev.musicosPresentesLista || ev.ata?.presencaLocalFull || [];
      const evMonth = ev.date ? new Date(ev.date).getMonth() : (ev.date ? parseInt(ev.date.substring(5, 7)) - 1 : -1);

      if (evMonth < 0 || evMonth > 11) return;

      list.forEach(p => {
        if (!p || !p.nome) return; 
        const cleanName = String(p.nome).trim();
        if (!cleanName) return;
        
        const instId = String(p.instrumentoId || '').toLowerCase().trim();
        const instNome = String(p.instrumentoNome || 'SOLISTA').toUpperCase().trim();
        let section = 'CORDAS'; 

        if (instId === 'orgao' || instId === 'órgão' || instNome.includes('ORGANISTA') || instNome === 'ÓRGÃO') {
          section = 'ÓRGÃO';
        } else if (instId === 'acordeon' || instNome.includes('ACORDEON') || instNome.includes('TECLA')) {
          section = 'TECLAS';
        } else if (instId.startsWith('sax') || instNome.includes('SAX')) {
          section = 'SAXOFONES';
        } else if (
          ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufônio', 'tuba', 'flugelhorn', 'flugel'].includes(instId) || 
          instNome.includes('TROMPETE') || instNome.includes('TROMBONE') || instNome.includes('TROMPA') || 
          instNome.includes('TUBA') || instNome.includes('METAL') || instNome.includes('METAIS') || instNome.includes('EUFÔNIO')
        ) {
          section = 'METAIS';
        } else if (
          ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'claronealto', 'claronebaixo', 'corneingles'].includes(instId) || 
          instNome.includes('CLARINETE') || instNome.includes('FLAUTA') || instNome.includes('OBOÉ') || 
          instNome.includes('FAGOTE') || instNome.includes('MADEIRA') || instNome.includes('CLARONE')
        ) {
          section = 'MADEIRAS';
        } else if (
          ['vln', 'vla', 'vcl', 'cbx', 'violino', 'viola', 'violoncelo', 'contrabaixo'].includes(instId) || 
          instNome.includes('VIOLINO') || instNome.includes('VIOLA') || instNome.includes('CELLO') || 
          instNome.includes('VIOLONCELO') || instNome.includes('CONTRABAIXO') || instNome.includes('CORDA')
        ) {
          section = 'CORDAS';
        }

        if (!registry[cleanName]) {
          registry[cleanName] = {
            name: cleanName,
            section: section,
            instrument: instNome,
            situacao: p.situacao || 'Músico Local',
            monthsStatus: Array(12).fill(null), 
            totalEnsaioNoAno: 0,
            presencesCount: 0
          };
        }

        if (registry[cleanName].monthsStatus[evMonth] === null) {
          registry[cleanName].monthsStatus[evMonth] = false;
        }

        if (p.presente === true) {
          registry[cleanName].monthsStatus[evMonth] = true;
        }
      });
    });

    return Object.values(registry).map(musico => {
      let consecutiveAbsences = 0;
      let maxConsecutiveAbsences = 0;
      let monthsWithEnsaio = 0;
      let presences = 0;

      musico.monthsStatus.forEach(status => {
        if (status !== null) {
          monthsWithEnsaio++;
          if (status === false) {
            consecutiveAbsences++;
            maxConsecutiveAbsences = Math.max(maxConsecutiveAbsences, consecutiveAbsences);
          } else {
            presences++;
            consecutiveAbsences = 0; 
          }
        }
      });

      return {
        ...musico,
        presencesCount: presences,
        totalEnsaioNoAno: monthsWithEnsaio,
        attendanceRate: monthsWithEnsaio > 0 ? Math.round((presences / monthsWithEnsaio) * 100) : 0,
        isEvasionRisk: maxConsecutiveAbsences >= 3 
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  }, [events, selectedYear, isAuthorized]);

  // Menu superior fixo com Órgão na segunda posição imediata
  const sectionsMenu = ['ALL', 'ÓRGÃO', 'CORDAS', 'MADEIRAS', 'SAXOFONES', 'METAIS', 'TECLAS'];

  // Filtros de pesquisa em tempo real
  const filteredMusicos = useMemo(() => {
    return orchestraMatrix.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSection = selectedSection === 'ALL' || m.section === selectedSection;
      return matchSearch && matchSection;
    });
  }, [orchestraMatrix, searchTerm, selectedSection]);

  // TELA DE BLOQUEIO LOCALIZADA: Se o usuário for básico, barra exclusivamente esta aba com card amigável
  if (!isAuthorized) {
    return (
      <div className="w-full py-10 bg-white border border-slate-100 rounded-[2.5rem] p-6 flex flex-col items-center text-center shadow-sm animate-fadeIn">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-3">
          <Lock size={18} />
        </div>
        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider italic">Visualização Restrita</h4>
        <p className="text-xs text-slate-400 font-bold mt-1 leading-relaxed max-w-[220px]">
          A visualização é exclusiva para a Liderança Musical.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full min-w-0 text-left">
      
      {/* SEÇÃO 1: PESQUISA TEXTUAL + SELETOR DE ANO */}
      <div className="flex gap-3 w-full items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar músico da comum..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
        
        <div className="h-12 bg-white border border-slate-100 px-3 rounded-2xl shadow-sm flex flex-col justify-center min-w-[75px] shrink-0">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight -mb-0.5">Ano</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            className="bg-transparent font-black text-xs text-slate-800 outline-none appearance-none cursor-pointer"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* SEÇÃO 2: ABAS FIXAS SUPERIORES */}
      <div className="w-full overflow-x-auto scrollbar-none flex items-center gap-2 pb-1 shrink-0 -mx-4 px-4">
        {sectionsMenu.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`h-11 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all shrink-0 flex items-center justify-center cursor-pointer ${
              selectedSection === sec
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {sec === 'ALL' ? 'Orquestra' : sec}
          </button>
        ))}
      </div>

      {/* SEÇÃO 3: CABEÇALHO TABULAR DA CHAMADA */}
      <div className="flex justify-between items-center px-2.5 h-0 bg-slate-100/60 rounded-xl border border-slate-200/30">
        <span className="text-[13px] font-black uppercase text-slate-400 tracking-wider">Corpo Musical</span>
        
        <div className="flex items-center justify-between gap-[3px] w-full max-w-[205px] shrink-0 px-[4px]">
          {iniciaisMeses.map((letra, idx) => (
            <span key={idx} className="w-[13px] text-center text-[15px] font-black text-slate-400 select-none">
              {letra}
            </span>
          ))}
        </div>
      </div>

      {/* SEÇÃO 4: HISTÓRICO EM HEATMAP MATRICIAL MOBILE */}
      <div className="space-y-2 w-full">
        {filteredMusicos.length > 0 ? (
          filteredMusicos.map((musico, index) => (
            <div
              key={index}
              onClick={() => setSelectedMusico(musico)}
              className={`w-full min-h-[3.75rem] bg-white border rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 min-w-0 transition-all active:bg-slate-50 cursor-pointer ${
                musico.isEvasionRisk 
                  ? 'border-l-4 border-l-red-500 border-slate-100' 
                  : 'border-slate-100'
              }`}
            >
              <div className="w-[42%] min-w-0 text-left">
                <h4 className="text-xs font-black text-slate-800 truncate tracking-tight uppercase">
                  {musico.name}
                </h4>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate block">
                  {musico.instrument}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-between gap-[3px] max-w-[210px] shrink-0">
                {musico.monthsStatus.map((status, mIdx) => (
                  <div
                    key={mIdx}
                    className={`w-[14px] h-[22px] rounded-[4px] flex flex-col items-center justify-center text-[8px] font-black transition-all ${
                      status === true
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100' 
                        : status === false
                        ? 'bg-red-400 text-white shadow-sm shadow-red-100' 
                        : 'border border-dashed border-slate-200 bg-slate-50 text-slate-300' 
                    }`}
                  >
                    {status === true ? 'P' : status === false ? 'A' : '-'}
                  </div>
                ))}
              </div>

            </div>
          ))
        ) : (
          <div className="w-full py-12 bg-white border border-slate-100 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-6 text-center">
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">Nenhum registro encontrado</h5>
            <p className="text-xs text-slate-400 mt-1 font-medium max-w-[200px]">Sem dados para exibir com os critérios atuais.</p>
          </div>
        )}
      </div>

      {/* SEÇÃO 5: MODAL DA FICHA TÉCNICA DETALHADA DO MÚSICO */}
      <AnimatePresence>
        {selectedMusico && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedMusico(null)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 24, stiffness: 350 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative z-10 border border-slate-100 flex flex-col gap-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-blue-600">
                  <Award size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 italic">Ficha do Membro</h3>
                </div>
                <button 
                  onClick={() => setSelectedMusico(null)} 
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-pointer active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Nome do Músico</span>
                  <p className="text-sm font-black text-slate-800 uppercase break-words">{selectedMusico.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Naipe</span>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-tight">{selectedMusico.section}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Instrumento</span>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">{selectedMusico.instrument}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Situação Atual</span>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{selectedMusico.situacao}</p>
                  </div>
                  
                  <div className={`p-3 rounded-2xl border ${
                    selectedMusico.isEvasionRisk 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    <span className="text-[9px] font-black opacity-60 uppercase tracking-wider block mb-0.5">Assiduidade Anual</span>
                    <div className="flex items-center gap-1 font-black text-xs">
                      <Percent size={12} className="shrink-0" />
                      <span>{selectedMusico.attendanceRate}%</span>
                    </div>
                  </div>
                </div>

                {selectedMusico.isEvasionRisk && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-2.5 text-left items-start">
                    <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[11px] font-black text-red-800 uppercase tracking-tight">Risco Crítico de Afastamento</h5>
                      <p className="text-[11px] text-red-600/90 font-bold mt-0.5 leading-snug">
                        Este irmão faltou a 3 ou mais ensaios consecutivos nos meses ativos. Sugere-se uma visita preventiva.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LocalAttendanceList;