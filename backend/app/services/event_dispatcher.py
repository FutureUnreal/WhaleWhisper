from typing import Any, Dict, List, Optional

from app.core.settings import get_settings
from app.core.events import EventEnvelope, make_event
from app.services.memory import MemoryScope, MemoryService
from app.services.providers.llm import (
    LLMConfigError,
    LLMProvider,
    build_llm_provider_from_config,
    get_llm_provider,
)
from app.services.providers.types import build_provider_config
from app.services.session_store import SessionStore


class EventDispatcher:
    def __init__(self) -> None:
        self.memory = MemoryService()
        self.llm: Optional[LLMProvider] = None
        self.sessions = SessionStore()

        self._event_aliases = {
            "user.text": "input.text",
            "user.audio.chunk": "input.voice.chunk",
            "user.interrupt": "input.interrupt",
        }

        self._handlers = {
            "session.start": self.handle_session_start,
            "input.text": self.handle_input_text,
            "input.voice.start": self.handle_input_voice_start,
            "input.voice.chunk": self.handle_input_voice_chunk,
            "input.voice.end": self.handle_input_voice_end,
            "input.interrupt": self.handle_input_interrupt,
        }

    def _ensure_llm(self) -> LLMProvider:
        if self.llm is None:
            self.llm = get_llm_provider()
        return self.llm

    def _provider_name(self) -> str:
        return get_settings().llm_provider.lower()

    @staticmethod
    def _resolve_session_id(payload: Dict[str, Any], fallback: Optional[str]) -> str:
        session_id = payload.get("sessionId") or payload.get("session_id")
        if isinstance(session_id, str) and session_id:
            return session_id
        user_id = payload.get("user_id")
        if isinstance(user_id, str) and user_id:
            return user_id
        if fallback:
            return fallback
        return "default"

    @staticmethod
    def _coerce_session_meta(value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            return value.strip() or None
        if isinstance(value, dict):
            lines = [f"{key}: {val}" for key, val in value.items()]
            return "\n".join(lines).strip() or None
        if isinstance(value, list):
            items = [str(item).strip() for item in value if str(item).strip()]
            if not items:
                return None
            return "\n".join(items)
        return str(value).strip() or None

    @staticmethod
    def _coerce_developer_prompt(value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            return value.strip() or None
        return str(value).strip() or None

    def _extract_session_meta(self, payload: Dict[str, Any]) -> Optional[str]:
        raw = (
            payload.get("session_meta")
            or payload.get("sessionMeta")
            or payload.get("session_metadata")
            or payload.get("sessionMetadata")
            or payload.get("metadata")
            or payload.get("meta")
        )
        return self._coerce_session_meta(raw)

    def _extract_developer_prompt(self, payload: Dict[str, Any]) -> Optional[str]:
        raw = (
            payload.get("developer_prompt")
            or payload.get("developerPrompt")
            or payload.get("persona_prompt")
            or payload.get("personaPrompt")
        )
        return self._coerce_developer_prompt(raw)

    def _normalize_type(self, event_type: str) -> str:
        return self._event_aliases.get(event_type, event_type)

    async def dispatch(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        normalized = self._normalize_type(event.type)
        handler = self._handlers.get(normalized)
        if handler is None:
            return []
        return await handler(event)

    async def handle_session_start(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        payload = event.data
        session_id = self._resolve_session_id(payload, event.session_id)
        profile_id = payload.get("profile_id")
        user_id = payload.get("user_id")
        self.sessions.get_or_create(session_id, user_id=user_id, profile_id=profile_id)
        session_meta = self._extract_session_meta(payload)
        if session_meta:
            self.sessions.set_metadata(session_id, session_meta)
        developer_prompt = self._extract_developer_prompt(payload)
        if developer_prompt:
            self.sessions.set_developer_prompt(session_id, developer_prompt)
        return [
            make_event(
                "session.started",
                {"session_id": session_id, "profile_id": profile_id},
                session_id=session_id,
            )
        ]

    async def handle_input_text(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        payload = event.data
        text = payload.get("text", "")
        if not isinstance(text, str) or not text:
            return [make_event("error", {"message": "input.text requires a text field"}, session_id=event.session_id)]

        session_id = self._resolve_session_id(payload, event.session_id)
        session = self.sessions.get_or_create(
            session_id,
            user_id=payload.get("user_id"),
            profile_id=payload.get("profile_id"),
        )
        session_meta = self._extract_session_meta(payload) or self.sessions.get_metadata(session_id)
        if session_meta:
            self.sessions.set_metadata(session_id, session_meta)
        developer_prompt = self._extract_developer_prompt(payload) or self.sessions.get_developer_prompt(
            session_id
        )
        if developer_prompt:
            self.sessions.set_developer_prompt(session_id, developer_prompt)
        provider_config = build_provider_config(payload)
        provider = provider_config.provider_id
        conversation_id = self.sessions.get_conversation_id(session_id, provider)
        memory_scope = self._build_memory_scope(session_id, session.user_id, session.profile_id)
        memory_context = self.memory.build_context(memory_scope)

        try:
            if payload.get("provider"):
                llm = build_llm_provider_from_config(provider_config)
            else:
                llm = self._ensure_llm()
            messages = None
            text_payload = text
            if provider in {"openai", "openai_compat", "openai-compatible"}:
                messages = self.memory.build_messages(
                    system_prompt=get_settings().llm_system_prompt,
                    context=memory_context,
                    developer_prompt=developer_prompt,
                    session_meta=session_meta,
                    user_text=text,
                )
            else:
                text_payload = self.memory.build_prompt(
                    context=memory_context,
                    user_text=text,
                    session_meta=session_meta,
                    developer_prompt=developer_prompt,
                )
            if provider in {"openai", "openai_compat", "openai-compatible"}:
                deltas = await llm.stream(
                    text=text_payload,
                    user_id=payload.get("user_id"),
                    conversation_id=conversation_id,
                    messages=messages,
                )
                response_text = "".join(deltas)
                response_conversation_id = conversation_id
            else:
                response = await llm.generate(
                    text=text_payload,
                    user_id=payload.get("user_id"),
                    conversation_id=conversation_id,
                    messages=messages,
                )
                response_text = response.text
                response_conversation_id = response.conversation_id or conversation_id
                deltas = [response_text]
        except LLMConfigError as exc:
            return [make_event("error", {"message": str(exc)}, session_id=session_id)]
        except Exception as exc:
            return [make_event("error", {"message": f"LLM request failed: {exc}"}, session_id=session_id)]

        if response_conversation_id and response_conversation_id != conversation_id:
            self.sessions.set_conversation_id(
                session_id, provider, response_conversation_id
            )
        self.memory.record_message(memory_scope, "user", text)
        self.memory.record_message(memory_scope, "assistant", response_text)
        await self.memory.maybe_summarize(memory_scope, provider=llm)

        events = []
        for delta in deltas:
            if not delta:
                continue
            events.append(make_event("output.chat.delta", {"text": delta}, session_id=session_id))
            events.append(make_event("llm.delta", {"text": delta}, session_id=session_id))

        final_payload = {"text": response_text, "tokens": len(response_text.split())}
        events.append(make_event("output.chat.complete", final_payload, session_id=session_id))
        events.append(make_event("llm.final", final_payload, session_id=session_id))
        events.append(
            make_event(
                "memory.write",
                {"kind": "chat", "content": text, "tags": ["user"]},
                session_id=session_id,
            )
        )
        return events

    @staticmethod
    def _build_memory_scope(
        session_id: str, user_id: Optional[str], profile_id: Optional[str]
    ) -> MemoryScope:
        return MemoryScope(
            session_id=session_id or "default",
            user_id=(user_id or "default"),
            profile_id=(profile_id or "default"),
        )

    async def handle_input_voice_chunk(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        return [make_event("error", {"message": "ASR not configured"}, session_id=event.session_id)]

    async def handle_input_voice_start(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        return []

    async def handle_input_voice_end(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        return []

    async def handle_input_interrupt(self, event: EventEnvelope) -> List[Dict[str, Any]]:
        return [
            make_event("output.speech.end", {}, session_id=event.session_id),
            make_event("tts.end", {}, session_id=event.session_id),
        ]
