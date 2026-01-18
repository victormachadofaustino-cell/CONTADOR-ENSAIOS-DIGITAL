import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkConnection() {
  try {
    console.log("--- Testando Autenticação Master ---");
    // Tenta ler o seu perfil Master especificamente para validar a chave
    const masterDoc = await db.collection('users').doc('vz7YOzHeKmSNi1Xo6mEYUNhk1cm1').get();
    
    if (masterDoc.exists) {
      console.log("✅ CONEXÃO ESTABELECIDA COM SUCESSO!");
      console.log(`👤 Identidade Identificada: ${masterDoc.data().name}`);
      console.log(`📍 Comum Vinculada: ${masterDoc.data().comum}`);
      console.log("-----------------------------------");
      console.log("Você já pode rodar o 'node extract_db.js' com segurança.");
    } else {
      console.log("⚠️ Conexão OK, mas o documento Master não foi encontrado.");
    }
  } catch (error) {
    console.error("❌ ERRO DE CONEXÃO:");
    console.error(error.message);
  } finally {
    process.exit();
  }
}

checkConnection();