import React from "react";
import { UserPlus, Edit, Trash2 } from "lucide-react";

/**
 * AtaVisitantes v2.0 - Adicionado checkbox "Tocando".
 * Gerencia a lista de visitantes do ministério, permitindo marcar quem
 * está tocando para evitar contagem dupla no total geral.
 */
const AtaVisitantes = ({
  visitantes,
  isInputDisabled,
  handleOpenVisitaModal,
  setVisitaToDelete,
  onToggleTocando,
}) => {
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
    </div>
  );
};

export default AtaVisitantes;
