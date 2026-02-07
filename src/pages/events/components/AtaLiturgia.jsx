import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Field, Select } from './AtaUIComponents.jsx';

/**
 * AtaLiturgia v1.3
 * Módulo especializado no registro dos condutores e hinos.
 * Correção: Botão de exclusão de hino com visibilidade permanente e contraste aprimorado.
 */
const AtaLiturgia = ({ 
  ataData, 
  handleChange, 
  isInputDisabled, 
  referenciaMinisterio, 
  handleHinoChange 
}) => {
  return (
    <div className="space-y-6">
      {/* BLOCO: ATENDIMENTO E ORAÇÕES */}
      <div className="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field 
            label="Atendimento" 
            val={ataData.atendimentoNome} 
            disabled={isInputDisabled} 
            onChange={v => handleChange({...ataData, atendimentoNome: v})} 
          />
          <Select 
            label="Ministério / Cargo" 
            val={ataData.atendimentoMin} 
            options={referenciaMinisterio} 
            disabled={isInputDisabled} 
            onChange={v => handleChange({...ataData, atendimentoMin: v})} 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
          <Field 
            label="Oração Abertura" 
            val={ataData.oracaoAberturaNome} 
            disabled={isInputDisabled} 
            onChange={v => handleChange({...ataData, oracaoAberturaNome: v})} 
          />
          <Select 
            label="Ministério / Cargo" 
            val={ataData.oracaoAberturaMin} 
            options={referenciaMinisterio} 
            disabled={isInputDisabled} 
            onChange={v => handleChange({...ataData, oracaoAberturaMin: v})} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
          <Field 
            label="Oração Encerramento" 
            val={ataData.ultimaOracaoNome} 
            disabled={isInputDisabled} 
            onChange={v => handleChange({...ataData, ultimaOracaoNome: v})} 
          />
          <Select 
            label="Ministério / Cargo" 
            val={ataData.ultimaOracaoMin} 
            options={referenciaMinisterio} 
            disabled={isInputDisabled} 
            onChange={v => handleChange({...ataData, ultimaOracaoMin: v})} 
          />
        </div>
      </div>

      {/* BLOCO: PARTES DO ENSAIO (DINÂMICO) */}
      <div className="space-y-4">
        {(ataData.partes || []).map((parte, pIdx) => (
          <div key={pIdx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative animate-premium">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black italic uppercase text-[10px] tracking-widest text-blue-600 leading-none">
                {parte.label}
              </h4>
              {!isInputDisabled && pIdx > 1 && (
                <button 
                  onClick={() => {
                    const np = [...ataData.partes];
                    np.splice(pIdx, 1);
                    handleChange({...ataData, partes: np});
                  }} 
                  className="bg-red-50 text-red-500 p-2 rounded-xl active:scale-90 transition-transform"
                >
                  <Trash2 size={14}/>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Field 
                label="Condutor" 
                val={parte.nome} 
                disabled={isInputDisabled} 
                onChange={v => {
                  const np = [...ataData.partes];
                  np[pIdx].nome = v;
                  handleChange({...ataData, partes: np});
                }} 
              />
              <Select 
                label="Ministério / Cargo" 
                val={parte.min} 
                options={referenciaMinisterio} 
                disabled={isInputDisabled} 
                onChange={v => {
                  const np = [...ataData.partes];
                  np[pIdx].min = v;
                  handleChange({...ataData, partes: np});
                }} 
              />
            </div>

            {/* SELEÇÃO DE HINOS (CHIPS ADAPTÁVEIS) */}
            <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
              {(parte.hinos || []).map((h, hIdx) => (
                <div key={hIdx} className="relative">
                  <input 
                    type="text" 
                    disabled={isInputDisabled} 
                    className="w-14 h-14 bg-white rounded-2xl text-center font-black text-blue-800 text-sm outline-none border-2 border-slate-200 focus:border-blue-500 transition-all shadow-sm disabled:opacity-50" 
                    value={h || ''} 
                    placeholder="-" 
                    onChange={e => handleHinoChange(pIdx, hIdx, e.target.value)} 
                  />
                  {/* AJUSTE: Visibilidade permanente e cor de destaque para o botão de excluir */}
                  {!isInputDisabled && hIdx >= 5 && (
                    <button 
                      onClick={() => {
                        const np = [...ataData.partes];
                        np[pIdx].hinos.splice(hIdx, 1);
                        handleChange({...ataData, partes: np});
                      }} 
                      className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg active:scale-75 transition-all z-10"
                    >
                      <X size={10} strokeWidth={4} />
                    </button>
                  )}
                </div>
              ))}
              
              {!isInputDisabled && (
                <button 
                  onClick={() => {
                    const np = [...ataData.partes];
                    np[pIdx].hinos = [...(np[pIdx].hinos || []), ''];
                    handleChange({...ataData, partes: np});
                  }} 
                  className="w-14 h-14 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 flex items-center justify-center active:scale-95 transition-all hover:bg-white hover:text-blue-500 hover:border-blue-200"
                >
                  <Plus size={20}/>
                </button>
              )}
            </div>
          </div>
        ))}

        {!isInputDisabled && (
          <button 
            onClick={() => {
              const np = [...(ataData.partes || [])];
              np.push({ 
                label: `${np.length + 1}ª Parte`, 
                nome: '', 
                min: '', 
                hinos: ['', '', '', '', '']
              });
              handleChange({ ...ataData, partes: np });
            }} 
            className="w-full py-5 bg-white border-2 border-dashed border-blue-100 rounded-[2.5rem] text-blue-600 font-black uppercase text-[9px] italic flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-blue-50/50 shadow-sm"
          >
            <Plus size={16}/> Incluir Nova Parte
          </button>
        )}
      </div>
    </div>
  );
};

export default AtaLiturgia;