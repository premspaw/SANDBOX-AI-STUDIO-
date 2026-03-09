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
    type: "CHASE / MOVEMENT", icon: "🏃", color: "#84CC16",
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
  { num: "01", title: "START WITH @CHARACTER", desc: "Always begin with @CharacterName — this pulls their locked face and costume from your library automatically.", color: "#84CC16" },
  { num: "02", title: "VERB IS EVERYTHING", desc: "Don't say 'fight' — say 'grabs collar', 'throws punch', 'slams against wall'. Specific action = better image.", color: "#D4AF37" },
  { num: "03", title: "ADD A LOCATION", desc: "Not just 'street' — 'rain-soaked narrow alley, Mumbai, night'. Location = light + texture + atmosphere.", color: "#84CC16" },
  { num: "04", title: "TIME / LIGHT CONDITION", desc: "Golden hour · Midnight · Overcast · Harsh noon. Light is the single biggest factor in cinematic quality.", color: "#D4AF37" },
  { num: "05", title: "ONE EMOTION WORD", desc: "End with: desperate · menacing · exhausted · triumphant. Sets the tone of the entire generated image.", color: "#84CC16" },
];

const FORMULA = [
  { label: "YOU WRITE", content: "Scene description with @characters", color: "#84CC16" },
  { label: "AUTO — CAMERA", content: "Shot on ARRI Alexa 35", color: "#D4AF37" },
  { label: "AUTO — ANGLE", content: "Low Angle shot", color: "#D4AF37" },
  { label: "AUTO — LENS", content: "18mm lens, f/8", color: "#D4AF37" },
  { label: "AUTO — COMPOSITION", content: "Rule of Thirds", color: "#D4AF37" },
  { label: "AUTO — STYLE", content: "LCU Style · Hyper Realistic · 4K", color: "#D4AF37" },
];

