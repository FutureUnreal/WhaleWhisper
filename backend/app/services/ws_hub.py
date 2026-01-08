import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

from app.core.events import EventEnvelope, make_event, parse_event
from app.core.settings import get_settings
from app.services.event_dispatcher import EventDispatcher


@dataclass
class PeerState:
    id: str
    ws: WebSocket
    authenticated: bool = False
    name: str = ""
    index: Optional[int] = None
    possible_events: Set[str] = field(default_factory=set)
    active_voice_session_id: Optional[str] = None


class WebSocketHub:
    def __init__(self, dispatcher: EventDispatcher) -> None:
        self.dispatcher = dispatcher
        self._peers: Dict[str, PeerState] = {}
        self._peers_by_module: Dict[str, Dict[Optional[int], PeerState]] = {}
        self._auth_token = get_settings().ws_auth_token

    async def connect(self, ws: WebSocket) -> PeerState:
        await ws.accept()
        peer_id = uuid.uuid4().hex
        peer = PeerState(id=peer_id, ws=ws, authenticated=not bool(self._auth_token))
        self._peers[peer_id] = peer
        if peer.authenticated:
            await self._send(peer, make_event("module.authenticated", {"authenticated": True}))
        return peer

    async def disconnect(self, peer: PeerState) -> None:
        if peer.id in self._peers:
            self._peers.pop(peer.id, None)
        self._unregister_module(peer)

    async def handle_text(self, peer: PeerState, raw: str) -> None:
        try:
            event = parse_event(raw)
        except Exception as exc:
            await self._send(peer, make_event("error", {"message": str(exc)}))
            return

        if event.type == "module.authenticate":
            await self._handle_authenticate(peer, event)
            return
        if event.type == "module.announce":
            await self._handle_announce(peer, event)
            return
        if event.type == "ui.configure":
            await self._handle_ui_configure(peer, event)
            return

        if not peer.authenticated:
            await self._send(peer, make_event("error", {"message": "not authenticated"}))
            return

        if not event.source and peer.name:
            event.source = peer.name

        if event.type == "input.voice.start":
            peer.active_voice_session_id = event.session_id
        if event.type == "input.voice.end":
            peer.active_voice_session_id = None

        responses = await self.dispatcher.dispatch(event)

        if responses:
            await self._broadcast_json(responses)

        await self._broadcast_json([self._normalize_outgoing(event)], exclude_peer=peer.id)

    async def handle_bytes(self, peer: PeerState, chunk: bytes) -> None:
        if not peer.authenticated:
            await self._send(peer, make_event("error", {"message": "not authenticated"}))
            return

        if not peer.active_voice_session_id:
            await self._send(peer, make_event("error", {"message": "input.voice.start required before audio chunks"}))
            return

        event = EventEnvelope(
            type="input.voice.chunk",
            data={"audio": chunk},
            ts=int(time.time()),
            session_id=peer.active_voice_session_id,
            source=peer.name or None,
        )
        responses = await self.dispatcher.dispatch(event)
        if responses:
            await self._broadcast_json(responses)

    async def _handle_authenticate(self, peer: PeerState, event: EventEnvelope) -> None:
        token = event.data.get("token")
        if self._auth_token and token != self._auth_token:
            await self._send(peer, make_event("error", {"message": "invalid token"}))
            return
        peer.authenticated = True
        await self._send(peer, make_event("module.authenticated", {"authenticated": True}))

    async def _handle_announce(self, peer: PeerState, event: EventEnvelope) -> None:
        if self._auth_token and not peer.authenticated:
            await self._send(peer, make_event("error", {"message": "must authenticate before announcing"}))
            return

        name = event.data.get("name")
        index = event.data.get("index")
        possible_events = event.data.get("possibleEvents") or []

        if not isinstance(name, str) or not name:
            await self._send(
                peer,
                make_event("error", {"message": "module.announce requires non-empty name"}),
            )
            return

        if index is not None and not isinstance(index, int):
            await self._send(
                peer,
                make_event("error", {"message": "module.announce index must be an integer"}),
            )
            return

        self._unregister_module(peer)
        peer.name = name
        peer.index = index
        peer.possible_events = set(str(item) for item in possible_events if isinstance(item, str))
        self._register_module(peer)

    async def _handle_ui_configure(self, peer: PeerState, event: EventEnvelope) -> None:
        module_name = event.data.get("moduleName")
        module_index = event.data.get("moduleIndex")
        config = event.data.get("config")

        if not module_name:
            await self._send(peer, make_event("error", {"message": "ui.configure requires moduleName"}))
            return

        target = self._peers_by_module.get(str(module_name), {}).get(module_index)
        if not target:
            await self._send(peer, make_event("error", {"message": "module not found"}))
            return

        await self._send(
            target,
            make_event(
                "module.configure",
                {"config": config},
                source=event.source or "",
            ),
        )

    def _register_module(self, peer: PeerState) -> None:
        if peer.name not in self._peers_by_module:
            self._peers_by_module[peer.name] = {}
        self._peers_by_module[peer.name][peer.index] = peer

    def _unregister_module(self, peer: PeerState) -> None:
        if not peer.name:
            return
        group = self._peers_by_module.get(peer.name)
        if not group:
            return
        group.pop(peer.index, None)
        if not group:
            self._peers_by_module.pop(peer.name, None)

    async def _send(self, peer: PeerState, event: Dict[str, Any]) -> None:
        try:
            await peer.ws.send_json(event)
        except Exception:
            await self.disconnect(peer)

    async def _broadcast_json(
        self,
        events: List[Dict[str, Any]],
        *,
        exclude_peer: Optional[str] = None,
    ) -> None:
        for peer_id, peer in list(self._peers.items()):
            if exclude_peer and peer_id == exclude_peer:
                continue
            if not peer.authenticated:
                continue
            for event in events:
                await self._send(peer, event)

    @staticmethod
    def _normalize_outgoing(event: EventEnvelope) -> Dict[str, Any]:
        return make_event(
            event.type,
            event.data,
            session_id=event.session_id,
            source=event.source,
        )
