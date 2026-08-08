import React, { useState } from 'react';
import { 
  Cpu, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  Zap, 
  Globe, 
  Code, 
  Sparkles, 
  Film, 
  Video, 
  Megaphone, 
  Play, 
  CheckCircle2, 
  Download, 
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '../../store';

export default function McpConnectionPage() {
  const [activeTab, setActiveTab] = useState('claude'); // 'claude' | 'chatgpt' | 'cursor' | 'api'
  const [copiedKey, setCopiedKey] = useState(null);
  const [testToolName, setTestToolName] = useState(null);
  const [testParams, setTestParams] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const showToast = useAppStore(state => state.showToast);

  const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'https://zerolens.in' : window.location.origin;
  const openApiUrl = `${serverUrl}/api/mcp/openapi.json`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (showToast) showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const claudeConfigJson = JSON.stringify({
    "mcpServers": {
      "zerolens-ai-studio": {
        "command": "node",
        "args": [
          "C:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/server/mcp/index.js"
        ],
        "env": {
          "API_BASE_URL": "https://zerolens.in"
        }
      }
    }
  }, null, 2);

  const claudeRemoteSseJson = JSON.stringify({
    "mcpServers": {
      "zerolens-ai-studio": {
        "url": "https://zerolens.in/api/mcp/sse"
      }
    }
  }, null, 2);

  const cursorConfigJson = JSON.stringify({
    "name": "zerolens-mcp",
    "type": "command",
    "command": "node C:/Users/Hemanth/Documents/zerolens/SANDBOX-AI-STUDIO/server/mcp/index.js"
  }, null, 2);

  const sampleNodeSnippet = `// Execute Seedance 2.0 via MCP Action REST API
const resp = await fetch('${serverUrl}/api/mcp/action/cinema_generate_video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Cinematic drone flythrough of a futuristic cyberpunk city at night with neon lights',
    engine: 'seedace', // Seedance 2.0
    aspectRatio: '16:9',
    resolution: '1080p',
    duration: 5
  })
});
const data = await resp.json();
console.log('Video Generation Task:', data);`;

  // Directory of all active MCP Tools
  const mcpToolsList = [
    {
      studio: 'Cinema Studio',
      icon: Film,
      color: 'text-fuchsia-400',
      bgColor: 'bg-fuchsia-500/10 border-fuchsia-500/20',
      tools: [
        {
          name: 'cinema_generate_video',
          desc: 'Generate high-end AI video using Seedance 2.0 (1080p/720p), Seedance Fast (480p/720p), Veo 3.1, or Omni Flash.',
          params: { prompt: 'Futuristic neon cyberpunk alley with raindrops', engine: 'seedace', resolution: '1080p', duration: 5 }
        },
        {
          name: 'cinema_generate_image',
          desc: 'Generate photorealistic/cinematic image masterworks using Nano Banana 2 or GPT Image Pro.',
          params: { prompt: 'Hyperrealistic portrait of a sci-fi astronaut, studio lighting', engine: 'nano-banana-2', aspectRatio: '16:9' }
        },
        {
          name: 'cinema_get_task_status',
          desc: 'Query real-time rendering status of async video generation tasks.',
          params: { taskId: 'seedance_task_123', engine: 'seedace' }
        },
        {
          name: 'cinema_list_user_assets',
          desc: 'Retrieve user asset gallery history across projects.',
          params: { limit: 10 }
        }
      ]
    },
    {
      studio: 'UGC Studio',
      icon: Video,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      tools: [
        {
          name: 'ugc_generate_ad_script',
          desc: 'Generate high-converting UGC ad script with hook, body, demonstration, and CTA.',
          params: { productName: 'Aura Glow Serum', platform: 'tiktok', targetAudience: 'Skincare enthusiasts' }
        },
        {
          name: 'ugc_generate_hook_variations',
          desc: 'Generate 5 viral visual & verbal hook variations for social ads.',
          params: { productDescription: 'Wireless noise-canceling headphones with 50-hour battery', niche: 'audio tech' }
        },
        {
          name: 'ugc_create_avatar_video',
          desc: 'Render AI spokesperson avatar video clip speaking a UGC script.',
          params: { scriptText: 'Stop scrolling! This 1-minute trick saved my morning routine.', avatarId: 'default_avatar' }
        }
      ]
    },
    {
      studio: 'Marketing Studio',
      icon: Megaphone,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      tools: [
        {
          name: 'marketing_generate_carousel',
          desc: 'Generate multi-slide Instagram/LinkedIn carousel card copy & layout directives.',
          params: { topic: '5 Secrets to Scaling E-Commerce Ads in 2026', slideCount: 5, brandTone: 'punchy' }
        },
        {
          name: 'marketing_clone_brand_voice',
          desc: 'Analyze brand text sample to extract a reusable voice profile (yourVoice).',
          params: { sampleText: 'We build minimalist software for creators who value speed and clarity.', brandName: 'ZeroLens' }
        },
        {
          name: 'marketing_create_full_campaign',
          desc: 'Generate a comprehensive product launch campaign kit with ad copy & prompts.',
          params: { productLaunchDetails: 'Launching ZeroLens AI Studio 2.0 with Seedance 2.0 video engine integration' }
        }
      ]
    }
  ];

  const handleRunToolTest = async (tool) => {
    setTestToolName(tool.name);
    setTestParams(tool.params);
    setTestResult(null);
    setIsExecuting(true);

    try {
      const resp = await fetch(`${serverUrl}/api/mcp/action/${tool.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool.params)
      });
      const data = await resp.json();
      setTestResult(JSON.stringify(data, null, 2));
      if (showToast) showToast(`Executed ${tool.name} successfully!`, 'success');
    } catch (err) {
      setTestResult(JSON.stringify({ error: err.message }, null, 2));
      if (showToast) showToast(`Execution failed: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#050505] text-white p-6 md:p-10 font-sans selection:bg-[#c8f135]/30 selection:text-[#c8f135] overflow-y-auto">
      
      {/* Background Decorative Glows */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[600px] bg-[#c8f135]/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[600px] bg-fuchsia-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── HEADER BANNER ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-black to-zinc-950 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#c8f135]/10 rounded-full blur-[90px] pointer-events-none group-hover:bg-[#c8f135]/20 transition-all duration-700" />

          <div className="space-y-3 z-10 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135]">
                <Sparkles className="w-3.5 h-3.5" /> Model Context Protocol v2.0
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live & Connected
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              MCP Connection Center
            </h1>

            <p className="text-white/60 text-xs md:text-sm leading-relaxed font-medium">
              Connect ZeroLens Sandbox AI Studio directly to <strong className="text-white">Claude Desktop</strong>, <strong className="text-white">ChatGPT Custom GPTs</strong>, <strong className="text-white">Cursor</strong>, and custom AI Agents. Trigger Seedance 2.0 1080p video renders, UGC scripts, and marketing carousels using natural language.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0 z-10 w-full md:w-auto">
            <button
              onClick={() => copyToClipboard(openApiUrl, 'header_link')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider hover:bg-[#d9ff43] transition-all shadow-lg shadow-[#c8f135]/20 active:scale-95"
            >
              {copiedKey === 'header_link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedKey === 'header_link' ? 'Copied OpenAPI Link!' : 'Copy OpenAPI Spec Link'}
            </button>
            <a
              href={openApiUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> View Live OpenAPI JSON
            </a>
          </div>
        </div>

        {/* ── PLATFORM INTEGRATION TABS ─────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-1.5 bg-zinc-950 border border-white/10 rounded-2xl overflow-x-auto">
            {[
              { id: 'claude', label: 'Claude Desktop', icon: Cpu, color: 'text-amber-400' },
              { id: 'chatgpt', label: 'ChatGPT Custom GPTs', icon: Globe, color: 'text-emerald-400' },
              { id: 'cursor', label: 'Cursor / Antigravity IDE', icon: Code, color: 'text-cyan-400' },
              { id: 'api', label: 'API & Agent Workflows', icon: Terminal, color: 'text-fuchsia-400' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white/10 border border-white/20 text-white shadow-lg'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${tab.color}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CLAUDE DESKTOP */}
          {activeTab === 'claude' && (
            <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-amber-400 flex items-center gap-2">
                    <Cpu className="w-5 h-5" /> Connect to Claude Desktop App
                  </h3>
                  <p className="text-white/60 text-xs mt-1">
                    Connect Claude Desktop to your local ZeroLens MCP Server via STDIO protocol.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(claudeConfigJson, 'claude_json')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold text-xs hover:bg-amber-400/20 transition-all shrink-0"
                >
                  {copiedKey === 'claude_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'claude_json' ? 'Copied Config!' : 'Copy Config JSON'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-white/70">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Step 1</span>
                  <p>Open Claude Desktop settings configuration file:</p>
                  <code className="block p-2 rounded-lg bg-zinc-950 text-amber-300 font-mono text-[10px] overflow-x-auto">
                    %APPDATA%\Claude\claude_desktop_config.json
                  </code>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Step 2</span>
                  <p>Paste the JSON config block below into your <code className="text-amber-300">mcpServers</code> section.</p>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Step 3</span>
                  <p>Restart Claude Desktop. You will see the <strong className="text-white">🔨 Hammer Icon</strong> active with ZeroLens tools!</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Option 1: Local STDIO Connection (Targeting https://zerolens.in)</h4>
                  <button
                    onClick={() => copyToClipboard(claudeConfigJson, 'claude_json')}
                    className="text-[10px] font-bold px-3 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-all"
                  >
                    {copiedKey === 'claude_json' ? 'Copied Option 1!' : 'Copy Option 1 JSON'}
                  </button>
                </div>
                <pre className="p-5 rounded-2xl bg-black/80 border border-white/10 text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed">
                  {claudeConfigJson}
                </pre>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Option 2: Remote HTTPS / SSE Connection (`https://zerolens.in/api/mcp/sse`)</h4>
                  <button
                    onClick={() => copyToClipboard(claudeRemoteSseJson, 'claude_sse_json')}
                    className="text-[10px] font-bold px-3 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-all"
                  >
                    {copiedKey === 'claude_sse_json' ? 'Copied Option 2!' : 'Copy Option 2 JSON'}
                  </button>
                </div>
                <pre className="p-5 rounded-2xl bg-black/80 border border-white/10 text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed">
                  {claudeRemoteSseJson}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: CHATGPT CUSTOM GPTS */}
          {activeTab === 'chatgpt' && (
            <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-emerald-400 flex items-center gap-2">
                    <Globe className="w-5 h-5" /> Connect to ChatGPT (Custom GPT Actions)
                  </h3>
                  <p className="text-white/60 text-xs mt-1">
                    ChatGPT uses HTTP OpenAPI REST actions. Import the live schema URL directly into your Custom GPT.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(openApiUrl, 'chatgpt_url')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-bold text-xs hover:bg-emerald-400/20 transition-all shrink-0"
                >
                  {copiedKey === 'chatgpt_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'chatgpt_url' ? 'Copied URL!' : 'Copy OpenAPI URL'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-white/70">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Step 1</span>
                  <p>In ChatGPT, go to <strong className="text-white">Explore GPTs</strong> → <strong className="text-white">Create a GPT</strong> → <strong className="text-white">Configure</strong>.</p>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Step 2</span>
                  <p>Scroll down to <strong className="text-white">Actions</strong> → Click <strong className="text-white">Create new action</strong> → Click <strong className="text-white">Import from URL</strong>.</p>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Step 3</span>
                  <p>Paste the live OpenAPI URL below and click <strong className="text-white">Import</strong>. All studio tools will instantly populate!</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/80 border border-white/10 flex items-center justify-between gap-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                <span>{openApiUrl}</span>
                <a
                  href={openApiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-sans text-xs font-bold hover:bg-emerald-500/30 transition-all shrink-0"
                >
                  Open JSON
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: CURSOR / ANTIGRAVITY */}
          {activeTab === 'cursor' && (
            <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-cyan-400 flex items-center gap-2">
                    <Code className="w-5 h-5" /> Connect to Cursor / Antigravity IDE
                  </h3>
                  <p className="text-white/60 text-xs mt-1">
                    Add ZeroLens MCP Server to Cursor Features → MCP Servers settings panel.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(cursorConfigJson, 'cursor_json')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 font-bold text-xs hover:bg-cyan-400/20 transition-all shrink-0"
                >
                  {copiedKey === 'cursor_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'cursor_json' ? 'Copied Config!' : 'Copy Config'}
                </button>
              </div>

              <pre className="p-5 rounded-2xl bg-black/80 border border-white/10 text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
                {cursorConfigJson}
              </pre>
            </div>
          )}

          {/* TAB 4: API & AGENTS */}
          {activeTab === 'api' && (
            <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-fuchsia-400 flex items-center gap-2">
                    <Terminal className="w-5 h-5" /> Direct REST Action Execution
                  </h3>
                  <p className="text-white/60 text-xs mt-1">
                    Call any MCP tool action via standard HTTP POST requests from Node.js, Python, or N8N workflows.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(sampleNodeSnippet, 'api_code')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/30 text-fuchsia-400 font-bold text-xs hover:bg-fuchsia-400/20 transition-all shrink-0"
                >
                  {copiedKey === 'api_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'api_code' ? 'Copied Snippet!' : 'Copy Code'}
                </button>
              </div>

              <pre className="p-5 rounded-2xl bg-black/80 border border-white/10 text-fuchsia-300 font-mono text-xs overflow-x-auto leading-relaxed">
                {sampleNodeSnippet}
              </pre>
            </div>
          )}
        </div>

        {/* ── ACTIVE MCP TOOLS EXPLORER & RUNNER ───────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#c8f135]" /> Active Studio Tools Directory
              </h2>
              <p className="text-white/50 text-xs mt-1">
                Explore all 10 registered MCP tools across Cinema, UGC, and Marketing Studios. Click <strong className="text-white">Run Test</strong> to execute in real time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mcpToolsList.map((group, gIdx) => (
              <div key={gIdx} className="space-y-4">
                <div className={`flex items-center gap-2.5 p-3 rounded-2xl border ${group.bgColor}`}>
                  <group.icon className={`w-5 h-5 ${group.color}`} />
                  <h3 className={`font-black text-xs uppercase tracking-wider ${group.color}`}>
                    {group.studio}
                  </h3>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {group.tools.length} Tools
                  </span>
                </div>

                <div className="space-y-3">
                  {group.tools.map((tool, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/15 transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <code className="text-xs font-bold text-[#c8f135] font-mono group-hover:text-white transition-colors">
                          {tool.name}
                        </code>
                        <button
                          onClick={() => handleRunToolTest(tool)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] font-bold text-[10px] hover:bg-[#c8f135] hover:text-black transition-all shrink-0 active:scale-95"
                        >
                          <Play className="w-3 h-3" /> Run Test
                        </button>
                      </div>

                      <p className="text-white/60 text-xs leading-normal">
                        {tool.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TEST RUNNER MODAL / RESULTS BOARD ─────────────────────── */}
        {testToolName && (
          <div className="p-6 md:p-8 rounded-3xl bg-zinc-900 border border-white/15 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#c8f135] animate-ping" />
                <h3 className="text-lg font-black text-white font-mono">
                  Test Execution: {testToolName}
                </h3>
              </div>
              <button
                onClick={() => setTestToolName(null)}
                className="text-xs text-white/50 hover:text-white px-3 py-1 rounded-lg bg-white/5"
              >
                Close Runner
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Payload Parameters</span>
                <pre className="p-4 rounded-2xl bg-black border border-white/10 text-white/80 overflow-x-auto">
                  {JSON.stringify(testParams, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  Response Output {isExecuting && <RefreshCw className="w-3 h-3 animate-spin text-[#c8f135]" />}
                </span>
                <pre className="p-4 rounded-2xl bg-black border border-white/10 text-[#c8f135] overflow-x-auto max-h-64">
                  {isExecuting ? 'Executing tool action...' : (testResult || 'Awaiting response...')}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
