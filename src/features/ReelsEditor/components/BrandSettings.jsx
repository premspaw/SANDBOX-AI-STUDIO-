import React from 'react';
export const DEFAULT_BRAND={background:'#101525',surface:'#202B42',text:'#FFFFFF',accent:'#C8F135',secondary:'#9C89FF',font:'poppins',animation:'slide-up',templateId:'viral-hook'};
const palettes={Midnight:DEFAULT_BRAND,Paper:{...DEFAULT_BRAND,background:'#FAF7F0',surface:'#E6DED0',text:'#202020',accent:'#B44928',secondary:'#396A66'},Ocean:{...DEFAULT_BRAND,background:'#071E2B',surface:'#12394B',text:'#F0FAFF',accent:'#48D6C0',secondary:'#7DA8FF'}};
export function BrandSettings({editor}){
 const {project}=editor,b=project.brand||DEFAULT_BRAND;
 const set=patch=>editor.mutate(p=>({...p,brand:{...b,...patch}}));
 const apply=()=>editor.mutate(p=>({...p,overlays:p.overlays.map(o=>({...o,style:{...o.style,color:b.text,boxColor:b.surface,font:b.font},animation:{...o.animation,in:b.animation}}))}));
 const resolution=value=>{
  let [width,height]=value.split('x').map(Number);
  if(value==='source'){const m=project.sources[0]?.meta;if(!m)return;[width,height]=Math.abs(m.rotation)%180===90?[m.height,m.width]:[m.width,m.height];width=Math.round(width/2)*2;height=Math.round(height/2)*2;}
  editor.mutate(p=>({...p,canvas:{...p.canvas,width,height}}));
 };
 return <section className="p-3 border-b border-white/10 bg-zinc-950 text-xs space-y-3 overflow-auto max-h-72">
 <p className="text-lime-300 font-bold">1 · Clean up → 2 · Brand & template → 3 · Refine → 4 · Export</p>
 <div className="flex flex-wrap gap-3 items-center"><label>Template <select className="bg-zinc-800 p-2" value={b.templateId} onChange={e=>set({templateId:e.target.value})}><option value="viral-hook">Headline motion (existing template)</option></select></label>
 {Object.entries(palettes).map(([name,p])=><button key={name} className="border border-white/20 rounded px-2 py-1" onClick={()=>set(p)}>{name}</button>)}
 {['background','surface','text','accent','secondary'].map(k=><label key={k} className="flex gap-1 items-center">{k}<input aria-label={`Brand ${k}`} type="color" value={b[k]} onChange={e=>set({[k]:e.target.value})}/></label>)}
 <select aria-label="Brand font" className="bg-zinc-800 p-2" value={b.font} onChange={e=>set({font:e.target.value})}><option value="poppins">Poppins Bold</option><option value="noto-kannada">Noto Sans Kannada</option></select>
 <select aria-label="Animation" className="bg-zinc-800 p-2" value={b.animation} onChange={e=>set({animation:e.target.value})}>{['none','fade','slide-up'].map(a=><option key={a}>{a}</option>)}</select>
 <button onClick={apply} className="text-lime-300">Apply typography to layers</button>
 <label>Export size <select aria-label="Export size" className="bg-zinc-800 p-2" value={`${project.canvas.width}x${project.canvas.height}`} onChange={e=>resolution(e.target.value)}><option value={`${project.canvas.width}x${project.canvas.height}`}>Current: {project.canvas.width}×{project.canvas.height}</option><option value="source">Match source dimensions</option><option value="1080x1920">Portrait 1080p</option><option value="1920x1080">Landscape 1080p</option><option value="720x1280">Portrait 720p</option><option value="1080x1080">Square 1080p</option></select></label></div>
 <p className="text-zinc-400">Text and surface colors apply to title layers. Background, accent and secondary are saved brand tokens for future scene templates. Export: MP4 · H.264 · AAC · 30 fps.</p>
 </section>;
}
