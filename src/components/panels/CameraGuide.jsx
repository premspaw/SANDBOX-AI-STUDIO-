import { useState } from "react";

const CAMERAS = [
  { name: "ARRI Alexa 35", icon: "🎬", tag: "HOLLYWOOD · FEATURE FILMS · PRESTIGE TV", vibe: "Warm, organic, filmic. The gold standard.", bestFor: ["Feature Films", "Prestige Drama", "Music Videos", "High-end Docs"], social: "YouTube cinematic shorts, film festival submissions", avoid: "Not needed for casual social content" },
  { name: "Sony Venice 2", icon: "🎥", tag: "ANAMORPHIC · EPIC SCALE · COMMERCIAL", vibe: "Wide dynamic range, oval bokeh, horizontal flares.", bestFor: ["Anamorphic Films", "Fashion Films", "Commercials", "Sci-Fi"], social: "Brand films, high-end Instagram Reels", avoid: "Overkill for casual social content" },
  { name: "RED V-Raptor", icon: "🔴", tag: "HIGH RESOLUTION · VFX · SHARP DETAIL", vibe: "Razor sharp, clinical, ultra-detailed. 8K+.", bestFor: ["VFX Productions", "Action Films", "Tech Commercials", "High-res Stills"], social: "Product launches, tech brand films", avoid: "Too clinical for warm/emotional content" },
  { name: "IMAX 70mm", icon: "🏛️", tag: "EPIC BLOCKBUSTER · MASSIVE SCALE ONLY", vibe: "The biggest format possible. Overwhelming scale.", bestFor: ["Blockbusters", "Epic Landscapes", "Stadium Events", "IMAX Docs"], social: "❌ Not for social — designed for massive screens only", avoid: "Close-ups, portrait, social, vertical content" },
  { name: "iPhone 15 Pro", icon: "📱", tag: "UGC · SOCIAL MEDIA · VERTICAL · AUTHENTIC", vibe: "Candid, authentic, accessible. The UGC king.", bestFor: ["Instagram Reels", "TikTok", "YouTube Shorts", "BTS", "Vlogs"], social: "✅ BEST social camera — native 9:16, always available", avoid: "Epic cinema — use a real camera for that" },
  { name: "GoPro Hero 12", icon: "🏄", tag: "ACTION · POV · SPORT · UNDERWATER", vibe: "Ultra-wide, immersive, built for movement.", bestFor: ["Action Sports", "POV Shots", "Drone Mount", "Underwater", "Adventure"], social: "YouTube action, TikTok stunts, Instagram Stories", avoid: "Close-ups, portraits, beauty shots" },
  { name: "Blackmagic 6K", icon: "⚫", tag: "INDIE CINEMA · RAW · MUSIC VIDEOS · GRITTY", vibe: "Raw, gritty, maximum colour grading latitude.", bestFor: ["Indie Films", "Music Videos", "Short Films", "Art House", "Raw Docs"], social: "YouTube cinematic content, Vimeo film shorts", avoid: "Social-first content — too much post work needed" },
  { name: "Hasselblad X2D", icon: "💎", tag: "FASHION · LUXURY · PORTRAIT · PRODUCT", vibe: "Medium format luxury. Most detail. Most beautiful skin tones.", bestFor: ["Fashion Campaigns", "Luxury Brand Content", "Portraits", "Product Shoots"], social: "Instagram fashion grids, luxury brand editorial", avoid: "Action, POV, drone, vertical video — not made for it" },
];

