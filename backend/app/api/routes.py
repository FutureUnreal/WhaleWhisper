from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.event_dispatcher import EventDispatcher
from app.services.ws_hub import WebSocketHub

router = APIRouter()

dispatcher = EventDispatcher()
hub = WebSocketHub(dispatcher)


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    peer = await hub.connect(ws)
    try:
        while True:
            message = await ws.receive()
            if message.get("text") is not None:
                await hub.handle_text(peer, message["text"])
            elif message.get("bytes") is not None:
                await hub.handle_bytes(peer, message["bytes"])
    except WebSocketDisconnect:
        await hub.disconnect(peer)
        return
