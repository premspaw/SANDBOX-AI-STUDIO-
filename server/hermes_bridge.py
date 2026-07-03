"""
Hermes Agent Bridge — powers ZeroLens AI with real Hermes Agent.

Exposes Hermes native session API:
  POST /api/sessions              Create session (returns session_id)
  POST /api/sessions/{id}/chat    Send message, receive agent response
  POST /api/sessions/{id}/clear   Clear history
  GET  /health                    Health check

Run:  python server/hermes_bridge.py
"""

import asyncio
import json
import logging
import os
import sys
import time
import uuid
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="[Hermes] %(levelname)s %(message)s")
logger = logging.getLogger("hermes_bridge")

HERMES_ROOT = Path(os.environ.get("LOCALAPPDATA", "")) / "hermes" / "hermes-agent"
sys.path.insert(0, str(HERMES_ROOT))
sys.path.insert(0, str(HERMES_ROOT / "venv" / "Lib" / "site-packages"))

import aiohttp  # type: ignore
from aiohttp import web  # type: ignore

HOST = os.environ.get("HERMES_HOST", "127.0.0.1")
PORT = int(os.environ.get("HERMES_PORT", "8642"))
WORKDIR = os.environ.get("HERMES_WORKDIR", str(Path.cwd()))

_sessions: dict = {}

# Pre-load heavy imports at startup (first import takes ~35s)
logger.info("Loading Hermes Agent modules (this may take a minute)...")
from run_agent import AIAgent  # type: ignore
from gateway.run import _resolve_runtime_agent_kwargs, _resolve_gateway_model, _load_gateway_config  # type: ignore
from hermes_cli.tools_config import _get_platform_tools  # type: ignore
logger.info("Hermes Agent modules loaded.")


def _make_agent(session_id: str, system_prompt: str | None = None):
    runtime_kwargs = _resolve_runtime_agent_kwargs()
    model = _resolve_gateway_model()
    config = _load_gateway_config()
    enabled_toolsets = sorted(
        t for t in _get_platform_tools(config, "api_server")
        if t not in {"file", "vision"}
    )

    return AIAgent(
        model=model,
        **runtime_kwargs,
        max_iterations=25,
        quiet_mode=True,
        verbose_logging=False,
        ephemeral_system_prompt=system_prompt or None,
        enabled_toolsets=enabled_toolsets,
        session_id=session_id,
        platform="api_server",
    )


async def _run_agent(agent, message, history):
    loop = asyncio.get_running_loop()
    def _run():
        return agent.run_conversation(
            user_message=message,
            conversation_history=history[-20:],
            task_id=f"task_{id(agent)}_{int(time.time()*1000)}",
        )
    return await loop.run_in_executor(None, _run)


async def handle_create_session(request):
    custom_key = request.headers.get("x-admin-trial-key") or ""
    if custom_key:
        os.environ["GOOGLE_API_KEY"] = custom_key
        logger.info("Setting environment GOOGLE_API_KEY from x-admin-trial-key header.")

    try:
        body = await request.json() if request.body_exists else {}
    except Exception:
        body = {}
    session_id = str(uuid.uuid4())
    system_prompt = body.get("system_prompt", "")
    agent = _make_agent(session_id, system_prompt)
    _sessions[session_id] = {
        "agent": agent,
        "history": [],
        "created_at": time.time(),
        "system_prompt": system_prompt,
    }
    logger.info("Session created: %s", session_id)
    return web.json_response({"session_id": session_id}, status=201)


GEMINI_VISION_MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-2.5-flash")
GCP_PROJECT_ID = os.environ.get("GOOGLE_PROJECT_ID", "gen-lang-client-0438096272")
GCP_LOCATION = os.environ.get("GOOGLE_LOCATION", "us-central1")

async def _call_gemini_vision(message: str, attachments: list, system_prompt: str = "") -> str:
    """Call Gemini API with vision support. Handles multiple image attachments and both AIza API keys and AQ. OAuth tokens."""
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        return "Error: GOOGLE_API_KEY not configured on server."

    is_vertex_token = api_key.startswith("ya29.")

    parts = []
    if system_prompt:
        parts.append({"text": f"[System]\n{system_prompt}\n\n[User]\n{message}"})
    else:
        parts.append({"text": message})

    for att in attachments:
        base64_data = att.get("data", "")
        mime_type = att.get("type", "image/jpeg")
        if base64_data.startswith("http://") or base64_data.startswith("https://"):
            try:
                logger.info("Downloading reference image from URL: %s", base64_data)
                async with aiohttp.ClientSession() as sess:
                    async with sess.get(base64_data) as response:
                        if response.status == 200:
                            import base64
                            file_bytes = await response.read()
                            base64_data = base64.b64encode(file_bytes).decode("utf-8")
                            mime_type = response.headers.get("Content-Type", mime_type)
                        else:
                            logger.warning("Failed to download image from %s: HTTP %s", base64_data, response.status)
            except Exception as e:
                logger.warning("Error downloading image from %s: %s", base64_data, e)

        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]
        parts.append({"inline_data": {"mime_type": mime_type, "data": base64_data}})

    payload = {"contents": [{"parts": parts}]}

    try:
        if is_vertex_token:
            url = f"https://{GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/publishers/google/models/{GEMINI_VISION_MODEL}:generateContent"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        else:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_VISION_MODEL}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}

        logger.info("Calling Gemini vision endpoint for model %s (vertex=%s)", GEMINI_VISION_MODEL, is_vertex_token)
        async with aiohttp.ClientSession() as sess:
            async with sess.post(url, json=payload, headers=headers) as resp:
                data = await resp.json()
                if not resp.ok:
                    err_detail = data.get("error", {}).get("message", str(data))
                    logger.warning("Gemini vision API error (HTTP %s): %s", resp.status, err_detail)
                    return f"Error: Gemini API returned {resp.status} — {err_detail}"

        candidate = data.get("candidates", [{}])[0]
        text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
        finish_reason = candidate.get("finishReason", "UNKNOWN")
        logger.info("Gemini vision response finish_reason=%s text_len=%d", finish_reason, len(text))
        return text or f"Image analyzed (finish_reason={finish_reason}) but no text returned."
    except Exception as e:
        logger.warning("Gemini vision call failed: %s", e)
        return f"Error processing image: {e}"


