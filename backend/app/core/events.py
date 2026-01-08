import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class EventEnvelope:
    type: str
    data: Dict[str, Any]
    ts: int
    id: Optional[str] = None
    session_id: Optional[str] = None
    source: Optional[str] = None

    @property
    def payload(self) -> Dict[str, Any]:
        return self.data


class EventParseError(ValueError):
    pass


def parse_event(raw: str) -> EventEnvelope:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise EventParseError("Invalid JSON") from exc

    if not isinstance(data, dict):
        raise EventParseError("Event must be a JSON object")

    event_type = data.get("type")
    if not isinstance(event_type, str) or not event_type:
        raise EventParseError("Missing or invalid 'type'")

    payload = data.get("data")
    if payload is None:
        payload = data.get("payload", {})
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise EventParseError("'data' must be an object")

    ts = data.get("ts")
    if not isinstance(ts, int):
        ts = int(time.time())

    event_id = data.get("id")
    if event_id is not None and not isinstance(event_id, str):
        event_id = str(event_id)

    session_id = data.get("sessionId") or data.get("session_id")
    if session_id is None and isinstance(payload, dict):
        session_id = payload.get("sessionId") or payload.get("session_id")
    if session_id is not None and not isinstance(session_id, str):
        session_id = str(session_id)

    source = data.get("source")
    if source is not None and not isinstance(source, str):
        source = str(source)

    return EventEnvelope(
        type=event_type,
        data=payload,
        ts=ts,
        id=event_id,
        session_id=session_id,
        source=source,
    )


def make_event(
    event_type: str,
    data: Dict[str, Any],
    *,
    session_id: Optional[str] = None,
    source: Optional[str] = None,
    event_id: Optional[str] = None,
    include_legacy_payload: bool = True,
) -> Dict[str, Any]:
    payload = {
        "type": event_type,
        "id": event_id or uuid.uuid4().hex,
        "data": data,
        "ts": int(time.time()),
    }
    if session_id:
        payload["sessionId"] = session_id
    if source:
        payload["source"] = source
    if include_legacy_payload:
        payload["payload"] = data
    return payload
