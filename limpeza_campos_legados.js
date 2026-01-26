import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(await readFile(new URL('./serviceAccount.json', import.meta.url)));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function faxinaGeral() {
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    usersSnap.docs.forEach(doc => {
        const ref = doc.ref;
        // Campos que vamos DELETAR (O "Lixo")
        batch.update(ref, {
            isMaster: admin.firestore.FieldValue.delete(),
            isComissao: admin.firestore.FieldValue.delete(),
            isLocal: admin.firestore.FieldValue.delete(),
            isRegional: admin.firestore.FieldValue.delete(),
            escopoCidade: admin.firestore.FieldValue.delete(),
            escopoLocal: admin.firestore.FieldValue.delete(),
            escopoRegional: admin.firestore.FieldValue.delete()
        });
    });

    await batch.commit();
    console.log("🧹 Faxina concluída! Campos legados removidos.");
    process.exit(0);
}

faxinaGeral();