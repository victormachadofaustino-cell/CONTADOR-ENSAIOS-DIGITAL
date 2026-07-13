import React from 'react'; // Explicação: Importa a base do React para criar o componente de janela (modal).
import { motion, AnimatePresence } from 'framer-motion'; // Explicação: Importa ferramentas para animações de entrada e saída.
import { ShieldCheck, AlertCircle, UserCheck, Eye } from 'lucide-react'; // Explicação: Importa os desenhos dos ícones (escudo, alerta, etc).

/**
 * Componente de Modal para gestão de posse (ownership) de seção.
 * v1.1 - SINCRONIZADO COM REGRA DE OURO E BLINDAGEM v10.5
 * Resolve o problema de "piscar" ao assumir responsabilidade.
 */
const OwnershipModal = ({ 
  showOwnershipModal, // Explicação: Indica qual naipe o usuário clicou (ex: CORDAS).
  localCounts, // Explicação: Dados atuais vindos do banco de dados.
  myUID, // Explicação: ID único do usuário logado.
  userData, // Explicação: Informações do crachá do usuário.
  onConfirm, // Explicação: Função que executa a troca de dono da seção.
  onCancel // Explicação: Função que fecha a janela sem fazer nada.
}) => {
  if (!showOwnershipModal) return null; // Explicação: Se não houver naipe selecionado, a janela nem aparece.

  // Explicação: Transforma o nome do naipe em código técnico (ex: CORDAS vira meta_cordas).
  const metaKey = `meta_${showOwnershipModal.toLowerCase().replace(/\s/g, '_')}`;
  // Explicação: Verifica se já tem alguém com a seção aberta agora.
  const currentInUse = localCounts?.[metaKey]?.isActive;
  // Explicação: Pega o nome de quem é o dono oficial registrado no banco.
  const currentOwner = localCounts?.[metaKey]?.responsibleName;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-left">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }} 
        className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center shadow-2xl relative"
      >
        {/* Explicação: Desenha o ícone principal (Azul se livre, Amarelo se ocupado) */}
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ${currentInUse ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
          {currentInUse ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
        </div>
        
        <h3 className="font-[900] text-slate-950 uppercase italic mb-2 tracking-tighter text-xl leading-none">
          {currentInUse ? 'Seção em Uso' : 'Acessar Seção'}
        </h3>
        
        <p className="text-[11px] font-bold text-slate-500 uppercase mb-8 leading-relaxed px-4 italic">
          {currentInUse 
            ? `O irmão ${currentOwner} está realizando a contagem neste momento. Deseja apenas visualizar os dados em tempo real?`
            : currentOwner 
              ? `Esta seção pertence a ${currentOwner}, mas ele não está editando agora. Deseja assumir a responsabilidade ou apenas visualizar?`
              : "Esta seção está livre. Deseja assumir a responsabilidade da contagem?"
          }
        </p>

        <div className="flex flex-col gap-3">
          {/* Explicação: Botão para assumir a caneta. Só aparece se a seção não estiver sendo usada por outro agora. */}
          {!currentInUse && (
            <button 
              onClick={() => onConfirm(showOwnershipModal, true)} 
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-xl flex items-center justify-center gap-2 shadow-blue-100"
            >
              <UserCheck size={16}/> Assumir Seção
            </button>
          )}
          
          {/* Explicação: Botão para apenas espiar os números sem ter poder de edição. */}
          <button 
            onClick={() => onConfirm(showOwnershipModal, false)} 
            className="w-full bg-slate-100 text-slate-900 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 flex items-center justify-center gap-2"
          >
            <Eye size={16}/> Apenas Visualizar
          </button>
          
          {/* Explicação: Botão de desistir e fechar o modal. */}
          <button 
            onClick={onCancel} 
            className="w-full py-4 text-slate-400 font-black uppercase text-[9px] tracking-widest active:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OwnershipModal; // Explicação: Exporta o componente configurado para uso no sistema.