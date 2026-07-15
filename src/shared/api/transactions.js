import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase"; // Aponta para o arquivo de configuração correto do Firebase

/**
 * [TRANSACIONAL] Atualiza a contagem de um instrumento para um evento de forma atômica.
 * Garante que as contagens de músicos da 'comum' e o 'total' do instrumento sejam
 * atualizadas em uma única operação, prevenindo condições de corrida. A contagem de 'enc'
 * (encarregados) é tratada como uma anotação separada e não afeta o total.
 *
 * @param {string} eventId - O ID do evento a ser atualizado.
 * @param {string} instrumentId - O ID do instrumento (ex: 'violino', 'clarinete').
 * @param {'comum' | 'enc'} type - O campo a ser incrementado/decrementado ('comum' ou 'enc').
 * @param {number} value - O valor a ser adicionado (normalmente 1 ou -1).
 */
export async function updateInstrumentCount(
  eventId,
  instrumentId,
  type,
  value,
) {
  if (!eventId || !instrumentId) {
    console.error("ID do evento e do instrumento são obrigatórios.");
    return;
  }

  const eventRef = doc(db, "events_global", eventId);

  try {
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        throw new Error("Documento do evento não encontrado!");
      }

      const eventData = eventDoc.data();
      const counts = eventData.counts || {};
      const instrumentCounts = counts[instrumentId] || {
        comum: 0,
        enc: 0,
        total: 0,
      };

      // Garante que os contadores são números
      const currentComum = Number(instrumentCounts.comum) || 0;
      const currentEnc = Number(instrumentCounts.enc) || 0;
      const currentTotal = Number(instrumentCounts.total) || 0;
      const updatePayload = {};

      if (type === "comum") {
        // Conforme sua solicitação, a contagem principal (total) é feita
        // através do tipo 'comum', que atualiza ambos os campos.
        const newComum = currentComum + value;
        const newTotal = currentTotal + value;
        if (newComum < 0 || newTotal < 0) {
          return; // Previne contagens negativas.
        }
        updatePayload[`counts.${instrumentId}.comum`] = newComum;
        updatePayload[`counts.${instrumentId}.total`] = newTotal;
      } else if (type === "enc") {
        // 'enc' (Encarregados) é uma contagem separada.
        const newEnc = currentEnc + value;
        if (newEnc < 0) {
          return; // Previne contagens negativas.
        }
        updatePayload[`counts.${instrumentId}.enc`] = newEnc;
      } else if (type === "total") {
        // Adicionado: Lógica para contagem regional que atualiza apenas o total.
        const newTotal = currentTotal + value;
        if (newTotal < 0) {
          return; // Previne contagens negativas.
        }
        updatePayload[`counts.${instrumentId}.total`] = newTotal;
      }

      if (Object.keys(updatePayload).length > 0) {
        transaction.update(eventRef, updatePayload);
      }
    });
  } catch (e) {
    console.error("Falha na transação de contagem: ", e);
    throw new Error("Não foi possível atualizar a contagem. Tente novamente.");
  }
}

/**
 * [TRANSACIONAL] Atualiza a contagem do CORAL ('irmos' e 'irmas') para um evento de forma atômica.
 * Garante que 'total' seja sempre a soma de 'irmaos' e 'irmas'.
 *
 * @param {string} eventId - O ID do evento a ser atualizado.
 * @param {'irmaos' | 'irmas'} type - O tipo de membro do coral a ser incrementado/decrementado.
 * @param {number} value - O valor a ser adicionado (normalmente 1 ou -1).
 */
export async function updateChoirCount(eventId, type, value) {
  if (!eventId) {
    console.error("ID do evento é obrigatório.");
    return;
  }

  const eventRef = doc(db, "events_global", eventId);

  try {
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        throw new Error("Documento do evento não encontrado!");
      }

      const counts = eventDoc.data().counts || {};
      // Garante a leitura correta independente da capitalização (legado vs. novo).
      const choirCounts = counts.Coral ||
        counts.coral || { irmaos: 0, irmas: 0, total: 0 };

      const currentIrmaos = Number(choirCounts.irmaos) || 0;
      const currentIrmas = Number(choirCounts.irmas) || 0;

      let newIrmaos = currentIrmaos;
      let newIrmas = currentIrmas;

      if (type === "irmaos") {
        newIrmaos += value;
      } else if (type === "irmas") {
        newIrmas += value;
      }

      if (newIrmaos < 0 || newIrmas < 0) return;

      // Padroniza a escrita para "coral" (minúsculo) para manter a consistência.
      transaction.update(eventRef, {
        "counts.coral.irmaos": newIrmaos,
        "counts.coral.irmas": newIrmas,
        "counts.coral.total": newIrmaos + newIrmas,
      });
    });
  } catch (e) {
    console.error("Falha na transação de contagem do coral: ", e);
    throw new Error(
      "Não foi possível atualizar a contagem do coral. Tente novamente.",
    );
  }
}
