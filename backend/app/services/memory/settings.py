from dataclasses import dataclass
from pathlib import Path

from app.core.settings import get_settings


@dataclass
class MemorySettings:
    enabled: bool
    db_path: str
    session_window: int
    facts_max: int
    summaries_max: int
    summary_max_chars: int
    summary_min_messages: int
    summary_user_limit: int
    summary_assistant_limit: int

    @classmethod
    def from_app_settings(cls) -> "MemorySettings":
        settings = get_settings()
        return cls(
            enabled=settings.memory_enabled,
            db_path=settings.memory_db_path,
            session_window=settings.memory_session_window,
            facts_max=settings.memory_facts_max,
            summaries_max=settings.memory_summaries_max,
            summary_max_chars=settings.memory_summary_max_chars,
            summary_min_messages=settings.memory_summary_min_messages,
            summary_user_limit=settings.memory_summary_user_limit,
            summary_assistant_limit=settings.memory_summary_assistant_limit,
        )

    def ensure_db_dir(self) -> None:
        if not self.db_path:
            return
        db_path = Path(self.db_path)
        if db_path.is_dir():
            return
        db_path.parent.mkdir(parents=True, exist_ok=True)
