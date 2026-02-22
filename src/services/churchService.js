import { db, doc, collection, writeBatch, getDocs, query, where, addDoc, updateDoc, setDoc, deleteDoc } from '../config/firebase';
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
      const newChurchRef = doc(collection(db, 'comuns')); 
      const comumId = newChurchRef.id; 

      const batch = writeBatch(db);
      
      batch.set(newChurchRef, {
        comum: nome.trim().toUpperCase(),
        cidadeId,
        regionalId,
        cidadeNome: cidadeNome || '', 
        regionalNome: regionalNome || '',
        status: 'ativo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      DEFAULT_INSTRUMENTS.Orquestra.forEach(inst => {
        const saneInstId = inst.id.replace(/_/g, ''); 
        const instRef = doc(db, 'comuns', comumId, 'instrumentos_config', saneInstId);
        
        batch.set(instRef, {
          id: saneInstId,
          name: inst.name.toUpperCase(),
          section: inst.section.toUpperCase(),
          evalType: 'Sem', 
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
   * ATUALIZAÇÃO DE DADOS DA COMUM (Endereço, Telefone, etc)
   */
  updateChurchDetails: async (comumId, data) => {
    if (!comumId) throw new Error("ID da comum não fornecido.");
    
    try {
      const churchRef = doc(db, 'comuns', comumId);
      await updateDoc(churchRef, {
        ...data,
        updatedAt: Date.now()
      });
      return true;
    } catch (e) {
      console.error("Erro ao atualizar detalhes da comum:", e);
      throw e;
    }
  },

  /**
   * GESTÃO INDIVIDUAL DO MINISTÉRIO (v5.5 - Suporte a Edição e Ordenação)
   */
  addMinistryMember: async (comumId, memberData) => {
    if (!comumId) throw new Error("ID da comum ausente.");
    try {
      const colRef = collection(db, 'comuns', comumId, 'ministerio_lista');
      return await addDoc(colRef, {
        ...memberData,
        nome: memberData.nome.toUpperCase(),
        ministerio: memberData.ministerio,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error("Erro ao adicionar obreiro:", e);
      throw e;
    }
  },

  updateMinistryMember: async (comumId, memberId, data) => {
    if (!comumId || !memberId) throw new Error("IDs ausentes para atualização.");
    try {
      const docRef = doc(db, 'comuns', comumId, 'ministerio_lista', memberId);
      await updateDoc(docRef, {
        ...data,
        nome: data.nome?.toUpperCase(),
        updatedAt: Date.now()
      });
      return true;
    } catch (e) {
      console.error("Erro ao editar obreiro:", e);
      throw e;
    }
  },

  deleteMinistryMember: async (comumId, memberId) => {
    if (!comumId || !memberId) throw new Error("IDs ausentes para exclusão.");
    try {
      const docRef = doc(db, 'comuns', comumId, 'ministerio_lista', memberId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Erro ao excluir obreiro:", e);
      throw e;
    }
  },

  /**
   * COMPATIBILIDADE: Atualização em Lote (Mantida para migrações)
   */
  updateMinistryList: async (comumId, ministryData) => {
    if (!comumId) throw new Error("ID da comum não fornecido.");
    const loadingToast = toast.loading("Salvando ministério...");
    try {
      const ministryRef = doc(db, 'comuns', comumId, 'ministerio_lista', 'lista');
      await setDoc(ministryRef, {
        membros: ministryData,
        updatedAt: Date.now()
      }, { merge: true });
      toast.success("Lista atualizada!", { id: loadingToast });
      return true;
    } catch (e) {
      console.error("Erro ao salvar lista:", e);
      toast.error("Erro ao salvar ministério.", { id: loadingToast });
      throw e;
    }
  },

  /**
   * ATUALIZAÇÃO DE NOME COM PROPAGAÇÃO HISTÓRICA
   */
  updateChurchName: async (comumId, novoNome) => {
    if (!comumId || !novoNome) return;
    
    const nomeLimpo = novoNome.trim().toUpperCase();
    const loadingToast = toast.loading("Sincronizando histórico...");

    try {
      const batch = writeBatch(db);
      const churchRef = doc(db, 'comuns', comumId);
      batch.update(churchRef, { 
        comum: nomeLimpo,
        updatedAt: Date.now()
      });

      const q = query(collection(db, 'events_global'), where('comumId', '==', comumId));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((eventDoc) => {
        batch.update(doc(db, 'events_global', eventDoc.id), {
          comumNome: nomeLimpo
        });
      });

      await batch.commit();
      toast.success("Nome e histórico atualizados!", { id: loadingToast });
      return true;
    } catch (e) {
      console.error("Erro na propagação de nome:", e);
      toast.error("Erro ao sincronizar nome.", { id: loadingToast });
      return false;
    }
  },

  getChurchesByCity: async (cidadeId) => {
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', cidadeId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};