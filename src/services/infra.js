import { db, doc, writeBatch } from '../firebase';
import toast from 'react-hot-toast';

const infraService = {
  migrarCidadesOficiais: async () => {
    const cidadesOficiais = [
      "Cabreúva", "Caieiras", "Cajamar", "Campo Limpo Paulista", 
      "Francisco Morato", "Franco da Rocha", "Itatiba", "Itupeva", 
      "Jundiaí", "Louveira", "Morungaba", "Várzea Paulista"
    ];
    
    const loadingToast = toast.loading("Configurando Sistema...");

    try {
      const batch = writeBatch(db);
      cidadesOficiais.forEach((cidade) => {
        const cidadeId = cidade.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cityRef = doc(db, 'config_cidades', cidadeId);
        batch.set(cityRef, {
          nome: cidade,
          regionalId: 'regional_jundiai',
          status: 'ativo',
          createdAt: Date.now()
        });
      });
      await batch.commit();
      toast.success("Cidades ativadas!", { id: loadingToast });
      return true;
    } catch (e) {
      toast.error("Falha na infraestrutura", { id: loadingToast });
      return false;
    }
  }
};

export { infraService };