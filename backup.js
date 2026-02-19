import admin from 'firebase-admin';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Inicializa o Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backup() {
  const collections = ['users', 'comuns', 'events_global', 'config_regional', 'config_cidades'];
  let backupData = {};

  console.log("🚀 Iniciando Backup de Segurança...");

  for (const colName of collections) {
    console.log(`📦 Extraindo coleção: ${colName}...`);
    const snapshot = await db.collection(colName).get();
    backupData[colName] = {};

    for (const doc of snapshot.docs) {
      backupData[colName][doc.id] = doc.data();

      // Busca subcoleções (Importante para não perder 'instrumentos_config' ou 'events')
      const subCols = await doc.ref.listCollections();
      if (subCols.length > 0) {
        backupData[colName][doc.id]._subcollections = {};
        for (const subCol of subCols) {
          const subSnap = await subCol.get();
          backupData[colName][doc.id]._subcollections[subCol.id] = {};
          subSnap.forEach(subDoc => {
            backupData[colName][doc.id]._subcollections[subCol.id][subDoc.id] = subDoc.data();
          });
        }
      }
    }
  }

  const fileName = `backup_seguranca_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup concluído com sucesso: ${fileName}`);
  console.log("⚠️ Guarde este arquivo em um local seguro antes de prosseguirmos.");
}

backup().catch(console.error);