# 🏗️ SANDBOX-AI-STUDIO — Full Architecture Report

> **Generated:** 2026-05-28  
> **Purpose:** Complete deep-dive of every file, every layer, every bug — plus an action plan to reach production-standard quality.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack](#2-tech-stack)
3. [Full Directory Map](#3-full-directory-map)
4. [Layer-by-Layer Analysis](#4-layer-by-layer-analysis)
   - [Entry Points](#41-entry-points)
   - [Frontend Routing & App Shell](#42-frontend-routing--app-shell)
   - [Global State — Zustand Store](#43-global-state--zustand-store)
   - [Config Layer](#44-config-layer)
   - [UI Components — Pages](#45-ui-components--pages)
   - [UI Components — Panels](#46-ui-components--panels)
   - [UI Components — Canvas / Nodes / Edges](#47-ui-components--canvas--nodes--edges)
   - [UI Components — Common](#48-ui-components--common)
   - [Frontend Services (src/services)](#49-frontend-services-srcservices)
   - [Frontend Hooks](#410-frontend-hooks)
   - [Frontend Lib](#411-frontend-lib)
   - [Frontend Utils & Engine](#412-frontend-utils--engine)
   - [Backend — server.js (Monolith)](#413-backend--serverjs-monolith)
   - [Backend Services (/services)](#414-backend-services-services)
   - [Database — Supabase](#415-database--supabase)
   - [Storage — GCS + Cloudflare R2](#416-storage--gcs--cloudflare-r2)
   - [Scripts Folder](#417-scripts-folder)
   - [Docs Folder](#418-docs-folder)
   - [Build & Deploy Config](#419-build--deploy-config)
5. [Bugs & Issues Catalogue](#5-bugs--issues-catalogue)
6. [Security Issues](#6-security-issues)
7. [Dead Code & Bloat](#7-dead-code--bloat)
8. [Action Plan — Keep / Change / Delete / Rewrite](#8-action-plan--keep--change--delete--rewrite)
9. [Recommended Folder Structure (Standard Webapp)](#9-recommended-folder-structure-standard-webapp)
10. [Priority Checklist](#10-priority-checklist)

---

## 1. Project Identity

| Property | Value |
|----------|-------|
| **Name** | CineMAI / SANDBOX-AI-STUDIO |
| **Type** | AI Creative Studio — Image & Video Generation SaaS |
| **Frontend** | React 18 + Vite 5 + TailwindCSS 3 |
| **Backend** | Node.js (ES Modules) + Express 5 — **single `server.js` monolith** (6,556 lines) |
| **Database** | Supabase (PostgreSQL) |
| **Primary Storage** | Google Cloud Storage (GCS) + Cloudflare R2 CDN |
| **AI APIs** | Google Gemini (Image/Video/TTS), Vertex AI (Veo 3.1), OpenAI, Kling, FAL.ai |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Payments** | Razorpay (webhook-based credit system) |
| **Queue** | BullMQ + Redis (optional, falls back to in-memory) |
| **Deployment** | Railway + Docker |
| **Port** | Frontend → `5173`, Backend → `3002`, Production → `8080` |

---

## 2. Tech Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | DOM rendering |
| `vite` | ^5.4.1 | Build tool |
| `tailwindcss` | ^3.4.4 | Styling |
| `zustand` | ^5.0.11 | Global state |
| `reactflow` | ^11.11.4 | Node graph canvas (Standardized) |
| `@xyflow/react` | *Removed* | Uninstalled to prevent version mismatch conflicts |
| `framer-motion` | ^11.18.2 | Animations |
| `lucide-react` | ^0.344.0 | Icons |
| `@google/genai` | ^1.42.0 | Gemini SDK (New - Standardized) |
| `@google/generative-ai` | *Removed* | Uninstalled legacy library |
| `@dnd-kit/*` | various | Drag and drop |
| `pdfjs-dist` | ^4.8.69 | PDF support |
| `@ffmpeg/ffmpeg` | ^0.12.15 | Browser FFmpeg |
| `driver.js` | ^1.4.0 | Onboarding tooltips |
| `@supabase/supabase-js` | ^2.78.0 | Database client |

### Backend (server.js)
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | HTTP server |
| `cors` | ^2.8.6 | Cross-origin |
| `dotenv` | ^17.2.4 | Environment vars |
| `compression` | ^1.8.1 | Gzip |
| `express-rate-limit` | ^8.2.1 | Rate limiting |
| `multer` | ^2.0.2 | File uploads |
| `bullmq` | ^5.71.0 | Job queue |
| `ioredis` | ^5.10.0 | Redis client |
| `@google-cloud/storage` | ^7.19.0 | GCS |
| `@google-cloud/text-to-speech` | ^6.4.0 | TTS |
| `google-auth-library` | ^10.6.1 | Google OAuth |
| `openai` | ^6.37.0 | OpenAI SDK |
| `fluent-ffmpeg` + `ffmpeg-static` | various | Server-side video processing |
| `playwright` | ^1.60.0 | Headless browser (carousel export) |
| `@aws-sdk/client-s3` | ^3.967.0 | R2 (S3-compatible) |
| `node-fetch` | ^3.3.2 | Polyfill fetch |
| `uuid` | (via `import { v4 as uuidv4 }`) | **MISSING from package.json!** |

> ⚠️ **Critical**: `uuid` is imported in `server.js` line 67 but is NOT listed in `package.json`. This will crash in production after a clean install.

---

## 3. Full Directory Map

```
SANDBOX-AI-STUDIO--main/
│
├── src/                        ← React frontend
│   ├── main.jsx                ← App entry (minimal, good)
│   ├── App.jsx                 ← Routing shell (tab-based, NOT URL-based)
│   ├── App.css                 ← Minimal global styles
│   ├── index.css               ← TailwindCSS base + custom vars (7KB)
│   ├── output.css              ← ⚠️ PRE-BUILT Tailwind output (117KB) — should be gitignored
│   ├── store.js                ← Zustand global store (635 lines, LARGE)
│   ├── storyboardConfig.js     ← Storyboard template config
│   ├── types.js                ← Basic type definitions
│   ├── vite-env.d.ts           ← Vite types
│   │
│   ├── assets/                 ← SVGs, favicons
│   │   ├── acs-icon.svg
│   │   ├── favicon-chrome.png
│   │   ├── react.svg           ← ⚠️ Default Vite placeholder — DELETE
│   │   └── zerolens-favicon.svg
│   │
│   ├── components/
│   │   ├── canvas/             ← React Flow canvas wrappers
│   │   │   ├── FocusOverlay.jsx
│   │   │   ├── PlaygroundCanvas.jsx
│   │   │   └── ViewportToggle.jsx
│   │   │
│   │   ├── common/             ← Shared UI atoms
│   │   │   ├── BrandLogo.jsx
│   │   │   ├── ImageEditorModal.jsx
│   │   │   ├── ModelSelector.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── zerolens-logo-kit.html    ← ⚠️ Static HTML — NOT a React component
│   │   │   └── zerolens_concept02_refined.html ← ⚠️ Static HTML concept file — DELETE
│   │   │
│   │   ├── edges/              ← Custom React Flow edges
│   │   │   ├── MagneticHandle.jsx
│   │   │   ├── NeuralEdge.jsx
│   │   │   └── WaveformEdge.jsx
│   │   │
│   │   ├── nodes/              ← Custom React Flow nodes
│   │   │   ├── IdentityNode.jsx
│   │   │   ├── InfluencerNode.jsx
│   │   │   ├── NanoBananaNode.jsx
│   │   │   └── OutputNode.jsx
│   │   │   ├── Seedance15ProNode.jsx
│   │   │   └── SeedanceNode.jsx
│   │   │
│   │   ├── pages/              ← Full-page views (route-level)
│   │   │   ├── AgentPage.jsx       (22KB)
│   │   │   ├── AuthPage.jsx        (24KB)
│   │   │   ├── BrandVoicePage.jsx  (18KB)
│   │   │   ├── CarouselStudio.jsx  (129KB) ⚠️ MASSIVE
│   │   │   ├── DirectorStudio.jsx  (105KB) ⚠️ MASSIVE
│   │   │   ├── LandingPage.jsx     (81KB)  ⚠️ VERY LARGE
│   │   │   ├── Layout.jsx          (2KB, minimal)
│   │   │   ├── MarketingStudio.jsx (141KB) ⚠️ MASSIVE
│   │   │   ├── PodcastStudio.jsx   (58KB)
│   │   │   ├── PricingPage.jsx     (18KB)
│   │   │   ├── PromptGenerator.jsx (54KB) ← PAGE-level (different from panels!)
│   │   │   ├── SettingsPage.jsx    (40KB)
│   │   │   └── UGC.tsx             (392KB) ⚠️ LARGEST FILE IN PROJECT
│   │   │
│   │   └── panels/             ← Sub-panel components embedded in pages
│   │       ├── AssetManager.jsx    (42KB)
│   │       ├── AssetsLibrary.jsx   (36KB)
│   │       ├── CameraGuide.jsx     (38KB)
│   │       ├── DirectorHUD.jsx     (43KB)
│   │       ├── ForgeView.jsx       (48KB)
│   │       ├── InfluencerStudio.jsx (54KB)
│   │       ├── MobileNav.jsx       (9KB)
│   │       ├── MultiShotView.jsx   (41KB)
│   │       ├── PromptBuilder.jsx   (15KB)
│   │       ├── PromptGenerator.jsx (302KB) ⚠️ LARGEST FRONTEND FILE
│   │       ├── Sidebar.jsx         (13KB)
│   │       ├── SonicDock.jsx       (5KB)
│   │       ├── StoryboardView.jsx  (35KB)
│   │       └── gen-lang-client-0692650759-484613544724.json ⚠️ SECURITY: SERVICE ACCOUNT KEY IN SRC!
│   │
│   ├── config/
│   │   ├── apiConfig.js        ← URL helpers (good, well written)
│   │   ├── hudConfig.js        ← Director HUD config
│   │   ├── landingAssets.js    ← Landing page media config
│   │   └── shortsConfig.js     ← Credit costs per action
│   │
│   ├── engine/
│   │   └── autoStoryEngine.js  ← Story generation helper
│   │
│   ├── hooks/
│   │   ├── useShorts.js        ← Credits hook
│   │   └── useWebSocket.js     ← WS connection hook
│   │
│   ├── lib/
│   │   ├── supabase.js         ← Client init (safe, null-guarded)
│   │   └── utils.js            ← Empty / stub (137 bytes)
│   │
│   ├── services/
│   │   ├── geminiService.js    (65KB — 1,445 lines) — Core AI service
│   │   ├── narrativeTrainer.js (4KB)
│   │   └── supabaseService.js  (3KB)
│   │
│   └── utils/
│       ├── favicon.js          ← Favicon animation
│       └── identityPrompts.js  ← Identity prompt templates
│
├── services/                   ← SERVER-side service modules
│   ├── audioService.js
│   ├── cacheService.js
│   ├── carouselGenerator.js    (60KB — carousel HTML generation)
│   ├── gcsService.js
│   ├── locationAnalyzerService.js
│   ├── masterExportService.js
│   ├── moodBoardService.js
│   ├── musicService.js
│   ├── productService.js
│   ├── queueService.js
│   ├── storageService.js       (GCS + R2 unified)
│   ├── vectorService.js
│   ├── visionService.js
│   ├── wardrobeAnalyzerService.js
│   ├── workspaceService.js
│   │
│   ├── creativeDirection/      ← AI creative pipeline
│   │   ├── chatSystem.js       (30KB)
│   │   ├── creativeBriefEngine.js
│   │   ├── designDNA.js
│   │   ├── designScoring.js    (13KB)
│   │   ├── hermesMemory.js     (10KB — AI memory system)
│   │   ├── index.js
│   │   ├── promptCompiler.js   (13KB)
│   │   └── slideNarrative.js   (10KB)
│   │
│   ├── design/                 ← Carousel design system
│   │   ├── backgrounds.js
│   │   ├── hierarchy.js
│   │   ├── index.js
│   │   ├── semantic.js
│   │   ├── styles.js
│   │   ├── tokens.js
│   │   └── (6 files total)
│   │
│   └── slides/                 ← Carousel slide templates
│       ├── cta.js
│       ├── details.js
│       ├── features.js
│       ├── hero.js
│       ├── howto.js
│       ├── index.js
│       ├── problem.js
│       ├── solution.js
│       └── utils.js            (10KB)
│
├── scripts/                    ← Dev/debug scripts (32 files)
│   ├── test_*.js               ← ~20 test scripts
│   ├── diag_*.js               ← Diagnostic scripts
│   ├── check_*.js              ← Health check scripts
│   ├── *.json                  ← Model list snapshots
│   └── test-load.yml           ← Load testing config
│
├── supabase/
│   ├── migrations/             ← 7 SQL migration files
│   │   ├── 20240323_landing_assets.sql
│   │   ├── 20260310_fix_shorts.sql
│   │   ├── 20260310_shorts_tables.sql
│   │   ├── 20260316_profiles_settings_columns.sql
│   │   ├── 20260323_billing_history.sql
│   │   ├── 20260324_scene_templates.sql
│   │   └── 20260508_marketing_templates.sql
│   ├── setup_camera_angles.sql
│   └── setup_dashboard.sql
│
├── docs/                       ← 13 markdown docs
│   ├── AI_POWERED_ROADMAP.md
│   ├── DIRECTOR_OPERATIONS.md
│   ├── GEMINI_API_COOKBOOK.md
│   ├── GOOGLE_API_IMPLEMENTATION_GUIDE.md
│   ├── MIGRATION_GUIDE.md
│   ├── NODE_ARCHITECTURE.md
│   ├── PRODUCTION_REPORT.md
│   ├── SUPABASE_SETUP.md
│   ├── VEO3_PROMPTING_GUIDE.md
│   ├── google_api_pricing_reference.md
│   ├── kling_kie_api.md
│   ├── ugc_pricing.md
│   └── zerolens_pricing.md
│
├── public/                     ← Static public assets
├── dist/                       ← Build output (gitignored)
├── scratch/                    ← Dev scratch space
│
├── server.js                   ← ⚠️ MONOLITH — 6,556 lines!
├── package.json
├── vite.config.js
├── tailwind.config.js
├── tsconfig.json               ← TypeScript config (but 95% of files are .js/.jsx!)
├── eslint.config.js
├── Dockerfile
├── railway.json
├── cors.json
├── .env                        ← ⚠️ Contains live API keys & private keys
├── .gitignore                  ← .env IS gitignored ✅
│
├── gen-lang-client-0438096272-2caf3e3dbd1d.json  ← ⚠️ GCS SERVICE ACCOUNT (root)
├── gen-lang-client-0438096272-33d55abedb33.json  ← ⚠️ GCS SERVICE ACCOUNT (root)
├── gen-lang-client-0438096272-veo.json           ← ⚠️ VERTEX AI SERVICE ACCOUNT (root)
├── local_assets.json
└── models_list.json
```

---

## 4. Layer-by-Layer Analysis

### 4.1 Entry Points

| File | Status | Notes |
|------|--------|-------|
| `index.html` | ✅ Good | Standard Vite HTML, correct title |
| `src/main.jsx` | ✅ Good | Clean, minimal. No `<StrictMode>` — add it back for dev warnings |
| `src/App.jsx` | ⚠️ Needs work | Tab-based "routing" (not URL-based). No React Router. See §4.2 |

---

### 4.2 Frontend Routing & App Shell

**Current approach**: A Zustand `activeTab` state string controls which component renders. There is **no URL router**.

**Problems**:
- No browser back/forward navigation
- Can't share links to specific pages (e.g., `/ugc`, `/settings`)
- Every page is eagerly mounted in `tabComponents` object — all 16 pages are created on first render
- `'forge'` and `'creator'` both render `<ForgeView>` — duplicate route definition
- `'playground'` and `'directors-cut'` both render `<PlaygroundCanvas>` — another duplicate
- Password reset modal uses `window.alert()` — non-standard UX

**Required action**: Implement `react-router-dom` (see §8).

---

### 4.3 Global State — Zustand Store (`src/store.js`)

**Size**: 635 lines | **Complexity**: HIGH

**Issues found**:

1. **`setCachedAssets` defined TWICE** (lines 93-97 AND line 161). The second definition overwrites the first. The first version extracts `userId` from payload; the second takes separate params. This is a bug.

2. **`updateNodeData` defined TWICE** (lines 244-250 AND lines 623-629). Same logic, one will silently overwrite.

3. **`cachedAssets` and `isAssetsLoading` declared TWICE** in the initial state object (lines 26-28 and lines 89-91). JavaScript objects allow duplicate keys — later one wins. Silent bug.

4. **`generateStoryboard`** is a stub (`console.log` + no actual logic).

5. **`syncCurrentSession`** is a stub (just waits 1 second, no actual sync).

6. **Direct Supabase mutation in `spendShorts`**: Updates `shorts_balance` directly from the client store instead of through a backend RPC. This bypasses row-level security effectively — malicious clients can manipulate balance by calling this directly.

7. **Profile cache is a module-level variable**: `_profileCache` lives outside Zustand — not reactive, not clearable via `clearSession()`.

8. **No TypeScript types**: All store state is untyped despite TypeScript being in devDependencies.

---

### 4.4 Config Layer (`src/config/`)

| File | Status | Notes |
|------|--------|-------|
| `apiConfig.js` | ✅ Good | Well-structured URL resolver, base64 detection, proxy routing |
| `shortsConfig.js` | ✅ Good | Clean credit cost map |
| `hudConfig.js` | ✅ Good | Director HUD config |
| `landingAssets.js` | ✅ Good | Landing media assets |

---

### 4.5 UI Components — Pages (`src/components/pages/`)

| File | Size | Status | Issue |
|------|------|--------|-------|
| `Layout.jsx` | 2KB | ✅ Good | Thin wrapper — correct |
| `AuthPage.jsx` | 24KB | ⚠️ Oversized | Should be split into `LoginForm`, `SignupForm`, `OAuthButton` |
| `LandingPage.jsx` | 81KB | 🔴 Critical | Single file for entire landing — needs to be broken into sections |
| `PricingPage.jsx` | 18KB | ✅ Acceptable | Manageable size |
| `SettingsPage.jsx` | 40KB | ⚠️ Large | Should split into `ProfileSettings`, `BillingSettings`, etc. |
| `BrandVoicePage.jsx` | 18KB | ✅ Acceptable | Fine |
| `AgentPage.jsx` | 22KB | ✅ Acceptable | Fine |
| `PodcastStudio.jsx` | 58KB | ⚠️ Large | Should split |
| `DirectorStudio.jsx` | 105KB | 🔴 Critical | Far too large. Split into sub-components |
| `CarouselStudio.jsx` | 129KB | 🔴 Critical | Far too large. Split into sub-components |
| `MarketingStudio.jsx` | 141KB | 🔴 Critical | Largest page file. Must split |
| `UGC.tsx` | 392KB | 🔴 CRITICAL | **Largest file in project. 392KB single component.** Immediate refactor required |
| `PromptGenerator.jsx` | 54KB | ⚠️ Large | Page-level version (different from panel version) |

> ⚠️ **Note**: `UGC.tsx` is a TypeScript file in an otherwise JavaScript project. There's also a `PromptGenerator.jsx` in BOTH `pages/` and `panels/` — naming collision.

---

### 4.6 UI Components — Panels (`src/components/panels/`)

| File | Size | Status | Issue |
|------|------|--------|-------|
| `Sidebar.jsx` | 13KB | ✅ Acceptable | Navigation sidebar |
| `MobileNav.jsx` | 9KB | ✅ Good | Mobile navigation |
| `SonicDock.jsx` | 5KB | ✅ Good | Audio dock |
| `PromptBuilder.jsx` | 15KB | ✅ Acceptable | Prompt composition |
| `AssetsLibrary.jsx` | 36KB | ⚠️ Large | Asset browser |
| `AssetManager.jsx` | 42KB | ⚠️ Large | Admin asset manager |
| `StoryboardView.jsx` | 35KB | ⚠️ Large | Storyboard UI |
| `MultiShotView.jsx` | 41KB | ⚠️ Large | Multi-shot interface |
| `DirectorHUD.jsx` | 43KB | ⚠️ Large | Director controls panel |
| `CameraGuide.jsx` | 38KB | ⚠️ Large | Camera guide overlay |
| `ForgeView.jsx` | 48KB | ⚠️ Large | Character forge view |
| `InfluencerStudio.jsx` | 54KB | ⚠️ Large | Influencer studio panel |
| `PromptGenerator.jsx` | 302KB | 🔴 CRITICAL | **302KB single panel!** Must split immediately |
| `gen-lang-client-*.json` | 2KB | 🔴 SECURITY | **SERVICE ACCOUNT KEY COMMITTED INSIDE SRC FOLDER** |

---

### 4.7 UI Components — Canvas / Nodes / Edges

| File | Status | Notes |
|------|--------|-------|
| `PlaygroundCanvas.jsx` | ✅ OK | React Flow canvas wrapper |
| `FocusOverlay.jsx` | ✅ OK | Focus mode overlay (16KB) |
| `ViewportToggle.jsx` | ✅ OK | View switcher |
| `IdentityNode.jsx` | ✅ OK | Character identity node |
| `InfluencerNode.jsx` | ✅ OK | Model/influencer node |
| `NanoBananaNode.jsx` | ✅ OK | Gemini 3.1 image node |
| `SeedanceNode.jsx` | ⚠️ Large (30KB) | Seedance 2.0 node |
| `Seedance15ProNode.jsx` | ⚠️ Large (26KB) | Seedance 1.5 Pro node |
| `OutputNode.jsx` | ✅ OK | Output display node |
| `NeuralEdge.jsx` | ✅ OK | Animated edge |
| `WaveformEdge.jsx` | ✅ OK | Waveform animated edge |
| `MagneticHandle.jsx` | ✅ OK | Custom handle (1.7KB) |

**Issue**: Both `reactflow` AND `@xyflow/react` are installed — these are the same library at different version epochs. Pick one and remove the other.

---

### 4.8 UI Components — Common

| File | Status | Notes |
|------|--------|-------|
| `BrandLogo.jsx` | ✅ Good | Logo component |
| `Toast.jsx` | ✅ Good | Notification system |
| `ModelSelector.jsx` | ✅ Good | AI model picker |
| `ImageEditorModal.jsx` | ✅ Good | Image edit modal |
| `zerolens-logo-kit.html` | ⚠️ Misplaced | Static HTML — belongs in `/public` or `/docs` |
| `zerolens_concept02_refined.html` | 🔴 Delete | Old concept file — dead code |

---

### 4.9 Frontend Services (`src/services/`)

| File | Size | Status | Notes |
|------|------|--------|-------|
| `geminiService.js` | 65KB (1,445 lines) | ⚠️ Very Large | Core AI client — well written but enormous. Should split by domain (image, video, audio, analysis) |
| `narrativeTrainer.js` | 4KB | ✅ Good | Narrative fine-tuning helpers |
| `supabaseService.js` | 3KB | ✅ Good | Supabase CRUD helpers |

**Key issue in `geminiService.js`**:
- Hardcoded model name `'gemini-3-pro-image-preview'` in `generateSurgicalRepair` — this model does not exist. Should be `gemini-3.1-pro-image`.
- `generateLipSyncVideo` throws intentionally at the end of the standalone path: `throw new Error('Please use the frontend Google GenAI SDK for Veo video generation.')` — the standalone fallback is dead and broken by design.
- API key is checked via `window.__VEO_API_KEY__` — a global window variable. This is insecure and non-standard.
- `cacheUniverseBible` only fires if bible text exceeds 130,000 chars (Gemini 32K token minimum). The comment is correct but this means it almost never runs.

---

### 4.10 Frontend Hooks

| File | Status | Notes |
|------|--------|-------|
| `useWebSocket.js` | ✅ Good | WS connection with auto-reconnect |
| `useShorts.js` | ⚠️ Issue | Very thin wrapper — may not be needed if store handles credits |

---

### 4.11 Frontend Lib

| File | Status | Notes |
|------|--------|-------|
| `supabase.js` | ✅ Good | Null-safe Supabase client init |
| `utils.js` | ✅ Good | Exports standard `cn` Tailwind styling utility |

---

### 4.12 Frontend Utils & Engine

| File | Status | Notes |
|------|--------|-------|
| `utils/favicon.js` | ✅ Good | Animated favicon (fun feature) |
| `utils/identityPrompts.js` | ✅ Good | Identity prompt templates |
| `engine/autoStoryEngine.js` | ✅ Good | Story decomposition engine |

---

### 4.13 Backend — `server.js` (Monolith)

**Size**: **6,556 lines** (~296KB). This is the most critical architectural problem.

**Structure inside `server.js`** (manually catalogued):

| Section | Lines (approx) | Description |
|---------|---------------|-------------|
| Imports & Auth Setup | 1–240 | dotenv, express, GCS, Vertex AI auth, OpenAI |
| Redis / BullMQ Setup | 241–388 | Queue init with TCP probe |
| Express App Setup | 390–740 | Middleware, CORS, rate limiting, static serving |
| Razorpay Webhook | 632–728 | Payment processing + credit allocation |
| Health / Ping endpoints | 393–575 | `/api/health-check`, `/api/ping-vertex`, etc. |
| Image Generation (`handleGoogle`) | ~800–1500 | Core image gen router (Gemini + Kling + FAL) |
| Video Generation (Veo) | ~1500–2200 | Vertex AI Veo video generation |
| UGC Endpoints | ~2200–3000 | `/api/ugc/*` — video, image, speech |
| Forge Endpoints | ~3000–3500 | `/api/forge/*` — analyze, generate, repair |
| Carousel Generation | ~3500–4000 | `/api/carousel/*` |
| Marketing/Creative | ~4000–4500 | `/api/creative-direction/*`, `/api/marketing/*` |
| Storage / GCS / R2 | ~4500–5000 | Asset upload, delete, list |
| Asset Proxy | ~5000–5200 | CORS proxy for external URLs |
| Admin endpoints | ~5200–5500 | Asset management |
| WS + Server start | ~5500–6556 | WebSocket, port listen |

**Critical Issues in `server.js`**:

1. **`uuid` missing from package.json** — used on line 67, but not in `dependencies`.

2. **`handleGoogle` function** (the central image/video routing function) is likely 500–1000+ lines of inline code that handles 10+ different AI models. Not confirmed but structurally inferred from context.

3. **Hardcoded `localhost` Referer** in Gemini client config (lines 213–227): `'Referer': 'http://localhost:5173/'`. In production, this sends `localhost` as referer to Google APIs — this will cause API key restriction failures if the key is locked to a production domain.

4. **Razorpay webhook has no signature verification** (lines 632–728). Anyone can POST to `/api/webhook/razorpay` with a fake `payment.captured` event and add credits to any user ID. **This is a critical security vulnerability.**

5. **Memory guard threshold**: 3500MB heap limit (line 605) is very high — suggests the server runs with enormous memory usage.

6. **Rate limit applied AFTER Razorpay webhook** (line 738 `app.use('/api/', apiLimiter)`) but the webhook is registered at line 632 — it's exempt from rate limiting because it's defined before the `app.use`. This may be intentional but worth noting.

7. **SEO static routes** (lines 621–624) point to `dist/real-estate/index.html` etc. which don't exist unless a special multi-entry Vite build is done. These will 404 in production.

8. **`supabaseAdmin`** is referenced inside Razorpay webhook (line 667) but there's no guarantee it's initialized before the webhook handler runs — depends on import order in the monolith.

---

### 4.14 Backend Services (`/services/`)

| File | Size | Status | Notes |
|------|------|--------|-------|
| `storageService.js` | 8KB | ✅ Good | Unified GCS + R2 storage |
| `carouselGenerator.js` | 60KB | ⚠️ Very Large | HTML carousel generation — uses Playwright for screenshots |
| `wardrobeAnalyzerService.js` | 6KB | ✅ Good | Image analysis for wardrobe |
| `locationAnalyzerService.js` | 4KB | ✅ Good | Location image analysis |
| `productService.js` | 4KB | ✅ Good | Product image analysis |
| `moodBoardService.js` | 2KB | ✅ Good | Mood board creation |
| `visionService.js` | 2KB | ✅ Good | Image vision analysis |
| `vectorService.js` | 2KB | ✅ Good | Vector/embedding service |
| `audioService.js` | 2KB | ✅ Good | Audio generation wrapper |
| `musicService.js` | 2KB | ✅ Good | Music service |
| `cacheService.js` | 2KB | ✅ Good | Cache helpers |
| `gcsService.js` | 1KB | ✅ Good | GCS wrapper |
| `workspaceService.js` | 1KB | ✅ Good | Workspace management |
| `masterExportService.js` | 5KB | ✅ Good | Export orchestration |
| `queueService.js` | 1KB | ⚠️ Thin | May be redundant with inline queue in server.js |
| `creativeDirection/` | ~100KB total | ⚠️ Complex | Full AI creative pipeline — well structured |
| `design/` | ~50KB total | ✅ Good | Design token system |
| `slides/` | ~40KB total | ✅ Good | Slide template generators |

---

### 4.15 Database — Supabase

**Tables identified from migrations and code**:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles, tier, `shorts_balance` |
| `assets` | User-generated assets (images/videos) |
| `shorts_transactions` | Credit debit/credit audit log |
| `billing_history` | Payment history |
| `scene_templates` | Director scene templates |
| `marketing_templates` | Marketing carousel templates |
| `landing_assets` | Landing page dynamic assets |

**Issues**:
- `shorts_balance` can be updated directly from the frontend store (`spendShorts` in store.js) — bypasses RLS. Should only be modifiable via server-side RPC.
- No `supabase/config.toml` — the project uses manual SQL migrations, not Supabase CLI.

---

### 4.16 Storage — Cloudflare R2 Primary + GCS Fallback (Enterprise Standard)

- **R2 (Cloudflare)**: **PRIMARY storage bucket** (`zerolensbucket-cdn`). Standardized as primary because of **$0 Egress internet bandwidth fees**, saving thousands in monthly CDN download bills. Serves all generated images/videos directly via public CDN endpoint `https://pub-05a4fe33e706492e8d437c36f9a8aa94.r2.dev`.
- **GCS (Google Cloud Storage)**: **FALLBACK/TRANSIT storage bucket** (`zerolensbucket_1`). Used primarily to receive native Vertex AI Veo video generation outputs, which are then mirrored to R2 and served. GCS bucket is configured with lifecycle rules to purge temporary files and keep Google Cloud storage fees to an absolute minimum.
- **Proxy**: All external URLs are processed through `/api/proxy/asset` or served directly via the egress-free R2 CDN bucket for flawless, CORS-compliant frontend viewing.

### 4.17 Scripts Folder

**32 files** — all diagnostic/test scripts from development. **None are part of the application.**

These should be moved to a `dev-tools/` folder or deleted if no longer needed. They pollute the root with `test_gemini_phase1.js`, `test_key.js`, `verify_token.js`, etc.

---

### 4.18 Docs Folder

**13 markdown files** — excellent documentation. Well-organized. Keep all of these.

Missing docs that would be useful:
- `SETUP.md` — local dev setup guide
- `API_REFERENCE.md` — all `/api/*` endpoints
- `CONTRIBUTING.md`

---

### 4.19 Build & Deploy Config

| File | Status | Notes |
|------|--------|-------|
| `vite.config.js` | ✅ Good | Clean, proxy to `:3002` |
| `tailwind.config.js` | ✅ Good | Standard config |
| `tsconfig.json` | ⚠️ Misleading | TypeScript config exists but nearly all files are `.js/.jsx`. Only `UGC.tsx` uses TS. |
| `Dockerfile` | ✅ Good | Multi-stage build, production-ready |
| `railway.json` | ✅ Good | Dockerfile-based Railway deploy |
| `cors.json` | ✅ Good | GCS CORS configuration |
| `eslint.config.js` | ✅ Good | ESLint with React rules |
| `package.json` | ⚠️ Issues | Missing `uuid` dependency; two Gemini SDKs; two React Flow packages |

---

## 5. Bugs & Issues Catalogue

| # | Severity | File | Bug |
|---|----------|------|-----|
| B1 | 🔴 Critical | `server.js:67` | `uuid` imported but NOT in `package.json` — crashes on clean install |
| B2 | 🔴 Critical | `store.js:93,161` | `setCachedAssets` defined twice — second definition silently overwrites first |
| B3 | 🔴 Critical | `store.js:244,623` | `updateNodeData` defined twice — duplicate silently overwrites |
| B4 | 🔴 Critical | `store.js:26-28,89-91` | `cachedAssets` and `isAssetsLoading` declared twice in initial state |
| B5 | 🔴 Critical | `geminiService.js:607` | Hardcoded model `'gemini-3-pro-image-preview'` — does not exist, will throw 404 |
| B6 | 🔴 Critical | `server.js:213-226` | `Referer: http://localhost:5173/` hardcoded for production Gemini client |
| B7 | 🟡 Medium | `App.jsx:131,135` | `'forge'` and `'creator'` both render `<ForgeView>` — duplicate routes |
| B8 | 🟡 Medium | `App.jsx:131,136` | `'playground'` and `'directors-cut'` both render `<PlaygroundCanvas>` |
| B9 | 🟡 Medium | `main.jsx:6` | `<StrictMode>` removed — masks double-render bugs in development |
| B10 | 🟡 Medium | `geminiService.js:746` | `generateLipSyncVideo` standalone path always throws — dead fallback |
| B11 | 🟡 Medium | `store.js:296` | `generateStoryboard` is a stub — does nothing |
| B12 | 🟡 Medium | `store.js:301` | `syncCurrentSession` is a stub — does nothing |
| B13 | 🟡 Medium | `server.js:621-624` | SEO routes for `/real-estate`, `/fashion`, `/food`, `/cinema` — these dist files don't exist |
| B14 | 🟢 Low | `src/lib/utils.js` | File is empty (137 bytes) — stub never implemented |
| B15 | 🟢 Low | `src/App.jsx:119-142` | All 16 page components instantiated at once in `tabComponents` object |

---

## 6. Security Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S1 | 🔴 CRITICAL | **Razorpay webhook has no signature verification** — anyone can fake a payment event and get free credits | `server.js:632` |
| S2 | 🔴 CRITICAL | **Google Service Account JSON file committed inside `src/components/panels/`** — `gen-lang-client-0692650759-484613544724.json` | `panels/` folder |
| S3 | 🔴 CRITICAL | **`shorts_balance` updated directly from frontend store** — bypasses database Row Level Security | `store.js:579-582` |
| S4 | 🟡 Medium | **`window.__VEO_API_KEY__`** — storing API key on window global, accessible from browser console | `store.js:168`, `geminiService.js:5` |
| S5 | 🟡 Medium | **No auth middleware** on any API routes — all backend endpoints are publicly accessible without a token | `server.js` throughout |
| S6 | 🟡 Medium | **`.env` contains private keys** including GCS private key embedded as JSON string | `.env:18` |
| S7 | 🟢 Low | **Three service account JSON files at project root** — should be in environment variables only | `/gen-lang-client-*.json` |
| S8 | 🟢 Low | **`GOOGLE_API_KEY` exposed in client via `VITE_GOOGLE_API_KEY`** — visible in browser | `.env:1` |

---

## 7. Dead Code & Bloat

| # | Category | Item | Action |
|---|----------|------|--------|
| D1 | Duplicate dep | `@xyflow/react` + `reactflow` — same library, two versions | Standardized on `reactflow` v11 exclusively |
| D2 | Duplicate dep | `@google/genai` + `@google/generative-ai` — two Gemini SDKs | Uninstalled legacy `@google/generative-ai` successfully |
| D3 | Dead file | `src/assets/react.svg` — default Vite placeholder | Delete |
| D4 | Dead file | `src/components/common/zerolens_concept02_refined.html` | Delete |
| D5 | Dead file | `src/lib/utils.js` — empty stub | Delete or implement |
| D6 | Dead file | `src/output.css` — pre-built Tailwind (117KB) | Delete + add to `.gitignore` |
| D7 | Dead code | `store.js:generateStoryboard` — stub with console.log | Implement or remove |
| D8 | Dead code | `store.js:syncCurrentSession` — stub that just waits | Implement or remove |
| D9 | Dead file | Service account JSON in `src/components/panels/` | Immediately delete |
| D10 | Misplaced | `zerolens-logo-kit.html` in `src/components/common/` | Move to `/docs` or `/public` |
| D11 | Clutter | 32 scripts in `/scripts/` — test/debug scripts | Move to `/dev-tools/` or delete |
| D12 | Duplicate route | Both `'forge'` and `'creator'` → ForgeView | Remove `'forge'` alias |
| D13 | Duplicate route | Both `'playground'` and `'directors-cut'` → PlaygroundCanvas | Remove `'playground'` alias |
| D14 | Bloat | `src/output.css` — 117KB auto-generated file | Gitignore it |

---

## 8. Action Plan — Keep / Change / Delete / Rewrite

### 🟢 KEEP (as-is, good quality)
- `src/config/apiConfig.js` — excellent URL management
- `src/config/shortsConfig.js` — clean credit cost map
- `src/lib/supabase.js` — null-safe init
- `src/hooks/useWebSocket.js` — solid WS hook
- `src/components/common/Toast.jsx` — good notification system
- `src/components/canvas/` — all 3 files are good
- `services/design/` — good design token system
- `services/slides/` — good slide generators
- `services/storageService.js` — solid dual storage
- `supabase/migrations/` — keep all migration files
- `docs/` — keep all 13 docs
- `Dockerfile` — production-ready
- `railway.json` — correct

### 🟡 CHANGE (needs improvement but don't rewrite)
- `src/main.jsx` — add `<StrictMode>` back
- `src/App.jsx` — add `react-router-dom`, fix duplicate routes, lazy-load pages
- `src/store.js` — fix duplicate definitions, move `spendShorts` to server-only
- `package.json` — add `uuid`, remove old Gemini SDK, remove old `reactflow`
- `vite.config.js` — add code splitting, `manualChunks` for large pages
- `.gitignore` — add `src/output.css`
- `server.js` — add Razorpay signature verification (immediate)
- `server.js` — fix hardcoded `localhost` Referer in Gemini client
- `src/services/geminiService.js` — fix wrong model name `gemini-3-pro-image-preview`
- `src/components/pages/AuthPage.jsx` — replace `window.alert()` with Toast
- All `*.jsx` "Oversized" pages — extract sub-components (priority order below)

### 🔴 REWRITE / SPLIT (critical refactors)
- **`server.js`** → Split into `routes/` folder: `imageRoutes.js`, `videoRoutes.js`, `ugcRoutes.js`, `forgeRoutes.js`, `adminRoutes.js`, `webhookRoutes.js`, `storageRoutes.js`
- **`src/components/panels/PromptGenerator.jsx` (302KB)** → Must be split into 10+ sub-components
- **`src/components/pages/UGC.tsx` (392KB)** → Must be split into 10+ sub-components
- **`src/components/pages/MarketingStudio.jsx` (141KB)** → Split into at minimum 5 components
- **`src/components/pages/CarouselStudio.jsx` (129KB)** → Split
- **`src/components/pages/DirectorStudio.jsx` (105KB)** → Split

### 🗑️ DELETE (confirmed dead code / security risk)
- `src/components/panels/gen-lang-client-0692650759-484613544724.json` — **DELETE IMMEDIATELY**
- `src/assets/react.svg`
- `src/components/common/zerolens_concept02_refined.html`
- `src/lib/utils.js` (empty)
- `src/output.css` (auto-generated, should not be committed)
- Duplicate routes in `App.jsx`: remove `'forge'` → `'creator'` alias; remove `'playground'` → `'directors-cut'` alias

---

## 9. Recommended Folder Structure (Standard Webapp)

```
src/
├── app/                    ← App shell
│   ├── App.jsx
│   ├── Router.jsx          ← react-router-dom routes
│   └── store/
│       ├── index.js        ← Root store
│       ├── uiSlice.js      ← UI state
│       ├── authSlice.js    ← Auth state
│       ├── creditsSlice.js ← Credits / shorts
│       └── canvasSlice.js  ← Node graph state
│
├── pages/                  ← Route-level page components (thin)
│   ├── LandingPage/
│   │   ├── index.jsx
│   │   ├── HeroSection.jsx
│   │   ├── FeaturesSection.jsx
│   │   └── CTASection.jsx
│   ├── UGCPage/
│   │   ├── index.jsx
│   │   ├── UGCSetup.jsx
│   │   ├── UGCGenerate.jsx
│   │   └── UGCExport.jsx
│   └── ... (each page gets its own folder)
│
├── components/             ← Reusable components
│   ├── ui/                 ← Atoms: Button, Input, Modal, Toast
│   ├── canvas/             ← React Flow wrappers
│   ├── nodes/              ← Graph nodes
│   └── edges/              ← Graph edges
│
├── features/               ← Feature-level logic
│   ├── auth/
│   ├── credits/
│   ├── identity/
│   └── ugc/
│
├── services/               ← API clients
│   ├── gemini/
│   │   ├── imageService.js
│   │   ├── videoService.js
│   │   ├── audioService.js
│   │   └── analysisService.js
│   ├── supabaseService.js
│   └── storageService.js
│
├── hooks/                  ← Custom hooks
├── lib/                    ← Third-party init (supabase, etc.)
├── config/                 ← Constants and config
├── utils/                  ← Pure utility functions
└── types/                  ← TypeScript types (if migrating to TS)

server/                     ← (rename from monolith)
├── index.js                ← Express app setup only
├── routes/
│   ├── imageRoutes.js
│   ├── videoRoutes.js
│   ├── ugcRoutes.js
│   ├── forgeRoutes.js
│   ├── carouselRoutes.js
│   ├── storageRoutes.js
│   ├── adminRoutes.js
│   └── webhookRoutes.js
├── middleware/
│   ├── auth.js
│   ├── rateLimiter.js
│   └── memoryGuard.js
└── services/               ← (current /services/)
```

---

## 10. Priority Checklist

> **Do these in order — P1 must be done before anything else.**

### P1 — Security (Do Immediately)
- [x] **Delete** `src/components/panels/gen-lang-client-0692650759-484613544724.json` (Deleted)
- [ ] **Add Razorpay webhook signature verification** to `server.js`
- [ ] **Move `spendShorts` / `refundShorts`** from frontend store to a server-side `/api/credits/spend` endpoint
- [ ] **Add `uuid` to `package.json` dependencies**
- [ ] **Fix hardcoded `localhost` Referer** in production Gemini client in `server.js`
- [ ] **Add auth middleware** to protect sensitive API routes

### P2 — Bug Fixes
- [ ] Fix duplicate `setCachedAssets` in store.js
- [ ] Fix duplicate `updateNodeData` in store.js
- [ ] Fix duplicate state declarations (`cachedAssets`, `isAssetsLoading`) in store.js
- [ ] Fix wrong model name `gemini-3-pro-image-preview` in geminiService.js
- [ ] Remove duplicate routes in App.jsx (`'forge'` and `'playground'`)
- [ ] Add `<StrictMode>` back to main.jsx
- [ ] Replace `window.alert()` in AuthPage with Toast system

### P3 — Architecture
- [ ] Install `react-router-dom` and add proper URL-based routing
- [ ] Lazy-load all page components with `React.lazy()` + `Suspense`
- [ ] Remove duplicate packages: `reactflow`, `@google/generative-ai`
- [ ] Add `uuid` to package.json
- [ ] Split `server.js` into route files under `server/routes/`
- [ ] Add `src/output.css` to `.gitignore`
- [ ] Delete dead files (see §7)
- [ ] Move 32 script files to `dev-tools/` folder

### P4 — Component Refactoring (Largest ROI)
- [ ] Split `UGC.tsx` (392KB) — highest priority
- [x] Split `panels/PromptGenerator.jsx` (Modularized to sub-components) ✅
- [x] Split `MarketingStudio.jsx` (Wired to unified InpaintEditor, unneeded duplicates removed) ✅
- [ ] Split `CarouselStudio.jsx` (129KB)
- [ ] Split `DirectorStudio.jsx` (105KB)
- [ ] Split `LandingPage.jsx` (81KB)

### P5 — Polish
- [ ] Add `SETUP.md` with local dev instructions
- [ ] Add `API_REFERENCE.md` documenting all endpoints
- [ ] Migrate to full TypeScript (currently `.js` everywhere but `tsconfig.json` exists)
- [ ] Add proper error boundaries around all major page components
- [ ] Add loading skeletons for pages

---

*Report generated by architectural analysis of all files in `SANDBOX-AI-STUDIO--main`. Total files analyzed: 150+. Total code read: ~2MB.*
