import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Sparkles, User, Sword, Castle, Shirt,
  Film, Plus, X, Search, Trash2, Download, Check, ArrowRight,
  Upload, ExternalLink, Image as ImageIcon, Video, Filter,
  Layers, ChevronDown, CheckCircle2, Wand2, Copy, Eye
} from 'lucide-react';
import { useAppStore } from '../../store';
import { resolveUrl } from '../../config/apiConfig';
import { downloadDirect } from '../../lib/videoUtils';

const CATEGORIES = [
  { id: 'character', label: 'Characters', icon: User, color: 'text-purple-400', glow: 'rgba(168,85,247,0.25)', border: 'border-purple-500/30' },
  { id: 'prop', label: 'Props', icon: Sword, color: 'text-amber-400', glow: 'rgba(251,191,36,0.25)', border: 'border-amber-500/30' },
  { id: 'location', label: 'Locations', icon: Castle, color: 'text-emerald-400', glow: 'rgba(52,211,153,0.25)', border: 'border-emerald-500/30' },
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt, color: 'text-pink-400', glow: 'rgba(244,114,182,0.25)', border: 'border-pink-500/30' },
  { id: 'generation', label: 'Generations', icon: Film, color: 'text-[#c8f135]', glow: 'rgba(200,241,53,0.25)', border: 'border-[#c8f135]/30' },
];

