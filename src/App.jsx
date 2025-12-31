import { useState, useEffect } from 'react'
import { 
  auth, db, doc, onSnapshot, setDoc, collection, query, orderBy, where,
  signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, sendEmailVerification 
} from './firebase'
import { LOCALIDADE_PADRAO } from './config'
import toast, { Toaster } from 'react-hot-toast'

import DashPage from './pages/DashPage'
import SettingsPage from './pages/SettingsPage'
import CounterPage from './pages/CounterPage'
import EventsPage from './pages/EventsPage' 

// DEFINIÇÃO DA HIERARQUIA DE ACESSOS (NÍVEL 2)
const CARGOS_ADMIN = [
  'Encarregado Regional', 
  'Encarregado Local', 
  'Instrutor', 
  'Secretário da Música', 
  'Examinadora'
];

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('loading');
  const [lobbyTab, setLobbyTab] = useState('ensaios');
  const [currentEventId, setCurrentEventId] = useState(null);
  const [counts, setCounts] = useState({});
  
  // Estados de Autenticação
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(''); 
  const [userComum, setUserComum] = useState('Ponte São João'); 
  const [authMode, setAuthMode] = useState('login');

  // Estados de Configuração e Notificação
  const [cargosDinamicos, setCargosDinamicos] = useState([]);
  const [pendentesCount, setPendentesCount] = useState(0);

  const isMaster = userData?.isMaster === true;
  // LOGICAisAdmin: Se for Master OU se o cargo estiver na lista de admins
  const isAdmin = isMaster || CARGOS_ADMIN.includes(userData?.role);
  
  const comumId = userData?.comumId || 'hsfjhZ3KNx7SsCM8EFpu';

  // 1. MONITOR DE CARGOS E NOTIFICAÇÕES MASTER
  useEffect(() => {
    const qCargos = query(collection(db, 'config_cargos'), orderBy('cargo', 'asc'));
    const unsubCargos = onSnapshot(qCargos, (s) => {
      const lista = s.docs.map(d => d.data().cargo);
      setCargosDinamicos(lista);
      if (lista.length > 0 && !userRole) setUserRole(lista[0]);
    });

    let unsubPendentes = () => {};
    if (isMaster) {
      const qPendentes = query(collection(db, 'users'), where('approved', '==', false));
      unsubPendentes = onSnapshot(qPendentes, (s) => {
        setPendentesCount(s.docs.length);
      });
    }

    return () => { unsubCargos(); unsubPendentes(); };
  }, [isMaster]);

  // 2. MONITOR DE AUTENTICAÇÃO E PORTARIA (ORDEM RÍGIDA)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        // A) Validar E-mail Primeiro
        if (!u.emailVerified) {
          setView('verify-email');
          return;
        }

        // B) Validar Firestore (Portaria)
        const unsubUserDoc = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Bloqueio Total
            if (data.disabled === true) {
              toast.error("Acesso bloqueado.");
              signOut(auth);
              return;
            }

            // Checagem de Aprovação
            if (data.approved === true || data.isMaster === true) {
              setUserData(data);
              setView('lobby'); 
            } else {
              setUserData(data);
              setView('waiting-approval'); 
            }
          } else {
            // Se o login existe mas o registro sumiu (Limbo)
            setView('login');
          }
        }, (error) => {
          console.log("Snapshot finalizado.");
        });

        return () => unsubUserDoc();
      } else {
        setUserData(null);
        setView('login');
      }
    });
    return () => unsubAuth();
  }, []);

  // 3. MONITOR DE CONTAGEM DO EVENTO
  useEffect(() => {
    if (view !== 'app' || !currentEventId) return;
    const eventDocRef = doc(db, 'comuns', comumId, 'events', currentEventId);
    return onSnapshot(eventDocRef, (s) => {
      if (s.exists()) setCounts(s.data().counts || {});
    });
  }, [view, currentEventId, comumId]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setView('verify-email');
          toast.error("Valide seu e-mail.");
        }
      } else {
        if (!userName.trim()) return toast.error("Informe seu nome");
        if (pass.length < 6) return toast.error("Mínimo 6 caracteres");
        
        // Garante que o cargo selecionado seja capturado
        const cargoFinal = userRole || (cargosDinamicos.length > 0 ? cargosDinamicos[0] : 'Músico');

        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(cred.user);

        await setDoc(doc(db, 'users', cred.user.uid), {
          email, 
          name: userName, 
          role: cargoFinal, 
          comum: userComum,
          approved: false, 
          disabled: false,
          isMaster: false,
          comumId: 'hsfjhZ3KNx7SsCM8EFpu',
          createdAt: Date.now()
        });
        
        setView('verify-email');
        toast.success("Verifique seu e-mail!");
      }
    } catch (err) { 
      toast.error(err.message); 
    }
  }

  // TELAS DE BLOQUEIO (Waiting Approval, Verify Email, Loading)
  if (view === 'waiting-approval') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans text-center text-gray-900">
      <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl border border-orange-100 animate-in zoom-in duration-300">
        <div className="text-5xl mb-6">⏳</div>
        <h2 className="text-xl font-black uppercase italic leading-tight">Aguardando Aprovação</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 mb-8 leading-relaxed italic">
          Olá, <span className="text-gray-900">{userData?.name}</span>! <br/>
          Seu cadastro como <span className="text-orange-600 font-bold">{userData?.role}</span> foi recebido. <br/>
          Aguarde a liberação pelo Master para acessar o painel.
        </p>
        <button onClick={() => signOut(auth)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Sair do Sistema</button>
      </div>
    </div>
  );

  if (view === 'verify-email') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-left font-sans text-gray-900">
      <div className="w-full max-w-sm bg-white p-8 rounded-[3rem] shadow-2xl border border-blue-100 text-center animate-in zoom-in duration-300">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-xl font-black uppercase italic leading-tight">Valide seu E-mail</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 mb-8 leading-relaxed italic">Link enviado para: <br/><span className="text-blue-600 font-bold not-italic">{user?.email}</span></p>
        <button onClick={() => auth.currentUser && sendEmailVerification(auth.currentUser).then(() => toast.success("Enviado!"))} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest shadow-lg mb-3">Reenviar Link</button>
        <button onClick={() => { signOut(auth); setView('login'); }} className="w-full py-4 text-gray-400 font-black uppercase italic text-[10px] tracking-widest">Voltar ao Login</button>
      </div>
    </div>
  );

  if (view === 'loading') return <div className="h-screen flex items-center justify-center bg-white font-black text-blue-900 uppercase italic tracking-widest text-xs animate-pulse italic">Sincronizando Portaria...</div>;

  if (view === 'login') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
      <Toaster position="top-center" />
      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10 text-gray-900">
          <div className="inline-block bg-blue-600 text-white p-4 rounded-[2rem] shadow-xl mb-4 text-2xl">🔢</div>
          <h1 className="text-4xl font-black italic uppercase leading-none">Contador</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 leading-none italic">Ministério Musical</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100">
          <h2 className="text-sm font-black text-gray-900 uppercase italic mb-6 border-b pb-4 text-center">{authMode === 'login' ? 'Acessar Conta' : 'Criar Nova Conta'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-4 italic">Nome Completo</label><input className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-gray-900 transition-all" type="text" placeholder="Nome Completo" onChange={e => setUserName(e.target.value)} required /></div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-4 italic">Ministério / Cargo</label>
                  <select className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-gray-900 transition-all appearance-none uppercase" value={userRole} onChange={e => setUserRole(e.target.value)}>
                    {cargosDinamicos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-4 italic">Comum</label><input className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-gray-900 transition-all" type="text" placeholder="Localidade" onChange={e => setUserComum(e.target.value)} required /></div>
              </>
            )}
            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-4 italic">E-mail</label><input className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-gray-900 transition-all" type="email" placeholder="seu@email.com" onChange={e => setEmail(e.target.value)} required /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-4 italic">Senha</label><input className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-gray-900 transition-all" type="password" placeholder="••••••••" onChange={e => setPass(e.target.value)} required /></div>
            <button className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase italic shadow-xl active:scale-95 transition-all mt-4 text-sm tracking-widest leading-none">{authMode === 'login' ? 'Entrar Agora' : 'Finalizar Cadastro'}</button>
          </form>
          <button className="w-full mt-8 text-blue-600 font-black uppercase italic text-[10px] tracking-widest hover:underline" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Cadastre-se' : 'Login'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-hidden text-left">
      <Toaster position="top-center" reverseOrder={false} />
      {view === 'lobby' ? (
        <>
          <header className="p-6 flex justify-between items-center bg-white border-b border-gray-100">
            <div className="leading-none text-gray-900">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 italic leading-none">Localidade Ativa</p>
              <h1 className="text-xl font-black uppercase italic leading-none">{userData?.comum || LOCALIDADE_PADRAO}</h1>
            </div>
            <button onClick={() => { signOut(auth); toast.success("Sessão encerrada!"); }} className="bg-red-50 text-red-600 px-5 py-2.5 rounded-full font-black text-[10px] uppercase italic border border-red-100">Sair</button>
          </header>
          
          <main className="flex-1 p-2 overflow-y-auto pb-28">
            {lobbyTab === 'ensaios' && <EventsPage userData={userData} isAdmin={isAdmin} onSelectEvent={(id) => { setCurrentEventId(id); setView('app'); }} />}
            {lobbyTab === 'dash' && <DashPage />} 
            {lobbyTab === 'config' && <SettingsPage userEmail={user?.email} isMaster={isMaster} userData={userData} />}
          </main>

          <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-black text-white rounded-[2.5rem] flex justify-around py-3 z-50 shadow-2xl border border-white/10">
            <button onClick={() => setLobbyTab('ensaios')} className={`flex flex-col items-center py-2 px-4 rounded-3xl transition-all ${lobbyTab === 'ensaios' ? 'bg-white text-black scale-105' : 'text-gray-400'}`}>
              <span className="text-[10px] font-black uppercase italic">Ensaios</span>
            </button>
            <button onClick={() => setLobbyTab('dash')} className={`flex flex-col items-center py-2 px-4 rounded-3xl transition-all ${lobbyTab === 'dash' ? 'bg-white text-black scale-105' : 'text-gray-400'}`}>
              <span className="text-[10px] font-black uppercase italic">Dash</span>
            </button>
            {/* BOTÃO AJUSTES: VISÍVEL APENAS PARA NÍVEL 1 (MASTER) */}
            {isMaster && (
              <button onClick={() => setLobbyTab('config')} className={`relative flex flex-col items-center py-2 px-4 rounded-3xl transition-all ${lobbyTab === 'config' ? 'bg-white text-black scale-105' : 'text-gray-400'}`}>
                {pendentesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-black animate-bounce">{pendentesCount}</span>
                )}
                <span className="text-[10px] font-black uppercase italic">Ajustes</span>
              </button>
            )}
          </nav>
        </>
      ) : (
        <CounterPage currentEventId={currentEventId} counts={counts} onBack={() => setView('lobby')} isAdmin={isAdmin} isMaster={isMaster} userData={userData} />
      )}
    </div>
  );
}

export default App;