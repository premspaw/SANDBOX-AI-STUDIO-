# ZeroLens Cinematic Director ADK Agent

This directory contains the multi-agent director system built using the **Google Agent Development Kit (ADK)** for Python.

## Structure

```
agents/
  ├── cinematic_director/
  │    ├── __init__.py
  │    ├── agent.py          # Root agent & sub-agents definition
  │    └── .env              # API keys and environment variables
  └── README.md
```

## Setup & Running

### 1. Configure API Key
Open `agents/cinematic_director/.env` and set your Gemini API key:
```bash
GOOGLE_API_KEY="your_api_key_here"
```

### 2. Run with ADK CLI
From the `agents/` directory (parent of `cinematic_director/`):

```bash
# Interactive Terminal Chat:
adk run cinematic_director

# Web UI Interface (runs at http://localhost:8000):
adk web --port 8000
```

### 3. Multi-Agent Directorial Hierarchy

* **`Cinematic_Director` (`root_agent`)**: Virtual film director orchestrating full 10-second segmentations, continuous film grammar, and dialogue constraints.
* **`zerolens_story_intelligence_director`**: Analyzes screenplays, dramatic beats, character arcs, emotional pacing, and dialogue capacity.
* **`cinematic__continuity_director`**: Visual film grammar, camera movements, blocking, 180° axis, lighting/weather consistency, and previous-frame inspection.
* **`zerolens_ai_generation__prompt_director`**: Generates structured, model-ready Gemini Omni 1.1 Flash prompts with anti-morphing/character-lock directives.
