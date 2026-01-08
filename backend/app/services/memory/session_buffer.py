from dataclasses import dataclass, field
from typing import Dict, List

from .types import MemoryMessage


@dataclass
class _SessionBuffer:
    next_id: int = 1
    messages: List[MemoryMessage] = field(default_factory=list)


class SessionMessageBuffer:
    def __init__(self) -> None:
        self._buffers: Dict[str, _SessionBuffer] = {}

    def add_message(self, session_id: str, role: str, content: str, created_at: int) -> None:
        if not session_id or not content:
            return
        buffer = self._buffers.setdefault(session_id, _SessionBuffer())
        message = MemoryMessage(
            id=buffer.next_id,
            session_id=session_id,
            role=role,
            content=content,
            created_at=created_at,
        )
        buffer.next_id += 1
        buffer.messages.append(message)

    def list_messages(self, session_id: str, limit: int, *, order: str = "asc") -> List[MemoryMessage]:
        if limit <= 0:
            return []
        buffer = self._buffers.get(session_id)
        if not buffer:
            return []
        items = buffer.messages
        if order == "desc":
            items = list(reversed(items))
        return items[:limit]

    def count_messages(self, session_id: str) -> int:
        buffer = self._buffers.get(session_id)
        if not buffer:
            return 0
        return len(buffer.messages)

    def trim_messages(self, session_id: str, keep: int) -> List[MemoryMessage]:
        if keep <= 0:
            removed = self._buffers.get(session_id)
            if removed:
                removed_messages = removed.messages
                removed.messages = []
                return removed_messages
            return []
        buffer = self._buffers.get(session_id)
        if not buffer:
            return []
        overflow = len(buffer.messages) - keep
        if overflow <= 0:
            return []
        removed = buffer.messages[:overflow]
        buffer.messages = buffer.messages[overflow:]
        return removed
