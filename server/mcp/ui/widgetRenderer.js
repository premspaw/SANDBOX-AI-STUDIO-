const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function httpsUrl(value,fallback=''){
  try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.toString():fallback;}catch{return fallback;}
}
/** Passive previews: no inline scripts, HTML injection or unauthenticated job polling. */
export function renderWidgetHtml({generationId='',type='image',status='processing',resultUrl='',prompt='',model='ZeroLens AI',error='',appBaseUrl='https://zerolens.in'}={}){
  const url=escapeHtml(httpsUrl(resultUrl));
  const home=escapeHtml(httpsUrl(appBaseUrl,'https://zerolens.in'));
  const media=status==='completed'&&url
    ?type==='video'?'<video controls playsinline preload="metadata" src="'+url+'" aria-label="Generated video"></video>'
    :'<img src="'+url+'" alt="'+escapeHtml(prompt)+'" loading="lazy">'
    :'<p>'+escapeHtml(status)+'</p>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; img-src https:; media-src https:; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;">'+
    '<title>ZeroLens Studio Preview</title><style>body{font:16px system-ui;background:#101525;color:white;padding:20px}video,img{max-width:100%;max-height:75vh}a{color:#c8f135}</style></head><body>'+
    '<h1>ZeroLens Studio Preview</h1>'+media+'<p>'+escapeHtml(prompt)+'</p><p>'+escapeHtml(model)+'</p>'+
    (error?'<p>'+escapeHtml(error)+'</p>':'')+'<a href="'+home+'" target="_blank" rel="noopener noreferrer">Open in ZeroLens</a></body></html>';
}
