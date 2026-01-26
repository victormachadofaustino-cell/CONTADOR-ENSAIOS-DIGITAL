import admin from 'firebase-admin';
import fs from 'fs';
import { readFile } from 'fs/promises';

// Lógica para ler o JSON em ambiente ESM
const serviceAccount = JSON.parse(
  await readFile(new URL('./serviceAccount.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const outputFileName = 'extracao_profunda_banco.json';

async function extrairColecao(colecaoRef) {
  const snapshot = await colecaoRef.get();
  const dadosColecao = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Busca todas as subcoleções vinculadas a este documento
    const subcolecoes = await doc.ref.listCollections();
    const dadosDoc = {
      _campos: data,
      _subcolecoes: {}
    };

    for (const sub of subcolecoes) {
      dadosDoc._subcolecoes[sub.id] = await extrairColecao(sub);
    }

    dadosColecao[doc.id] = dadosDoc;
  }
  return dadosColecao;
}

async function iniciarExtracao() {
  console.log("🚀 Iniciando varredura completa no Firestore...");
  try {
    const backupCompleto = {};
    const colecoesRaiz = await db.listCollections();

    for (const colecao of colecoesRaiz) {
      console.log(`📦 Lendo coleção: ${colecao.id}...`);
      backupCompleto[colecao.id] = await extrairColecao(colecao);
    }

    fs.writeFileSync(outputFileName, JSON.stringify(backupCompleto, null, 2));
    console.log(`✅ Extração concluída! Arquivo gerado: ${outputFileName}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro fatal na extração:", error);
    process.exit(1);
  }
}

iniciarExtracao();