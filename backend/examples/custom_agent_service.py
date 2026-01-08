import asyncio
import json
import uuid
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI(title="WhaleWhisper Custom Agent Example")


class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1)
    conversation_id: str = ""
    config: Dict[str, Any] = Field(default_factory=dict)
    stream: bool = True


def sse_event(name: str, data: Dict[str, Any]) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {name}\ndata: {payload}\n\n"


def chunk_text(text: str, size: int = 6):
    for index in range(0, len(text), size):
        yield text[index : index + size]


@app.post("/conversation")
async def create_conversation() -> Dict[str, str]:
    return {"conversation_id": uuid.uuid4().hex}


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Missing text")

    conversation_id = request.conversation_id or uuid.uuid4().hex
    response_text = f"Echo: {request.text}"
    enable_think = bool(request.config.get("think"))

    async def stream():
        if not request.conversation_id:
            yield sse_event("conversation.id", {"conversation_id": conversation_id})
        if enable_think:
            yield sse_event("message.think", {"text": "Thinking..."})
        for chunk in chunk_text(response_text):
            yield sse_event("message.delta", {"text": chunk})
            await asyncio.sleep(0.05)
        yield sse_event("message.done", {})

    if not request.stream:
        return JSONResponse({"text": response_text, "conversation_id": conversation_id})

    return StreamingResponse(stream(), media_type="text/event-stream")
