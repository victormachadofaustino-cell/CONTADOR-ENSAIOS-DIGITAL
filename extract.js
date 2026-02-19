import admin from 'firebase-admin';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Inicialização segura
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function getCollectionsData(collections) {
    const data = {};
    for (const collection of collections) {
        const collectionName = collection.id;
        console.log(`📂 Lendo coleção: ${collectionName}`);
        const snapshot = await collection.get();
        data[collectionName] = {};

        for (const doc of snapshot.docs) {
            const docData = doc.data();
            const subCollections = await doc.ref.listCollections();

            if (subCollections.length > 0) {
                docData._subcollections = await getCollectionsData(subCollections);
            }
            data[collectionName][doc.id] = docData;
        }
    }
    return data;
}

async function exportDatabase() {
    console.log('🚀 Iniciando extração total do Firestore...');
    try {
        const rootCollections = await db.listCollections();
        if (rootCollections.length === 0) {
            console.log('⚠️ Nenhuma coleção encontrada. Verifique as permissões da sua chave.');
            return;
        }
        const allData = await getCollectionsData(rootCollections);
        fs.writeFileSync('firebase_export.json', JSON.stringify(allData, null, 2));
        console.log('\n✅ Pronto! Arquivo "firebase_export.json" criado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

exportDatabase();