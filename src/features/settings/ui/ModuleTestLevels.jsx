import React, { useState, useEffect } from "react"; // Explicação: Importa as ferramentas de estado e ciclo de vida do React.
import { testLevelService } from "../../../shared/api/testLevelService"; // Explicação: Importa o motor de dados e conexões com o Firestore para níveis de teste.
import { Plus, Trash2, Layers } from "lucide-react"; // Explicação: Importa os ícones visuais para ilustrar a tela.
import toast from "react-hot-toast"; // Explicação: Sistema de alertas e avisos na tela.

const ModuleTestLevels = ({ regionalId }) => {
  // Explicação: Inicia a construção da tela visual de gerenciamento de níveis de teste.
  const [levels, setLevels] = useState([]); // Explicação: Guarda a lista de níveis de teste que vieram do banco de dados.
  const [newName, setNewName] = useState(""); // Explicação: Guarda o texto do nome do novo nível que está sendo digitado.
  const [newDesc, setNewDescription] = useState(""); // Explicação: Guarda o texto da descrição do novo nível que está sendo digitado.
  const [isSubmitting, setIsSubmitting] = useState(false); // Explicação: Trava de segurança para o usuário não clicar duas vezes no botão enquanto o banco salva.

  useEffect(() => {
    // Explicação: Monitor que abre o canal reativo com o banco assim que a tela abre.
    // 🌱 INICIALIZAÇÃO DE SEMENTE: Roda a função que cria Aluno, Aprendiz e Oficializado se o banco estiver 100% vazio.
    testLevelService.initializeDefaultLevels();

    // Explicação: Conecta o ouvinte em tempo real da coleção.
    const unsubscribe = testLevelService.listenToLevels((data) => {
      setLevels(data); // Explicação: Sempre que houver mudança no banco, atualiza a lista na tela na mesma hora.
    });

    // Explicação: Desliga a conexão com o banco de dados assim que o usuário fecha o modal para economizar internet e cota.
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e) => {
    // Explicação: Função acionada ao clicar no botão de salvar o novo nível.
    e.preventDefault(); // Explicação: Impede a página de recarregar do modo antigo.
    if (!newName.trim()) return toast.error("Digite o nome do nível de teste."); // Explicação: Barra se o campo estiver em branco.

    setIsSubmitting(true); // Explicação: Ativa a trava visual de segurança do botão.
    try {
      // Explicação: Calcula a ordem dinamicamente jogando o novo item para o final da fila.
      const proximaOrdem =
        levels.length > 0
          ? Math.max(...levels.map((l) => l.order || 0)) + 1
          : 1;

      const sucesso = await testLevelService.createLevel(
        newName,
        newDesc,
        proximaOrdem,
      ); // Explicação: Envia os dados para gravação na coleção do Firestore.
      if (sucesso) {
        setNewName(""); // Explicação: Limpa o campo do nome após salvar.
        setNewDescription(""); // Explicação: Limpa o campo da descrição após salvar.
      }
    } catch (err) {
      console.error(err);
    } finally {
      // 🚀 CORREÇÃO CIRÚRGICA: Consertada a palavra com erro de digitação para destravar o compilador do Vite!
      setIsSubmitting(false); // Explicação: Libera o botão para novos cadastros.
    }
  };

  const handleDelete = (levelId, levelNome) => {
    // Explicação: Acionada ao clicar no botão de lixeira de um card.
    // 🚀 EXCLUSÃO NOMINAL SEGURA: Aciona o alerta customizado de confirmação antes de apagar o registro.
    toast(
      (t) => (
        <div className="flex flex-col gap-4 p-1 min-w-[260px] text-left">
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 size={15} strokeWidth={3} />
              <p className="text-[11px] font-black uppercase tracking-wider">
                Remover Opção
              </p>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Deseja remover o nível{" "}
              <span className="font-bold text-slate-900 italic">
                "{levelNome}"
              </span>{" "}
              da lista suspensa da orquestra?
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await testLevelService.deleteLevel(levelId); // Explicação: Executa a exclusão definitiva na nuvem.
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-red-100 transition-all active:scale-95"
            >
              Confirmar Remoção
            </button>
          </div>
        </div>
      ),
      {
        position: "top-center",
        style: { borderRadius: "2rem", padding: "16px" },
      },
    );
  };

  return (
    // Explicação: Desenha a interface visual dentro da cortina flutuante.
    <div className="space-y-5 text-left font-sans">
      {/* SEÇÃO 1: FORMULÁRIO DE CADASTRO (VERTICAL STACKING ANTI-ESMAGAMENTO) */}
      <form
        onSubmit={handleCreate}
        className="bg-white p-4 rounded-[2rem] border border-slate-200/60 shadow-3xs space-y-3 text-left"
      >
        <div className="pl-1 flex flex-col text-left">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
            Novo Nível de Teste
          </span>
        </div>

        <div className="flex flex-col gap-2 w-full text-left">
          <input
            type="text"
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-black text-slate-950 uppercase italic outline-none focus:border-indigo-600 placeholder:text-slate-400 min-h-[44px]"
            placeholder="NOME DO NÍVEL (EX: TESTE DE MÚSICO)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-600 placeholder:text-slate-400 min-h-[44px]"
            placeholder="Breve descrição ou finalidade (Opcional)"
            value={newDesc}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 cursor-pointer"
        >
          <Plus size={14} strokeWidth={3} />
          {isSubmitting ? "Gravando Nível..." : "Adicionar à Lista Suspensa"}
        </button>
      </form>

      {/* SEÇÃO 2: LISTAGEM DE NÍVEIS ATIVOS EM CARDS (HIGIENE DE UI MOBILE) */}
      <div className="space-y-2 text-left">
        <div className="pl-1 flex flex-col text-left">
          <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest italic">
            Opções Ativas no Banco de Dados
          </span>
        </div>

        {levels.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-[2rem]">
            <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-wider">
              Nenhum nível cadastrado. Aguardando semente...
            </p>
          </div>
        ) : (
          levels.map((lvl) => (
            <div
              key={lvl.id}
              className="bg-white p-4 rounded-[2rem] border border-slate-200/50 shadow-3xs flex items-center justify-between gap-4 transition-all text-left"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1 text-left">
                <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                  <Layers size={15} strokeWidth={2.5} />
                </div>
                <div className="text-left min-w-0 flex-1 leading-snug">
                  <h4 className="text-[11.5px] font-black text-slate-900 uppercase tracking-tight italic truncate">
                    {lvl.name}
                  </h4>
                  {lvl.description && (
                    <p className="text-[9.5px] font-medium text-slate-400 mt-0.5 whitespace-normal break-words">
                      {lvl.description}
                    </p>
                  )}
                </div>
              </div>

              {/* ÁREA DE EXCLUSÃO ERGONÔMICA DE 44PX */}
              <button
                type="button"
                onClick={() => handleDelete(lvl.id, lvl.name)}
                className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:text-red-600 active:bg-red-50 hover:text-red-600 transition-all shrink-0 cursor-pointer"
              >
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModuleTestLevels;
