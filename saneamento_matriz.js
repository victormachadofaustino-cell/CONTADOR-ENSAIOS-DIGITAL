import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(await readFile(new URL('./serviceAccount.json', import.meta.url)));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function sanearMatrizAcesso() {
    console.log("🚀 Iniciando migração para Matriz de Competências v2.1...");
    
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();
    let totalSaneados = 0;

    usersSnap.docs.forEach(doc => {
        const data = doc.data();
        let level = 'basico'; // Padrão inicial

        // 1. LÓGICA DE TRADUÇÃO DE NÍVEL (Hierarquia de Cima para Baixo)
        if (data.isMaster === true || data.email === 'victormachadofaustino@gmail.com') {
            level = 'master';
        } 
        else if (data.isComissao === true || data.role === 'Encarregado Regional' && data.escopoRegional === true) {
            level = 'comissao';
        }
        else if (data.escopoCidade === true || (data.role === 'Secretário da Música' && data.cidadeId && !data.comumId)) {
            level = 'regional_cidade';
        }
        else if (data.escopoLocal === true || data.role === 'Encarregado Local' || data.role === 'Secretário da Música' || data.role === 'Instrutor') {
            // Instrutores agora herdam nível Local por padrão conforme sua diretriz
            level = 'gem_local';
        }

        // 2. REGRAS ESPECÍFICAS DE CARGO (Ajuste fino)
        if (data.role === 'Músico' || data.role === 'Organista') {
            level = 'basico';
        }

        const updates = {
            accessLevel: level,
            updatedAt: Date.now(),
            // Limpeza de campos legados (opcional, mantidos para não quebrar código antigo se necessário)
            dbVersion: "2.1-matriz"
        };

        // 3. NORMALIZAÇÃO DA JURISDIÇÃO
        // Garante que campos vazios não sejam undefined
        updates.regionalId = data.regionalId || "";
        updates.cidadeId = data.cidadeId || "";
        updates.comumId = data.comumId || "";

        batch.update(doc.ref, updates);
        totalSaneados++;
        console.log(`👤 Usuário: ${data.name.padEnd(20)} | Cargo: ${data.role.padEnd(20)} | Nível: ${level.toUpperCase()}`);
    });

    await batch.commit();
    console.log(`\n✅ Saneamento concluído! ${totalSaneados} usuários migrados para a nova matriz.`);
    process.exit(0);
}

sanearMatrizAcesso();