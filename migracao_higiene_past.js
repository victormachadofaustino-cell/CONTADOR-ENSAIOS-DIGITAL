/**
 * SCRIPT DE HIGIENIZAÇÃO HISTÓRICA E LIMPEZA DE DATA CLUTTER
 * v1.3 - OFFLINE SIMULATION TARGETING FIREBASE_EXPORT.JSON
 */

import fs from 'fs';
import path from 'path';

// 🚨 INSTRUÇÃO DE SEGURANÇA: Mude para false APENAS quando o teste simular com sucesso!
// Como estamos lendo o arquivo local, este simulador vai gerar um NOVO arquivo limpo.
const DRY_RUN = true; 

// Ajustado para o nome real do arquivo exportado na raiz do seu projeto
const BACKUP_FILE = 'firebase_export.json'; 
const OUTPUT_FILE = 'firebase_export_higienizado.json';

// O dicionário estrito de harmonização das chaves e naipes para o Recharts
const INSTRUMENT_ID_MAP = {
  'coral': 'coral', 'corais': 'coral', 'acordeon': 'acordeon', 'acordeons': 'acordeon',
  'clarinete': 'clarinete', 'clarinetes': 'clarinete', 'claronealto': 'claronealto', 
  'claronebaixo': 'claronebaixo', 'corneingles': 'corneingles', 'eufonio': 'eufonio', 
  'eufonios': 'eufonio', 'fagote': 'fagote', 'fagotes': 'fagote', 'flauta': 'flauta', 
  'flautas': 'flauta', 'flugelhorn': 'flugelhorn', 'oboe': 'oboe', 'oboes': 'oboe', 
  'orgao': 'orgao', 'organistas': 'orgao', 'saxalto': 'saxalto', 'saxbaritono': 'saxbaritono', 
  'saxsoprano': 'saxsoprano', 'saxtenor': 'saxtenor', 'trombone': 'trombone', 'trombones': 'trombone', 
  'trompa': 'trompa', 'trompas': 'trompa', 'trompete': 'trompete', 'trompetes': 'trompete', 
  'tuba': 'tuba', 'tubas': 'tuba', 'viola': 'viola', 'violas': 'viola', 'violino': 'violino', 
  'violinos': 'violino', 'violoncelo': 'violoncelo', 'violoncelos': 'violoncelo'
};

