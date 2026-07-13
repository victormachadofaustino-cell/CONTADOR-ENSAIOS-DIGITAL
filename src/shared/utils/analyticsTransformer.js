// --- MOTOR DE PROCESSAMENTO ESTRUTURADO ANALYTICS TRANSFORMER ---

export const analyticsTransformer = {

  // TRANSFORMAÇÃO 1: COMPILA OS DADOS DE UM ENSAIO PARA O GRÁFICO DE NAIPES (VÉRTICE LOCAL)
  getNaipeDataLocal: (counts = {}) => { // [Funcionamento]: Método puro que agrupa a contagem de instrumentos individuais nos seus respetivos naipes macros.
    try { // [Funcionamento]: Inicia o bloco de segurança para processamento matemático na memória RAM.
      const naipes = { // [Funcionamento]: Inicializa os acumuladores zerados para cada naipe oficial da orquestra.
        'CORDAS': 0, 'MADEIRAS': 0, 'SAXOFONES': 0, 'METAIS': 0, 'TECLAS': 0, 'CORAL': 0
      }; // [Funcionamento]: Encerra a declaração do esqueleto do objeto.

      // DICIONÁRIO DE MAPEAMENTO TÉCNICO DE NAIPES
      const INSTRUMENT_SECTIONS = { // [Funcionamento]: Dicionário rígido que vincula cada instrumento ao seu naipe de direito eclesiástico.
        'violino': 'CORDAS', 'viola': 'CORDAS', 'violoncelo': 'CORDAS',
        'flauta': 'MADEIRAS', 'clarinete': 'MADEIRAS', 'oboe': 'MADEIRAS', 'fagote': 'MADEIRAS', 'corneingles': 'MADEIRAS', 'claronealto': 'MADEIRAS', 'claronebaixo': 'MADEIRAS',
        'saxsoprano': 'SAXOFONES', 'saxalto': 'SAXOFONES', 'saxtenor': 'SAXOFONES', 'saxbaritono': 'SAXOFONES',
        'trompete': 'METAIS', 'flugelhorn': 'METAIS', 'trompa': 'METAIS', 'trombone': 'METAIS', 'eufonio': 'METAIS', 'tuba': 'METAIS',
        'orgao': 'TECLAS', 'acordeon': 'TECLAS', 'coral': 'CORAL'
      }; // [Funcionamento]: Encerra o dicionário estático de naipes.

      Object.keys(counts).forEach(key => { // [Funcionamento]: Varre chave por chave da sacola de contagens enviada pelo Firebase.
        const cleanKey = key.toLowerCase().trim(); // [Funcionamento]: Higieniza a string removendo espaços e caixa alta.
        const naipeAlvo = INSTRUMENT_SECTIONS[cleanKey]; // [Funcionamento]: Procura no dicionário a qual naipe este instrumento pertence.
        
        if (naipeAlvo && counts[key] && typeof counts[key].total !== 'undefined') { // [Funcionamento]: Se o naipe for localizado e a contagem possuir a propriedade total.
          naipes[naipeAlvo] += parseInt(counts[key].total) || 0; // [Funcionamento]: Soma de forma incremental a volumetria física do instrumento no totalizador do seu naipe.
        } // [Funcionamento]: Encerra a condicional de validação de nós lineares.
      }); // [Funcionamento]: Encerra o laço foreach de varredura.

      return Object.keys(naipes).map(name => ({ // [Funcionamento]: Converte o objeto interno da RAM num array de objetos mapeados para os gráficos lerem.
        name: name, // [Funcionamento]: Define a propriedade de nome do naipe (ex: 'CORDAS').
        value: naipes[name] // [Funcionamento]: Define o valor numérico total de músicos presentes daquele naipe.
      })).filter(item => item.value > 0); // [Funcionamento]: Limpa e expulsa do array os naipes que ficaram zerados para o gráfico nascer limpo.
    } catch (e) { // [Funcionamento]: Captura falhas estruturais de dados corrompidos.
      console.error("Erro no transformer de naipes locais:", e); // [Funcionamento]: Emite o alerta detalhado no console técnico de debug.
      return []; // [Funcionamento]: Devolve um vetor vazio seguro para a tela não crashar em loop.
    } // [Funcionamento]: Encerra o bloco de tratamento catch.
  }, // [Funcionamento]: Encerra o método getNaipeDataLocal.

  // TRANSFORMAÇÃO 2: COMPILA O HISTÓRICO DE EVOLUÇÃO PRESENCIAL DA LOCALIDADE (DELTAS DO GRÁFICO DE LINHA)
  getHistoryEvolution: (allEvents = [], currentEventId) => { // [Funcionamento]: Método que varre o histórico da igreja comum e extrai o crescimento cronológico de presenças.
    try { // [Funcionamento]: Inicia a triagem assíncrona de memória.
      const eventosFiltrados = allEvents // [Funcionamento]: Pega a lista histórica de cultos e ensaios daquela casa.
        .filter(ev => ev.counts && ev.date) // [Funcionamento]: Expulsa da análise agendas antigas sem dados ou sem data de calendário preenchida.
        .sort((a, b) => a.date.localeCompare(b.date)); // [Funcionamento]: Ordena a linha cronológica colocando os ensaios mais antigos na esquerda e os novos na direita.

      return eventosFiltrados.map(ev => { // [Funcionamento]: Varre os ensaios filtrados gerando os pontos cartesianos do gráfico de linhas.
        let totalOrquestra = 0; // [Funcionamento]: Inicializa o contador atómico de músicos daquela data em zero.
        
        Object.keys(ev.counts).forEach(k => { // [Funcionamento]: Varre instrumento por instrumento daquele ensaio específico da linha do tempo.
          if (!k.startsWith('meta_') && ev.counts[k] && typeof ev.counts[k].total !== 'undefined') { // [Funcionamento]: Filtra eliminando chaves técnicas de metadados e soma totais válidos.
            totalOrquestra += parseInt(ev.counts[k].total) || 0; // [Funcionamento]: Acumula a volumetria total da orquestra presente naquele dia.
          } // [Funcionamento]: Encerra a condicional.
        }); // [Funcionamento]: Encerra a varredura interna de instrumentos.

        // CORTE VISUAL DE FORMATÇÃO DE DATA
        const [ano, mes, dia] = ev.date.split('-'); // [Funcionamento]: Recorta a string YYYY-MM-DD nas traves de hífen.
        const dataFormatada = `${dia}/${mes}`; // [Funcionamento]: Concatena transformando no padrão brasileiro/português compacto (DD/MM) de ecrã móvel.

        return { // [Funcionamento]: Cospe o nó estruturado pronto para a linha do gráfico subir ou descer.
          date: dataFormatada, // [Funcionamento]: Injeta a data curta compacta de cabeçalho.
          "Músicos": totalOrquestra, // [Funcionamento]: Define a chave de volumetria total da orquestra.
          isCurrent: ev.id === currentEventId // [Funcionamento]: Carimba uma flag booleana se este ponto for exatamente o ensaio aberto na tela para destaque visual.
        }; // [Funcionamento]: Encerra o nó do objeto.
      }).slice(-6); // [Funcionamento]: Trava de Ergonomia: Corta o vetor e traz apenas os últimos 6 ensaios históricos para o gráfico não colidir nas bordas do telemóvel.
    } catch (e) { // [Funcionamento]: Captura erros.
      console.error("Erro no transformer de evolução histórica:", e); // [Funcionamento]: Emite erro no log técnico.
      return []; // [Funcionamento]: Devolve array vazio de segurança.
    } // [Funcionamento]: Encerra o catch.
  }, // [Funcionamento]: Encerra o método getHistoryEvolution.

  // TRANSFORMAÇÃO 3: RANKING DE PRESENÇA ABSOLUTA POR INSTRUMENTO (GRÁFICO DE BARRAS VERTICAIS)
  getInstrumentRanking: (counts = {}) => { // [Funcionamento]: Método encarregado de ordernar a orquestra do instrumento mais numeroso para o mais escasso.
    try { // [Funcionamento]: Abre o bloco de processamento atómico.
      const listaRanking = []; // [Funcionamento]: Inicializa um vetor vazio que colherá as linhas higienizadas.

      Object.keys(counts).forEach(key => { // [Funcionamento]: Varre a gaveta mestre de contagens do Firebase.
        // Ignora chaves técnicas de metas de naipes, o Coral amplo e o nó de Teclas Órgão que possuem tratamento próprio de ecrã.
        if (!key.startsWith('meta_') && key !== 'coral' && key !== 'orgao' && counts[key] && typeof counts[key].total !== 'undefined') {
          const totalNum = parseInt(counts[key].total) || 0; // [Funcionamento]: Isola o total de presentes e garante conversão estável para número inteiro.
          if (totalNum > 0) { // [Funcionamento]: Se houver pelo menos 1 músico daquela família presente no ensaio.
            listaRanking.push({ // [Funcionamento]: Anexa a linha na gaveta do ranking.
              name: counts[key].name || key.toUpperCase(), // [Funcionamento]: Carimba o nome por extenso do instrumento ou força caixa alta.
              "Quantidade": totalNum // [Funcionamento]: Define o valor numérico de barras.
            }); // [Funcionamento]: Encerra o push estruturado.
          } // [Funcionamento]: Encerra a validação de quantidade maior que zero.
        } // [Funcionamento]: Encerra a condicional de filtro de chaves limpas.
      }); // [Funcionamento]: Encerra o laço foreach de varredura.

      return listaRanking.sort((a, b) => b["Quantidade"] - a["Quantidade"]); // [Funcionamento]: Ordena o ranking de forma decrescente colocandov os maiores números no topo absoluto do vetor.
    } catch (e) { // [Funcionamento]: Captura quebras de conversão.
      console.error("Erro no transformer de ranking orquestral:", e); // [Funcionamento]: Emite falha no console.
      return []; // [Funcionamento]: Devolve array vazio preventivo.
    } // [Funcionamento]: Encerra o bloco catch.
  } // [Funcionamento]: Encerra o método getInstrumentRanking.
}; // [Funcionamento]: Encerra o objeto exportável mestre analyticsTransformer.