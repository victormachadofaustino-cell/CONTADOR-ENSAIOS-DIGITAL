import { db, collection, getDocs, query, where, doc, updateDoc, orderBy } from '../config/firebase';

/**
 * SERVIÇO DE ADMINISTRAÇÃO E GESTÃO DE HIERARQUIA
 * Focado em escalabilidade massiva e isolamento por GPS (Regional/Cidade)
 */
export const adminService = {

  /**
   * BUSCA USUÁRIOS PARA APROVAÇÃO (Otimizado para o GPS Master)
   * @param {string} regionalId - Filtro obrigatório para manter o isolamento
   */
  getUsersByJurisdiction: async (regionalId) => {
    if (!regionalId) return [];

    try {
      // Query otimizada: busca apenas quem pertence à regional ativa
      // Isso impede que o navegador baixe dados desnecessários de outras regiões
      const q = query(
        collection(db, 'users'),
        where('regionalId', '==', regionalId),
        orderBy('createdAt', 'desc')
      );

      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar usuários da jurisdição:", error);
      throw new Error("Falha na listagem de segurança.");
    }
  },

  /**
   * ATUALIZA STATUS DE APROVAÇÃO OU CARGO
   * @param {string} userId - ID do usuário alvo
   * @param {Object} updates - Campos a serem alterados (approved, role, escopo, etc)
   */
  updateUserPermissions: async (userId, updates) => {
    if (!userId) return;

    try {
      const userRef = doc(db, 'users', userId);
      
      // Adicionamos um timestamp de auditoria para saber quando a permissão mudou
      const finalUpdates = {
        ...updates,
        permissionsChangedAt: Date.now()
      };

      await updateDoc(userRef, finalUpdates);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar permissões:", error);
      throw new Error("Acesso negado pelo servidor de segurança.");
    }
  },

  /**
   * BUSCA TODAS AS CIDADES DE UMA REGIONAL (Para filtros de admin)
   */
  getRegionalCities: async (regionalId) => {
    if (!regionalId) return [];
    const q = query(collection(db, 'config_cidades'), where('regionalId', '==', regionalId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome));
  }
};