const SCENE_TYPES = [
  {
    type: "FIGHT / ACTION", icon: "⚔️", color: "#CC4444",
    formula: "@A  [specific action verb]  @B,  [location],  [time],  [weather/light]",
    bad: "@Arjun fight with @Vikram",
    good: "@Arjun grabs @Vikram by the collar and slams him against a crumbling warehouse wall, both men exhausted and bleeding, flickering tube light above, midnight, industrial dockyard",
    badReason: "Too thin — no action verb, no location, no light",
    goodReason: "Specific verb + location + light + emotion + time",
    verbs: ["grabs collar of", "throws punch at", "slams against", "blocks strike from", "tackles", "shoves", "pins against wall"],
  },
  {
    type: "DIALOGUE / TENSION", icon: "💬", color: "#D4AF37",
    formula: "@A  [body language]  @B  across [surface],  [location],  [mood]",
    bad: "@Priya talking to @Arjun",
    good: "@Priya leans across a wooden table toward @Arjun, eyes locked, jaw set, candlelit roadside dhaba, late night, tension thick between them",
    badReason: "No body language, no location, no tension",
    goodReason: "Body language + surface + light + emotional atmosphere",
    verbs: ["leans toward", "stares down", "turns away from", "steps closer to", "whispers to", "faces across"],
  },
  {
    type: "CHASE / MOVEMENT", icon: "🏃", color: "#D4FF00",
    formula: "@A  sprints [direction] through [location],  @B [distance] behind,  [time]",
    bad: "@Vikram running away",
    good: "@Vikram sprints through a narrow rain-soaked alley in Chennai, @Arjun 20 feet behind, neon signs blurring past, midnight, both breathing hard",
    badReason: "No second character, no location detail, no atmosphere",
    goodReason: "Speed + direction + location + second character + atmosphere",
    verbs: ["sprints through", "dashes across", "weaves between", "vaults over", "slides under", "tears through"],
  },
  {
    type: "EMOTION / MOMENT", icon: "🎭", color: "#8a6aff",
    formula: "@A  [physical expression]  at [location],  [light condition]",
    bad: "@Priya is sad",
    good: "@Priya sits at the edge of a rooftop, knees to chest, staring at city lights below, eyes wet, golden hour fading to dusk, Mumbai skyline behind her",
    badReason: "Emotion word only — not visual, not filmable",
    goodReason: "Physical position + specific location + light + visual details",
    verbs: ["sits alone at", "stands at edge of", "collapses onto", "stares out at", "kneels beside", "leans against"],
  },
  {
    type: "REVEAL / DISCOVERY", icon: "👁️", color: "#4a9aff",
    formula: "@A  [action of discovery]  [what is revealed],  [reaction],  [light]",
    bad: "@Arjun finds the secret",
    good: "@Arjun pushes open a heavy iron door to reveal a vast underground chamber filled with evidence, frozen in shock, single shaft of light from above, dust particles falling",
    badReason: "No visual — what does he find? What does he do?",
    goodReason: "Action of discovery + what is revealed + physical reaction + light",
    verbs: ["pushes open to reveal", "stumbles upon", "freezes at sight of", "backs away from", "reaches out toward"],
  },
  {
    type: "PRODUCT / NO PEOPLE", icon: "📦", color: "#D4AF37",
    formula: "[Product]  on [surface],  [context objects],  [light source],  no people",
    bad: "Show the phone",
    good: "Matte black smartphone resting on aged concrete, surrounded by scattered film negatives, single overhead spotlight casting hard shadow, smoke drifting, dark studio background",
    badReason: "What phone? What surface? What light? What mood?",
    goodReason: "Product + surface + context objects + light source + atmosphere",
    verbs: ["resting on", "placed on", "floating above", "emerging from", "surrounded by", "balanced on"],
  },
];

const RULES = [
  { num: "01", title: "START WITH @CHARACTER", desc: "Always begin with @CharacterName — this pulls their locked face and costume from your library automatically.", color: "#D4FF00" },
  { num: "02", title: "VERB IS EVERYTHING", desc: "Don't say 'fight' — say 'grabs collar', 'throws punch', 'slams against wall'. Specific action = better image.", color: "#D4AF37" },
  { num: "03", title: "ADD A LOCATION", desc: "Not just 'street' — 'rain-soaked narrow alley, Mumbai, night'. Location = light + texture + atmosphere.", color: "#D4FF00" },
  { num: "04", title: "TIME / LIGHT CONDITION", desc: "Golden hour · Midnight · Overcast · Harsh noon. Light is the single biggest factor in cinematic quality.", color: "#D4AF37" },
  { num: "05", title: "ONE EMOTION WORD", desc: "End with: desperate · menacing · exhausted · triumphant. Sets the tone of the entire generated image.", color: "#D4FF00" },
];

