import { db, doc, collection, writeBatch, getDocs, query, where, addDoc } from '../config/firebase';
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
      // CORREÇÃO: Usamos addDoc para garantir ID aleatório automático do Firebase
      // Removida a geração de ID manual baseada no nome (slug)
      await addDoc(collection(db, 'config_cidades'), {
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
      // 1. Gerar uma referência de documento COM ID ALEATÓRIO antes de iniciar o batch
      // Isso evita IDs baseados em nome (ex: jardim_do_lago) e garante o padrão v2.1
      const newChurchRef = doc(collection(db, 'comuns')); 
      const comumId = newChurchRef.id; 

      const batch = writeBatch(db);
      
      // 2. Definir dados da Igreja com denormalização para performance
      batch.set(newChurchRef, {
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
      // Utiliza os IDs fixos do config.js para a subcoleção, mas dentro da Comum com ID aleatório
      DEFAULT_INSTRUMENTS.Orquestra.forEach(inst => {
        // Saneamento de ID interno de instrumento para consistência (ex: saxalto)
        const saneInstId = inst.id.replace(/_/g, ''); 
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