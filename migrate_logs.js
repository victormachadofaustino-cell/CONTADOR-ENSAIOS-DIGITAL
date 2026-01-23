import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function migrateDatabase() {
  console.log("🚀 Iniciando Migração de Saneamento...");
  const comunsSnap = await db.collection('comuns').get();

  for (const comumDoc of comunsSnap.docs) {
    const comumId = comumDoc.id;
    const eventsRef = db.collection('comuns').doc(comumId).collection('events');
    const eventsSnap = await eventsRef.get();

    for (const eventDoc of eventsSnap.docs) {
      const eventData = eventDoc.data();
      const batch = db.batch();
      const logsRef = eventsRef.doc(eventDoc.id).collection('logs');
      
      let hasChanges = false;
      const newCounts = { ...eventData.counts };

      if (eventData.counts) {
        for (const [key, value] of Object.entries(eventData.counts)) {
          // 1. Identificar IDs zumbis ou duplicados (ex: corneinglês vs corne_ingles)
          const cleanKey = key.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '_');

          // 2. Extrair Histórico para Subcoleção (Limpeza de documento principal)
          if (value.history && Array.isArray(value.history)) {
            value.history.forEach((log) => {
              const logDocRef = logsRef.doc(); // Gera ID automático para o log
              batch.set(logDocRef, {
                ...log,
                instId: cleanKey,
                migrated: true,
                serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            });
            
            // Remove o array de histórico do mapa principal para reduzir tamanho do documento
            delete newCounts[key].history;
            hasChanges = true;
          }

          // 3. Mesclar chaves duplicadas se necessário
          if (cleanKey !== key) {
            newCounts[cleanKey] = { ...newCounts[key], id: cleanKey };
            delete newCounts[key];
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        batch.update(eventsRef.doc(eventDoc.id), { 
          counts: newCounts,
          lastMigration: Date.now(),
          dbVersion: "2.0" 
        });
        await batch.commit();
        console.log(`✅ Evento ${eventDoc.id} saneado e logs extraídos.`);
      }
    }
  }
  console.log("🏁 Migração concluída com sucesso!");
}

migrateDatabase().catch(console.error);