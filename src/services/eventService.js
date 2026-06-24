import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, where, getDocs, writeBatch, or } from '../config/firebase'; 
import { deleteField, arrayUnion, arrayRemove, increment } from "firebase/firestore"; 
import { getAuth } from "firebase/auth"; 
import { PERMISSIONS_MAP, ROLES } from '../config/permissions'; 

let debounceTimers = {}; 
let updateBuffers = {}; 

// DICIONÁRIO DE SANITIZAÇÃO ESTÁTICA
const INSTRUMENT_ID_MAP = {
  'coral': 'coral', 'corais': 'coral', 'acordeon': 'acordeon', 'acordeons': 'acordeon',
  'clarinete': 'clarinete', 'clarinetes': 'clarinete', 'claronealto': 'claronealto', 
  'claronebaixo': 'claronebaixo', 'corneingles': 'corneingles', 'eufonio': 'eufonio', 
  'eufonios': 'eufonio', 'fagote': 'fagote', 'fagotes': 'fagote', 'flauta': 'flauta', 
  'flautas': 'flauta', 'flugelhorn': 'flugelhorn', 'oboe': 'oboe', 'oboes': 'oboe', 
  'orgao': 'orgao', 'organistas': 'orgao', 'saxalto': 'saxalto', 'saxbaritono': 'saxbaritono', 
  'saxsoprano': 'saxsoprano', 'saxtenor': 'saxtenor', 'trombone': 'trombone', 'trombones': 'trombone', 
  'trompa': 'trompa', 'trompas': 'trompa', 'trompete': 'trompete', 'trompetes': 'trompete', 
  'tuba': 'tuba', 'tubas': 'tuba', 'viola': 'viola', 'violas': 'viola', 'violino': 'violino', 
  'violinos': 'violino', 'violoncelo': 'violoncelo', 'violoncelos': 'violoncelo'
};

