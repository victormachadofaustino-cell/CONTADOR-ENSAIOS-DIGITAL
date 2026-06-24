import React, { useMemo, useState, useEffect } from 'react'; // 💡 Importa as ferramentas oficiais do React para gerenciar memória, estados e efeitos de escuta.
import { useAuth } from '../../context/AuthContext'; // 💡 Conecta ao sistema de login para ler o "Crachá Eletrônico" (Custom Claims) do usuário ativo.
import { hasPermission } from '../../config/permissions'; // 💡 Importa a tabela de segurança para decidir quem pode exportar relatórios.
import { pdfEventService } from '../../services/pdfEventService'; // 💡 Importa o serviço responsável por construir o documento impresso em PDF.
import { whatsappService } from '../../services/whatsappService'; // 💡 Importa o formatador automatizado de mensagens para o WhatsApp.
import { db } from '../../config/firebase'; // 💡 Conexão cirúrgica com o banco de dados sem requisições redundantes.
import { collection, onSnapshot } from 'firebase/firestore'; // 💡 Importa o escutador em tempo real e o direcionador de coleções do Firebase.
import toast from 'react-hot-toast'; // 💡 Importa o sistema de balões de aviso flutuantes para a interface.
import { LayoutGrid, ClipboardList, Scale, PieChart, FileText, Share2 } from 'lucide-react'; // 💡 Importa os ícones do menu de navegação do carrossel, o ícone de arquivo e o ícone de compartilhar.
import { AnimatePresence, motion } from 'framer-motion'; // 💡 Motor de animação para transições suaves de deslize entre as telas.

// 📦 IMPORTAÇÃO DAS 4 TELAS ESPECIALIZADAS E DESMEMBRADAS
import ScreenGeral from './components/ScreenGeral.jsx'; // 💡 Importa a Tela 1: Cards Interativos e Gráficos Históricos.
import ScreenPresenca from './components/ScreenPresenca.jsx'; // 💡 Importa a Tela 2: Trilho de Chamada Nominal de Presentes.
import ScreenEquilibrio from './components/ScreenEquilibrio.jsx'; // 💡 Importa a Tela 3: Distribuição e Porcentagem de Naipes.
import ScreenResumo from './components/ScreenResumo.jsx'; // 💡 Importa a Tela 4: Painel da Copa e Conclusão Operacional.

