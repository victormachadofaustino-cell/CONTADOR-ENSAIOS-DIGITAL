import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, where, orderBy, getDocs } from '../../../config/firebase';
import { ChevronDown, Check, UserPlus, Users, Shield, Trash2, Plus, Search, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/**
 * Módulo de Seleção Nominal de Ministério para Ensaios Regionais
 * v1.8 - Blindagem para Nível Básico e Estabilização de SDK
 */
const MinistryAccordion = ({ eventId, regionalId, presencaAtual = [], onChange, isInputDisabled, userData }) => {
  const [regionalUsers, setRegionalUsers] = useState([]);
  const [openGroup, setOpenGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isBasico = userData?.accessLevel === 'basico';

  // Ordem litúrgica com suporte a variantes de siglas e erros de acentuação do banco
  const gruposMinisteriais = [
    { label: 'Anciães', roles: ['Ancião', 'Anciao', 'Anciães'] },
    { label: 'Diáconos', roles: ['Diácono', 'Diacono', 'Diáconos'] },
    { label: 'Cooperadores do Ofício', roles: ['Cooperador do Ofício', 'Cooperador do Oficio', 'Cooperador Ofício'] },
    { label: 'Cooperadores de Jovens e Menores', roles: ['Cooperador RJM', 'Cooperador de Jovens e Menores', 'Cooperador de Jovens', 'Cooperador Jovens'] },
    { label: 'Encarregados Regionais', roles: ['Encarregado Regional'] },
    { label: 'Examinadoras', roles: ['Examinadora', 'Examinadoras'] },
    { label: 'Encarregados Locais', roles: ['Encarregado Local'] }
  ];

  // Função auxiliar para normalizar buscas (remove acentos e espaços extras)
  const normalize = (str) => 
    str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

  // 1. Busca consolidada (Global + Subcoleções das Comuns) com Blindagem para Básico
  useEffect(() => {
    if (!regionalId || isBasico) return; 
    let isMounted = true;

    const loadConsolidatedMinistry = async () => {
      try {
        // Passo A: Busca na coleção global /users
        const qGlobal = query(
          collection(db, 'users'),
          where('regionalId', '==', regionalId),
          where('approved', '==', true)
        );
        
        const snapGlobal = await getDocs(qGlobal);
        const usersGlobal = snapGlobal.docs.map(d => ({
          id: d.id,
          nome: d.data().name,
          role: d.data().role,
          comum: d.data().comum || "Não Informada"
        }));

        // Passo B: Busca as comuns da regional
        const qComuns = query(collection(db, 'comuns'), where('regionalId', '==', regionalId));
        const snapComuns = await getDocs(qComuns);
        
        let usersLocais = [];
        
        // Passo C: Varredura em cada subcoleção ministerio_lista
        for (const comumDoc of snapComuns.docs) {
          try {
            const snapLocal = await getDocs(collection(db, 'comuns', comumDoc.id, 'ministerio_lista'));
            const dataLocal = snapLocal.docs.map(d => ({
              id: d.id,
              nome: d.data().nome,
              role: d.data().cargo,
              comum: comumDoc.data().name
            }));
            usersLocais = [...usersLocais, ...dataLocal];
          } catch (e) { /* Ignora falha em comum específica */ }
        }

        const allUsersMap = new Map();
        [...usersGlobal, ...usersLocais].forEach(u => {
          const key = normalize(u.nome);
          if (!allUsersMap.has(key) || u.id.length > 20) {
            allUsersMap.set(key, u);
          }
        });

        if (isMounted) {
          setRegionalUsers(Array.from(allUsersMap.values()).sort((a, b) => a.nome.localeCompare(b.nome)));
        }
      } catch (err) {
        console.warn("MinistryAccordion: Acesso restrito a usuários desta regional.");
      }
    };

    loadConsolidatedMinistry();
    return () => { isMounted = false; };
  }, [regionalId, isBasico]);

  // ZERO DELAY: Filtra e organiza os membros em cache de memória
  const processedGroups = useMemo(() => {
    const term = normalize(searchTerm);
    
    return gruposMinisteriais.map(grupo => {
      const membros = regionalUsers.filter(u => {
        const matchCargo = grupo.roles.some(r => normalize(r) === normalize(u.role));
        const matchBusca = !term || normalize(u.nome).includes(term) || normalize(u.role).includes(term);
        return matchCargo && matchBusca;
      });

      const selecionados = presencaAtual.filter(p => 
        grupo.roles.some(r => normalize(r) === normalize(p.role))
      );

      return { ...grupo, membros, selecionados };
    });
  }, [regionalUsers, presencaAtual, searchTerm]);

  // 2. Lógica de Toggle de Presença (Bloqueada para Básico)
  const handleToggle = (person) => {
    if (isInputDisabled || isBasico) return;

    const isPresent = presencaAtual.some(p => normalize(p.nome) === normalize(person.nome));
    let novaLista;

    if (isPresent) {
      novaLista = presencaAtual.filter(p => normalize(p.nome) !== normalize(person.nome));
    } else {
      novaLista = [...presencaAtual, { 
        nome: person.nome, 
        role: person.role, 
        isExternal: false 
      }];
    }
    
    onChange(novaLista);
  };

  // Se for nível básico, exibe apenas os nomes confirmados na Ata de forma simplificada
  if (isBasico) {
    return (
      <div className="space-y-4 pt-2">
        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 text-center">
          <ShieldAlert size={20} className="mx-auto text-blue-400 mb-3" />
          <p className="text-[9px] font-black text-blue-600 uppercase italic leading-none mb-1">Modo de Visualização</p>
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            A lista completa de membros é restrita. <br/>Abaixo os confirmados na Ata Regional.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
          {presencaAtual.length > 0 ? presencaAtual.map((m, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
              <div className="text-left leading-none">
                <p className="text-[10px] font-black uppercase italic text-slate-950 mb-1">{m.nome}</p>
                <p className="text-[7px] font-bold text-blue-500 uppercase tracking-widest">{m.role}</p>
              </div>
              <Check size={14} className="text-blue-500" strokeWidth={3} />
            </div>
          )) : (
            <p className="text-center py-8 text-[8px] font-bold text-slate-300 uppercase italic">Nenhum ministério confirmado ainda</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      {/* BARRA DE BUSCA NOMINAL */}
      <div className="relative mb-4 px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
        <input 
          type="text"
          placeholder="BUSCAR NOME OU CARGO..."
          className="w-full bg-white border border-slate-100 p-3.5 pl-10 rounded-2xl text-[10px] font-black uppercase italic outline-none shadow-sm placeholder:text-slate-300 focus:border-blue-200 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
            <X size={14} />
          </button>
        )}
      </div>

      {processedGroups.map((grupo) => {
        const isOpen = openGroup === grupo.label;
        if (grupo.membros.length === 0 && grupo.selecionados.length === 0) return null;

        return (
          <div key={grupo.label} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => setOpenGroup(isOpen ? null : grupo.label)}
              className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? 'bg-slate-50' : 'bg-white'}`}
            >
              <div className="flex items-center gap-3 leading-none">
                <div className={`p-2.5 rounded-xl ${grupo.selecionados.length > 0 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                  <Shield size={16} />
                </div>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950">{grupo.label}</h4>
                  <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">
                    {grupo.selecionados.length} Confirmados na Regional
                  </p>
                </div>
              </div>
              <ChevronDown size={14} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-4 pt-0 space-y-1 bg-slate-50/50">
                    {grupo.membros.length > 0 ? grupo.membros.map(membro => {
                      const active = presencaAtual.some(p => normalize(p.nome) === normalize(membro.nome));
                      return (
                        <button 
                          key={membro.id}
                          onClick={() => handleToggle(membro)}
                          className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${
                            active ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent'
                          }`}
                        >
                          <div className="text-left leading-none">
                            <p className={`text-[10px] font-black uppercase mb-1 ${active ? 'text-blue-700' : 'text-slate-600'}`}>{membro.nome}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{membro.role} • {membro.comum}</p>
                          </div>
                          {active && (
                            <div className="bg-blue-600 rounded-full p-1 shadow-sm animate-in zoom-in">
                              <Check size={10} className="text-white" strokeWidth={4} />
                            </div>
                          )}
                        </button>
                      );
                    }) : (
                      <div className="py-4 text-center text-[8px] font-bold text-slate-300 uppercase italic">Nenhum membro aprovado nesta categoria</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default MinistryAccordion;