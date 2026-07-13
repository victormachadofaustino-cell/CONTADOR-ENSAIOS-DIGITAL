import React from 'react'; // [Funcionamento]: Núcleo do React para processamento em memória e renderização de elementos visuais.

/**
 * COMPONENTE: VisitsRegistry v2.0 (CLEAN EDITION)
 * Finalidade: Renderizar os Filtros de Origem e a Listagem Nominal de Músicos Visitantes de forma limpa e otimizada.
 * Higiene de UI: Empilhamento vertical seguro para telas de smartphones, com textos protegidos contra quebra.
 */
const VisitsRegistry = ({ 
  listMinFilter, 
  setListMinFilter, 
  listCityFilter, 
  setListCityFilter, 
  filterOptions, 
  nominalFinal 
}) => {

  return (
    <div className="space-y-6 w-full min-w-0 text-left">
      
      {/* LIVRO DE REGISTRO NOMINAL DE VISITANTES */}
      <section className="space-y-4 pb-12">
        <div className="px-1">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
            Livro de Registro
          </p>
          <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
            Lista de Músicos Visitantes
          </h3>
        </div>
        
        {/* Filtros da Lista — Área de clique confortável de 44px empilhada verticalmente para celulares */}
        <div className="flex flex-col gap-2.5 w-full">
          <div className="h-12 bg-white border border-slate-200 rounded-2xl flex items-center px-3 shadow-sm">
            <select 
              value={listMinFilter} 
              onChange={e => setListMinFilter(e.target.value)} 
              className="w-full bg-transparent text-xs font-black uppercase text-slate-700 outline-none cursor-pointer appearance-none"
            >
              <option value="all">Todos os Ministérios / Seções</option>
              {filterOptions?.mins?.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="h-12 bg-white border border-slate-200 rounded-2xl flex items-center px-3 shadow-sm">
            <select 
              value={listCityFilter} 
              onChange={e => setListCityFilter(e.target.value)} 
              className="w-full bg-transparent text-xs font-black uppercase text-slate-700 outline-none cursor-pointer appearance-none"
            >
              <option value="all">Todas as Cidades de Origem</option>
              {filterOptions?.cities?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Listagem de Cartões Nominais — Blindagem contra estouro de bordas por meio de "truncate" */}
        <div className="space-y-3">
          {nominalFinal
            ?.filter(v => (listCityFilter === 'all' || v.cidadeUf?.toUpperCase() === listCityFilter) && (listMinFilter === 'all' || v.min?.toUpperCase() === listMinFilter))
            ?.slice(0, 15)
            ?.map((v, i) => (
              <div key={i} className="bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm flex justify-between items-start gap-4 active:scale-[0.98] transition-all">
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                    {v.nome}
                  </h4>
                  <p className="text-xs font-bold text-blue-600 uppercase mt-0.5 tracking-wide">
                    {v.min || 'Músico Convidado'}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-2 truncate">
                    Origem: <span className="font-bold text-slate-600 uppercase">{v.bairro || 'Comum'}</span> — <span className="font-bold text-slate-500">{v.cidadeUf || 'UF'}</span>
                  </p>
                  <p className="text-[10px] font-semibold text-slate-300 uppercase italic mt-1">
                    Último Ens. Local: {v.dataEnsaio || "Não Informado"}
                  </p>
                </div>
                {/* Carimbo Eletrônico Isolado de Data Lateral */}
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-500 shrink-0 shadow-inner">
                  {v.eventDate ? v.eventDate.split('-').reverse().join('/') : ''}
                </div>
              </div>
            ))}
          
          {/* Validação e Fallback de Lista Filtrada Vazia */}
          {nominalFinal?.filter(v => (listCityFilter === 'all' || v.cidadeUf?.toUpperCase() === listCityFilter) && (listMinFilter === 'all' || v.min?.toUpperCase() === listMinFilter)).length === 0 && (
            <div className="text-center py-8 text-xs font-bold text-slate-400 uppercase italic">
              Nenhuma visita encontrada para o filtro selecionado.
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default VisitsRegistry;