async def handle_chat(request):
    session_id = request.match_info.get("session_id")
    if session_id not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404)

    custom_key = request.headers.get("x-admin-trial-key") or ""
    if custom_key:
        os.environ["GOOGLE_API_KEY"] = custom_key
        logger.info("Setting environment GOOGLE_API_KEY from x-admin-trial-key header during chat.")

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    message = body.get("message", "")
    if not message:
        return web.json_response({"error": "message is required"}, status=400)

    session = _sessions[session_id]
    agent = session["agent"]
    attachments = body.get("attachments") or []
    image_attachments = [a for a in attachments if a.get("data") and a.get("type", "").startswith("image/")]
    has_images = len(image_attachments) > 0
    system_prompt = session.get("system_prompt", "")

    if has_images:
        # Use Gemini API directly for vision (all images sent)
        final_text = await _call_gemini_vision(message, image_attachments, system_prompt)
    else:
        # Use Hermes agent for text-only
        result = await _run_agent(agent, message, session["history"])
        final_text = result.get("final_response", "") or ""

    session["history"].append({"role": "user", "content": message, "has_images": has_images})
    session["history"].append({"role": "assistant", "content": final_text})

    return web.json_response({
        "text": final_text,
        "session_id": session_id,
        "usage": {
            "input_tokens": getattr(agent, "session_prompt_tokens", 0) or 0,
            "output_tokens": getattr(agent, "session_completion_tokens", 0) or 0,
            "total_tokens": getattr(agent, "session_total_tokens", 0) or 0,
        },
    })


async def handle_get_session(request):
    session_id = request.match_info.get("session_id")
    if session_id not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404)
    return web.json_response({
        "session_id": session_id,
        "exists": True,
        "history_count": len(_sessions[session_id]["history"]),
    })


async def handle_get_session_toolsets(request):
    session_id = request.match_info.get("session_id")
    if session_id not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404)
    agent = _sessions[session_id]["agent"]
    tools = sorted(getattr(agent, "enabled_toolsets", []))
    return web.json_response({"toolsets": tools})


async def handle_clear_session(request):
    session_id = request.match_info.get("session_id")
    if session_id not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404)
    _sessions[session_id]["history"] = []
    return web.json_response({"status": "cleared"})


async def handle_health(request):
    tools = []
    if _sessions:
        s = _sessions[next(iter(_sessions))]
        tools = list(getattr(s["agent"], "enabled_toolsets", []))
    return web.json_response({
        "status": "ok",
        "platform": "hermes-agent",
        "tools": tools,
    })


@web.middleware
async def cors_middleware(request, handler):
    origin = request.headers.get("Origin", "*")
    if request.method == "OPTIONS":
        return web.Response(
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-admin-trial-key, X-Admin-Trial-Key",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "86400",
            }
        )
    try:
        response = await handler(request)
    except web.HTTPException as ex:
        response = ex
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, x-admin-trial-key, X-Admin-Trial-Key"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


MAX_BODY_SIZE = int(os.environ.get("HERMES_MAX_BODY_SIZE", "50")) * 1024 * 1024

def build_app():
    app = web.Application(middlewares=[cors_middleware], client_max_size=MAX_BODY_SIZE)
    app.router.add_post("/api/sessions", handle_create_session)
    app.router.add_get("/api/sessions/{session_id}", handle_get_session)
    app.router.add_post("/api/sessions/{session_id}/chat", handle_chat)
    app.router.add_get("/api/sessions/{session_id}/toolsets", handle_get_session_toolsets)
    app.router.add_post("/api/sessions/{session_id}/clear", handle_clear_session)
    app.router.add_get("/health", handle_health)
    return app


def main():
    os.chdir(WORKDIR)
    logger.info("Hermes Bridge starting on %s:%s", HOST, PORT)
    logger.info("Workdir: %s", WORKDIR)
    logger.info("Hermes root: %s", HERMES_ROOT)
    logger.info("Endpoints:")
    logger.info("  POST /api/sessions                  — create session")
    logger.info("  POST /api/sessions/{id}/chat        — send message")
    logger.info("  POST /api/sessions/{id}/clear       — clear history")
    logger.info("  GET  /health                        — health check")

    app = build_app()
    web.run_app(app, host=HOST, port=PORT, shutdown_timeout=1)


if __name__ == "__main__":
    main()
