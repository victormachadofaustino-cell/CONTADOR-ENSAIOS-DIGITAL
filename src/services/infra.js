// PRESERVAÇÃO: Importações originais mantidas e caminho ajustado para consistência do projeto
import { db, doc, writeBatch } from '../config/firebase';
import toast from 'react-hot-toast';

/**
 * SERVIÇO DE INFRAESTRUTURA DINÂMICO
 * Saneado para Escalabilidade: Removido referências fixas a Jundiaí.
 * Agora aceita qualquer lista de cidades e qualquer Regional ID.
 */
const infraService = {
  // Parâmetros dinâmicos para suportar múltiplas regionais e escalas
  migrarCidadesOficiais: async (listaCidades = [], regionalId = '') => {
    if (!regionalId || listaCidades.length === 0) {
      toast.error("Dados de migração incompletos.");
      return false;
    }

    const loadingToast = toast.loading("Configurando Cidades...");

    try {
      const batch = writeBatch(db);
      
      listaCidades.forEach((cidade) => {
        // Gera ID único saneado: minúsculas, sem espaços, sem acentos
        const cidadeId = cidade
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
          
        const cityRef = doc(db, 'config_cidades', cidadeId);
        
        batch.set(cityRef, {
          nome: cidade.trim(),
          regionalId: regionalId, // Vínculo dinâmico com a regional selecionada
          status: 'ativo',
          createdAt: Date.now()
        });
      });

      await batch.commit();
      toast.success(`${listaCidades.length} cidades ativadas!`, { id: loadingToast });
      return true;
    } catch (e) {
      console.error("Erro na infraestrutura dinâmica:", e);
      toast.error("Falha na infraestrutura", { id: loadingToast });
      return false;
    }
  }
};

export { infraService };