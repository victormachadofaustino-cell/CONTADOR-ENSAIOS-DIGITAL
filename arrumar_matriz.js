// arrumar_matriz.js
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Tenta carregar a chave de serviço
const serviceAccount = require('./serviceAccount.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function arrumarMatrizNacional() {
    console.log("-----------------------------------------");
    console.log("🚀 INICIANDO FAXINA NA MATRIZ NACIONAL...");
    console.log("-----------------------------------------");
    
    const colRef = db.collection('config_instrumentos_nacional');

    try {
        const snapshot = await colRef.get();
        
        if (snapshot.empty) {
            console.log("⚠️ Coleção 'config_instrumentos_nacional' não encontrada ou vazia.");
            return;
        }

        console.log(`📦 Encontrados ${snapshot.size} documentos. Analisando...`);

        for (const doc of snapshot.docs) {
            const idAtual = doc.id;
            // Limpa o ID: tudo minúsculo, sem underline, sem espaços
            const novoId = idAtual.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');

            if (idAtual !== novoId) {
                console.log(`🔄 RENOMEANDO: [${idAtual}] -> [${novoId}]`);
                const data = doc.data();

                // 1. Cria o novo documento com ID limpo
                await colRef.doc(novoId).set({
                    ...data,
                    id: novoId, // Garante que o campo ID interno também seja limpo
                    updatedAt: Date.now()
                });

                // 2. Apaga o antigo
                await colRef.doc(idAtual).delete();
            } else {
                console.log(`✅ OK: [${idAtual}]`);
            }
        }

        // --- GARANTIR ITENS FALTANTES ---
        console.log("-----------------------------------------");
        console.log("✨ Verificando itens obrigatórios (Coral e Corne Inglês)...");
        
        const obrigatorios = [
            { id: 'corneingles', name: 'CORNE INGLÊS', section: 'MADEIRAS', evalType: 'Encarregado' },
            { id: 'Coral', name: 'CORAL', section: 'IRMANDADE', evalType: 'Sem' }
        ];

        for (const item of obrigatorios) {
            const docRef = await colRef.doc(item.id).get();
            if (!docRef.exists) {
                console.log(`➕ ADICIONANDO: ${item.id}`);
                await colRef.doc(item.id).set({
                    ...item,
                    isSystemDefault: true,
                    updatedAt: Date.now()
                });
            } else {
                console.log(`✔ JÁ EXISTE: ${item.id}`);
            }
        }

        console.log("-----------------------------------------");
        console.log("🏁 FAXINA CONCLUÍDA COM SUCESSO!");
        console.log("-----------------------------------------");

    } catch (error) {
        console.error("❌ ERRO DURANTE A EXECUÇÃO:");
        console.error(error.message);
    } finally {
        process.exit();
    }
}

arrumarMatrizNacional();