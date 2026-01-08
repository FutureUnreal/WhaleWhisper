from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class AgentEvent:
    event: str
    data: Dict[str, Any]
