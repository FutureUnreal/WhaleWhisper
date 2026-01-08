from abc import ABC, abstractmethod
from typing import Iterable, List, Optional

from .types import MemoryCandidate, MemoryFact, MemoryMessage, MemoryScope, MemorySummary


class MemoryStore(ABC):
    @abstractmethod
    def add_message(self, scope: MemoryScope, role: str, content: str, created_at: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_messages(
        self,
        session_id: str,
        limit: int,
        *,
        order: str = "asc",
    ) -> List[MemoryMessage]:
        raise NotImplementedError

    @abstractmethod
    def count_messages(self, session_id: str) -> int:
        raise NotImplementedError

    @abstractmethod
    def trim_messages(self, session_id: str, keep_last: int) -> List[MemoryMessage]:
        raise NotImplementedError

    @abstractmethod
    def add_fact(
        self,
        scope: MemoryScope,
        content: str,
        tags: Optional[Iterable[str]],
        created_at: int,
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_fact(self, scope: MemoryScope, fact_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def fact_exists(self, scope: MemoryScope, content: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_fact_by_content(self, scope: MemoryScope, content: str) -> Optional[MemoryFact]:
        raise NotImplementedError

    @abstractmethod
    def list_facts(self, scope: MemoryScope, limit: int) -> List[MemoryFact]:
        raise NotImplementedError

    @abstractmethod
    def add_summary(self, scope: MemoryScope, content: str, created_at: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_summaries(
        self,
        scope: MemoryScope,
        limit: int,
        *,
        exclude_session_id: Optional[str] = None,
    ) -> List[MemorySummary]:
        raise NotImplementedError

    @abstractmethod
    def delete_summary(self, scope: MemoryScope, summary_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def add_candidate(
        self,
        scope: MemoryScope,
        content: str,
        reason: str,
        created_at: int,
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    def candidate_exists(self, scope: MemoryScope, content: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_candidates(
        self,
        scope: MemoryScope,
        status: str,
        limit: int,
    ) -> List[MemoryCandidate]:
        raise NotImplementedError

    @abstractmethod
    def get_candidate(self, scope: MemoryScope, candidate_id: int) -> Optional[MemoryCandidate]:
        raise NotImplementedError

    @abstractmethod
    def update_candidate_status(self, scope: MemoryScope, candidate_id: int, status: str) -> bool:
        raise NotImplementedError
