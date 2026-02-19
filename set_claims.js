import admin from 'firebase-admin';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Inicializa o Admin SDK se ainda não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Script de Atribuição de Custom Claims (Crachá Eletrônico)
 * v1.1 - Autodetecção de backup e Processamento em Massa
 */
async function aplicarCrachas() {
  console.log("🎫 Iniciando atribuição de Crachás (Custom Claims)...");

  try {
    // 1. LOCALIZAÇÃO AUTOMÁTICA DO BACKUP
    const arquivosNaPasta = fs.readdirSync('./');
    const BACKUP_FILE = arquivosNaPasta.find(f => f.startsWith('backup_seguranca_') && f.endsWith('.json'));

    if (!BACKUP_FILE) {
      console.error("❌ Nenhum arquivo de backup encontrado na pasta!");
      console.log("Dica: Certifique-se de que rodou o backup.js primeiro.");
      return;
    }

    console.log(`📂 Usando o arquivo de backup: ${BACKUP_FILE}`);
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    
    // 2. EXTRAÇÃO DA COLEÇÃO DE USUÁRIOS
    const usuarios = data.users; 
    if (!usuarios) {
      console.error("❌ A coleção 'users' não foi encontrada no arquivo de backup.");
      return;
    }

    let sucesso = 0;
    let erro = 0;

    // 3. LOOP DE ATRIBUIÇÃO (Cota de Auth - Independente do Firestore)
    for (const [uid, perfil] of Object.entries(usuarios)) {
      try {
        // Definimos o que vai escrito no crachá eletrônico (Token)
        // Isso permite que as Rules leiam sem consultar o banco
        const claims = {
          accessLevel: perfil.accessLevel || 'basico',
          regionalId: perfil.regionalId || '',
          cidadeId: perfil.cidadeId || '',
          comumId: perfil.comumId || '',
          approved: perfil.approved || false
        };

        // Grava no Firebase Auth
        await admin.auth().setCustomUserClaims(uid, claims);
        
        console.log(`✅ Crachá aplicado para: ${perfil.email} [${claims.accessLevel}]`);
        sucesso++;
      } catch (err) {
        console.error(`❌ Erro no usuário ${uid}:`, err.message);
        erro++;
      }
    }

    console.log("\n--- RESUMO DA OPERAÇÃO ---");
    console.log(`✅ Crachás aplicados: ${sucesso}`);
    console.log(`⚠️ Falhas: ${erro}`);
    console.log("--------------------------\n");
    console.log("💡 NOTA: Os usuários precisarão fazer Logout e Login para atualizar o crachá.");

  } catch (globalErr) {
    console.error("❌ Erro crítico ao processar backup:", globalErr.message);
  }
}

aplicarCrachas();