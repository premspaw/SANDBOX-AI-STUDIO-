# 🚀 ZeroLens OpenAI App & Model Context Protocol (MCP) Integration Guide

## 1. Overview & Architecture

This document serves as the complete technical manual for integrating **ZeroLens** ([https://zerolens.in/](https://zerolens.in/)) with **ChatGPT as an OpenAI App** using the current **OpenAI Apps SDK / Model Context Protocol (MCP)** architecture.

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         ChatGPT                             │
│       (Interactive Chat Canvas, Prompts & Embedded UI)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Streamable HTTP / OAuth 2.0 (Bearer Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              ZeroLens MCP Production Gateway                │
│    (POST /api/mcp | GET /api/mcp/sse | GET /api/mcp/auth)   │
├──────────────────────────────┬──────────────────────────────┤
│  OAuth 2.0 Auth Server       │  Embedded UI Widget Engine   │
│  - Token Verification        │  - Responsive Dark-Mode UI   │
│  - PKCE Challenge Support    │  - Live Video/Image Previews │
├──────────────────────────────┴──────────────────────────────┤
│                     ZeroLens Tools Layer                    │
│  generate_image  |  generate_video  |  check_generation     │
│  list_projects   |  get_project     |  get_usage            │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Internal Service Execution (Zero Duplication)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 ZeroLens Core Infrastructure                │
├──────────────────────────────┬──────────────────────────────┤
│ Credit & Billing Engine      │ Asynchronous Job Queue       │
│ - "Shorts" Balance Check     │ - BullMQ (Redis) / In-Memory │
│ - Atomic Server Deductions   │ - Background Seedance/Veo    │
├──────────────────────────────┼──────────────────────────────┤
│ Multi-Model AI Pipelines     │ Storage & Database           │
│ - Nano Banana 2 / Pro        │ - Cloudflare R2 CDN          │
│ - Seedance 2.0 / Fast / Veo  │ - Supabase Auth & Postgres   │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. Implemented MCP Endpoints

| Endpoint | Method | Protocol / Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/mcp` (or `/mcp`) | `POST` | **Streamable HTTP** — Primary endpoint for OpenAI Apps SDK. Receives JSON-RPC requests (`initialize`, `tools/list`, `tools/call`). | Yes (Bearer Token) |
| `/api/mcp/sse` | `GET` | **Server-Sent Events (SSE)** — Connection endpoint for Claude Desktop, Cursor, and IDE agents. | Optional (Dev Mode) |
| `/api/mcp/messages` | `POST` | Incoming message handler for active SSE sessions. | Yes |
| `/api/mcp/auth/authorize` | `GET` | **OAuth 2.0 Authorize Consent Page** — Branded UI where users authenticate their ZeroLens account for ChatGPT. | Public |
| `/api/mcp/auth/authorize` | `POST` | **OAuth 2.0 Authorize Grant** — Submits credentials, validates against Supabase, and issues auth code. | Public |
| `/api/mcp/auth/token` | `POST` | **OAuth 2.0 Token Exchange** — Exchanges auth code or refresh token for access token. Supports PKCE (`S256`). | Public |
| `/api/mcp/auth/userinfo` | `GET` | Returns authenticated user details from token. | Yes (Bearer Token) |
| `/api/mcp/ui/widget` | `GET` | **Embedded UI Canvas Widget** — Renders interactive video player / image preview with "Open in ZeroLens" action. | Public / Token |
| `/api/mcp/openapi.json` | `GET` | **OpenAPI 3.0 Specification** — For ChatGPT Custom GPT Actions import. | Public |
| `/api/mcp/action/:toolName` | `POST` | Universal HTTP REST tool execution endpoint for Custom GPT Actions. | Yes (Bearer Token) |

---

## 3. ChatGPT Tools Specification

All tools feature strongly typed schemas and server-side input validation.

### 1. `generate_image`
* **Purpose**: Generates high-fidelity AI images using ZeroLens models.
* **Cost**:
  - `nano-banana-2-lite`: 0.5 Shorts
  - `nano-banana-2`: 1 Short
  - `gpt-image-2`: 2 Shorts
  - `nano-banana-pro`: 3 Shorts
* **Inputs**:
  - `prompt` (*string, required*): Description of image, composition, and style.
  - `aspect_ratio` (*string, optional*): `'1:1'`, `'16:9'`, `'9:16'`, `'3:4'`, `'4:3'`. Default: `'1:1'`.
  - `style` (*string, optional*): `'cinematic'`, `'photorealistic'`, `'anime'`, `'3d-render'`, `'digital-art'`, `'minimalist'`.
  - `model` (*string, optional*): `'nano-banana-2'`, `'nano-banana-pro'`, `'nano-banana-2-lite'`, `'gpt-image-2'`.
  - `reference_image_url` (*string, optional*): Reference image URL.
  - `image_count` (*number, optional, 1-4*): Default `1`.
  - `project_id` (*string, optional*): Target project/folder.
* **Output**:
  ```json
  {
    "generation_id": "gen_img_1788710...",
    "status": "completed",
    "type": "image",
    "count": 1,
    "urls": ["https://zerolensbucket-cdn.r2.cloudflarestorage.com/..."],
    "prompt": "Cyberpunk city in neon rain",
    "model": "nano-banana-2",
    "aspect_ratio": "16:9",
    "credits_used": 1,
    "remaining_balance": 99,
    "embedded_ui_url": "https://zerolens.in/api/mcp/ui/widget?id=...",
    "preview_html": "<div class=\"widget-container\">...</div>"
  }
  ```

### 2. `generate_video`
* **Purpose**: Dispatches an asynchronous video generation task using Seedance 2.0 or Veo 3.1.
* **Cost**:
  - `seedance-fast`: 10 Shorts
  - `seedace`: 15 Shorts
  - `veo-3.1-generate-preview`: 20 Shorts
* **Inputs**:
  - `prompt` (*string, required*): Scene dynamics, subject action, camera movement.
  - `engine` (*string, optional*): `'seedance-fast'`, `'seedace'`, `'veo-3.1-generate-preview'`. Default: `'seedance-fast'`.
  - `aspect_ratio` (*string, optional*): `'16:9'`, `'9:16'`, `'1:1'`.
  - `duration` (*number, optional*): Seconds (5 or 8).
  - `resolution` (*string, optional*): `'720p'`, `'1080p'`.
  - `first_frame_url` (*string, optional*): Starting frame image URL.
  - `last_frame_url` (*string, optional*): Ending frame image URL.
  - `generate_audio` (*boolean, optional*): Whether to generate synchronized audio.
  - `project_id` (*string, optional*): Target project folder.
* **Output**:
  ```json
  {
    "generation_id": "gen_vid_1788710...",
    "status": "processing",
    "type": "video",
    "engine": "seedance-fast",
    "credits_used": 10,
    "estimated_seconds": 40,
    "check_instructions": "Call the 'check_generation' tool with generation_id 'gen_vid_1788710...' to retrieve render progress and the final video URL.",
    "embedded_ui_url": "https://zerolens.in/api/mcp/ui/widget?id=..."
  }
  ```

### 3. `check_generation`
* **Purpose**: Checks status and retrieves rendered asset URLs for asynchronous jobs.
* **Inputs**:
  - `generation_id` (*string, required*): The ID returned by `generate_video` or `generate_image`.
* **Output**:
  ```json
  {
    "generation_id": "gen_vid_1788710...",
    "status": "completed",
    "progress": 1.0,
    "result_url": "https://zerolensbucket-cdn.r2.cloudflarestorage.com/generated/...",
    "thumbnail_url": null,
    "error": null,
    "embedded_ui_url": "https://zerolens.in/api/mcp/ui/widget?id=..."
  }
  ```

### 4. `list_projects`
* **Purpose**: Returns the user's creative folders and asset counts.
* **Inputs**:
  - `limit` (*number, optional, default: 20*).
* **Output**:
  ```json
  {
    "user_id": "cec79985-...",
    "total_projects": 3,
    "projects": [
      { "id": "default", "name": "Default Project", "asset_count": 14, "last_updated": "2026-09-06T15:00:00Z" },
      { "id": "summer_campaign", "name": "Summer Campaign", "asset_count": 6, "last_updated": "2026-09-05T12:00:00Z" }
    ]
  }
  ```

### 5. `get_project`
* **Purpose**: Retrieves all media assets and metadata for a specific project.
* **Inputs**:
  - `project_id` (*string, required*): The project ID.
  - `limit` (*number, optional, default: 20*).

### 6. `get_usage`
* **Purpose**: Retrieves current subscription tier, Shorts credit balance, and recent transaction audit trail.
* **Inputs**: None (uses authenticated user context).
* **Output**:
  ```json
  {
    "user_id": "cec79985-...",
    "email": "creator@zerolens.in",
    "tier": "INFLUENCER",
    "shorts_balance": 2480,
    "total_assets_created": 42,
    "recent_transactions": [
      { "id": "...", "amount": -10, "type": "spend", "reason": "mcp_chatgpt_video_generation", "created_at": "..." }
    ]
  }
  ```

---

## 4. Authentication & User Authorization

### OAuth 2.0 Integration Flow for ChatGPT
1. User invokes ZeroLens app in ChatGPT.
2. ChatGPT directs the user to the Authorization URL:
   `https://zerolens.in/api/mcp/auth/authorize?client_id=zerolens-chatgpt-app&redirect_uri=https://chatgpt.com/aip/.../oauth/callback&state=...&code_challenge=...&response_type=code`
3. The user sees the branded ZeroLens authorization consent screen and confirms access.
4. ZeroLens generates a single-use authorization code and redirects back to ChatGPT.
5. ChatGPT exchanges the authorization code at `POST /api/mcp/auth/token` (with PKCE code verifier).
6. ZeroLens issues a signed 30-day access token and a refresh token.
7. Subsequent MCP requests carry:
   `Authorization: Bearer <access_token>`
8. The server resolves the exact Supabase `user.id`, isolates their projects, verifies their Shorts credit balance, and deducts credits accordingly.

---

## 5. Local Development & Testing

### 1. Run Automated Test Suite
Run the 10-point test suite covering initialization, tool discovery, validation, async jobs, auth, and error refunds:
```bash
npm test
```

### 2. Run Local Development Server
```bash
npm run server
```
Server will start on `http://localhost:3002`.

### 3. Test with MCP Inspector
Inspect and interact with all tools via the official GUI:
```bash
npm run mcp:inspector
```
Or connect directly via STDIO or Streamable HTTP.

### 4. Test Streamable HTTP Endpoint via Curl
```bash
# Test tool discovery via Streamable HTTP:
curl -X POST http://localhost:3002/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## 6. ChatGPT Connection & Setup Guide

### Section A: Implemented in Code (Already Completed)
- ✅ Standard MCP Streamable HTTP & SSE transports (`@modelcontextprotocol/sdk`)
- ✅ 6 strongly typed tools with schemas, server validation, and credit guards
- ✅ OAuth 2.0 Authorization Server (`/auth/authorize`, `/auth/token`, `/auth/userinfo`)
- ✅ Embedded UI preview widget engine (`/ui/widget`)
- ✅ Automatic credit refund upon engine errors
- ✅ Automated test suite (`npm test`)

### Section B: Manual OpenAI Developer Dashboard Setup

Follow these steps in the **OpenAI Developer Platform** / **ChatGPT Custom GPT Builder**:

#### Option 1: OpenAI Apps SDK Integration (App Directory)
1. Go to **OpenAI Developer Dashboard** -> **Apps** -> **Create App**.
2. **App Name**: `ZeroLens`
3. **App Website**: `https://zerolens.in/`
4. **MCP Server Endpoint**:
   ```
   https://zerolens.in/api/mcp
   ```
5. **Transport Type**: `Streamable HTTP`
6. **Authentication**:
   - **Type**: `OAuth 2.0`
   - **Grant Type**: `Authorization Code`
   - **Authorization URL**: `https://zerolens.in/api/mcp/auth/authorize`
   - **Token URL**: `https://zerolens.in/api/mcp/auth/token`
   - **Client ID**: `zerolens-chatgpt-app` (or configure your own in `.env`)
   - **Client Secret**: Enter secret configured in `OPENAI_APP_CLIENT_SECRET`
   - **Token Authentication**: `Bearer Token` in Authorization header
   - **Scopes**: `generate_image generate_video check_generation list_projects get_usage`

#### Option 2: Custom GPT Actions Integration (Instant Deployment)
1. In ChatGPT, click **Explore GPTs** -> **Create a GPT**.
2. Under **Configure**, click **Create new action**.
3. In **Schema**, select **Import from URL** and enter:
   ```
   https://zerolens.in/api/mcp/openapi.json
   ```
4. **Authentication**:
   - Select **OAuth**
   - **Client ID**: `zerolens-chatgpt-app`
   - **Client Secret**: *(your secret)*
   - **Authorization URL**: `https://zerolens.in/api/mcp/auth/authorize`
   - **Token URL**: `https://zerolens.in/api/mcp/auth/token`
5. Save and Publish!

---

## 7. Security & Production Checklist

1. **Secret Isolation**: Never commit `.env`. Ensure `ZEROLENS_MCP_SECRET` and `OPENAI_APP_CLIENT_SECRET` are set in your Railway / production environment.
2. **Single-User Scope**: All tools check `user.id` from the decrypted token. Users can never deduct credits or inspect projects belonging to other users.
3. **SSRF Prevention**: All reference images and video URLs pass through `validateProxyUrl` before being fetched.
4. **Atomic Balances**: Credit deductions are committed directly to `profiles.shorts_balance` and audited in `shorts_transactions`.