export function ProjectVaultModal() {
  const isOpen = useAppStore(state => state.isProjectVaultOpen);
  const closeVault = useAppStore(state => state.closeProjectVault);
  const initialCategory = useAppStore(state => state.projectVaultInitialCategory);
  const selectCallback = useAppStore(state => state.projectVaultSelectCallback);

  const projects = useAppStore(state => state.projects || [{ id: 'default', name: 'Default Project' }]);
  const activeProjectId = useAppStore(state => state.activeProjectId || 'default');
  const setActiveProjectId = useAppStore(state => state.setActiveProjectId);
  const createProject = useAppStore(state => state.createProject);
  const deleteProject = useAppStore(state => state.deleteProject);

  const projectAssets = useAppStore(state => state.projectAssets || {});
  const addProjectAsset = useAppStore(state => state.addProjectAsset);
  const removeProjectAsset = useAppStore(state => state.removeProjectAsset);
  const updateProjectAssetCategory = useAppStore(state => state.updateProjectAssetCategory);

  const [activeTab, setActiveTab] = useState(initialCategory || 'character');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedAssetForPreview, setSelectedAssetForPreview] = useState(null);
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [manualAssetUrl, setManualAssetUrl] = useState('');
  const [manualAssetName, setManualAssetName] = useState('');
  const [manualAssetCategory, setManualAssetCategory] = useState('character');
  const fileInputRef = useRef(null);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (initialCategory) {
      setActiveTab(initialCategory);
    }
  }, [initialCategory, isOpen]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0] || { id: 'default', name: 'Default Project' };
  }, [projects, activeProjectId]);

  const rawAssets = useMemo(() => {
    return projectAssets[activeProjectId] || [];
  }, [projectAssets, activeProjectId]);

  // Asset counts per category
  const counts = useMemo(() => {
    const c = { character: 0, prop: 0, location: 0, wardrobe: 0, generation: 0, all: rawAssets.length };
    rawAssets.forEach(item => {
      const cat = (item.category || 'generation').toLowerCase();
      if (c[cat] !== undefined) c[cat]++;
      else c.generation++;
    });
    return c;
  }, [rawAssets]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return rawAssets.filter(item => {
      const matchesCategory = activeTab === 'all' || item.category === activeTab;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (item.name || '').toLowerCase().includes(q) || (item.prompt || '').toLowerCase().includes(q);
    });
  }, [rawAssets, activeTab, searchQuery]);

  if (!isOpen) return null;

  const handleCreateProject = (e) => {
    e?.preventDefault();
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim(), newProjectDesc.trim());
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProjectModal(false);
  };

  const handleSelectAsset = (item) => {
    if (typeof selectCallback === 'function') {
      selectCallback(item);
      closeVault();
    } else {
      setSelectedAssetForPreview(item);
    }
  };

  const handleManualAdd = (e) => {
    e?.preventDefault();
    if (!manualAssetUrl.trim()) return;
    addProjectAsset({
      url: manualAssetUrl.trim(),
      name: manualAssetName.trim() || `${manualAssetCategory.toUpperCase()} Asset`,
      category: manualAssetCategory,
      type: manualAssetUrl.toLowerCase().includes('.mp4') ? 'video' : 'image'
    });
    setManualAssetUrl('');
    setManualAssetName('');
    setShowAddAssetDialog(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result;
      if (b64) {
        addProjectAsset({
          url: b64,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: activeTab === 'all' ? 'character' : activeTab,
          type: file.type.startsWith('video') ? 'video' : 'image'
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100050] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/85 backdrop-blur-2xl">
        {/* Prism liquid border wrapper - Compact sleek container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl md:max-w-4xl h-[78vh] max-h-[82vh] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col p-[1.5px] bg-gradient-to-br from-white/20 via-white/5 to-white/10 shadow-[0_0_60px_rgba(168,85,247,0.2)]"
        >
          {/* Inner Liquid Glass Prism Container */}
          <div className="relative w-full h-full bg-[#0a0a0f]/95 rounded-[15px] md:rounded-[23px] overflow-hidden flex flex-col backdrop-blur-3xl border border-white/5">
            
            {/* Top Header / Project Switcher */}
            <div className="px-4 py-2.5 sm:py-3 border-b border-white/10 bg-gradient-to-r from-white/[0.04] via-transparent to-white/[0.02] flex items-center justify-between gap-3 flex-wrap flex-none">
              
              {/* Left Brand Badge & Project Selector */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[1px] shadow-md shadow-purple-500/20 shrink-0">
                  <div className="w-full h-full bg-[#0d0d14] rounded-[11px] flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-purple-300" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8.5px] font-black tracking-[0.2em] uppercase text-purple-400">
                      PROJECT VAULT
                    </span>
                    <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-white/10 font-mono text-white/60">
                      {counts.all} ASSETS
                    </span>
                  </div>

                  {/* Project Dropdown Selector */}
                  <div className="relative z-40">
                    <button
                      onClick={() => setShowProjectDropdown(prev => !prev)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-white hover:text-purple-300 transition-colors group cursor-pointer"
                    >
                      <span className="truncate max-w-[160px] sm:max-w-[260px] drop-shadow-sm">
                        {activeProject.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-purple-300 transition-transform" />
                    </button>

                    {/* Dropdown Menu */}
                    {showProjectDropdown && (
                      <div className="absolute top-full left-0 mt-1.5 w-64 bg-[#12121a]/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-2.5 py-1 text-[8.5px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 mb-1 flex items-center justify-between">
                          <span>Projects</span>
                          <button
                            onClick={() => { setShowProjectDropdown(false); setShowNewProjectModal(true); }}
                            className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold lowercase tracking-normal"
                          >
                            <Plus className="w-3 h-3" /> new
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                          {projects.map((proj) => {
                            const isSelected = proj.id === activeProjectId;
                            const assetCount = (projectAssets[proj.id] || []).length;
                            return (
                              <button
                                key={proj.id}
                                onClick={() => {
                                  setActiveProjectId(proj.id);
                                  setShowProjectDropdown(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                                  isSelected ? 'bg-purple-500/20 text-white border border-purple-500/40' : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className="text-xs font-semibold truncate">{proj.name}</span>
                                <span className="text-[9px] font-mono text-white/30">{assetCount}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Search, + Add Asset, + New Project, Close */}
              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative hidden sm:block">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Filter assets…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-36 md:w-48 bg-white/5 border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-purple-400/50 transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* + New Project Button */}
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:border-purple-400/40"
                  title="Create a new project folder"
                >
                  <Plus className="w-3 h-3 text-purple-400" />
                  <span className="hidden sm:inline">Project</span>
                </button>

                {/* + Upload Asset Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                  title="Upload an asset image or video into this project"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Close Button */}
                <button
                  onClick={closeVault}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Category Navigation Bar (Liquid Tabs) */}
            <div className="px-3.5 py-2 border-b border-white/5 bg-black/30 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar flex-none">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                      : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>All</span>
                  <span className="text-[9px] opacity-60 font-mono">({counts.all})</span>
                </button>

                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  const count = counts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? `bg-white/10 text-white ${cat.border} shadow-sm shadow-purple-500/10`
                          : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${isActive ? cat.color : ''}`} />
                      <span>{cat.label}</span>
                      <span className={`text-[9px] font-mono ${isActive ? cat.color : 'opacity-40'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selection Mode Notice */}
              {typeof selectCallback === 'function' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#c8f135] bg-[#c8f135]/10 border border-[#c8f135]/30 px-2.5 py-0.5 rounded-full shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>Select reference</span>
                </div>
              )}
            </div>

            {/* Grid Canvas Area - Compact Asset Previews */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-gradient-to-b from-transparent via-black/20 to-black/60">
              {filteredAssets.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3 text-white/20">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    No {activeTab === 'all' ? 'assets' : activeTab + 's'} in {activeProject.name}
                  </h3>
                  <p className="text-[11px] text-white/40 max-w-sm mb-4 leading-relaxed">
                    Assets generated across Cinema Studio, Studio Generator, Avatar Studio, and Inpaint will automatically save here!
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" /> Upload {activeTab === 'all' ? 'Asset' : activeTab}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
                  {filteredAssets.map((asset) => {
                    const isVideo = asset.type === 'video' || asset.url?.includes('.mp4');
                    const categoryObj = CATEGORIES.find(c => c.id === asset.category) || CATEGORIES[0];
                    const CategoryIcon = categoryObj.icon;

                    return (
                      <motion.div
                        key={asset.id}
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        className="group relative aspect-[4/5] bg-white/[0.02] border border-white/10 hover:border-purple-400/50 rounded-xl overflow-hidden transition-all duration-200 flex flex-col shadow-sm hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
                        onClick={() => handleSelectAsset(asset)}
                      >
                        {/* Media display */}
                        <div className="absolute inset-0 bg-black">
                          {isVideo ? (
                            <video
                              src={resolveUrl(asset.url)}
                              className="w-full h-full object-cover brightness-90 group-hover:brightness-100 transition-all duration-300"
                              muted
                              loop
                              onMouseEnter={(e) => e.target.play().catch(() => {})}
                              onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                            />
                          ) : (
                            <img
                              src={resolveUrl(asset.url)}
                              alt={asset.name}
                              loading="lazy"
                              className="w-full h-full object-cover brightness-90 group-hover:brightness-100 group-hover:scale-105 transition-all duration-300"
                            />
                          )}
                        </div>

                        {/* Top Category Badge */}
                        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                          <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border ${categoryObj.border} ${categoryObj.color} flex items-center gap-0.5`}>
                            <CategoryIcon className="w-2 h-2" />
                            {categoryObj.label}
                          </span>
                        </div>

                        {/* Top Actions: Delete / Quick Tag */}
                        <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetForPreview(asset);
                            }}
                            className="w-5 h-5 rounded-md bg-black/80 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                            title="Preview / Details"
                          >
                            <Eye className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDirect(asset.url, `${asset.name || 'asset'}.png`);
                            }}
                            className="w-5 h-5 rounded-md bg-black/80 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                            title="Download"
                          >
                            <Download className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProjectAsset(asset.id, activeProjectId);
                            }}
                            className="w-5 h-5 rounded-md bg-black/80 hover:bg-red-500/80 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Bottom Info & CTA */}
                        <div className="absolute inset-x-0 bottom-0 p-2 pt-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-10 flex flex-col justify-end">
                          <p className="text-[10px] font-bold text-white truncate drop-shadow-md">
                            {asset.name}
                          </p>

                          {/* Quick Category Changer Dropdown */}
                          <div className="mt-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-white/10">
                            <select
                              value={asset.category}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateProjectAssetCategory(asset.id, e.target.value, activeProjectId);
                              }}
                              className="text-[8px] font-bold bg-black/80 text-white/80 border border-white/15 rounded px-1 py-0.2 outline-none cursor-pointer"
                            >
                              <option value="character">Char</option>
                              <option value="prop">Prop</option>
                              <option value="location">Loc</option>
                              <option value="wardrobe">Ward</option>
                              <option value="generation">Gen</option>
                            </select>

                            {/* Select CTA */}
                            <span className="text-[8px] font-black text-[#c8f135] flex items-center gap-0.5 uppercase tracking-wider">
                              Use <ArrowRight className="w-2 h-2" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Footer Stats */}
            <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center justify-between text-[11px] text-white/40 flex-none">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="w-3 h-3 text-purple-400" />
                  <strong className="text-white text-xs">{activeProject.name}</strong>
                </span>
                <span>·</span>
                <span>{rawAssets.length} items</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-white/20">Studio Vault</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modal: Full Asset Preview Lightbox */}
        {selectedAssetForPreview && (
          <div
            className="fixed inset-0 z-[100070] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setSelectedAssetForPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#101018] border border-white/15 rounded-2xl p-4 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedAssetForPreview.category || 'Asset'}
                  </span>
                  <h4 className="text-xs font-bold text-white truncate">
                    {selectedAssetForPreview.name}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedAssetForPreview(null)}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Media Container */}
              <div className="w-full max-h-[46vh] bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 relative">
                {selectedAssetForPreview.type === 'video' || selectedAssetForPreview.url?.includes('.mp4') ? (
                  <video
                    src={resolveUrl(selectedAssetForPreview.url)}
                    className="max-h-[46vh] w-full object-contain"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={resolveUrl(selectedAssetForPreview.url)}
                    alt={selectedAssetForPreview.name}
                    className="max-h-[46vh] w-full object-contain"
                  />
                )}
              </div>

              {/* Prompt info if available */}
              {selectedAssetForPreview.prompt && (
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] text-white/60 font-mono line-clamp-2">
                  {selectedAssetForPreview.prompt}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      downloadDirect(selectedAssetForPreview.url, `${selectedAssetForPreview.name || 'asset'}.png`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(selectedAssetForPreview.url);
                        alert('Asset URL copied to clipboard');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy URL
                  </button>
                </div>

                {typeof selectCallback === 'function' ? (
                  <button
                    onClick={() => {
                      selectCallback(selectedAssetForPreview);
                      setSelectedAssetForPreview(null);
                      closeVault();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#c8f135] hover:bg-[#b8e125] text-black text-[11px] font-black flex items-center gap-1 shadow-md shadow-[#c8f135]/20 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Select As Reference
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      removeProjectAsset(selectedAssetForPreview.id, activeProjectId);
                      setSelectedAssetForPreview(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Create New Project */}
        {showNewProjectModal && (
          <div className="fixed inset-0 z-[100060] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#111118] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-purple-400" /> New Project Folder
                </h3>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-white/50 leading-relaxed">
                Create a distinct project box to organize characters, props, locations, and wardrobe for your short movie or commercial.
              </p>

              <form onSubmit={handleCreateProject} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Short Movie Dragon, Cyberpunk 2099…"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-400/60"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">
                    Description <span className="text-white/20 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description or visual style…"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-purple-400/60 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewProjectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

export default ProjectVaultModal;
