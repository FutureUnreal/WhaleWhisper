import os
from typing import AbstractSet, Any, Dict, Optional

DEFAULT_BLOCKED_CONFIG_KEYS: AbstractSet[str] = frozenset(
    {
        "api_key",
        "apiKey",
        "base_url",
        "baseUrl",
        "engine",
    }
)


def sanitize_config(config: Any, *, blocked: Optional[AbstractSet[str]] = None) -> Dict[str, Any]:
    if not isinstance(config, dict):
        return {}
    blocked_keys = blocked or DEFAULT_BLOCKED_CONFIG_KEYS
    return {key: value for key, value in config.items() if key not in blocked_keys}


def resolve_api_key(env_name: Optional[str]) -> str:
    if not env_name:
        return ""
    return os.getenv(env_name, "")


def normalize_path(path: str) -> str:
    if not path.startswith("/"):
        return f"/{path}"
    return path

