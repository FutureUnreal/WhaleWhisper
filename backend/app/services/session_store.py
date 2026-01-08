from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class SessionState:
    session_id: str
    user_id: Optional[str] = None
    profile_id: Optional[str] = None
    conversation_ids: Dict[str, str] = field(default_factory=dict)
    session_meta: Optional[str] = None
    developer_prompt: Optional[str] = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: Dict[str, SessionState] = {}

    def get_or_create(self, session_id: str, user_id: Optional[str], profile_id: Optional[str]) -> SessionState:
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionState(
                session_id=session_id,
                user_id=user_id,
                profile_id=profile_id,
            )
            return self._sessions[session_id]

        session = self._sessions[session_id]
        if user_id:
            session.user_id = user_id
        if profile_id:
            session.profile_id = profile_id
        return session

    def get_conversation_id(self, session_id: str, provider: str) -> Optional[str]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        return session.conversation_ids.get(provider)

    def set_conversation_id(self, session_id: str, provider: str, conversation_id: str) -> None:
        if not conversation_id:
            return
        session = self._sessions.get(session_id)
        if not session:
            session = self.get_or_create(session_id, user_id=None, profile_id=None)
        session.conversation_ids[provider] = conversation_id

    def set_metadata(self, session_id: str, metadata: Optional[str]) -> None:
        if not metadata:
            return
        session = self._sessions.get(session_id)
        if not session:
            session = self.get_or_create(session_id, user_id=None, profile_id=None)
        session.session_meta = metadata

    def get_metadata(self, session_id: str) -> Optional[str]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        return session.session_meta

    def set_developer_prompt(self, session_id: str, prompt: Optional[str]) -> None:
        if not prompt:
            return
        session = self._sessions.get(session_id)
        if not session:
            session = self.get_or_create(session_id, user_id=None, profile_id=None)
        session.developer_prompt = prompt

    def get_developer_prompt(self, session_id: str) -> Optional[str]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        return session.developer_prompt
