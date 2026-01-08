from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from app.core.settings import AppSettings, get_settings


@dataclass
class ProviderConfig:
    provider_id: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProviderValidation:
    valid: bool
    reason: Optional[str] = None


def normalize_provider_id(provider_id: Optional[str], fallback: str) -> str:
    if provider_id:
        return str(provider_id).strip().lower()
    return fallback.strip().lower()


def build_provider_config(
    payload: Dict[str, Any], settings: Optional[AppSettings] = None
) -> ProviderConfig:
    settings = settings or get_settings()
    provider_payload = payload.get("provider") if isinstance(payload, dict) else None
    provider_payload = provider_payload if isinstance(provider_payload, dict) else {}

    provider_id = normalize_provider_id(provider_payload.get("id"), settings.llm_provider)
    api_key = provider_payload.get("api_key") or provider_payload.get("apiKey")
    base_url = provider_payload.get("base_url") or provider_payload.get("baseUrl")
    model = provider_payload.get("model")
    extra = provider_payload.get("extra") if isinstance(provider_payload.get("extra"), dict) else {}

    if provider_id in {"openai", "openai_compat", "openai-compatible"}:
        api_key = api_key or settings.openai_api_key
        base_url = base_url or settings.openai_base_url
        model = model or settings.openai_model
    elif provider_id == "dify":
        api_key = api_key or settings.dify_api_key
        base_url = base_url or settings.dify_base_url
        extra = {"user": settings.dify_user, **extra}
    elif provider_id == "fastgpt":
        api_key = api_key or settings.fastgpt_api_key
        base_url = base_url or settings.fastgpt_base_url
        extra = {"uid": settings.fastgpt_uid, **extra}
    elif provider_id == "coze":
        api_key = api_key or settings.coze_token
        base_url = base_url or settings.coze_api_base
        extra = {"bot_id": settings.coze_bot_id, "user": settings.coze_user, **extra}

    return ProviderConfig(
        provider_id=provider_id,
        api_key=api_key,
        base_url=base_url,
        model=model,
        extra=extra,
    )
