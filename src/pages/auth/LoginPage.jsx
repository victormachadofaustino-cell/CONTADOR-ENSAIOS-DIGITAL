import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { db, collection, onSnapshot, query, orderBy, where } from '../../config/firebase'; 
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, ShieldCheck, Activity, User, Briefcase, MapPin, Globe, Send, Clock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = ({ 
  authMode, setAuthMode, email, setEmail, pass, setPass, 
  userName, setUserName, userRole, setUserRole, userData 
}) => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // Controle do aviso de SPAM
  
  const [regionais, setRegionais] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [igrejasDisponiveis, setIgrejasDisponiveis] = useState([]);
  
  const [selectedRegionalId, setSelectedRegionalId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedChurch, setSelectedChurch] = useState(null); 
  const [listaCargosLocal, setListaCargosLocal] = useState([]); 

  // 1. CARGA DINÂMICA DE REGIONAIS
  useEffect(() => {
    if (authMode !== 'register') return;
    const unsub = onSnapshot(collection(db, 'config_regional'), 
      (snapshot) => {
        const lista = snapshot.docs.map(d => ({ id: d.id, nome: d.data().nome }));
        setRegionais(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
      },
      (error) => { console.warn("Permissão negada: regionais"); }
    );
    return () => unsub();
  }, [authMode]);

  // 2. FILTRAGEM DINÂMICA DE CIDADES POR REGIONAL
  useEffect(() => {
    if (!selectedRegionalId) { setCidades([]); setSelectedCityId(''); return; }
    const q = query(collection(db, 'config_cidades'), where('regionalId', '==', selectedRegionalId));
    const unsub = onSnapshot(q, 
      (snapshot) => {
        const lista = snapshot.docs.map(d => ({ id: d.id, nome: d.data().nome }));
        setCidades(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    );
    return () => unsub();
  }, [selectedRegionalId]);

  // 3. FILTRAGEM DINÂMICA DE COMUNS POR CIDADE
  useEffect(() => {
    if (!selectedCityId) { setIgrejasDisponiveis([]); setSelectedChurch(null); return; }
    const q = query(collection(db, 'comuns'), where('cidadeId', '==', selectedCityId));
    const unsub = onSnapshot(q, 
      (snapshot) => {
        const lista = snapshot.docs.map(d => ({ 
          id: d.id, 
          nome: d.data().comum || d.data().nome || "Localidade",
          cidadeId: d.data().cidadeId,
          regionalId: d.data().regionalId
        })).sort((a, b) => a.nome.localeCompare(b.nome));
        setIgrejasDisponiveis(lista);
      }
    );
    return () => unsub();
  }, [selectedCityId]);

  // 4. CARGA DE CARGOS DA BASE DE REFERÊNCIA SANEADA
  useEffect(() => {
    const q = query(collection(db, 'referencia_cargos'), orderBy('nome', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs
        .filter(d => d.data().tipo === 'cargo' || ['Encarregado Regional', 'Encarregado Local', 'Examinadora'].includes(d.data().nome))
        .map(d => d.data().nome);
      setListaCargosLocal(lista);
    });
    return () => unsub();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !pass) return toast.error("Preencha e-mail e senha");
    setLoading(true);
    try {
      if (authMode === 'login') {
        await authService.login(email, pass);
      } else {
        if (!userName.trim()) throw new Error("Informe seu nome");
        if (pass.length < 6) throw new Error("Mínimo 6 caracteres na senha");
        if (!selectedChurch) throw new Error("Selecione sua localidade");

        await authService.register({
          email, password: pass, name: userName,
          role: userRole || (listaCargosLocal[0] || ''),
          comum: selectedChurch.nome, comumId: selectedChurch.id,
          cidadeId: selectedCityId, regionalId: selectedRegionalId
        });
        
        setEmailSent(true);
        toast.success("Cadastro realizado!");
      }
    } catch (err) {
      toast.error(err.message === 'auth/invalid-credential' ? "E-mail ou senha incorretos" : err.message);
    } finally { setLoading(false); }
  };

  // --- TELA DE BLOQUEIO DE SEGURANÇA (AGUARDANDO APROVAÇÃO) ---
  if (userData && !userData.approved && userData.emailVerified) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#FFFFFF] via-[#E2E8F0] to-[#0F172A]">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 shadow-2xl border border-white max-w-sm w-full space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
          
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock size={40} className="animate-pulse" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-[900] uppercase italic tracking-tighter text-slate-950">Aguardando Aprovação</h3>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">Status: E-mail Validado</p>
            </div>
            
            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">
              Sua conta foi criada com sucesso. Agora, aguarde a liberação pela <span className="text-slate-950">Zeladoria Musical</span>.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-2">
            <p className="text-[10px] font-black text-slate-900 uppercase italic leading-tight">Próximo Passo:</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight">Contate seu Secretário Local ou Regional para aprovar seu perfil.</p>
          </div>

          <button 
            onClick={() => authService.logout()}
            className="flex items-center justify-center gap-2 mx-auto text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-6 py-3 rounded-2xl transition-all active:scale-95"
          >
            <LogOut size={14} /> Sair da Conta
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#E2E8F0] to-[#0F172A]">
      <div className="w-full max-w-md space-y-8 animate-premium relative z-10 overflow-y-auto no-scrollbar max-h-screen py-10 text-left">
        
        <AnimatePresence>
          {emailSent && (
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl mb-4 relative overflow-hidden">
              <div className="flex items-start gap-4">
                <Send size={24} className="shrink-0" />
                <div className="space-y-1">
                  <p className="font-black uppercase italic text-xs leading-none">Verifique seu e-mail</p>
                  <p className="text-[9px] font-bold uppercase opacity-80 leading-tight">Enviamos um link de validação. Olhe sua caixa de entrada e também o <b>SPAM / Lixo Eletrônico</b>.</p>
                </div>
              </div>
              <button onClick={() => { setEmailSent(false); setAuthMode('login'); }} className="mt-4 w-full bg-white/20 hover:bg-white/30 py-3 rounded-2xl text-[9px] font-black uppercase italic tracking-widest transition-all">Ir para Login</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cabeçalho de Títulos centralizados (Logo removido) */}
        <div className="space-y-4 mb-12 text-center">
          <div className="text-center space-y-2 pt-4">
            <h2 className="text-slate-950 text-3xl font-[900] tracking-[0.2em] uppercase leading-none italic">Contador de</h2>
            <h2 className="text-slate-800 text-4xl font-[900] tracking-[0.1em] italic uppercase leading-none opacity-90">Ensaios Musicais</h2>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-950" />
          <h3 className="text-xl font-[900] uppercase italic tracking-tighter text-slate-950 mb-8">
            {authMode === 'login' ? 'Acessar Conta' : 'Nova Solicitação'}
          </h3>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><User size={10} /> Nome Completo</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none uppercase" type="text" value={userName} onChange={e => setUserName(e.target.value)} required autoComplete="name" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Globe size={10} /> Regional</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 appearance-none uppercase" value={selectedRegionalId} onChange={e => { setSelectedRegionalId(e.target.value); setSelectedCityId(''); setSelectedChurch(null); }} required>
                    <option value="">Selecione a Regional...</option>
                    {regionais.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </div>

                {selectedRegionalId && (
                  <div className="space-y-1.5 animate-in">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><MapPin size={10} /> Cidade</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 appearance-none uppercase" value={selectedCityId} onChange={e => { setSelectedCityId(e.target.value); setSelectedChurch(null); }} required>
                      <option value="">Selecione a Cidade...</option>
                      {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                )}

                {selectedCityId && (
                  <div className="space-y-1.5 animate-in">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><ShieldCheck size={10} /> Localidade</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 appearance-none uppercase" value={selectedChurch?.id || ''} onChange={e => setSelectedChurch(igrejasDisponiveis.find(i => i.id === e.target.value))} required>
                      <option value="">Selecione a igreja...</option>
                      {igrejasDisponiveis.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Briefcase size={10} /> Função / Cargo</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 appearance-none uppercase" value={userRole} onChange={e => setUserRole(e.target.value)} required>
                    <option value="">Selecione o cargo...</option>
                    {listaCargosLocal.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Mail size={10} /> E-mail Oficial</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Lock size={10} /> Senha</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none" 
                type="password" 
                value={pass} 
                onChange={e => setPass(e.target.value)} 
                required 
                autoComplete={authMode === 'login' ? "current-password" : "new-password"} 
              />
            </div>

            <button disabled={loading} type="submit" className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-6 flex justify-center items-center gap-3">
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (
                <><LogIn size={16} /> {authMode === 'login' ? 'Entrar no Sistema' : 'Enviar Cadastro'}</>
              )}
            </button>
          </form>

          <button className="w-full mt-8 text-slate-400 font-black uppercase italic text-[9px] tracking-widest text-center" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setEmailSent(false); }}>
            {authMode === 'login' ? 'Não tem conta? Solicite Acesso' : 'Já possui conta? Faça Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;