import React from 'react'; // Importa a biblioteca base do React
import { UserPlus, Trash2, MapPin, Phone, Calendar, Clock, Pencil } from 'lucide-react'; // Importa os ícones visuais incluindo o novo ícone de Lápis
import { toTitleCase } from '../../../services/pdfEventService'; // Reaproveitando lógica de formatação

/**
 * AtaVisitantes v1.2
 * Módulo de gestão de visitas com layout em Cards Individuais e Ações Explícitas.
 */
const AtaVisitantes = ({ 
  visitantes, 
  isInputDisabled, 
  isClosed, 
  handleOpenVisitaModal, 
  setVisitaToDelete 
}) => {
  return (
    <div className="space-y-4"> {/* Define o espaçamento vertical entre os elementos */}
      {/* BOTÃO DE ADIÇÃO (Visível apenas para editores autorizados) */}
      {!isInputDisabled && ( // Só mostra o botão de adicionar se o usuário tiver permissão
        <button 
          onClick={() => handleOpenVisitaModal()} // Abre o formulário de novo visitante vazio
          className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase text-[10px] italic active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-slate-900" // Estilo do botão preto arredondado
        >
          <UserPlus size={18}/> Adicionar Visitante {/* Ícone e texto do botão */}
        </button>
      )}

      {/* LISTAGEM EM CARDS (Conceito Vertical Stacking) */}
      <div className="space-y-3"> {/* Espaçamento entre os cartões de visitantes */}
        {(visitantes || []).length === 0 ? ( // Verifica se a lista está vazia
          <div className="py-10 text-center text-slate-300 font-black uppercase italic text-[10px] bg-white rounded-[2rem] border border-dashed border-slate-200">
            Nenhum visitante registrado. {/* Mensagem de lista vazia */}
          </div>
        ) : (
          visitantes.map((v, idx) => ( // Percorre a lista de visitantes cadastrados
            <div 
              key={v.id || idx} 
              className="flex justify-between items-center p-5 bg-white rounded-[2.2rem] border border-slate-100 shadow-sm transition-all group hover:border-blue-100" // Cartão branco arredondado para cada pessoa
            >
              <div className="text-left flex-1 min-w-0"> {/* Alinhamento do texto à esquerda */}
                
                {/* LINHA 1: NOME (Destaque Principal) */}
                <p className="text-sm font-[900] uppercase text-slate-950 italic leading-tight mb-1 break-words">
                  {v.nome} {/* Exibe o nome do visitante em negrito */}
                </p>

                {/* LINHA 2: MINISTÉRIO E INSTRUMENTO */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <span className="text-[10px] font-black text-blue-600 uppercase italic leading-none">
                    {v.min} {/* Exibe o cargo ou ministério em azul */}
                  </span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" /> {/* Ponto separador cinza */}
                  <span className="text-[10px] font-black text-slate-500 uppercase italic leading-none truncate">
                    {v.inst || 'Instrumento N/I'} {/* Exibe o instrumento ou aviso de não informado */}
                  </span>
                </div>

                {/* LINHA 3: LOCALIZAÇÃO GEOGRÁFICA */}
                <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 uppercase leading-none">
                  <MapPin size={10} className="text-slate-300 shrink-0"/> 
                  <span className="truncate">
                    {v.bairro || 'Bairro N/I'} {v.cidadeUf ? `(${v.cidadeUf})` : ''} {/* Exibe localidade */}
                  </span>
                </p>

                {/* LINHA 4: METADADOS (CONTATO E ESCALA) */}
                {(v.dataEnsaio || v.contato) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {v.contato && (
                      <span className="text-[7px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500 flex items-center gap-1 uppercase border border-slate-200/50">
                        <Phone size={8} className="shrink-0"/> {v.contato} {/* Exibe telefone de contato */}
                      </span>
                    )}
                    {v.dataEnsaio && (
                      <span className="text-[7px] font-black bg-blue-50 px-2 py-1 rounded-lg text-blue-400 flex items-center gap-1 uppercase border border-blue-100/50">
                        <Calendar size={8} className="shrink-0"/> {v.dataEnsaio} {/* Exibe data do ensaio */}
                        {v.hora && (
                          <>
                            <span className="mx-0.5 opacity-30">•</span> 
                            <Clock size={8} className="shrink-0"/> {v.hora} {/* Exibe horário */}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* GRUPO DE AÇÕES: EDITAR E EXCLUIR */}
              {!isInputDisabled && ( // Só mostra ações se puder editar
                <div className="flex items-center gap-1"> {/* Agrupa os botões de ação */}
                  <button 
                    onClick={() => handleOpenVisitaModal(v, idx)} // Abre o modal com os dados para editar
                    className="p-3 text-slate-300 hover:text-blue-600 active:bg-blue-50 rounded-2xl transition-all shrink-0" // Botão do lápis cinza que fica azul
                  >
                    <Pencil size={18}/> {/* Ícone de lápis para edição */}
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); // Evita conflito de cliques
                      setVisitaToDelete(v.id || idx); // Marca este visitante para ser apagado
                    }} 
                    className="p-3 text-slate-200 hover:text-red-500 active:bg-red-50 rounded-2xl transition-all shrink-0" // Botão da lixeira que fica vermelho
                  >
                    <Trash2 size={20}/> {/* Ícone de lixeira para exclusão */}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AtaVisitantes; // Exporta o componente para uso na página