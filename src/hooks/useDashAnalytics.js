import { useMemo } from 'react'; // [Funcionamento]: Traz a ferramenta do React para travar cálculos pesados na memória RAM e evitar lentidão.

export const useDashAnalytics = (events, filterType, selectedYear, subFilter) => { // [Funcionamento]: Inicia o gancho customizado de matemática do painel recebendo os eventos e filtros da tela.
  
  const mesesRef = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]; // [Funcionamento]: Cria uma lista de etiquetas abreviadas dos meses para alinhar as barras do gráfico.

  const processedData = useMemo(() => { // [Funcionamento]: Ativa a trava de memória useMemo para que o processamento só rode quando uma opção de filtro mudar na tela.
    const legacyMap = { // [Funcionamento]: Cria uma tabela de tradução para converter siglas antigas de instrumentos em nomes oficiais limpos.
      'vln': 'violino', 'vla': 'viola', 'vcl': 'violoncelo', // [Funcionamento]: Traduz as abreviações de cordas do passado para o singular minúsculo.
      'flt': 'flauta', 'clt': 'clarinete', 'acd': 'acordeon', 'org': 'orgao' // [Funcionamento]: Traduz as abreviações de sopros e teclas do passado para o padrão atual.
    };

    const filtered = events.filter(ev => { // [Funcionamento]: Inicia a varredura para reter na memória apenas os ensaios que batem com o tempo selecionado.
      if (!ev.date) return false; // [Funcionamento]: Se o relatório do ensaio não tiver uma data válida gravada, descarta ele na hora.
      const [y, m] = ev.date.split('-').map(Number); // [Funcionamento]: Quebra a string da data "AAAA-MM-DD" e isola o Ano e o Mês em números puros.
      if (filterType === 'all') return true; // [Funcionamento]: Se o usuário escolheu ver o Histórico Total, pula as travas e aprova todos os documentos.
      if (y !== parseInt(selectedYear)) return false; // [Funcionamento]: Se o ano do ensaio for diferente do ano selecionado na lupa da tela, descarta o documento.
      const mIdx = m - 1; // [Funcionamento]: Ajusta o mês do calendário para o índice base zero do JavaScript (0 é Janeiro, 11 é Dezembro).
      if (filterType === 'month') return mIdx === parseInt(subFilter); // [Funcionamento]: Filtro Mensal: Só deixa passar o ensaio se o mês bater exatamente com o escolhido.
      if (filterType === 'semester') return subFilter === '0' ? mIdx < 6 : mIdx >= 6; // [Funcionamento]: Filtro Semestral: Separa os ensaios entre os primeiros 6 meses ou os últimos 6 meses.
      if (filterType === 'quarter') return Math.floor(mIdx / 3) === parseInt(subFilter); // [Funcionamento]: Filtro Trimestral: Divide os meses em blocos de 3 para agrupar as estações do ano.
      return true; // [Funcionamento]: Retorna verdadeiro para os ensaios aprovados na linha de corte do tempo.
    });

    const groups = {}; // [Funcionamento]: Cria um mapa vazio para acumular e agrupar os totais de músicos somados mês a mês.
    const hinosMap = {}; // [Funcionamento]: Cria um dicionário vazio para contar quantas vezes cada número de hino foi tocado nas atas.
    const cityMap = {}; // [Funcionamento]: Cria uma tabela de contagem para registrar a cidade de origem de cada visitante do livro.
    const bairroMap = {}; // [Funcionamento]: Cria uma tabela de contagem para registrar o bairro de origem de cada visitante do livro.
    const minMap = {}; // [Funcionamento]: Cria uma tabela de contagem para categorizar a quantidade de visitas por cargo ministerial.
    const nominal = []; // [Funcionamento]: Cria uma lista vazia para enfileirar as fichas de dados dos visitantes com nome e data.
    
    let tM = 0; // [Funcionamento]: Inicia o grande totalizador global de músicos da orquestra em zero.
    let tO = 0; // [Funcionamento]: Inicia o grande totalizador global de organistas em zero.
    let tI = 0; // [Funcionamento]: Inicia o grande totalizador global de irmandade do coral em zero.
    let tH = 0; // [Funcionamento]: Inicia o grande totalizador global de hinos chamados em zero.
    let tEnc = 0; // [Funcionamento]: Inicia o grande totalizador global de condutores presentes em zero.

    filtered.forEach(ev => { // [Funcionamento]: Abre um laço de repetição para processar cada ensaio que passou pelo filtro temporal.
      const mIdx = parseInt(ev.date.split('-')[1]) - 1; // [Funcionamento]: Captura o número do mês do ensaio corrente e ajusta para o índice da memória.
      const key = mesesRef[mIdx]; // [Funcionamento]: Converte o número do mês na palavra correspondente (ex: 3 vira "Abr").
      
      if (!groups[key]) { // [Funcionamento]: Se o mês ainda não foi preparado na tabela de acúmulo, inicializa a ficha dele zerada.
        groups[key] = { // [Funcionamento]: Define a estrutura interna de propriedades que os gráficos do Recharts precisam ler.
          label: key, // [Funcionamento]: Define o nome do mês que vai aparecer embaixo da coluna no gráfico.
          monthIdx: mIdx, // [Funcionamento]: Guarda a posição do mês para ordenar a linha cronológica mais tarde.
          cordas: 0, // [Funcionamento]: Inicializa o contador mensal de cordas da casa em zero.
          cordasV: 0, // [Funcionamento]: Inicializa o contador mensal de cordas visitantes em zero.
          madeiras: 0, // [Funcionamento]: Inicializa o contador mensal de madeiras da casa em zero.
          madeirasV: 0, // [Funcionamento]: Inicializa o contador mensal de madeiras visitantes em zero.
          metais: 0, // [Funcionamento]: Inicializa o contador mensal de metais da casa em zero.
          metaisV: 0, // [Funcionamento]: Inicializa o contador mensal de metais visitantes em zero.
          teclas: 0, // [Funcionamento]: Inicializa o contador mensal de acordeons da casa em zero.
          teclasV: 0, // [Funcionamento]: Inicializa o contador mensal de acordeons visitantes em zero.
          organistas: 0, // [Funcionamento]: Inicializa o contador mensal de organistas da casa em zero.
          organistasV: 0, // [Funcionamento]: Inicializa o contador mensal de organistas visitantes em zero.
          irmaos: 0, // [Funcionamento]: Inicializa a propriedade mensal de irmãos do coral (casa) em zero.
          irmas: 0, // [Funcionamento]: Inicializa a propriedade mensal de irmãs do coral (casa) em zero.
          condutoresLocais: 0, // [Funcionamento]: Inicializa os encarregados da casa presentes no mês em zero.
          condutoresVisitas: 0, // [Funcionamento]: Inicializa os encarregados visitantes presentes no mês em zero.
          comumTotalAcumulado: 0, // [Funcionamento]: Inicializa o acumulador de músicos da casa do mês em zero.
          visitaTotalAcumulada: 0, // [Funcionamento]: Inicializa o acumulador de músicos visitantes do mês em zero.
          h1: 0, // [Funcionamento]: Inicializa a contagem de hinos chamados na 1ª parte no mês em zero.
          h2: 0, // [Funcionamento]: Inicializa a contagem de hinos chamados na 2ª parte no mês em zero.
          hTotal: 0 // [Funcionamento]: Inicializa o volume total de hinos executados no mês em zero.
        };
      }
      const g = groups[key]; // [Funcionamento]: Aponta para a gaveta do mês corrente para injetar as somas matemáticas.

      Object.entries(ev.counts || {}).forEach(([id, data]) => { // [Funcionamento]: Abre o mapa fatiado de contagens de instrumentos gravado dentro do documento do Firestore.
        if (id.startsWith('meta_')) return; // [Funcionamento]: Se a chave for de metadados técnicos de configuração da tela, pula e ignora ela.
        
        const tot = Number(data.total) || 0; // [Funcionamento]: Captura o campo [total] enviado pelo chip do celular e força conversão para número seguro.
        const com = Number(data.comum) || 0; // [Funcionamento]: Captura o campo [comum] de músicos da casa e trata valores nulos.
        const sec = (data.section || "").toUpperCase(); // [Funcionamento]: Captura a seção do instrumento e converte em letras maiúsculas para checagem estrita.
        const vis = Math.max(0, tot - com); // [Funcionamento]: Regra de Ouro do seu banco: Visitas é rigorosamente o campo [total] menos o campo [comum].
        const saneId = legacyMap[id] || id.toLowerCase(); // [Funcionamento]: Higieniza a ID do instrumento cruzando com a tabela de tradução para evitar duplicados tortos.

        if (sec === 'IRMANDADE' || sec === 'CORAL' || saneId === 'coral' || saneId === 'irmandade') { // [Funcionamento]: Identifica se a linha processada pertence ao grupo coral da irmandade sentada.
          const irmaosCount = Number(data.irmaos) || 0; // [Funcionamento]: 🚀 FAXINA EXTRA: Linha corrigida e limpa de rebarbas textuais para capturar irmãos do coral.
          const irmasCount = Number(data.irmas) || 0; // [Funcionamento]: 🚀 FAXINA EXTRA: Linha corrigida e limpa de rebarbas textuais para capturar irmãs do coral.
          g.irmaos += irmaosCount; // [Funcionamento]: Acumula a quantidade de irmãos na propriedade mensal correspondente.
          g.irmas += irmasCount; // [Funcionamento]: Acumula a quantidade de irmãs na propriedade mensal correspondente.
          tI += (irmaosCount + irmasCount); // [Funcionamento]: Soma ambos e joga o resultado direto no Big Number global do topo da página.
        } 
        else if (sec === 'ORGANISTAS' || saneId === 'orgao' || saneId === 'org') { // [Funcionamento]: Identifica se a linha processada pertence à categoria das organistas da bancada.
          g.organistas += com; // [Funcionamento]: Soma as organistas da casa na propriedade mensal.
          g.organistasV += vis; // [Funcionamento]: Soma as organistas visitantes na propriedade mensal.
          tO += tot; // [Funcionamento]: Alimenta o Big Number global de organistas com o total acumulado presente.
        } 
        else { // [Funcionamento]: Entra na ramificação da Orquestra de sopros, cordas e foles solistas.
          g.comumTotalAcumulado += com; // [Funcionamento]: Adiciona o valor do campo [comum] na sacola mensal de músicos da casa.
          g.visitaTotalAcumulada += vis; // [Funcionamento]: Adiciona o valor derivado [total - comum] na sacola mensal de visitas.
          tM += com; // [Funcionamento]: O card "Orquestra Ativa" do topo foca estritamente nos músicos do corpo estável da casa.

          if (sec === 'CORDAS' || ['violino', 'viola', 'violoncelo'].includes(saneId)) { // [Funcionamento]: Classifica o instrumento dentro do naipe de cordas da orquestra.
            g.cordas += com; // [Funcionamento]: Acumula a contagem de cordas locais no mês.
            g.cordasV += vis; // [Funcionamento]: Acumula a contagem de cordas visitantes no mês.
          }
          else if (sec.includes('MADEIRA') || sec.includes('SAX') || ['flauta', 'clarinete', 'oboe', 'fagote', 'claronealto', 'claronebaixo', 'corneingles', 'saxalto', 'saxtenor', 'saxsoprano', 'saxbaritono'].includes(saneId)) { // [Funcionamento]: Classifica o instrumento dentro do naipe de madeiras ou palhetas.
            g.madeiras += com; // [Funcionamento]: Acumula a contagem de madeiras locais no mês.
            g.madeirasV += vis; // [Funcionamento]: Acumula a contagem de madeiras visitantes no mês.
          }
          else if (sec.includes('METAI') || ['trompete', 'trombone', 'trompa', 'eufonio', 'tuba', 'flugelhorn'].includes(saneId)) { // [Funcionamento]: Classifica o instrumento dentro do naipe de metais pesados de bocal.
            g.metais += com; // [Funcionamento]: Acumula a contagem de metais locais no mês.
            g.metaisV += vis; // [Funcionamento]: Acumula a contagem de metais visitantes no mês.
          }
          else if (sec === 'TECLAS' || saneId === 'acordeon') { // [Funcionamento]: Classifica os teclistas e acordeonistas dentro da sua seção correspondente.
            g.teclas += com; // [Funcionamento]: Acumula a contagem de acordeons locais no mês.
            g.teclasV += vis; // [Funcionamento]: Acumula a contagem de acordeons visitantes no mês.
          }
        }
      });

      ev.ata?.partes?.forEach((p, idx) => { // [Funcionamento]: Varre o array de blocos e partes liturgicas preenchidas na ata da secretaria.
        p.hinos?.forEach(h => { // [Funcionamento]: Passa pente fino na sub-lista de hinos coletados de cada parte.
          if (h && h.trim() !== "") { // [Funcionamento]: Verifica se o slot do hino possui um número preenchido e limpa espaços vazios.
            const hNum = h.trim(); // [Funcionamento]: Isola a string limpa do número do hino (ex: "h244" ou "244").
            hinosMap[hNum] = (hinosMap[hNum] || 0) + 1; // [Funcionamento]: Incrementa o ranking de repetição daquele número no dicionário litúrgico.
            tH++; // [Funcionamento]: Incrementa o Big Number global de hinos cantados no topo.
            g.hTotal++; // [Funcionamento]: Soma no volume total de hinos cantados no mês para o Recharts.
            if (idx === 0) g.h1++; else if (idx === 1) g.h2++; // [Funcionamento]: Classifica se o hino foi entoado na abertura (1ª parte) ou no encerramento (2ª parte).
          }
        });
      });

      ev.ata?.visitantes?.forEach(v => { // [Funcionamento]: Abre o array de registros nominais assinados no livro de visitantes da ata.
        const cargo = (v.min || "Músico").toUpperCase().trim(); // [Funcionamento]: Pega o ministério ou cargo do visitante e joga em caixa alta sem rebarbas de texto.
        minMap[cargo] = (minMap[cargo] || 0) + 1; // [Funcionamento]: Acumula a repetição desse cargo no mapa de classificação ministerial.
        cityMap[(v.cidadeUf || "N/I").toUpperCase().trim()] = (cityMap[(v.cidadeUf || "N/I").toUpperCase().trim()] || 0) + 1; // [Funcionamento]: Contabiliza a cidade e o estado de origem do visitante na tabela geográfica.
        bairroMap[(v.bairro || "N/I").toUpperCase().trim()] = (bairroMap[(v.bairro || "N/I").toUpperCase().trim()] || 0) + 1; // [Funcionamento]: Contabiliza o bairro de origem do visitante para o carrossel de mapas.
        
        if (cargo.includes('ENCARREGADO')) { // [Funcionamento]: Verifica de forma estrita em letras maiúsculas se o visitante possui a palavra ENCARREGADO no cargo.
          tEnc++; // [Funcionamento]: Incrementa o Big Number de condutores no topo do dashboard.
          g.condutoresVisitas++; // [Funcionamento]: Alimenta especificamente a gaveta de condutores visitantes do mês corrente.
        }
        
        nominal.push({ // [Funcionamento]: Enfileira o objeto do visitante estruturado com a data para alimentar o histórico de listagem.
          ...v, // [Funcionamento]: Copia todas as propriedades do mapa original (nome, instrumento, ministério).
          eventDate: ev.date // [Funcionamento]: Carimba a data do ensaio mestre para ordenação visual na listagem.
        });
      });

      ev.ata?.presencaLocalFull?.forEach(p => { // [Funcionamento]: Abre a sub-lista de presenças fixas salvas da irmandade do corpo local.
        if ((p.role || "").toUpperCase().includes('ENCARREGADO')) { // [Funcionamento]: Checa se o irmão da casa possui o papel ou atribuição de ENCARREGADO.
          tEnc++; // [Funcionamento]: Incrementa o Big Number global de condutores unificados do topo.
          g.condutoresLocais++; // [Funcionamento]: Alimenta especificamente a gaveta de condutores locais da casa daquele mês.
        }
      });
    });

    const chartArray = Object.values(groups) // [Funcionamento]: Transforma o mapa mensal indexado em um vetor (array) linear legível pelo Recharts.
      .sort((a, b) => a.monthIdx - b.monthIdx) // [Funcionamento]: Ordena a fila cronologicamente pelo índice do mês para o gráfico fluir de Janeiro a Dezembro.
      .map(g => ({ // [Funcionamento]: Passa uma esteira de mapeamento para complementar e fechar o objeto final de cada mês.
        ...g, // [Funcionamento]: Mantém todas as propriedades fatiadas de naipes e hinos intactas.
        totalOrq: g.comumTotalAcumulado, // [Funcionamento]: Vincula estritamente a soma dos músicos da casa na propriedade de barras verticais.
        visitaOrq: g.visitaTotalAcumulada // [Funcionamento]: Vincula estritamente a soma do cálculo de visitas derivado na propriedade de barras.
      }));

    const uniqueCities = [...new Set(nominal.map(v => (v.cidadeUf || "").toUpperCase().trim()))].sort(); // [Funcionamento]: Extrai as opções de cidades únicas eliminando duplicados para alimentar os menus de busca.
    const uniqueMins = [...new Set(nominal.map(v => (v.min || "").toUpperCase().trim()))].sort(); // [Funcionamento]: Extrai as opções de cargos únicos sem repetição para os seletores de portaria.

    return { // [Funcionamento]: Retorna o pacote consolidado de resultados calculados para fechar o useMemo.
      chartArray, // [Funcionamento]: Vetor mensal cronológico pronto para alimentar as torres do Recharts.
      tM, // [Funcionamento]: Grande número de músicos locais consolidados do topo.
      tO, // [Funcionamento]: Grande número de organistas totais consolidados do topo.
      tI, // [Funcionamento]: Grande número de membros da irmandade do coral do topo.
      tH, // [Funcionamento]: Volume acumulado de hinos executados em reuniões.
      tEnc, // [Funcionamento]: Liderança técnica e condutores totais consolidados do topo.
      totalMeses: chartArray.length || 1, // [Funcionamento]: Quantidade de meses encontrados para calcular as médias sem quebrar por divisão por zero.
      topHinos: Object.entries(hinosMap).map(([num, count]) => ({ num, count })).sort((a, b) => b.count - a.count), // [Funcionamento]: Transforma o mapa de hinos em lista ordenada do mais tocado para o menos tocado.
      origemVisitas: { // [Funcionamento]: Entrega as fatias prontas para os gráficos de pizza e rankings de geolocalização.
        cargos: Object.entries(minMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), // [Funcionamento]: Lista ranqueada de ministérios visitantes.
        cidades: Object.entries(cityMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), // [Funcionamento]: Lista ranqueada de cidades com maior índice de visitas.
        bairros: Object.entries(bairroMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) // [Funcionamento]: Lista ranqueada de bairros com maior índice de visitas.
      },
      nominalFinal: nominal.sort((a, b) => b.eventDate.localeCompare(a.eventDate)), // [Funcionamento]: Lista nominal completa ordenada dos ensaios mais recentes para os mais antigos.
      filterOptions: { cities: uniqueCities, mins: uniqueMins } // [Funcionamento]: Opções limpas de menus para os componentes de interface.
    };
  }, [events, filterType, selectedYear, subFilter]); // [Funcionamento]: Fecha o useMemo amarrando os sensores de atualização aos gatilhos de eventos e datas.

  return processedData; // [Funcionamento]: Entrega os dados calculados e lapidados para a página principal que invocou o gancho.
};