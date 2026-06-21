import React, { useState, useEffect, useMemo } from 'react'; // Explicação: Importa as ferramentas essenciais do React para criar componentes e monitorar mudanças de estado.
import { db, doc, onSnapshot, updateDoc } from '../../config/firebase'; // Explicação: Conecta com os motores de documentos específicos e atualizações atômicas do Firebase.
import toast from 'react-hot-toast'; // Explicação: Importa o sistema de avisos flutuantes de sucesso ou erro na tela.
import { MapPin, Clock, Shield, Lock, Calendar } from 'lucide-react'; // Explicação: Importa os ícones imutáveis e limpos para ilustrar as seções de endereço e horários.
import { motion } from 'framer-motion'; // Explicação: Importa a biblioteca de animações físicas para fazer a tela surgir de forma suave.
import { useAuth } from '../../context/AuthContext'; // Explicação: Importa o cérebro de identidade para ler as permissões territoriais do usuário logado.

const ModuleChurch = ({ localData, onUpdate }) => { // Explicação: Inicia o componente de Cadastro da Comum recebendo os dados do GPS superior.
  const { userData } = useAuth(); // Explicação: Puxa os dados completos da identidade de quem está usando o sistema.
  
  // --- MATRIZ DE PODER PRESERVADA E BLINDADA (NÃO MEXER) ---
  const temPoderEdicao = useMemo(() => { // Explicação: Calcula em tempo real se o usuário logado tem autoridade territorial para mexer nos dados desta igreja.
    const level = userData?.accessLevel;
    const isMaster = level === 'master';
    const isComissao = isMaster || level === 'comissao';
    const isRegionalCidade = level === 'regional_cidade';
    const isGemLocal = level === 'gem_local';

    if (isMaster || isComissao) return true; // Explicação: Líderes da regional ou criador do app podem editar qualquer igreja sem restrições.
    if (isRegionalCidade) return userData?.cidadeId === localData?.cidadeId; // Explicação: Administradores de cidade só editam se a igreja pertencer à cidade deles.
    
    return isGemLocal && userData?.comumId === localData?.id; // Explicação: Secretário local só edita se for rigorosamente a mesma igreja do crachá dele.
  }, [userData, localData]);

  const [formData, setFormData] = useState(localData || {}); // Explicação: Memória de formulário local populada com os dados iniciais da igreja.
  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']; // Explicação: Lista com os nomes dos dias da semana por extenso para exibição inteira na grade.

  // Listener para dados da Comum em Tempo Real
  useEffect(() => { // Explicação: Monitor que escuta qualquer mudança física feita nesta igreja diretamente no banco de dados.
    if (!localData?.id) return; // Explicação: Se não houver igreja focada, aborta para evitar leitura fantasma.
    setFormData(localData); // Explicação: Atualiza a memória local com o novo escopo do GPS.
    const unsubDoc = onSnapshot(doc(db, 'comuns', localData.id), (docSnap) => { // Explicação: Abre o ouvinte em tempo real no documento desta igreja específica.
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(prev => ({
          ...prev,
          ...data,
          endereco: data.endereco || prev.endereco || {}, // Explicação: Protege o objeto de endereço contra falhas de dados nulos.
          diasSelecao: data.diasSelecao || prev.diasSelecao || [] // Explicação: Protege os dias de cultos marcados contra falhas.
        }));
      }
    });
    return () => unsubDoc(); // Explicação: Desliga o ouvinte ao fechar o painel para proteger a cota do Firestore.
  }, [localData?.id]);

  const handleFieldChange = (field, value, isAddress = false) => { // Explicação: Captura a digitação do usuário e força a gravação em letras maiúsculas automáticas.
    if (!temPoderEdicao) return; // Explicação: Se for apenas leitura, bloqueia a digitação imediatamente.
    const upperValue = typeof value === 'string' ? value.toUpperCase() : value; // Explicação: Regra de padronização: Transforma tudo em caixa alta.
    if (isAddress) {
      setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: upperValue } })); // Explicação: Grava na gaveta de endereços.
    } else {
      setFormData(prev => ({ ...prev, [field]: upperValue })); // Explicação: Grava nos campos gerais da raiz.
    }
  };

  const saveToDatabase = async () => { // Explicação: Motor de persistência que salva as alterações assim que o usuário tira o foco do campo (onBlur).
    if (!localData?.id || !temPoderEdicao) return; // Explicação: Bloqueia salvamentos se não houver ID válida ou se o crachá for de leitura.
    try {
      const docRef = doc(db, 'comuns', localData.id); // Explicação: Mira cirurgicamente no documento desta comum.
      const updatePayload = { // Explicação: Monta o pacote enxuto de dados purificados, livre de qualquer menção a obreiros ou ministério.
        endereco: formData.endereco || {},
        horaCulto: formData.horaCulto || '',
        horaCultoDomingo: formData.horaCultoDomingo || '',
        ensaioLocal: formData.ensaioLocal || '',
        horaEnsaio: formData.horaEnsaio || '',
        updatedAt: Date.now()
      };
      await updateDoc(docRef, updatePayload); // Explicação: Executa a gravação atômica no banco Firestore de forma econômica.
      if (onUpdate) onUpdate(formData); // Explicação: Sincroniza a memória da tela com as novas alterações.
      toast.success("Dados cadastrais salvos com sucesso!"); // Explicação: Mostra o balão verde de sucesso.
    } catch (e) { 
      toast.error("Erro ao salvar dados cadastrais."); // Explicação: Alerta de falha de conexão.
    }
  };

  const toggleDia = async (idx) => { // Explicação: Liga ou desliga um dia de culto semanal ao clicar nas pílulas de dias.
    if (!temPoderEdicao) return; // Explicação: Proteção de crachá eletrônico.
    const current = formData.diasSelecao || [];
    const updated = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx]; // Explicação: Se o dia já existia, remove. Se não, adiciona na lista.
    try {
        await updateDoc(doc(db, 'comuns', localData.id), { diasSelecao: updated }); // Explicação: Salva a nova matriz de dias diretamente no banco.
    } catch (e) { 
        toast.error("Erro ao alterar agenda de cultos."); 
    }
  };

  if (!localData) return <div className="py-10 text-center opacity-30 text-[8px] font-black uppercase tracking-widest italic">Selecione uma localidade ativa no topo.</div>;

  return ( // Explicação: Inicia o desenho da interface limpa de mercado.
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-10">
      
      {/* INDICADOR DE STATUS DO CRACHÁ */}
      <div className={`p-4 rounded-2xl flex items-center gap-3 border ${temPoderEdicao ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
          {temPoderEdicao ? <Shield size={16} className="text-blue-600 shrink-0" /> : <Lock size={16} className="text-amber-600 shrink-0" />}
          <div className="leading-tight text-left">
            <p className={`text-[9px] font-black uppercase italic ${temPoderEdicao ? 'text-blue-600' : 'text-amber-600'}`}>
                {temPoderEdicao ? 'Zeladoria de Cadastro Liberada' : 'Acesso Limitado: Apenas Leitura'}
            </p>
            <p className="text-[7px] font-bold text-slate-400 uppercase">Sincronização em tempo real com a nuvem</p>
          </div>
      </div>

      {/* SEÇÃO 1: ENDEREÇO E LOCALIZAÇÃO FÍSICA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MapPin size={14} className="text-indigo-600 shrink-0" />
          <p className="text-[10px] font-black text-slate-950 uppercase italic tracking-widest leading-none">Endereço e Localização da Comum</p>
        </div>
        <div className="space-y-2">
          {/* Linha 1: Rua (Ocupa espaço total) */}
          <div className="flex flex-col gap-1">
            <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Rua / Avenida / Logradouro por Extenso</label>
            <input disabled={!temPoderEdicao} placeholder="DIGITE O ENDEREÇO DA COMUM SEM CORTES" className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-200 uppercase italic outline-none focus:border-indigo-600 whitespace-normal break-words" value={formData.endereco?.rua || ''} onChange={e => handleFieldChange('rua', e.target.value, true)} onBlur={saveToDatabase} />
          </div>
          {/* Linha 2: Número e Bairro */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Número</label>
              <input disabled={!temPoderEdicao} placeholder="Nº" className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-200 uppercase italic outline-none text-center focus:border-indigo-600" value={formData.endereco?.numero || ''} onChange={e => handleFieldChange('numero', e.target.value, true)} onBlur={saveToDatabase} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Bairro Oficial por Extenso</label>
              <input disabled={!temPoderEdicao} placeholder="BAIRRO" className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-200 uppercase italic outline-none focus:border-indigo-600" value={formData.endereco?.bairro || ''} onChange={e => handleFieldChange('bairro', e.target.value, true)} onBlur={saveToDatabase} />
            </div>
          </div>
          {/* Linha 3: Código de Endereçamento Postal (CEP) */}
          <div className="flex flex-col gap-1">
            <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Código de Endereçamento Postal (CEP)</label>
            <input disabled={!temPoderEdicao} placeholder="00000-000" className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-200 uppercase italic outline-none focus:border-indigo-600 text-center tracking-widest" value={formData.endereco?.cep || ''} onChange={e => handleFieldChange('cep', e.target.value, true)} onBlur={saveToDatabase} />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: AGENDA E DIAS DE CULTOS */}
      <div className="space-y-3.5 pt-1">
        <div className="flex items-center gap-2 px-1">
          <Clock size={14} className="text-emerald-600 shrink-0" />
          <p className="text-[10px] font-black text-slate-950 uppercase italic tracking-widest leading-none">Dias de Reuniões e Cultos Semanais</p>
        </div>
        
        {/* Grade de Seleção de Dias Inteira sem Cortes */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {diasSemana.map((d, i) => (
            <button key={i} disabled={!temPoderEdicao} onClick={() => toggleDia(i)} className={`h-9 rounded-xl font-black text-[9px] transition-all tracking-tighter outline-none ${formData.diasSelecao?.includes(i) ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-300 border border-slate-200'}`}>{d}</button>
          ))}
        </div>

        {/* Inputs de Horários */}
        <div className="space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Clock size={14} className="text-slate-300 shrink-0"/>
                <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-tight whitespace-normal">Horário Padrão dos Cultos Semanais</span>
            </div>
            <input disabled={!temPoderEdicao} type="time" className="bg-transparent font-black text-slate-950 text-xs outline-none text-right shrink-0 ml-2" value={formData.horaCulto || '19:30'} onChange={e => handleFieldChange('horaCulto', e.target.value)} onBlur={saveToDatabase} />
          </div>

          {formData.diasSelecao?.includes(0) && ( // Explicação: Condicional Inteligente: Se houver culto no Domingo (índice 0), abre o campo exclusivo de horário dominical.
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Clock size={14} className="text-emerald-500 shrink-0"/>
                <span className="text-[9px] font-black text-emerald-700 uppercase italic tracking-tight whitespace-normal">Horário Exclusivo do Culto de Domingo</span>
              </div>
              <input disabled={!temPoderEdicao} type="time" className="bg-transparent font-black text-emerald-800 text-xs outline-none text-right shrink-0 ml-2" value={formData.horaCultoDomingo || '18:30'} onChange={e => handleFieldChange('horaCultoDomingo', e.target.value)} onBlur={saveToDatabase} />
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 3: AGENDA DO ENSAIO LOCAL */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 px-1">
          <Calendar size={14} className="text-blue-600 shrink-0" />
          <p className="text-[10px] font-black text-slate-950 uppercase italic tracking-widest leading-none">Cronograma do Ensaio Local Técnico</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Dia da Semana (Por Extenso)</label>
            <input disabled={!temPoderEdicao} placeholder="EX: 4º SÁBADO" className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-200 uppercase italic outline-none focus:border-indigo-600 text-center" value={formData.ensaioLocal || ''} onChange={e => handleFieldChange('ensaioLocal', e.target.value)} onBlur={saveToDatabase} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider pl-1">Horário de Início</label>
            <input disabled={!temPoderEdicao} type="time" className="w-full bg-white p-4 rounded-2xl font-black text-slate-950 text-xs border border-slate-200 outline-none focus:border-indigo-600 text-center" value={formData.horaEnsaio || '19:00'} onChange={e => handleFieldChange('horaEnsaio', e.target.value)} onBlur={saveToDatabase} />
          </div>
        </div>
      </div>

    </motion.div>
  );
};

export default ModuleChurch; // Explicação: Exporta o submódulo de cadastro totalmente purificado e focado, pronto para rodar nos modais do aplicativo.