import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(await readFile(new URL('./serviceAccount.json', import.meta.url)));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function saneamentoFinal() {
    console.log("🛠️ Iniciando acabamento e padronização de IDs...");
    
    // 1. Carrega mapas de nomes para denormalização
    const cidadesSnap = await db.collection('config_cidades').get();
    const regionaisSnap = await db.collection('config_regional').get();
    const mapaCidades = {};
    const mapaRegionais = {};
    
    cidadesSnap.docs.forEach(d => mapaCidades[d.id] = d.data().nome);
    regionaisSnap.docs.forEach(d => mapaRegionais[d.id] = d.data().nome);

    const comunsSnap = await db.collection('comuns').get();

    for (const doc of comunsSnap.docs) {
        const data = doc.data();
        const oldId = doc.id;
        const updates = { ...data };
        let precisaMudarID = false;

        // Regra de ID: Migra se contiver underscores ou for um "nome amigável" curto
        if (oldId.includes('_') || oldId.length < 15) {
            precisaMudarID = true;
            console.log(`⚠️ Migrando ID fora de padrão: ${oldId}`);
        }

        // Ajuste de Metadados e Endereço
        if (data.cidadeId) updates.cidadeNome = mapaCidades[data.cidadeId] || "";
        if (data.regionalId) updates.regionalNome = mapaRegionais[data.regionalId] || "";
        if (!data.endereco) updates.endereco = { rua: "", numero: "", bairro: "", cep: "" };

        if (precisaMudarID) {
            const newDocRef = db.collection('comuns').doc(); // Gera ID aleatório automático
            await newDocRef.set(updates);

            // MIGRAR SUBCOLEÇÕES (Recursivo para garantir tudo)
            const subCollections = ['events', 'instrumentos_config', 'ministerio_lista'];
            
            for (const subName of subCollections) {
                const subSnap = await db.collection('comuns').doc(oldId).collection(subName).get();
                if (!subSnap.empty) {
                    console.log(`  📦 Migrando subcoleção: ${subName}`);
                    for (const subDoc of subSnap.docs) {
                        await newDocRef.collection(subName).doc(subDoc.id).set(subDoc.data());
                        await subDoc.ref.delete();
                    }
                }
            }

            await doc.ref.delete();
            console.log(`✅ Migrado com sucesso: ${oldId} -> ${newDocRef.id}`);
        } else {
            await doc.ref.update(updates);
            console.log(`🔹 Metadados atualizados: ${data.comum || oldId}`);
        }
    }

    console.log("🏁 Saneamento completo! Banco de dados 100% adequado à v2.1.");
    process.exit(0);
}

saneamentoFinal();