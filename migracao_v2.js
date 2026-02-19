import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// PRESERVAÇÃO: Inicialização original mantida
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/**
 * migrarComBatch v2.1
 * Finalidade: Carimbar nomes de Regional, Cidade e Comum nos eventos globais (Denormalização).
 * Objetivo: Reduzir leituras no App e Dashboard para custo zero de metadados.
 */
async function migrarComBatch() {
  console.log("🚀 Iniciando Migração Otimizada (Modo Batch)...");
  const batch = db.batch();

  try {
    // 1. CARREGAMENTO DOS DICIONÁRIOS (Reduz leituras repetitivas)
    const comuns = (await db.collection('comuns').get()).docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});
    const cidades = (await db.collection('config_cidades').get()).docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});
    const regionais = (await db.collection('config_regional').get()).docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});

    const eventsSnap = await db.collection('events_global').get();
    
    let totalProcessado = 0;

    eventsSnap.forEach(doc => {
      const data = doc.data();
      const updates = { 
        dbVersion: "4.5-pro-denormalized", 
        updatedAt: Date.now() 
      };

      // Injeção de Nomes (Carimbagem) para o Dashboard Geral
      if (data.regionalId && regionais[data.regionalId]) {
        updates.regionalNome = regionais[data.regionalId].nome || regionais[data.regionalId].name || "";
      }

      if (data.cidadeId && cidades[data.cidadeId]) {
        updates.cidadeNome = cidades[data.cidadeId].nome || cidades[data.cidadeId].name || "";
      }

      if (data.comumId && comuns[data.comumId]) {
        // Fallback: tenta 'comum' e depois 'nome' para garantir o dado
        updates.comumNome = comuns[data.comumId].comum || comuns[data.comumId].nome || "";
      }

      batch.update(doc.ref, updates);
      totalProcessado++;
    });

    if (totalProcessado === 0) {
      console.log("ℹ️ Nenhum evento encontrado para migrar.");
      return;
    }

    console.log(`📦 Pacote com ${totalProcessado} atualizações preparado. Enviando ao servidor...`);
    
    // EXECUÇÃO DO LOTE
    await batch.commit();
    
    console.log("✅ Migração concluída com sucesso gastando o mínimo de quota!");
    console.log("💡 Dica: Reinicie o App para ver os nomes carregando instantaneamente.");

  } catch (error) {
    console.error("❌ Erro Crítico na Migração:", error.message);
  }
}

migrarComBatch();