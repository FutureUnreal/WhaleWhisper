from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class MemoryScope:
    session_id: str
    user_id: str
    profile_id: str


@dataclass
class MemoryMessage:
    id: int
    session_id: str
    role: str
    content: str
    created_at: int


@dataclass
class MemoryFact:
    id: int
    profile_id: str
    user_id: str
    content: str
    tags: List[str]
    created_at: int


@dataclass
class MemorySummary:
    id: int
    session_id: str
    profile_id: str
    user_id: str
    content: str
    created_at: int


@dataclass
class MemoryCandidate:
    id: int
    profile_id: str
    user_id: str
    content: str
    reason: str
    status: str
    created_at: int


@dataclass
class MemoryContext:
    system: str = ""
    messages: List[Dict[str, str]] = field(default_factory=list)

    def has_content(self) -> bool:
        return bool(self.system or self.messages)
