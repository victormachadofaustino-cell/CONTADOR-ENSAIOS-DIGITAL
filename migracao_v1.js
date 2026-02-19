import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// LOG DE INICIALIZAÇÃO
console.log("-----------------------------------------");
console.log("🚀 SCRIPT INICIALIZADO PELO MOTOR NODE");
console.log("-----------------------------------------");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function migrarBancoProfissional() {
  try {
    console.log("🔎 Conectando ao Firestore e mapeando referências...");

    // 1. Carregar Mapas de Referência
    const comunsSnap = await db.collection('comuns').get();
    const cidadesSnap = await db.collection('config_cidades').get();
    const regionaisSnap = await db.collection('config_regional').get();

    const comuns = comunsSnap.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});
    const cidades = cidadesSnap.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});
    const regionais = regionaisSnap.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});

    console.log(`✅ Referências carregadas: ${comunsSnap.size} comuns, ${cidadesSnap.size} cidades.`);

    // 2. Buscar Eventos
    const eventsSnap = await db.collection('events_global').get();
    console.log(`📦 Encontrados ${eventsSnap.size} eventos para processar.`);

    if (eventsSnap.empty) {
      console.log("⚠️ Nenhuns eventos encontrados na coleção 'events_global'.");
      return;
    }

    let count = 0;

    for (const doc of eventsSnap.docs) {
      const data = doc.data();
      const updates = {
        dbVersion: "4.5-pro",
        updatedAt: Date.now()
      };

      // Carimba Regional
      if (data.regionalId && regionais[data.regionalId]) {
        updates.regionalNome = regionais[data.regionalId].nome || regionais[data.regionalId].name || "";
      }

      // Carimba Cidade
      if (data.cidadeId && cidades[data.cidadeId]) {
        updates.cidadeNome = cidades[data.cidadeId].nome || cidades[data.cidadeId].name || "";
      }

      // Carimba Comum
      if (data.comumId && comuns[data.comumId]) {
        updates.comumNome = comuns[data.comumId].comum || "";
      }

      await doc.ref.update(updates);
      count++;
      console.log(`✅ [${count}/${eventsSnap.size}] Carimbado: ${updates.comumNome || 'Evento Regional'}`);
    }

    console.log("\n✨ MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log(`📊 Total de documentos atualizados: ${count}`);

  } catch (error) {
    console.error("❌ ERRO CRÍTICO DURANTE A MIGRAÇÃO:");
    console.error(error);
  } finally {
    process.exit(); // Força o fechamento do script ao terminar
  }
}

migrarBancoProfissional();