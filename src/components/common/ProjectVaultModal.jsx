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
      <div className="fixed inset-0 z-[100050] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-2xl">
        {/* Prism liquid border wrapper */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex flex-col p-[1.5px] bg-gradient-to-br from-white/20 via-white/5 to-white/10 shadow-[0_0_80px_rgba(168,85,247,0.18)]"
        >
          {/* Inner Liquid Glass Prism Container */}
          <div className="relative w-full h-full bg-[#0a0a0f]/95 rounded-[23px] overflow-hidden flex flex-col backdrop-blur-3xl border border-white/5">
            
            {/* Top Header / Project Switcher */}
            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/[0.04] via-transparent to-white/[0.02] flex items-center justify-between gap-4 flex-wrap">
              
              {/* Left Brand Badge & Project Selector */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[1px] shadow-lg shadow-purple-500/20">
                  <div className="w-full h-full bg-[#0d0d14] rounded-[15px] flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-purple-300" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-black tracking-[0.22em] uppercase text-purple-400">
                      PROJECT VAULT
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-white/50">
                      {counts.all} ASSETS
                    </span>
                  </div>

                  {/* Project Dropdown Selector */}
                  <div className="relative mt-0.5">
                    <button
                      onClick={() => setShowProjectDropdown(prev => !prev)}
                      className="flex items-center gap-2 text-sm md:text-base font-black text-white hover:text-purple-300 transition-colors group cursor-pointer"
                    >
                      <span className="truncate max-w-[220px] md:max-w-[340px] drop-shadow-sm">
                        {activeProject.name}
                      </span>
                      <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-purple-300 transition-transform" />
                    </button>

                    {/* Dropdown Menu */}
                    {showProjectDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-[#12121a]/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 mb-1 flex items-center justify-between">
                          <span>Projects</span>
                          <button
                            onClick={() => { setShowProjectDropdown(false); setShowNewProjectModal(true); }}
                            className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold lowercase tracking-normal"
                          >
                            <Plus className="w-3 h-3" /> new
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1">
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
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                                  isSelected ? 'bg-purple-500/20 text-white border border-purple-500/40' : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className="text-xs font-bold truncate">{proj.name}</span>
                                <span className="text-[10px] font-mono text-white/30">{assetCount}</span>
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
              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative hidden sm:block">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search characters, props, locations…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-52 md:w-64 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-purple-400/50 transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* + New Project Button */}
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-purple-400/40"
                  title="Create a new project folder"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden md:inline">New Project</span>
                </button>

                {/* + Drop / Add Asset Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                  title="Upload an asset image or video into this project"
                >
                  <Upload className="w-3.5 h-3.5" />
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
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Navigation Bar (Liquid Tabs) */}
            <div className="px-5 py-2.5 border-b border-white/5 bg-black/30 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar flex-none">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white/15 text-white border border-white/20 shadow-md'
                      : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Assets</span>
                  <span className="text-[10px] opacity-60 font-mono">({counts.all})</span>
                </button>

                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  const count = counts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? `bg-white/10 text-white ${cat.border} shadow-lg shadow-purple-500/10`
                          : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? cat.color : ''}`} />
                      <span>{cat.label}</span>
                      <span className={`text-[10px] font-mono ${isActive ? cat.color : 'opacity-40'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selection Mode Notice */}
              {typeof selectCallback === 'function' && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#c8f135] bg-[#c8f135]/10 border border-[#c8f135]/30 px-3 py-1 rounded-full shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Select an asset to use as reference</span>
                </div>
              )}
            </div>

            {/* Grid Canvas Area */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gradient-to-b from-transparent via-black/20 to-black/60">
              {filteredAssets.length === 0 ? (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 text-white/20">
                    <FolderKanban className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    No {activeTab === 'all' ? 'assets' : activeTab + 's'} in {activeProject.name}
                  </h3>
                  <p className="text-xs text-white/40 max-w-sm mb-5 leading-relaxed">
                    Assets generated across Cinema Studio, Studio Generator, Avatar Studio, and Inpaint will automatically save here! You can also upload reference files directly.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload {activeTab === 'all' ? 'Asset' : activeTab}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredAssets.map((asset) => {
                    const isVideo = asset.type === 'video' || asset.url?.includes('.mp4');
                    const categoryObj = CATEGORIES.find(c => c.id === asset.category) || CATEGORIES[0];
                    const CategoryIcon = categoryObj.icon;

                    return (
                      <motion.div
                        key={asset.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group relative aspect-[3/4] bg-white/[0.02] border border-white/10 hover:border-purple-400/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
                        onClick={() => handleSelectAsset(asset)}
                      >
                        {/* Media display */}
                        <div className="absolute inset-0 bg-black">
                          {isVideo ? (
                            <video
                              src={resolveUrl(asset.url)}
                              className="w-full h-full object-cover brightness-90 group-hover:brightness-100 transition-all duration-500"
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
                              className="w-full h-full object-cover brightness-90 group-hover:brightness-100 group-hover:scale-105 transition-all duration-500"
                            />
                          )}
                        </div>

                        {/* Top Category Badge */}
                        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border ${categoryObj.border} ${categoryObj.color} flex items-center gap-1`}>
                            <CategoryIcon className="w-2.5 h-2.5" />
                            {categoryObj.label}
                          </span>
                        </div>

                        {/* Top Actions: Delete / Quick Tag */}
                        <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDirect(asset.url, `${asset.name || 'asset'}.png`);
                            }}
                            className="w-6 h-6 rounded-lg bg-black/80 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProjectAsset(asset.id, activeProjectId);
                            }}
                            className="w-6 h-6 rounded-lg bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Bottom Info & CTA */}
                        <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-10 flex flex-col justify-end">
                          <p className="text-[11px] font-black text-white truncate drop-shadow-md">
                            {asset.name}
                          </p>
                          {asset.prompt && (
                            <p className="text-[8.5px] text-white/50 truncate font-mono mt-0.5">
                              {asset.prompt}
                            </p>
                          )}

                          {/* Quick Category Changer Dropdown */}
                          <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-white/10">
                            <select
                              value={asset.category}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateProjectAssetCategory(asset.id, e.target.value, activeProjectId);
                              }}
                              className="text-[9px] font-bold bg-black/80 text-white/80 border border-white/15 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                            >
                              <option value="character">Character</option>
                              <option value="prop">Prop</option>
                              <option value="location">Location</option>
                              <option value="wardrobe">Wardrobe</option>
                              <option value="generation">Generation</option>
                            </select>

                            {/* Select CTA */}
                            <span className="text-[9px] font-black text-[#c8f135] flex items-center gap-1 uppercase tracking-wider">
                              Use Ref <ArrowRight className="w-2.5 h-2.5" />
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
            <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-xs text-white/40 flex-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-purple-400" />
                  <strong className="text-white">{activeProject.name}</strong>
                </span>
                <span>·</span>
                <span>{rawAssets.length} total saved items</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-white/20">Synced with Project Box</span>
              </div>
            </div>
          </div>
        </motion.div>

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
