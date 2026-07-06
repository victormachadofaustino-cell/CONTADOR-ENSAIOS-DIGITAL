import React, { useMemo } from 'react'; // [Funcionamento]: Importa o React e a ferramenta de cache useMemo para processar a ordenação sem custo de banco.
import { Users, CheckCircle2 } from 'lucide-react'; // [Funcionamento]: Ícones de alta definição para ilustrar os naipes e os vistos de confirmação eletrônica.

const ScreenPresenca = ({ stats }) => { // [Funcionamento]: Recebe as estatísticas unificadas e reativas do Maestro.

  // 🧮 COMPILADOR DE BI DE PRESENÇA (PREPARA, SEPARA E ORDENA A HIERARQUIA EM MEMÓRIA LOCAL)
  const estruturaHierarquica = useMemo(() => { // [Funcionamento]: Monta a árvore visual dividida em Naipes, Instrumentos e Músicos ativos.
    // 💡 1. Definição das Gavetas das Famílias Oficiais (Estrutura Mestre Fixa)
    const familias = { // [Funcionamento]: Cria os compartimentos vazios para as 6 categorias litúrgicas oficiais.
      CORDAS: { nome: 'Família das Cordas', instrumentos: {} }, // [Funcionamento]: Gaveta de cordas.
      MADEIRAS: { nome: 'Família das Madeiras', instrumentos: {} }, // [Funcionamento]: Gaveta de palhetas e flautas.
      SAXOFONES: { nome: 'Família dos Saxofones', instrumentos: {} }, // [Funcionamento]: Gaveta de saxofones.
      METAIS: { nome: 'Família dos Metais', instrumentos: {} }, // [Funcionamento]: Gaveta de bicos de metal e sopros pesados.
      TECLAS: { nome: 'Teclas', instrumentos: {} }, // [Funcionamento]: Gaveta de acordeonistas.
      ORGANISTAS: { nome: 'Organistas', instrumentos: {} } // [Funcionamento]: Gaveta exclusiva para as irmãs do órgão.
    }; // [Funcionamento]: Encerra o objeto base de famílias.

    if (!stats.musicosPresentesLista || !Array.isArray(stats.musicosPresentesLista)) { // [Funcionamento]: Trava protetora caso a lista venha nula ou vazia.
      return []; // [Funcionamento]: Retorna uma lista vazia se não houver dados.
    } // [Funcionamento]: Fecha a barreira de segurança.

    // 🔍 2. ALGORITMO DE TRIAGEM ROBUSTO: Classifica por IDs rígidos e strings estáticas na falta do campo 'section'
    stats.musicosPresentesLista.forEach(membro => { // [Funcionamento]: Passa uma varredura em cada um dos músicos listados no ensaio.
      if (!membro.presente) return; // 🛡️ Trava de segurança: isola apenas músicos confirmados.

      const instId = (membro.instrumentoId || '').toLowerCase().trim(); // [Funcionamento]: Captura a sigla identificadora em letras minúsculas.
      const instNome = (membro.instrumentoNome || 'SOLISTA').toUpperCase().trim(); // [Funcionamento]: Captura o nome próprio do instrumento em letras maiúsculas.
      let familiaAlvo = ''; // [Funcionamento]: Inicia a string vazia para validação rigorosa.

      // 🎯 DICIONÁRIO DE PRECEDÊNCIA ESTÁTICA EM MEMÓRIA CACHE (À PROVA DE FALHAS DE NOVO JSON)
      
      // 🎹 Grupo 1: Órgão Eletrônico
      if (instId === 'orgao' || instId === 'órgão' || instNome.includes('ORGANISTA') || instNome === 'ÓRGÃO') { // [Funcionamento]: Filtra organistas locais.
        familiaAlvo = 'ORGANISTAS'; // [Funcionamento]: Carimba na família das organistas.
      } 
      // 🪗 Grupo 2: Teclas (Acordeon Isolado)
      else if (instId === 'acordeon' || instNome.includes('ACORDEON') || instNome.includes('TECLA')) { // [Funcionamento]: Filtra os acordeonistas.
        familiaAlvo = 'TECLAS'; // [Funcionamento]: Carimba na família das teclas.
      } 
      // 🎷 Grupo 3: Saxofones (Precisam interceptar antes das madeiras/metais)
      else if (instId.startsWith('sax') || instNome.includes('SAX')) { // [Funcionamento]: Intercepta a família dos saxofones.
        familiaAlvo = 'SAXOFONES'; // [Funcionamento]: Carimba na família dos saxofones.
      } 
      // 🎺 Grupo 4: Metais (SUBIDO PARA O TOPO DA FILA: Proteção Total para Trompete, Trombone, Trompa, Tuba e Flugelhorn)
      else if (
        ['tpt', 'tbn', 'trp', 'euf', 'tub', 'trompete', 'trombone', 'trompa', 'eufônio', 'tuba', 'flugelhorn', 'flugel'].includes(instId) || 
        instNome.includes('TROMPETE') || instNome.includes('TROMBONE') || instNome.includes('TROMPA') || 
        instNome.includes('TUBA') || instNome.includes('METAL') || instNome.includes('METAIS') || instNome.includes('EUFÔNIO') || instNome.includes('FLUGEL')
      ) { // [Funcionamento]: Filtra os metais de sopro interceptando o Flugelhorn antes que caia em grupos de arcos.
        familiaAlvo = 'METAIS'; // 🛡️ O Flugelhorn fica blindado aqui nos Metais e nunca mais vaza para as cordas.
      } 
      // 🥖 Grupo 5: Madeiras (Proteção Total para Flauta, Clarinete, Oboé, Fagote e Claronones)
      else if (
        ['flt', 'clt', 'oboe', 'fgt', 'flauta', 'clarinete', 'claronealto', 'claronebaixo', 'corneingles'].includes(instId) || 
        instNome.includes('CLARINETE') || instNome.includes('FLAUTA') || instNome.includes('OBOÉ') || 
        instNome.includes('FAGOTE') || instNome.includes('MADEIRA') || instNome.includes('CLARONE')
      ) { // [Funcionamento]: Filtra as madeiras de sopro.
        familiaAlvo = 'MADEIRAS'; // 🛡️ O Clarinete ('clt') fica blindado aqui, caindo na gaveta correta de sopros.
      } 
      // 区域 Grupo 6: Cordas (Violino, Viola, Violoncelo e Contrabaixo)
      else if (
        ['vln', 'vla', 'vcl', 'cbx', 'violino', 'viola', 'violoncelo', 'contrabaixo'].includes(instId) || 
        instNome.includes('VIOLINO') || instNome.includes('VIOLA') || instNome.includes('CELLO') || 
        instNome.includes('VIOLONCELO') || instNome.includes('CONTRABAIXO') || instNome.includes('CORDA')
      ) { // [Funcionamento]: Filtra as cordas tradicionais de arco.
        familiaAlvo = 'CORDAS'; // [Funcionamento]: Carimba na família das cordas limpas sem contaminações de sopros.
      } 
      else { // [Funcionamento]: Bloco de contingência extrema.
        // Fallback de contingência extrema: Se for um instrumento exótico não mapeado, joga em Cordas para não sumir do mapa
        familiaAlvo = 'CORDAS'; // [Funcionamento]: Direciona para as cordas para segurança.
      } // [Funcionamento]: Encerra a árvore estrutural de condições.

      // 💡 Inicializa o nó do instrumento específico (ex: "SAX ALTO") se ele ainda não existir na família
      if (!familias[familiaAlvo].instrumentos[instNome]) { // [Funcionamento]: Checa se o instrumento já possui um array próprio.
        familias[familiaAlvo].instrumentos[instNome] = []; // [Funcionamento]: Cria a gaveta para o instrumento específico.
      } // [Funcionamento]: Fecha inicialização.
      
      // Encaixa o irmão na subcategoria do instrumento específico
      familias[familiaAlvo].instrumentos[instNome].push(membro); // [Funcionamento]: Empurra o músico confirmado para dentro da subcategoria dele.
    }); // [Funcionamento]: Encerra o loop mestre de músicos presentes.

    // 🏎️ 3. PROCESSADOR ALFABÉTICO DE TRIPLICE CAMADA: Organiza os nomes dos músicos dentro de cada instrumento
    const resultadoFormatado = []; // [Funcionamento]: Inicia a lista final limpa que será lida pelos blocos HTML.

    Object.keys(familias).forEach(chaveFamilia => { // [Funcionamento]: Varre as 6 famílias estruturadas na RAM.
      const familia = familias[chaveFamilia]; // [Funcionamento]: Captura o objeto da família atual.
      const listaInstrumentos = Object.keys(familia.instrumentos); // [Funcionamento]: Extrai os instrumentos que possuem músicos confirmados.

      if (listaInstrumentos.length > 0) { // [Funcionamento]: Valida se o naipe possui integrantes presentes.
        const instrumentosOrdenados = []; // [Funcionamento]: Cria recipiente de ordenação para os instrumentos desse naipe.

        listaInstrumentos.forEach(nomeInstrumento => { // [Funcionamento]: Varre cada instrumento pertencente à família instrumental.
          const musicosDesteInst = familia.instrumentos[nomeInstrumento]; // [Funcionamento]: Captura os irmãos que tocam esse instrumento.
          
          // Ordena os irmãos por nome em ordem alfabética estrita (A-Z)
          musicosDesteInst.sort((a, b) => { // [Funcionamento]: Inicia o desempate alfabético dos nomes.
            const nomeA = (a.nome || '').toUpperCase(); // [Funcionamento]: Nome do irmão A em maiúsculo.
            const nomeB = (b.nome || '').toUpperCase(); // [Funcionamento]: Nome do irmão B em maiúsculo.
            return nomeA.localeCompare(nomeB, 'pt-BR'); // 💡 Trata corretamente acentuações nativas.
          }); // [Funcionamento]: Encerra a ordenação nominal.

          instrumentosOrdenados.push({ // [Funcionamento]: Salva os músicos organizados sob o rótulo do seu respectivo instrumento.
            nome: nomeInstrumento, // [Funcionamento]: Nome do instrumento por extenso.
            musicos: musicosDesteInst, // [Funcionamento]: Lista de irmãos organizada de A a Z.
            // 🚀 EXTRAÇÃO DE PESO REATIVO: Armazena a ordem de cadeira configurada no banco do primeiro músico encontrado.
            ordemHierarquica: musicosDesteInst[0]?.instrumentoOrdem ?? musicosDesteInst[0]?.ordem ?? musicosDesteInst[0]?.peso ?? 999 
          }); // [Funcionamento]: Fecha o empurrão do objeto.
        }); // [Funcionamento]: Encerra loop de instrumentos da família.

        // 🚀 CRITÉRIO REATIVO ATENDIDO: Ordena os instrumentos baseado no PESO DE CADEIRA da tela de Ajustes, e não no alfabeto!
        instrumentosOrdenados.sort((a, b) => { // [Funcionamento]: Método de ordenação inteligente por peso de BI.
          if (a.ordemHierarquica !== b.ordemHierarquica) { // [Funcionamento]: Se os pesos configurados no painel de ajustes forem diferentes.
            return a.ordemHierarquica - b.ordemHierarquica; // [Funcionamento]: Ordena numericamente pelo menor indicador (ex: Cadeira 1 antes de Cadeira 2).
          } // [Funcionamento]: Encerra condicional de peso.
          return a.nome.localeCompare(b.nome, 'pt-BR'); // [Funcionamento]: FALLBACK DE CONTINGÊNCIA: Se empatar ou faltar o dado, desempatará por ordem alfabética de plano B.
        }); // [Funcionamento]: Fecha o método de ordenação hierárquica por cadeiras.

        resultadoFormatado.push({ // [Funcionamento]: Consolida o naipe completo estruturado na árvore final.
          id: chaveFamilia, // [Funcionamento]: Identificador mestre do grupo (ex: METAIS).
          titulo: familia.nome, // [Funcionamento]: Título por extenso de amostragem.
          instrumentos: instrumentosOrdenados // [Funcionamento]: Subcategorias de instrumentos alinhadas pelo peso de cadeiras.
        }); // [Funcionamento]: Fecha inclusão na matriz de leitura.
      } // [Funcionamento]: Encerra barreira de validação de tamanho.
    }); // [Funcionamento]: Encerra a varredura mestre de chaves de famílias.

    return resultadoFormatado; // [Funcionamento]: Entrega a árvore hierárquica sniper reativa para a tela mobile desenhar.
  }, [stats.musicosPresentesLista]); // [Funcionamento]: Recalcula o useMemo unicamente se a lista de chamada nominal mudar no Firestore.

  // 📐 CONTADOR RÁPIDO DE CABEÇALHO
  const totalPresentes = stats.musicosPresentesLista?.filter(m => m.presente === true).length || 0; // [Funcionamento]: Filtra os booleanos verdadeiros computando o volume total de cabeças confirmadas.

  return ( // [Funcionamento]: Palco visual mobile-first do componente.
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
            Nenhum músico local foi confirmed ou marcado as presente nesta ata até o momento.
          </span>
        </div>
      )}

    </div>
  );
};

export default ScreenPresenca;