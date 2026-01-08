from typing import Dict, List, Optional

from .types import EngineParamSpec, EngineSpec


class EngineRegistry:
    def __init__(self) -> None:
        self._engines: Dict[str, Dict[str, EngineSpec]] = {
            "asr": {},
            "tts": {},
            "llm": {},
            "agent": {},
        }
        self._defaults: Dict[str, Optional[str]] = {
            "asr": None,
            "tts": None,
            "llm": None,
            "agent": None,
        }

    def register(self, kind: str, spec: EngineSpec, *, default: bool = False) -> None:
        if kind not in self._engines:
            raise ValueError(f"Unknown engine kind: {kind}")
        self._engines[kind][spec.id] = spec
        if default or self._defaults[kind] is None:
            self._defaults[kind] = spec.id

    def list(self, kind: str) -> List[EngineSpec]:
        return list(self._engines.get(kind, {}).values())

    def get_default(self, kind: str) -> Optional[EngineSpec]:
        default_id = self._defaults.get(kind)
        if not default_id:
            return None
        return self._engines.get(kind, {}).get(default_id)

    def get(self, kind: str, engine_id: str) -> Optional[EngineSpec]:
        return self._engines.get(kind, {}).get(engine_id)

    def get_params(self, kind: str, engine_id: str) -> List[EngineParamSpec]:
        spec = self._engines.get(kind, {}).get(engine_id)
        if not spec:
            return []
        return spec.params

    def get_voices(self, kind: str, engine_id: str) -> List[dict]:
        spec = self._engines.get(kind, {}).get(engine_id)
        if not spec:
            return []
        return spec.voices


registry = EngineRegistry()
