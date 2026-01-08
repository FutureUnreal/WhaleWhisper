import json
import sqlite3
from pathlib import Path
from typing import Iterable, List, Optional

from .store import MemoryStore
from .types import MemoryCandidate, MemoryFact, MemoryMessage, MemoryScope, MemorySummary


class SQLiteMemoryStore(MemoryStore):
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path or "data/memory.db"
        self._ensure_db()

    def _ensure_db(self) -> None:
        db_path = Path(self.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_messages_session ON memory_messages(session_id, id)"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profile_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tags TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_facts_scope ON memory_facts(profile_id, user_id, id)"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_summaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_summaries_scope ON memory_summaries(profile_id, user_id, id)"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_candidates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profile_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_candidates_scope ON memory_candidates(profile_id, user_id, id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_candidates_status ON memory_candidates(status, id)"
            )
            conn.commit()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def add_message(self, scope: MemoryScope, role: str, content: str, created_at: int) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_messages (session_id, profile_id, user_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (scope.session_id, scope.profile_id, scope.user_id, role, content, created_at),
            )
            conn.commit()

    def list_messages(
        self,
        session_id: str,
        limit: int,
        *,
        order: str = "asc",
    ) -> List[MemoryMessage]:
        if limit <= 0:
            return []
        order_by = "ASC" if order == "asc" else "DESC"
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT id, session_id, role, content, created_at
                FROM memory_messages
                WHERE session_id = ?
                ORDER BY id {order_by}
                LIMIT ?
                """,
                (session_id, limit),
            ).fetchall()
        return [
            MemoryMessage(
                id=row["id"],
                session_id=row["session_id"],
                role=row["role"],
                content=row["content"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def count_messages(self, session_id: str) -> int:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as count FROM memory_messages WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        return int(row["count"] or 0)

    def trim_messages(self, session_id: str, keep_last: int) -> List[MemoryMessage]:
        if keep_last <= 0:
            keep_last = 0
        with self._connect() as conn:
            count_row = conn.execute(
                "SELECT COUNT(*) as count FROM memory_messages WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            total = int(count_row["count"] or 0)
            overflow = total - keep_last
            if overflow <= 0:
                return []
            rows = conn.execute(
                """
                SELECT id, session_id, role, content, created_at
                FROM memory_messages
                WHERE session_id = ?
                ORDER BY id ASC
                LIMIT ?
                """,
                (session_id, overflow),
            ).fetchall()
            ids = [row["id"] for row in rows]
            if ids:
                placeholders = ",".join("?" for _ in ids)
                conn.execute(
                    f"DELETE FROM memory_messages WHERE id IN ({placeholders})",
                    ids,
                )
                conn.commit()
        return [
            MemoryMessage(
                id=row["id"],
                session_id=row["session_id"],
                role=row["role"],
                content=row["content"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def add_fact(
        self,
        scope: MemoryScope,
        content: str,
        tags: Optional[Iterable[str]],
        created_at: int,
    ) -> None:
        tag_payload = json.dumps(list(tags or []), ensure_ascii=False)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_facts (profile_id, user_id, content, tags, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (scope.profile_id, scope.user_id, content, tag_payload, created_at),
            )
            conn.commit()

    def delete_fact(self, scope: MemoryScope, fact_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                DELETE FROM memory_facts
                WHERE id = ? AND profile_id = ? AND user_id = ?
                """,
                (fact_id, scope.profile_id, scope.user_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    def fact_exists(self, scope: MemoryScope, content: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM memory_facts
                WHERE profile_id = ? AND user_id = ? AND content = ?
                LIMIT 1
                """,
                (scope.profile_id, scope.user_id, content),
            ).fetchone()
        return row is not None

    def get_fact_by_content(self, scope: MemoryScope, content: str) -> Optional[MemoryFact]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, profile_id, user_id, content, tags, created_at
                FROM memory_facts
                WHERE profile_id = ? AND user_id = ? AND content = ?
                LIMIT 1
                """,
                (scope.profile_id, scope.user_id, content),
            ).fetchone()
        if not row:
            return None
        return MemoryFact(
            id=row["id"],
            profile_id=row["profile_id"],
            user_id=row["user_id"],
            content=row["content"],
            tags=json.loads(row["tags"] or "[]"),
            created_at=row["created_at"],
        )

    def list_facts(self, scope: MemoryScope, limit: int) -> List[MemoryFact]:
        if limit <= 0:
            return []
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, profile_id, user_id, content, tags, created_at
                FROM memory_facts
                WHERE profile_id = ? AND user_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (scope.profile_id, scope.user_id, limit),
            ).fetchall()
        return [
            MemoryFact(
                id=row["id"],
                profile_id=row["profile_id"],
                user_id=row["user_id"],
                content=row["content"],
                tags=json.loads(row["tags"] or "[]"),
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def add_summary(self, scope: MemoryScope, content: str, created_at: int) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_summaries (session_id, profile_id, user_id, content, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (scope.session_id, scope.profile_id, scope.user_id, content, created_at),
            )
            conn.commit()

    def list_summaries(
        self,
        scope: MemoryScope,
        limit: int,
        *,
        exclude_session_id: Optional[str] = None,
    ) -> List[MemorySummary]:
        if limit <= 0:
            return []
        query = (
            "SELECT id, session_id, profile_id, user_id, content, created_at "
            "FROM memory_summaries "
            "WHERE profile_id = ? AND user_id = ?"
        )
        params: List[object] = [scope.profile_id, scope.user_id]
        if exclude_session_id:
            query += " AND session_id != ?"
            params.append(exclude_session_id)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [
            MemorySummary(
                id=row["id"],
                session_id=row["session_id"],
                profile_id=row["profile_id"],
                user_id=row["user_id"],
                content=row["content"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def delete_summary(self, scope: MemoryScope, summary_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                DELETE FROM memory_summaries
                WHERE id = ? AND profile_id = ? AND user_id = ?
                """,
                (summary_id, scope.profile_id, scope.user_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    def add_candidate(
        self,
        scope: MemoryScope,
        content: str,
        reason: str,
        created_at: int,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_candidates (profile_id, user_id, content, reason, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (scope.profile_id, scope.user_id, content, reason, "pending", created_at),
            )
            conn.commit()

    def candidate_exists(self, scope: MemoryScope, content: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM memory_candidates
                WHERE profile_id = ? AND user_id = ? AND content = ? AND status = 'pending'
                LIMIT 1
                """,
                (scope.profile_id, scope.user_id, content),
            ).fetchone()
        return row is not None

    def list_candidates(
        self,
        scope: MemoryScope,
        status: str,
        limit: int,
    ) -> List[MemoryCandidate]:
        if limit <= 0:
            return []
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, profile_id, user_id, content, reason, status, created_at
                FROM memory_candidates
                WHERE profile_id = ? AND user_id = ? AND status = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (scope.profile_id, scope.user_id, status, limit),
            ).fetchall()
        return [
            MemoryCandidate(
                id=row["id"],
                profile_id=row["profile_id"],
                user_id=row["user_id"],
                content=row["content"],
                reason=row["reason"],
                status=row["status"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def get_candidate(self, scope: MemoryScope, candidate_id: int) -> Optional[MemoryCandidate]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, profile_id, user_id, content, reason, status, created_at
                FROM memory_candidates
                WHERE id = ? AND profile_id = ? AND user_id = ?
                """,
                (candidate_id, scope.profile_id, scope.user_id),
            ).fetchone()
        if not row:
            return None
        return MemoryCandidate(
            id=row["id"],
            profile_id=row["profile_id"],
            user_id=row["user_id"],
            content=row["content"],
            reason=row["reason"],
            status=row["status"],
            created_at=row["created_at"],
        )

    def update_candidate_status(self, scope: MemoryScope, candidate_id: int, status: str) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                UPDATE memory_candidates
                SET status = ?
                WHERE id = ? AND profile_id = ? AND user_id = ?
                """,
                (status, candidate_id, scope.profile_id, scope.user_id),
            )
            conn.commit()
            return cursor.rowcount > 0