const COMPOSITIONS = [
  {
    name: "RULE OF THIRDS",
    icon: "⊞",
    color: "#84CC16",
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
    color: "#84CC16",
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

const C = { bg:"#080808", surface:"#0f0f0f", lime:"#84CC16", limeDark:"#3D6B0A", gold:"#D4AF37", text:"#888", border:"#1a1a1a" };

export default function CameraGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("CAMERA");
  const [cam, setCam] = useState(0);
  const [scene, setScene] = useState(0);
  const [comp, setComp] = useState(0);

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 #84CC1644}50%{box-shadow:0 0 0 8px #84CC1600}}
        .sb:hover{background:#84CC1611!important;color:#84CC16!important}
        .xb:hover{background:#1a1a1a!important}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#080808}
        ::-webkit-scrollbar-thumb{background:#84CC16;border-radius:2px}
      `}</style>

      {/* Corner button */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999}}>
        <button onClick={()=>setOpen(true)} style={{
          width:48,height:48,borderRadius:"50%",background:"#0d2a03",
          border:"1px solid #84CC16",color:"#84CC16",fontSize:20,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"pulse 2s ease-in-out infinite",boxShadow:"0 4px 20px #84CC1633"
        }}>🎥</button>
      </div>

      {open && (
        <div onClick={e=>e.target===e.currentTarget&&setOpen(false)} style={{
          position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.88)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",
          justifyContent:"center",padding:16
        }}>
          <div style={{
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,
            width:"100%",maxWidth:860,maxHeight:"92vh",overflow:"hidden",
            display:"flex",flexDirection:"column",animation:"fadeIn 0.2s ease",
            boxShadow:"0 0 80px #84CC1611"
          }}>

            {/* Header */}
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:C.bg,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>🎥</span>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.gold,letterSpacing:3}}>STUDIO GUIDE</div>
                    <div style={{fontFamily:"monospace",fontSize:9,color:"#444",letterSpacing:2}}>ZER∞LENS · AI CINEMA REFERENCE</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,marginLeft:12}}>
                  {["CAMERA","SCENE WRITING","COMPOSITION"].map(t=>(
                    <button key={t} onClick={()=>setTab(t)} style={{
                      padding:"6px 14px",borderRadius:999,fontFamily:"monospace",fontSize:10,
                      letterSpacing:2,fontWeight:700,cursor:"pointer",
                      background:tab===t?C.lime:"transparent",
                      color:tab===t?C.bg:"#555",
                      border:`1px solid ${tab===t?C.lime:"#222"}`,transition:"all 0.15s"
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <button className="xb" onClick={()=>setOpen(false)} style={{
                background:"transparent",border:`1px solid #222`,color:"#555",
                width:30,height:30,borderRadius:8,cursor:"pointer",fontSize:16,
                display:"flex",alignItems:"center",justifyContent:"center"
              }}>×</button>
            </div>

            {/* CAMERA TAB */}
            {tab==="CAMERA" && (
              <div style={{display:"flex",flex:1,overflow:"hidden"}}>
                <div style={{width:190,borderRight:`1px solid ${C.border}`,overflowY:"auto",background:C.bg,flexShrink:0,padding:"8px 0"}}>
                  {CAMERAS.map((c,i)=>(
                    <button key={i} className="sb" onClick={()=>setCam(i)} style={{
                      width:"100%",padding:"10px 14px",textAlign:"left",border:"none",
                      background:cam===i?"#84CC1611":"transparent",
                      borderLeft:`2px solid ${cam===i?C.lime:"transparent"}`,
                      cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"
                    }}>
                      <span style={{fontSize:14}}>{c.icon}</span>
                      <div>
                        <div style={{fontFamily:"monospace",fontSize:10,fontWeight:700,color:cam===i?C.lime:"#888"}}>{c.name.split(" ").slice(0,2).join(" ")}</div>
                        <div style={{fontFamily:"monospace",fontSize:9,color:cam===i?"#84CC1688":"#333",marginTop:1}}>{c.name.split(" ").slice(2).join(" ")}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{flex:1,overflowY:"auto",padding:24}}>
                  {(()=>{const c=CAMERAS[cam];return(
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                        <span style={{fontSize:28}}>{c.icon}</span>
                        <div>
                          <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,color:"#fff"}}>{c.name}</div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:C.lime,letterSpacing:3,marginTop:2}}>{c.tag}</div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,margin:"14px 0"}}/>
                      <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:6}}>VIBE</div>
                        <div style={{fontFamily:"monospace",fontSize:12,color:"#ccc",lineHeight:1.6}}>{c.vibe}</div>
                      </div>
                      <div style={{marginBottom:12}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:8}}>BEST FOR</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {c.bestFor.map((b,j)=>(
                            <span key={j} style={{background:"#84CC1611",border:`1px solid ${C.limeDark}`,color:C.lime,borderRadius:999,padding:"4px 12px",fontFamily:"monospace",fontSize:10}}>{b}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{background:"#0a1400",border:`1px solid ${C.limeDark}`,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:6}}>SOCIAL MEDIA</div>
                        <div style={{fontFamily:"monospace",fontSize:11,color:C.lime,lineHeight:1.6}}>{c.social}</div>
                      </div>
                      <div style={{background:"#1a0000",border:"1px solid #3a1a1a",borderRadius:8,padding:"12px 14px"}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:6}}>AVOID</div>
                        <div style={{fontFamily:"monospace",fontSize:11,color:"#CC4444",lineHeight:1.6}}>{c.avoid}</div>
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            )}

            {/* SCENE WRITING TAB */}
            {tab==="SCENE WRITING" && (
              <div style={{display:"flex",flex:1,overflow:"hidden"}}>

                {/* Left sidebar */}
                <div style={{width:200,borderRight:`1px solid ${C.border}`,overflowY:"auto",background:C.bg,flexShrink:0}}>
                  {/* Formula strip */}
                  <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:10}}>PROMPT FORMULA</div>
                    {FORMULA.map((f,i)=>(
                      <div key={i} style={{marginBottom:6}}>
                        <div style={{fontFamily:"monospace",fontSize:7,color:f.color,letterSpacing:2,marginBottom:2}}>{f.label}</div>
                        <div style={{background:f.color==="#84CC16"?"#84CC1611":"#0f0f0f",border:`1px solid ${f.color}22`,borderRadius:4,padding:"4px 8px",fontFamily:"monospace",fontSize:8,color:f.color==="#84CC16"?C.lime:"#666",lineHeight:1.4}}>{f.content}</div>
                      </div>
                    ))}
                  </div>
                  {/* Scene type buttons */}
                  <div style={{padding:"8px 0"}}>
                    <div style={{padding:"8px 14px",fontFamily:"monospace",fontSize:9,color:"#444",letterSpacing:3}}>SCENE TYPES</div>
                    {SCENE_TYPES.map((s,i)=>(
                      <button key={i} className="sb" onClick={()=>setScene(i)} style={{
                        width:"100%",padding:"10px 14px",textAlign:"left",border:"none",
                        background:scene===i?"#84CC1611":"transparent",
                        borderLeft:`2px solid ${scene===i?s.color:"transparent"}`,
                        cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:8
                      }}>
                        <span style={{fontSize:14}}>{s.icon}</span>
                        <div style={{fontFamily:"monospace",fontSize:9,fontWeight:700,color:scene===i?s.color:"#666",letterSpacing:1}}>{s.type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scene detail */}
                <div style={{flex:1,overflowY:"auto",padding:24}}>
                  {(()=>{const s=SCENE_TYPES[scene];return(
                    <div>
                      {/* Title */}
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <span style={{fontSize:26}}>{s.icon}</span>
                        <div>
                          <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:s.color,letterSpacing:2}}>{s.type}</div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:"#444",letterSpacing:2,marginTop:2}}>HOW TO WRITE THIS SCENE</div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,margin:"12px 0"}}/>

                      {/* Formula */}
                      <div style={{marginBottom:14}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:8}}>FORMULA</div>
                        <div style={{background:C.bg,border:`1px solid ${s.color}44`,borderRadius:8,padding:"12px 16px",fontFamily:"monospace",fontSize:11,color:s.color,lineHeight:1.9}}>{s.formula}</div>
                      </div>

                      {/* Bad vs Good */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                        <div style={{background:"#140000",border:"1px solid #3a1a1a",borderRadius:8,padding:14}}>
                          <div style={{fontFamily:"monospace",fontSize:9,color:"#CC4444",letterSpacing:3,marginBottom:8}}>❌ WRONG</div>
                          <div style={{fontFamily:"monospace",fontSize:10,color:"#CC4444",lineHeight:1.6,marginBottom:8,fontStyle:"italic"}}>"{s.bad}"</div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:"#663333",lineHeight:1.5}}>{s.badReason}</div>
                        </div>
                        <div style={{background:"#0a1400",border:`1px solid ${C.limeDark}`,borderRadius:8,padding:14}}>
                          <div style={{fontFamily:"monospace",fontSize:9,color:C.lime,letterSpacing:3,marginBottom:8}}>✅ CORRECT</div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:C.lime,lineHeight:1.7,marginBottom:8}}>"{s.good}"</div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:"#4a8a1a",lineHeight:1.5}}>{s.goodReason}</div>
                        </div>
                      </div>

                      {/* Verbs */}
                      <div style={{marginBottom:16}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:8}}>STRONG VERBS</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {s.verbs.map((v,i)=>(
                            <span key={i} style={{background:C.surface,border:`1px solid #222`,color:"#888",borderRadius:6,padding:"4px 10px",fontFamily:"monospace",fontSize:10}}>{v}</span>
                          ))}
                        </div>
                      </div>

                      {/* 5 Rules */}
                      <div style={{height:1,background:C.border,margin:"14px 0"}}/>
                      <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:10}}>5 RULES FOR EVERY SCENE</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {RULES.map((r,i)=>(
                          <div key={i} style={{display:"flex",gap:12,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",alignItems:"flex-start"}}>
                            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:r.color,flexShrink:0,minWidth:26}}>{r.num}</div>
                            <div>
                              <div style={{fontFamily:"monospace",fontSize:10,fontWeight:700,color:"#fff",letterSpacing:1,marginBottom:3}}>{r.title}</div>
                              <div style={{fontFamily:"monospace",fontSize:9,color:"#555",lineHeight:1.6}}>{r.desc}</div>
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
              <div style={{display:"flex",flex:1,overflow:"hidden"}}>
                {/* Left list */}
                <div style={{width:200,borderRight:`1px solid ${C.border}`,overflowY:"auto",background:C.bg,flexShrink:0,padding:"8px 0"}}>
                  <div style={{padding:"10px 14px 6px",fontFamily:"monospace",fontSize:9,color:"#444",letterSpacing:3}}>SELECT COMPOSITION</div>
                  {COMPOSITIONS.map((co,i)=>(
                    <button key={i} className="sb" onClick={()=>setComp(i)} style={{
                      width:"100%",padding:"10px 14px",textAlign:"left",border:"none",
                      background:comp===i?"#84CC1611":"transparent",
                      borderLeft:`2px solid ${comp===i?co.color:"transparent"}`,
                      cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:10
                    }}>
                      <span style={{fontSize:16,color:comp===i?co.color:"#444",fontWeight:700,minWidth:20}}>{co.icon}</span>
                      <div>
                        <div style={{fontFamily:"monospace",fontSize:9,fontWeight:700,color:comp===i?co.color:"#777",letterSpacing:1}}>{co.name}</div>
                        <div style={{fontFamily:"monospace",fontSize:8,color:comp===i?co.color+"88":"#333",marginTop:2,letterSpacing:1}}>{co.tag.split("·")[0].trim()}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right detail */}
                <div style={{flex:1,overflowY:"auto",padding:24}}>
                  {(()=>{const co=COMPOSITIONS[comp];return(
                    <div>
                      {/* Title */}
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                        <div style={{width:48,height:48,borderRadius:10,background:`${co.color}11`,border:`1px solid ${co.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:co.color,fontWeight:700,flexShrink:0}}>{co.icon}</div>
                        <div>
                          <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:co.color,letterSpacing:2}}>{co.name}</div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:"#555",letterSpacing:2,marginTop:2}}>{co.tag}</div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,margin:"14px 0"}}/>

                      {/* What is it */}
                      <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",marginBottom:14}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:8}}>WHAT IS IT</div>
                        <div style={{fontFamily:"monospace",fontSize:11,color:"#ccc",lineHeight:1.8}}>{co.what}</div>
                      </div>

                      {/* Best for + Avoid row */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                        <div style={{background:"#0a1400",border:`1px solid ${C.limeDark}`,borderRadius:8,padding:14}}>
                          <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:10}}>✅ BEST FOR</div>
                          <div style={{display:"flex",flexDirection:"column",gap:5}}>
                            {co.bestFor.map((b,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                                <div style={{width:4,height:4,borderRadius:"50%",background:C.lime,flexShrink:0}}/>
                                <span style={{fontFamily:"monospace",fontSize:10,color:"#aaa"}}>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{background:"#140000",border:"1px solid #3a1a1a",borderRadius:8,padding:14}}>
                          <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:10}}>❌ AVOID</div>
                          <div style={{fontFamily:"monospace",fontSize:10,color:"#CC4444",lineHeight:1.7}}>{co.avoid}</div>
                        </div>
                      </div>

                      {/* Scene match */}
                      <div style={{marginBottom:14}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:8}}>PAIRS WITH SCENE TYPE</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {co.sceneMatch.map((s,i)=>(
                            <span key={i} style={{background:`${co.color}11`,border:`1px solid ${co.color}33`,color:co.color,borderRadius:6,padding:"4px 12px",fontFamily:"monospace",fontSize:9,letterSpacing:1}}>{s}</span>
                          ))}
                        </div>
                      </div>

                      {/* Prompt add */}
                      <div style={{background:"#0a0a14",border:"1px solid #2a2a4a",borderRadius:8,padding:"14px 16px",marginBottom:14}}>
                        <div style={{fontFamily:"monospace",fontSize:9,color:C.gold,letterSpacing:3,marginBottom:8}}>ADD TO YOUR PROMPT</div>
                        <div style={{fontFamily:"monospace",fontSize:10,color:"#8a8aff",lineHeight:1.8,fontStyle:"italic"}}>"{co.promptAdd}"</div>
                      </div>

                      {/* Pro tip */}
                      <div style={{background:`${co.color}08`,border:`1px solid ${co.color}22`,borderRadius:8,padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-start"}}>
                        <span style={{fontSize:16,flexShrink:0}}>💡</span>
                        <div>
                          <div style={{fontFamily:"monospace",fontSize:9,color:co.color,letterSpacing:3,marginBottom:4}}>PRO TIP</div>
                          <div style={{fontFamily:"monospace",fontSize:10,color:"#aaa",lineHeight:1.7}}>{co.tip}</div>
                        </div>
                      </div>
                    </div>
                  );})()}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{padding:"10px 20px",borderTop:`1px solid ${C.border}`,background:C.bg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"monospace",fontSize:9,color:"#2a2a2a",letterSpacing:3}}>ZER∞LENS · STUDIO GUIDE</span>
              <span style={{fontFamily:"monospace",fontSize:9,color:C.lime,letterSpacing:2}}>
                {tab==="CAMERA"?`${cam+1} / ${CAMERAS.length} CAMERAS`:tab==="SCENE WRITING"?`${scene+1} / ${SCENE_TYPES.length} SCENE TYPES`:`${comp+1} / ${COMPOSITIONS.length} COMPOSITIONS`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
