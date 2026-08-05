import React from 'react';
import { useUGC } from '../context/UGCContext';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, SidebarClose, Upload, Trash2, Copy } from 'lucide-react';
import { resolveUrl } from '../../../config/apiConfig';

export default function SceneTemplatesAside() {
  const {
    showTemplates,
    setShowTemplates,
    isGlobalAdmin,
    showUploadForm,
    setShowUploadForm,
    handleUploadTemplateUgc,
    dbSceneTemplates,
    sceneContext,
    setSceneContext,
    setVideoPrompt,
    handleDeleteTemplate,
    resetSidebarTimer,
    showToast,
  } = useUGC();

  return (
    <aside
      onMouseMove={resetSidebarTimer}
      onClick={resetSidebarTimer}
      className={`absolute right-0 top-0 bottom-0 w-full sm:w-80 overflow-y-auto custom-scrollbar flex flex-col bg-[#09090e] border-l border-white/20 z-50 transition-transform duration-500 shadow-[0_0_50px_rgba(0,0,0,0.95)] ${
        showTemplates ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-[#222] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase px-1">
            Scene Templates
          </h2>
          <div className="flex items-center gap-2">
            {isGlobalAdmin && (
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="text-[#c8f135] hover:text-white bg-[#c8f135]/10 p-1.5 rounded transition-colors flex items-center gap-1 text-[9px] font-black uppercase"
              >
                <Plus size={12} /> Add
              </button>
            )}
            <button
              onClick={() => setShowTemplates(false)}
              className="text-[#555] hover:text-[#fff] bg-[#111] p-1 rounded transition-colors"
            >
              <SidebarClose size={14} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {showUploadForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-2 bg-[#111] p-3 rounded-xl border border-white/5"
            >
              <input
                id="ugcTplTitle"
                type="text"
                placeholder="Template title"
                className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#c8f135]"
              />
              <input
                id="ugcTplContext"
                type="text"
                placeholder="Scene Context (e.g. Park)"
                className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#c8f135]"
              />
              <textarea
                id="ugcTplPrompt"
                placeholder="Prompt used for video generation"
                className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white h-20 outline-none focus:border-[#c8f135] custom-scrollbar"
              />
              <div className="flex items-center justify-between gap-1">
                <input
                  id="ugcTplFile"
                  type="file"
                  accept="video/*,image/*"
                  className="text-[8px] text-zinc-400 file:bg-white/10 file:border-0 file:rounded file:text-white file:px-2 file:py-1 file:text-[8px] cursor-pointer"
                />
                <button
                  onClick={handleUploadTemplateUgc}
                  className="bg-[#c8f135] hover:bg-[#a9cd2b] text-black px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                >
                  <Upload size={11} /> Post
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start overflow-y-auto custom-scrollbar">
        {dbSceneTemplates.map((template: any) => (
          <div key={template.id} className="relative group">
            <button
              onClick={() => {
                setSceneContext(template.sceneContext || template.scene_context);
                setVideoPrompt(template.prompt);
                setShowTemplates(false);
              }}
              className={`w-full aspect-[9/16] rounded-xl border overflow-hidden transition-all block bg-white/5 ${
                sceneContext === template.sceneContext
                  ? 'border-[#c8f135] shadow-[0_0_15px_rgba(212,255,0,0.3)]'
                  : 'border-white/10 hover:border-white/30'
              }`}
              title={template.title}
            >
              {template.img?.endsWith('.mp4') ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  src={template.img ? resolveUrl(`${template.img}?v=1`) : ''}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                  }`}
                />
              ) : (
                <img
                  src={resolveUrl(template.img)}
                  alt=""
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                  }`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2 text-left pointer-events-none">
                <span className="text-[#c8f135] font-mono text-[8.5px] font-bold tracking-widest uppercase leading-tight line-clamp-2">
                  {template.title}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(template.prompt);
                if (showToast) showToast('Prompt copied to clipboard!', 'success');
              }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-[#c8f135] hover:text-black text-white p-1.5 rounded-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/20 hover:border-[#c8f135]"
              title="Copy Prompt"
            >
              <Copy size={12} />
            </button>
            {isGlobalAdmin && template.created_at && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTemplate(template.id);
                }}
                className="absolute top-2 right-8 bg-black/60 hover:bg-red-500 hover:text-white text-white p-1.5 rounded-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/20 hover:border-red-500"
                title="Delete Template"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