const FORMULA = [
  { label: "YOU WRITE", content: "Scene description with @characters", color: "#D4FF00" },
  { label: "AUTO — CAMERA", content: "Shot on ARRI Alexa 35", color: "#D4AF37" },
  { label: "AUTO — ANGLE", content: "Low Angle shot", color: "#D4AF37" },
  { label: "AUTO — LENS", content: "18mm lens, f/8", color: "#D4AF37" },
  { label: "AUTO — COMPOSITION", content: "Rule of Thirds", color: "#D4AF37" },
  { label: "AUTO — STYLE", content: "LCU Style · Hyper Realistic · 2K", color: "#D4AF37" },
];

const COMPOSITIONS = [
  {
    name: "RULE OF THIRDS",
    icon: "⊞",
    color: "#D4FF00",
    tag: "UNIVERSAL · SAFE · ALWAYS WORKS",
    what: "Divide frame into 9 equal parts. Place subject at one of the 4 intersection points — never dead center.",
    bestFor: ["Portraits", "Landscapes", "Dialogue scenes", "Product shots", "Any scene when unsure"],
    avoid: "When you want to show power or authority — use Symmetry instead",
    sceneMatch: ["FIGHT / ACTION", "DIALOGUE / TENSION", "CHASE / MOVEMENT"],
    promptAdd: "rule of thirds composition, subject at left third intersection",
    visual: ["□□□","□●□","□□□"],
    tip: "Default choice. If in doubt — always use Rule of Thirds.",
  },
  {
    name: "SYMMETRY",
    icon: "⊟",
    color: "#D4AF37",
    tag: "POWER · AUTHORITY · WES ANDERSON",
    what: "Subject perfectly centered. Left and right sides mirror each other. Creates a sense of control, order, or unease.",
    bestFor: ["Villain reveals", "Authority figures", "Architecture shots", "Wes Anderson aesthetic", "Confrontation scenes"],
    avoid: "Action/chase — symmetry kills energy and movement",
    sceneMatch: ["REVEAL / DISCOVERY", "DIALOGUE / TENSION", "EMOTION / MOMENT"],
    promptAdd: "perfect bilateral symmetry, subject centered, mirrored environment",
    visual: ["□□□","□●□","□□□"],
    tip: "Use when character has power, control, or is being judged.",
  },
  {
    name: "LEADING LINES",
    icon: "⟋",
    color: "#4a9aff",
    tag: "DEPTH · MOVEMENT · DRAWS THE EYE",
    what: "Natural lines in the scene (road, corridor, railway, wall) converge toward the subject, pulling the viewer's eye through the frame.",
    bestFor: ["Chase scenes", "Hero walking toward camera", "Corridor/tunnel shots", "Road/railway scenes", "Character arriving"],
    avoid: "Closeups and face shots — no leading lines possible",
    sceneMatch: ["CHASE / MOVEMENT", "REVEAL / DISCOVERY", "EMOTION / MOMENT"],
    promptAdd: "strong leading lines converging toward subject, architectural lines drawing eye to character",
    visual: ["↘□↙","□●□","□□□"],
    tip: "Best when character is walking toward or away. Adds massive cinematic depth.",
  },
  {
    name: "GOLDEN RATIO",
    icon: "🌀",
    color: "#D4AF37",
    tag: "NATURAL · ORGANIC · ARTISTIC",
    what: "Fibonacci spiral composition. Subject placed at the tightest point of the spiral. Found in nature — feels instinctively beautiful.",
    bestFor: ["Portrait closeups", "Nature/organic scenes", "Emotional moments", "Art house films", "Beauty/fashion shots"],
    avoid: "Action scenes — too slow and delicate for high energy",
    sceneMatch: ["EMOTION / MOMENT", "PRODUCT / NO PEOPLE"],
    promptAdd: "golden ratio spiral composition, subject at phi point, organic framing",
    visual: ["□□□","□●□","□□□"],
    tip: "Use for quiet, beautiful, emotional moments. Feels natural not forced.",
  },
  {
    name: "FRAME IN FRAME",
    icon: "▣",
    color: "#8a6aff",
    tag: "DEPTH · MYSTERY · CINEMATIC",
    what: "An element in the scene (doorway, window, arch, tree branches) creates a natural frame around the subject inside the frame.",
    bestFor: ["Surveillance/watching scenes", "Character isolation", "Mystery reveals", "Intimate moments", "Character trapped feeling"],
    avoid: "Wide establishing shots — the inner frame needs to be visible",
    sceneMatch: ["REVEAL / DISCOVERY", "EMOTION / MOMENT", "DIALOGUE / TENSION"],
    promptAdd: "subject framed within environmental frame, doorway/arch/window creating natural border around subject",
    visual: ["███","█●█","███"],
    tip: "Instantly cinematic. Use when character feels watched, trapped, or isolated.",
  },
  {
    name: "NEGATIVE SPACE",
    icon: "◻",
    color: "#888888",
    tag: "ISOLATION · LONELINESS · MINIMALIST",
    what: "Subject occupies only 20-30% of frame. The empty space around them becomes the storytelling element — communicating isolation, loss, or scale.",
    bestFor: ["Grief/loss scenes", "Character alone vs world", "Epic scale shots", "Minimalist product shots", "Post-battle exhaustion"],
    avoid: "Two-character dialogue — negative space kills the connection",
    sceneMatch: ["EMOTION / MOMENT", "REVEAL / DISCOVERY", "PRODUCT / NO PEOPLE"],
    promptAdd: "dramatic negative space, subject occupies 20% of frame left side, vast empty environment",
    visual: ["□□□","●□□","□□□"],
    tip: "The emptiness IS the story. Best for loneliness, grief, or overwhelming scale.",
  },
  {
    name: "DIAGONAL",
    icon: "╱",
    color: "#CC4444",
    tag: "TENSION · ENERGY · INSTABILITY",
    what: "Subject or key elements placed along a diagonal axis across the frame. Creates visual tension, movement, and dynamic energy.",
    bestFor: ["Fight scenes", "Falling/stumbling", "Betrayal moments", "Dutch angle variation", "High energy action"],
    avoid: "Calm, peaceful, authoritative scenes — diagonal feels unstable",
    sceneMatch: ["FIGHT / ACTION", "CHASE / MOVEMENT"],
    promptAdd: "strong diagonal composition, subject on diagonal axis, dynamic diagonal framing",
    visual: ["●□□","□□□","□□●"],
    tip: "Adds instant tension and instability. Perfect for action and conflict.",
  },
  {
    name: "FOREGROUND DEPTH",
    icon: "◈",
    color: "#4a9aff",
    tag: "3D DEPTH · IMMERSIVE · LAYERED",
    what: "An object is placed extremely close to camera (blurred) while subject is in mid-ground. Creates three layers: foreground, subject, background.",
    bestFor: ["Surveillance/spy shots", "Hiding/watching scenes", "Establishing world shots", "War/combat scenes", "Character unaware of observer"],
    avoid: "Simple portraits or dialogue — too complex for conversation shots",
    sceneMatch: ["REVEAL / DISCOVERY", "FIGHT / ACTION", "CHASE / MOVEMENT"],
    promptAdd: "foreground element in extreme close blurred, subject sharp in mid-ground, deep background, three-layer depth",
    visual: ["▓□□","□●□","□□□"],
    tip: "Makes flat AI images feel genuinely 3D. Use grass, bars, glass, leaves in foreground.",
  },
  {
    name: "CENTERED / WES",
    icon: "◎",
    color: "#D4AF37",
    tag: "QUIRKY · STYLIZED · DEADPAN",
    what: "Subject dead center, perfectly flat, often with artificial-feeling symmetry. Associated with Wes Anderson's distinctive visual style.",
    bestFor: ["Comedy/quirky moments", "Character introduction shots", "Stylized/art house content", "Breaking fourth wall", "Deadpan reaction shots"],
    avoid: "Serious dramatic scenes — feels too self-aware",
    sceneMatch: ["EMOTION / MOMENT", "DIALOGUE / TENSION"],
    promptAdd: "Wes Anderson centered composition, subject perfectly centered, flat symmetrical framing, pastel tones",
    visual: ["□□□","□●□","□□□"],
    tip: "Instantly recognizable style. Use when you want the audience to notice the framing.",
  },
  {
    name: "TWO-POINT",
    icon: "◉◉",
    color: "#D4FF00",
    tag: "DIALOGUE · BALANCE · CONNECTION",
    what: "Two subjects placed at opposite third points of the frame, facing each other or looking in the same direction. Shows relationship and balance.",
    bestFor: ["Dialogue scenes", "Two-character confrontations", "Partnership/team shots", "Before and after reveals", "Relationship dynamics"],
    avoid: "Single character scenes — needs two subjects to work",
    sceneMatch: ["DIALOGUE / TENSION", "FIGHT / ACTION"],
    promptAdd: "two subjects at opposite third points, balanced two-point composition, subjects facing each other",
    visual: ["□□□","●□●","□□□"],
    tip: "Best for dialogue. Shows the relationship between two characters clearly.",
  },
];

