import { useEffect, useRef, useState, useCallback } from "react";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kfpcl.deliveryapp";
const APP_ICON = "/images/image-logo.png";
const INTERVAL = 1000;

const steps = [
  { id: 1,  image: "/app-screens/home.jpeg",         emoji: "🏠", title: "Open kfpcl",   desc: "Launch the app — see deals, Summer Offer & fresh products." },
  { id: 2,  image: "/app-screens/categories.jpeg",   emoji: "📦", title: "Browse Categories",   desc: "Fruits, Dairy, Masalas, Electronics & more — all in one place." },
  { id: 3,  image: "/app-screens/allproducts.jpeg",  emoji: "🛍️", title: "All Products",        desc: "Explore hundreds of fresh products across every category." },
  { id: 4,  image: "/app-screens/products.jpeg",     emoji: "🥦", title: "Fresh Items",         desc: "Farm-fresh vegetables & fruits with discounts up to 27% OFF." },
  { id: 5,  image: "/app-screens/products1.jpeg",    emoji: "🥛", title: "Dairy & More",        desc: "Milk, curd, paneer and more from trusted local brands." },
  { id: 6,  image: "/app-screens/wallet.jpeg",       emoji: "💳", title: "Pay with Wallet",     desc: "Add money once, pay instantly on every order." },
  { id: 7,  image: "/app-screens/trending.jpeg",     emoji: "🔥", title: "Trending Deals",      desc: "Shop the hottest products — updated daily just for you." },
  { id: 8,  image: "/app-screens/orderagain.jpeg",   emoji: "🔁", title: "Reorder Favourites",  desc: "One tap to reorder your favourite past items." },
  { id: 9,  image: "/app-screens/ordersdetails.jpeg",emoji: "📋", title: "Order Details",       desc: "Track your order in real-time from store to your door." },
  { id: 10, image: "/app-screens/notifications.jpeg",emoji: "🔔", title: "Stay Notified",       desc: "Instant alerts for order confirmed, dispatched & delivered." },
  { id: 11, image: "/app-screens/profile.jpeg",      emoji: "👤", title: "My Account",          desc: "Manage orders, wishlist, wallet & addresses — one tab." },
  { id: 12, image: "/app-screens/profile1.jpeg",     emoji: "⚙️", title: "Account Settings",    desc: "Notifications, help, share app & general information." },
  { id: 13, image: "/app-screens/address.jpeg",      emoji: "📍", title: "Saved Addresses",     desc: "Save multiple delivery addresses and switch anytime." },
  { id: 14, image: "/app-screens/whichlist.jpeg",    emoji: "❤️", title: "My Wishlist",         desc: "Save items you love and move them to cart in one tap." },
];

const css = `
@keyframes abFloat {
  0%,100% { transform:translateY(0px);    }
  50%      { transform:translateY(-10px); }
}
@keyframes abPulse {
  0%   { transform:translate(-50%,-50%) scale(.82); opacity:.55; }
  100% { transform:translate(-50%,-50%) scale(1.75); opacity:0;  }
}
@keyframes abFadeIn {
  from { opacity:0; transform:translateY(8px) scale(.97); }
  to   { opacity:1; transform:translateY(0)   scale(1);   }
}
@keyframes abBlob1 { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
@keyframes abBlob2 { 0%,100%{border-radius:40% 60% 60% 40%/60% 30% 70% 40%} 50%{border-radius:60% 40% 30% 60%/40% 60% 40% 60%} }

.ab-float      { animation: abFloat 3.8s ease-in-out infinite; }
.ab-float:hover{ animation-play-state:paused; }
.ab-slide      { animation: abFadeIn .3s ease forwards; }
.ab-cta:hover  { transform:translateY(-3px)!important; box-shadow:0 14px 44px rgba(0,0,0,.5)!important; }
.ab-btn:hover  { background:rgba(255,255,255,.16)!important; }
.ab-dot        { transition:all .25s ease; cursor:pointer; border:none; padding:0; }
`;