const DashEventPage = ({ counts, ataData, isAdmin, eventId, allEvents = [] }) => { // 💡 Início do componente Maestro que gerencia o painel do ensaio.
  const { userData } = useAuth(); // 💡 Recupera o Crachá Eletrônico do usuário conectado de forma local (Custo Zero de cota).
  
  // 🛡️ VALIDAÇÃO DE PERMISSÃO EM TEMPO REAL
  const canExport = hasPermission(userData, 'generate_report', ataData?.scope); // 💡 Valida se o crachá do usuário permite emitir relatórios.

  const [currentScreen, setCurrentScreen] = useState('geral'); // 💡 Estado que controla qual aba do carrossel está ativa.
  const [activeModal, setActiveModal] = useState(null); // 💡 Estado global que gerencia qual modal de Drilldown está aberto centralizado na tela.

  const isBasico = userData?.isBasico; // 💡 Verifica se é um usuário com acesso básico de consulta.

  // 📡 PONTE REATIVA DE PRESENÇA (CAPTURA A SUBCOLEÇÃO DO FIRESTORE EM TEMPO REAL)
  const [chamadaNominal, setChamadaNominal] = useState([]); // 💡 Estado local que guardará a lista de chamada vinda de chamada_musicos.

  useEffect(() => {
    if (!eventId) return; // 💡 Trava de segurança caso o identificador do evento não seja carregado na inicialização.

    // 🎯 Mira diretamente na subcoleção do evento atual para não misturar dados
    const chamadaRef = collection(db, 'events_global', eventId, 'chamada_musicos');

    // 🏎️ Escuta reativa em tempo real com custo zero de re-consultas na navegação de abas
    const unsubscribe = onSnapshot(chamadaRef, (snapshot) => {
      const listaMusicos = []; // 💡 Cria a gaveta vazia temporária para receber os músicos da portaria.
      snapshot.forEach((docSnap) => { // 💡 Varre documento por documento reativamente.
        const dados = docSnap.data(); // 💡 Puxa o JSON puro interno do Firestore.
        listaMusicos.push({
          id: docSnap.id, // 💡 Carimba a ID única gerada pelo Firebase.
          nome: dados.nome || '', // 💡 Salva o nome do irmão oficializado ou em ensaio.
          instrumentoNome: dados.instrumentoNome || 'SOLISTA', // 💡 Resgata o nome por extenso do naipe dele.
          presente: dados.presente === true // 💡 Força o booleano seguro
        });
      });
      setChamadaNominal(listaMusicos); // 💡 Atualiza a esteira de presença dinamicamente
    }, (error) => {
      console.error("Erro na escuta da chamada:", error); // 💡 Emite alerta no console se houver perda de autenticação no Firebase.
    });

    return () => unsubscribe(); // 💡 Desliga a escuta ao fechar o painel para proteger a bateria e a cota de dados.
  }, [eventId]); // 💡 Monitora re-atualizações baseadas estritamente se o ID do ensaio mudar.

  // ⚡ COMPILADOR MATEMÁTICO INTEGRADO (PROCESSA TUDO EM MEMÓRIA LOCAL SEM CUSTO DE COTA - DENORMALIZADO)
  const stats = useMemo(() => { // 💡 useMemo retém os cálculos em cache e só reprocessa se os dados mudarem fisicamente.
    const totals = { 
      geral: 0, orquestra: 0, musicos: 0, organistas: 0, irmandade: 0, 
      irmaos: 0, irmas: 0, hinos: 0, visitas_total: 0, ministerio_oficio: 0,
      cordas: 0, cordasComum: 0, cordasVisita: 0,
      madeiras: 0, madeirasComum: 0, madeirasVisita: 0,
      metais: 0, metaisComum: 0, metaisVisita: 0,
      saxofones: 0, saxofonesComum: 0, saxofonesVisita: 0,
      teclas: 0, teclasComum: 0, teclasVisita: 0,
      organistasComum: 0, organistasVisita: 0,
      musicosComum: 0, musicosVisita: 0,
      encRegionalComum: 0, encRegionalVisita: 0, encLocalComum: 0, encLocalVisita: 0,
      encTotal: 0, examinadorasComum: 0, examinadorasVisita: 0, examinadorasTotal: 0,
      hinosP1: [], hinosP2: [],
      deltaGeral: 0, deltaOrquestra: 0, deltaCoral: 0, deltaHinos: 0, deltaEncarregados: 0,
      musicosPresentesLista: chamadaNominal, 
      historicoGrafico: [] 
    };

    if (counts) {
      Object.entries(counts).forEach(([id, data]) => {
        if (id.startsWith('meta_')) return;
        const valTotal = parseInt(data.total) || 0;
        const valComum = parseInt(data.comum) || 0;
        const valVisita = Math.max(0, valTotal - valComum);
        const section = (data.section || "GERAL").toUpperCase();
        const saneId = id.toLowerCase();

        if (saneId === 'coral' || section === 'IRMANDADE' || saneId.includes('irmandade') || saneId.includes('irmao') || saneId.includes('irma')) { 
          const irmaosCount = parseInt(data.irmaos) || 0; 
          const irmasCount = parseInt(data.irmas) || 0; 
          totals.irmaos += irmaosCount; 
          totals.irmas += irmasCount; 
          totals.irmandade += (irmaosCount + irmasCount); 
        } else if (section === 'ORGANISTAS' || saneId === 'orgao' || saneId === 'org') { 
          totals.organistas += valTotal; 
          totals.organistasComum += valComum;
          totals.organistasVisita += valVisita;
        } else { 
          totals.musicos += valTotal; 
          totals.musicosComum += valComum;
          totals.musicosVisita += valVisita;

          if (['vln', 'vla', 'vcl', 'violino', 'viola', 'violoncelo', 'contrabaixo'].includes(saneId) || section.includes('CORDA')) {
            totals.cordas += valTotal; totals.cordasComum += valComum; totals.cordasVisita += valVisita;
          } else if (section.includes('SAX')) {
            totals.saxofones += valTotal; totals.saxofonesComum += valComum; totals.saxofonesVisita += valVisita;
          } else if (section.includes('MADEIRA') || ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete'].includes(saneId)) {
            totals.madeiras += valTotal; totals.madeirasComum += valComum; totals.madeirasVisita += valVisita;
          } else if (section.includes('METAI') || ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete'].includes(saneId)) {
            totals.metais += valTotal; totals.metaisComum += valComum; totals.metaisVisita += valVisita;
          } else if (saneId === 'acordeon') {
            totals.teclas += valTotal; totals.teclasComum += valComum; totals.teclasVisita += valVisita;
          }
        }
      });
    }

    const processarPessoasAta = (lista, isVisitante = false) => { 
      if (!lista || !Array.isArray(lista)) return;
      lista.forEach(p => {
        const cargo = (p.min || p.role || "");
        if (isVisitante) totals.visitas_total++;
        
        if (cargo === 'Encarregado Regional') {
          if (isVisitante) totals.encRegionalVisita++; else totals.encRegionalComum++;
        }
        if (cargo === 'Encarregado Local') {
          if (isVisitante) totals.encLocalVisita++; else totals.encLocalComum++;
        }
        if (cargo === 'Examinadora') {
          if (isVisitante) totals.examinadorasVisita++; else totals.examinadorasComum++;
          totals.examinadorasTotal++;
        }
        if (['Ancião', 'Diácono', 'Cooperador do Ofício', 'Cooperador RJM'].includes(cargo)) {
          totals.ministerio_oficio++;
        }
      });
    };

    processarPessoasAta(ataData?.presencaLocalFull, false); 
    processarPessoasAta(ataData?.visitantes, true); 

    totals.orquestra = totals.musicos + totals.organistas; 
    totals.geral = totals.orquestra + totals.irmandade; 
    totals.encTotal = totals.encRegionalComum + totals.encRegionalVisita + totals.encLocalComum + totals.encLocalVisita; 

    if (ataData?.partes) { 
      const p1Obj = ataData.partes.find(p => p.label?.includes('1ª') || p.id === 'parte_1');
      if (p1Obj) totals.hinosP1 = p1Obj.hinos?.filter(h => h && h.trim() !== '') || [];
      const p2Obj = ataData.partes.find(p => p.label?.includes('2ª') || p.id === 'parte_2');
      if (p2Obj) totals.hinosP2 = p2Obj.hinos?.filter(h => h && h.trim() !== '') || [];
      totals.hinos = totals.hinosP1.length + totals.hinosP2.length;
    }

    if (allEvents && allEvents.length > 0 && ataData?.comumId) {
      const atualCreatedAt = ataData?.createdAt || Date.now();

      const eventos2026 = allEvents 
        .filter(ev => ev.comumId === ataData.comumId && ev.createdAt && ev.createdAt <= atualCreatedAt) 
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); 

      eventos2026.forEach((ev) => {
        let totalEv = 0; let orqEv = 0; let comEv = 0; let visEv = 0;
        if (ev.counts) {
          Object.entries(ev.counts).forEach(([id, d]) => {
            if (id.startsWith('meta_')) return;
            const t = parseInt(d.total) || 0;
            const c = parseInt(d.comum) || 0;
            const s = (d.section || "").toUpperCase();
            const sid = id.toLowerCase();
            
            if (sid === 'coral' || s === 'IRMANDADE' || sid.includes('irmandade') || sid.includes('irmao') || sid.includes('irma')) {
              totalEv += ((parseInt(d.irmaos) || 0) + (parseInt(d.irmas) || 0));
            } else {
              totalEv += t;
              orqEv += t;
              comEv += c; 
              visEv += Math.max(0, t - c); 
            }
          });
        }
        const dataFormatada = ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }) : '---'; 
        totals.historicoGrafico.push({
          name: dataFormatada.toUpperCase().replace('.', ''),
          público: totalEv,
          orquestra: orqEv,
          orquestraComum: comEv, 
          visitantesApoio: visEv  
        });
      });

      if (!eventos2026.some(e => e.id === eventId)) {
        totals.historicoGrafico.push({ 
          name: 'ATUAL', 
          público: totals.geral, 
          orquestra: totals.orquestra,
          orquestraComum: totals.musicosComum + totals.organistasComum,
          visitorsApoio: totals.musicosVisita + totals.organistasVisita
        });
      }

      const ensaiosPassados = allEvents
        .filter(ev => ev.comumId === ataData.comumId && ev.id !== eventId && ev.createdAt && ev.createdAt < atualCreatedAt) 
        .sort((a, b) => (a.createdAt || 0) - (a.createdAt || 0)); 

      const uEnsaio = ensaiosPassados[0]; 
      if (uEnsaio) {
        let uOrq = 0; let uCoral = 0; let uHinos = 0; let uEnc = 0; 
        
        if (uEnsaio.counts) { 
          Object.entries(uEnsaio.counts).forEach(([id, d]) => {
            if (id.startsWith('meta_')) return;
            const t = parseInt(d.total) || 0;
            const s = (d.section || "").toUpperCase();
            const sid = id.toLowerCase();
            
            if (sid === 'coral' || s === 'IRMANDADE' || sid.includes('irmandade') || sid.includes('irmao') || sid.includes('irma')) {
              uCoral += ((parseInt(d.irmaos) || 0) + (parseInt(d.irmas) || 0)); 
            } else {
              uOrq += t; 
            }
          });
        }
        
        if (uEnsaio.partes) {
          uHinos = uEnsaio.partes.reduce((acc, p) => acc + (p.hinos?.filter(h => h && h.trim() !== '').length || 0), 0);
        }
        
        const contarEncAntigo = (lista) => {
          if (!lista) return;
          lista.forEach(p => {
            if (['Encarregado Regional', 'Encarregado Local', 'Examinadora'].includes(p.min || p.role)) uEnc++;
          });
        };
        contarEncAntigo(uEnsaio.ata?.presencaLocalFull);
        contarEncAntigo(uEnsaio.ata?.visitantes);

        totals.deltaGeral = totals.geral - (uOrq + uCoral); 
        totals.deltaOrquestra = totals.orquestra - uOrq; 
        totals.deltaCoral = totals.irmandade - uCoral; 
        totals.deltaHinos = totals.hinos - uHinos; 
        totals.deltaEncarregados = totals.encTotal - uEnc; 
      }
    }

    return totals; 
  }, [counts, ataData, allEvents, eventId, chamadaNominal]);

  // 🎯 CORREÇÃO DE PONTE COMPACTA DE LANCHES (WHATSAPP): Aciona o método real de montagem de strings
  const handleShareLanche = () => {
    if (!counts) return toast.error('Dados de contagem indisponíveis'); // 💡 Bloqueia se o barramento estiver vazio.
    if (whatsappService && typeof whatsappService.obterTextoAlimentacao === 'function') { // 💡 Valida se a função de strings está pronta.
      const msg = whatsappService.obterTextoAlimentacao({ counts, date: ataData?.date, scope: ataData?.scope, comumNome: ataData?.comumNome }, stats); // 🚀 Compila o texto oficial do lanche da portaria.
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank'); // 🚀 Dispara no navegador para o celular abrir o App.
    } else {
      toast.error('Serviço de compartilhamento pendente de carregamento'); // 💡 Mensagem de fallback seguro.
    }
  };

  // 🎯 CORREÇÃO DE PONTE COMPACTA ESTATÍSTICA (WHATSAPP): Aciona o método real de montagem de strings
  const handleShareEstatistico = () => {
    if (!counts) return toast.error('Dados estatísticos indisponíveis'); // 💡 Bloqueia se a volumetria estiver vazia.
    if (whatsappService && typeof whatsappService.obterTextoEstatistico === 'function') { // 💡 Valida se a função de strings está pronta.
      const msg = whatsappService.obterTextoEstatistico({ counts, date: ataData?.date, scope: ataData?.scope, comumNome: ataData?.comumNome }, stats); // 🚀 Compila o texto estatístico oficial.
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank'); // 🚀 Dispara no navegador para o celular abrir o App.
    } else {
      toast.error('Serviço estatístico pendente de carregamento'); // 💡 Mensagem de fallback seguro.
    }
  };

  // 🎯 CORREÇÃO DE PONTE DO PDF ORIGINAL: Conecta diretamente ao método 'generateAtaEnsaio' descoberto no arquivo
  const handleGeneratePDF = async () => {
    try {
      if (pdfEventService && typeof pdfEventService.generateAtaEnsaio === 'function') { // 💡 Valida o nome exato do método da classe.
        await pdfEventService.generateAtaEnsaio(stats, ataData, userData, counts, ataData); // 🚀 Invoca passando os 5 barramentos de dados estruturados exigidos.
        toast.success('PDF gerado com sucesso!'); // 💡 Balão informativo de sucesso.
      } else {
        toast.error('Serviço de PDF pendente de carregamento'); // 💡 Alerta caso a função falte.
      }
    } catch (error) {
      console.error(error); // 💡 Registra o rastro do erro no log.
      toast.error('Erro ao gerar relatório em PDF'); // 💡 Balão informativo de erro na compilação.
    }
  };

  const getPerc = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"; // 💡 Função auxiliar de percentual.

  return (
    <div className="space-y-4 text-slate-900 pb-24 max-w-md mx-auto px-1">
      
      {/* 👥 SEÇÃO DE TOPO DUPLA: CARD DE ALIMENTAÇÃO + BOTÃO AZUL ORIGINAL DE PDF LADO A LADO */}
      <div className="flex gap-2 items-center w-full">
        
        {/* 🧳 CARD ESCURO DE ALIMENTAÇÃO: Cópia idêntica e sem alterações de 'image_53cee1.png' */}
        <div className="bg-slate-950 px-5 py-4 rounded-[2rem] shadow-xl border border-white/5 min-h-[76px] flex items-center overflow-hidden flex-1 text-left relative">
          <div className="w-[35%] leading-none"> {/* 💡 Alinhamento textual esquerdo exato para o título da Copa. */}
            <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1 italic">Alimentação</p> {/* 💡 Tag superior dourada. */}
            <h3 className="text-xl font-[1000] text-white uppercase italic tracking-tighter">Resumo</h3> {/* 💡 Subtítulo branco em caixa alta. */}
          </div>
          <div className="w-[42%] text-center"> {/* 💡 Coluna centralizada do indicador master. */}
            <span className="text-4xl font-[1000] text-white italic tracking-tighter leading-none">{stats.geral}</span> {/* 💡 Placar volumétrico total do evento. */}
          </div>
          <div className="w-[45%] flex gap-4 border-l border-white/10 pl-4 h-10 items-center justify-end"> {/* 💡 Setor direito de sub-totais operacionais. */}
            <div className="text-center leading-none"> {/* 💡 Caixa numérica da orquestra. */}
              <p className="text-[8px] font-black text-slate-500 uppercase italic mb-.5">Orq</p> {/* 💡 Legenda cinza. */}
              <p className="text-lg font-black text-white">{stats.orquestra}</p> {/* 💡 Contagem de lanches da orquestra. */}
            </div>
            <div className="text-center leading-none"> {/* 💡 Caixa numérica do coral. */}
              <p className="text-[8px] font-black text-slate-500 uppercase italic mb-.5">Coral</p> {/* 💡 Legenda cinza. */}
              <p className="text-lg font-black text-white">{stats.irmandade}</p> {/* 💡 Contagem de lanches do coro. */}
            </div>
            <button 
              onClick={handleShareLanche} // 💡 Gatilho reativo de envio de texto estruturado para o WhatsApp.
              className="text-emerald-500 active:scale-90 ml-1 min-w-[32px] h-8 flex items-center justify-center outline-none" // 💡 Área de clique livre de interrupções.
              aria-label="Compartilhar Lanches" // 💡 Controle de acessibilidade de tela.
            >
              <Share2 size={18} /> {/* 💡 Desenho do nó gráfico verde de compartilhamento. */}
            </button>
          </div>
        </div>

        {/* ⚡ BOTÃO DE PDF ORIGINAL RESTAURADO: Alinhamento, cor, borda e texto 100% idênticos a 'image_53d665.png' */}
        {canExport && (
          <button 
            onClick={handleGeneratePDF} // 💡 Executa a compilação do relatório impresso.
            className="bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all text-blue-600 rounded-[1.5rem] border border-blue-100 flex items-center justify-center gap-0.5 min-h-[76px] px-2.5 shadow-sm font-black text-[11px] uppercase tracking-wider shrink-0 outline-none layout-touch" // 🎯 DESIGN ATUALIZADO RIGOROSAMENTE CONFORME 'image_53d665.png'
          >
            <FileText size={16} className="text-blue-600" /> {/* 💡 Ícone técnico azul nativo da biblioteca Lucide. */}
            <span className="font-extrabold tracking-tight">PDF</span> {/* 💡 Inscrição textual pura original sem reescritas. */}
          </button>
        )}
      </div>

      {/* Carrossel de Abas Fixo */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
        <button onClick={() => setCurrentScreen('geral')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] ${currentScreen === 'geral' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400'}`}>
          <LayoutGrid size={12} /> Geral
        </button>
        <button onClick={() => setCurrentScreen('presenca')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] ${currentScreen === 'presenca' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400'}`}>
          <ClipboardList size={12} /> Presença
        </button>
        <button onClick={() => setCurrentScreen('equilibrio')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] ${currentScreen === 'equilibrio' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400'}`}>
          <Scale size={12} /> Equilíbrio
        </button>
        <button onClick={() => setCurrentScreen('resumo')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 min-h-[40px] ${currentScreen === 'resumo' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400'}`}>
          <PieChart size={12} /> Resumo
        </button>
      </div>

      {/* Janela Dinâmica */}
      <AnimatePresence mode="wait">
        {currentScreen === 'geral' && (
          <motion.div key="geral" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <ScreenGeral stats={stats} renderDelta={renderDelta} activeModal={activeModal} setActiveModal={setActiveModal} />
          </motion.div>
        )}

        {currentScreen === 'presenca' && (
          <motion.div key="presenca" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <ScreenPresenca stats={stats} />
          </motion.div>
        )}

        {currentScreen === 'equilibrio' && (
          <motion.div key="equilibrio" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <ScreenEquilibrio stats={stats} getPerc={getPerc} />
          </motion.div>
        )}

        {currentScreen === 'resumo' && (
          <motion.div key="resumo" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <ScreenResumo stats={stats} canExport={canExport} handleShareLanche={handleShareLanche} handleShareEstatistico={handleShareEstatistico} handleGeneratePDF={handleGeneratePDF} isBasico={isBasico} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

const renderDelta = (val) => {
  if (val === 0 || isNaN(val)) return <span className="text-slate-300 font-black text-sm select-none">―</span>;
  const isUp = val > 0;
  return (
    <span className={`text-[11px] font-black flex items-center select-none ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isUp ? '▲' : '▼'} {isUp ? `+${val}` : val}
    </span>
  );
};

export default DashEventPage;