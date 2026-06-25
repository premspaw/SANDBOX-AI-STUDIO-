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

from aiohttp import web

HOST = os.environ.get("HERMES_HOST", "127.0.0.1")
PORT = int(os.environ.get("HERMES_PORT", "8642"))
WORKDIR = os.environ.get("HERMES_WORKDIR", str(Path.cwd()))

_sessions: dict = {}

# Pre-load heavy imports at startup (first import takes ~35s)
logger.info("Loading Hermes Agent modules (this may take a minute)...")
from run_agent import AIAgent
from gateway.run import _resolve_runtime_agent_kwargs, _resolve_gateway_model, _load_gateway_config
from hermes_cli.tools_config import _get_platform_tools
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


async def handle_chat(request):
    session_id = request.match_info.get("session_id")
    if session_id not in _sessions:
        return web.json_response({"error": "Session not found"}, status=404)

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    message = body.get("message", "")
    if not message:
        return web.json_response({"error": "message is required"}, status=400)

    session = _sessions[session_id]
    agent = session["agent"]

    result = await _run_agent(agent, message, session["history"])

    final_text = result.get("final_response", "") or ""
    session["history"].append({"role": "user", "content": message})
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
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "86400",
            }
        )
    try:
        response = await handler(request)
    except web.HTTPException as ex:
        response = ex
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


def build_app():
    app = web.Application(middlewares=[cors_middleware])
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
