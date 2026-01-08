import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.services.providers.llm import LLMConfigError, LLMProvider, get_llm_provider


@dataclass
class MemorySummaryResult:
    title: str
    summary: str
    facts: List[Dict[str, str]]


class MemorySummarizer:
    def __init__(self, provider: Optional[LLMProvider] = None) -> None:
        self.provider = provider

    async def summarize(
        self, user_messages: List[str], *, provider: Optional[LLMProvider] = None
    ) -> Optional[MemorySummaryResult]:
        if not user_messages:
            return None
        resolved = self._resolve_provider(provider)
        if resolved is None:
            return None
        prompt = _build_prompt(user_messages)
        if resolved.supports_messages():
            response = await resolved.generate(
                text=prompt,
                messages=_build_messages(user_messages),
            )
        else:
            response = await resolved.generate(text=prompt)
        parsed = _parse_response(response.text)
        if not parsed:
            return None
        title = str(parsed.get("title") or "").strip()
        summary = str(parsed.get("summary") or "").strip()
        facts = _normalize_facts(parsed.get("facts"))
        if not summary:
            return None
        return MemorySummaryResult(title=title, summary=summary, facts=facts)

    def _resolve_provider(self, provider: Optional[LLMProvider]) -> Optional[LLMProvider]:
        if provider is not None:
            return provider
        if self.provider is not None:
            return self.provider
        try:
            return get_llm_provider()
        except LLMConfigError:
            return None


def _build_messages(user_messages: List[str]) -> List[Dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt()},
        {"role": "user", "content": _user_prompt(user_messages)},
    ]


def _build_prompt(user_messages: List[str]) -> str:
    return f"{_system_prompt()}\n\n{_user_prompt(user_messages)}"


def _system_prompt() -> str:
    return (
        "You summarize user chat history for long-term memory. "
        "Return JSON only with keys: title, summary, facts.\n"
        "Rules:\n"
        "- Use the user's language.\n"
        "- Be objective and factual; avoid subjective judgments or tone labels.\n"
        "- Do not copy formatting, markup, or special tokens (e.g. <|...|>); paraphrase in plain text.\n"
        "- title: 4-8 words, short and neutral.\n"
        "- summary: <= 400 characters, focused on user's goals, preferences, or ongoing topics.\n"
        "- Decide if any long-term memory is truly valuable to store.\n"
        "- facts: list of stable user facts ONLY when they are high-confidence and long-term useful.\n"
        "- Prefer user preferences first, then goals/learning, then identity/role; "
        "each {\"content\": \"...\", \"reason\": \"name|identity|role|preference|learning|goal|other\"}.\n"
        "- If nothing is worth storing, return facts as [].\n"
        "- Do not include sensitive or temporary details.\n"
    )


def _user_prompt(user_messages: List[str]) -> str:
    items = "\n".join(f"- {message.strip()}" for message in user_messages if message.strip())
    return f"User messages:\n{items}\n\nReturn JSON only."


def _parse_response(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    try:
        payload = json.loads(text)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = text[start : end + 1]
    try:
        payload = json.loads(snippet)
    except json.JSONDecodeError:
        return None
    if isinstance(payload, dict):
        return payload
    return None


def _normalize_facts(raw: Any) -> List[Dict[str, str]]:
    facts: List[Dict[str, str]] = []
    if not raw:
        return facts
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                content = item.strip()
                if content:
                    facts.append({"content": content, "reason": "other"})
                continue
            if isinstance(item, dict):
                content = str(item.get("content") or "").strip()
                if not content:
                    continue
                reason = str(item.get("reason") or "other").strip()
                facts.append({"content": content, "reason": reason or "other"})
    elif isinstance(raw, dict):
        content = str(raw.get("content") or "").strip()
        if content:
            reason = str(raw.get("reason") or "other").strip()
            facts.append({"content": content, "reason": reason or "other"})
    return facts
