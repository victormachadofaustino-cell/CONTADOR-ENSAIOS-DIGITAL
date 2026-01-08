import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { db, collection, onSnapshot, query, orderBy } from '../firebase'; // Importações adicionadas
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, ShieldCheck, Activity, User, Briefcase, MapPin } from 'lucide-react';

const LoginPage = ({ 
  authMode, setAuthMode, email, setEmail, pass, setPass, 
  userName, setUserName, userRole, setUserRole, cargosDinamicos 
}) => {
  const [loading, setLoading] = useState(false);
  const [igrejasDisponiveis, setIgrejasDisponiveis] = useState([]); // Estado para as igrejas
  const [selectedChurch, setSelectedChurch] = useState(null); // Igreja selecionada no cadastro
  const [listaCargosLocal, setListaCargosLocal] = useState([]); // Backup para garantir carregamento dos cargos

  // Monitora as igrejas disponíveis na coleção config_comum
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'config_comum'), (snapshot) => {
      const lista = snapshot.docs.map(d => ({ 
        id: d.id, 
        nome: d.data().comum || d.data().nome 
      })).sort((a, b) => a.nome.localeCompare(b.nome));
      
      setIgrejasDisponiveis(lista);
      if (lista.length > 0 && !selectedChurch) {
        setSelectedChurch(lista[0]);
      }
    });
    return () => unsub();
  }, []);

  // NOVO: Monitora cargos dinâmicos caso cargosDinamicos venha vazio
  useEffect(() => {
    const q = query(collection(db, 'config_cargos'), orderBy('cargo', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(d => d.data().cargo);
      setListaCargosLocal(lista);
      // Se não houver cargo selecionado, define o primeiro da lista
      if (lista.length > 0 && !userRole) {
        setUserRole(lista[0]);
      }
    });
    return () => unsub();
  }, [userRole, setUserRole]);

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (!email || !pass) {
      return toast.error("Preencha e-mail e senha");
    }

    setLoading(true);
    try {
      if (authMode === 'login') {
        await authService.login(email, pass);
      } else {
        if (!userName.trim()) throw new Error("Informe seu nome");
        if (pass.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres");
        if (!selectedChurch) throw new Error("Selecione sua localidade");

        await authService.register({
          email,
          password: pass,
          name: userName,
          role: userRole || listaCargosLocal[0],
          comum: selectedChurch.nome,
          comumId: selectedChurch.id
        });
        toast.success("Verifique seu e-mail!");
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? "E-mail ou senha incorretos" : err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#E2E8F0] to-[#0F172A]">
      
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-slate-400/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md space-y-8 animate-premium relative z-10 overflow-y-auto no-scrollbar max-h-screen py-10 text-left">
        
        <div className="space-y-4 mb-8 text-center">
          <div className="flex justify-center mb-4">
             {/* ALINHAMENTO DA LOGO COM FUNDO TRANSPARENTE (TELA PRINCIPAL) */}
             <div className="drop-shadow-2xl">
                <img 
                  src="/assets/Logo_oficial_CCB.png" 
                  alt="Logo Oficial CCB" 
                  className="w-48 h-48 object-contain"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150?text=CCB"; // Fallback se falhar
                  }}
                />
             </div>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-slate-950 text-3xl font-[900] tracking-[0.2em] uppercase leading-none">Contador de</h2>
            <h2 className="text-slate-800 text-4xl font-[900] tracking-[0.1em] italic uppercase leading-none opacity-90">Ensaio Local</h2>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.5em] pt-2">Regional Jundiaí</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-950" />
          
          <div className="mb-8 text-left">
            <h3 className="text-xl font-[900] uppercase italic tracking-tighter text-slate-950 leading-none">
              {authMode === 'login' ? 'Acessar Conta' : 'Nova Solicitação'}
            </h3>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-2 italic">
              {authMode === 'login' ? 'Ambiente para Colaboradores' : 'Preencha para análise do Master'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><User size={10} /> Nome Completo</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-slate-950 transition-all uppercase" type="text" value={userName} onChange={e => setUserName(e.target.value)} required />
                </div>

                {/* SELEÇÃO DINÂMICA DE IGREJA */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><MapPin size={10} /> Localidade / Comum</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-slate-950 appearance-none uppercase" 
                    value={selectedChurch?.id || ''} 
                    onChange={e => {
                      const church = igrejasDisponiveis.find(i => i.id === e.target.value);
                      setSelectedChurch(church);
                    }}
                    required
                  >
                    <option value="" disabled>Selecione a igreja...</option>
                    {igrejasDisponiveis.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Briefcase size={10} /> Cargo Ministerial</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-slate-950 appearance-none uppercase" value={userRole} onChange={e => setUserRole(e.target.value)} required>
                    {(cargosDinamicos?.length > 0 ? cargosDinamicos : listaCargosLocal).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Mail size={10} /> E-mail Oficial</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-slate-950 transition-all" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 italic flex items-center gap-1.5"><Lock size={10} /> Senha de Segurança</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-slate-950 transition-all" type="password" value={pass} onChange={e => setPass(e.target.value)} required />
            </div>

            <button disabled={loading} type="submit" className="w-full bg-slate-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-6 flex justify-center items-center gap-3">
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (
                <>
                  <LogIn size={16} strokeWidth={3} />
                  {authMode === 'login' ? 'Entrar no Sistema' : 'Enviar Cadastro'}
                </>
              )}
            </button>
          </form>

          <button className="w-full mt-8 text-slate-400 font-black uppercase italic text-[9px] tracking-widest hover:text-slate-950 transition-colors text-center" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Não tem conta? Solicite Acesso' : 'Já possui conta? Faça Login'}
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 opacity-20 text-center">
            <span className="text-[7px] font-black text-white uppercase tracking-[0.3em]">Secretaria de Música Regional Jundiaí</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;