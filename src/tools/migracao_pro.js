import { db, doc, writeBatch, collection, getDocs } from '../firebase';
import toast from 'react-hot-toast';

export const scriptSaneamento = {
  executar: async (fallbackRegionalId) => {
    // ID REAL DA REGIONAL JUNDIAÍ (Extraído do seu backup)
    const REGIONAL_FIXA = "492WNHeLFRRCZRDHoGwN"; 
    const batch = writeBatch(db);
    const idParaUsar = fallbackRegionalId || REGIONAL_FIXA;

    console.log("Iniciando Saneamento na Regional:", idParaUsar);
    const loadingToast = toast.loading("Saneando Banco de Dados...");

    try {
      // 1. PADRONIZAÇÃO DE CIDADES
      const cidadesJundiai = [
        "Cabreúva", "Caieiras", "Cajamar", "Campo Limpo Paulista", 
        "Francisco Morato", "Franco da Rocha", "Itatiba", "Itupeva", 
        "Jundiaí", "Louveira", "Morungaba", "Várzea Paulista"
      ];

      cidadesJundiai.forEach(nome => {
        const idCustom = nome.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ref = doc(db, 'config_cidades', idCustom);
        
        batch.set(ref, {
          nome: nome.toUpperCase(),
          regionalId: idParaUsar,
          status: 'ativo',
          updatedAt: Date.now()
        }, { merge: true });
      });

      // 2. CARIMBAR USUÁRIOS (Garantir que Victor e outros tenham o ID Real)
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(uDoc => {
        const data = uDoc.data();
        // Se o usuário não tem ID ou tem o nome "JUNDIAÍ" escrito, trocamos pelo ID Alfanumérico
        if (!data.regionalId || data.regionalId === 'regional_jundiai' || data.regionalId === 'JUNDIAÍ') {
          batch.update(uDoc.ref, { 
            regionalId: idParaUsar,
            updatedAt: Date.now() 
          });
        }
      });

      // 3. EXECUTAR TUDO
      await batch.commit();
      
      toast.success("Banco Saneado! Cidades e Usuários atualizados.", { id: loadingToast });
      console.log("Sucesso: Batch commitado.");
      return true;

    } catch (e) {
      console.error("Erro Crítico no Saneamento:", e);
      toast.error("Falha: " + e.message, { id: loadingToast });
      return false;
    }
  }
};