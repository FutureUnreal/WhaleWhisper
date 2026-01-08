from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class EngineRuntimeConfig:
    id: str
    base_url: str
    model: str
    api_key_env: Optional[str] = None
    headers: Dict[str, str] = field(default_factory=dict)
    timeout: float = 60.0
    default_params: Dict[str, Any] = field(default_factory=dict)
    engine_type: str = "openai_compat"
    paths: Dict[str, str] = field(default_factory=dict)


class EngineRuntimeStore:
    def __init__(self) -> None:
        self._configs: Dict[str, Dict[str, EngineRuntimeConfig]] = {
            "llm": {},
            "tts": {},
            "asr": {},
            "agent": {},
        }

    def register(self, kind: str, config: EngineRuntimeConfig) -> None:
        if kind not in self._configs:
            self._configs[kind] = {}
        self._configs[kind][config.id] = config

    def get(self, kind: str, engine_id: str) -> Optional[EngineRuntimeConfig]:
        return self._configs.get(kind, {}).get(engine_id)


store = EngineRuntimeStore()
