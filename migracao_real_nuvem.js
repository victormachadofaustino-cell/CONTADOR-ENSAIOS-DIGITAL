/**
 * SCRIPT DE PRODUÇÃO: FAXINA HISTÓRICA VIA FIREBASE ADMIN SDK
 * v2.0 - ALTERAÇÃO CIRÚRGICA EM PRODUÇÃO
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

// 🚨 INSTRUÇÃO DE SEGURANÇA: DIGITE O NOME EXATO DO SEU ARQUIVO DE CHAVE PRIVADA BAIXADO
const CREDENTIAL_FILE = 'serviceAccountKey.json';

// Inicializa o motor com autorização total de escrita
const serviceAccount = JSON.parse(readFileSync(path.join(process.cwd(), CREDENTIAL_FILE), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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

async function aplicarFaxinaNaEReal() {
  console.log(`\n🚨 AVISO DE PRODUÇÃO: REQUISITANDO ESCRITA NO BANCO CENTRAL FIRESTORE...`);
  
  try {
    const eventsRef = db.collection('events_global');
    const eventsSnap = await eventsRef.get();
    
    console.log(`📢 Conectado. Iniciando varredura em ${eventsSnap.size} documentos...`);
    let modificados = 0;

    for (const eventDoc of eventsSnap.docs) {
      const eventId = eventDoc.id;
      const eventData = eventDoc.data();
      const updates = {};
      let precisaAtualizar = false;

      // 1. Limpeza do campo palavra em escopo local
      if (eventData.scope === 'local' && eventData.ata && 'palavra' in eventData.ata) {
        updates['ata.palavra'] = admin.firestore.FieldValue.delete();
        precisaAtualizar = true;
      }

      // 2. Ajuste das chaves tortas de contagem
      if (eventData.counts) {
        Object.keys(eventData.counts).forEach(rawKey => {
          if (!rawKey.startsWith('meta_')) {
            const saneKey = INSTRUMENT_ID_MAP[rawKey.toLowerCase().trim()];
            if (saneKey && saneKey !== rawKey) {
              updates[`counts.${saneKey}`] = eventData.counts[rawKey];
              updates[`counts.${rawKey}`] = admin.firestore.FieldValue.delete();
              precisaAtualizar = true;
            }
          }
        });
      }

      if (precisaAtualizar) {
        await eventsRef.doc(eventId).update(updates);
        console.log(`✅ Documento ${eventId} (${eventData.type || "Ensaio"}) higienizado na nuvem.`);
        modificados++;
      }
    }

    console.log(`\n🎉 SUCESSO TOTAL: ${modificados} documentos históricos foram limpos e normalizados diretamente no servidor.`);
  } catch (error) {
    console.error(`🚨 ERRO NA EXECUÇÃO DA NUBA:`, error);
  }
}

aplicarFaxinaNaEReal();