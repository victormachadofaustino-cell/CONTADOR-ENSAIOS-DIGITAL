import React, { useMemo } from 'react'; // 💡 Importa o React e a ferramenta de cache useMemo para processar a ordenação sem custo de banco.
import { Users, CheckCircle2 } from 'lucide-react'; // 💡 Ícones de alta definição para ilustrar os naipes e os vistos de confirmação eletrônica.

const ScreenPresenca = ({ stats }) => { // 💡 Recebe as estatísticas unificadas e reativas do Maestro.

  // 🧮 COMPILADOR DE BI DE PRESENÇA (PREPARA, SEPARA E ORDENA A HIERARQUIA EM MEMÓRIA LOCAL)
  const estruturaHierarquica = useMemo(() => {
    // 💡 1. Definição das Gavetas das Famílias Oficiais (Estrutura Mestre Fixa)
    const familias = {
      CORDAS: { nome: 'Família das Cordas', instrumentos: {} },
      MADEIRAS: { nome: 'Família das Madeiras', instrumentos: {} },
      SAXOFONES: { nome: 'Família dos Saxofones', instrumentos: {} },
      METAIS: { nome: 'Família dos Metais', instrumentos: {} },
      TECLAS: { nome: 'Teclas', instrumentos: {} },
      ORGANISTAS: { nome: 'Organistas', instrumentos: {} }
    };

    if (!stats.musicosPresentesLista || !Array.isArray(stats.musicosPresentesLista)) {
      return [];
    }

    // 🔍 2. ALGORITMO DE TRIAGEM ROBUSTO: Classifica por IDs rígidos e strings estáticas na falta do campo 'section'
    stats.musicosPresentesLista.forEach(membro => {
      if (!membro.presente) return; // 🛡️ Trava de segurança: isola apenas músicos confirmados.

      const instId = (membro.instrumentoId || '').toLowerCase().trim();
      const instNome = (membro.instrumentoNome || 'SOLISTA').toUpperCase().trim();
      let familiaAlvo = ''; // Inicia vazio para validação rigorosa

      // 🎯 DICIONÁRIO DE PRECEDÊNCIA ESTÁTICA EM MEMÓRIA CACHE (À PROVA DE FALHAS DE NOVO JSON)
      
      // 🎹 Grupo 1: Órgão Eletrônico
      if (instId === 'orgao' || instId === 'órgão' || instNome.includes('ORGANISTA') || instNome === 'ÓRGÃO') {
        familiaAlvo = 'ORGANISTAS';
      } 
      // 🪗 Grupo 2: Teclas (Acordeon Isolado)
      else if (instId === 'acordeon' || instNome.includes('ACORDEON') || instNome.includes('TECLA')) {
        familiaAlvo = 'TECLAS';
      } 
      // 🎷 Grupo 3: Saxofones (Precisam interceptar antes das madeiras/metais)
      else if (instId.startsWith('sax') || instNome.includes('SAX')) {
        familiaAlvo = 'SAXOFONES';
      } 
      // 🎺 Grupo 4: Metais (Proteção Total para Trompete, Trombone, Trompa, Tuba e Flugel)
      else if (
        ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufônio', 'tuba', 'flugelhorn', 'flugel'].includes(instId) || 
        instNome.includes('TROMPETE') || instNome.includes('TROMBONE') || instNome.includes('TROMPA') || 
        instNome.includes('TUBA') || instNome.includes('METAL') || instNome.includes('METAIS') || instNome.includes('EUFÔNIO')
      ) {
        familiaAlvo = 'METAIS'; // 🛡️ O Trompete ('tpt') fica blindado aqui e nunca mais vaza para as cordas.
      } 
      // 🥖 Grupo 5: Madeiras (Proteção Total para Flauta, Clarinete, Oboé, Fagote e Claronones)
      else if (
        ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'claronealto', 'claronebaixo', 'corneingles'].includes(instId) || 
        instNome.includes('CLARINETE') || instNome.includes('FLAUTA') || instNome.includes('OBOÉ') || 
        instNome.includes('FAGOTE') || instNome.includes('MADEIRA') || instNome.includes('CLARONE')
      ) {
        familiaAlvo = 'MADEIRAS'; // 🛡️ O Clarinete ('clt') fica blindado aqui, caindo na gaveta correta de sopros.
      } 
      // 🎻 Grupo 6: Cordas (Violino, Viola, Violoncelo e Contrabaixo)
      else if (
        ['vln', 'vla', 'vcl', 'cbx', 'violino', 'viola', 'violoncelo', 'contrabaixo'].includes(instId) || 
        instNome.includes('VIOLINO') || instNome.includes('VIOLA') || instNome.includes('CELLO') || 
        instNome.includes('VIOLONCELO') || instNome.includes('CONTRABAIXO') || instNome.includes('CORDA')
      ) {
        familiaAlvo = 'CORDAS';
      } 
      else {
        // Fallback de contingência extrema: Se for um instrumento exótico não mapeado, joga em Cordas para não sumir do mapa
        familiaAlvo = 'CORDAS';
      }

      // 💡 Inicializa o nó do instrumento específico (ex: "SAX ALTO") se ele ainda não existir na família
      if (!familias[familiaAlvo].instrumentos[instNome]) {
        familias[familiaAlvo].instrumentos[instNome] = [];
      }
      
      // Encaixa o irmão na subcategoria do instrumento específico
      familias[familiaAlvo].instrumentos[instNome].push(membro);
    });

    // 🏎️ 3. PROCESSADOR ALFABÉTICO DE TRIPLICE CAMADA: Organiza os nomes dos músicos dentro de cada instrumento
    const resultadoFormatado = [];

    Object.keys(familias).forEach(chaveFamilia => {
      const familia = familias[chaveFamilia];
      const listaInstrumentos = Object.keys(familia.instrumentos);

      if (listaInstrumentos.length > 0) {
        const instrumentosOrdenados = [];

        listaInstrumentos.forEach(nomeInstrumento => {
          const musicosDesteInst = familia.instrumentos[nomeInstrumento];
          
          // Ordena os irmãos por nome em ordem alfabética estrita (A-Z)
          musicosDesteInst.sort((a, b) => {
            const nomeA = (a.nome || '').toUpperCase();
            const nomeB = (b.nome || '').toUpperCase();
            return nomeA.localeCompare(nomeB, 'pt-BR'); // 💡 Trata corretamente acentuações nativas.
          });

          instrumentosOrdenados.push({
            nome: nomeInstrumento,
            musicos: musicosDesteInst
          });
        });

        // Ordena os nomes dos instrumentos alfabeticamente dentro da família (ex: Clarinete antes de Flauta)
        instrumentosOrdenados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        resultadoFormatado.push({
          id: chaveFamilia,
          titulo: familia.nome,
          instrumentos: instrumentosOrdenados
        });
      }
    });

    return resultadoFormatado;
  }, [stats.musicosPresentesLista]);

  // 📐 CONTADOR RÁPIDO DE CABEÇALHO
  const totalPresentes = stats.musicosPresentesLista?.filter(m => m.presente === true).length || 0;

  return (
    <div className="space-y-4 animate-fadeIn text-left w-full">
      
      {/* 📋 CARD INFORMATIVO DE VOLUMETRIA DE PORTARIA */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/70 shadow-xs flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-indigo-600" />
          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider italic">Lista de Chamada Nominal</span>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-lg text-[10px] select-none">
          {totalPresentes} CONFIRMADOS
        </span>
      </div>

      {/* 🧱 ARQUITETURA VERTICAL TRIPLAMENTE HIERARQUIZADA (FAMÍLIA ➔ INSTRUMENTO ➔ NOME) */}
      {estruturaHierarquica.length > 0 ? (
        estruturaHierarquica.map((familia) => (
          <div key={familia.id} className="space-y-3 bg-slate-100/40 p-3 rounded-[2rem] border border-slate-200/40 animate-fadeIn">
            
            {/* 🏷️ CAMADA 1: Título de Família (Naipe Geral) */}
            <div className="flex items-center gap-2 px-1 select-none">
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider italic">{familia.titulo}</span>
              <div className="h-px bg-slate-300 flex-1" />
            </div>

            {/* 🎺 CAMADA 2: Instrumento Específico (Naipe Unitário) */}
            <div className="space-y-3">
              {familia.instrumentos.map((instrumento) => (
                <div key={instrumento.nome} className="space-y-1">
                  
                  <div className="flex justify-between items-center px-2 select-none">
                    <span className="text-[9px] font-bold text-slate-400 tracking-tight uppercase">
                      {instrumento.nome}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-sm">
                      {instrumento.musicos.length}
                    </span>
                  </div>

                  {/* 👤 CAMADA 3: Lista de Músicos daquele Instrumento (Alinhamento Vertical Stacking Mobile-First) */}
                  <div className="space-y-1">
                    {instrumento.musicos.map((membro, idxMusico) => (
                      <div 
                        key={membro.id || idxMusico} 
                        className="bg-white px-4 py-3 rounded-xl border border-slate-200/60 shadow-xs flex justify-between items-center min-h-[44px] hover:border-slate-300 transition-colors"
                      >
                        <div className="truncate text-left flex-1 pr-2">
                          <span className="text-[11px] font-black text-slate-950 block tracking-tight uppercase truncate max-w-[240px]">
                            {membro.nome}
                          </span>
                        </div>
                        {/* Check de Confirmação Eletrônica Estável */}
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 select-none ml-2" />
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>

          </div>
        ))
      ) : (
        // 📭 TELA DE MENSAGEM DE FALLBACK SE NINGUÉM ESTIVER PRESENTE
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/70 text-center flex flex-col items-center justify-center min-h-[140px]">
          <span className="text-slate-400 font-bold text-xs normal-case max-w-[240px] block leading-relaxed">
            Nenhum músico local foi confirmado ou marcado como presente nesta ata até o momento.
          </span>
        </div>
      )}

    </div>
  );
};

export default ScreenPresenca;