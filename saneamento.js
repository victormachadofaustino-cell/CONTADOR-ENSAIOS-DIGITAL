import admin from 'firebase-admin';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// =========================================================================
// CONFIGURAÇÃO DE SEGURANÇA OBRIGATÓRIA
// Mude para false para apenas testar (Simulação). Mude para true para alterar o banco.
const EXECUTAR_MIGRACAO_REAL = true; 
// =========================================================================

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Dicionário Oficial de Tradução de Siglas para Nomes Extensos
const DICIONARIO_INSTRUMENTOS = {
    'acd': 'acordeon',
    'clt': 'clarinete',
    'euf': 'eufonio',
    'fgt': 'fagote',
    'gt': 'fagote',
    'flt': 'flauta',
    'org': 'orgao',
    'tbn': 'trombone',
    'tpt': 'trompete',
    'trp': 'trompa',
    'tub': 'tuba',
    'vcl': 'violoncelo',
    'vla': 'viola',
    'vln': 'violino'
};

// Cache local de cidades para evitar leituras repetidas do Firestore
let cacheCidades = {};

async function carregarCacheCidades() {
    console.log("🏙️  Carregando referências de cidades para o carimbo geográfico...");
    const snap = await db.collection('config_cidades').get();
    snap.forEach(doc => {
        cacheCidades[doc.id] = doc.data().nome || "CIDADE NÃO ENCONTRADA";
    });
    console.log(`✅ Cache carregado com ${Object.keys(cacheCidades).length} cidades.`);
}

