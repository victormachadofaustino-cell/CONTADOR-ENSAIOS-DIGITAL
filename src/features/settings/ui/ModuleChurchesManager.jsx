import React, { useState, useEffect } from "react"; // [Funcionamento]: Importa o coração do React e as ferramentas de estado e efeitos de tela.
import {
  db,
  collection,
  onSnapshot,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from "../../../shared/api/firebase"; // [Funcionamento]: Conecta com as ferramentas específicas de comunicação direta do banco de dados Firebase.
import { churchService } from "../../../shared/api/churchService"; // [Funcionamento]: Conecta com o motor de serviços que dita as regras de negócio das igrejas comuns.
import { Plus, Trash2, Edit3, Check, X, Home, Send } from "lucide-react"; // [Funcionamento]: Traz do estúdio de design os ícones gráficos impecáveis que usamos na tela.
import { motion } from "framer-motion"; // [Funcionamento]: Ativa o motor de animações fluidas para dar suavidade no carregamento dos cards na interface.
import toast from "react-hot-toast"; // [Funcionamento]: Importa o sistema de balões de notificação elegantes para dar feedback imediato de sucesso ou erro.

const ModuleChurchesManager = ({
  selectedCity,
  regionalId,
  onConfirmDelete,
}) => {
  // [Funcionamento]: Componente mestre que recebe a cidade selecionada, o ID da regional e a ação de deletar segura.
  const [comuns, setComuns] = useState([]); // [Funcionamento]: Gaveta de memória para guardar a lista de igrejas comuns baixadas do banco de dados.
  const [newChurchName, setNewChurchName] = useState(""); // [Funcionamento]: Gaveta de memória que armazena temporariamente o texto digitado para criar uma nova igreja.
  const [editingId, setEditingId] = useState(null); // [Funcionamento]: Gaveta que memoriza o ID da igreja que o usuário escolheu editar naquele momento.
  const [editValue, setEditValue] = useState(""); // [Funcionamento]: Gaveta de memória que armazena o novo nome digitado durante o processo de edição.

  useEffect(() => {
    // [Funcionamento]: Monitor de efeitos que vigia a cidade selecionada para atualizar a lista automaticamente na tela.
    if (!selectedCity?.id) {
      // [Funcionamento]: Se não houver nenhuma cidade selecionada nos filtros superiores...
      setComuns([]); // ...limpa a lista de igrejas comuns da tela preventivamente.
      return; // [Funcionamento]: Interrompe a execução do monitor para evitar buscas desnecessárias.
    } // [Funcionamento]: Encerra a verificação protetiva de cidade nula.
    const q = query(
      collection(db, "comuns"),
      where("cidadeId", "==", selectedCity.id),
    ); // [Funcionamento]: Prepara uma pergunta ao banco de dados: "Me traga as comuns que pertencem a esta cidade específica".
    const unsub = onSnapshot(q, (s) => {
      // [Funcionamento]: Conecta uma escuta em tempo real. Se o banco mudar lá, a tela atualiza aqui instantaneamente sem recarregar.
      setComuns(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.comum.localeCompare(b.comum)),
      ); // [Funcionamento]: Transforma os documentos brutos em objetos JavaScript e os ordena em ordem alfabética de A-Z.
    }); // [Funcionamento]: Encerra a configuração da escuta ativa em tempo real.
    return () => unsub(); // [Funcionamento]: Regra de higiene do sistema: desliga a escuta quando o usuário sai desta tela para economizar memória do celular.
  }, [selectedCity]); // [Funcionamento]: Encerra o efeito e avisa que ele só roda novamente se a cidade selecionada for mudada pelo usuário.

  const handleAdd = async () => {
    // [Funcionamento]: Função acionada ao tocar no botão de enviar para registrar uma nova localidade comum.
    if (!newChurchName.trim())
      return toast.error("Nome da comum é obrigatório"); // [Funcionamento]: Proteção simples: impede o envio se o campo estiver em branco ou apenas com espaços vazios.
    if (!selectedCity?.id || !regionalId)
      return toast.error("Infraestrutura de Cidade/Regional inválida"); // [Funcionamento]: Proteção de infraestrutura: impede de salvar se as conexões de território estiverem ausentes.

    // CORREÇÃO ESTRATÉGICA: Garantindo a carimbagem completa (Denormalização) exigida pelo churchService e pelas Security Rules
    const sucesso = await churchService.createChurch({
      // [Funcionamento]: Dispara o gatilho de criação chamando o motor do nosso arquivo de serviços.
      nome: newChurchName.toUpperCase().trim(), // [Funcionamento]: Envia o nome padronizado em LETRAS MAIÚSCULAS e limpo de espaços desnecessários nas pontas.
      cidadeId: selectedCity.id, // [Funcionamento]: Carimba o identificador exclusivo da cidade vinculada.
      regionalId: regionalId, // [Funcionamento]: Carimba o identificador exclusivo da regional que comanda esse território.
      cidadeNome: selectedCity.nome, // [Funcionamento]: Carimba o nome por extenso da cidade no registro para economizar consultas no banco no futuro.
      regionalNome: selectedCity.regionalNome || `REGIONAL ${regionalId}`, // [Funcionamento]: CORREÇÃO: Garante que o nome da regional seja gravado perfeitamente ou cria uma identificação segura.
    }); // [Funcionamento]: Encerra a chamada do serviço e aguarda a resposta do Firebase.
    if (sucesso) setNewChurchName(""); // [Funcionamento]: Se deu tudo certo no banco de dados, limpa o campo de digitação para a próxima inclusão.
  }; // [Funcionamento]: Encerra a função de adição de igreja comum.

  const handleUpdate = async (id) => {
    // [Funcionamento]: Função que processa e valida a alteração do nome de uma igreja existente.
    if (!editValue.trim()) return; // [Funcionamento]: Impede a gravação caso o usuário apague tudo e deixe o campo vazio.
    try {
      // [Funcionamento]: Abre o bloco de segurança para tentar executar a alteração no servidor.
      // CORREÇÃO ESTRATÉGICA: v5.0 - Alinhado com a propagação histórica para evitar nomes velhos perdidos em relatórios antigos
      await churchService.updateChurchName(id, editValue.toUpperCase().trim()); // [Funcionamento]: Invoca o motor inteligente que muda o nome na matriz e também atualiza todos os ensaios antigos automaticamente.
      setEditingId(null); // [Funcionamento]: Fecha o modo de edição na tela, retornando o card para o estado visual de leitura comum.
    } catch (e) {
      toast.error("Erro ao atualizar");
    } // [Funcionamento]: Captura falhas inesperadas e notifica o usuário na tela sem travar a interface.
  }; // [Funcionamento]: Encerra a função de alteração.

  const handleDelete = (id, nome) => {
    // [Funcionamento]: Função que inicia o processo seguro de exclusão de uma igreja comum da lista.
    if (onConfirmDelete) {
      // [Funcionamento]: Verifica se o painel pai forneceu o componente moderno de confirmação nativo da aplicação.
      onConfirmDelete(nome, async () => {
        // [Funcionamento]: Abre a caixinha de diálogo perguntando de verdade se o usuário deseja realizar a exclusão.
        try {
          // [Funcionamento]: Entra no modo de tentativa segura de exclusão de dados no servidor Firebase.
          await deleteDoc(doc(db, "comuns", id)); // [Funcionamento]: Vai diretamente no banco de dados e remove em definitivo o registro correspondente àquele ID.
          toast.success("Igreja removida", {
            // [Funcionamento]: Exibe a notificação de sucesso com design profissional e customizado de alta visibilidade.
            style: {
              // [Funcionamento]: Início das estilizações personalizadas do balão de notificação.
              backgroundColor: "#020617", // [Funcionamento]: Define o fundo do balão com a cor cinza escuro/Slate-950 profissional do projeto.
              color: "#fff", // [Funcionamento]: Define a cor do texto do balão de notificação como branco puro.
              fontSize: "10px", // [Funcionamento]: Ajusta o tamanho da fonte para manter a discrição harmônica.
              fontWeight: "900", // [Funcionamento]: Define o peso da fonte em modo extra-negrito para leitura direta e impactante.
              textTransform: "uppercase", // [Funcionamento]: Força todo o texto de sucesso do balão a ficar em letras maiúsculas.
            }, // [Funcionamento]: Encerra o objeto de estilo do balão.
          }); // [Funcionamento]: Encerra a configuração da mensagem de sucesso do toast.
        } catch (e) {
          // [Funcionamento]: Caso o banco rejeite a exclusão (por falta de permissão do crachá, por exemplo)...
          toast.error("Erro ao excluir"); // ...exibe um aviso vermelho informando a falha de operação.
        } // [Funcionamento]: Encerra o bloco de tratamento de erro da exclusão.
      }); // [Funcionamento]: Encerra o fluxo de confirmação disparado.
    } else {
      // [Funcionamento]: Se por algum motivo o painel de zeladoria não estiver plugado...
      toast.error("Ação protegida. Use o painel de zeladoria."); // ...barra o procedimento e emite um alerta de segurança em vez do confirm amador do navegador.
    } // [Funcionamento]: Encerra a validação do modal de exclusão.
  }; // [Funcionamento]: Encerra a função mestre de exclusão.

  if (!selectedCity)
    return (
      // [Funcionamento]: Caso nenhuma cidade tenha sido escolhida nos filtros de cima...
      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        {" "}
        {/* [Funcionamento]: Desenha uma caixa cinza suave pontilhada ergonômica. */}
        <p className="text-[9px] font-black text-slate-400 uppercase italic">
          Selecione uma cidade nos filtros acima
        </p>{" "}
        {/* [Funcionamento]: Texto instruindo de forma clara e limpa o próximo passo do usuário leigo. */}
      </div> // [Funcionamento]: Encerra o layout do aviso de seleção pendente.
    ); // [Funcionamento]: Encerra a renderização condicional preventiva de tela vazia.

  return (
    // [Funcionamento]: Início do desenho principal da interface visual do gerenciador de comuns.
    <div className="space-y-4">
      {" "}
      {/* [Funcionamento]: Container pai estruturado com espaçamento vertical automático e simétrico de 16px entre os elementos. */}
      {/* FORMULÁRIO DE ADIÇÃO - AJUSTE ERGONÔMICO ANEXO 4 */}
      <div className="flex gap-2 items-stretch h-14">
        {" "}
        {/* [Funcionamento]: Barra flexível de digitação de 56px de altura que impede botões ou campos esmagados no mobile. */}
        <input // [Funcionamento]: Campo de texto para digitação do nome da nova igreja.
          className="flex-1 bg-white px-4 rounded-2xl text-xs font-black text-slate-950 outline-none border border-slate-100 uppercase italic shadow-inner focus:border-blue-400 transition-colors" // [Funcionamento]: Estilo arredondado premium com efeito de foco azul responsivo e texto em caixa alta automática.
          placeholder={`NOVA COMUM EM ${selectedCity.nome.toUpperCase()}...`} // [Funcionamento]: Placeholder dinâmico e contextualizado mostrando em qual cidade a igreja será inserida.
          value={newChurchName} // [Funcionamento]: Vincula o campo de texto diretamente com o estado guardado na memória da nossa gaveta react.
          onChange={(e) => setNewChurchName(e.target.value)} // [Funcionamento]: Evento capturador: toda letra digitada pelo usuário atualiza a gaveta de memória no mesmo milissegundo.
        />{" "}
        {/* [Funcionamento]: Encerra a tag do campo de entrada de texto. */}
        <button // [Funcionamento]: Botão com ícone de avião de papel para submeter o formulário de cadastro.
          onClick={handleAdd} // [Funcionamento]: Liga o clique ou toque do dedo diretamente à nossa função handleAdd descrita acima.
          className="bg-slate-950 text-white w-14 rounded-2xl active:scale-90 shadow-lg flex items-center justify-center transition-all hover:bg-slate-900 shrink-0" // [Funcionamento]: Botão com área de toque ergonômica e efeito físico de encolhimento de 10% ao ser pressionado pelo dedo.
        >
          {" "}
          {/* [Funcionamento]: Encerra a abertura da tag do botão de envio. */}
          <Send size={18} />{" "}
          {/* [Funcionamento]: Desenha o ícone gráfico moderno de envio centralizado no botão. */}
        </button>{" "}
        {/* [Funcionamento]: Encerra a tag do botão de envio. */}
      </div>{" "}
      {/* [Funcionamento]: Encerra o bloco estrutural do formulário superior. */}
      <div className="space-y-2">
        {" "}
        {/* [Funcionamento]: Bloco vertical contendo o cabeçalho e a lista de registros cadastrados. */}
        <p className="text-[8px] font-black text-blue-600 uppercase px-1 italic">
          Igrejas em {selectedCity.nome}:
        </p>{" "}
        {/* [Funcionamento]: Etiqueta minúscula em negrito absoluto indicando o contexto do território listado abaixo. */}
        <div className="grid grid-cols-1 gap-2">
          {" "}
          {/* [Funcionamento]: Grade moderna de coluna única que força o empilhamento vertical (Vertical Stacking) de cartões de 8px de espaçamento, eliminando tabelas complexas no celular. */}
          {comuns.map(
            (
              c, // [Funcionamento]: Varre a lista de comuns salvas na memória e cria um cartão visual dinâmico para cada registro existente.
            ) => (
              <motion.div
                layout
                key={c.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm"
              >
                {" "}
                {/* [Funcionamento]: Card branco premium animado e protegido com bordas suaves e sombra leve contra fundos claros. */}
                {editingId === c.id ? ( // [Funcionamento]: Condicional visual: Se esta for a igreja em edição, esconde o texto e mostra as caixas de alteração rápida.
                  <div className="flex items-center gap-2 w-full">
                    {" "}
                    {/* [Funcionamento]: Caixa flexível que organiza os inputs e botões de confirmação de edição lado a lado. */}
                    <input
                      autoFocus
                      className="flex-1 bg-slate-50 p-2 rounded-lg text-[10px] font-black outline-none uppercase italic"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />{" "}
                    {/* [Funcionamento]: Campo de edição que foca automaticamente na tela ao abrir e formata o texto digitado. */}
                    <button
                      onClick={() => handleUpdate(c.id)}
                      className="p-2 text-emerald-500 active:scale-90"
                    >
                      <Check size={18} />
                    </button>{" "}
                    {/* [Funcionamento]: Botão verde com ícone de check para aprovar e disparar a atualização de nome e do histórico de atas. */}
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-red-400 active:scale-90"
                    >
                      <X size={18} />
                    </button>{" "}
                    {/* [Funcionamento]: Botão vermelho com ícone de X para cancelar a edição e descartar o texto digitado. */}
                  </div> // [Funcionamento]: Encerra o contêiner interno do formulário de edição ativa.
                ) : (
                  // [Funcionamento]: Caso a igreja não esteja sendo editada, renderiza o layout padrão de visualização do registro.
                  <>
                    {" "}
                    {/* [Funcionamento]: Fragmento protetor exigido pelo React para agrupar elementos irmãos sem injetar tags lixo no HTML final. */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {" "}
                      {/* [Funcionamento]: Bloco de leitura de dados alinhado horizontalmente com proteção total de quebra de layout. */}
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400 shrink-0">
                        <Home size={12} />
                      </div>{" "}
                      {/* [Funcionamento]: Pequena caixinha estética contendo um mini ícone de casinha cinza decorativo. */}
                      <span className="text-[10px] font-black text-slate-700 uppercase truncate">
                        {c.comum}
                      </span>{" "}
                      {/* [Funcionamento]: Exibe o nome da igreja protegida rigorosamente por 'truncate' que corta o texto com '...' se for gigante no celular. */}
                    </div>{" "}
                    {/* [Funcionamento]: Encerra o bloco de leitura e exibição de dados principais da igreja comum. */}
                    <div className="flex gap-1 shrink-0 ml-2">
                      {" "}
                      {/* [Funcionamento]: Caixa de botões de controle de gerenciamento que nunca encolhe, garantindo integridade visual na ponta direita do card. */}
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditValue(c.comum);
                        }}
                        className="p-3 text-slate-300 hover:text-blue-500 transition-colors active:scale-90"
                        aria-label={`Editar ${c.comum}`}
                      >
                        <Edit3 size={14} />
                      </button>{" "}
                      {/* [Funcionamento]: Botão discreto com ícone de caneta que abre instantaneamente as ferramentas de alteração da comum selecionada. */}
                      <button
                        onClick={() => handleDelete(c.id, c.comum)}
                        className="p-3 text-slate-300 hover:text-red-500 transition-colors active:scale-90"
                        aria-label={`Excluir ${c.comum}`}
                      >
                        <Trash2 size={14} />
                      </button>{" "}
                      {/* [Funcionamento]: Botão ergonômico de 44px de área com ícone de lixeira cinza que aciona a exclusão segura com confirmação. */}
                    </div>{" "}
                    {/* [Funcionamento]: Encerra a caixinha de ações rápidas do cartão. */}
                  </> // [Funcionamento]: Encerra o fragmento protetor do modo de leitura padrão do cartão.
                )}{" "}
                {/* [Funcionamento]: Encerra o fluxo condicional alternador entre modo de visualização ou modo de edição de dados. */}
              </motion.div> // [Funcionamento]: Encerra o cartão animado de exibição da igreja comum da listagem.
            ),
          )}{" "}
          {/* [Funcionamento]: Encerra o loop mapeador de renderização dinâmica das comuns na tela. */}
          {comuns.length === 0 && ( // [Funcionamento]: Operador lógico que checa: "Se a lista de comuns salvas na memória estiver vazia..."
            <p className="py-10 text-center text-[8px] font-black text-slate-300 uppercase italic">
              Nenhuma comum cadastrada nesta cidade.
            </p> // ...mostra essa mensagem amigável e limpa centralizada na tela.
          )}{" "}
          {/* [Funcionamento]: Encerra a verificação protetiva de lista vazia. */}
        </div>{" "}
        {/* [Funcionamento]: Encerra o contêiner de grade e empilhamento dos cartões de igrejas. */}
      </div>{" "}
      {/* [Funcionamento]: Encerra a seção estrutural vertical da listagem geral de igrejas comuns. */}
    </div> // [Funcionamento]: Encerra o container de visualização pai principal da tela do gerenciador de comuns.
  ); // [Funcionamento]: Encerra e despacha a montagem visual da interface para o navegador do usuário.
}; // [Funcionamento]: Encerra a declaração da função mestre do componente ModuleChurchesManager.

export default ModuleChurchesManager; // [Funcionamento]: Exporta o componente totalmente blindado para ser importado e renderizado livremente nas abas de configurações da aplicação.
