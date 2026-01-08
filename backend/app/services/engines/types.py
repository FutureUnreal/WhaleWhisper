from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class EngineParamSpec:
    name: str
    param_type: str
    required: bool = False
    default: Optional[Any] = None
    options: List[Any] = field(default_factory=list)
    description: Optional[str] = None


@dataclass
class EngineSpec:
    id: str
    label: str
    description: Optional[str] = None
    params: List[EngineParamSpec] = field(default_factory=list)
    voices: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
