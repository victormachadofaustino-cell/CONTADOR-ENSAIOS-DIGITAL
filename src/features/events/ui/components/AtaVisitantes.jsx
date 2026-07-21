import React, { useState } from "react";
import {
  UserPlus,
  Edit,
  Trash2,
  X,
  Music,
  MapPin,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { Field, Select } from "./AtaUIComponents";
import { ordenarLista } from "../../../../shared/utils/listUtils.js";

/**
 * AtaVisitantes v2.0 - Adicionado checkbox "Tocando".
 * Gerencia a lista de visitantes do ministério, permitindo marcar quem
 * está tocando para evitar contagem dupla no total geral.
 * v3.0 - Internalizado o controle do modal para corrigir o bug de digitação.
 */
const AtaVisitantes = ({
  visitantes,
  isInputDisabled,
  setVisitaToDelete,
  onToggleTocando,
  onUpdateVisitantes,
  referenciaMinisterio,
}) => {
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [currentVisita, setCurrentVisita] = useState({
    nome: "",
    min: "",
    inst: "",
    bairro: "",
    cidadeUf: "",
    dataEnsaio: "",
    hora: "",
    contato: "",
  });

  const handleOpenVisitaModal = (v = null, idx = null) => {
    if (isInputDisabled) return;
    const initialState = {
      nome: "",
      min: "",
      inst: "",
      bairro: "",
      cidadeUf: "",
      dataEnsaio: "",
      hora: "",
      contato: "",
    };
    setCurrentVisita(v ? { ...v } : initialState);
    setEditIndex(v ? idx : null);
    setShowVisitaModal(true);
  };

  const handleSaveVisita = () => {
    if (isInputDisabled) return;
    if (!currentVisita.nome || !currentVisita.min)
      return toast.error("Informe o nome e o ministério.");

    // Boa prática: Normaliza os dados para maiúsculas apenas no momento de salvar.
    const visitaToSave = {
      ...currentVisita,
      nome: currentVisita.nome.toUpperCase(),
      inst: (currentVisita.inst || "").toUpperCase(),
      bairro: (currentVisita.bairro || "").toUpperCase(),
      cidadeUf: (currentVisita.cidadeUf || "").toUpperCase(),
    };

    let updated = [...(visitantes || [])];
    if (editIndex !== null) {
      updated[editIndex] = visitaToSave;
    } else {
      updated.push({ ...visitaToSave, id: Date.now() });
    }
    onUpdateVisitantes(ordenarLista(updated, "nome", "min"));
    setShowVisitaModal(false);
  };

  return (
    <div className="space-y-4">
      {!isInputDisabled && (
        <button
          onClick={() => handleOpenVisitaModal()}
          className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase text-[10px] italic active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-slate-900"
        >
          <UserPlus size={18} /> Adicionar Visitante
        </button>
      )}
      <div className="space-y-3">
        {(visitantes || []).length === 0 ? (
          <div className="py-10 text-center text-slate-300 font-black uppercase italic text-[10px] bg-white rounded-[2rem] border border-dashed border-slate-200">
            Nenhum visitante registrado.
          </div>
        ) : (
          visitantes.map((v, idx) => (
            <div
              key={v.id || idx}
              className="flex flex-col p-5 bg-white rounded-[2.2rem] border border-slate-100 shadow-sm transition-all group hover:border-blue-100"
            >
              <div className="flex justify-between items-start">
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-[900] uppercase text-slate-950 italic leading-tight mb-1 break-words">
                    {v.nome}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                    <span className="text-[10px] font-black text-blue-600 uppercase italic leading-none">
                      {v.min}
                    </span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-[10px] font-black text-slate-500 uppercase italic leading-none truncate">
                      {v.inst || "Instrumento N/I"}
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase leading-none">
                    <span className="truncate">
                      {v.bairro || "Bairro N/I"}{" "}
                      {v.cidadeUf ? `(${v.cidadeUf})` : ""}
                    </span>
                  </p>
                </div>
                {!isInputDisabled && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenVisitaModal(v, idx)}
                      className="p-3 text-slate-300 hover:text-blue-600 active:bg-blue-50 rounded-2xl transition-all"
                      aria-label={`Editar visitante ${v.nome}`}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisitaToDelete(v.id || idx);
                      }}
                      className="p-3 text-slate-200 hover:text-red-500 active:bg-red-50 rounded-2xl transition-all"
                      aria-label={`Excluir visitante ${v.nome}`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
              {/* Checkbox "Tocando" */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isInputDisabled) onToggleTocando(idx);
                  }}
                  className={`cursor-pointer flex items-center p-2 rounded-lg transition-all ${isInputDisabled ? "opacity-50" : "hover:bg-slate-100"}`}
                >
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${v.tocando ? "text-green-600" : "text-slate-500"}`}
                  >
                    {v.tocando
                      ? "✓ Tocando na Orquestra"
                      : "Marcar como tocando"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showVisitaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-200 flex items-start justify-center p-4 pt-20 overflow-y-auto no-scrollbar text-left">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar text-left relative"
            >
              <button
                onClick={() => setShowVisitaModal(false)}
                className="absolute top-8 right-8 text-slate-300 active:scale-95 transition-all"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter mb-8 leading-none">
                Dados da Visita
              </h3>
              <div className="space-y-4">
                <Field
                  label="Nome Completo *"
                  val={currentVisita.nome}
                  disabled={isInputDisabled}
                  onChange={(v) =>
                    setCurrentVisita({ ...currentVisita, nome: v })
                  }
                />
                <Select
                  label="Ministério / Cargo *"
                  val={currentVisita.min}
                  options={referenciaMinisterio}
                  disabled={isInputDisabled}
                  onChange={(v) =>
                    setCurrentVisita({ ...currentVisita, min: v })
                  }
                />
                <Field
                  label="Instrumento"
                  val={currentVisita.inst}
                  disabled={isInputDisabled}
                  onChange={(v) =>
                    setCurrentVisita({ ...currentVisita, inst: v })
                  }
                  icon={<Music size={10} />}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Bairro"
                    val={currentVisita.bairro}
                    disabled={isInputDisabled}
                    onChange={(v) =>
                      setCurrentVisita({ ...currentVisita, bairro: v })
                    }
                    icon={<MapPin size={10} />}
                  />
                  <Field
                    label="Cidade/UF"
                    val={currentVisita.cidadeUf}
                    disabled={isInputDisabled}
                    onChange={(v) =>
                      setCurrentVisita({ ...currentVisita, cidadeUf: v })
                    }
                  />
                </div>
                <Field
                  label="Celular / Contato"
                  val={currentVisita.contato}
                  disabled={isInputDisabled}
                  onChange={(v) =>
                    setCurrentVisita({ ...currentVisita, contato: v })
                  }
                  icon={<Phone size={10} />}
                />
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <Field
                    label="Data Ensaio"
                    val={currentVisita.dataEnsaio}
                    disabled={isInputDisabled}
                    onChange={(v) =>
                      setCurrentVisita({ ...currentVisita, dataEnsaio: v })
                    }
                    icon={<Calendar size={10} />}
                    placeholder="Ex: 3º Sábado"
                  />
                  <Field
                    label="Horário"
                    val={currentVisita.hora}
                    disabled={isInputDisabled}
                    onChange={(v) =>
                      setCurrentVisita({ ...currentVisita, hora: v })
                    }
                    icon={<Clock size={10} />}
                    placeholder="Ex: 19:00"
                  />
                </div>
                {!isInputDisabled && (
                  <button
                    onClick={handleSaveVisita}
                    disabled={!currentVisita.nome || !currentVisita.min}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 active:scale-95 transition-all ${!currentVisita.nome || !currentVisita.min ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white shadow-blue-100"}`}
                  >
                    Salvar Registro
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaVisitantes;