export const eventService = { 

  getUsersRegional: async (regionalId) => { 
    if (!regionalId) return []; 
    try { 
      const q = query( 
        collection(db, 'users'), 
        where('regionalId', '==', regionalId), 
        where('approved', '==', true) 
      ); 
      const snap = await getDocs(q); 
      return snap.docs.map(d => ({ uid: d.id, ...d.data() })); 
    } catch (e) { 
      console.error("Erro ao buscar usuários da regional:", e); 
      return []; 
    } 
  }, 

  subscribeToEvents: (user, callback) => { 
    if (!user || !user.uid) return; 
    
    let constraints = []; 

    if (user.activeComumId || user.comumId) { 
      constraints.push(where('comumId', '==', user.activeComumId || user.comumId)); 
    } 
    else if (user.activeCityId || user.cidadeId) { 
      constraints.push(where('cidadeId', '==', user.activeCityId || user.cidadeId)); 
    } 
    else if (user.activeRegionalId || user.regionalId) { 
      constraints.push(where('regionalId', '==', user.activeRegionalId || user.regionalId)); 
    } 

    if (user.accessLevel === ROLES.GEM || user.accessLevel === 'gem_local' || user.accessLevel === 'gem' || user.accessLevel === 'GEM') { 
      constraints = [or( 
        where('comumId', '==', user.comumId), 
        where('invitedUsers', 'array-contains', user.uid) 
      )]; 
    } 

    const q = query( 
      collection(db, 'events_global'), 
      ...constraints, 
      orderBy('date', 'desc') 
    ); 

    return onSnapshot(q, (snapshot) => { 
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); 
      callback(events); 
    }, (error) => { 
      console.error("Erro no Listener de Eventos Global:", error); 
    }); 
  }, 

  /**
   * Cria o evento em duas etapas sequenciais para eliminar o ponto cego do servidor
   */
  createEvent: async (comumId, eventData, userData = null) => { 
    if (!comumId) throw new Error("ID da Localidade ausente."); 
    
    const auth = getAuth(); 
    const currentUser = auth.currentUser; 

    const userRoleLevel = userData?.accessLevel || eventData.accessLevel;
    const isGemUser = userRoleLevel === ROLES.GEM || userRoleLevel === 'gem_local' || userRoleLevel === 'gem' || userRoleLevel === 'GEM';

    if (eventData.scope === 'regional' && isGemUser) { 
      throw new Error("Seu nível de acesso não permite criar eventos regionais."); 
    } 

    const { type, date, responsavel, regionalId, regionalNome, comumNome, cidadeId, cidadeNome, scope, invitedUsers } = eventData; 
    let initialCounts = {}; 

    const finalScope = isGemUser ? 'local' : (scope || 'local'); 
    const finalComumId = isGemUser ? (userData.comumId || comumId) : comumId; 

    try { 
      const localRef = collection(db, 'comuns', finalComumId, 'instrumentos_config'); 
      const localSnap = await getDocs(localRef); 
      
      if (localSnap.empty) { 
        throw new Error("CONFIG_REQUIRED"); 
      } 

      const sessoesDetectadas = new Set(); 

      localSnap.docs.forEach(docInst => { 
        const inst = docInst.data(); 
        const originalId = docInst.id; 
        const id = INSTRUMENT_ID_MAP[originalId.toLowerCase().trim()] || originalId.toLowerCase().trim();
        const sectionName = inst.section?.toUpperCase() || 'GERAL'; 
        sessoesDetectadas.add(sectionName); 

        if (id === 'coral' || id === 'orgao') { 
          if (finalScope === 'regional') { 
            initialCounts[id] = { 
              total: 0, 
              name: id === 'coral' ? 'CORAL' : 'ÓRGÃO', 
              section: sectionName, 
              evalType: inst.evalType || 'Sem', 
              responsibleId: null, 
              responsibleName: null, 
              updatedAt: Date.now() 
            }; 
            if (id === 'coral') { 
              initialCounts[id].irmaos = 0; 
              initialCounts[id].irmas = 0; 
              initialCounts[id].responsibleId_irmaos = null; 
              initialCounts[id].responsibleId_irmas = null; 
              initialCounts[id].responsibleName_irmaos = null; 
              initialCounts[id].responsibleName_irmas = null; 
            } 
          } else { 
            initialCounts[id] = { 
              total: 0, comum: 0, enc: 0, irmaos: 0, irmas: 0, 
              name: id === 'coral' ? 'CORAL' : 'ÓRGÃO', 
              section: sectionName, 
              evalType: inst.evalType || 'Sem', 
              responsibleId: null, 
              responsibleName: null, 
              updatedAt: Date.now() 
            }; 
          } 
        } else { 
          if (finalScope === 'regional') { 
            initialCounts[id] = { total: 0, updatedAt: Date.now() }; 
          } else { 
            initialCounts[id] = { total: 0, comum: 0, enc: 0, updatedAt: Date.now() }; 
          } 
        } 
      }); 

      sessoesDetectadas.forEach(sec => { 
        const metaKey = `meta_${sec.toLowerCase().replace(/\s/g, '_')}`; 
        initialCounts[metaKey] = { responsibleId: null, responsibleName: null, isActive: false, updatedAt: Date.now() }; 
      }); 
      
      const ataPayload = { status: 'open', ocorrencias: [] }; 
      if (finalScope === 'regional') {
        ataPayload.palavra = { anciao: '', livro: '', capitulo: '', verso: '', assunto: '' };
      }

      const payload = { 
        type: type || 'Ensaio Local', 
        scope: finalScope, 
        shadowScope: finalScope, 
        invitedUsers: Array.isArray(invitedUsers) ? invitedUsers : [], 
        date, 
        responsavel: responsavel || 'Pendente', 
        createdById: currentUser?.uid || null, 
        createdByLevel: userData?.accessLevel || eventData.accessLevel || 'basico', 
        comumNome: comumNome || '', 
        comumId: finalComumId, 
        cidadeId: cidadeId || '', 
        cidadeNome: cidadeNome || '', 
        regionalId: regionalId || '', 
        regionalNome: regionalNome || '', 
        ata: ataPayload, 
        counts: initialCounts, 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        dbVersion: "12.6-serial_fixed" 
      }; 

      // ETAPA 1: Salva o documento Pai primeiro para que ele passe a existir no banco físico
      const docNovoCriado = await addDoc(collection(db, 'events_global'), payload); 

      // ETAPA 2: Agora que o Pai já existe e está salvo, as subcoleções nominais não vão sofrer ponto cego
      if (finalScope !== 'regional') { 
        const batchChamada = writeBatch(db); 

        const musicosRef = collection(db, 'comuns', finalComumId, 'musicos_lista'); 
        const musicosSnap = await getDocs(musicosRef); 
        
        musicosSnap.docs.forEach(musicoDoc => { 
          const mData = musicoDoc.data(); 
          const llamadaRef = doc(collection(db, 'events_global', docNovoCriado.id, 'chamada_musicos'), musicoDoc.id); 
          const saneInstId = INSTRUMENT_ID_MAP[mData.instrumentoId?.toLowerCase().trim()] || mData.instrumentoId;

          batchChamada.set(llamadaRef, { 
            nome: (mData.nome || mData.name || 'IRMÃO(Ã)').toUpperCase().trim(), 
            instrumentoId: saneInstId, 
            instrumentoNome: (mData.instrumentoNome || mData.instrumentoId || 'GERAL').toUpperCase().trim(), 
            situacao: mData.situacao || "Oficializado", 
            presente: false, 
            avaliacao: 'Sem', 
            updatedAt: Date.now() 
          }); 
        }); 

        const ministerioSnap = await getDocs(collection(db, 'comuns', finalComumId, 'ministerio_lista')); 
        ministerioSnap.docs.forEach(minDoc => { 
          const minData = minDoc.data(); 
          const chamadaMinRef = doc(collection(db, 'events_global', docNovoCriado.id, 'chamada_ministerio'), minDoc.id); 
          batchChamada.set(chamadaMinRef, { 
            nome: (minData.nome || minData.name || 'OBREIRO').toUpperCase().trim(), 
            cargo: minData.cargo, 
            presente: false, 
            updatedAt: Date.now() 
          }); 
        }); 

        await batchChamada.commit(); 
      } 

      return docNovoCriado; 

    } catch (err) { 
      console.error("Erro na criação do evento:", err); 
      if (err.message === "CONFIG_REQUIRED") throw err; 
      throw err;
    } 
  }, 

  reopenAta: async (eventId) => { 
    if (!eventId) return; 
    const eventRef = doc(db, 'events_global', eventId); 
    try { 
      return await updateDoc(eventRef, { "ata.status": "open", updatedAt: Date.now() }); 
    } catch (e) { 
      throw new Error("Sem permissão para reabrir."); 
    } 
  }, 

  addGuest: async (eventId, userObjectOrId) => { 
    if (!eventId || !userObjectOrId) return; 
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId; 
    const eventRef = doc(db, 'events_global', eventId); 
    try { 
      return await updateDoc(eventRef, { invitedUsers: arrayUnion(uid), updatedAt: Date.now() }); 
    } catch (e) { console.error("Erro convidado:", e); } 
  }, 

  removeGuest: async (eventId, userObjectOrId) => { 
    if (!eventId || !userObjectOrId) return; 
    const uid = typeof userObjectOrId === 'object' ? userObjectOrId.uid : userObjectOrId; 
    const eventRef = doc(db, 'events_global', eventId); 
    try { 
      return await updateDoc(eventRef, { invitedUsers: arrayRemove(uid), updatedAt: Date.now() }); 
    } catch (e) { console.error("Erro remover convidado:", e); } 
  }, 

  deleteEvent: async (comumId, eventId) => { 
    if (!eventId) throw new Error("ID do evento não fornecido."); 
    try { 
      const eventRef = doc(db, 'events_global', eventId); 
      await deleteDoc(eventRef); 
      return true; 
    } catch (error) { 
      console.error("ERRO_SERVICE_DELETE:", error.message); 
      throw new Error("PERMISSAO_NEGADA_OU_FALHA_REDE"); 
    } 
  }, 

  updateInstrumentCount: async (comumId, eventId, { instId, field, value, userData, section, customName }) => { 
    if (!eventId || !instId) return; 

    const rawId = instId.toLowerCase().trim();
    let targetId = INSTRUMENT_ID_MAP[rawId] || rawId; 

    const timerKey = `${eventId}_${targetId}`; 
    const fieldToUpdate = field === 'total_simples' ? 'total' : field; 
    const val = Math.max(0, parseInt(value) || 0); 

    if (!updateBuffers[timerKey]) updateBuffers[timerKey] = {}; 
    updateBuffers[timerKey][fieldToUpdate] = val; 

    if (debounceTimers[timerKey]) clearTimeout(debounceTimers[timerKey]); 

    debounceTimers[timerKey] = setTimeout(async () => { 
      const eventRef = doc(db, 'events_global', eventId); 
      const bufferCopy = { ...updateBuffers[timerKey] }; 
      
      delete updateBuffers[timerKey]; 
      delete debounceTimers[timerKey]; 

      try { 
        const sectionKey = (section || '').toUpperCase(); 
        
        if (targetId === 'irmas' || targetId === 'irmaos' || sectionKey === 'IRMANDADE') { 
          targetId = 'coral'; 
        } else if (targetId === 'orgao' || sectionKey === 'ORGANISTAS') { 
          targetId = 'orgao'; 
        } 

        const finalUpdates = {}; 
        const baseKey = `counts.${targetId}`; 

        Object.keys(bufferCopy).forEach(f => { 
          finalUpdates[`${baseKey}.${f}`] = bufferCopy[f]; 
        }); 

        finalUpdates[`${baseKey}.updatedAt`] = Date.now(); 
        finalUpdates[`updatedAt`] = Date.now(); 
        
        await updateDoc(eventRef, finalUpdates); 
        
      } catch (e) { 
        console.error("Erro na Gravação Stabilizada:", e.message); 
      } 
    }, 400); 
  }, 

  removeExtraInstrument: async (comumId, eventId, instId) => { 
    if (!eventId || !instId) return; 
    try { 
      return await updateDoc(doc(db, 'events_global', eventId), { [`counts.${instId}`]: deleteField(), updatedAt: Date.now() }); 
    } catch (e) { console.error("Erro ao remover instrumento extra:", e); } 
  }, 

  saveAtaData: async (comumId, eventId, ataData) => { 
    if (!eventId) throw new Error("Evento inválido."); 
    const eventRef = doc(db, 'events_global', eventId); 
    
    let todosHinos = []; 
    let partesValidas = Array.isArray(ataData.partes) ? ataData.partes : []; 
    partesValidas.forEach(p => { 
      if (p.hinos) todosHinos = [...todosHinos, ...p.hinos.filter(h => h && h.trim() !== '')]; 
    }); 

    const finalAta = { 
      ...ataData, 
      hinosChamados: todosHinos.length, 
      hinosLista: todosHinos, 
      lastUpdate: Date.now(), 
      status: ataData.status || 'open' 
    }; 

    try { 
      await updateDoc(eventRef, { ata: finalAta, updatedAt: Date.now() }); 
    } catch (e) { 
      console.error("Erro salvar Ata:", e); 
      throw new Error("Erro de salvamento."); 
    } 
  }, 

  addMusicoComum: async (comumId, musicoPayload) => { 
    if (!comumId || !musicoPayload.nome || !musicoPayload.instrumentoId) throw new Error("Parâmetros incompletos."); 
    try { 
      const sId = INSTRUMENT_ID_MAP[musicoPayload.instrumentoId.toLowerCase().trim()] || musicoPayload.instrumentoId;
      const novaFichaRef = doc(collection(db, 'comuns', comumId, 'musicos_lista')); 
      const payloadSaneado = { 
        nome: musicoPayload.nome.toUpperCase().trim(), 
        instrumentoId: sId, 
        instrumentoNome: (musicoPayload.instrumentoNome || sId).toUpperCase().trim(), 
        situacao: musicoPayload.situacao || "Oficializado", 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      }; 
      await setDoc(novaFichaRef, payloadSaneado); 
      return novaFichaRef.id; 
    } catch (e) { 
      console.error("Erro ao adicionar músico comum:", e); 
      throw new Error("Erro ao salvar músico."); 
    } 
  }, 

  updateMusicoComum: async (comumId, musicoId, camposNovos) => { 
    if (!comumId || !musicoId) throw new Error("Identificadores ausentes."); 
    try { 
      const fichaRef = doc(db, 'comuns', comumId, 'musicos_lista', musicoId); 
      const payloadUpdates = { ...camposNovos, updatedAt: Date.now() }; 
      if (payloadUpdates.nome) payloadUpdates.nome = payloadUpdates.nome.toUpperCase().trim(); 
      if (payloadUpdates.instrumentoId) payloadUpdates.instrumentoId = INSTRUMENT_ID_MAP[payloadUpdates.instrumentoId.toLowerCase().trim()] || payloadUpdates.instrumentoId;
      if (payloadUpdates.instrumentoNome) payloadUpdates.instrumentoNome = payloadUpdates.instrumentoNome.toUpperCase().trim(); 
      await updateDoc(fichaRef, payloadUpdates); 
      return true; 
    } catch (e) { 
      console.error("Erro ao atualizar músico comum:", e); 
      throw new Error("Erro ao salvar alterações."); 
    } 
  }, 

  deleteMusicoComum: async (comumId, musicoId) => { 
    if (!comumId || !musicoId) throw new Error("Identificadores ausentes."); 
    try { 
      const fichaRef = doc(db, 'comuns', comumId, 'musicos_lista', musicoId); 
      await deleteDoc(fichaRef); 
      return true; 
    } catch (e) { 
      console.error("Erro ao excluir músico comum:", e); 
      throw new Error("Erro ao deletar músico."); 
    } 
  } 
};