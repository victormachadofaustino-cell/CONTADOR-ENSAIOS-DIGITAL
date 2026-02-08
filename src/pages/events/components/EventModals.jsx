import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertTriangle, Settings, Trash2 } from 'lucide-react';

/**
 * Componente que agrupa todos os modais da página de eventos.
 * v1.0 - Unificação de Diálogos: Novo Registro, Erro de Configuração e Exclusão.
 */
const EventModals = ({
  showModal,
  setShowModal,
  newEventDate,
  setNewEventDate,
  responsavel,
  setResponsavel,
  handleCreate,
  showConfigError,
  setShowConfigError,
  isGemLocal,
  onNavigateToSettings,
  eventToDelete,
  setEventToDelete,
  confirmDelete
}) => {
  return (
    <>
      <AnimatePresence>
        {/* MODAL 1: NOVO REGISTRO */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[340px] rounded-[3rem] p-8 shadow-2xl relative text-left overflow-hidden border border-white/20"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all">
                <X size={18}/>
              </button>
              
              <h3 className="text-xl font-[900] uppercase italic text-slate-950 mb-8 leading-none tracking-tighter">Novo Registro</h3>
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Data Agendada</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-base font-black outline-none" 
                    value={newEventDate} 
                    onChange={e => setNewEventDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Responsável / Encarregado</label>
                  <input 
                    type="text" 
                    placeholder="Nome completo" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-base font-black outline-none uppercase placeholder:text-slate-300 shadow-inner" 
                    value={responsavel} 
                    onChange={e => setResponsavel(e.target.value)} 
                  />
                </div>
              </div>

              <button 
                onClick={handleCreate} 
                className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 active:scale-95 shadow-xl mt-10 transition-all border border-white/10"
              >
                <Send size={16}/> Confirmar Agenda
              </button>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: ORQUESTRA AUSENTE (ERRO DE CONFIGURAÇÃO) */}
        {showConfigError && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[320px] rounded-[3rem] p-10 text-center shadow-2xl relative border border-slate-100"
            >
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-[900] text-slate-950 uppercase italic mb-4 tracking-tighter leading-none">Orquestra Ausente</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-10">Esta localidade ainda não possui uma orquestra configurada. É necessário definir os instrumentos antes de agendar ensaios.</p>
              
              <div className="space-y-3">
                {isGemLocal && (
                  <button 
                    onClick={() => { setShowConfigError(false); onNavigateToSettings(); }} 
                    className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-3"
                  >
                    <Settings size={16} /> Configurar Agora
                  </button>
                )}
                <button onClick={() => setShowConfigError(false)} className="w-full py-3 text-slate-300 font-black uppercase text-[9px] tracking-widest">Entendido</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO */}
        {eventToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl relative border border-slate-100"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-[900] uppercase italic text-slate-950 tracking-tighter leading-tight">Remover Agenda?</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-8 leading-relaxed">Todos os dados e contagens deste ensaio serão permanentemente excluídos da jurisdição.</p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete} 
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-100"
                >
                  Sim, Remover Agora
                </button>
                <button 
                  onClick={() => setEventToDelete(null)} 
                  className="w-full py-3 font-black uppercase text-[9px] text-slate-300 tracking-widest"
                >
                  Manter Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EventModals;