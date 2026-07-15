import React from "react";
import { ShieldCheck } from "lucide-react";

/**
 * AtaMinisterioLocal v2.1 - Unificado e com checkbox "Tocando".
 * Combina a interface original com a nova funcionalidade para ensaios locais e regionais.
 */
const AtaMinisterioLocal = ({
  localMinisterio,
  presencaLocal,
  presencaLocalFull,
  isInputDisabled,
  togglePresencaLocal,
  onToggleTocando,
  isRegional = false,
}) => {
  // Função auxiliar para padronizar as descrições ministeriais por extenso
  const formatRole = (role) => {
    const rolesMap = {
      Anciao: "Ancião",
      Anciães: "Ancião",
      Diacono: "Diácono",
      "Cooperador do Oficio": "Cooperador do Ofício",
      "Cooperador do Ofício": "Cooperador do Ofício",
      "Cooperador RJM": "Cooperador de Jovens e Menores",
      "Cooperador de Jovens e Menores": "Cooperador de Jovens e Menores",
      "Secretario da Musica": "Secretário da Música",
      "Secretário da Música": "Secretário da Música",
      Musico: "Músico",
      Músico: "Músico",
    };
    return rolesMap[role] || role;
  };

  // Para ensaios REGIONAIS, a lista já vem com os presentes e tem um layout mais simples.
  if (isRegional) {
    if (!localMinisterio || localMinisterio.length === 0) {
      return null;
    }
    return (
      <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
        {localMinisterio.map((irmao, index) => (
          <div
            key={irmao.id || irmao.nome}
            className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/60"
          >
            <div className="leading-tight">
              <p className="font-bold text-slate-800 text-xs">{irmao.nome}</p>
              <p className="text-[9px] font-semibold text-slate-500">
                {irmao.role}
              </p>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (!isInputDisabled) onToggleTocando(index);
              }}
              className={`cursor-pointer flex items-center p-1 rounded-lg transition-all ${isInputDisabled ? "opacity-50" : "hover:bg-slate-200/50"}`}
            >
              <span
                className={`text-[9px] font-bold uppercase tracking-wider ${irmao.tocando ? "text-green-600" : "text-slate-500"}`}
              >
                {irmao.tocando ? "✓ Tocando" : "Marcar Tocando"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Para ensaios LOCAIS, mantém a interface original com o checkbox.
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {localMinisterio.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
          <p className="text-[9px] font-black text-slate-400 uppercase italic">
            Nenhum ministério cadastrado nesta localidade.
          </p>
        </div>
      ) : (
        localMinisterio.map((m, i) => {
          const estaPresente = presencaLocal?.includes(m.name);
          const membroPresente = estaPresente
            ? (presencaLocalFull || []).find((p) => p.nome === m.name)
            : null;
          const membroIndex = estaPresente
            ? (presencaLocalFull || []).findIndex((p) => p.nome === m.name)
            : -1;

          return (
            <div
              key={m.id || i}
              className={`flex flex-col p-5 rounded-3xl border transition-all duration-300 ${
                estaPresente
                  ? "bg-slate-900 text-white border-slate-950 shadow-lg"
                  : "bg-white border-slate-100 text-slate-700 hover:border-blue-100"
              } ${isInputDisabled ? "opacity-50" : ""}`}
            >
              <div
                className={`flex justify-between items-center ${!isInputDisabled ? "cursor-pointer" : ""}`}
                onClick={() => !isInputDisabled && togglePresencaLocal(m)}
              >
                <div className="text-left leading-none">
                  <p className="text-xs font-black uppercase italic tracking-tight leading-none">
                    {m.name}
                  </p>
                  <p
                    className={`text-[9px] font-bold mt-2 uppercase tracking-widest leading-none ${estaPresente ? "text-blue-400" : "text-slate-400"}`}
                  >
                    {formatRole(m.role)}
                  </p>
                </div>
                <div
                  className={`transition-all duration-500 ${estaPresente ? "opacity-100 scale-110" : "opacity-0 scale-50"}`}
                >
                  <ShieldCheck size={20} className="text-blue-400" />
                </div>
              </div>
              {estaPresente && (
                <div className="pt-3 mt-3 border-t border-white/10 flex justify-end">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isInputDisabled) onToggleTocando(membroIndex);
                    }}
                    className={`cursor-pointer flex items-center p-2 rounded-lg transition-all ${isInputDisabled ? "opacity-50" : "hover:bg-white/10"}`}
                  >
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${membroPresente?.tocando ? "text-green-400" : "text-slate-400"}`}
                    >
                      {membroPresente?.tocando
                        ? "✓ Tocando na Orquestra"
                        : "Marcar como tocando"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default AtaMinisterioLocal;