export function AppShowcase() {
  const [active,    setActive]    = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [animating, setAnimating] = useState(false);
  const [dir,       setDir]       = useState<1|-1>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number, direction: 1 | -1 = 1) => {
    if (animating) return;
    setDir(direction);
    setAnimating(true);
    setTimeout(() => { setActive(next); setAnimating(false); }, 280);
  }, [animating]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setDir(1);
      setAnimating(true);
      setTimeout(() => {
        setActive(p => (p + 1) % steps.length);
        setAnimating(false);
      }, 280);
    }, INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused]);

  const step = steps[active];
  const pct  = ((active + 1) / steps.length) * 100;

  return (
    <>
      <style>{css}</style>
      <section style={{
        position:"relative", overflow:"hidden",
        background:"linear-gradient(135deg,#050d18 0%,#0A1628 45%,#071019 100%)",
        padding:"80px 24px 90px",
      }}>
        {/* Blobs */}
        <div style={{ position:"absolute", top:-130, left:-90, width:480, height:480,
          background:"radial-gradient(circle,rgba(30,90,250,.12) 0%,transparent 65%)",
          animation:"abBlob1 12s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-90, right:-80, width:420, height:420,
          background:"radial-gradient(circle,rgba(212,168,83,.10) 0%,transparent 65%)",
          animation:"abBlob2 15s ease-in-out infinite", pointerEvents:"none" }} />
        {/* Dot grid */}
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"radial-gradient(rgba(255,255,255,.035) 1px,transparent 1px)",
          backgroundSize:"28px 28px", pointerEvents:"none" }} />

        <div style={{ maxWidth:1120, margin:"0 auto", position:"relative", zIndex:1 }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8,
              background:"rgba(30,90,250,.14)", border:"1px solid rgba(30,90,250,.30)",
              color:"#7BA4FC", borderRadius:30, padding:"6px 18px",
              fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:16 }}>
              <span style={{ width:7, height:7, borderRadius:"50%",
                background:"#D4A853", boxShadow:"0 0 8px #D4A853", display:"inline-block" }} />
              LIVE ON GOOGLE PLAY
            </span>
            <p style={{ color:"rgba(255,255,255,.7)", fontSize:18, maxWidth:480, margin:"0 auto" }}>
              See how kfpcl works — step by step inside the app.
            </p>
          </div>

          {/* Two-column */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            gap:"clamp(32px,6vw,80px)", flexWrap:"wrap" }}>

            {/* ── PHONE ── */}
            <div style={{ flexShrink:0 }}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}>

              <div style={{ position:"relative", width:272 }}>
                {/* Pulse ring */}
                <div style={{ position:"absolute", top:"50%", left:"50%",
                  width:190, height:190, borderRadius:"50%",
                  background:"rgba(30,90,250,.18)",
                  animation:"abPulse 2.4s ease-out infinite",
                  pointerEvents:"none", zIndex:0 }} />

                <div className="ab-float" style={{ position:"relative", zIndex:1 }}>
                  {/* Phone shell */}
                  <div style={{
                    width:272, height:574,
                    background:"linear-gradient(170deg,#1c1c1e 0%,#2a2a2c 50%,#141414 100%)",
                    borderRadius:54, padding:11,
                    boxShadow:`
                      0 0 0 1px rgba(255,255,255,.09),
                      0 50px 120px rgba(0,0,0,.8),
                      0 20px 40px rgba(0,0,0,.5),
                      inset 0 1px 0 rgba(255,255,255,.15),
                      inset 0 -2px 0 rgba(0,0,0,.6),
                      -8px 0 28px rgba(30,90,250,.07),
                       8px 0 28px rgba(212,168,83,.07)`,
                    position:"relative",
                  }}>
                    {/* Side buttons */}
                    <div style={{ position:"absolute", right:-3, top:126, width:3, height:68,
                      background:"#252527", borderRadius:"0 3px 3px 0" }} />
                    {[96, 146, 202].map((top, i) => (
                      <div key={top} style={{ position:"absolute", left:-3, top,
                        width:3, height:i===2?68:36,
                        background:"#252527", borderRadius:"3px 0 0 3px" }} />
                    ))}

                    {/* Screen */}
                    <div style={{ width:"100%", height:"100%", borderRadius:44,
                      overflow:"hidden", background:"#000", position:"relative" }}>

                      {/* Dynamic Island */}
                      <div style={{ position:"absolute", top:13, left:"50%",
                        transform:"translateX(-50%)", width:108, height:32,
                        background:"#000", borderRadius:20, zIndex:30,
                        boxShadow:"0 0 0 2px #1c1c1e" }} />

                      {/* Screenshot */}
                      <img
                        key={active}
                        src={step.image}
                        alt={step.title}
                        style={{
                          position:"absolute", inset:0,
                          width:"100%", height:"100%",
                          objectFit:"cover", objectPosition:"top",
                          zIndex:2,
                          opacity: animating ? 0 : 1,
                          transform: animating
                            ? `scale(.95) translateX(${dir * 20}px)`
                            : "scale(1) translateX(0)",
                          transition:"opacity .28s ease, transform .28s ease",
                        }}
                      />

                      {/* Step badge */}
                      <div style={{ position:"absolute", bottom:14, right:14,
                        background:"rgba(0,0,0,.6)", backdropFilter:"blur(10px)",
                        border:"1px solid rgba(255,255,255,.1)", color:"#fff",
                        borderRadius:20, padding:"3px 10px",
                        fontSize:11, fontWeight:700, zIndex:20 }}>
                        {active + 1} / {steps.length}
                      </div>

                      {/* Glass shine */}
                      <div style={{ position:"absolute", inset:0, zIndex:25, pointerEvents:"none",
                        background:"linear-gradient(135deg,rgba(255,255,255,.06) 0%,transparent 55%)" }} />
                    </div>
                  </div>

                  {/* Drop shadow */}
                  <div style={{ width:"60%", height:22, margin:"3px auto 0",
                    background:"radial-gradient(ellipse,rgba(0,0,0,.6) 0%,transparent 70%)",
                    filter:"blur(10px)" }} />
                </div>
              </div>
            </div>

            {/* ── INFO PANEL ── */}
            <div style={{ flex:1, minWidth:290, maxWidth:440 }}>

              {/* App identity */}
              <div style={{ display:"flex", alignItems:"center", gap:14,
                background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)",
                borderRadius:20, padding:"14px 18px", marginBottom:22,
                backdropFilter:"blur(12px)" }}>
                <img src={APP_ICON} alt="kfpcl"
                  style={{ width:52, height:52, borderRadius:14, flexShrink:0, objectFit:"cover", background:"#fff", border:"1px solid rgba(255,255,255,.15)" }}
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                <div style={{ flex:1 }}>
                  <p style={{ color:"#fff", fontWeight:800, fontSize:16, margin:"0 0 3px" }}>kfpcl</p>
                  <p style={{ color:"rgba(255,255,255,.4)", fontSize:12, margin:0 }}>Grocery delivery · Hyderabad</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#D4A853", fontSize:13 }}>★★★★★</div>
                  <div style={{ color:"rgba(255,255,255,.35)", fontSize:11, marginTop:2 }}>4.8 rating</div>
                </div>
              </div>

              {/* Step info */}
              <div key={active} className="ab-slide" style={{
                background:"rgba(255,255,255,.06)", border:"1px solid rgba(30,90,250,.22)",
                borderRadius:20, padding:"22px 20px", marginBottom:20,
                backdropFilter:"blur(12px)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:13,
                    background:"linear-gradient(135deg,#0A1628,#1E5AFA)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:22, boxShadow:"0 4px 18px rgba(30,90,250,.35)", flexShrink:0 }}>
                    {step.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:1,
                      color:"#D4A853", textTransform:"uppercase", marginBottom:2 }}>
                      Step {active + 1} of {steps.length}
                    </div>
                    <div style={{ color:"#fff", fontWeight:800, fontSize:19, lineHeight:1.2 }}>
                      {step.title}
                    </div>
                  </div>
                </div>
                <p style={{ color:"rgba(255,255,255,.55)", fontSize:14, lineHeight:1.75, margin:0 }}>
                  {step.desc}
                </p>
              </div>

              {/* Progress bar */}
              <div style={{ height:3, background:"rgba(255,255,255,.1)",
                borderRadius:2, marginBottom:14, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`,
                  background:"linear-gradient(90deg,#1E5AFA,#D4A853)",
                  borderRadius:2, transition:`width ${INTERVAL * 0.9}ms linear` }} />
              </div>

              {/* Dots */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:20 }}>
                {steps.map((s, i) => (
                  <button key={s.id} className="ab-dot" onClick={() => go(i, i > active ? 1 : -1)}
                    title={s.title}
                    style={{
                      width: i===active ? 24 : 8, height:8, borderRadius:4,
                      background: i===active
                        ? "linear-gradient(90deg,#1E5AFA,#D4A853)"
                        : i < active ? "rgba(30,90,250,.35)" : "rgba(255,255,255,.12)",
                    }} />
                ))}
              </div>

              {/* Controls */}
              <div style={{ display:"flex", gap:10, marginBottom:28 }}>
                <button className="ab-btn"
                  onClick={() => go((active - 1 + steps.length) % steps.length, -1)}
                  style={{ width:46, height:46, borderRadius:"50%",
                    background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)",
                    color:"#fff", cursor:"pointer", fontSize:24,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"background .2s" }}>‹</button>

                <button onClick={() => setPaused(p => !p)} style={{
                  flex:1, height:46, borderRadius:23, cursor:"pointer",
                  background: paused
                    ? "linear-gradient(90deg,#1E5AFA,#1548D4)"
                    : "rgba(255,255,255,.08)",
                  border: paused ? "none" : "1px solid rgba(255,255,255,.1)",
                  color:"#fff", fontWeight:700, fontSize:14,
                  transition:"all .2s", letterSpacing:.5 }}>
                  {paused ? "▶  Play" : "⏸  Pause"}
                </button>

                <button className="ab-btn"
                  onClick={() => go((active + 1) % steps.length, 1)}
                  style={{ width:46, height:46, borderRadius:"50%",
                    background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)",
                    color:"#fff", cursor:"pointer", fontSize:24,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"background .2s" }}>›</button>
              </div>

              {/* Play Store CTA */}
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                className="ab-cta"
                style={{ display:"flex", alignItems:"center", gap:16, background:"#fff",
                  borderRadius:18, padding:"15px 24px", textDecoration:"none",
                  boxShadow:"0 8px 36px rgba(0,0,0,.45)",
                  transition:"all .25s ease", width:"100%", boxSizing:"border-box" }}>
                {/* Google Play icon */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M3.18 23.76c.3.17.64.24.98.2l12.67-11.55L13.4 9.1 3.18 23.76z" fill="#EA4335"/>
                  <path d="M22.47 10.46l-2.99-1.73-3.73 3.4 3.73 3.4 3.02-1.74a1.72 1.72 0 000-3.33z" fill="#FBBC04"/>
                  <path d="M3.18.24A1.72 1.72 0 002 1.86v20.28c0 .63.34 1.2.88 1.52l.3.16 11.37-11.37v-.28L3.18.24z" fill="#4285F4"/>
                  <path d="M4.16 23.96l12.67-11.55-3.43-3.43L2.18 21.6a1.72 1.72 0 001.98 2.36z" fill="#34A853"/>
                </svg>
                <div>
                  <div style={{ fontSize:10, color:"#888", fontWeight:600, letterSpacing:.5 }}>GET IT ON</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#111", lineHeight:1.1 }}>Google Play</div>
                </div>
                <div style={{ marginLeft:"auto", color:"#1E5AFA", fontSize:22, fontWeight:700 }}>→</div>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap",
            marginTop:68, borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:40 }}>
            {[
              { v:"Fast",   l:"Delivery"      },
              { v:"500+",   l:"Products"      },
              { v:"4.8 ★",  l:"App Rating"    },
              { v:"Free",   l:"Download"      },
            ].map((s, i, arr) => (
              <div key={s.l} style={{ textAlign:"center", padding:"0 36px",
                borderRight: i < arr.length-1 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
                <div style={{ fontSize:"clamp(20px,3.2vw,32px)", fontWeight:900,
                  background:"linear-gradient(90deg,#1E5AFA,#D4A853)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  {s.v}
                </div>
                <div style={{ color:"rgba(255,255,255,.35)", fontSize:12, marginTop:4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
