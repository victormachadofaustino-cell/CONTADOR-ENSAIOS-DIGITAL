import React from 'react';
import { UserPlus, Trash2, MapPin, Phone, Calendar, Clock } from 'lucide-react';
import { toTitleCase } from '../../../services/pdfEventService'; // Reaproveitando lógica de formatação

/**
 * AtaVisitantes v1.0
 * Módulo de gestão de visitas com layout em Cards Individuais.
 * Resolve problemas de espaço vertical e legibilidade em dispositivos móveis.
 */
const AtaVisitantes = ({ 
  visitantes, 
  isInputDisabled, 
  isClosed, 
  handleOpenVisitaModal, 
  setVisitaToDelete 
}) => {
  return (
    <div className="space-y-4">
      {/* BOTÃO DE ADIÇÃO (Visível apenas para editores autorizados) */}
      {!isInputDisabled && (
        <button 
          onClick={() => handleOpenVisitaModal()} 
          className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase text-[10px] italic active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-slate-900"
        >
          <UserPlus size={18}/> Adicionar Visitante
        </button>
      )}

      {/* LISTAGEM EM CARDS (Conceito Vertical Stacking) */}
      <div className="space-y-3">
        {(visitantes || []).length === 0 ? (
          <div className="py-10 text-center text-slate-300 font-black uppercase italic text-[10px] bg-white rounded-[2rem] border border-dashed border-slate-200">
            Nenhum visitante registrado.
          </div>
        ) : (
          visitantes.map((v, idx) => (
            <div 
              key={v.id || idx} 
              className="flex justify-between items-center p-5 bg-white rounded-[2.2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all group hover:border-blue-100"
              onClick={() => handleOpenVisitaModal(v, idx)}
            >
              <div className="text-left flex-1">
                {/* LINHA 1: NOME (Destaque Principal) */}
                <p className="text-sm font-[900] uppercase text-slate-950 italic leading-tight mb-1">
                  {v.nome}
                </p>

                {/* LINHA 2: MINISTÉRIO E INSTRUMENTO */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <span className="text-[10px] font-black text-blue-600 uppercase italic leading-none">
                    {v.min}
                  </span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[10px] font-black text-slate-500 uppercase italic leading-none">
                    {v.inst || 'Instrumento N/I'}
                  </span>
                </div>

                {/* LINHA 3: LOCALIZAÇÃO GEOGRÁFICA */}
                <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase leading-none">
                  <MapPin size={10} className="text-slate-300 shrink-0"/> 
                  <span className="truncate">{v.bairro} ({v.cidadeUf})</span>
                </p>

                {/* LINHA 4: METADADOS (CONTATO E ESCALA) */}
                {(v.dataEnsaio || v.contato) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {v.contato && (
                      <span className="text-[7px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500 flex items-center gap-1 uppercase border border-slate-200/50">
                        <Phone size={8}/> {v.contato}
                      </span>
                    )}
                    {v.dataEnsaio && (
                      <span className="text-[7px] font-black bg-blue-50 px-2 py-1 rounded-lg text-blue-400 flex items-center gap-1 uppercase border border-blue-100/50">
                        <Calendar size={8}/> {v.dataEnsaio} {v.hora && <><span className="mx-0.5">•</span> <Clock size={8}/> {v.hora}</>}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* BOTÃO DE EXCLUSÃO (Com área de toque otimizada) */}
              {!isInputDisabled && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setVisitaToDelete(v.id); 
                  }} 
                  className="p-3 text-slate-200 hover:text-red-500 active:bg-red-50 rounded-2xl transition-all ml-2"
                >
                  <Trash2 size={20}/>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AtaVisitantes;