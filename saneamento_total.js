import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(await readFile(new URL('./serviceAccount.json', import.meta.url)));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Mapeamento De/Para para unificar o banco com a Matriz Nacional
const MAPA_INSTRUMENTOS = {
    'soprano': 'saxsoprano',
    'sax_soprano': 'saxsoprano',
    'sax_alto': 'saxalto',
    'sax_tenor': 'saxtenor',
    'sax_baritono': 'saxbaritono',
    'acd': 'acordeon',
    'vln': 'violino',
    'vla': 'viola',
    'vcl': 'violoncelo',
    'org': 'orgao',
    'flt': 'flauta',
    'clt': 'clarinete',
    'euf': 'eufonio'
};

async function sanearBanco() {
    console.log("🚀 Iniciando saneamento de versão e instrumentos...");
    const comunsSnap = await db.collection('comuns').get();

    for (const comumDoc of comunsSnap.docs) {
        const comumData = comumDoc.data();
        const comumId = comumDoc.id;
        const eventsRef = db.collection('comuns').doc(comumId).collection('events');
        const eventsSnap = await eventsRef.get();

        for (const eventDoc of eventsSnap.docs) {
            const eventData = eventDoc.data();
            const updates = {};
            let houveAlteracao = false;

            // 1. ADEQUAÇÃO PARA v2.1 (Jurisdição e Metadados)
            if (!eventData.comumId) { updates.comumId = comumId; houveAlteracao = true; }
            if (!eventData.regionalId) { updates.regionalId = comumData.regionalId; houveAlteracao = true; }
            if (!eventData.cidadeId) { updates.cidadeId = comumData.cidadeId; houveAlteracao = true; }
            if (eventData.dbVersion !== "2.1-saneado") { updates.dbVersion = "2.1-saneado"; houveAlteracao = true; }

            // 2. CORREÇÃO DE IDs DE INSTRUMENTOS (Counts)
            if (eventData.counts) {
                const newCounts = { ...eventData.counts };
                Object.keys(MAPA_INSTRUMENTOS).forEach(oldKey => {
                    if (newCounts[oldKey]) {
                        const newKey = MAPA_INSTRUMENTOS[oldKey];
                        // Preserva os dados existentes (total, comum, enc, etc)
                        newCounts[newKey] = { ...newCounts[oldKey], id: newKey };
                        delete newCounts[oldKey];
                        houveAlteracao = true;
                        console.log(`  [${comumData.comum}] Corrigido: ${oldKey} -> ${newKey}`);
                    }
                });
                if (houveAlteracao) updates.counts = newCounts;
            }

            if (houveAlteracao) {
                await eventDoc.ref.update(updates);
            }
        }
    }
    console.log("✅ Banco de dados saneado com sucesso!");
    process.exit(0);
}

sanearBanco();