async function rodarFaxinaOffline() {
  console.log(`\n🚀 INICIANDO ENGENHARIA DE FAXINA HISTÓRICA OFFLINE...`);
  console.log(`🛡️ LEITURA DE BACKUP LOCALLY: ${BACKUP_FILE}`);
  console.log(`🛡️ STATUS DO MODO DE TESTE (DRY_RUN): ${DRY_RUN ? "ATIVADO (APENAS SIMULANDO NO TERMINAL)" : "DESATIVADO (GERANDO NOVO ARQUIVO DE CARGA)"}\n`);

  try {
    const filePath = path.join(process.cwd(), BACKUP_FILE);
    
    if (!fs.existsSync(filePath)) {
      console.error(`🚨 ERRO: O arquivo de backup '${BACKUP_FILE}' não foi encontrado na raiz do projeto.`);
      console.log(`Verifique se você está executando o comando dentro da pasta correta: C:\\Projetos DEV Victor\\contador-ensaios-digital`);
      return;
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    const dbData = JSON.parse(rawData);

    let ensaiosLocaisLimpos = 0;
    let chavesInstrumentoCorrigidas = 0;
    let musicosIdSanitizados = 0;

    // -------------------------------------------------------------------------
    // PASSO 1: ANALISANDO E HIGIENIZANDO OS ENSAIOS (events_global)
    // -------------------------------------------------------------------------
    if (dbData.events_global) {
      console.log(`📢 Analisando documentos da coleção 'events_global'...`);
      
      Object.keys(dbData.events_global).forEach(eventId => {
        const event = dbData.events_global[eventId];
        let alterouEnsaio = false;

        // Regra de Produto: Se o ensaio for Local, remove a pasta 'palavra'
        if (event.scope === 'local' && event.ata && event.ata.palavra !== undefined) {
          delete event.ata.palavra;
          alterouEnsaio = true;
          ensaiosLocaisLimpos++;
        }

        // Regra de Engenharia: Corrige as chaves inconsistentes do mapa de counts
        if (event.counts) {
          const newCounts = {};
          Object.keys(event.counts).forEach(rawKey => {
            if (!rawKey.startsWith('meta_')) {
              const saneKey = INSTRUMENT_ID_MAP[rawKey.toLowerCase().trim()];
              if (saneKey && saneKey !== rawKey) {
                newCounts[saneKey] = event.counts[rawKey];
                chavesInstrumentoCorrigidas++;
                alterouEnsaio = true;
              } else {
                newCounts[rawKey] = event.counts[rawKey];
              }
            } else {
              newCounts[rawKey] = event.counts[rawKey];
            }
          });
          event.counts = newCounts;
        }

        if (alterouEnsaio && DRY_RUN) {
          console.log(`[SIMULAÇÃO] Ensaio ID: ${eventId} (${event.type || "Sem Nome"}) receberia faxina.`);
        }
      });
    }

    // -------------------------------------------------------------------------
    // PASSO 2: ANALISANDO E HIGIENIZANDO OS MÚSICOS (comuns)
    // -------------------------------------------------------------------------
    if (dbData.comuns) {
      console.log(`\n➔ Analisando cadastros de músicos dentro da coleção 'comuns'...`);
      
      Object.keys(dbData.comuns).forEach(comumId => {
        const comum = dbData.comuns[comumId];
        
        if (comum.musicos_lista) {
          Object.keys(comum.musicos_lista).forEach(musicoId => {
            const musico = comum.musicos_lista[musicoId];
            const instIdAntigo = musico.instrumentoId || '';
            const instIdNovo = INSTRUMENT_ID_MAP[instIdAntigo.toLowerCase().trim()];

            if (instIdNovo && instIdNovo !== instIdAntigo) {
              if (DRY_RUN) {
                console.log(`[SIMULAÇÃO] Músico: ${musico.nome || "Irmão"} teria ID do instrumento ajustado de '${instIdAntigo}' para '${instIdNovo}'.`);
              } else {
                musico.instrumentoId = instIdNovo;
                musico.updatedAt = Date.now();
              }
              musicosIdSanitizados++;
            }
          });
        }
      });
    }

    // EXPORTAÇÃO DO NOVO ARQUIVO HIGIENIZADO (APENAS SE O DRY_RUN FOR FALSO)
    if (!DRY_RUN) {
      const outputPath = path.join(process.cwd(), OUTPUT_FILE);
      fs.writeFileSync(outputPath, JSON.stringify(dbData, null, 2), 'utf8');
      console.log(`\n💾 ARQUIVO HIGIENIZADO GERADO COM SUCESSO: ${OUTPUT_FILE}`);
    }

    console.log(`\n📊 --- RESUMO DA SIMULAÇÃO DE FAXINA ---`);
    console.log(`🔹 Ensaios Locais com campo 'palavra' limpo: ${ensaiosLocaisLimpos}`);
    console.log(`🔹 Chaves de instrumentos corrigidas nos contadores (Recharts): ${chavesInstrumentoCorrigidas}`);
    console.log(`🔹 Fichas de músicos com identificadores ajustados: ${musicosIdSanitizados}`);
    console.log(`-----------------------------------------\n`);

    if (DRY_RUN) {
      console.log(`💡 Simulação offline concluída com sucesso e sem risco.`);
      console.log(`Verifique o resumo acima. Se os números fizerem sentido, estamos prontos.`);
    }

  } catch (error) {
    console.error(`🚨 ERRO COMPORTAMENTAL DO SCRIPT:`, error);
  }
}

rodarFaxinaOffline();