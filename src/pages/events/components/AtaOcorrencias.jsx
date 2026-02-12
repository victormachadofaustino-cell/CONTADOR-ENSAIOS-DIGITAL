import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare, UserPlus, Repeat, Info, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Componente para Registro de Ocorrências e Notas do Ensaio.
 * v1.2 - Suporte a Modo Regional (Texto Livre Direto) e Preservação de Templates Locais.
 */
const AtaOcorrencias = ({ ocorrencias = [], onSave, instruments = [], isClosed, isRegional }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [template, setTemplate] = useState('A'); 

  const [nome, setNome] = useState('');
  const [instA, setInstA] = useState('');
  const [instB, setInstB] = useState('');
  const [etapa, setEtapa] = useState('');
  const [textoLivre, setTextoLivre] = useState('');

  const etapasOption = ["Ensaios", "Reunião de Jovens", "Culto Oficial", "Oficialização"];

  // Filtra instrumentos para remover o Coral
  const filteredInstruments = instruments.filter(i => i.id !== 'Coral' && i.id !== 'Coral_');

  const handleAdd = () => {
    // LÓGICA REGIONAL: Apenas texto livre
    if (isRegional || template === 'C') {
      if (!textoLivre.trim()) return toast.error("Digite o texto da ocorrência");
      if (textoLivre.length > 160) return toast.error("Limite excedido (máx 160 caracteres)");
      onSave([...ocorrencias, { id: Date.now().toString(), tipo: 'C', texto: textoLivre.trim() }]);
    } 
    // LÓGICA LOCAL: Templates Automatizados
    else if (template === 'A') {
      if (!nome || !instA || !etapa) return toast.error("Preencha todos os campos");
      const nova = {
        id: Date.now().toString(),
        tipo: 'A',
        nome: nome.toUpperCase().trim(),
        instrumento: instA.toUpperCase(),
        etapa: etapa.toUpperCase(),
        texto: `Apresentado(a) para início nos ensaios o(a) irmão(ã) ${nome.toUpperCase()}, executando o instrumento ${instA.toUpperCase()}, na etapa de ${etapa.toUpperCase()}, a partir desta data.`
      };
      onSave([...ocorrencias, nova]);
    } 
    else if (template === 'B') {
      if (!nome || !instA || !instB) return toast.error("Preencha todos os campos");
      const nova = {
        id: Date.now().toString(),
        tipo: 'B',
        nome: nome.toUpperCase().trim(),
        de: instA.toUpperCase(),
        para: instB.toUpperCase(),
        texto: `O(A) músico(a) ${nome.toUpperCase()}, que executava ${instA.toUpperCase()}, passou a tocar ${instB.toUpperCase()} a partir desta data.`
      };
      onSave([...ocorrencias, nova]);
    }
    resetForm();
  };

  const resetForm = () => {
    setNome(''); setInstA(''); setInstB(''); setEtapa(''); setTextoLivre('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Ocorrências do Ensaio</h3>
        {!isClosed && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 shadow-lg flex items-center gap-2">
            <Plus size={12} /> {isRegional ? 'Anotar' : 'Adicionar'}
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white border-2 border-slate-950 rounded-[2rem] p-6 shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-6 text-slate-950">
             <span className="text-[10px] font-black uppercase italic tracking-tighter">
               {isRegional ? 'Anotação Livre' : 'Novo Registro'}
             </span>
             <button onClick={resetForm}><X size={20}/></button>
          </div>

          {/* Seleção de Template: Oculta no modo Regional */}
          {!isRegional && (
            <div className="flex gap-2 mb-6">
              <button onClick={() => setTemplate('A')} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border-2 ${template === 'A' ? 'border-slate-950 bg-slate-50' : 'border-slate-100 text-slate-300'}`}>
                <UserPlus size={16} /><span className="text-[7px] font-black">Apresentação</span>
              </button>
              <button onClick={() => setTemplate('B')} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border-2 ${template === 'B' ? 'border-slate-950 bg-slate-50' : 'border-slate-100 text-slate-300'}`}>
                <Repeat size={16} /><span className="text-[7px] font-black">Troca</span>
              </button>
              <button onClick={() => setTemplate('C')} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border-2 ${template === 'C' ? 'border-slate-950 bg-slate-50' : 'border-slate-100 text-slate-300'}`}>
                <MessageSquare size={16} /><span className="text-[7px] font-black">Livre</span>
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Campos Dinâmicos baseados no Template (Apenas se não for Regional ou for Template C) */}
            {(!isRegional && template !== 'C') ? (
              <>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold uppercase outline-none" placeholder="NOME DO IRMÃO(Ã)" />
                
                {template === 'A' && (
                  <div className="grid grid-cols-2 gap-3">
                    <select value={instA} onChange={e => setInstA(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold outline-none uppercase">
                      <option value="">Instrumento...</option>
                      {filteredInstruments.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </select>
                    <select value={etapa} onChange={e => setEtapa(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold outline-none uppercase">
                      <option value="">Etapa...</option>
                      {etapasOption.map(et => <option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                )}

                {template === 'B' && (
                  <div className="grid grid-cols-2 gap-3">
                    <select value={instA} onChange={e => setInstA(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold outline-none uppercase"><option value="">De...</option>{filteredInstruments.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select>
                    <select value={instB} onChange={e => setInstB(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold outline-none uppercase"><option value="">Para...</option>{filteredInstruments.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select>
                  </div>
                )}
              </>
            ) : (
              <textarea 
                maxLength={160} 
                rows={4} 
                value={textoLivre} 
                onChange={e => setTextoLivre(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none resize-none shadow-inner" 
                placeholder={isRegional ? 'Relate aqui ocorrências, observações técnicas ou espirituais do ensaio...' : 'Ex: "Neste ensaio Deus preparou um instrumento..."'} 
              />
            )}

            <button onClick={handleAdd} className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
              {isRegional ? 'Gravar Anotação' : 'Confirmar Registro'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {ocorrencias.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group animate-in slide-in-from-left-2">
            <p className="text-[10px] font-bold text-slate-900 pr-4 italic leading-relaxed">{item.texto}</p>
            {!isClosed && <button onClick={() => onSave(ocorrencias.filter(o => o.id !== item.id))} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AtaOcorrencias;