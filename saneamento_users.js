import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// 1. Configuração de acesso ao Firebase
const serviceAccount = JSON.parse(
  await readFile(new URL('./serviceAccount.json', import.meta.url))
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function sanearUsuarios() {
    console.log("👥 Iniciando padronização da coleção 'users'...");
    
    try {
        const usersSnap = await db.collection('users').get();
        const batch = db.batch();
        let contador = 0;

        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            const updates = {};

            // 1. Garante que todos os escopos existam como Booleano (evita undefined)
            // Essencial para o Header.jsx e App.jsx funcionarem sem erros [cite: 902, 903, 1038]
            if (data.isMaster === undefined) updates.isMaster = false;
            if (data.isRegional === undefined) updates.isRegional = false;
            if (data.escopoRegional === undefined) updates.escopoRegional = false;
            if (data.escopoCidade === undefined) updates.escopoCidade = false;
            if (data.escopoLocal === undefined) updates.escopoLocal = true;

            // 2. Padronização de Auditoria (Essencial para v2.1) [cite: 1831, 1832]
            if (!data.createdAt) updates.createdAt = Date.now();
            updates.updatedAt = Date.now();

            // 3. Limpeza de strings nos Cargos (Garante funcionamento dos filtros) [cite: 1100, 1101]
            if (data.role) {
                updates.role = data.role.trim();
            }

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                contador++;
            }
        });

        if (contador > 0) {
            await batch.commit();
            console.log(`✅ Saneamento concluído! ${contador} usuários foram atualizados.`);
        } else {
            console.log("ℹ️ Todos os usuários já estão no padrão correto.");
        }
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro ao sanear usuários:", error);
        process.exit(1);
    }
}

// CHAMADA DA FUNÇÃO (O que estava faltando antes)
sanearUsuarios();