// Explicação: Importa os motores de conexão física com o banco de dados Firestore incluindo o onSnapshot reativo
import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "./firebase";
import toast from "react-hot-toast";

// 🚀 ANALOGIA DO PO: Esse serviço gerencia o "Catálogo Oficial de Níveis de Teste".
export const testLevelService = {
  /**
   * 🌱 MOTOR DE SEMENTE (SEED INITIALIZER) - CUSTO ZERO APÓS EXECUÇÃO
   * Injeta os níveis de teste padrão caso a coleção do banco de dados nasça vazia.
   */
  initializeDefaultLevels: async () => {
    try {
      const levelsRef = collection(db, "config_niveis_teste");
      const snap = await getDocs(levelsRef);

      // Economia de Quota: Se já existirem níveis cadastrados, aborta o download para não gastar gravações à toa.
      if (!snap.empty) return;

      // Padrões do sistema solicitados para a transição de categoria/segmento
      const defaultLevels = [
        {
          id: "aluno",
          name: "Aluno",
          description: "Candidato em fase de aprendizado inicial",
          active: true,
          order: 1,
        },
        {
          id: "aprendiz",
          name: "Aprendiz",
          description: "Apto a tocar nos cultos de jovens e menores",
          active: true,
          order: 2,
        },
        {
          id: "oficializado",
          name: "Oficializado",
          description: "Apto a tocar em todos os cultos e serviços",
          active: true,
          order: 3,
        },
        {
          id: "rjm",
          name: "RJM",
          description: "Reunião de Jovens e Menores",
          active: true,
          order: 4,
        },
      ];

      // Gravação em lote simplificada usando setDoc para cravar IDs limpos
      for (const level of defaultLevels) {
        await setDoc(doc(db, "config_niveis_teste", level.id), {
          name: level.name,
          description: level.description,
          active: level.active,
          order: level.order,
          createdAt: Date.now(),
        });
      }
      console.log("🌱 Níveis de teste padrão inicializados com sucesso.");
    } catch (error) {
      console.error("Falha ao rodar semente de níveis de teste:", error);
    }
  },

  /**
   * 📡 REAL-TIME LISTENER (OUVINTE REATIVO)
   * Consome a lista de níveis para alimentar o Select suspenso em tempo real.
   */
  listenToLevels: (onUpdate) => {
    const levelsRef = collection(db, "config_niveis_teste");
    const q = query(levelsRef, orderBy("order", "asc"));

    // Retorna a escuta nativa para o componente se desvincular ao fechar a tela, poupando memória do celular.
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(docs);
    });
  },

  /**
   * ➕ ADICIONAR NOVO NÍVEL - EXCLUSIVO ADM REGIONAL
   * Cadastra uma nova opção de teste para a comarca inteira.
   */
  createLevel: async (name, description, orderIndex = 99) => {
    if (!name.trim()) {
      toast.error("O nome do nível é obrigatório.");
      return;
    }

    // Gera um ID amigável baseado no nome digitado (ex: "Necessita Treino" -> "necessita_treino")
    const idSaneado = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w]/g, "");

    try {
      const docRef = doc(db, "config_niveis_teste", idSaneado);

      await setDoc(docRef, {
        name: name.trim(),
        description: description?.trim() || "",
        active: true,
        order: parseInt(orderIndex) || 99,
        createdAt: Date.now(),
      });

      toast.success("Novo nível de teste adicionado!");
      return true;
    } catch (error) {
      toast.error("Erro ao criar nível de teste.");
      throw error;
    }
  },

  /**
   * ✏️ ATUALIZAR NÍVEL EXISTENTE - EXCLUSIVO ADM REGIONAL
   * Permite desativar ou mudar o nome de expressão de um nível de teste.
   */
  updateLevel: async (levelId, payload) => {
    try {
      const docRef = doc(db, "config_niveis_teste", levelId);
      await updateDoc(docRef, {
        ...payload,
        updatedAt: Date.now(),
      });
      toast.success("Nível de teste atualizado.");
      return true;
    } catch (error) {
      toast.error("Erro ao atualizar nível.");
      throw error;
    }
  },

  /**
   * ❌ EXCLUIR NÍVEL - EXCLUSIVO ADM REGIONAL
   * Remove a opção da lista suspensa.
   */
  deleteLevel: async (levelId) => {
    try {
      const docRef = doc(db, "config_niveis_teste", levelId);
      await deleteDoc(docRef);
      toast.success("Nível removido com sucesso.");
      return true;
    } catch (error) {
      toast.error("Erro ao remover nível de teste.");
      throw error;
    }
  },
};
