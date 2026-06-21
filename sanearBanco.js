import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// CONFIGURAÇÃO DE SEGURANÇA OBRIGATÓRIA
// Mude para false para apenas testar (Simulação). Mude para true para alterar o banco.
const EXECUTAR_MIGRACAO_REAL = true; 

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function sanearEnsaiosPassados() {
    console.log(`\n🚀 INICIANDO ENXUGAMENTO DE ENSAIOS [MODO: ${EXECUTAR_MIGRACAO_REAL ? '🚨 REAL (GRAVAÇÃO)' : '🔍 SIMULAÇÃO (DRY RUN)'}]`);
    
    const querySnapshot = await db.collection('events_global').get();
    let modificados = 0;

    for (const document of querySnapshot.docs) {
        const eventId = document.id;
        const eventData = document.data();
        const counts = eventData.counts || {};
        const isRegional = eventData.scope === 'regional';

        const updates = {};
        let mudouAlgo = false;

        Object.keys(counts).forEach(instId => {
            if (instId.startsWith('meta_')) return;

            const instData = counts[instId];
            const subId = instId.toLowerCase();

            // CASO 1: Ensaio Regional não pode ter 'comum' nem 'enc'
            if (isRegional) {
                if (instData.comum !== undefined) {
                    updates[`counts.${instId}.comum`] = admin.firestore.FieldValue.delete();
                    mudouAlgo = true;
                }
                if (instData.enc !== undefined) {
                    updates[`counts.${instId}.enc`] = admin.firestore.FieldValue.delete();
                    mudouAlgo = true;
                }
            }

            // CASO 2: Expurgar 'irmaos' e 'irmas' de instrumentos que NÃO são o Coral
            if (subId !== 'coral' && subId !== 'irmandade' && subId !== 'irmas' && subId !== 'irmaos') {
                if (instData.irmaos !== undefined) {
                    updates[`counts.${instId}.irmaos`] = admin.firestore.FieldValue.delete();
                    mudouAlgo = true;
                }
                if (instData.irmas !== undefined) {
                    updates[`counts.${instId}.irmas`] = admin.firestore.FieldValue.delete();
                    mudouAlgo = true;
                }
            }
        });

        if (mudouAlgo) {
            console.log(`   ↳ [FILTRADO] Ensaio ID: ${eventId} (${eventData.type} - ${eventData.date}) | Enquadrado no padrão Lean.`);
            if (EXECUTAR_MIGRACAO_REAL) {
                const eventRef = db.collection('events_global').doc(eventId);
                await eventRef.update(updates);
            }
            modificados++;
        }
    }

    console.log("\n========================================================================");
    console.log("📊 RELATÓRIO DO ENXUGAMENTO PASSADO:");
    console.log("========================================================================");
    console.log(`➔ Total de ensaios históricos que precisavam de limpeza: ${modificados}`);
    console.log("------------------------------------------------------------------------");
    if (!EXECUTAR_MIGRACAO_REAL) {
        console.log("🔍 NENHUM DADO FOI ALTERADO NO FIRESTORE. SCRIPT EM MODO SIMULAÇÃO.");
        console.log("👉 Para aplicar a limpeza real, mude 'EXECUTAR_MIGRACAO_REAL' para true no topo.");
    } else {
        console.log("🚨 CIRURGIA CONCLUÍDA! Ensaios passados enxugados direto na produção!");
    }
    console.log("========================================================================\n");
}

sanearEnsaiosPassados().catch(err => console.error("❌ Erro crítico:", err));