# Examples

## Custom agent service (SSE)
Run the minimal custom agent server:

```bash
uvicorn examples.custom_agent_service:app --reload --port 9001
```

Then pick `Custom Agent` in the WhaleWhisper UI (Settings → Agent) and set:
- `base_url`: `http://localhost:9001`
- `api_key`: optional (leave empty for this example)

The service implements:
- `GET /health` → `{ "status": "ok" }`
- `POST /conversation` → `{ "conversation_id": "..." }`
- `POST /chat` → SSE stream (`conversation.id`, `message.delta`, `message.done`)
