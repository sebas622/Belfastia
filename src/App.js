import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, getDoc, serverTimestamp, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAEc703mYd0aRl9CikYglHMh4gjFVgn_Uw",
  authDomain: "belfastia-20ed4.firebaseapp.com",
  projectId: "belfastia-20ed4",
  storageBucket: "belfastia-20ed4.firebasestorage.app",
  messagingSenderId: "633538239504",
  appId: "1:633538239504:web:fe44fc56ecec08dd217e95",
  measurementId: "G-BEK0YPE88J"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// ─── LOGO BASE64 ──────────────────────────────────────────────────────────────
const LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="5" width="24" height="52" fill="none" stroke="#2c2520" stroke-width="3.5"/>
  <rect x="2" y="5" width="16" height="16" fill="none" stroke="#2c2520" stroke-width="2.5"/>
  <rect x="2" y="27" width="16" height="16" fill="none" stroke="#2c2520" stroke-width="2.5"/>
  <rect x="2" y="49" width="10" height="8" fill="none" stroke="#2c2520" stroke-width="2.5"/>
  <polygon points="26,5 46,13 46,59 26,57" fill="none" stroke="#2c2520" stroke-width="3"/>
  <rect x="46" y="5" width="70" height="52" fill="none" stroke="#2c2520" stroke-width="3.5"/>
  <rect x="62" y="5" width="28" height="18" fill="none" stroke="#2c2520" stroke-width="2.5"/>
  <rect x="68" y="34" width="18" height="23" fill="none" stroke="#2c2520" stroke-width="2.5"/>
  <rect x="106" y="22" width="10" height="14" fill="none" stroke="#2c2520" stroke-width="2.5"/>
</svg>`)}`;

const LOGO_SVG_GOLD = `data:image/svg+xml,${encodeURIComponent(`<svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="5" width="24" height="52" fill="none" stroke="#c4a96a" stroke-width="3.5"/>
  <rect x="2" y="5" width="16" height="16" fill="none" stroke="#c4a96a" stroke-width="2.5"/>
  <rect x="2" y="27" width="16" height="16" fill="none" stroke="#c4a96a" stroke-width="2.5"/>
  <rect x="2" y="49" width="10" height="8" fill="none" stroke="#c4a96a" stroke-width="2.5"/>
  <polygon points="26,5 46,13 46,59 26,57" fill="none" stroke="#c4a96a" stroke-width="3"/>
  <rect x="46" y="5" width="70" height="52" fill="none" stroke="#c4a96a" stroke-width="3.5"/>
  <rect x="62" y="5" width="28" height="18" fill="none" stroke="#c4a96a" stroke-width="2.5"/>
  <rect x="68" y="34" width="18" height="23" fill="none" stroke="#c4a96a" stroke-width="2.5"/>
  <rect x="106" y="22" width="10" height="14" fill="none" stroke="#c4a96a" stroke-width="2.5"/>
