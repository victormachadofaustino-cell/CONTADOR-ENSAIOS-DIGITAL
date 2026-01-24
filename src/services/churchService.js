import { db, doc, collection, writeBatch, getDocs, query, where, setDoc } from '../config/firebase';
import { DEFAULT_INSTRUMENTS } from '../config/config';
import toast from 'react-hot-toast';

export const churchService = {

  /**
   * CRIAÇÃO DE NOVA CIDADE (Infraestrutura Regional)
   * Permite que Master e Comissão expandam a malha de cidades da regional.
   * @param {Object} data - { nome, regionalId, uf }
   */
  createCity: async ({ nome, regionalId, uf = 'SP' }) => {
    if (!nome || !regionalId) {
      throw new Error("Nome da cidade e Regional ID são obrigatórios.");
    }

    const loadingToast = toast.loading("Registrando cidade...");

    try {
      // Gerar ID Saneado (Ex: "Várzea Paulista" -> "varzea_paulista")
      const cidadeId = nome
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_');

      const cityRef = doc(db, 'config_cidades', cidadeId);

      await setDoc(cityRef, {
        nome: nome.trim().toUpperCase(),
        regionalId,
        uf: uf.toUpperCase(),
        status: 'ativo',
        updatedAt: Date.now()
      });

      toast.success("Cidade ativada com sucesso!", { id: loadingToast });
      return true;
    } catch (e) {
      console.error("Erro ao criar cidade:", e);
      toast.error("Falha ao registrar cidade.", { id: loadingToast });
      return false;
    }
  },

  /**
   * CRIAÇÃO DE NOVA COMUM (Escalável)
   * Saneado para garantir atomicidade e compatibilidade com as Security Rules.
   * @param {Object} data - { nome, cidadeId, regionalId, cidadeNome, regionalNome }
   */
  createChurch: async ({ nome, cidadeId, regionalId, cidadeNome, regionalNome }) => {
    if (!nome || !cidadeId || !regionalId) {
      throw new Error("Dados insuficientes para criar a localidade.");
    }

    const loadingToast = toast.loading("Registrando localidade...");

    try {
      const batch = writeBatch(db);
      
      // 1. Gerar ID Saneado (Ex: "Vila Rio Branco" -> "vila_rio_branco")
      // Remove acentos e espaços para garantir compatibilidade de URL e Regras
      const comumId = nome
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_');

      const churchRef = doc(db, 'comuns', comumId);

      // 2. Definir dados da Igreja com denormalização para performance
      batch.set(churchRef, {
        comum: nome.trim().toUpperCase(),
        cidadeId,
        regionalId,
        cidadeNome: cidadeNome || '', // Denormalização para evitar JOINS custosos
        regionalNome: regionalNome || '',
        status: 'ativo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // 3. Injetar Matriz Nacional de Instrumentos (O "Cérebro" do Blueprint)
      // Garante que a igreja já nasça com a orquestra configurada no config.js
      // Saneamento de ID de instrumento aplicado para evitar "sax_alto" vs "saxalto"
      DEFAULT_INSTRUMENTS.Orquestra.forEach(inst => {
        const saneInstId = inst.id.replace(/_/g, ''); // Normaliza para o padrão do banco (ex: saxalto)
        const instRef = doc(db, 'comuns', comumId, 'instrumentos_config', saneInstId);
        
        batch.set(instRef, {
          id: saneInstId,
          name: inst.name.toUpperCase(),
          section: inst.section.toUpperCase(),
          evalType: 'Sem', // Padrão inicial de avaliação
          active: true,
          updatedAt: Date.now()
        });
      });

      await batch.commit();
      toast.success("Localidade e Orquestra configuradas!", { id: loadingToast });
      return true;

    } catch (e) {
      console.error("Erro ao criar comum:", e);
      toast.error("Erro ao configurar localidade.", { id: loadingToast });
      return false;
    }
  },

  /**
   * Busca todas as comuns de uma cidade específica para filtros de interface
   */
  getChurchesByCity: async (cidadeId) => {
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', cidadeId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};