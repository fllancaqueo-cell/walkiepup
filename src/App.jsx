import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import MapView from "./MapView";

const COMMISSION = 0.15;
const DURATIONS = [
  { label: "30 min",  minutes: 30,  price: 10 },
  { label: "1 hora",  minutes: 60,  price: 18 },
  { label: "2 horas", minutes: 120, price: 30 },
];
const DOG_SIZES = ["Pequeño 🐕", "Mediano 🐕‍🦺", "Grande 🦮"];

const PawIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <ellipse cx="6" cy="7" rx="2.2" ry="3"/>
    <ellipse cx="12" cy="5.5" rx="2.2" ry="3"/>
    <ellipse cx="18" cy="7" rx="2.2" ry="3"/>
    <ellipse cx="3.5" cy="12" rx="1.8" ry="2.5"/>
    <path d="M12 22c-3.5 0-7-2-8-5.5C3 13 5 11 7.5 11h9c2.5 0 4.5 2 3.5 5.5C19 20 15.5 22 12 22z"/>
  </svg>
);
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#F9A825">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

export default function DogWalkApp() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user);
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user);
      else { setUser(null); setProfile(null); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(u) {
    setUser(u);
    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
    setProfile(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={S.page}>
      <div style={S.centered}>
        <div style={S.pulse}><PawIcon size={40} color="#FF6B35" /></div>
        <p style={S.searchSub}>Cargando...</p>
      </div>
    </div>
  );

  if (!user)    return <AuthScreen screen={authScreen} setScreen={setAuthScreen} />;
  if (!profile) return <SelectRoleScreen user={user} onDone={loadProfile} />;

  const signOut = () => supabase.auth.signOut();

  if (profile.role === "owner")  return <OwnerApp  profile={profile} onSignOut={signOut} />;
  if (profile.role === "walker") return <WalkerApp profile={profile} onSignOut={signOut} />;
  if (profile.role === "admin")  return <AdminApp  profile={profile} onSignOut={signOut} />;
  return null;
}

// ── AUTH ───────────────────────────────────────────────────────────
function AuthScreen({ screen, setScreen }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email o contraseña incorrectos");
    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={S.authWrap}>
        <div style={S.landingBrand}>
          <PawIcon size={48} color="#FF6B35" />
          <h1 style={S.brandName}>WalkiePup</h1>
          <p style={S.brandSub}>Paseos seguros para tu mejor amigo</p>
        </div>
        <div style={S.authCard}>
          <h2 style={S.authTitle}>{screen === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="tu@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
          <label style={S.label}>Contraseña</label>
          <input style={S.input} type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p style={S.errorText}>{error}</p>}
          <button style={S.ctaBtn} onClick={screen === "login" ? handleLogin : handleRegister} disabled={loading}>
            {loading ? "Cargando..." : screen === "login" ? "Entrar" : "Registrarme"}
          </button>
          <button style={S.linkBtn} onClick={() => setScreen(screen === "login" ? "register" : "login")}>
            {screen === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SELECCIONAR ROL ────────────────────────────────────────────────
function SelectRoleScreen({ user, onDone }) {
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);

  async function selectRole(role) {
    if (!name.trim()) return alert("Por favor ingresa tu nombre");
    setLoading(true);
    await supabase.from("profiles").insert({ id: user.id, name, role });
    onDone(user);
  }

  return (
    <div style={S.page}>
      <div style={S.authWrap}>
        <div style={S.landingBrand}>
          <PawIcon size={48} color="#FF6B35" />
          <h1 style={S.brandName}>¡Bienvenido!</h1>
          <p style={S.brandSub}>Cuéntanos cómo te llamas y qué rol tendrás</p>
        </div>
        <div style={S.authCard}>
          <label style={S.label}>Tu nombre</label>
          <input style={S.input} placeholder="ej. María González"
            value={name} onChange={e => setName(e.target.value)} />
          <p style={{...S.label, marginTop:16}}>¿Cuál es tu rol?</p>
          <button style={{...S.roleCard,...S.roleCardOwner,marginBottom:10}} onClick={()=>selectRole("owner")} disabled={loading}>
            <span style={S.roleEmoji}>🏠</span>
            <div><span style={S.roleTitle}>Soy dueño</span><span style={S.roleDesc}>Pido paseos para mi perro</span></div>
          </button>
          <button style={{...S.roleCard,...S.roleCardWalker,marginBottom:10}} onClick={()=>selectRole("walker")} disabled={loading}>
            <span style={S.roleEmoji}>🦮</span>
            <div><span style={S.roleTitle}>Soy paseador</span><span style={S.roleDesc}>Acepto trabajos cercanos</span></div>
          </button>
          <button style={{...S.roleCard,...S.roleCardAdmin}} onClick={()=>selectRole("admin")} disabled={loading}>
            <span style={S.roleEmoji}>📊</span>
            <div><span style={S.roleTitle}>Admin</span><span style={S.roleDesc}>Panel de control</span></div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APP DUEÑO ──────────────────────────────────────────────────────
function OwnerApp({ profile, onSignOut }) {
  const [screen, setScreen]                     = useState("home");
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const [dogSize, setDogSize]                   = useState(DOG_SIZES[0]);
  const [dogName, setDogName]                   = useState("");
  const [customPrice, setCustomPrice]           = useState(DURATIONS[0].price);
  const [currentWalk, setCurrentWalk]           = useState(null);
  const [walkerProfile, setWalkerProfile]       = useState(null);
  const [walks, setWalks]                       = useState([]);
  const [walkerPos, setWalkerPos]               = useState({ lat: null, lng: null });
  const [ownerPos, setOwnerPos]                 = useState({ lat: null, lng: null });

  const commission  = (customPrice * COMMISSION).toFixed(2);
  const walkerEarns = (customPrice * (1 - COMMISSION)).toFixed(2);

  // Obtener ubicación del dueño al cargar
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setOwnerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  useEffect(() => { if (screen === "history") loadWalks(); }, [screen]);

  // Escuchar ubicación del paseador en tiempo real
  useEffect(() => {
    if (!currentWalk?.id) return;
    const ch = supabase.channel(`walk-pos-${currentWalk.id}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"walks", filter:`id=eq.${currentWalk.id}` },
        (payload) => {
          if (payload.new.walker_lat) setWalkerPos({ lat: payload.new.walker_lat, lng: payload.new.walker_lng });
          if (payload.new.status === "accepted" && payload.new.walker_id && screen === "searching") {
            supabase.from("profiles").select("*").eq("id", payload.new.walker_id).single()
              .then(({ data: wp }) => { setWalkerProfile(wp); setCurrentWalk(payload.new); setScreen("offer"); });
          }
          if (payload.new.status === "active") setScreen("active");
          if (payload.new.status === "completed") { loadWalks(); setScreen("history"); }
        })
      .subscribe();
    return () => ch.unsubscribe();
  }, [currentWalk, screen]);

  async function loadWalks() {
    const { data } = await supabase
      .from("walks")
      .select("*, dog:dogs(name), walker:profiles!walks_walker_id_fkey(name)")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false });
    setWalks(data || []);
  }

  async function handleRequestWalk() {
    setScreen("searching");
    const sizeMap = { "Pequeño 🐕":"small","Mediano 🐕‍🦺":"medium","Grande 🦮":"large" };
    let dogId;
    const { data: existingDog } = await supabase.from("dogs").select("id")
      .eq("owner_id", profile.id).eq("name", dogName || "Mi perro").single();
    if (existingDog) {
      dogId = existingDog.id;
    } else {
      const { data: newDog } = await supabase.from("dogs")
        .insert({ owner_id: profile.id, name: dogName || "Mi perro", size: sizeMap[dogSize] })
        .select().single();
      dogId = newDog?.id;
    }
    const { data: walk } = await supabase.from("walks").insert({
      owner_id: profile.id, dog_id: dogId,
      duration_minutes: selectedDuration.minutes,
      offered_price: customPrice, status: "pending",
    }).select().single();
    setCurrentWalk(walk);
  }

  if (screen === "home") return (
    <div style={S.page}><div style={S.appShell}>
      <header style={S.header}>
        <PawIcon size={22} color="#FF6B35" />
        <span style={S.headerTitle}>Hola, {profile.name.split(" ")[0]} 👋</span>
        <button style={S.iconBtn} onClick={()=>setScreen("history")}>📋</button>
        <button style={S.iconBtn} onClick={onSignOut}>🚪</button>
      </header>

      {/* Mapa real con ubicación del dueño */}
      <MapView ownerLat={ownerPos.lat} ownerLng={ownerPos.lng} height={220} />

      <div style={S.card}>
        <h2 style={S.sectionTitle}>¿A pasear? 🐶</h2>
        <label style={S.label}>Nombre del perro</label>
        <input style={S.input} placeholder="ej. Rocky" value={dogName} onChange={e=>setDogName(e.target.value)} />
        <label style={S.label}>Tamaño</label>
        <div style={S.chipRow}>
          {DOG_SIZES.map(s=>(
            <button key={s} style={dogSize===s?{...S.chip,...S.chipActive}:S.chip} onClick={()=>setDogSize(s)}>{s}</button>
          ))}
        </div>
        <label style={S.label}>Duración</label>
        <div style={S.chipRow}>
          {DURATIONS.map(d=>(
            <button key={d.label} style={selectedDuration.label===d.label?{...S.chip,...S.chipActive}:S.chip}
              onClick={()=>{setSelectedDuration(d);setCustomPrice(d.price);}}>
              {d.label} · ${d.price}
            </button>
          ))}
        </div>
        <label style={S.label}>Oferta al paseador (USD)</label>
        <div style={S.priceRow}>
          <button style={S.priceBtn} onClick={()=>setCustomPrice(p=>Math.max(5,p-1))}>−</button>
          <span style={S.priceDisplay}>${customPrice}</span>
          <button style={S.priceBtn} onClick={()=>setCustomPrice(p=>p+1)}>+</button>
        </div>
        <p style={S.hint}>Comisión plataforma: ${commission} · Paseador recibe: ${walkerEarns}</p>
        <button style={S.ctaBtn} onClick={handleRequestWalk}>
          <PawIcon size={18} color="#fff" /> Solicitar paseo
        </button>
      </div>
    </div></div>
  );

  if (screen === "searching") return (
    <div style={S.page}><div style={S.centered}>
      <div style={S.pulse}><PawIcon size={40} color="#FF6B35" /></div>
      <h2 style={S.searchTitle}>Buscando paseadores…</h2>
      <p style={S.searchSub}>Avisando a paseadores cercanos</p>
    </div></div>
  );

  if (screen === "offer") return (
    <div style={S.page}><div style={S.appShell}>
      <header style={S.header}>
        <button style={S.backBtn} onClick={()=>setScreen("home")}>←</button>
        <span style={S.headerTitle}>Paseador en camino 🎉</span>
      </header>
      <MapView ownerLat={ownerPos.lat} ownerLng={ownerPos.lng} walkerLat={walkerPos.lat} walkerLng={walkerPos.lng} height={220} />
      <div style={S.card}>
        <div style={S.walkerProfile}>
          <span style={{fontSize:48}}>🦮</span>
          <div>
            <h3 style={S.walkerName}>{walkerProfile?.name}</h3>
            <div style={S.ratingRow}><StarIcon /><span style={S.ratingText}>{walkerProfile?.rating ?? "5.0"} · {walkerProfile?.total_walks ?? 0} paseos</span></div>
          </div>
        </div>
        <div style={S.summaryBox}>
          <SummaryRow label="Perro"    value={dogName||"Mi perro"} />
          <SummaryRow label="Duración" value={selectedDuration.label} />
          <SummaryRow label="Tu pago"  value={`$${customPrice}`} bold />
        </div>
        <div style={S.infoBox}>⏳ Esperando que el paseador llegue e inicie el paseo…</div>
        <button style={S.outlineBtn} onClick={()=>setScreen("home")}>Cancelar</button>
      </div>
    </div></div>
  );

  if (screen === "active") return (
    <div style={S.page}><div style={S.appShell}>
      <header style={{...S.header,background:"#1a1a2e"}}>
        <PawIcon size={22} color="#FF6B35" />
        <span style={{...S.headerTitle,color:"#fff"}}>Paseo en curso 🐾</span>
      </header>
      {/* Mapa con ubicación del paseador en tiempo real */}
      <MapView ownerLat={ownerPos.lat} ownerLng={ownerPos.lng} walkerLat={walkerPos.lat} walkerLng={walkerPos.lng} height={280} />
      <div style={S.card}>
        <div style={S.walkerProfile}>
          <span style={{fontSize:40}}>🦮</span>
          <div>
            <b style={{color:"#1a1a2e",fontSize:16}}>{walkerProfile?.name}</b>
            <p style={{margin:0,color:"#888",fontSize:13}}>Paseando a {dogName||"tu perro"}</p>
            {walkerPos.lat && <p style={{margin:0,color:"#43A047",fontSize:12}}>📍 Ubicación en tiempo real activa</p>}
          </div>
        </div>
        <div style={S.infoBox}>🐾 El paseador finalizará el paseo cuando termine.</div>
        <button style={S.outlineBtn} onClick={()=>setScreen("history")}>Ver mis paseos</button>
      </div>
    </div></div>
  );

  if (screen === "history") return (
    <div style={S.page}><div style={S.appShell}>
      <header style={S.header}>
        <button style={S.backBtn} onClick={()=>setScreen("home")}>←</button>
        <span style={S.headerTitle}>Mis paseos</span>
      </header>
      <div style={S.listWrap}>
        {walks.length===0 && <p style={{textAlign:"center",color:"#aaa",padding:32}}>Aún no tienes paseos</p>}
        {walks.map(w=>(
          <div key={w.id} style={S.historyItem}>
            <div style={S.historyLeft}>
              <PawIcon size={20} color="#FF6B35" />
              <div>
                <b style={{color:"#1a1a2e"}}>{w.dog?.name||"Perro"}</b>
                <p style={S.histSub}>{w.walker?.name||"Sin asignar"} · {w.duration_minutes} min</p>
              </div>
            </div>
            <div style={S.historyRight}>
              <span style={S.histPrice}>${w.offered_price}</span>
              <span style={{...S.statusBadge,
                background:w.status==="completed"?"#e8f5e9":w.status==="active"?"#fff3e0":"#f5f5f5",
                color:w.status==="completed"?"#43A047":w.status==="active"?"#FF6B35":"#aaa"}}>
                {w.status==="completed"?"✅ listo":w.status==="active"?"🐾 activo":w.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div></div>
  );
}

// ── APP PASEADOR ───────────────────────────────────────────────────
function WalkerApp({ profile, onSignOut }) {
  const [walks, setWalks]           = useState([]);
  const [myWalks, setMyWalks]       = useState([]);
  const [tab, setTab]               = useState("available");
  const [activeWalk, setActiveWalk] = useState(null);
  const [timer, setTimer]           = useState(0);
  const [walkerPos, setWalkerPos]   = useState({ lat: null, lng: null });
  const geoWatchRef                 = useRef(null);

  // Timer
  useEffect(() => {
    let iv;
    if (activeWalk) iv = setInterval(() => setTimer(t => t + 1), 1000);
    else setTimer(0);
    return () => clearInterval(iv);
  }, [activeWalk]);

  // GPS — enviar ubicación a Supabase cada 5 segundos cuando hay paseo activo
  useEffect(() => {
    if (!activeWalk) {
      if (geoWatchRef.current) navigator.geolocation.clearWatch(geoWatchRef.current);
      return;
    }
    geoWatchRef.current = navigator.geolocation.watchPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setWalkerPos({ lat, lng });
      await supabase.from("walks").update({
        walker_lat: lat, walker_lng: lng,
        walker_last_seen: new Date().toISOString()
      }).eq("id", activeWalk.id);
    }, null, { enableHighAccuracy: true, maximumAge: 5000 });

    return () => { if (geoWatchRef.current) navigator.geolocation.clearWatch(geoWatchRef.current); };
  }, [activeWalk]);

  useEffect(() => {
    loadAvailable(); loadMyWalks();
    const ch = supabase.channel("pending-walks")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"walks"},()=>loadAvailable())
      .subscribe();
    return () => ch.unsubscribe();
  }, []);

  async function loadAvailable() {
    const { data } = await supabase.from("walks")
      .select("*, owner:profiles!walks_owner_id_fkey(name), dog:dogs(name,size)")
      .eq("status","pending").order("created_at",{ascending:false});
    setWalks(data||[]);
  }

  async function loadMyWalks() {
    const { data } = await supabase.from("walks")
      .select("*, dog:dogs(name), owner:profiles!walks_owner_id_fkey(name)")
      .eq("walker_id",profile.id).order("created_at",{ascending:false});
    setMyWalks(data||[]);
    const active = data?.find(w => w.status === "active");
    if (active) setActiveWalk(active);
  }

  async function acceptWalk(walk) {
    const { error } = await supabase.from("walks")
      .update({walker_id:profile.id,status:"accepted"})
      .eq("id",walk.id).eq("status","pending");
    if (error) return alert("Este paseo ya fue tomado");
    loadAvailable(); loadMyWalks(); setTab("mine");
  }

  async function startWalk(walk) {
    // Pedir permiso de GPS al iniciar
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      setWalkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const { data } = await supabase.from("walks")
        .update({ status:"active", started_at: new Date().toISOString(),
          walker_lat: pos.coords.latitude, walker_lng: pos.coords.longitude })
        .eq("id", walk.id).select().single();
      setActiveWalk(data);
      loadMyWalks();
    }, () => {
      // Si no hay GPS igual inicia
      supabase.from("walks").update({ status:"active", started_at: new Date().toISOString() })
        .eq("id", walk.id).select().single()
        .then(({ data }) => { setActiveWalk(data); loadMyWalks(); });
    });
  }

  async function finishWalk(walkId) {
    await supabase.rpc("complete_walk", { walk_id: walkId });
    setActiveWalk(null);
    loadMyWalks(); setTab("mine");
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const earned = myWalks.filter(w=>w.status==="completed")
    .reduce((s,w)=>s+(w.walker_earnings||0),0).toFixed(2);

  return (
    <div style={S.page}><div style={S.appShell}>
      <header style={S.header}>
        <PawIcon size={22} color="#FF6B35" />
        <span style={S.headerTitle}>Hola, {profile.name.split(" ")[0]} 🦮</span>
        <span style={S.earningsBadge}>💰 ${earned}</span>
        <button style={S.iconBtn} onClick={onSignOut}>🚪</button>
      </header>

      {/* Banner paseo activo con mapa */}
      {activeWalk && (
        <div style={S.activeWalkBanner}>
          <div style={S.activeWalkTop}>
            <span style={{fontSize:28}}>🐕</span>
            <div style={{flex:1}}>
              <b style={{color:"#fff"}}>Paseando a {activeWalk.dog?.name||"perro"}</b>
              <p style={{margin:0,color:"rgba(255,255,255,.7)",fontSize:12}}>
                {walkerPos.lat ? "📍 GPS activo" : "⏳ Obteniendo GPS..."}
              </p>
            </div>
            <div style={S.timerBadge}>{fmt(timer)}</div>
          </div>
          {/* Mapa del paseador */}
          <div style={{borderRadius:12,overflow:"hidden",marginTop:12}}>
            <MapView walkerLat={walkerPos.lat} walkerLng={walkerPos.lng} height={180} />
          </div>
          <button style={{...S.ctaBtn,background:"#e53935",marginTop:10}}
            onClick={()=>finishWalk(activeWalk.id)}>
            🏁 Finalizar paseo
          </button>
        </div>
      )}

      <div style={S.tabRow}>
        <button style={tab==="available"?{...S.tab,...S.tabActive}:S.tab} onClick={()=>setTab("available")}>
          Disponibles {walks.length>0&&<span style={S.badge}>{walks.length}</span>}
        </button>
        <button style={tab==="mine"?{...S.tab,...S.tabActive}:S.tab} onClick={()=>setTab("mine")}>
          Mis paseos
        </button>
      </div>

      <div style={S.listWrap}>
        {tab==="available" && (walks.length===0
          ? <p style={{textAlign:"center",color:"#aaa",padding:32}}>No hay paseos disponibles</p>
          : walks.map(w=>(
            <div key={w.id} style={S.jobCard}>
              <div style={S.jobTop}>
                <span style={{fontSize:32}}>🐕</span>
                <div style={{flex:1}}>
                  <b style={{color:"#1a1a2e",fontSize:15}}>{w.dog?.name||"Perro"}</b>
                  <p style={S.histSub}>{w.dog?.size} · {w.duration_minutes} min</p>
                  <p style={{margin:0,color:"#888",fontSize:12}}>Dueño: {w.owner?.name}</p>
                </div>
                <div style={S.jobPrice}>
                  <span style={S.bigPrice}>${(w.offered_price*(1-COMMISSION)).toFixed(0)}</span>
                  <span style={{fontSize:11,color:"#aaa"}}>tú recibes</span>
                </div>
              </div>
              <button style={{...S.ctaBtn,marginTop:10}} onClick={()=>acceptWalk(w)}>Aceptar trabajo</button>
            </div>
          ))
        )}
        {tab==="mine" && (myWalks.length===0
          ? <p style={{textAlign:"center",color:"#aaa",padding:32}}>Aún no has tomado paseos</p>
          : myWalks.map(w=>(
            <div key={w.id} style={S.jobCard}>
              <div style={S.jobTop}>
                <span style={{fontSize:32}}>🐕</span>
                <div style={{flex:1}}>
                  <b style={{color:"#1a1a2e",fontSize:15}}>{w.dog?.name||"Perro"} · {w.duration_minutes} min</b>
                  <p style={S.histSub}>Dueño: {w.owner?.name}</p>
                  <p style={{margin:0,color:"#43A047",fontSize:13,fontWeight:700}}>
                    Ganas: ${(w.offered_price*(1-COMMISSION)).toFixed(0)}
                  </p>
                </div>
                <span style={{...S.statusBadge,
                  background:w.status==="completed"?"#e8f5e9":w.status==="active"?"#fff3e0":w.status==="accepted"?"#e3f2fd":"#f5f5f5",
                  color:w.status==="completed"?"#43A047":w.status==="active"?"#FF6B35":w.status==="accepted"?"#1E88E5":"#aaa"}}>
                  {w.status==="completed"?"✅ listo":w.status==="active"?"🐾 activo":w.status==="accepted"?"📍 aceptado":w.status}
                </span>
              </div>
              {w.status === "accepted" && !activeWalk && (
                <button style={{...S.ctaBtn,background:"#43A047",marginTop:10}} onClick={()=>startWalk(w)}>
                  ▶️ Iniciar paseo
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div></div>
  );
}

// ── APP ADMIN ──────────────────────────────────────────────────────
function AdminApp({ profile, onSignOut }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(()=>{ loadTransactions(); },[]);

  async function loadTransactions() {
    const { data } = await supabase.from("transactions")
      .select("*, walk:walks(duration_minutes), owner:profiles!transactions_owner_id_fkey(name), walker:profiles!transactions_walker_id_fkey(name)")
      .order("created_at",{ascending:false});
    setTransactions(data||[]);
  }

  const totalCommission = transactions.reduce((s,t)=>s+t.commission,0).toFixed(2);
  const totalVolume     = transactions.reduce((s,t)=>s+t.total_amount,0).toFixed(2);

  return (
    <div style={S.page}><div style={S.appShell}>
      <header style={{...S.header,background:"#1a1a2e"}}>
        <PawIcon size={22} color="#FF6B35" />
        <span style={{...S.headerTitle,color:"#fff"}}>Panel Admin</span>
        <button style={{...S.iconBtn,color:"#aaa"}} onClick={onSignOut}>🚪</button>
      </header>
      <div style={S.statsGrid}>
        <StatCard icon="💰" label="Mis comisiones" value={`$${totalCommission}`} color="#FF6B35" />
        <StatCard icon="📦" label="Volumen total"  value={`$${totalVolume}`}     color="#43A047" />
        <StatCard icon="🐾" label="Paseos"         value={transactions.length}   color="#1E88E5" />
        <StatCard icon="%" label="Comisión"         value="15%"                  color="#8E24AA" />
      </div>
      <div style={S.listWrap}>
        <h3 style={{...S.sectionTitle,padding:"0 16px"}}>Transacciones</h3>
        {transactions.length===0&&<p style={{textAlign:"center",color:"#aaa",padding:32}}>Sin transacciones aún</p>}
        {transactions.map(t=>(
          <div key={t.id} style={S.historyItem}>
            <div style={S.historyLeft}>
              <PawIcon size={18} color="#FF6B35" />
              <div>
                <b style={{color:"#1a1a2e",fontSize:13}}>{t.owner?.name} → {t.walker?.name}</b>
                <p style={S.histSub}>{t.walk?.duration_minutes} min · ${t.total_amount}</p>
              </div>
            </div>
            <div style={S.historyRight}>
              <span style={{...S.histPrice,color:"#FF6B35"}}>+${t.commission.toFixed(2)}</span>
              <span style={S.histDate}>comisión</span>
            </div>
          </div>
        ))}
      </div>
    </div></div>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <div style={S.summaryRow}>
      <span style={S.summaryLabel}>{label}</span>
      <span style={bold?S.summaryValueBold:S.summaryValue}>{value}</span>
    </div>
  );
}
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{...S.statCard,borderTopColor:color}}>
      <span style={{fontSize:28}}>{icon}</span>
      <span style={{...S.statValue,color}}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

const S = {
  page:            { minHeight:"100vh", background:"#f5f0eb", fontFamily:"'Nunito','Helvetica Neue',sans-serif", display:"flex", justifyContent:"center" },
  appShell:        { width:"100%", maxWidth:420, display:"flex", flexDirection:"column", minHeight:"100vh", background:"#fff" },
  header:          { display:"flex", alignItems:"center", gap:8, padding:"14px 16px", background:"#fff", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", position:"sticky", top:0, zIndex:10 },
  headerTitle:     { flex:1, fontWeight:800, fontSize:17, color:"#1a1a2e" },
  backBtn:         { background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#FF6B35", fontWeight:700, padding:"0 4px" },
  iconBtn:         { background:"none", border:"none", fontSize:20, cursor:"pointer" },
  earningsBadge:   { background:"#FF6B35", color:"#fff", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:700 },
  authWrap:        { width:"100%", maxWidth:420, padding:"48px 24px 32px", display:"flex", flexDirection:"column", gap:24 },
  authCard:        { background:"#fff", borderRadius:20, padding:"24px", boxShadow:"0 4px 20px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column" },
  authTitle:       { fontWeight:900, fontSize:22, color:"#1a1a2e", margin:"0 0 16px" },
  errorText:       { color:"#e53935", fontSize:13, margin:"8px 0" },
  linkBtn:         { background:"none", border:"none", color:"#FF6B35", fontSize:14, fontWeight:700, cursor:"pointer", marginTop:12, textAlign:"center" },
  landingBrand:    { textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  brandName:       { margin:0, fontSize:36, fontWeight:900, color:"#1a1a2e", letterSpacing:-1 },
  brandSub:        { margin:0, color:"#888", fontSize:15 },
  roleCard:        { display:"flex", alignItems:"center", gap:14, padding:"16px 20px", borderRadius:18, border:"2px solid transparent", cursor:"pointer", textAlign:"left", width:"100%", boxSizing:"border-box" },
  roleCardOwner:   { background:"#fff5f0", borderColor:"#FF6B35" },
  roleCardWalker:  { background:"#f0f9f0", borderColor:"#43A047" },
  roleCardAdmin:   { background:"#f0f4ff", borderColor:"#1E88E5" },
  roleEmoji:       { fontSize:32 },
  roleTitle:       { fontWeight:800, color:"#1a1a2e", fontSize:16, display:"block" },
  roleDesc:        { fontSize:12, color:"#888", display:"block", marginTop:2 },
  card:            { background:"#fff", padding:"20px 16px 24px", flex:1 },
  sectionTitle:    { fontWeight:800, fontSize:18, color:"#1a1a2e", margin:"0 0 14px" },
  label:           { display:"block", fontWeight:700, fontSize:13, color:"#444", margin:"12px 0 6px" },
  input:           { width:"100%", padding:"10px 14px", border:"2px solid #e0d8d0", borderRadius:12, fontSize:15, fontFamily:"inherit", boxSizing:"border-box", outline:"none" },
  chipRow:         { display:"flex", flexWrap:"wrap", gap:8 },
  chip:            { padding:"8px 14px", borderRadius:20, border:"2px solid #e0d8d0", background:"#faf8f5", fontSize:13, fontWeight:700, cursor:"pointer", color:"#555" },
  chipActive:      { background:"#FF6B35", borderColor:"#FF6B35", color:"#fff" },
  priceRow:        { display:"flex", alignItems:"center", gap:16, margin:"8px 0" },
  priceBtn:        { width:38, height:38, borderRadius:12, border:"2px solid #e0d8d0", background:"#faf8f5", fontSize:20, cursor:"pointer", fontWeight:700, color:"#FF6B35" },
  priceDisplay:    { fontSize:28, fontWeight:900, color:"#1a1a2e" },
  hint:            { fontSize:12, color:"#aaa", margin:"0 0 16px" },
  ctaBtn:          { width:"100%", padding:"15px", background:"#FF6B35", color:"#fff", border:"none", borderRadius:16, fontWeight:800, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 },
  outlineBtn:      { width:"100%", padding:"13px", background:"transparent", color:"#FF6B35", border:"2px solid #FF6B35", borderRadius:16, fontWeight:700, fontSize:15, cursor:"pointer", marginTop:8 },
  infoBox:         { background:"#fff8f0", border:"1px solid #FFD0B5", borderRadius:12, padding:"14px 16px", color:"#FF6B35", fontSize:14, fontWeight:600, textAlign:"center", margin:"12px 0" },
  centered:        { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:16 },
  pulse:           { padding:20, background:"#fff5f0", borderRadius:50 },
  searchTitle:     { fontWeight:900, fontSize:22, color:"#1a1a2e", margin:0 },
  searchSub:       { color:"#888", margin:0, fontSize:15 },
  walkerProfile:   { display:"flex", alignItems:"center", gap:16, margin:"16px 0" },
  walkerName:      { margin:"0 0 4px", fontSize:20, fontWeight:800, color:"#1a1a2e" },
  ratingRow:       { display:"flex", alignItems:"center", gap:4 },
  ratingText:      { fontSize:13, color:"#666" },
  summaryBox:      { background:"#f9f6f3", borderRadius:14, padding:"14px 16px", margin:"12px 0" },
  summaryRow:      { display:"flex", justifyContent:"space-between", padding:"5px 0" },
  summaryLabel:    { color:"#888", fontSize:14 },
  summaryValue:    { color:"#333", fontSize:14, fontWeight:600 },
  summaryValueBold:{ color:"#FF6B35", fontSize:16, fontWeight:800 },
  activeWalkBanner:{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", padding:"16px" },
  activeWalkTop:   { display:"flex", alignItems:"center", gap:12 },
  timerBadge:      { background:"#FF6B35", color:"#fff", borderRadius:12, padding:"6px 14px", fontWeight:900, fontSize:20 },
  tabRow:          { display:"flex", borderBottom:"2px solid #f0ebe6" },
  tab:             { flex:1, padding:"12px", background:"none", border:"none", fontWeight:700, fontSize:14, color:"#aaa", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
  tabActive:       { color:"#FF6B35", borderBottom:"2px solid #FF6B35" },
  badge:           { background:"#FF6B35", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11 },
  listWrap:        { flex:1, overflowY:"auto", paddingBottom:24 },
  historyItem:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #f0ebe6" },
  historyLeft:     { display:"flex", alignItems:"center", gap:12 },
  historyRight:    { textAlign:"right" },
  histPrice:       { fontWeight:800, color:"#1a1a2e", fontSize:16, display:"block" },
  histDate:        { color:"#aaa", fontSize:12 },
  histSub:         { margin:"2px 0 0", fontSize:12, color:"#aaa" },
  statusBadge:     { fontSize:11, padding:"3px 10px", borderRadius:10, fontWeight:700, whiteSpace:"nowrap" },
  jobCard:         { padding:"16px", borderBottom:"1px solid #f0ebe6" },
  jobTop:          { display:"flex", alignItems:"center", gap:12 },
  jobPrice:        { textAlign:"right" },
  bigPrice:        { display:"block", fontSize:22, fontWeight:900, color:"#43A047" },
  statsGrid:       { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, padding:"16px" },
  statCard:        { background:"#fff", borderRadius:16, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.07)", borderTop:"4px solid", display:"flex", flexDirection:"column", gap:4 },
  statValue:       { fontSize:26, fontWeight:900 },
  statLabel:       { fontSize:12, color:"#888" },
};