async function rodarSaneamento() {
    console.log(`\n🚀 INICIANDO PROCESSO DE SANEAMENTO [MODO: ${EXECUTAR_MIGRACAO_REAL ? '🚨 REAL (GRAVAÇÃO)' : '🔍 SIMULAÇÃO (DRY RUN)'}]`);
    
    await carregarCacheCidades();
    
    let contadores = { comunsAnalisadas: 0, subcolecoesCorrigidas: 0, eventosAnalisados: 0, eventosCamposCorrigidos: 0, nomesGeograficosInjetados: 0 };

    // --- FASE 1: CORREÇÃO DAS SUBCOLEÇÕES INSTRUMENTOS_CONFIG NAS COMUNS ---
    console.log("\n📦 Passo 1: Analisando subcoleções 'instrumentos_config' dentro das comuns...");
    const comunsSnap = await db.collection('comuns').get();
    
    for (const comumDoc of comunsSnap.docs) {
        contadores.comunsAnalisadas++;
        const instConfigRef = comumDoc.ref.collection('instrumentos_config');
        const instSnap = await instConfigRef.get();
        
        for (const instDoc of instSnap.docs) {
            const idAntigo = instDoc.id;
            
            // Se o ID do documento for uma sigla mapeada no dicionário
            if (DICIONARIO_INSTRUMENTOS[idAntigo]) {
                const idNovo = DICIONARIO_INSTRUMENTOS[idAntigo];
                contadores.subcolecoesCorrigidas++;
                
                console.log(`   ↳ [CORREÇÃO] Comum: ${comumDoc.data().comum || comumDoc.id} | Documento inválido encontrado: '${idAntigo}' ➔ Deveria ser: '${idNovo}'`);
                
                if (EXECUTAR_MIGRACAO_REAL) {
                    const dadosOriginais = instDoc.data();
                    // Cria o novo documento com o ID por extenso correto
                    await instConfigRef.doc(idNovo).set({
                        ...dadosOriginais,
                        id: idNovo,
                        name: idNovo.toUpperCase(),
                        updatedAt: Date.now()
                    });
                    // Apaga o documento antigo que usava sigla
                    await instDoc.ref.delete();
                }
            }
        }
    }

    // --- FASE 2: CORREÇÃO DO MAPA DE COUNTS E CAMPOS EM EVENTS_GLOBAL ---
    console.log("\n📅 Passo 2: Analisando histórico de ensaios e contagens em 'events_global'...");
    const eventosSnap = await db.collection('events_global').get();

    for (const eventDoc of eventosSnap.docs) {
        contadores.eventosAnalisados++;
        const eventData = eventDoc.data() || {};
        let counts = eventData.counts || {};
        let atualizacoesNoEvento = {};
        let houveMudancaNoCounts = false;

        // 1. Verifica e corrige siglas dentro do mapa de contagens (counts)
        let novoCounts = { ...counts };
        Object.keys(counts).forEach(chave => {
            if (DICIONARIO_INSTRUMENTOS[chave]) {
                const chaveNova = DICIONARIO_INSTRUMENTOS[chave];
                console.log(`   ↳ [SIGLA NO HISTÓRICO] Evento ID: ${eventDoc.id} (${eventData.type} - ${eventData.date}) | Chave '${chave}' migrada para '${chaveNova}'`);
                
                // Transfere os dados da sigla para o campo extenso
                novoCounts[chaveNova] = {
                    ...counts[chave],
                    name: chaveNova.toUpperCase(),
                    updatedAt: Date.now()
                };
                
                // Remove a sigla antiga do mapa
                delete novoCounts[chave];
                houveMudancaNoCounts = true;
                contadores.eventosCamposCorrigidos++;
            }
        });

        if (houveMudancaNoCounts) {
            atualizacoesNoEvento.counts = novoCounts;
        }

        // 2. Verifica e preenche cidades e regionais que vieram como strings vazias ""
        if (eventData.cidadeId && (!eventData.cidadeNome || eventData.cidadeNome.trim() === "")) {
            const nomeCorretoCidade = cacheCidades[eventData.cidadeId] || "SÃO PAULO"; 
            atualizacoesNoEvento.cidadeNome = nomeCorretoCidade;
            contadores.nomesGeograficosInjetados++;
            console.log(`   ↳ [CAMPO VAZIO] Evento ID: ${eventDoc.id} | cidadeNome estava vazio. Injetado carimbo: "${nomeCorretoCidade}"`);
        }

        // Se houver qualquer modificação estrutural a ser feita no documento
        if (Object.keys(atualizacoesNoEvento).length > 0) {
            if (EXECUTAR_MIGRACAO_REAL) {
                atualizacoesNoEvento.updatedAt = Date.now();
                await eventDoc.ref.update(atualizacoesNoEvento);
            }
        }
    }

    // --- RELATÓRIO FINAL DA OPERAÇÃO ---
    console.log("\n========================================================================");
    console.log("📊 RELATÓRIO DO SANEAMENTO E EXECUÇÃO:");
    console.log("========================================================================");
    console.log(`➔ Igrejas (Comuns) verificadas no total:           ${contadores.comunsAnalisadas}`);
    console.log(`➔ Documentos de siglas apagados/corrigidos:        ${contadores.subcolecoesCorrigidas}`);
    console.log(`➔ Eventos de Histórico (Ensaios) verificados:     ${contadores.eventosAnalisados}`);
    console.log(`➔ Blocos de contagem corrigidos de sigla para nome: ${contadores.eventosCamposCorrigidos}`);
    console.log(`➔ Carimbos de Cidades vazias resolvidos:           ${contadores.nomesGeograficosInjetados}`);
    console.log("------------------------------------------------------------------------");
    if (!EXECUTAR_MIGRACAO_REAL) {
        console.log("🔍 NENHUM DADO FOI ALTERADO NO FIRESTORE. O SCRIPT RODOU EM MODO SIMULAÇÃO.");
        console.log("👉 Para gravar as correções no banco real, mude 'EXECUTAR_MIGRACAO_REAL' para true.");
    } else {
        console.log("🚨 SANEAMENTO CONCLUÍDO COM SUCESSO DIRETO NA BASE DE PRODUÇÃO!");
    }
    console.log("========================================================================\n");
}

rodarSaneamento().catch(err => console.error("❌ Erro crítico no processo:", err));