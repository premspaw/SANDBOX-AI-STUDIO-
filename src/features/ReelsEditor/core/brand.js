import { getTemplateById } from './templates.js';

export const DEFAULT_BRAND = Object.freeze({
  background:'#101525', surface:'#202B42', text:'#FFFFFF', accent:'#C8F135',
  secondary:'#9C89FF', font:'poppins', animation:'slide-up', templateId:'viral-hook',
});

/** Keep the user's copy, timing and source anchors when restyling. */
export function brandLayer(overlay, brand) {
  if (!brand) return overlay;
  return { ...overlay,
    style:{...overlay.style, color:brand.text, boxColor:brand.surface, font:brand.font},
    animation:{in:brand.animation, durationFrames:brand.animation==='none'?0:(overlay.animation.durationFrames||9)},
  };
}

export function applyBrand(project, patch) {
  const brand={...DEFAULT_BRAND,...project.brand,...patch};
  const template=patch.templateId ? getTemplateById(patch.templateId) : null;
  return {...project,brand,overlays:project.overlays.map(o=>brandLayer(template ? {
    ...o,style:{...template.style},animation:{...template.animation},
    templateId:template.id,templateVersion:'1.0.0',
  } : o,brand))};
}

/** Shared pixel geometry for preview and FFmpeg; panels appear for the layer's interval. */
export function templatePanels(overlay, brand, width, height) {
  if (!brand || !overlay.templateId) return [];
  const rect=(x,y,w,h,color)=>({x:Math.round(x*width),y:Math.round(y*height),
    width:Math.max(1,Math.round(w*width)),height:Math.max(1,Math.round(h*height)),color});
  if (['point-list-3','before-after-split'].includes(overlay.templateId)) return [
    rect(0,0,1,1,brand.background),rect(.06,.1,.88,.8,brand.surface),
    rect(.06,.1,.88,.012,brand.accent),rect(.06,.888,.88,.012,brand.secondary),
  ];
  const y=Math.max(.02,Math.min(.93,overlay.style.y+.09));
  return [rect(.12,y,.5,.012,brand.accent),rect(.62,y,.26,.012,brand.secondary)];
}
