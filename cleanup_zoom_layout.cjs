const fs = require('fs');
let c = fs.readFileSync('src/components/panels/PromptGenerator.jsx', 'utf8');

// 1. Add Close Button to Bottom of Zoom Modal
const targetModalButtons = `<div className="absolute bottom-6 md:bottom-12 flex gap-4 w-full justify-center px-4 md:w-auto">`;
const replacementModalButtons = `<div className="absolute bottom-6 md:bottom-12 flex gap-4 w-full justify-center px-4 md:w-auto">
                            <button onClick={() => setZoomState(p => ({ ...p, isOpen: false }))} className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-3 md:py-2 rounded-full font-bold uppercase text-[10px] md:text-xs flex items-center gap-2 transition shadow-xl"><X className="w-4 h-4" /> Back</button>`;

if (c.includes(targetModalButtons)) {
    c = c.replace(targetModalButtons, replacementModalButtons);
    console.log('Added Back button to zoom modal.');
}

// 2. Add e.stopPropagation to continuous downloadImage triggers
c = c.replace(/onClick=\{\(\)\s*=>\s*downloadImage\(([^)]+)\)\}/g, 'onClick={(e) => { e.stopPropagation(); downloadImage($1); }}');

fs.writeFileSync('src/components/panels/PromptGenerator.jsx', c, 'utf8');
console.log('Appended stopPropagation setup safety scripts securely.');