</svg>`)}`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
const mdRender = (t) => (t || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

const CHAT_SYSTEM = (projectName, role) => `Sos ARQUAI, asistente técnico de BelfastIA para el proyecto "${projectName}".
Rol del usuario: ${role === "studio" ? "Estudio de Arquitectura" : "Empresa Constructora"}.
Respondé en español rioplatense, directo y profesional. Usá **negritas** para datos clave. Máximo 180 palabras.`;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body,#root{height:100%;overflow:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#c4b89a}
.bp-bg{position:fixed;inset:0;z-index:0;background-image:linear-gradient(rgba(160,140,100,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(160,140,100,0.055) 1px,transparent 1px);background-size:28px 28px;pointer-events:none}
.card{background:#faf7f0;border:1px solid #d8d0bc}
.msg-in{animation:mi .22s ease}
@keyframes mi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.tdot{display:inline-block;width:5px;height:5px;border-radius:50%;background:#8b7355;margin:0 2px;animation:td 1.2s ease infinite}
.tdot:nth-child(2){animation-delay:.2s}.tdot:nth-child(3){animation-delay:.4s}
@keyframes td{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
.ci{flex:1;padding:12px 14px;background:#faf7f0;border:1px solid #d4ccb8;border-right:none;color:#2c2520;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none}
.ci:focus{border-color:#8b7355}.ci::placeholder{color:#b0a48e}
.sb{padding:12px 18px;background:#2c2520;border:none;color:#f0ece3;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer}
.sb:active{background:#4a3a28}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:5px 2px;background:transparent;border:none;cursor:pointer;color:#b0a48e;font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:.5px;text-transform:uppercase;transition:color .15s}
.nav-btn.active{color:#2c2520}
.htab{padding:8px 12px;background:transparent;border:none;border-bottom:2px solid transparent;color:#9a8e7a;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:400;letter-spacing:2px;cursor:pointer;transition:all .15s;text-transform:uppercase;white-space:nowrap}
.htab.active{color:#2c2520;border-bottom-color:#8b7355}
.input-field{width:100%;padding:10px 12px;background:#faf7f0;border:1px solid #d8d0bc;color:#2c2520;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;margin-bottom:10px}
.input-field:focus{border-color:#8b7355}
.btn-primary{width:100%;padding:12px;background:#2c2520;border:none;color:#f0ece3;font-family:'Raleway',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;cursor:pointer;transition:background .2s}
.btn-primary:hover{background:#4a3a28}
.btn-secondary{width:100%;padding:10px;background:transparent;border:1px solid #d8d0bc;color:#6a5a48;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;margin-top:8px}
.upload-zone{border:1px dashed #c4b89a;padding:18px;text-align:center;cursor:pointer;transition:all .2s}
.upload-zone:hover{border-color:#8b7355;background:rgba(139,115,85,.04)}
.chat-msg{padding:12px 15px;border-bottom:1px solid #ede8dc;cursor:pointer;transition:background .12s}
.chat-msg:hover{background:rgba(0,0,0,.02)}
.notif-row{padding:11px 14px;border-bottom:1px solid #ede8dc}
.notif-row.unread{background:rgba(139,115,85,.05);border-left:3px solid #8b7355}
.tag{display:inline-block;padding:2px 8px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase}
.progress-track{height:3px;background:#e2ddd0;overflow:hidden}
.err{padding:9px 12px;background:rgba(139,58,42,.06);border:1px solid rgba(139,58,42,.2);font-family:'JetBrains Mono',monospace;font-size:10px;color:#8b3a2a;margin-top:8px}
`;

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("constructor");
  const [org, setOrg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) { setError("Completá email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      if (mode === "register") {
        if (!name || !org) { setError("Completá todos los campos"); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), { name, email, role, org, createdAt: serverTimestamp() });
        onAuth({ uid: cred.user.uid, name, email, role, org });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        if (snap.exists()) onAuth({ uid: cred.user.uid, ...snap.data() });
        else setError("Usuario no encontrado. Registrate primero.");
      }
    } catch (e) {
      const msgs = { "auth/user-not-found": "Email no registrado", "auth/wrong-password": "Contraseña incorrecta", "auth/email-already-in-use": "Email ya registrado", "auth/weak-password": "Contraseña muy corta (mín. 6 caracteres)", "auth/invalid-email": "Email inválido" };
      setError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f0ece3", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", fontFamily:"'Cormorant Garamond',serif" }}>
      <style>{CSS}</style>
      <div className="bp-bg"/>
      <div style={{ position:"relative", width:"100%", maxWidth:"380px" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <img src={LOGO_SVG} alt="Belfast" style={{ width:"110px", height:"auto", marginBottom:"12px" }}/>
          <div style={{ display:"flex", alignItems:"baseline", gap:"1px", justifyContent:"center" }}>
            <span style={{ fontFamily:"'Raleway',sans-serif", fontSize:"32px", fontWeight:800, color:"#1a1210", letterSpacing:"4px" }}>BELFAST</span>
            <span style={{ fontFamily:"'Raleway',sans-serif", fontSize:"32px", fontWeight:300, color:"#8b5e2a", letterSpacing:"2px" }}>IA</span>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", color:"#9a8e7a", letterSpacing:"3px", marginTop:"4px" }}>GESTIÓN COLABORATIVA DE OBRA</div>
        </div>

        <div className="card" style={{ padding:"24px" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"8px", color:"#9a8e7a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"18px" }}>
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </div>

          {mode === "register" && (
            <>
              <input className="input-field" placeholder="Tu nombre completo" value={name} onChange={e => setName(e.target.value)}/>
              <input className="input-field" placeholder="Nombre de tu empresa / estudio" value={org} onChange={e => setOrg(e.target.value)}/>
              <div style={{ marginBottom:"10px" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"8px", color:"#9a8e7a", letterSpacing:"1px", marginBottom:"6px" }}>ROL</div>
                <div style={{ display:"flex", gap:"8px" }}>
                  {[["studio","Estudio de Arq."],["constructor","Constructora"]].map(([r,l]) => (
                    <button key={r} onClick={() => setRole(r)} style={{ flex:1, padding:"8px", background: role===r?"#2c2520":"transparent", border:`1px solid ${role===r?"#2c2520":"#d8d0bc"}`, color: role===r?"#f0ece3":"#6a5a48", fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", cursor:"pointer", transition:"all .15s" }}>{l}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
          <input className="input-field" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSubmit()}/>

          {error && <div className="err">{error}</div>}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop:"12px", opacity: loading?0.7:1 }}>
            {loading ? "..." : mode === "login" ? "INGRESAR" : "REGISTRARSE"}
          </button>
          <button className="btn-secondary" onClick={() => { setMode(mode==="login"?"register":"login"); setError(""); }}>
            {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}
          </button>
        </div>

        <div style={{ textAlign:"center", marginTop:"14px", fontFamily:"'JetBrains Mono',monospace", fontSize:"8px", color:"#c4b89a" }}>
          Plataforma privada · Solo usuarios autorizados
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("chat");
  const [tab, setTab] = useState("chat");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages] = useState([]); // AI chat messages
  const [chatMsgs, setChatMsgs] = useState([]); // Real-time team chat
  const [notifications, setNotifications] = useState([]);
  const [input, setInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("belfast_key") || "");
  const [showApiInput, setShowApiInput] = useState(false);
  const [apiKeyTemp, setApiKeyTemp] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const chatEndRef = useRef(null);
  const teamChatEndRef = useRef(null);
  const fileRef = useRef(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setUser({ uid: u.uid, ...snap.data() });
        else setUser(null);
      } else setUser(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load projects
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "projects"), where("members", "array-contains", user.uid));
    const unsub = onSnapshot(q, snap => {
      const ps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjects(ps);
      if (ps.length > 0 && !selectedProject) setSelectedProject(ps[0]);
    });
    return unsub;
  }, [user]);

  // Load team chat for selected project
  useEffect(() => {
    if (!selectedProject) return;
    const q = query(collection(db, `projects/${selectedProject.id}/messages`), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setChatMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => teamChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [selectedProject]);

  // Load notifications
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/notifications`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Init AI chat
  useEffect(() => {
    if (!user || !selectedProject) return;
    setMessages([{ role: "ai", text: `Hola **${user.name}**. Soy ARQUAI, tu asistente para **${selectedProject.name}**.\n\n¿Qué necesitás saber?` }]);
  }, [user, selectedProject]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const isStudio = user?.role === "studio";
  const accentColor = isStudio ? "#4a6a8a" : "#8a5a3a";

  // Send AI message
  const sendAI = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput(""); setAiError(null);
    const userMsg = { role: "user", text: msg };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    if (!apiKey) {
      setTimeout(() => { setMessages(prev => [...prev, { role: "ai", text: "Configurá tu **API Key de Anthropic** tocando ⚙ en el header." }]); setIsTyping(false); }, 400);
      return;
    }
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: CHAT_SYSTEM(selectedProject?.name || "sin proyecto", user?.role), messages: history }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setMessages(prev => [...prev, { role: "ai", text: data.content?.map(b => b.text || "").join("") || "" }]);
    } catch (e) { setAiError("Error al conectar. Verificá tu API key."); }
    finally { setIsTyping(false); }
  };

  // Send team chat message
  const sendTeamMsg = async () => {
    if (!chatInput.trim() || !selectedProject) return;
    const msg = chatInput.trim();
    setChatInput("");
    await addDoc(collection(db, `projects/${selectedProject.id}/messages`), {
      text: msg, userId: user.uid, userName: user.name, userRole: user.role, userOrg: user.org, createdAt: serverTimestamp()
    });
    // Notify other members
    if (selectedProject.members) {
      for (const memberId of selectedProject.members) {
        if (memberId !== user.uid) {
          await addDoc(collection(db, `users/${memberId}/notifications`), {
            text: `${user.name} (${user.org}): "${msg.substring(0, 60)}${msg.length > 60 ? "..." : ""}"`, type: "chat", from: user.role, read: false, createdAt: serverTimestamp()
          });
        }
      }
    }
  };

  // Create project
  const createProject = async () => {
    const name = prompt("Nombre del proyecto:");
    if (!name) return;
    const docRef = await addDoc(collection(db, "projects"), {
      name, members: [user.uid], createdBy: user.uid, createdAt: serverTimestamp(),
      status: "En obra", progress: 0, budget: 0, phase: "Inicio"
    });
    setSelectedProject({ id: docRef.id, name, members: [user.uid], status: "En obra", progress: 0 });
  };

  // Handle file upload
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    const newDoc = { name: file.name, type: file.name.endsWith(".dwg") ? "plano" : file.name.endsWith(".xlsx") ? "presupuesto" : "informe", date: "ahora", size: `${(file.size/1024/1024).toFixed(1)} MB`, approved: false, isNew: true };
    setUploadedDocs(prev => [...prev, newDoc]);
    // Notify team
    if (selectedProject.members) {
      for (const memberId of selectedProject.members) {
        if (memberId !== user.uid) {
          await addDoc(collection(db, `users/${memberId}/notifications`), {
            text: `${user.name} subió un archivo: ${file.name}`, type: "document", from: user.role, read: false, createdAt: serverTimestamp()
          });
        }
      }
    }
    sendAI(`Subí el archivo "${file.name}". ¿Podés registrarlo y decirme qué tipo de documento es?`);
  };

  if (loading) return (
    <div style={{ height:"100vh", background:"#f0ece3", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{CSS}</style>
      <div className="bp-bg"/>
      <div style={{ textAlign:"center" }}>
        <img src={LOGO_SVG} alt="Belfast" style={{ width:"80px", marginBottom:"16px" }}/>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#9a8e7a", letterSpacing:"2px" }}>Cargando...</div>
      </div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={setUser}/>;

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#f0ece3", fontFamily:"'Cormorant Garamond',serif", overflow:"hidden" }}>
      <style>{CSS}</style>
      <div className="bp-bg"/>

      {/* HEADER */}
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px", height:"48px", background:"#2c2520", borderBottom:"1px solid #1a1510", position:"relative", zIndex:20, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <img src={LOGO_SVG_GOLD} alt="Belfast" style={{ height:"30px", width:"auto" }}/>
          <div style={{ display:"flex", alignItems:"baseline", gap:"1px" }}>
            <span style={{ fontFamily:"'Raleway',sans-serif", fontSize:"16px", fontWeight:800, color:"#fff", letterSpacing:"3px" }}>BELFAST</span>
            <span style={{ fontFamily:"'Raleway',sans-serif", fontSize:"16px", fontWeight:300, color:"#c4a96a", letterSpacing:"1px" }}>IA</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", padding:"2px 7px", background: isStudio?"rgba(74,106,138,.25)":"rgba(138,90,58,.25)", border:`1px solid ${isStudio?"rgba(74,106,138,.4)":"rgba(138,90,58,.4)"}`, color: isStudio?"#8ab4d8":"#c48a6a" }}>
            {user.org?.substring(0,12)}
          </span>
          <button onClick={() => setShowApiInput(v => !v)} style={{ background:"transparent", border:"1px solid rgba(196,169,106,.2)", color:"rgba(196,169,106,.5)", fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", padding:"3px 7px", cursor:"pointer" }}>
            {apiKey ? "⚙" : "⚙ KEY"}
          </button>
          <button onClick={() => signOut(auth).then(() => setUser(null))} style={{ background:"transparent", border:"1px solid rgba(196,169,106,.15)", color:"rgba(196,169,106,.4)", fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", padding:"3px 7px", cursor:"pointer" }}>✕</button>
        </div>
      </header>

      {/* API KEY INPUT */}
      {showApiInput && (
        <div style={{ padding:"8px 14px", background:"#2c2520", borderBottom:"1px solid #1a1510", display:"flex", gap:"8px", flexShrink:0, zIndex:19 }}>
          <input value={apiKeyTemp} onChange={e => setApiKeyTemp(e.target.value)} placeholder="sk-ant-api03-..." style={{ flex:1, padding:"6px 10px", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#f0ece3", fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", outline:"none" }}/>
          <button onClick={() => { if (apiKeyTemp.startsWith("sk-ant-")) { localStorage.setItem("belfast_key", apiKeyTemp); setApiKey(apiKeyTemp); setApiKeyTemp(""); setShowApiInput(false); }}} style={{ padding:"6px 12px", background:"#c4a96a", border:"none", color:"#2c2520", fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", cursor:"pointer", fontWeight:700 }}>OK</button>
        </div>
      )}

      {/* CONTENT */}
      <div style={{ flex:1, overflow:"hidden", position:"relative", zIndex:2, display:"flex", flexDirection:"column" }}>

        {/* Project selector */}
        <div style={{ padding:"8px 14px", background:"#f5f1e8", borderBottom:"1px solid #e2ddd0", display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", color:"#9a8e7a", letterSpacing:"1px" }}>PROYECTO</span>
          <select value={selectedProject?.id || ""} onChange={e => setSelectedProject(projects.find(p => p.id === e.target.value))} style={{ flex:1, padding:"4px 8px", background:"#faf7f0", border:"1px solid #d8d0bc", color:"#2c2520", fontFamily:"'Cormorant Garamond',serif", fontSize:"14px", outline:"none" }}>
            {projects.length === 0 && <option value="">Sin proyectos</option>}
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {isStudio && <button onClick={createProject} style={{ padding:"4px 10px", background:"transparent", border:"1px solid #8b7355", color:"#8b7355", fontFamily:"'JetBrains Mono',monospace", fontSize:"8px", cursor:"pointer", letterSpacing:"1px", whiteSpace:"nowrap" }}>+ NUEVO</button>}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #ddd6c4", background:"#f5f1e8", flexShrink:0, overflowX:"auto" }}>
          {[["chat","🤖 IA"],["team","💬 EQUIPO"],["docs","📋 DOCS"]].map(([t,l]) => (
            <button key={t} className={`htab ${tab===t?"active":""}`} onClick={() => setTab(t)}>{l}</button>
          ))}
        </div>

        {/* TAB: AI CHAT */}
        {tab === "chat" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:"12px", background:"#f5f2e8" }}>
              {messages.map((m,i) => (
                <div key={i} className="msg-in" style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user"?"flex-end":"flex-start" }}>
                  {m.role==="ai" && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", color:"#9a8e7a", marginBottom:"4px", letterSpacing:"2px" }}>ARQUAI</div>}
                  <div style={{ maxWidth:"90%", padding:"11px 14px", background: m.role==="user"?(isStudio?"rgba(74,106,138,.1)":"rgba(138,90,58,.1)"):"#faf7f0", border:`1px solid ${m.role==="user"?(isStudio?"rgba(74,106,138,.22)":"rgba(138,90,58,.22)"):"#d8d0bc"}`, fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", color:"#2c2520", lineHeight:"1.65" }}
                    dangerouslySetInnerHTML={{ __html: mdRender(m.text) }}/>
                </div>
              ))}
              {isTyping && (
                <div className="msg-in" style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", color:"#9a8e7a", marginBottom:"4px", letterSpacing:"2px" }}>ARQUAI</div>
                  <div style={{ padding:"11px 14px", background:"#faf7f0", border:"1px solid #d8d0bc" }}><span className="tdot"/><span className="tdot"/><span className="tdot"/></div>
                </div>
              )}
              {aiError && <div className="err">{aiError}</div>}
              <div ref={chatEndRef}/>
            </div>
            <div style={{ padding:"10px 12px", borderTop:"1px solid #d8d0bc", background:"#faf7f0", flexShrink:0 }}>
              <div style={{ display:"flex" }}>
                <input className="ci" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&!e.shiftKey&&sendAI()} placeholder="Preguntá sobre el proyecto…"/>
                <button className="sb" onClick={() => sendAI()}>Enviar</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TEAM CHAT */}
        {tab === "team" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {!selectedProject ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", color:"#9a8e7a", fontStyle:"italic" }}>Seleccioná un proyecto</div>
            ) : (
              <>
                <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>
                  {chatMsgs.length === 0 && (
                    <div style={{ textAlign:"center", padding:"30px 20px", fontFamily:"'Cormorant Garamond',serif", fontSize:"15px", color:"#9a8e7a", fontStyle:"italic" }}>
                      No hay mensajes aún. Iniciá la conversación con el equipo.
                    </div>
                  )}
                  {chatMsgs.map(m => (
                    <div key={m.id} className="msg-in" style={{ display:"flex", flexDirection:"column", alignItems: m.userId===user.uid?"flex-end":"flex-start" }}>
                      {m.userId !== user.uid && (
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", color: m.userRole==="studio"?"#4a6a8a":"#8a5a3a", marginBottom:"3px", letterSpacing:"1px" }}>
                          {m.userName} · {m.userOrg}
                        </div>
                      )}
                      <div style={{ maxWidth:"85%", padding:"10px 13px", background: m.userId===user.uid?(isStudio?"rgba(74,106,138,.12)":"rgba(138,90,58,.12)"):"#faf7f0", border:`1px solid ${m.userId===user.uid?(isStudio?"rgba(74,106,138,.25)":"rgba(138,90,58,.25)"):"#d8d0bc"}`, fontFamily:"'Cormorant Garamond',serif", fontSize:"15px", color:"#2c2520", lineHeight:"1.5" }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={teamChatEndRef}/>
                </div>
                <div style={{ padding:"10px 12px", borderTop:"1px solid #d8d0bc", background:"#faf7f0", flexShrink:0 }}>
                  <div style={{ display:"flex" }}>
                    <input className="ci" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&!e.shiftKey&&sendTeamMsg()} placeholder="Mensaje al equipo…"/>
                    <button className="sb" onClick={sendTeamMsg}>Enviar</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: DOCS */}
        {tab === "docs" && (
          <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pdf,.dwg,.xlsx,.docx" style={{ display:"none" }} onChange={handleUpload}/>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"17px", color:"#8b7355", marginBottom:"4px" }}>+ Subir documento</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", color:"#b0a48e" }}>PDF · DWG · XLSX · DOCX — La IA lo registra automáticamente</div>
            </div>
            {uploadedDocs.length === 0 && (
              <div style={{ textAlign:"center", padding:"20px", fontFamily:"'Cormorant Garamond',serif", fontSize:"15px", color:"#9a8e7a", fontStyle:"italic" }}>
                Subí planos, presupuestos e informes del proyecto
              </div>
            )}
            {uploadedDocs.map((d,i) => (
              <div key={i} className="card" style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"28px", height:"28px", background: d.type==="plano"?"rgba(74,106,138,.1)":d.type==="presupuesto"?"rgba(90,122,74,.1)":"rgba(138,90,58,.1)", border:"1px solid #ddd6c4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", flexShrink:0 }}>
                  {d.type==="plano"?"⊡":d.type==="presupuesto"?"⊞":"⊟"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"14px", color:"#8b7355", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.name}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"8px", color:"#b0a48e" }}>{d.size} · {d.date}</div>
                </div>
                <span className="tag" style={{ background:"rgba(139,106,42,.08)", border:"1px solid rgba(139,106,42,.25)", color:"#7a6a20", flexShrink:0 }}>Nuevo</span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <nav style={{ display:"flex", height:"54px", background:"#faf7f0", borderTop:"1px solid #d8d0bc", position:"relative", zIndex:20, flexShrink:0 }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,#d8d0bc,${accentColor}70,#d8d0bc)` }}/>
        {[
          { id:"chat", icon:"🤖", label:"IA" },
          { id:"team", icon:"💬", label:"Equipo" },
          { id:"docs", icon:"📋", label:"Docs" },
          { id:"notif", icon:"🔔", label: unreadNotifs>0?`(${unreadNotifs})`:"Avisos" },
        ].map(b => (
          <button key={b.id} className={`nav-btn ${tab===b.id?"active":""}`} onClick={() => {
            if (b.id === "notif") {
              setTab("notif");
            } else {
              setTab(b.id);
            }
          }} style={{ position:"relative" }}>
            {b.id==="notif" && unreadNotifs>0 && (
              <div style={{ position:"absolute", top:"4px", right:"calc(50% - 14px)", width:"14px", height:"14px", borderRadius:"50%", background:"#8b3a2a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:"7px", color:"#fff" }}>{unreadNotifs}</div>
            )}
            <span style={{ fontSize:"17px" }}>{b.icon}</span>
            {b.label}
          </button>
        ))}
      </nav>

      {/* NOTIFICATIONS OVERLAY */}
      {tab === "notif" && (
        <div style={{ position:"absolute", inset:0, zIndex:30, display:"flex", flexDirection:"column", background:"#f5f1e8" }}>
          <div style={{ padding:"12px 16px", background:"#faf7f0", borderBottom:"1px solid #d8d0bc", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", color:"#2c2520" }}>Notificaciones</div>
            <button onClick={() => setTab("chat")} style={{ background:"transparent", border:"1px solid #d8d0bc", color:"#9a8e7a", fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", padding:"4px 10px", cursor:"pointer" }}>CERRAR</button>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {notifications.length === 0 && (
              <div style={{ padding:"40px 20px", textAlign:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", color:"#9a8e7a", fontStyle:"italic" }}>Sin notificaciones</div>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`notif-row ${!n.read?"unread":""}`}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                  <span className="tag" style={{ background: n.from==="studio"?"rgba(74,106,138,.1)":"rgba(138,90,58,.1)", border:`1px solid ${n.from==="studio"?"rgba(74,106,138,.25)":"rgba(138,90,58,.25)"}`, color: n.from==="studio"?"#4a6a8a":"#8a5a3a" }}>
                    {n.from==="studio"?"Estudio":"Constructora"} · {n.type==="chat"?"Mensaje":"Documento"}
                  </span>
                </div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"14px", color: n.read?"#9a8e7a":"#2c2520", lineHeight:1.4 }}>{n.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
