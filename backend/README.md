# Backend

FastAPI-based orchestration service.

## Planned responsibilities
- Session management
- ASR / LLM / TTS provider adapters
- Agent orchestration
- Local memory service
- WebSocket event streaming

## Engine config (YAML)
- ENGINE_CONFIG_PATH (default: ./config/engines.yaml)
- LLM engines use OpenAI-compatible APIs (vLLM, Ollama, OpenRouter, DeepSeek, 302, LM Studio)
- Engine `paths` can override endpoints (chat/speech/transcription/health)
- Agent engines (Dify/Coze/FastGPT) are registered under `agent` in the same YAML.

## Agent capabilities handshake (SSE)
Use engine metadata to declare capabilities. The backend will emit a one-time
`agent.capabilities` event at stream start.

Example (engines.yaml):
```
agent:
  engines:
    - id: custom-agent
      capabilities:
        action_tokens: true
```

SSE event:
```
event: agent.capabilities
data: {"action_tokens": true}
```

## Environment (LLM)
- LLM_PROVIDER: openai_compat | dify | fastgpt | coze
- OPENAI_BASE_URL (default: https://api.openai.com/v1)
- OPENAI_API_KEY
- OPENAI_MODEL (default: gpt-4o-mini)
- DIFY_BASE_URL (example: http://localhost/v1)
- DIFY_API_KEY
- DIFY_USER (default: whale)
- FASTGPT_BASE_URL
- FASTGPT_API_KEY
- FASTGPT_UID (default: whale)
- COZE_API_BASE (default: https://api.coze.cn)
- COZE_TOKEN
- COZE_BOT_ID
- COZE_USER (default: whale)
- WS_AUTH_TOKEN (optional)

## Environment (Memory)
- MEMORY_ENABLED (default: true)
- MEMORY_DB_PATH (default: data/memory.db)
- MEMORY_SESSION_WINDOW (default: 12)
- MEMORY_FACTS_MAX (default: 48)
- MEMORY_SUMMARIES_MAX (default: 12)
- MEMORY_SUMMARY_MAX_CHARS (default: 480)
- MEMORY_SUMMARY_MIN_MESSAGES (default: 6)
- MEMORY_SUMMARY_USER_LIMIT (default: 3)
- MEMORY_SUMMARY_ASSISTANT_LIMIT (default: 2)

## Dev with uv
```
uv venv
uv pip install -e ".[dev]"
uv run uvicorn app.main:app --reload --port 8090
```

## Dev with pip
```
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8090
```

## Smoke test (WebSocket)
```
python scripts/ws_smoke_test.py
```