const C = { 
  bg: "#09090b", 
  surface: "#18181b", 
  accent: "#e4e4e7", 
  muted: "#71717a", 
  gold: "#a1a1aa", 
  text: "#fafafa", 
  border: "rgba(255,255,255,0.06)",
  primary: "#D4FF00" 
};

export default function CameraGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("CAMERA");
  const [cam, setCam] = useState(0);
  const [scene, setScene] = useState(0);
  const [comp, setComp] = useState(0);

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(212,255,0,0.4)}50%{box-shadow:0 0 0 4px rgba(212,255,0,0)}}
        .sb:hover{background:rgba(255,255,255,0.03)!important;color:white!important}
        .xb:hover{background:rgba(255,255,255,0.08)!important;color:white!important}
        .guide-text { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .label-text { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#09090b}
        ::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:10px}
      `}</style>

      {/* Corner button - Reverted to Camera + Subtle Glow */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999}}>
        <button onClick={()=>setOpen(true)} style={{
          width:42,height:42,borderRadius:"12px",background:"rgba(24,24,27,0.9)",
          border:"1px solid rgba(212,255,0,0.3)",color:"#fff",fontSize:20,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)",
          boxShadow:"0 4px 12px rgba(0,0,0,0.5)",
          animation:"pulse 2s ease-in-out infinite",
          transition:"all 0.2s"
        }}>🎥</button>
      </div>

      {open && (
        <div onClick={e=>e.target===e.currentTarget&&setOpen(false)} style={{
          position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.9)",
          backdropFilter:"blur(16px)",display:"flex",alignItems:"center",
          justifyContent:"center",padding:window.innerWidth < 768 ? 8 : 16
        }}>
          <div className="guide-text" style={{
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,
            width:"100%",maxWidth:860,maxHeight:window.innerWidth < 768 ? "98vh" : "85vh",overflow:"hidden",
            display:"flex",flexDirection:"column",animation:"fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>

            {/* Header */}
            <div style={{
              padding:window.innerWidth < 768 ? "10px 12px" : "16px 24px",
              borderBottom:`1px solid ${C.border}`,
              background:C.bg,
              display:"flex",
              flexDirection: window.innerWidth < 768 ? "column" : "row",
              alignItems: window.innerWidth < 768 ? "flex-start" : "center",
              justifyContent:"space-between",
              gap: 12
            }}>
              <div style={{display:"flex",flexDirection: window.innerWidth < 768 ? "column" : "row", alignItems: window.innerWidth < 768 ? "flex-start" : "center", gap: window.innerWidth < 768 ? 12 : 24, width: "100%"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:18}}>📗</span>
                  <div>
                    <div className="label-text" style={{fontSize:11,fontWeight:800,color:"#FFF",letterSpacing:1.5}}>STUDIO COMPASS</div>
                    <div className="label-text" style={{fontSize:8,color:C.muted,letterSpacing:1,marginTop:2}}>CINEMATIC REFERENCE MANUAL</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4, overflowX: "auto", maxWidth: "100%", paddingBottom: 4}}>
                  {["CAMERA","SCENE WRITING","COMPOSITION"].map(t=>(
                    <button key={t} onClick={()=>setTab(t)} style={{
                      padding:"6px 14px",borderRadius:8,fontSize:10,
                      fontWeight:600,cursor:"pointer",
                      whiteSpace: "nowrap",
                      background:tab===t?"#fff":"transparent",
                      color:tab===t? "#000" : C.muted,
                      border:`1px solid ${tab===t?"#fff":"transparent"}`,transition:"all 0.2s"
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <button className="xb" onClick={()=>setOpen(false)} style={{
                position: window.innerWidth < 768 ? "absolute" : "static",
                top: 10, right: 10,
                background:"transparent",border:`1px solid transparent`,color:C.muted,
                width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:20,
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all 0.15s"
              }}>×</button>
            </div>

            {/* CAMERA TAB */}
            {tab==="CAMERA" && (
              <div style={{display:"flex",flexDirection: window.innerWidth < 768 ? "column" : "row", flex:1,overflow:"hidden"}}>
                <div style={{
                  width: window.innerWidth < 768 ? "100%" : 210,
                  height: window.innerWidth < 768 ? 80 : "auto",
                  borderRight: window.innerWidth < 768 ? "none" : `1px solid ${C.border}`,
                  overflowY: "auto",
                  background:C.bg,flexShrink:0,padding: "8px"
                }}>
                  {CAMERAS.map((c,i)=>(
                    <button key={i} className="sb" onClick={()=>setCam(i)} style={{
                      width: "100%",
                      padding: "8px 12px",
                      textAlign:"left",border:"none",
                      borderRadius: 8,
                      background:cam===i?"rgba(255,255,255,0.05)":"transparent",
                      cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s",
                      marginBottom: 2
                    }}>
                      <span style={{fontSize:14}}>{c.icon}</span>
                      <div style={{fontSize:11,fontWeight:500,color:cam===i?"#fff":C.muted}}>{c.name}</div>
                    </button>
                  ))}
                </div>
                <div style={{flex:1,overflowY:"auto",padding:32}}>
                  {(()=>{const c=CAMERAS[cam];return(
                    <div style={{maxWidth:600}}>
                      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
                        <span style={{fontSize:32}}>{c.icon}</span>
                        <div>
                          <div style={{fontSize:24,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>{c.name}</div>
                          <div className="label-text" style={{fontSize:9,color:C.primary,letterSpacing:2,marginTop:4,fontWeight:"bold"}}>{c.tag}</div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,margin:"24px 0"}}/>
                      
                      <div style={{marginBottom:24}}>
                        <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8,fontWeight:700}}>AESTHETIC VIBE</div>
                        <div style={{fontSize:15,color:"#e4e4e7",lineHeight:1.6}}>{c.vibe}</div>
                      </div>

                      <div style={{display:"grid", gridTemplateColumns: "1fr 1fr", gap: 24}}>
                        <div>
                          <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>BEST FOR</div>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {c.bestFor.map((b,j)=>(
                              <div key={j} style={{display:"flex",alignItems:"center",gap:8, fontSize:12, color:"#a1a1aa"}}>
                                <div style={{width:4, height:4, borderRadius:"50%", background:C.primary}}/>
                                {b}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                           <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>SOCIAL TARGET</div>
                           <div style={{fontSize:12, color:C.primary, lineHeight:1.5}}>{c.social}</div>
                        </div>
                      </div>

                      <div style={{marginTop:32, padding:20, borderRadius:12, background:"rgba(220, 38, 38, 0.05)", border:"1px solid rgba(220, 38, 38, 0.1)"}}>
                        <div className="label-text" style={{fontSize:10,color:"#ef4444",letterSpacing:1.5,marginBottom:8,fontWeight:700}}>USAGE WARNING / AVOID</div>
                        <div style={{fontSize:12,color:"#fca5a5",lineHeight:1.6}}>{c.avoid}</div>
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            )}

            {/* SCENE WRITING TAB */}
            {tab==="SCENE WRITING" && (
              <div style={{display:"flex",flexDirection: window.innerWidth < 768 ? "column" : "row", flex:1,overflow:"hidden"}}>
                <div style={{
                  width: window.innerWidth < 768 ? "100%" : 220,
                  borderRight: `1px solid ${C.border}`,
                  overflowY: "auto",
                  background:C.bg,flexShrink:0, padding: 12
                }}>
                  <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,paddingLeft:8,fontWeight:700}}>SCENE TYPES</div>
                  {SCENE_TYPES.map((s,i)=>(
                    <button key={i} className="sb" onClick={()=>setScene(i)} style={{
                      width:"100%",padding:"10px 12px",textAlign:"left",border:"none",
                      borderRadius: 8,
                      background:scene===i?"rgba(255,255,255,0.05)":"transparent",
                      cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:10,
                      marginBottom: 2
                    }}>
                      <span style={{fontSize:16}}>{s.icon}</span>
                      <div style={{fontSize:11,fontWeight:500,color:scene===i?"#fff":C.muted}}>{s.type}</div>
                    </button>
                  ))}
                  <div style={{height:1, background:C.border, margin: "16px 8px"}}/>
                  <div className="label-text" style={{fontSize:9,color:C.muted,letterSpacing:1.5,marginBottom:12,paddingLeft:8,fontWeight:700}}>QUICK FORMULA</div>
                   {FORMULA.slice(0,3).map((f,i)=>(
                    <div key={i} style={{padding:"0 8px", marginBottom:10}}>
                      <div className="label-text" style={{fontSize:7, color:C.muted, textTransform:"uppercase", marginBottom:3}}>{f.label}</div>
                      <div style={{fontSize:10, color:"#fff", fontWeight:500}}>{f.content}</div>
                    </div>
                  ))}
                </div>

                <div style={{flex:1,overflowY:"auto",padding:32}}>
                  {(()=>{const s=SCENE_TYPES[scene];return(
                    <div style={{maxWidth:600}}>
                      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
                        <span style={{fontSize:32}}>{s.icon}</span>
                        <div>
                          <div style={{fontSize:24,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>{s.type}</div>
                          <div className="label-text" style={{fontSize:9,color:s.color,letterSpacing:2,marginTop:4,fontWeight:700}}>NARRATIVE BLUEPRINT</div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,margin:"24px 0"}}/>

                      <div style={{marginBottom:24, padding:20, borderRadius:12, background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`}}>
                        <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>PROMPT STRUCTURE</div>
                        <div className="label-text" style={{fontSize:12,color:s.color,lineHeight:1.6}}>{s.formula}</div>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr",gap:16,marginBottom:32}}>
                        <div style={{background:"rgba(220, 38, 38, 0.05)",border:"1px solid rgba(220, 38, 38, 0.1)",borderRadius:12,padding:20}}>
                          <div className="label-text" style={{fontSize:10,color:"#ef4444",letterSpacing:1.5,marginBottom:12,fontWeight:700}}>❌ WEAK EXAMPLE</div>
                          <div style={{fontSize:13,color:"#fca5a5",lineHeight:1.6,marginBottom:12,fontStyle:"italic"}}>"{s.bad}"</div>
                          <div style={{fontSize:11,color:"rgba(252, 165, 165, 0.6)",lineHeight:1.5}}>{s.badReason}</div>
                        </div>
                        <div style={{background:"rgba(34, 197, 94, 0.05)",border:"1px solid rgba(34, 197, 94, 0.1)",borderRadius:12,padding:20}}>
                          <div className="label-text" style={{fontSize:10,color:"#22c55e",letterSpacing:1.5,marginBottom:12,fontWeight:700}}>✅ STRONG EXAMPLE</div>
                          <div style={{fontSize:12,color:"#86efac",lineHeight:1.7,marginBottom:12}}>"{s.good}"</div>
                          <div style={{fontSize:11,color:"rgba(134, 239, 172, 0.6)",lineHeight:1.5}}>{s.goodReason}</div>
                        </div>
                      </div>

                      <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>MASTER KEYWORDS</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8, marginBottom:40}}>
                        {s.verbs.map((v,i)=>(
                          <span key={i} style={{background:C.bg,border:`1px solid ${C.border}`,color:"#a1a1aa",borderRadius:8,padding:"6px 14px",fontSize:11}}>{v}</span>
                        ))}
                      </div>

                      <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:16,fontWeight:700}}>CORE DIRECTIVES</div>
                      <div style={{display:"grid", gridTemplateColumns: "1fr 1fr", gap:12}}>
                        {RULES.map((r,i)=>(
                          <div key={i} style={{display:"flex",gap:12,background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:16,alignItems:"flex-start"}}>
                            <div style={{fontSize:11,fontWeight:700,color:r.color}}>{r.num}</div>
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:"#fff",marginBottom:4}}>{r.title}</div>
                              <div style={{fontSize:10,color:C.muted,lineHeight:1.5}}>{r.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            )}

            {/* COMPOSITION TAB */}
            {tab==="COMPOSITION" && (
              <div style={{display:"flex",flexDirection: window.innerWidth < 768 ? "column" : "row", flex:1,overflow:"hidden"}}>
                <div style={{
                  width: window.innerWidth < 768 ? "100%" : 220,
                  borderRight: `1px solid ${C.border}`,
                  overflowY: "auto",
                  background:C.bg,flexShrink:0, padding: 12
                }}>
                  <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,paddingLeft:8,fontWeight:700}}>FRAMING STYLES</div>
                  {COMPOSITIONS.map((co,i)=>(
                    <button key={i} className="sb" onClick={()=>setComp(i)} style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign:"left",border:"none",
                      borderRadius: 8,
                      background:comp===i?"rgba(255,255,255,0.05)":"transparent",
                      cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:12,
                      marginBottom: 2
                    }}>
                      <span style={{fontSize:18,color:comp===i?co.color:C.muted}}>{co.icon}</span>
                      <div>
                        <div style={{fontSize:11,fontWeight:500,color:comp===i?"#fff":C.muted}}>{co.name}</div>
                        <div className="label-text" style={{fontSize:7,color:comp===i?co.color:C.muted,marginTop:2,letterSpacing:0.5,textTransform:"uppercase"}}>{co.tag.split("·")[0]}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{flex:1,overflowY:"auto",padding:32}}>
                  {(()=>{const co=COMPOSITIONS[comp];return(
                    <div style={{maxWidth:600}}>
                      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
                        <div style={{width:56,height:56,borderRadius:14,background:`rgba(255,255,255,0.03)`,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:co.color,flexShrink:0}}>{co.icon}</div>
                        <div>
                          <div style={{fontSize:24,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>{co.name}</div>
                          <div className="label-text" style={{fontSize:9,color:C.muted,letterSpacing:2,marginTop:4,fontWeight:700}}>{co.tag}</div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,margin:"24px 0"}}/>

                      <div style={{marginBottom:32}}>
                        <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8,fontWeight:700}}>DEFINITION</div>
                        <div style={{fontSize:16,color:"#e4e4e7",lineHeight:1.7}}>{co.what}</div>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr",gap:24,marginBottom:32}}>
                        <div>
                          <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>✅ BEST FOR</div>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {co.bestFor.map((b,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:8, fontSize:12, color:"#a1a1aa"}}>
                                <div style={{width:4, height:4, borderRadius:"50%", background:co.color}}/>
                                {b}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{background:"rgba(220, 38, 38, 0.05)",border:"1px solid rgba(220, 38, 38, 0.1)",borderRadius:12,padding:20}}>
                          <div className="label-text" style={{fontSize:10,color:"#ef4444",letterSpacing:1.5,marginBottom:8,fontWeight:700}}>❌ AVOID</div>
                          <div style={{fontSize:12,color:"#fca5a5",lineHeight:1.6}}>{co.avoid}</div>
                        </div>
                      </div>

                      <div style={{marginBottom:32, padding:24, borderRadius:12, background:"#0a0a0a", border:`1px solid ${C.border}`}}>
                        <div className="label-text" style={{fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>PROMPT SNIPPET</div>
                        <div style={{fontSize:13,color:co.color,lineHeight:1.6,fontStyle:"italic"}}>"{co.promptAdd}"</div>
                      </div>

                      <div style={{padding:20, borderRadius:12, background:`rgba(255,255,255,0.02)`, border:`1px solid ${C.border}`, display:"flex", gap:16, alignItems:"center"}}>
                        <span style={{fontSize:24}}>💡</span>
                        <div>
                          <div className="label-text" style={{fontSize:9,color:C.primary,letterSpacing:1.5,marginBottom:4,fontWeight:700}}>PRO TIP</div>
                          <div style={{fontSize:12,color:"#a1a1aa",lineHeight:1.6}}>{co.tip}</div>
                        </div>
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,background:C.bg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="label-text" style={{fontSize:8,color:C.muted,letterSpacing:2}}>EST. 2024 · CINEMATIC INTELLIGENCE UNIT</span>
              <span className="label-text" style={{fontSize:10,fontWeight:700,color:C.primary,letterSpacing:1}}>
                {tab==="CAMERA"?`${cam+1} / ${CAMERAS.length}`:tab==="SCENE WRITING"?`${scene+1} / ${SCENE_TYPES.length}`:`${comp+1} / ${COMPOSITIONS.length}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
